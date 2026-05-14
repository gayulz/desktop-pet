import { Tray, Menu, nativeImage, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';

export interface TrayCallbacks {
	onToggleCoding: () => void;
	onToggleAiMode: () => void;
	onOpenScreenRecording: () => void;
	onOpenSettings: () => void;
	onToggleVisible: () => void;
	onQuit: () => void;
}

export interface TrayState {
	codingActive: boolean;
	aiModeActive: boolean;
	petVisible: boolean;
}

let trayInstance: Tray | null = null;

// Build the menu template once so the same items appear in the tray and the
// pet's right-click menu. The two callers wire their own click handlers.
export function buildMenuTemplate(state: TrayState, cb: TrayCallbacks): MenuItemConstructorOptions[] {
	return [
		{
			label: state.codingActive ? '코딩 모드 종료' : '코딩 모드 시작',
			click: cb.onToggleCoding,
		},
		{
			label: state.aiModeActive ? 'AI 모드 종료' : 'AI 모드 시작',
			click: cb.onToggleAiMode,
		},
		{ type: 'separator' },
		{
			label: state.petVisible ? '코디 숨기기' : '코디 보이기',
			click: cb.onToggleVisible,
		},
		{ type: 'separator' },
		{
			label: '설정 열기...',
			click: cb.onOpenSettings,
		},
		{
			label: '권한 설정 열기 (자동 감지 활성화)',
			click: cb.onOpenScreenRecording,
		},
		{ type: 'separator' },
		{
			label: '코디 재우기 (종료)',
			click: cb.onQuit,
		},
	];
}

export function createTray(iconPath: string, cb: TrayCallbacks, initialState: TrayState): Tray {
	if (trayInstance) return trayInstance;

	const image = nativeImage.createFromPath(iconPath);
	// Tell macOS this is a template image so the OS can recolor it for light /
	// dark menu bars. Without this the icon looks colorful on light bars and
	// fine on dark bars (or vice versa).
	image.setTemplateImage(true);

	trayInstance = new Tray(image);
	trayInstance.setToolTip('Codi');

	refreshTrayMenu(initialState, cb);

	return trayInstance;
}

export function refreshTrayMenu(state: TrayState, cb: TrayCallbacks): void {
	if (!trayInstance) return;
	const menu = Menu.buildFromTemplate(buildMenuTemplate(state, cb));
	trayInstance.setContextMenu(menu);
}

export function destroyTray(): void {
	if (trayInstance) {
		trayInstance.destroy();
		trayInstance = null;
	}
}

export function getTrayIconPath(): string {
	// Bundled inside assets so packaged app finds it next to dist/.
	// In dev __dirname is dist-electron/, in production it's resources/app/
	// dist-electron — both resolve up to the project root for the asset.
	return path.resolve(__dirname, '..', 'assets', 'codi', 'tray-icon.png');
}

// Helper exposed for the show/hide toggle.
export function applyWindowVisibility(window: BrowserWindow | null, visible: boolean): void {
	if (!window || window.isDestroyed()) return;
	if (visible) window.show();
	else window.hide();
}
