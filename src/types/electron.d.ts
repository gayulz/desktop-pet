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

export interface ElectronAPI {
	quitApp: () => void;
	setPosition: (x: number, y: number) => void;
	getState: () => Promise<PetState | null>;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
