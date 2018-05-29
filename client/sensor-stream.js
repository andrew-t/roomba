document.addEventListener('DOMContentLoaded', e => {
	const socket = io(),
		tickBox = document.getElementById('toggle-sensors');
	toggle();
	socket.on('sensors', msg => {
		bool(msg.bump.left, 'bump-left');
		bool(msg.bump.right, 'bump-right');
		bool(msg.buttons.clean, 'button-clean');
		bool(msg.buttons.max, 'button-max');
		bool(msg.buttons.power, 'button-power');
		bool(msg.buttons.spot, 'button-spot');
		bool(msg.cliff.left, 'cliff-left');
		bool(msg.cliff.leftFront, 'cliff-left-front');
		bool(msg.cliff.rightFront, 'cliff-right-front');
		bool(msg.cliff.right, 'cliff-right');
		bool(msg.motorOvercurrent.sideBrush, 'overcurrent-side-brush');
		bool(msg.motorOvercurrent.vacuum, 'overcurrent-vacuum');
		bool(msg.motorOvercurrent.mainBrush, 'overcurrent-brush');
		bool(msg.motorOvercurrent.rightDrive, 'overcurrent-right');
		bool(msg.motorOvercurrent.leftDrive, 'overcurrent-left');
		bool(msg.wall, 'wall');
		bool(msg.virtualWall, 'wall-virtual');
		bool(msg.wheelDrop.left, 'wheel-drop-left');
		bool(msg.wheelDrop.caster, 'wheel-drop-caster');
		bool(msg.wheelDrop.right, 'wheel-drop-right');
		percentage(msg.charge, 'charge');
		percentage(msg.dirt.left / 255, 'dirt-left');
		percentage(msg.dirt.right / 255, 'dirt-right');
		number(msg.rcCommand, 'rc-command');
		number(msg.current, 'current');
		number(msg.voltage, 'voltage');
		number(msg.temperature, 'temperature');
		number(msg.angle, 'angle');
		number(msg.distance, 'distance');
		number(msg.capacity, 'charge-capacity');
	});

	function bool(val, id) {
		const el = document.getElementById(id);
		if (val) {
			el.classList.add('on');
			el.classList.remove('off');
		} else {
			el.classList.add('off');
			el.classList.remove('on');
		}
	}

	function percentage(val, id) {
		const el = document.getElementById(id);
		el.innerHTML = Math.floor(val * 100) + '%';
	}

	function number(val, id) {
		const el = document.getElementById(id);
		el.innerHTML = Math.floor(val);
	}

	tickBox.addEventListener('change', toggle);
	function toggle() {
		socket.emit('sensors', {
			interval: tickBox.checked
				? config.sensorInterval || 300
				: null
		});
	}
});
