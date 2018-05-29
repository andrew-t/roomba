const SerialPort = require('serialport'),
	fs = require('mz/fs'),
	child = require('mz/child_process'),
	Logger = require('./Logger'),
	{
		cap,
		p, oneAtATime, delay,
		sixteen, fromSixteen, ufromSixteen,
		fromEight,
		statics, chargeModes
	} = require('./roomba-util');

class Roomba {
	constructor(config = {}) {
		this.config = config;
		this._mode = Roomba.PASSIVE_MODE;
		if (config.fake)
			this._port = require('./fake-serial')();
		else
			this._port = new SerialPort(
				config.serial || '/dev/serial0',
				{
					baudRate: config.baudRate || 115200
				});
		this._lastInteraction = 0;
		this.logger = new Logger(config.log || { verbose: true });
	}

	_touch() {
		this._lastInteraction = Date.now();
	}

	// The Roomba sleeps if it's been idle too long. This is probably a bad approach if we need to call .sleep() to make this work, though. Perhaps we should implement our own sleep function to pre-empt the in-built one.
	async wakeIfAsleep() {
		if (Date.now() > this._lastInteraction + (this.config.sleepTime || 30000))
			await this.wake();
	}

	// This issues a command opcode with data in an elegantly wrapped way, to ensure compatibility.
	async command(opCode, data) {
		await this.wakeIfAsleep();
		await this._command(opCode, data);
		this._touch();
	}

	// This issues a command opcode with data.
	_command(opCode, data = []) {
		return p(cb => this._port.write([ opCode, ...data ], cb));
	}

	// Setting the mode requires different commands depending what mode you're currently in, so:
	get mode() { return this._mode; }
	set mode(v) {
		this.setMode(v);
		return v;
	}
	async setMode(v) {
		await this.wakeIfAsleep();
		this.logger.log('Setting mode from', this._mode, 'to', v);
		switch (v) {
			case Roomba.SAFE_MODE:
				switch (this._mode) {
					case Roomba.SAFE_MODE:
						break;
					case Roomba.FULL_MODE:
						await this._command(131);
						break;
					case Roomba.PASSIVE_MODE:
						await this._command(130);
						break;
					default:
						throw new Error('Unexpected mode');
				}
				this._mode = Roomba.SAFE_MODE
				break;
			case Roomba.FULL_MODE:
				await this._command(132);
				this._mode = Roomba.FULL_MODE;
				break;
			case Roomba.PASSIVE_MODE:
				await this._command(128);
				this._mode = Roomba.PASSIVE_MODE;
				break;
			default:
				throw new Error('Unexpected mode');
		}
	}

	// Loads of functions don't work in 'passive mode' so this ensure's you're not.
	async dontBePassive() {
		await this.wakeIfAsleep();
		if (this._mode == Roomba.PASSIVE_MODE)
			await this.setMode(Roomba.SAFE_MODE);
	}

	// Start a cleaning cycle.
	async clean(max = false) {
		await this.dontBePassive();
		await this.command(max ? 136 : 135);
	}

	// Go back to the home station
	async dock() {
		await this.command(143);
	}

	// Perform a spot clean where the Roomba is
	async spot() {
		await this.dontBePassive();
		await this.command(134);
	}

	// It seems that sleeping this way might be a good way to ensure that the wake command works in the future
	async sleep() {
		await this.dontBePassive();
		await this.command(133);
		// This tells the Roomba class the robot is asleep:
		this._lastInteraction = -Infinity;
	}

	// Sets the wheel velocities, in mm/s
	async wheels(left, right) {
		await this.dontBePassive();
		await this.command(145,
			[ ...sixteen(cap(left,  500, -500)),
			  ...sixteen(cap(right, 500, -500)) ]);
	}

	// Drive forwards at a given speed in mm/s
	goStraight(velocity) {
		return this._driveCommand(velocity);
	}
	// Drive with a given velocity and turn on a given radius while you do:
	turn(velocity, radius) {
		return this._driveCommand(velocity, radius);
	}
	// Rotate on the spot at a given speed
	spin(speed) {
		// You can use -1 to spin the other way but I'm assuming negative speed works too.
		return this._driveCommand(speed, 1);
	}

	// The in-built "drive" command is a bit clunky; use this to wrap it or call .wheels(l,r) instead
	async _driveCommand(velocity, radius = null) {
		await this.dontBePassive();
		await this.command(137, [
			...sixteen(cap(velocity, 500, -500)),
			...sixteen(radius === null
			  	? 0x8000
			  	: cap(radius, 2000, -2000))
		]);
	}

	// Call a function with sensor readings every so often
	sensorStream(callback, interval) {
		const h = setInterval(
				() => this._command(142, [0]).catch(this.logger.warn),
				interval),
			handler = () => {
				const data = this._port.read();
				if (data && data.length == 26)
					callback(Roomba.parseSensorPacket(data));
			};
		this._port.addListener('readable', handler);
		return () => {
			clearInterval(h);
			this._port.removeListener('readable', handler);
		};
	}

	// Controls the vacuum fan and the brushes.
	async motors(vac, brush, sideBrush) {
		await this.dontBePassive();
		await this._command(138, [
			+!!sideBrush |
			(+!!vac << 1) |
			(+!!brush << 2)
		]);
	}

	// The three lights on a cheap Roomba:
	basicLeds(dock, spot, cleanHue, cleanIntensity) {
		return this.leds(false, dock, spot, false,
			false, false,
			cleanHue, cleanIntensity);
	}

	// The many lights on any possible Roomba:
	async leds(spot, clean, max, dirtDetect,
		statusRed, statusGreen,
		powerHue, powerIntensity)
	{
		await this.dontBePassive();
		await this._command(139, [
			 +!!dirtDetect        |
			(+!!max         << 1) |
			(+!!clean       << 2) |
			(+!!spot        << 3) |
			(+!!statusRed   << 4) |
			(+!!statusGreen << 5),
			   	powerHue,
			   	powerIntensity
		]);
	}

	// Sends a song to the Roomba's memory. Good Roombas can hold up to 16; cheap ones up to 4. A song is up to 16 notes, including rests.
	async uploadSong(number, notes) {
		if (notes.length > 16)
			throw new Error('Song too long');
		await this.dontBePassive();
		const bytes = [ number, notes.length - 1 ];
		for (let note of notes) {
			if (note.rest)
				bytes.push(0);
			else {
				if (note.note < 31 || note.note > 127)
					throw new Error('Bad note: ' + note.note);
				bytes.push(note.note);
			}
			bytes.push(note.duration);
		}
		this.logger.log('Uploading song', bytes);
		await this.command(140, bytes);
	}
	// As it sounds. Don't cancel this before the song finishes or it'll remember where it got to and fail next time, like an early iPod.
	async playSong(number) {
		await this.dontBePassive();
		this.logger.log('Playing song', number);
		await this.command(141, [ number ]);
	}

	// per http://www.robotappstore.com/Knowledge-Base/7-How-to-program-Roomba-to-sing/21.html
	// This makes sure the Roomba doesn't remember it's halfway though a song
	// and only play half of it next time.
	// This sounds like a bullshit bug,
	// but to be fair, the iPod app in iOS had it at least as late as v3
	async resetSongs() {
		for (let i = 0; i < (this.config.song || 16); ++i) {
			await this.uploadSong(i, [ { note: 36, duration: 0} ]);
			await this.playSong();
		}
	}

	// Closes the serial port connection; mostly just good practice.
	async close() {
		await this.setMode(Roomba.PASSIVE_MODE);
		await p(cb => this._port.close(cb));
	}
}

// These functions need wrapping so we add them manually:

Roomba.prototype.wake = oneAtATime(async function () {
	const pin = this.config.ddPin || 18;
	this.logger.log('waking');
	if (this.config.fake)
		await delay(2150);
	else {
		await child.exec(`raspi-gpio set ${pin} op pd dh`);
		await delay(1000);
		await child.exec(`raspi-gpio set ${pin} op pd dl`);
		await delay(750);
		await child.exec(`raspi-gpio set ${pin} op pd dh`);
		await delay(200);
		await this._command(128);
		await delay(200);
		await this._command(130);
	}
	this._mode = Roomba.SAFE_MODE;
	this._touch();
	this.logger.log('awoken');
});

Roomba.prototype.sensors = oneAtATime(function () {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
				this._port.removeListener('readable', handler);
				reject(new Error('Timeout'));
			}, this.config.sensorTimeout || 500),
			handler = () => {
				const data = this._port.read();
				if (data && data.length == 26) {
					clearTimeout(timeout);
					this._port.removeListener('readable', handler);
					resolve(Roomba.parseSensorPacket(data));
				}
			};
		this._port.addListener('readable', handler);
		this._command(142, [0])
			.catch(e => {
				this.logger.error('Error requesting sensor data');
				reject(e);
			});
	});
});

Object.assign(Roomba, statics);
module.exports = Roomba;
