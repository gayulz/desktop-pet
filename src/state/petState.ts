/**
 * Pet state machine — pure functions only.
 *
 * The renderer subscribes to system metrics and derives the current state on
 * every tick. State priority (highest first):
 *   1. manualOverride (e.g. user toggled coding mode)
 *   2. overheated   — CPU sustained over OVERHEATED_CPU_THRESHOLD
 *   3. sleeping     — no input for SLEEP_AFTER_SEC
 *   4. walking      — recent input (< WALK_BELOW_SEC)
 *   5. idle         — quiet but awake (between walk and sleep thresholds)
 *
 * Other states (coding, ai_mode, celebrating, studying) will be wired in
 * subsequent weeks. Manual coding override is the only non-automatic state in
 * Week 2.
 */

export type PetState =
	| 'idle'
	| 'walking'
	| 'coding'
	| 'sleeping'
	| 'overheated';

export interface PetContext {
	cpuLoad: number;            // 0..100
	systemIdleSec: number;      // seconds since last system input
	manualOverride: PetState | null;
	// Seconds since the app started. Used for a startup grace period during
	// which Codi always walks so the user sees motion right away even if they
	// don't touch the mouse for a while.
	appUptimeSec: number;
}

export const OVERHEATED_CPU_THRESHOLD = 80;
export const SLEEP_AFTER_SEC = 300; // 5 minutes
export const WALK_BELOW_SEC = 30;
export const STARTUP_WALK_GRACE_SEC = 20;

export function deriveState(ctx: PetContext): PetState {
	if (ctx.manualOverride) return ctx.manualOverride;
	if (ctx.cpuLoad > OVERHEATED_CPU_THRESHOLD) return 'overheated';
	if (ctx.systemIdleSec > SLEEP_AFTER_SEC) return 'sleeping';
	if (ctx.appUptimeSec < STARTUP_WALK_GRACE_SEC) return 'walking';
	if (ctx.systemIdleSec < WALK_BELOW_SEC) return 'walking';
	return 'idle';
}
