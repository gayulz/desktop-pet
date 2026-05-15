// Active-window poller. Reports the foreground app's bundle id and window
// title to the renderer so the state machine can decide whether Codi is
// coding, studying, or just idling.
//
// macOS Screen Recording permission is required to read window titles. If the
// user has not granted it, get-windows returns objects with an empty title.
// We surface that by setting category to 'unknown' so the state machine can
// fall back to Week 2 behaviour.
//
// get-windows is ESM-only. The electron tsconfig targets CommonJS, so a
// plain `await import('get-windows')` would be transpiled to require() and
// crash at runtime. We use a Function() indirection so TypeScript leaves the
// dynamic import untouched and Node performs a real ESM import at runtime.

type GetWindowsOptions = {
	accessibilityPermission?: boolean;
	screenRecordingPermission?: boolean;
};

type GetWindowsOwner = {
	name?: string;
	processId?: number;
	bundleId?: string;
};

type GetWindowsResult = {
	title?: string;
	owner?: GetWindowsOwner;
};

type ActiveWindowFn = (
	options?: GetWindowsOptions
) => Promise<GetWindowsResult | undefined>;

const dynamicImport = new Function(
	'specifier',
	'return import(specifier);'
) as (specifier: string) => Promise<unknown>;

let cachedActiveWindow: ActiveWindowFn | null = null;
let importFailed = false;

async function loadActiveWindow(): Promise<ActiveWindowFn | null> {
	if (cachedActiveWindow) return cachedActiveWindow;
	if (importFailed) return null;
	try {
		const mod = (await dynamicImport('get-windows')) as {
			activeWindow: ActiveWindowFn;
		};
		cachedActiveWindow = mod.activeWindow;
		return cachedActiveWindow;
	} catch (err) {
		importFailed = true;
		console.warn('[active-window] get-windows import failed:', err);
		return null;
	}
}

export type AppCategory = 'editor' | 'terminal' | 'browser' | 'meeting' | 'unknown';

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

// Dedicated video-conferencing apps. Matched by bundleId — these always count
// as 'meeting' regardless of window title.
const MEETING_BUNDLES = [
	'us.zoom.xos',
	'com.microsoft.teams2',
	'com.microsoft.teams',
	'com.cisco.webexmeetingsapp',
	'com.skype.skype',
	'com.hnc.Discord', // Discord voice/video
	'com.tinyspeck.slackmacgap', // Slack huddles
];

// Title-based meeting detection — covers Google Meet / Zoom / Teams running
// inside a browser tab, where bundleId would otherwise classify as 'browser'.
// Lowercased before matching.
const MEETING_TITLE_KEYWORDS = [
	'zoom meeting',
	'google meet',
	'meet.google.com',
	'microsoft teams',
	'webex meeting',
	'whereby',
];

function isMeetingByTitle(title: string): boolean {
	if (!title) return false;
	const lower = title.toLowerCase();
	return MEETING_TITLE_KEYWORDS.some((k) => lower.includes(k));
}

function categorize(bundleId: string, appName: string, title: string): AppCategory {
	const id = bundleId.toLowerCase();
	const name = appName.toLowerCase();
	// Meeting wins over generic browser/editor classification because the user
	// is clearly in a call rather than browsing or coding.
	for (const b of MEETING_BUNDLES) {
		if (id.startsWith(b.toLowerCase())) return 'meeting';
	}
	for (const b of EDITOR_BUNDLES) {
		if (id.startsWith(b.toLowerCase())) return 'editor';
	}
	for (const b of TERMINAL_BUNDLES) {
		if (id.startsWith(b.toLowerCase())) return 'terminal';
	}
	for (const b of BROWSER_BUNDLES) {
		if (id.startsWith(b.toLowerCase())) {
			// A browser tab can host a meeting (Google Meet, web Zoom, ...).
			if (isMeetingByTitle(title)) return 'meeting';
			return 'browser';
		}
	}
	if (name.includes('zoom') || name.includes('teams') || name.includes('webex')) {
		return 'meeting';
	}
	if (name.includes('code') || name.includes('editor')) return 'editor';
	if (name.includes('terminal') || name.includes('iterm')) return 'terminal';
	if (name.includes('chrome') || name.includes('safari') || name.includes('firefox')) {
		if (isMeetingByTitle(title)) return 'meeting';
		return 'browser';
	}
	return 'unknown';
}

// get-windows options:
// Both permissions are disabled so macOS does not show repeated permission
// dialogs every 2 seconds. The downside: window title comes back as an empty
// string, which means the 'studying' state cannot be detected (it relies on
// keyword matching the title). 'coding' detection still works because we
// classify by bundleId/appName, both of which are available without Screen
// Recording permission.
//
// If the user wants studying detection back, they can flip both options to
// `true`; macOS will then prompt for permission once and from then on titles
// will be returned. We deliberately do not expose this in the UI yet — the
// noisy dialog UX needs more thought first.
const ACTIVE_WIN_OPTIONS: GetWindowsOptions = {
	accessibilityPermission: false,
	screenRecordingPermission: false,
};

let permissionWarningShown = false;
const EMPTY: ActiveWindowInfo = { title: '', appName: '', bundleId: '', category: 'unknown' };

async function sample(): Promise<ActiveWindowInfo> {
	const activeWindow = await loadActiveWindow();
	if (!activeWindow) return EMPTY;
	let win: GetWindowsResult | undefined;
	try {
		win = await activeWindow(ACTIVE_WIN_OPTIONS);
	} catch (err) {
		if (!permissionWarningShown) {
			permissionWarningShown = true;
			console.warn(
				'[active-window] get-windows unavailable. Auto-detection of coding/studying ' +
					'will be disabled. Grant Accessibility permission to Electron and restart to enable.'
			);
			console.warn('[active-window] original error:', err);
		}
		return EMPTY;
	}
	if (!win) return EMPTY;
	const owner = win.owner ?? {};
	const bundleId = owner.bundleId ?? '';
	const appName = owner.name ?? '';
	const title = win.title ?? '';
	return { title, appName, bundleId, category: categorize(bundleId, appName, title) };
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
