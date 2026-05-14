// User-tunable settings persisted to disk. Owned by the main process so the
// renderer always gets one canonical copy via IPC.
//
// Storage: <userData>/settings.json — userData resolves to
// ~/Library/Application Support/codi on macOS, both in dev and in the
// packaged build.

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface AppSettings {
	studyKeywords: string[];
	enableActiveWindow: boolean;
	enableClaudeWatch: boolean;
	enableGitWatch: boolean;
}

const DEFAULTS: AppSettings = {
	studyKeywords: ['인프런', 'inflearn', '강의', '학습', '공부'],
	// active-win triggers a macOS accessibility / screen recording dialog on
	// every poll until the user explicitly grants permission. We default it OFF
	// so first-run users aren't bombarded — they can turn it on later from the
	// settings window if they want coding / studying auto-detection.
	enableActiveWindow: false,
	enableClaudeWatch: true,
	enableGitWatch: true,
};

function settingsPath(): string {
	return path.join(app.getPath('userData'), 'settings.json');
}

function mergeWithDefaults(partial: Partial<AppSettings>): AppSettings {
	return {
		studyKeywords:
			Array.isArray(partial.studyKeywords) && partial.studyKeywords.length > 0
				? partial.studyKeywords.map((k) => String(k).trim()).filter(Boolean)
				: DEFAULTS.studyKeywords,
		enableActiveWindow: partial.enableActiveWindow ?? DEFAULTS.enableActiveWindow,
		enableClaudeWatch: partial.enableClaudeWatch ?? DEFAULTS.enableClaudeWatch,
		enableGitWatch: partial.enableGitWatch ?? DEFAULTS.enableGitWatch,
	};
}

let cache: AppSettings | null = null;

export function loadSettings(): AppSettings {
	if (cache) return cache;
	try {
		const raw = fs.readFileSync(settingsPath(), 'utf-8');
		const parsed = JSON.parse(raw) as Partial<AppSettings>;
		cache = mergeWithDefaults(parsed);
	} catch {
		cache = { ...DEFAULTS };
	}
	return cache;
}

export function saveSettings(next: Partial<AppSettings>): AppSettings {
	const merged = mergeWithDefaults({ ...loadSettings(), ...next });
	cache = merged;
	try {
		fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
		fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf-8');
	} catch (err) {
		console.error('[settings] save failed:', err);
	}
	return merged;
}

export function defaultSettings(): AppSettings {
	return { ...DEFAULTS };
}
