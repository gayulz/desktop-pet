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
	cpuLoad: number;        // 0..100
	systemIdleSec: number;  // seconds since last system input
}

export type ContextMenuResult = 'toggle-coding' | 'quit' | null;

export interface ElectronAPI {
	quitApp: () => void;
	setPosition: (x: number, y: number) => void;
	getState: () => Promise<PetState | null>;
	onMetricsTick: (listener: (m: PetMetrics) => void) => () => void;
	showContextMenu: (codingActive: boolean) => Promise<ContextMenuResult>;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
