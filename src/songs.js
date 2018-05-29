const parser = /^(\d?)([a-g][b#]?)(\d)(\/(\d+))?$/i,
	notes = {
		          'c': 12, 'c#': 13,
		'db': 13, 'd': 14, 'd#': 15,
		'eb': 15, 'e': 16,
		          'f': 17, 'f#': 18,
		'gb': 18, 'g': 19, 'g#': 20,
		'ab': 20, 'a': 21, 'a#': 22,
		'bb': 22, 'b': 23
	}

function parse(txt, basis = 32) {
	return txt
		.split(/[\s,;]+/g)
		.map(txt => {
			const res = parser.exec(txt);
			if (!res)
				throw new Error('Bad note: "' + txt + '"');
			const [
				all,
				octave, note,
				numerator, frac, denominator
			] = res;
			return {
				note: notes[note.toLowerCase()] +
					12 * parseInt(octave || '4', 10),
				duration: Math.round(
					parseInt(numerator, 10) * basis /
					parseInt(denominator || '1', 10))
			};
		});
}

function length(song) {
	return song.reduce((p, note) => p + note.duration, 0) * 64 / 1000;
}

module.exports = {
	parse,
	length
};
