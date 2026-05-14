import { useEffect, useRef, useState } from 'react';
import type { PetState } from '../state/petState';

// Walk policy
const WIDE_WALK_DURATION_MS = 8000;
const LOCAL_HALF_WIDTH = 100;
const LOCAL_WALK_DURATION_MS = 4000;
const MOVE_TICK_MS = 33;
// Pause at each wall before flipping direction. Sprite shows the turning
// frames (working-1/2) during this window so the change of heart reads as
// intentional rather than a snap. With WalkingSprite swapping every 200ms,
// 1200ms gives 6 frame swaps (1→2→1→2→1→2) — i.e., 3 full pairs.
const TURNING_DURATION_MS = 1200;

// Falling physics
const GRAVITY_PX_PER_S2 = 1600;
const MAX_FALL_SPEED_PX_PER_S = 1400;

export type Direction = 1 | -1;
type WalkMode = 'wide' | 'local';

export interface WindowMotionApi {
	direction: Direction;
	turning: boolean;
	onMouseDown: (e: React.MouseEvent) => Promise<void>;
}

/**
 * Owns the pet window's screen position. PetController gives it the current
 * PetState; the hook decides what motion is appropriate:
 *
 *   walking → horizontal back-and-forth at the current floor Y
 *   falling (after drag drop above floor) → gravity descent, then local walk
 *   any other state → freeze in place, do nothing
 *
 * Drag is also owned here so it can pause walking, snapshot the drop point,
 * and switch to local mode without leaking position state to other components.
 */
export function useWindowMotion(state: PetState): WindowMotionApi {
	const [direction, setDirection] = useState<Direction>(1);
	const [turning, setTurning] = useState(false);

	const centerXRef = useRef<number | null>(null);
	const currentYRef = useRef<number | null>(null);
	const floorYRef = useRef<number | null>(null);
	const walkModeRef = useRef<WalkMode>('wide');
	const halfWidthRef = useRef(0);
	const walkDurationRef = useRef(WIDE_WALK_DURATION_MS);
	const progressRef = useRef(0.5);
	const directionRef = useRef<Direction>(1);
	const fallVelocityRef = useRef(0);
	const fallingRef = useRef(false);
	const turningRef = useRef(false);
	const turnEndsAtRef = useRef(0);
	const lastTickRef = useRef(performance.now());

	const draggingRef = useRef(false);
	const dragOffsetXRef = useRef(0);
	const dragOffsetYRef = useRef(0);

	// Init from main
	useEffect(() => {
		let cancelled = false;
		window.electronAPI.getState().then((s) => {
			if (cancelled || !s) return;
			const walkWidth = s.screenWidth * (1 - 2 * s.walkMarginRatio);
			centerXRef.current = s.screenWidth / 2 - s.petSize / 2;
			currentYRef.current = s.floorY;
			floorYRef.current = s.floorY;
			halfWidthRef.current = walkWidth / 2;
			walkDurationRef.current = WIDE_WALK_DURATION_MS;
		});
		return () => {
			cancelled = true;
		};
	}, []);

	// Main physics/walk loop.
	useEffect(() => {
		let rafId = 0;

		const tick = (now: number) => {
			const dt = now - lastTickRef.current;
			if (
				dt >= MOVE_TICK_MS &&
				!draggingRef.current &&
				centerXRef.current !== null &&
				currentYRef.current !== null &&
				floorYRef.current !== null
			) {
				if (fallingRef.current) {
					// Gravity descent. X frozen until landing.
					const dtSec = dt / 1000;
					fallVelocityRef.current = Math.min(
						fallVelocityRef.current + GRAVITY_PX_PER_S2 * dtSec,
						MAX_FALL_SPEED_PX_PER_S
					);
					let newY = currentYRef.current + fallVelocityRef.current * dtSec;
					if (newY >= floorYRef.current) {
						newY = floorYRef.current;
						fallingRef.current = false;
						fallVelocityRef.current = 0;
						progressRef.current = 0.5;
					}
					currentYRef.current = newY;
					window.electronAPI.setPosition(centerXRef.current, newY);
				} else if (state === 'walking') {
					if (turningRef.current) {
						// Hold position while the turn animation plays.
						if (now >= turnEndsAtRef.current) {
							turningRef.current = false;
							setTurning(false);
							// Now flip direction and resume walking from the wall.
							directionRef.current = directionRef.current === 1 ? -1 : 1;
							setDirection(directionRef.current);
						}
					} else {
						const delta = (dt / walkDurationRef.current) * directionRef.current;
						let next = progressRef.current + delta;
						if (next >= 1) {
							next = 1;
							progressRef.current = next;
							turningRef.current = true;
							turnEndsAtRef.current = now + TURNING_DURATION_MS;
							setTurning(true);
						} else if (next <= 0) {
							next = 0;
							progressRef.current = next;
							turningRef.current = true;
							turnEndsAtRef.current = now + TURNING_DURATION_MS;
							setTurning(true);
						} else {
							progressRef.current = next;
							const offset = (next - 0.5) * 2 * halfWidthRef.current;
							const x = centerXRef.current + offset;
							window.electronAPI.setPosition(x, currentYRef.current);
						}
					}
				}
				// Other states hold position — no setPosition call.
				lastTickRef.current = now;
			}
			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, [state]);

	const onMouseDown = async (e: React.MouseEvent) => {
		if (e.button !== 0) return;
		e.preventDefault();
		const s = await window.electronAPI.getState();
		if (!s) return;
		draggingRef.current = true;
		dragOffsetXRef.current = e.screenX - s.x;
		dragOffsetYRef.current = e.screenY - s.y;
	};

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!draggingRef.current) return;
			const newX = e.screenX - dragOffsetXRef.current;
			const newY = e.screenY - dragOffsetYRef.current;
			window.electronAPI.setPosition(newX, newY);
		};

		const handleMouseUp = async () => {
			if (!draggingRef.current) return;
			draggingRef.current = false;
			const s = await window.electronAPI.getState();
			if (!s) return;
			centerXRef.current = s.x;
			currentYRef.current = s.y;
			floorYRef.current = s.floorY;
			halfWidthRef.current = LOCAL_HALF_WIDTH;
			walkDurationRef.current = LOCAL_WALK_DURATION_MS;
			progressRef.current = 0.5;
			fallVelocityRef.current = 0;
			walkModeRef.current = 'local';
			fallingRef.current = s.y < s.floorY - 2;
			turningRef.current = false;
			setTurning(false);
			lastTickRef.current = performance.now();
		};

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	}, []);

	return { direction, turning, onMouseDown };
}
