// Watches ~/.claude/projects/ for jsonl mutations and emits a notice signal
// when Claude Code writes a new line. This is intentionally crude — we treat
// every appended line as "something happened", and trust the user to dismiss
// notice events that aren't actually requests.
//
// The directory may not exist on machines that never ran Claude Code; in that
// case the watcher silently no-ops.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chokidar from 'chokidar';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

export type ClaudeActivityListener = () => void;

export function startClaudeWatcher(listener: ClaudeActivityListener): () => void {
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

	let lastFireMs = 0;
	const fire = () => {
		const now = Date.now();
		// Coalesce bursts within 2 seconds — a single assistant turn often
		// triggers multiple file-change events.
		if (now - lastFireMs < 2000) return;
		lastFireMs = now;
		listener();
	};

	watcher.on('add', fire);
	watcher.on('change', fire);
	watcher.on('error', (err: unknown) => console.error('[claude-watcher] error:', err));

	console.log(`[claude-watcher] watching ${CLAUDE_PROJECTS_DIR}/**/*.jsonl`);

	return () => {
		watcher.close();
	};
}
