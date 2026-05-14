/**
 * Pet state machine — pure functions only.
 *
 * Priority (highest first):
 *   1. manualOverride        — explicit user toggle (coding / ai_mode)
 *   2. notice                — external trigger (HTTP API or Claude file watch)
 *                              that needs the user's attention; persists until
 *                              the user clicks Codi to dismiss
 *   3. celebrating           — within CELEBRATE_DURATION_MS of a git commit
 *   4. overheated            — CPU sustained over the threshold
 *   5. ai_mode (auto)        — recent ~/.claude/ jsonl activity within window
 *   6. studying              — active window title contains a study keyword
 *   7. coding                — active app is an editor/terminal AND user is active
 *   8. sleeping              — no input for SLEEP_AFTER_SEC
 *   9. walking (grace/idle<) — startup grace OR recent input
 *  10. idle                  — quiet but awake
 */

import type { AppCategory } from '../types/electron';

export type PetState =
	| 'idle'
	| 'walking'
	| 'coding'
	| 'studying'
	| 'sleeping'
	| 'overheated'
	| 'celebrating'
	| 'ai_mode'
	| 'notice';

export interface PetContext {
	cpuLoad: number;
	systemIdleSec: number;
	manualOverride: PetState | null;
	appUptimeSec: number;
	activeAppCategory: AppCategory;
	activeWindowTitle: string;
	// Timestamp the last git commit landed (Date.now()). null = no commit yet.
	lastCommitAtMs: number | null;
	// True while an external notice has been raised and not yet dismissed.
	noticeActive: boolean;
	// Timestamp the last ~/.claude/ jsonl activity landed.
	lastAiActivityAtMs: number | null;
	// Current time, injected so deriveState stays pure and testable.
	nowMs: number;
}

export const OVERHEATED_CPU_THRESHOLD = 80;
export const SLEEP_AFTER_SEC = 300; // 5 minutes
export const WALK_BELOW_SEC = 30;
export const STARTUP_WALK_GRACE_SEC = 20;
// If the active app is an editor/terminal AND the user typed within this many
// seconds, count it as real coding (vs. an editor left open in the background).
export const CODING_IDLE_THRESHOLD_SEC = 60;
// celebrating window after a commit lands.
export const CELEBRATE_DURATION_MS = 3000;
// ai_mode window — Codi stays in the wizard pose this long after the last
// ~/.claude/ jsonl change. Tuned to "Claude is still working on something".
export const AI_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;

// Title-based study detection. Matches learning platforms broadly so YouTube
// tutorials, Coursera, Udemy etc. count as studying too — not just Inflearn.
// Lowercased before matching, so add lowercase forms only.
const STUDY_KEYWORDS = ['인프런', 'inflearn', '강의', '학습', '공부'];

function isStudying(title: string, category: AppCategory): boolean {
	// Only consider studying when the user is on a webpage. Otherwise broad
	// words like "강의" or "공부" can be falsely matched against random
	// messenger chats or note titles.
	if (category !== 'browser') return false;
	const lower = title.toLowerCase();
	return STUDY_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

function isCoding(category: AppCategory, systemIdleSec: number): boolean {
	if (category !== 'editor' && category !== 'terminal') return false;
	return systemIdleSec <= CODING_IDLE_THRESHOLD_SEC;
}

export function deriveState(ctx: PetContext): PetState {
	if (ctx.manualOverride) return ctx.manualOverride;
	if (ctx.noticeActive) return 'notice';
	if (ctx.lastCommitAtMs !== null && ctx.nowMs - ctx.lastCommitAtMs < CELEBRATE_DURATION_MS) {
		return 'celebrating';
	}
	if (ctx.cpuLoad > OVERHEATED_CPU_THRESHOLD) return 'overheated';
	if (
		ctx.lastAiActivityAtMs !== null &&
		ctx.nowMs - ctx.lastAiActivityAtMs < AI_ACTIVITY_WINDOW_MS
	) {
		return 'ai_mode';
	}
	if (isStudying(ctx.activeWindowTitle, ctx.activeAppCategory)) return 'studying';
	if (isCoding(ctx.activeAppCategory, ctx.systemIdleSec)) return 'coding';
	if (ctx.systemIdleSec > SLEEP_AFTER_SEC) return 'sleeping';
	if (ctx.appUptimeSec < STARTUP_WALK_GRACE_SEC) return 'walking';
	if (ctx.systemIdleSec < WALK_BELOW_SEC) return 'walking';
	return 'idle';
}
