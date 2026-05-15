import { useEffect, useRef, useState } from 'react';
import WalkingSprite from './sprites/WalkingSprite';
import IdleSprite from './sprites/IdleSprite';
import SleepingSprite from './sprites/SleepingSprite';
import OverheatedSprite from './sprites/OverheatedSprite';
import CodingSprite from './sprites/CodingSprite';
import StudyingSprite from './sprites/StudyingSprite';
import CelebratingSprite from './sprites/CelebratingSprite';
import AiModeSprite from './sprites/AiModeSprite';
import NoticeSprite from './sprites/NoticeSprite';
import SpeechBubble from './components/SpeechBubble';
import {
	deriveState,
	CELEBRATE_DURATION_MS,
	DEFAULT_STUDY_KEYWORDS,
	type PetState,
} from './state/petState';
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
	const [noticeTitle, setNoticeTitle] = useState<string | undefined>(undefined);
	const [noticeBody, setNoticeBody] = useState<string | undefined>(undefined);

	const cpuLoadRef = useRef(0);
	const systemIdleRef = useRef(0);
	const manualOverrideRef = useRef<PetState | null>(null);
	const activeAppCategoryRef = useRef<AppCategory>('unknown');
	const activeWindowTitleRef = useRef('');
	const lastCommitAtMsRef = useRef<number | null>(null);
	const noticeActiveRef = useRef(false);
	const lastAiActivityAtMsRef = useRef<number | null>(null);
	const studyKeywordsRef = useRef<string[]>(DEFAULT_STUDY_KEYWORDS);

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
				noticeActive: noticeActiveRef.current,
				lastAiActivityAtMs: lastAiActivityAtMsRef.current,
				studyKeywords: studyKeywordsRef.current,
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
		const offNotify = window.electronAPI.onNotify((payload) => {
			noticeActiveRef.current = true;
			// Surface the title/body so the speech bubble can render them.
			// Only set when present so an empty notify doesn't clear an
			// existing bubble (the previous one stays until dismissed).
			if (payload.title || payload.body) {
				setNoticeTitle(payload.title);
				setNoticeBody(payload.body);
			}
			recompute();
		});
		const offAi = window.electronAPI.onAiActivity((timestampMs) => {
			lastAiActivityAtMsRef.current = timestampMs;
			recompute();
		});

		// Tick periodically so ai_mode automatically expires after its window
		// without waiting for the next metrics push.
		const aiExpiryTick = setInterval(recompute, 30 * 1000);

		// Tray menu items dispatch back into the controller through the same
		// applyOverride path the context menu uses.
		const offTray = window.electronAPI.onTrayAction((action) => {
			if (action === 'toggle-coding') {
				applyOverride(manualOverrideRef.current === 'coding' ? null : 'coding');
			} else if (action === 'toggle-ai-mode') {
				applyOverride(manualOverrideRef.current === 'ai_mode' ? null : 'ai_mode');
			}
		});

		// Pull the current settings on boot, then watch for changes pushed by
		// main when the user saves the settings window.
		window.settingsAPI.get().then((s) => {
			studyKeywordsRef.current = s.studyKeywords;
			recompute();
		});
		const offSettings = window.settingsBridge.onSettingsChanged((s) => {
			studyKeywordsRef.current = s.studyKeywords;
			recompute();
		});

		return () => {
			offMetrics();
			offActive();
			offGit();
			offNotify();
			offAi();
			offTray();
			offSettings();
			clearInterval(aiExpiryTick);
		};
	}, []);

	const recomputeNow = () => {
		setState(
			deriveState({
				cpuLoad: cpuLoadRef.current,
				systemIdleSec: systemIdleRef.current,
				manualOverride: manualOverrideRef.current,
				appUptimeSec: Number.POSITIVE_INFINITY,
				activeAppCategory: activeAppCategoryRef.current,
				activeWindowTitle: activeWindowTitleRef.current,
				lastCommitAtMs: lastCommitAtMsRef.current,
				noticeActive: noticeActiveRef.current,
				lastAiActivityAtMs: lastAiActivityAtMsRef.current,
				studyKeywords: studyKeywordsRef.current,
				nowMs: Date.now(),
			})
		);
	};

	const applyOverride = (mode: 'coding' | 'ai_mode' | null) => {
		const coding = mode === 'coding';
		const ai = mode === 'ai_mode';
		setCodingActive(coding);
		setAiModeActive(ai);
		manualOverrideRef.current = mode;
		window.electronAPI.reportState({ codingActive: coding, aiModeActive: ai });
		recomputeNow();
	};

	const dismissNotice = () => {
		if (!noticeActiveRef.current) return false;
		noticeActiveRef.current = false;
		setNoticeTitle(undefined);
		setNoticeBody(undefined);
		recomputeNow();
		return true;
	};

	// Intercept the press-down on Codi: while noticing, the left click only
	// dismisses the notice (no drag), so the user can't accidentally fling
	// Codi while trying to acknowledge an alert.
	const handleMouseDown = (e: React.MouseEvent) => {
		if (state === 'notice' && e.button === 0) {
			e.preventDefault();
			dismissNotice();
			return;
		}
		void onMouseDown(e);
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
			case 'notice':
				return <NoticeSprite />;
		}
	};

	const showBubble =
		state === 'notice' && (Boolean(noticeTitle) || Boolean(noticeBody));

	return (
		<div
			onMouseDown={handleMouseDown}
			onContextMenu={handleContextMenu}
			style={{
				width: '100%',
				height: '100%',
				position: 'relative',
				cursor: 'grab',
			}}
		>
			{/*
			  Codi occupies the leftmost 220px column of the (now wider) window
			  so the right-side columns stay free for the speech bubble. The
			  walking math in useWindowMotion still uses petSize=220 as the
			  Codi-area width, which keeps Codi visually centered on screen.
			*/}
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: 220,
					height: 220,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				{renderSprite()}
			</div>
			{showBubble ? (
				<SpeechBubble
					title={noticeTitle}
					body={noticeBody}
					onDismiss={dismissNotice}
				/>
			) : null}
		</div>
	);
};

export default PetController;
