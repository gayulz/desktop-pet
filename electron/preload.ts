import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	quitApp: () => ipcRenderer.send('app:quit'),
	setX: (x: number) => ipcRenderer.send('pet:set-x', x),
	getState: () => ipcRenderer.invoke('pet:get-state'),
});

export {};
