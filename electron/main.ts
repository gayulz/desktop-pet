import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';

const isDev = !app.isPackaged;
let petWindow: BrowserWindow | null = null;

function createPetWindow() {
	const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
	const petSize = 220;

	petWindow = new BrowserWindow({
		width: petSize,
		height: petSize,
		x: sw - petSize - 50,
		y: sh - petSize - 50,
		frame: false,
		transparent: true,
		backgroundColor: '#00000000',
		alwaysOnTop: true,
		skipTaskbar: true,
		resizable: false,
		hasShadow: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	petWindow.setVisibleOnAllWorkspaces(true, {
		visibleOnFullScreen: true,
	});

	if (isDev) {
		petWindow.loadURL('http://localhost:5173');
	} else {
		petWindow.loadFile(path.join(__dirname, '../dist/index.html'));
	}

	petWindow.on('closed', () => {
		petWindow = null;
	});
}

ipcMain.on('app:quit', () => {
	app.quit();
});

app.whenReady().then(() => {
	createPetWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createPetWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
