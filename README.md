


# Install the server on the Pi

Clone the repo, then:

```sh
npm install

# create the video player dist file
npm run dist

# create and start the services (this needs sudo)
chmod 644 systemd/*.service
cp systemd/*.service /lib/systemd/system/
systemctl daemon-reload
service vac start
service vac-video start
```
