document.addEventListener('DOMContentLoaded', e => {
	const tickBox = document.getElementById('toggle-status-led');
	let state = false;
	setInterval(() => {
		if (!tickBox || tickBox.checked) {
			state = !state;
			fetch(`command/leds?powerIntensity=255&powerHue=${state ? 255 : 0}`);
		}
	}, 1000);
});
