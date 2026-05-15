// Watches ~/.claude/projects/ for jsonl mutations and emits TWO signals:
//
//   - `onNotify`: fires only when a Claude assistant turn fully ends
//     (stop_reason in {end_turn, stop_sequence, or unknown future strings}).
//     This is what triggers the "look at me" notice sprite — we never spam
//     during streaming chunks or tool_use loops.
//   - `onActivity`: fires on every parsed event, including partials and
//     tool_use. PetController keeps Codi in ai_mode for AI_ACTIVITY_WINDOW_MS
//     after the last activity; the wizard hat naturally goes away when
//     Claude stops working.
//
// Architecture: each jsonl file has a JsonlTailState that tracks the byte
// offset we've already consumed. On every chokidar change/add event we read
// only the new bytes, split on '\n', and pipe each line through parseJsonlLine.
// See docs/claude-jsonl-schema.md for the actual file schema.
//
// The directory may not exist on machines that never ran Claude Code; in that
// case the watcher silently no-ops.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chokidar from 'chokidar';
import { parseJsonlLine, type JsonlEvent } from './claude-jsonl';
import { createTailState, readNewLines, resetTailState, type JsonlTailState } from './jsonl-tail';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
// Even when many end_turns land in the same burst (e.g., a sub-agent and the
// main agent finish back-to-back), only one notice within this window so the
// user is not bombarded.
const NOTIFY_DEBOUNCE_MS = 2000;

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
		// Stability threshold matches what we had pre-Phase-3 — chokidar still
		// coalesces fsync bursts. Per-line debouncing happens below.
		awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
	});

	const tails = new Map<string, JsonlTailState>();
	let lastNotifyMs = 0;

	const ensureTail = (filePath: string): JsonlTailState => {
		let state = tails.get(filePath);
		if (!state) {
			state = createTailState(filePath);
			tails.set(filePath, state);
		}
		return state;
	};

	const handleEvents = (events: JsonlEvent[]) => {
		if (events.length === 0) return;
		// Activity heartbeat — use the latest event's timestamp so ai_mode
		// stays aligned with Claude's actual wall-clock activity.
		const latest = events[events.length - 1]!;
		cb.onActivity(latest.timestampMs);

		// Notice: fire once per burst if any event terminates a turn.
		const hasEndTurn = events.some((e) => e.type === 'assistant_end_turn');
		if (!hasEndTurn) return;
		const now = Date.now();
		if (now - lastNotifyMs < NOTIFY_DEBOUNCE_MS) return;
		lastNotifyMs = now;
		cb.onNotify();
	};

	const onChange = async (filePath: string) => {
		const state = ensureTail(filePath);
		const { lines } = await readNewLines(state);
		if (lines.length === 0) return;
		const events: JsonlEvent[] = [];
		for (const line of lines) {
			const ev = parseJsonlLine(line);
			if (ev) events.push(ev);
		}
		handleEvents(events);
	};

	const onUnlink = (filePath: string) => {
		const state = tails.get(filePath);
		if (state) {
			resetTailState(state);
			tails.delete(filePath);
		}
	};

	watcher.on('add', onChange);
	watcher.on('change', onChange);
	watcher.on('unlink', onUnlink);
	watcher.on('error', (err: unknown) => console.error('[claude-watcher] error:', err));

	console.log(`[claude-watcher] watching ${CLAUDE_PROJECTS_DIR}/**/*.jsonl`);

	return () => {
		watcher.close();
		tails.clear();
	};
}
