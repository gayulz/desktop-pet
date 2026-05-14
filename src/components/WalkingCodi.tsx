import { useEffect, useRef, useState } from 'react';
import walkSheet from '../../assets/codi/walk-sheet.png';

// walk-sheet.png is 2508x627 — 4 frames of 627x627 laid out horizontally.
// Rendered at 128x128 → CSS background sized to (128*4)x128 = 512x128.
const FRAME_COUNT = 4;
const FRAME_SIZE = 128;
const SHEET_WIDTH = FRAME_SIZE * FRAME_COUNT;
const FRAME_INTERVAL_MS = 200;

// Wide walk: one-way 8s across 60% of the screen width.
const WIDE_WALK_DURATION_MS = 8000;
// Local walk (after drag): ±100px from the drag-drop point, one-way 4s.
const LOCAL_HALF_WIDTH = 100;
const LOCAL_WALK_DURATION_MS = 4000;

const MOVE_TICK_MS = 33;

type Direction = 1 | -1;
type WalkMode = 'wide' | 'local';

const WalkingCodi = () => {
	const [frame, setFrame] = useState(0);
	const [direction, setDirection] = useState<Direction>(1);

	// Walk loop state held in refs to avoid re-rendering on every tick.
	const centerXRef = useRef<number | null>(null);
	const halfWidthRef = useRef(0);
	const durationRef = useRef(WIDE_WALK_DURATION_MS);
	const progressRef = useRef(0.5); // 0..1, where 0.5 is dead center
	const directionRef = useRef<Direction>(1);
	const lastTickRef = useRef(performance.now());
	const modeRef = useRef<WalkMode>('wide');

	// Drag state
	const draggingRef = useRef(false);
	const dragOffsetRef = useRef(0);

	// Initialize walk parameters from the main process.
	useEffect(() => {
		let cancelled = false;
		window.electronAPI.getState().then((state) => {
			if (cancelled || !state) return;
			const walkWidth = state.screenWidth * (1 - 2 * state.walkMarginRatio);
			centerXRef.current = state.screenWidth / 2 - state.petSize / 2;
			halfWidthRef.current = walkWidth / 2;
			durationRef.current = WIDE_WALK_DURATION_MS;
		});
		return () => {
			cancelled = true;
		};
	}, []);

	// Sprite frame cycle.
	useEffect(() => {
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % FRAME_COUNT);
		}, FRAME_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	// Walk loop: advance progress along the current range and push X to main.
	useEffect(() => {
		let rafId = 0;

		const tick = (now: number) => {
			const dt = now - lastTickRef.current;
			if (dt >= MOVE_TICK_MS && !draggingRef.current && centerXRef.current !== null) {
				const delta = (dt / durationRef.current) * directionRef.current;
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
				window.electronAPI.setX(x);
				lastTickRef.current = now;
			}
			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, []);

	const handleMouseDown = async (e: React.MouseEvent) => {
		if (e.button !== 0) return; // left click only
		e.preventDefault();
		const state = await window.electronAPI.getState();
		if (!state) return;
		draggingRef.current = true;
		// Remember where in the window the cursor grabbed Codi, so the window
		// follows the cursor without jumping.
		dragOffsetRef.current = e.screenX - state.x;
	};

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!draggingRef.current) return;
			const newX = e.screenX - dragOffsetRef.current;
			window.electronAPI.setX(newX);
		};

		const handleMouseUp = async (e: MouseEvent) => {
			if (!draggingRef.current) return;
			draggingRef.current = false;
			// Re-read the final window position from main and switch to local mode.
			const state = await window.electronAPI.getState();
			if (!state) return;
			centerXRef.current = state.x;
			halfWidthRef.current = LOCAL_HALF_WIDTH;
			durationRef.current = LOCAL_WALK_DURATION_MS;
			progressRef.current = 0.5; // start walking outward from the drop point
			modeRef.current = 'local';
			lastTickRef.current = performance.now();
			// Suppress unused-warning while keeping the event reference clean.
			void e;
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
			<div
				style={{
					width: FRAME_SIZE,
					height: FRAME_SIZE,
					backgroundImage: `url(${walkSheet})`,
					backgroundSize: `${SHEET_WIDTH}px ${FRAME_SIZE}px`,
					backgroundPosition: `-${frame * FRAME_SIZE}px 0px`,
					backgroundRepeat: 'no-repeat',
					// Sprite faces left by default; flip when walking right.
					transform: direction === 1 ? 'scaleX(-1)' : 'scaleX(1)',
					filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
					pointerEvents: 'none',
				}}
			/>
		</div>
	);
};

export default WalkingCodi;
