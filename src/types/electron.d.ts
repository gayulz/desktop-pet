/// <reference types="vite/client" />

export interface PetState {
	x: number;
	y: number;
	screenWidth: number;
	screenHeight: number;
	petSize: number;
	walkMarginRatio: number;
	floorY: number;
}

export interface PetMetrics {
	cpuLoad: number;
	systemIdleSec: number;
}

export type AppCategory = 'editor' | 'terminal' | 'browser' | 'unknown';

export interface ActiveWindowInfo {
	title: string;
	appName: string;
	bundleId: string;
	category: AppCategory;
}

export interface GitCommitEvent {
	sha: string;
	subject: string;
	timestampMs: number;
}

export interface NotifyPayload {
	title?: string;
	body?: string;
	source: 'http' | 'claude';
}

export type ContextMenuResult =
	| 'toggle-coding'
	| 'toggle-ai-mode'
	| 'open-screen-recording'
	| 'quit'
	| null;

export interface ElectronAPI {
	quitApp: () => void;
	setPosition: (x: number, y: number) => void;
	getState: () => Promise<PetState | null>;
	onMetricsTick: (listener: (m: PetMetrics) => void) => () => void;
	onActiveWindowTick: (listener: (info: ActiveWindowInfo) => void) => () => void;
	onGitCommit: (listener: (e: GitCommitEvent) => void) => () => void;
	onNotify: (listener: (p: NotifyPayload) => void) => () => void;
	onAiActivity: (listener: (timestampMs: number) => void) => () => void;
	onTrayAction: (
		listener: (action: 'toggle-coding' | 'toggle-ai-mode') => void
	) => () => void;
	reportState: (state: {
		codingActive?: boolean;
		aiModeActive?: boolean;
		petVisible?: boolean;
	}) => void;
	showContextMenu: (codingActive: boolean, aiModeActive: boolean) => Promise<ContextMenuResult>;
	openScreenRecordingPrefs: () => void;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
