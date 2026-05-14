/**
 * Pet state machine — pure functions only.
 *
 * Priority (highest first):
 *   1. manualOverride        — explicit user toggle (coding mode)
 *   2. overheated            — CPU sustained over the threshold
 *   3. studying              — active window title contains a study keyword
 *   4. coding                — active app is an editor/terminal AND user is active
 *   5. sleeping              — no input for SLEEP_AFTER_SEC
 *   6. walking (grace/idle<) — startup grace OR recent input
 *   7. idle                  — quiet but awake
 *
 * celebrating is scheduled in Stage 2 (Git commit detector).
 */

import type { AppCategory } from '../types/electron';

export type PetState =
	| 'idle'
	| 'walking'
	| 'coding'
	| 'studying'
	| 'sleeping'
	| 'overheated'
	| 'celebrating';

export interface PetContext {
	cpuLoad: number;
	systemIdleSec: number;
	manualOverride: PetState | null;
	appUptimeSec: number;
	activeAppCategory: AppCategory;
	activeWindowTitle: string;
}

export const OVERHEATED_CPU_THRESHOLD = 80;
export const SLEEP_AFTER_SEC = 300; // 5 minutes
export const WALK_BELOW_SEC = 30;
export const STARTUP_WALK_GRACE_SEC = 20;
// If the active app is an editor/terminal AND the user typed within this many
// seconds, count it as real coding (vs. an editor left open in the background).
export const CODING_IDLE_THRESHOLD_SEC = 60;

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
	if (ctx.cpuLoad > OVERHEATED_CPU_THRESHOLD) return 'overheated';
	if (isStudying(ctx.activeWindowTitle, ctx.activeAppCategory)) return 'studying';
	if (isCoding(ctx.activeAppCategory, ctx.systemIdleSec)) return 'coding';
	if (ctx.systemIdleSec > SLEEP_AFTER_SEC) return 'sleeping';
	if (ctx.appUptimeSec < STARTUP_WALK_GRACE_SEC) return 'walking';
	if (ctx.systemIdleSec < WALK_BELOW_SEC) return 'walking';
	return 'idle';
}
