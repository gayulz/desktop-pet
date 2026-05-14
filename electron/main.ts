import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';

const isDev = !app.isPackaged;
let petWindow: BrowserWindow | null = null;

const PET_SIZE = 220;
// Walk range: 60% of screen width, centered horizontally.
// 20% margin on each side keeps Codi out of the screen edges.
const WALK_MARGIN_RATIO = 0.2;
const BOTTOM_OFFSET = 50;

function createPetWindow() {
	const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

	const startX = Math.round((sw - PET_SIZE) / 2);
	const startY = sh - PET_SIZE - BOTTOM_OFFSET;

	petWindow = new BrowserWindow({
		width: PET_SIZE,
		height: PET_SIZE,
		x: startX,
		y: startY,
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

// Move the pet window to an absolute screen X coordinate.
// Y is locked to the bottom row so Codi always walks on the floor.
ipcMain.on('pet:set-x', (_event, x: number) => {
	if (!petWindow) return;
	const { height: sh } = screen.getPrimaryDisplay().workAreaSize;
	const y = sh - PET_SIZE - BOTTOM_OFFSET;
	petWindow.setPosition(Math.round(x), y);
});

// Return the current window X plus screen geometry so the renderer can plan
// both the wide walk loop (initial) and the local walk loop (after drag).
ipcMain.handle('pet:get-state', () => {
	if (!petWindow) {
		return null;
	}
	const [x] = petWindow.getPosition();
	const { width: sw } = screen.getPrimaryDisplay().workAreaSize;
	return {
		x,
		screenWidth: sw,
		petSize: PET_SIZE,
		walkMarginRatio: WALK_MARGIN_RATIO,
	};
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
