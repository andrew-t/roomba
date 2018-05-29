const Roomba = require('../src/Roomba'),
	assert = require('assert')
	sinon = require('sinon');

describe('roomba', () => {
	let roomba;
	before(async () => {
		roomba = new Roomba({
			fake: true,
			log: {
				verbose: false
			}
		});
		sinon.spy(roomba, 'dontBePassive');
		sinon.spy(roomba, 'command');
		await roomba.wake();
	});
	after(() => roomba.close());

	it('wheels', async () => {
		await roomba.wheels(-200, 520);
		assert.equal(roomba.dontBePassive.args.length, 1);
		assert.deepEqual(roomba.command.args, [
			[ 145, [ 0xff, 0x38, 0x01, 0xf4 ] ]
		]);
	});
});
