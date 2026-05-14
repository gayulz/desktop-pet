import { app, BrowserWindow, screen, ipcMain, Menu, shell } from 'electron';
import * as path from 'path';
import { startMetricsPoller } from './metrics';
import { startActiveWindowPoller } from './active-window';
import { startGitWatcher } from './git-watcher';
import { startNotifyServer, type NotifyPayload } from './notify-server';
import { startClaudeWatcher } from './claude-watcher';

const isDev = !app.isPackaged;
let petWindow: BrowserWindow | null = null;
let stopMetrics: (() => void) | null = null;
let stopActiveWindow: (() => void) | null = null;
let stopGitWatcher: (() => void) | null = null;
let stopNotifyServer: (() => void) | null = null;
let stopClaudeWatcher: (() => void) | null = null;

const PET_SIZE = 220;
// Walk range: 60% of screen width, centered horizontally.
// 20% margin on each side keeps Codi out of the screen edges.
const WALK_MARGIN_RATIO = 0.2;
const BOTTOM_OFFSET = 50;
const METRICS_INTERVAL_MS = 5000;
const ACTIVE_WINDOW_INTERVAL_MS = 2000;

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

type ContextMenuAction =
	| 'toggle-coding'
	| 'toggle-ai-mode'
	| 'open-screen-recording'
	| 'quit';

interface MenuPayload {
	codingActive: boolean;
	aiModeActive: boolean;
}

// Right-click context menu. The renderer reports whether manual override modes
// are active so the toggle labels reflect the current state.
ipcMain.handle('pet:show-menu', async (_event, payload: MenuPayload) => {
	return new Promise<ContextMenuAction | null>((resolve) => {
		let resolved = false;
		const done = (value: ContextMenuAction | null) => {
			if (resolved) return;
			resolved = true;
			resolve(value);
		};
		const menu = Menu.buildFromTemplate([
			{
				label: payload.codingActive ? '코딩 모드 종료' : '코딩 모드 시작',
				click: () => done('toggle-coding'),
			},
			{
				label: payload.aiModeActive ? 'AI 모드 종료' : 'AI 모드 시작',
				click: () => done('toggle-ai-mode'),
			},
			{ type: 'separator' },
			{
				label: '권한 설정 열기 (자동 감지 활성화)',
				click: () => done('open-screen-recording'),
			},
			{ type: 'separator' },
			{
				label: '코디 재우기 (종료)',
				click: () => done('quit'),
			},
		]);
		menu.popup({
			window: petWindow ?? undefined,
			callback: () => done(null),
		});
	});
});

ipcMain.on('pet:open-screen-recording-prefs', () => {
	// macOS deep link to the Privacy & Security › Screen Recording pane.
	shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
});

// Move the pet window to an absolute screen position.
// Renderer owns all coordinate policy (floor lock for walking, free Y for drag).
ipcMain.on('pet:set-position', (_event, x: number, y: number) => {
	if (!petWindow) return;
	petWindow.setPosition(Math.round(x), Math.round(y));
});

// Return current window position plus screen geometry so the renderer can plan
// both the wide walk loop (initial) and the local walk loop (after drag).
ipcMain.handle('pet:get-state', () => {
	if (!petWindow) {
		return null;
	}
	const [x, y] = petWindow.getPosition();
	const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
	const floorY = sh - PET_SIZE - BOTTOM_OFFSET;
	return {
		x,
		y,
		screenWidth: sw,
		screenHeight: sh,
		petSize: PET_SIZE,
		walkMarginRatio: WALK_MARGIN_RATIO,
		floorY,
	};
});

app.whenReady().then(() => {
	createPetWindow();

	// Broadcast system metrics to the renderer at a fixed cadence.
	stopMetrics = startMetricsPoller(METRICS_INTERVAL_MS, (m) => {
		if (petWindow && !petWindow.isDestroyed()) {
			petWindow.webContents.send('pet:metrics-tick', m);
		}
	});

	// Broadcast active window changes (deduplicated by the poller).
	stopActiveWindow = startActiveWindowPoller(ACTIVE_WINDOW_INTERVAL_MS, (info) => {
		if (petWindow && !petWindow.isDestroyed()) {
			petWindow.webContents.send('pet:active-window-tick', info);
		}
	});

	// Watch the project's .git/logs/HEAD for commit events.
	// In packaged builds there is no git repo, so the watcher no-ops.
	stopGitWatcher = startGitWatcher(process.cwd(), (event) => {
		if (petWindow && !petWindow.isDestroyed()) {
			petWindow.webContents.send('pet:git-commit', event);
		}
	});

	const sendNotice = (payload: NotifyPayload) => {
		if (petWindow && !petWindow.isDestroyed()) {
			petWindow.webContents.send('pet:notify', payload);
		}
	};

	stopNotifyServer = startNotifyServer(sendNotice);
	stopClaudeWatcher = startClaudeWatcher(() => sendNotice({ source: 'claude' }));

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createPetWindow();
		}
	});
});

app.on('before-quit', () => {
	if (stopMetrics) stopMetrics();
	if (stopActiveWindow) stopActiveWindow();
	if (stopGitWatcher) stopGitWatcher();
	if (stopNotifyServer) stopNotifyServer();
	if (stopClaudeWatcher) stopClaudeWatcher();
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
