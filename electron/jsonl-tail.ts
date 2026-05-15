// Stateful incremental reader for jsonl files.
//
// Each watched file has a JsonlTailState that remembers where we last stopped
// reading. On every chokidar change event the watcher calls readNewLines,
// which:
//
//   1. Detects truncation / rotation (stat.size < lastOffset) and rewinds to
//      offset 0.
//   2. Reads the bytes between lastOffset and stat.size into a string.
//   3. Splits on '\n' and yields complete lines.
//   4. Holds the trailing incomplete line (no newline yet) in state.pending
//      so the next call can prefix it before parsing.
//
// We never try to seek across re-creations: if the file vanishes and reappears
// with a smaller size, we just start over from 0. That matches how Claude
// Code rotates: it never edits in-place, only appends.

import * as fs from 'fs';
import * as fsp from 'fs/promises';

export interface JsonlTailState {
	path: string;
	offset: number;
	pending: string;
}

export function createTailState(path: string): JsonlTailState {
	return { path, offset: 0, pending: '' };
}

export interface ReadResult {
	lines: string[];
	bytesConsumed: number;
}

const EMPTY: ReadResult = { lines: [], bytesConsumed: 0 };

/**
 * Read all new lines appended since the last call. Mutates `state` in place
 * (offset advances, pending may grow/shrink). Returns an empty result and
 * leaves state untouched when:
 *   - the file no longer exists
 *   - the file is unreadable
 *   - no new bytes have appeared
 */
export async function readNewLines(state: JsonlTailState): Promise<ReadResult> {
	let stat: fs.Stats;
	try {
		stat = await fsp.stat(state.path);
	} catch {
		// File gone — reset so a future re-create starts fresh.
		state.offset = 0;
		state.pending = '';
		return EMPTY;
	}
	if (!stat.isFile()) return EMPTY;
	const size = stat.size;

	if (size < state.offset) {
		// Truncated / rotated. Start over from the top of the file.
		state.offset = 0;
		state.pending = '';
	}
	if (size === state.offset) return EMPTY;

	const start = state.offset;
	const length = size - start;
	const buffer = Buffer.alloc(length);
	let handle: fs.promises.FileHandle | null = null;
	try {
		handle = await fsp.open(state.path, 'r');
		await handle.read(buffer, 0, length, start);
	} catch {
		return EMPTY;
	} finally {
		if (handle) await handle.close().catch(() => {});
	}

	const chunk = state.pending + buffer.toString('utf-8');
	const parts = chunk.split('\n');
	// Last element is the trailing partial line (or '' if chunk ended with \n).
	state.pending = parts.pop() ?? '';
	state.offset = size;

	// Drop empty lines that came from blank '\n's so callers don't waste
	// JSON.parse calls on them.
	const lines = parts.filter((line) => line.length > 0);
	return { lines, bytesConsumed: length };
}

/**
 * Drop the in-memory partial line buffer. Useful when the watcher decides to
 * forget about a path (e.g., directory removed).
 */
export function resetTailState(state: JsonlTailState): void {
	state.offset = 0;
	state.pending = '';
}
