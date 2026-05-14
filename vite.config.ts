import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
	plugins: [react()],
	base: './',
	build: {
		outDir: 'dist',
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				settings: resolve(__dirname, 'settings.html'),
			},
		},
	},
	server: { port: 5173 },
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			'@assets': resolve(__dirname, 'assets'),
		},
	},
	assetsInclude: ['**/*.png'],
});
