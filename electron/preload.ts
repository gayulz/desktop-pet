import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

export interface PetMetrics {
	cpuLoad: number;
	systemIdleSec: number;
}

contextBridge.exposeInMainWorld('electronAPI', {
	quitApp: () => ipcRenderer.send('app:quit'),
	setPosition: (x: number, y: number) => ipcRenderer.send('pet:set-position', x, y),
	getState: () => ipcRenderer.invoke('pet:get-state'),
	onMetricsTick: (listener: (m: PetMetrics) => void) => {
		const wrapped = (_e: IpcRendererEvent, m: PetMetrics) => listener(m);
		ipcRenderer.on('pet:metrics-tick', wrapped);
		return () => ipcRenderer.removeListener('pet:metrics-tick', wrapped);
	},
	showContextMenu: (codingActive: boolean): Promise<'toggle-coding' | 'quit' | null> =>
		ipcRenderer.invoke('pet:show-menu', { codingActive }),
});

export {};
