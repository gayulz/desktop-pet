import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

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

contextBridge.exposeInMainWorld('electronAPI', {
	quitApp: () => ipcRenderer.send('app:quit'),
	setPosition: (x: number, y: number) => ipcRenderer.send('pet:set-position', x, y),
	getState: () => ipcRenderer.invoke('pet:get-state'),
	onMetricsTick: (listener: (m: PetMetrics) => void) => {
		const wrapped = (_e: IpcRendererEvent, m: PetMetrics) => listener(m);
		ipcRenderer.on('pet:metrics-tick', wrapped);
		return () => ipcRenderer.removeListener('pet:metrics-tick', wrapped);
	},
	onActiveWindowTick: (listener: (info: ActiveWindowInfo) => void) => {
		const wrapped = (_e: IpcRendererEvent, info: ActiveWindowInfo) => listener(info);
		ipcRenderer.on('pet:active-window-tick', wrapped);
		return () => ipcRenderer.removeListener('pet:active-window-tick', wrapped);
	},
	onGitCommit: (listener: (e: GitCommitEvent) => void) => {
		const wrapped = (_e: IpcRendererEvent, ev: GitCommitEvent) => listener(ev);
		ipcRenderer.on('pet:git-commit', wrapped);
		return () => ipcRenderer.removeListener('pet:git-commit', wrapped);
	},
	onNotify: (listener: (p: NotifyPayload) => void) => {
		const wrapped = (_e: IpcRendererEvent, p: NotifyPayload) => listener(p);
		ipcRenderer.on('pet:notify', wrapped);
		return () => ipcRenderer.removeListener('pet:notify', wrapped);
	},
	onAiActivity: (listener: (timestampMs: number) => void) => {
		const wrapped = (_e: IpcRendererEvent, ts: number) => listener(ts);
		ipcRenderer.on('pet:ai-activity', wrapped);
		return () => ipcRenderer.removeListener('pet:ai-activity', wrapped);
	},
	showContextMenu: (
		codingActive: boolean,
		aiModeActive: boolean
	): Promise<'toggle-coding' | 'toggle-ai-mode' | 'open-screen-recording' | 'quit' | null> =>
		ipcRenderer.invoke('pet:show-menu', { codingActive, aiModeActive }),
	openScreenRecordingPrefs: () => ipcRenderer.send('pet:open-screen-recording-prefs'),
});

export {};
