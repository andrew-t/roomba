
// todo: these are good candidates for unit tests:

function cap(value, max, min) {
	if (value > max) return max;
	if (value < min) return min;
	return value;
}

// Byte decomposer
function sixteen(value) {
	return [
		(value & 0xFF00) >> 8,
		value & 0x00FF
	];
}

function fromSixteen(high, low) {
	const val = ufromSixteen(high, low);
	if (!(val & 0x8000))
		return val;
	// it's negative, so pad with 1s
	return (-1 & ~0xFFFF) | val;
}
function fromEight(val) {
	if (!(val & 0x80))
		return val;
	// it's negative, so pad with 1s
	return (-1 & ~0xFF) | val;
}
function ufromSixteen(high, low) {
	return (high << 8) | low;
}

// Promisifier
function p(c) {
	return new Promise((resolve, reject) =>
		c((err, data) => {
			if (err) reject(err);
			else resolve(data);
		}));
}
// Pass in an async function (not a lambda if you want to use 'this') and it'll debounce it to hell
function oneAtATime(doIt) {
	let ongoing = null;
	return function (...args) {
		if (!ongoing)
			ongoing = doIt.apply(this, args)
				.then(x => {
					ongoing = null;
					return x;
				});
		return ongoing;
	}
}

function delay(timeout) {
	return new Promise((resolve, reject) =>
		setTimeout(resolve, timeout));
}

function parseSensorPacket(data) {
	const readable = {
		raw: data,
		bump: {
			left:       !!(data[0] & 0x01),
			right:      !!(data[0] & 0x02)
		},
		wheelDrop: {
			left:       !!(data[0] & 0x04),
			right:      !!(data[0] & 0x08),
			caster:     !!(data[0] & 0x10)
		},
		wall:           !!data[1],
		cliff: {
			left:       !!data[2],
			frontLeft:  !!data[3],
			frontRight: !!data[4],
			right:      !!data[5]
		},
		virtualWall:    !!data[6],
		motorOvercurrent: {
			sideBrush:  !!(data[7] & 0x01),
			vacuum:     !!(data[7] & 0x02),
			mainBrush:  !!(data[7] & 0x04),
			rightDrive: !!(data[7] & 0x08),
			leftDrive:  !!(data[7] & 0x10)
		},
		dirt: {
			left:  data[8],
			right: data[9]
		},
		rcCommand: data[10],
		buttons: {
			max:        !!(data[11] & 0x01),
			clean:      !!(data[11] & 0x02),
			spot:       !!(data[11] & 0x04),
			power:      !!(data[11] & 0x08)
		},
		distance:   fromSixteen(data[12], data[13]),
		angle:      fromSixteen(data[14], data[15]),
		chargeMode: chargeModes[data[16]],
		voltage:   ufromSixteen(data[17], data[18]),
		current:   ufromSixteen(data[19], data[20]),
		temperature:  fromEight(data[21]),
		chargeRaw: ufromSixteen(data[22], data[23]),
		capacity:  ufromSixteen(data[24], data[25])
	};
	readable.charge = readable.chargeRaw / readable.capacity;
	return readable;
}

const statics = {
	SAFE_MODE: Symbol('Safe Mode'),
	FULL_MODE: Symbol('Full Mode'),
	PASSIVE_MODE: Symbol('Passive Mode'),

	NOT_CHARGING: Symbol('Not charging'),
	CHARGING_RECOVERY: Symbol('Charging Recovery'),
	CHARGING: Symbol('Charging'),
	TRICKLE_CHARGING: Symbol('Trickle charging'),
	WAITING: Symbol('Waiting to charge'),
	CHARGING_ERROR: Symbol('Charging error'),

	parseSensorPacket
}

const chargeModes = [
	statics.NOT_CHARGING,
	statics.CHARGING_RECOVERY,
	statics.CHARGING,
	statics.TRICKLE_CHARGING,
	statics.WAITING,
	statics.CHARGING_ERROR
];

module.exports = {
	cap,
	p, oneAtATime, delay,
	sixteen, fromSixteen, ufromSixteen,
	fromEight,
	statics, chargeModes
}
