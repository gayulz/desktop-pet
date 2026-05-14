/// <reference types="vite/client" />

export interface PetState {
	x: number;
	screenWidth: number;
	petSize: number;
	walkMarginRatio: number;
}

export interface ElectronAPI {
	quitApp: () => void;
	setX: (x: number) => void;
	getState: () => Promise<PetState | null>;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
