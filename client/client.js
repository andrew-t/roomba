document.addEventListener('DOMContentLoaded', e => {
	const buttons = document.querySelectorAll('button[data-command]');
	for (let i = 0; i < buttons.length; ++i) {
		const button = buttons[i],
			command = button.getAttribute('data-command');
		console.log(`Wiring up ${command} button.`);
		button.addEventListener('click', e => {
			console.log(`Clicked ${command} button.`);
			fetch('/command/' + command);
			e.preventDefault();
		});
	}
});
