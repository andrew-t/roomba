class Logger {
	constructor(config) {
		this.config = config;
	}

	log(...args) {
		if (this.config.verbose)
			console.log(dateStamp(96), ...args);
	}

	warn(...args) {
		console.warn(dateStamp(93), ...args);
	}

	error(...args) {
		console.error(dateStamp(91), ...args);
	}
}

function dateStamp(c) {
	return `\x1b[${c}m${(new Date()).toISOString()}\x1b[0m`;
}

module.exports = Logger;
