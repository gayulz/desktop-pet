import { useEffect, useRef, useState } from 'react';
import WalkingSprite from './sprites/WalkingSprite';
import IdleSprite from './sprites/IdleSprite';
import SleepingSprite from './sprites/SleepingSprite';
import OverheatedSprite from './sprites/OverheatedSprite';
import CodingSprite from './sprites/CodingSprite';
import StudyingSprite from './sprites/StudyingSprite';
import CelebratingSprite from './sprites/CelebratingSprite';
import AiModeSprite from './sprites/AiModeSprite';
import { deriveState, CELEBRATE_DURATION_MS, type PetState } from './state/petState';
import type { AppCategory } from './types/electron';
import { useWindowMotion } from './hooks/useWindowMotion';

/**
 * Top-level pet container. Owns the state machine and routes the current
 * PetState to the matching sprite. Window position, drag, and falling physics
 * live in useWindowMotion so this file stays focused on state derivation and
 * UI routing.
 */
const PetController = () => {
	const [state, setState] = useState<PetState>('walking');
	const [codingActive, setCodingActive] = useState(false);
	const [aiModeActive, setAiModeActive] = useState(false);

	const cpuLoadRef = useRef(0);
	const systemIdleRef = useRef(0);
	const manualOverrideRef = useRef<PetState | null>(null);
	const activeAppCategoryRef = useRef<AppCategory>('unknown');
	const activeWindowTitleRef = useRef('');
	const lastCommitAtMsRef = useRef<number | null>(null);

	const { direction, turning, onMouseDown } = useWindowMotion(state);

	// Subscribe to all three IPC channels and recompute state from the latest
	// snapshot whenever any of them produces an event.
	useEffect(() => {
		const startedAt = performance.now();

		const recompute = () => {
			const next = deriveState({
				cpuLoad: cpuLoadRef.current,
				systemIdleSec: systemIdleRef.current,
				manualOverride: manualOverrideRef.current,
				appUptimeSec: (performance.now() - startedAt) / 1000,
				activeAppCategory: activeAppCategoryRef.current,
				activeWindowTitle: activeWindowTitleRef.current,
				lastCommitAtMs: lastCommitAtMsRef.current,
				nowMs: Date.now(),
			});
			setState((prev) => (prev === next ? prev : next));
		};

		const offMetrics = window.electronAPI.onMetricsTick((m) => {
			cpuLoadRef.current = m.cpuLoad;
			systemIdleRef.current = m.systemIdleSec;
			recompute();
		});
		const offActive = window.electronAPI.onActiveWindowTick((info) => {
			activeAppCategoryRef.current = info.category;
			activeWindowTitleRef.current = info.title;
			recompute();
		});
		const offGit = window.electronAPI.onGitCommit(() => {
			lastCommitAtMsRef.current = Date.now();
			recompute();
			// Re-evaluate just after the celebration window closes so Codi
			// promptly drops back to walking/idle without waiting for the next
			// metrics tick.
			setTimeout(recompute, CELEBRATE_DURATION_MS + 50);
		});

		return () => {
			offMetrics();
			offActive();
			offGit();
		};
	}, []);

	const applyOverride = (mode: 'coding' | 'ai_mode' | null) => {
		setCodingActive(mode === 'coding');
		setAiModeActive(mode === 'ai_mode');
		manualOverrideRef.current = mode;
		setState(
			deriveState({
				cpuLoad: cpuLoadRef.current,
				systemIdleSec: systemIdleRef.current,
				manualOverride: manualOverrideRef.current,
				appUptimeSec: Number.POSITIVE_INFINITY,
				activeAppCategory: activeAppCategoryRef.current,
				activeWindowTitle: activeWindowTitleRef.current,
				lastCommitAtMs: lastCommitAtMsRef.current,
				nowMs: Date.now(),
			})
		);
	};

	const handleContextMenu = async (e: React.MouseEvent) => {
		e.preventDefault();
		const action = await window.electronAPI.showContextMenu(codingActive, aiModeActive);
		if (action === 'quit') {
			window.electronAPI.quitApp();
			return;
		}
		if (action === 'open-screen-recording') {
			window.electronAPI.openScreenRecordingPrefs();
			return;
		}
		if (action === 'toggle-coding') {
			applyOverride(codingActive ? null : 'coding');
			return;
		}
		if (action === 'toggle-ai-mode') {
			applyOverride(aiModeActive ? null : 'ai_mode');
			return;
		}
	};

	const renderSprite = () => {
		switch (state) {
			case 'walking':
				return <WalkingSprite direction={direction} turning={turning} />;
			case 'idle':
				return <IdleSprite />;
			case 'sleeping':
				return <SleepingSprite />;
			case 'overheated':
				return <OverheatedSprite />;
			case 'coding':
				return <CodingSprite />;
			case 'studying':
				return <StudyingSprite />;
			case 'celebrating':
				return <CelebratingSprite />;
			case 'ai_mode':
				return <AiModeSprite />;
		}
	};

	return (
		<div
			onMouseDown={onMouseDown}
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
