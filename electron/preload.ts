import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	quitApp: () => ipcRenderer.send('app:quit'),
	setPosition: (x: number, y: number) => ipcRenderer.send('pet:set-position', x, y),
	getState: () => ipcRenderer.invoke('pet:get-state'),
});

export {};
