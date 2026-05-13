import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 3004,
		host: '0.0.0.0',
		allowedHosts: ['tor.houseofmates.space', '.houseofmates.space']
	}
});