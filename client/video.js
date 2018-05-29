document.addEventListener('DOMContentLoaded', e => {
	const canvas = document.getElementById('video'),
		wsavc = new WSAvcPlayer(canvas, "webgl", 1, 35);
	wsavc.connect(`ws://${document.location.host.replace(':4000', ':4001')}`);

	let running = false;

	const toggleVideo = document.getElementById('toggle-video');
	toggleVideo.addEventListener('click', updateVideo);
	setTimeout(updateVideo, 1000);
	function updateVideo() {
		if (!running && toggleVideo.checked) {
			wsavc.playStream();
			running = true;
		} else if (running && !toggleVideo.checked) {
			wsavc.stopStream();
			running = false;
		}
	}
});
