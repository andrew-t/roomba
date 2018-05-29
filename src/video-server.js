#!/usr/bin/env node

const http = require('http'),
	config = require('../config.json'),
	Logger = require('./Logger'),
	WebStreamerServer = require('../video/lib/raspivid');

async function createServer(config) {
	const videoServer = http.createServer(),
		logger = new Logger(config.log || { verbose: true });
	const streamer = new WebStreamerServer(videoServer);
	videoServer.listen(config.server.videoPort, () =>
		logger.log(`Video server listening on port ${config.server.videoPort}`));
}

if (require.main === module) {
	createServer(config);
} else
	module.exports = createServer;
