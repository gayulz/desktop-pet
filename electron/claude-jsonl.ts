// Pure parser for ~/.claude/projects/**/*.jsonl lines.
//
// Background: Claude Code appends one JSON object per line to the session
// jsonl file. The actual schema is undocumented; the matrix below was derived
// from probing a single 2485-line session on 2026-05-15 (see
// docs/claude-jsonl-schema.md for the full evidence).
//
// We map each line to a small, stable event vocabulary so the rest of Codi
// does not need to know the raw schema:
//
//   assistant_end_turn   Claude finished one turn (stop_reason in
//                        {"end_turn","stop_sequence"}). Worth notifying.
//   tool_use             Claude is calling a tool, or the user line is a
//                        tool_result. No notification.
//   assistant_partial    Streaming assistant chunk before stop_reason
//                        settles. No notification.
//   user_message         Actual user input. No notification.
//   unknown              Anything else (queue-operation, attachment, ai-title,
//                        last-prompt, system, error, unknown future types).
//
// JSON.parse failures return null so callers can silently skip malformed
// lines (Claude Code may write partial bytes during high-frequency writes).
//
// Risks tracked in docs/claude-jsonl-schema.md §5:
//   - Schema drift between Claude Code versions.
//   - Sidechain (sub-agent) end_turns are currently treated identically to
//     top-level turns. Revisit if sub-agent activity spams the user.

export type JsonlEventType =
	| 'assistant_end_turn'
	| 'assistant_partial'
	| 'user_message'
	| 'tool_use'
	| 'unknown';

export interface JsonlEvent {
	type: JsonlEventType;
	timestampMs: number;
	isSidechain: boolean;
}

// stop_reason values that mean "the turn is fully over from the user's POV".
// stop_sequence is included because Claude Code occasionally emits it for
// API-error finishes; in both cases the user should be pinged.
const TERMINAL_STOP_REASONS = new Set(['end_turn', 'stop_sequence']);

function parseTimestamp(raw: unknown): number {
	if (typeof raw === 'string') {
		const ms = Date.parse(raw);
		if (Number.isFinite(ms)) return ms;
	}
	return Date.now();
}

function safeJsonParse(line: string): unknown {
	const trimmed = line.trim();
	if (!trimmed || trimmed[0] !== '{') return null;
	try {
		return JSON.parse(trimmed);
	} catch {
		return null;
	}
}

function classifyAssistant(record: Record<string, unknown>): JsonlEventType {
	const message = record['message'];
	if (!message || typeof message !== 'object') return 'assistant_partial';
	const stopReason = (message as Record<string, unknown>)['stop_reason'];
	if (typeof stopReason === 'string') {
		if (TERMINAL_STOP_REASONS.has(stopReason)) return 'assistant_end_turn';
		if (stopReason === 'tool_use') return 'tool_use';
		// Unknown stop_reason values (max_tokens, future strings) — treat as
		// terminal-ish to avoid swallowing real turns. Safer to over-notify
		// than to drop a notification.
		return 'assistant_end_turn';
	}
	// Streaming chunk before stop_reason was set.
	return 'assistant_partial';
}

function classifyUser(record: Record<string, unknown>): JsonlEventType {
	const message = record['message'];
	if (message && typeof message === 'object') {
		const content = (message as Record<string, unknown>)['content'];
		if (Array.isArray(content) && content.length > 0) {
			const first = content[0] as Record<string, unknown> | undefined;
			const firstType = first && typeof first === 'object' ? first['type'] : undefined;
			if (firstType === 'tool_result') return 'tool_use';
		}
	}
	return 'user_message';
}

/**
 * Parse a single jsonl line into a JsonlEvent.
 *
 * Returns null when the line is empty, malformed, or doesn't even parse as
 * JSON. Returning null is intentional: callers should silently skip the line
 * and keep reading the file.
 */
export function parseJsonlLine(line: string): JsonlEvent | null {
	const parsed = safeJsonParse(line);
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	const record = parsed as Record<string, unknown>;
	const topType = record['type'];
	const timestampMs = parseTimestamp(record['timestamp']);
	const isSidechain = record['isSidechain'] === true;

	let eventType: JsonlEventType;
	switch (topType) {
		case 'assistant':
			eventType = classifyAssistant(record);
			break;
		case 'user':
			eventType = classifyUser(record);
			break;
		default:
			eventType = 'unknown';
			break;
	}

	return { type: eventType, timestampMs, isSidechain };
}

/**
 * Apply parseJsonlLine to a batch of lines, dropping nulls. Convenience for
 * the watcher integration so callers don't have to repeat the filter.
 */
export function parseJsonlLines(lines: string[]): JsonlEvent[] {
	const out: JsonlEvent[] = [];
	for (const line of lines) {
		const ev = parseJsonlLine(line);
		if (ev !== null) out.push(ev);
	}
	return out;
}
