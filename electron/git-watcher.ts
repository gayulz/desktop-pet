// Git commit watcher. Tails `.git/logs/HEAD` of the project repository and
// fires a callback whenever a commit lands. We only react to genuine commit
// operations — checkouts, resets, and merges write to the same log but with
// different action keywords.
//
// In dev mode the project root is the cwd. In a packaged .dmg build the cwd
// is somewhere inside the bundle and there is no git repo, so the watcher
// gracefully turns into a no-op (returns a stop function that does nothing).

import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';

export interface GitCommitEvent {
	sha: string;
	subject: string;
	timestampMs: number;
}

const COMMIT_ACTIONS = new Set(['commit', 'commit (initial)', 'commit (amend)']);

function readLastLine(filePath: string): string | null {
	try {
		const buf = fs.readFileSync(filePath, 'utf-8');
		const trimmed = buf.trimEnd();
		const lastNl = trimmed.lastIndexOf('\n');
		return lastNl === -1 ? trimmed : trimmed.slice(lastNl + 1);
	} catch {
		return null;
	}
}

// Format: "<from> <to> <name> <email> <timestamp> <tz>\t<action>: <subject>"
function parseLogLine(line: string): GitCommitEvent | null {
	const tabIdx = line.indexOf('\t');
	if (tabIdx === -1) return null;
	const meta = line.slice(0, tabIdx);
	const message = line.slice(tabIdx + 1);

	const colonIdx = message.indexOf(':');
	if (colonIdx === -1) return null;
	const action = message.slice(0, colonIdx).trim();
	if (!COMMIT_ACTIONS.has(action)) return null;

	const subject = message.slice(colonIdx + 1).trim();
	const parts = meta.split(' ');
	// parts: [from, to, name..., email, ts, tz] — sha is parts[1]
	const sha = parts[1] ?? '';
	const tsStr = parts[parts.length - 2] ?? '';
	const ts = Number.parseInt(tsStr, 10);
	if (!sha || Number.isNaN(ts)) return null;

	return { sha, subject, timestampMs: ts * 1000 };
}

export type GitCommitListener = (e: GitCommitEvent) => void;

export function startGitWatcher(projectDir: string, listener: GitCommitListener): () => void {
	const logHead = path.join(projectDir, '.git', 'logs', 'HEAD');

	if (!fs.existsSync(logHead)) {
		console.warn(`[git-watcher] no git repo at ${projectDir}; commit detection disabled`);
		return () => {};
	}

	// Track the last-seen sha so file watchers that fire multiple times (atomic
	// rename, fs polling backend) don't emit duplicate events for one commit.
	let lastSha: string | null = null;
	const initial = readLastLine(logHead);
	if (initial) {
		const e = parseLogLine(initial);
		if (e) lastSha = e.sha;
	}

	const watcher = chokidar.watch(logHead, {
		ignoreInitial: true,
		// HEAD log gets appended atomically; polling is more reliable than fsevents
		// for short-lived files inside .git.
		usePolling: true,
		interval: 1000,
		awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
	});

	const onChange = () => {
		const line = readLastLine(logHead);
		if (!line) return;
		const ev = parseLogLine(line);
		if (!ev) return;
		if (ev.sha === lastSha) return;
		lastSha = ev.sha;
		listener(ev);
	};

	watcher.on('add', onChange);
	watcher.on('change', onChange);
	watcher.on('error', (err: unknown) => console.error('[git-watcher] error:', err));

	return () => {
		watcher.close();
	};
}
