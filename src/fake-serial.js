const EventEmitter = require('events').EventEmitter,
	{ delay } = require('./roomba-util');

class FakeSerialPort extends EventEmitter {
	write(data, cb) {
		const opCode = data[0];
		if (opCode == 142)
			setTimeout(() => this.emit('readable'), 75);
		setTimeout(cb, 50);
	}

	read() {
		return new Buffer([
			0,0,0,0,0,0,0,
			 0,0,0,0,0,0,
			0,0,0,0,0,0,0,
			 0,0,0,0,0,0
		]);
	}

	close(cb) {
		setTimeout(cb, 50);
	}
}

module.exports = () => new FakeSerialPort();
