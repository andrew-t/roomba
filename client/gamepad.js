const chromeMode = navigator.userAgent.toLowerCase().indexOf("chrome") >= 0;
if (chromeMode) console.warn('Bullshit Chrome Mode');
let forceBox, playing, startHeld, videoPanel, socket, pad = null;

//either order, we don't care:

window.addEventListener("gamepadconnected", e =>
window.addEventListener("DOMContentLoaded", () =>
	processGamepadEvent(e)));

window.addEventListener("DOMContentLoaded", () =>
window.addEventListener("gamepadconnected",
	processGamepadEvent));

function processGamepadEvent(e) {
	console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
		e.gamepad.index, e.gamepad.id,
		e.gamepad.buttons.length, e.gamepad.axes.length);

	if (pad) {
		console.error('Ignoring pad as we already have one');
		return;
	} else
		pad = e.gamepad;

	videoPanel = document.getElementById('title-screen');
	forceBox = document.getElementById('force-chrome-mode');
	playing = !!videoPanel && videoPanel.classList.contains('playing');
	startHeld = false;
	socket = io();

	requestAnimationFrame(updatePad);
}

function updatePad() {
	// Chrome provides snapshots which never update
	// so we have to get the updates manually.
	// This makes it harder to track pads
	// so just only plug in one pls.
	if (chromeMode || forceBox.checked) {
		const pads = navigator.getGamepads();
		for (let i = 0; i < pads.length; ++i)
			if (pads[i]) {
				pad = pads[i];
				break;
			} else if (i >= pads.length) {
				console.error('no pads found');
				return;
			}
	}
	if (pad.buttons[7].value || pad.buttons[9].value) {
		if (startHeld) {
			requestAnimationFrame(updatePad);
			return;
		}
		console.log('Start pressed');
		playing = videoPanel
			? videoPanel.classList.toggle('playing')
			: !playing;
		console.log('Playing =', playing);
		startHeld = true;
	} else
		startHeld = false;
	if (!playing) {
		requestAnimationFrame(updatePad);
		return;
	}

	let x = pad.axes[0],
		y = pad.axes[1];
	if (!config.reverse)
		y = -y;
	// Deadzone
	if (Math.abs(x) < 0.1) x = 0;
	if (Math.abs(y) < 0.1) y = 0;
	// console.log(`Stick at ${x}, ${y}`);
	const turn = x * (1 - Math.abs(y * config.turnSpeed));
	let left = Math.floor((y - turn) * config.speed),
		right = Math.floor((y + turn) * config.speed);
	if (left  < -500) left  = -500;
	if (left  >  500) left  =  500;
	if (right < -500) right = -500;
	if (right >  500) right =  500;
	socket.emit('controls', {
		left, right,
		vac:       !!pad.buttons[0].value,
		sideBrush: !!pad.buttons[1].value,
		brush:     !!pad.buttons[2].value,
		ttl: 300
	});
	requestAnimationFrame(updatePad);
}
