// Active-window poller. Reports the foreground app's bundle id and window
// title to the renderer so the state machine can decide whether Codi is
// coding, studying, or just idling.
//
// macOS Screen Recording permission is required to read window titles. If the
// user has not granted it, active-win returns objects with an empty title.
// We surface that by setting category to 'unknown' so the state machine can
// fall back to Week 2 behaviour.

import activeWindow from 'active-win';

export type AppCategory = 'editor' | 'terminal' | 'browser' | 'unknown';

export interface ActiveWindowInfo {
	title: string;
	appName: string;
	bundleId: string;
	category: AppCategory;
}

// macOS bundle id prefixes / app name keywords for category detection.
// Match against bundleId first (more reliable), fall back to appName.
const EDITOR_BUNDLES = [
	'com.microsoft.VSCode',
	'com.microsoft.VSCodeInsiders',
	'com.todesktop.230313mzl4w4u92', // Cursor
	'com.jetbrains.', // IntelliJ family
	'com.sublimetext.',
	'com.panic.Nova',
	'com.apple.dt.Xcode',
];

const TERMINAL_BUNDLES = [
	'com.apple.Terminal',
	'com.googlecode.iterm2',
	'co.zeit.hyper',
	'com.github.wez.wezterm',
	'dev.warp.Warp-Stable',
];

const BROWSER_BUNDLES = [
	'com.google.Chrome',
	'com.apple.Safari',
	'org.mozilla.firefox',
	'com.brave.Browser',
	'company.thebrowser.Browser', // Arc
	'com.microsoft.edgemac',
];

function categorize(bundleId: string, appName: string): AppCategory {
	const id = bundleId.toLowerCase();
	const name = appName.toLowerCase();
	for (const b of EDITOR_BUNDLES) {
		if (id.startsWith(b.toLowerCase())) return 'editor';
	}
	for (const b of TERMINAL_BUNDLES) {
		if (id.startsWith(b.toLowerCase())) return 'terminal';
	}
	for (const b of BROWSER_BUNDLES) {
		if (id.startsWith(b.toLowerCase())) return 'browser';
	}
	if (name.includes('code') || name.includes('editor')) return 'editor';
	if (name.includes('terminal') || name.includes('iterm')) return 'terminal';
	if (name.includes('chrome') || name.includes('safari') || name.includes('firefox')) {
		return 'browser';
	}
	return 'unknown';
}

// active-win options:
// - accessibilityPermission: skipped (we don't need URL, only category)
// - screenRecordingPermission: true so window titles are actually returned.
//   If the user has not granted Screen Recording permission, active-win
//   surfaces an empty title; we treat that as 'studying-unavailable' and the
//   state machine falls back to Week 2 behaviour for that aspect.
const ACTIVE_WIN_OPTIONS = {
	accessibilityPermission: false,
	screenRecordingPermission: true,
} as const;

let permissionWarningShown = false;

async function sample(): Promise<ActiveWindowInfo> {
	let win;
	try {
		win = await activeWindow(ACTIVE_WIN_OPTIONS);
	} catch (err) {
		if (!permissionWarningShown) {
			permissionWarningShown = true;
			console.warn(
				'[active-window] active-win unavailable. Auto-detection of coding/studying ' +
					'will be disabled. Grant Accessibility permission to Electron and restart to enable.'
			);
			console.warn('[active-window] original error:', err);
		}
		return { title: '', appName: '', bundleId: '', category: 'unknown' };
	}
	if (!win) {
		return { title: '', appName: '', bundleId: '', category: 'unknown' };
	}
	const owner = win.owner ?? { name: '', processId: 0 };
	const bundleId = ('bundleId' in owner ? (owner as { bundleId?: string }).bundleId : '') || '';
	const appName = owner.name || '';
	const title = win.title || '';
	return { title, appName, bundleId, category: categorize(bundleId, appName) };
}

export type ActiveWindowListener = (info: ActiveWindowInfo) => void;

export function startActiveWindowPoller(
	intervalMs: number,
	listener: ActiveWindowListener
): () => void {
	let stopped = false;
	let timer: NodeJS.Timeout | null = null;
	let lastKey = '';

	const tick = async () => {
		if (stopped) return;
		try {
			const info = await sample();
			// Avoid spamming the renderer when nothing changed.
			const key = `${info.bundleId}|${info.title}`;
			if (key !== lastKey) {
				lastKey = key;
				listener(info);
			}
		} catch (err) {
			console.error('[active-window] sample failed:', err);
		}
		if (!stopped) timer = setTimeout(tick, intervalMs);
	};

	timer = setTimeout(tick, 0);

	return () => {
		stopped = true;
		if (timer) clearTimeout(timer);
	};
}
