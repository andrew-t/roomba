document.addEventListener('DOMContentLoaded', () => {
	const t = document.getElementById('fullscreen-target');
	document.getElementById('fullscreen').addEventListener('click', e => {
		if (t.requestFullScreen)
			t.requestFullScreen();
		else if (t.mozRequestFullScreen)
			t.mozRequestFullScreen();
		else if (t.webkitRequestFullScreen)
			t.webkitRequestFullScreen();
		else
			console.error('No fullscreen support found');
		e.preventDefault();
	});
});
