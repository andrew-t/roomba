document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('title-screen'),
		slices = 64;
	for (let i = 0; i < slices; ++i) {
		const slice = document.createElement('div');
		slice.style.backgroundPosition = `${(i + 0.5) * 100 / (slices - 0.5)}% 50%`;
		slice.style.transition = `transform ${Math.random() * 200 + 300}ms ease-in`;
		container.appendChild(slice);
	}
});
