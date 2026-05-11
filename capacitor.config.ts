import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'space.houseofmates.torrent',
	appName: 'torrent',
	webDir: 'build',
	server: {
		url: 'https://tor.houseofmates.space',
		cleartext: false
	}
};

export default config;
