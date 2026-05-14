// All ipcMain bindings live here so main.ts stays focused on lifecycle and
// orchestration. Each register function accepts the dependencies it needs from
// main (window references, callbacks) — there are no shared globals.

import { app, BrowserWindow, ipcMain, Menu, screen, shell } from 'electron';
import { loadSettings, saveSettings, type AppSettings } from './settings';
import type { TrayCallbacks, TrayState } from './tray';
import { refreshTrayMenu } from './tray';

export type ContextMenuAction =
	| 'toggle-coding'
	| 'toggle-ai-mode'
	| 'open-screen-recording'
	| 'quit';

interface MenuPayload {
	codingActive: boolean;
	aiModeActive: boolean;
}

export interface IpcDeps {
	getPetWindow: () => BrowserWindow | null;
	petSize: number;
	walkMarginRatio: number;
	bottomOffset: number;
	trayState: TrayState;
	getTrayCallbacks: () => TrayCallbacks;
	applySettings: (settings: AppSettings) => void;
}

export function registerIpcHandlers(deps: IpcDeps): void {
	ipcMain.on('app:quit', () => {
		app.quit();
	});

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
				window: deps.getPetWindow() ?? undefined,
				callback: () => done(null),
			});
		});
	});

	ipcMain.on('pet:open-screen-recording-prefs', () => {
		shell.openExternal(
			'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
		);
	});

	ipcMain.on('pet:state-update', (_event, partial: Partial<TrayState>) => {
		Object.assign(deps.trayState, partial);
		refreshTrayMenu(deps.trayState, deps.getTrayCallbacks());
	});

	ipcMain.handle('settings:get', () => loadSettings());

	ipcMain.handle('settings:save', (_event, next: Partial<AppSettings>) => {
		const merged = saveSettings(next);
		deps.applySettings(merged);
		return merged;
	});

	ipcMain.on('pet:set-position', (_event, x: number, y: number) => {
		const win = deps.getPetWindow();
		if (!win) return;
		win.setPosition(Math.round(x), Math.round(y));
	});

	ipcMain.handle('pet:get-state', () => {
		const win = deps.getPetWindow();
		if (!win) return null;
		const [x, y] = win.getPosition();
		const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
		const floorY = sh - deps.petSize - deps.bottomOffset;
		return {
			x,
			y,
			screenWidth: sw,
			screenHeight: sh,
			petSize: deps.petSize,
			walkMarginRatio: deps.walkMarginRatio,
			floorY,
		};
	});
}
