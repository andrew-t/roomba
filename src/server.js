#!/usr/bin/env node

const express = require('express'),
	Roomba = require('./Roomba'),
	{ delay } = require('./roomba-util')
	config = require('../config.json'),
	mime = require('mime/lite'),
	fs = require('mz/fs'),
	http = require('http'),
	Logger = require('./Logger');

async function createServer(config) {
	const app = express(),
		server = http.createServer(app),
		roomba = new Roomba(config.roomba),
		io = require('socket.io')(server),
		logger = new Logger(config.log || { verbose: true });

	// UI
	const clientDir = `${__dirname}/../client`; 
	await fs.readdir(clientDir)
		.then(files => files.forEach(file =>
			serveFile(`/${file}`, `${clientDir}/${file}`)));
	serveFile(`/`, `${clientDir}/index.html`);
	serveFile(`/http-live-player.js`, `${__dirname}/../video/vendor/dist/http-live-player.js`);

	// HTTP API
	serveCommand('clean', () => roomba.clean());
	serveCommand('spot', () => roomba.spot());
	serveCommand('dock', () => roomba.dock());
	serveCommand('stop-cleaning', () => roomba.stopCleaning());
	serveCommand('wake', () => roomba.wake());
	serveCommand('sensors', () => roomba.sensors());
	serveCommand('leds', q => {
		console.log(q);
		roomba.leds(
			!!q.spot, !!q.clean, !!q.max, !!q.dirtDetect,
			!!q.statusRed, !!q.statusGreen,
			int(q.powerHue), int(q.powerIntensity));
	});
	serveCommand('disconnect', async () => {
		await roomba.close();
		setTimeout(() => process.exit(0), 250);
	});

	// Socket API
	io.on('connection', socket => {
		let controlPromise = Promise.resolve(),
			stopSensors,
			lastUpdate = 0,
			dead = false,
			last = {
				left: 0, right: 0,
				vac: false, brush: false, sideBrush: false
			};
		logger.log('incoming socket connection', socket.id);
		socket.on('controls', async (msg) => {
			if (dead) 
				return;
			const start = Date.now();
			lastUpdate = Date.now();
			try {
				dead = true;
				const ttl = msg.ttl || 200;
				await controlPromise;
				// wheels
				if (Math.abs(msg.left - last.left) > config.wheelSpeedTolerance ||
					(msg.left == 0 && last.left != 0) ||
					Math.abs(msg.right - last.right) > config.wheelSpeedTolerance ||
					(msg.right == 0 && last.right != 0))
				{
					logger.log('Setting wheel velocities', msg.left, msg.right);
					last.left = msg.left;
					last.right = msg.right;
					await roomba.wheels(msg.left, msg.right);
				}
				// cleaning motors
				if (last.vac != !!msg.vac ||
					last.brush != !!msg.brush ||
					last.sideBrush != !!msg.sideBrush)
				{
					logger.log('Setting motors', !!msg.vac, !!msg.brush, !!msg.sideBrush);
					last.vac = !!msg.vac;
					last.brush = !!msg.brush;
					last.sideBrush = !!msg.sideBrush;
					await roomba.motors(!!msg.vac, !!msg.brush, !!msg.sideBrush);
				}
				// TTL
				setTimeout(() => {
					if (Date.now() - lastUpdate >= ttl) {
						controlPromise = stopControls();
						lastUpdate = Infinity;
					}
				}, ttl + 10);
			} finally {
				dead = false;
				//logger.log('Finished in', Date.now() - start);
			}
		});

		socket.on('sensors', async (msg) => {
			if (stopSensors)
				stopSensors();
			if (msg.interval && msg.interval >= 250) {
				logger.log('Starting sensor stream');
				stopSensors = roomba.sensorStream(data =>
					socket.emit('sensors', data),
					msg.interval);
			}
		});

		socket.on('disconnect', e => {
			stopControls();
		});
	});

	server.listen(config.server.port, () =>
		logger.log(`Main server listening on port ${config.server.port}`));

	async function stopControls() {
		logger.log('stopping controls');
		await roomba.wheels(0, 0);
		await roomba.motors();
	}

	function serveFile(url, path) {
		const type = mime.getType(path.replace(/^.*\.([^\.]+)$/, '$1'));
		app.get(url, (req, res) => {
			logger.log(`Serving ${path} on ${url}`);
			res.set('content-type', type);
			fs.createReadStream(path).pipe(res);
		});
	}

	function serveCommand(url, cb) {
		app.get(`/command/${url}`, async (req, res) => {
			logger.log(`Received ${url} command`);
			try {
				const result = await cb(req.query);
				if (result)
					res.status(200)
						.set('content-type', 'application/json')
						.send(JSON.stringify(result, null, 2));
				else
					res.sendStatus(204);
			} catch(e) {
				res.status(500)
					.set('content-type', 'text/plain')
					.send(e.stack);
			}
		});
	}
}

if (require.main === module) {
	switch (process.env.FAKE_ROOMBA) {
		case 'true':
			config.roomba.fake = true;
			break;
		case 'false':
		case undefined:
			config.roomba.fake = false;
			break;
		default:
			throw new Error('Unknown argument');
	}
	if (!config.roomba.log)
		config.roomba.log = config.log;
	if (!config.server.log)
		config.server.log = config.log;
	createServer(config);
} else
	module.exports = createServer;

function int(q) {
	return q ? parseInt(q, 10) : 0;
}
