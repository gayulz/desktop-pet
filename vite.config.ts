import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
	plugins: [react()],
	base: './',
	build: { outDir: 'dist' },
	server: { port: 5173 },
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			'@assets': resolve(__dirname, 'assets'),
		},
	},
	assetsInclude: ['**/*.png'],
});
