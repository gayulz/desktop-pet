import { app, BrowserWindow, screen, shell } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc';
import { startMetricsPoller } from './metrics';
import { startActiveWindowPoller } from './active-window';
import { startGitWatcher } from './git-watcher';
import { startNotifyServer, type NotifyPayload } from './notify-server';
import { startClaudeWatcher } from './claude-watcher';
import {
	createTray,
	destroyTray,
	refreshTrayMenu,
	getTrayIconPath,
	applyWindowVisibility,
	type TrayCallbacks,
	type TrayState,
} from './tray';
import { loadSettings, saveSettings, type AppSettings } from './settings';

const isDev = !app.isPackaged;
let petWindow: BrowserWindow | null = null;
let stopMetrics: (() => void) | null = null;
let stopActiveWindow: (() => void) | null = null;
let stopGitWatcher: (() => void) | null = null;
let stopNotifyServer: (() => void) | null = null;
let stopClaudeWatcher: (() => void) | null = null;

// Authoritative tray-level state. The renderer keeps its own copy but reports
// changes back so the tray menu can mirror it.
const trayState: TrayState = {
	codingActive: false,
	aiModeActive: false,
	petVisible: true,
};

let settingsWindow: BrowserWindow | null = null;

const PET_SIZE = 220;
// Window is wider than Codi's sprite area so the speech bubble has room to
// sit at Codi's top-right without spawning a second BrowserWindow. The extra
// columns are transparent when no bubble is showing.
const WINDOW_WIDTH = 360;
// Walk range: 60% of screen width, centered horizontally.
// 20% margin on each side keeps Codi out of the screen edges.
const WALK_MARGIN_RATIO = 0.2;
const BOTTOM_OFFSET = 50;
const METRICS_INTERVAL_MS = 5000;
const ACTIVE_WINDOW_INTERVAL_MS = 2000;

function createPetWindow() {
	const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

	// Center Codi's sprite area on screen. Window left = (sw - petSize) / 2
	// places the leftmost petSize columns of the window centered, which keeps
	// behavior identical to the pre-bubble layout.
	const startX = Math.round((sw - PET_SIZE) / 2);
	const startY = sh - PET_SIZE - BOTTOM_OFFSET;

	petWindow = new BrowserWindow({
		width: WINDOW_WIDTH,
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
		// Forward renderer console messages to the dev terminal so we can
		// debug PetController state from the same place as main logs.
		petWindow.webContents.on('console-message', (_e, _level, message) => {
			console.log('[renderer]', message);
		});
	} else {
		petWindow.loadFile(path.join(__dirname, '../dist/index.html'));
	}

	petWindow.on('closed', () => {
		petWindow = null;
	});
}

registerIpcHandlers({
	getPetWindow: () => petWindow,
	petSize: PET_SIZE,
	walkMarginRatio: WALK_MARGIN_RATIO,
	bottomOffset: BOTTOM_OFFSET,
	trayState,
	getTrayCallbacks: () => buildTrayCallbacks(),
	applySettings,
});

// Tray callbacks dispatch to the renderer via IPC so the renderer's state
// machine remains the single source of truth for what Codi is doing.
function buildTrayCallbacks(): TrayCallbacks {
	return {
		onToggleCoding: () => {
			petWindow?.webContents.send('pet:tray-action', 'toggle-coding');
		},
		onToggleAiMode: () => {
			petWindow?.webContents.send('pet:tray-action', 'toggle-ai-mode');
		},
		onOpenScreenRecording: () => {
			shell.openExternal(
				'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
			);
		},
		onOpenSettings: () => {
			openSettingsWindow();
		},
		onToggleVisible: () => {
			trayState.petVisible = !trayState.petVisible;
			applyWindowVisibility(petWindow, trayState.petVisible);
			refreshTrayMenu(trayState, buildTrayCallbacks());
		},
		onQuit: () => {
			app.quit();
		},
	};
}

function startActiveWindow() {
	if (stopActiveWindow) return;
	stopActiveWindow = startActiveWindowPoller(ACTIVE_WINDOW_INTERVAL_MS, (info) => {
		if (petWindow && !petWindow.isDestroyed()) {
			petWindow.webContents.send('pet:active-window-tick', info);
		}
	});
}

function startGit() {
	if (stopGitWatcher) return;
	stopGitWatcher = startGitWatcher(process.cwd(), (event) => {
		if (petWindow && !petWindow.isDestroyed()) {
			petWindow.webContents.send('pet:git-commit', event);
		}
	});
}

function startClaude() {
	if (stopClaudeWatcher) return;
	const sendAiActivity = (timestampMs: number) => {
		if (petWindow && !petWindow.isDestroyed()) {
			petWindow.webContents.send('pet:ai-activity', timestampMs);
		}
	};
	// Claude end_turn → speech bubble notice (no title/body yet because we
	// don't tag every turn with a human-readable summary). The renderer just
	// switches Codi into the notice sprite; the user can click to dismiss.
	const sendClaudeNotify = () => {
		if (petWindow && !petWindow.isDestroyed()) {
			const payload: NotifyPayload = { source: 'claude' };
			petWindow.webContents.send('pet:notify', payload);
		}
	};
	stopClaudeWatcher = startClaudeWatcher({
		onNotify: sendClaudeNotify,
		onActivity: sendAiActivity,
	});
}

function applySettings(settings: AppSettings) {
	// Toggle individual watchers based on the settings without restarting.
	if (settings.enableActiveWindow) {
		startActiveWindow();
	} else if (stopActiveWindow) {
		stopActiveWindow();
		stopActiveWindow = null;
	}
	if (settings.enableGitWatch) {
		startGit();
	} else if (stopGitWatcher) {
		stopGitWatcher();
		stopGitWatcher = null;
	}
	if (settings.enableClaudeWatch) {
		startClaude();
	} else if (stopClaudeWatcher) {
		stopClaudeWatcher();
		stopClaudeWatcher = null;
	}
	// Push the latest keyword list to the renderer immediately.
	if (petWindow && !petWindow.isDestroyed()) {
		petWindow.webContents.send('settings:changed', settings);
	}
}

function openSettingsWindow() {
	if (settingsWindow && !settingsWindow.isDestroyed()) {
		settingsWindow.focus();
		return;
	}
	settingsWindow = new BrowserWindow({
		width: 480,
		height: 540,
		title: '코디 설정',
		resizable: false,
		minimizable: false,
		maximizable: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});
	if (isDev) {
		settingsWindow.loadURL('http://localhost:5173/settings.html');
	} else {
		settingsWindow.loadFile(path.join(__dirname, '../dist/settings.html'));
	}
	settingsWindow.on('closed', () => {
		settingsWindow = null;
	});
}

app.whenReady().then(() => {
	createPetWindow();

	// Menu bar tray. Lives for the whole app lifetime; clicking shows the
	// same menu options as right-clicking Codi.
	createTray(getTrayIconPath(), buildTrayCallbacks(), trayState);

	// CPU + idle metrics always run — they're cheap and required by the state
	// machine even when external integrations are disabled.
	stopMetrics = startMetricsPoller(METRICS_INTERVAL_MS, (m) => {
		if (petWindow && !petWindow.isDestroyed()) {
			petWindow.webContents.send('pet:metrics-tick', m);
		}
	});

	stopNotifyServer = startNotifyServer((payload) => {
		if (petWindow && !petWindow.isDestroyed()) {
			petWindow.webContents.send('pet:notify', payload);
		}
	});

	// Apply persisted settings: this starts the active-window / git / claude
	// watchers that are enabled.
	applySettings(loadSettings());

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
	destroyTray();
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
