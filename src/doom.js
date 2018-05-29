#!/usr/bin/env node

const Roomba = require('./Roomba'),
	{ delay } = require('./roomba-util'),
	songs = require('./songs'),
	config = require('./config.json');

const riff = songs.parse(
	'f#1/24 e1/12 d#1/24 f#1/24 a1/12 g1/12 f#1/24 d#1/24 f#1/24 g1/12 a1/12 b1/12 a1/12 g1/12 f#1/24 d#1/24',
	96);
// const riff = songs.parse(
// 	'f#1/24 e1/12 d#1/24 f#1/24 a1/12 g1/12 f#1/24',
// 	1000);

run().then(() => console.log('OK'), e => console.error(e));

async function run() {
	const roomba = new Roomba(config.roomba);
	await roomba.wake();
	await delay(500);
	await roomba.setMode(Roomba.SAFE_MODE);
	await delay(500);
	await roomba.wheels(300, -300);
	await delay(500);
	await roomba.wheels(0, 0);
	await delay(1000);
	await roomba.uploadSong(3, riff);
	await delay(1000);
	await roomba.playSong(3);
	await delay(songs.length(riff));
	await delay(10000);
	await roomba.close();
}
