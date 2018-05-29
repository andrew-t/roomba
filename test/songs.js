const songs = require('../src/songs'),
	assert = require('assert')
	sinon = require('sinon');

describe('songs', () => {
	it('parse should work', () => {
		const p = songs.parse(
			'c3/8 5c1/4 4d#1');
		assert.deepEqual(p, [
			{ note: 60, duration: 12 },
			{ note: 72, duration:  8 },
			{ note: 63, duration: 32 }
		]);
	});

	it('length should work', () => {
		const p = songs.length([
			{ note: 60, duration: 12 },
			{ note: 72, duration:  8 },
			{ note: 63, duration: 32 }
		]);
		assert.equal(p, (12 + 8 + 32) * 64 / 1000);
	});
});
