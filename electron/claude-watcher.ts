// Watches ~/.claude/projects/ for jsonl mutations and emits TWO signals:
//
//   - `onNotify`: fires on each (debounced) change. Used for the "look at me"
//     notice sprite so the user sees the alert immediately.
//   - `onActivity`: also fires on each change but provides a timestamp.
//     PetController keeps Codi in ai_mode for AI_ACTIVITY_WINDOW_MS after the
//     last activity; the wizard hat naturally goes away when Claude stops
//     working.
//
// The directory may not exist on machines that never ran Claude Code; in that
// case the watcher silently no-ops.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chokidar from 'chokidar';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

export interface ClaudeWatcherCallbacks {
	onNotify: () => void;
	onActivity: (timestampMs: number) => void;
}

export function startClaudeWatcher(cb: ClaudeWatcherCallbacks): () => void {
	if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
		console.warn(`[claude-watcher] ${CLAUDE_PROJECTS_DIR} not found; Claude notifications disabled`);
		return () => {};
	}

	const watcher = chokidar.watch(`${CLAUDE_PROJECTS_DIR}/**/*.jsonl`, {
		ignoreInitial: true,
		// Many small writes happen back-to-back as a session progresses; debounce
		// so we don't fire the listener five times per assistant message.
		awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 },
	});

	let lastNotifyMs = 0;
	const fire = () => {
		const now = Date.now();
		// Activity always fires — it's the heartbeat for ai_mode.
		cb.onActivity(now);
		// Notice is rate-limited: only one alert per ~2-second burst.
		if (now - lastNotifyMs < 2000) return;
		lastNotifyMs = now;
		cb.onNotify();
	};

	watcher.on('add', fire);
	watcher.on('change', fire);
	watcher.on('error', (err: unknown) => console.error('[claude-watcher] error:', err));

	console.log(`[claude-watcher] watching ${CLAUDE_PROJECTS_DIR}/**/*.jsonl`);

	return () => {
		watcher.close();
	};
}
