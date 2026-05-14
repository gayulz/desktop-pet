import { useEffect, useRef, useState } from 'react';
import WalkingSprite from './sprites/WalkingSprite';
import { deriveState, type PetState } from './state/petState';

// Walk policy
const WIDE_WALK_DURATION_MS = 8000;
const LOCAL_HALF_WIDTH = 100;
const LOCAL_WALK_DURATION_MS = 4000;
const MOVE_TICK_MS = 33;

// Falling physics
const GRAVITY_PX_PER_S2 = 1600;
const MAX_FALL_SPEED_PX_PER_S = 1400;

type Direction = 1 | -1;
type WalkMode = 'wide' | 'local';

const PetController = () => {
	const [state, setState] = useState<PetState>('walking');
	const [direction, setDirection] = useState<Direction>(1);

	// Latest metrics from main
	const cpuLoadRef = useRef(0);
	const systemIdleRef = useRef(0);
	const manualOverrideRef = useRef<PetState | null>(null);

	// Position state
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
	const lastTickRef = useRef(performance.now());

	// Drag state
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

	// Subscribe to system metrics → recompute state.
	useEffect(() => {
		const unsubscribe = window.electronAPI.onMetricsTick((m) => {
			cpuLoadRef.current = m.cpuLoad;
			systemIdleRef.current = m.systemIdleSec;
			const next = deriveState({
				cpuLoad: m.cpuLoad,
				systemIdleSec: m.systemIdleSec,
				manualOverride: manualOverrideRef.current,
			});
			setState((prev) => (prev === next ? prev : next));
		});
		return unsubscribe;
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
					// Horizontal back-and-forth at fixed Y.
					const delta = (dt / walkDurationRef.current) * directionRef.current;
					let next = progressRef.current + delta;
					if (next >= 1) {
						next = 1;
						directionRef.current = -1;
						setDirection(-1);
					} else if (next <= 0) {
						next = 0;
						directionRef.current = 1;
						setDirection(1);
					}
					progressRef.current = next;
					const offset = (next - 0.5) * 2 * halfWidthRef.current;
					const x = centerXRef.current + offset;
					window.electronAPI.setPosition(x, currentYRef.current);
				}
				// In any other state (idle/sleeping/overheated/coding) we hold
				// the current window position — no setPosition call needed.
				lastTickRef.current = now;
			}
			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, [state]);

	// Drag handlers
	const handleMouseDown = async (e: React.MouseEvent) => {
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
			lastTickRef.current = performance.now();
		};

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	}, []);

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		if (confirm('코디를 재울까요? (앱 종료)')) {
			window.electronAPI.quitApp();
		}
	};

	// Render — Stage 2 ships WalkingSprite only. Other states fall back to it
	// until Stage 3 wires their dedicated sprites.
	const renderSprite = () => {
		switch (state) {
			case 'walking':
				return <WalkingSprite direction={direction} />;
			default:
				return <WalkingSprite direction={direction} />;
		}
	};

	return (
		<div
			onMouseDown={handleMouseDown}
			onContextMenu={handleContextMenu}
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				cursor: 'grab',
			}}
		>
			{renderSprite()}
		</div>
	);
};

export default PetController;
