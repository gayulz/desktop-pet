/// <reference types="vite/client" />

export interface ElectronAPI {
	quitApp: () => void;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
