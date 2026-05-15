import { useEffect, useState, type CSSProperties } from 'react';
import aiMode1 from '../../assets/codi/ai-mode-1.png';
import aiMode2 from '../../assets/codi/ai-mode-2.png';

// Slow swap (~600ms) keeps the wizard pose calm — Codi is thinking, not panicking.
const FRAME_INTERVAL_MS = 600;

// Render BOTH frames stacked and toggle opacity rather than swapping the src
// attribute. Swapping a single <img>'s src on a 600 ms interval gave the
// browser enough time to show a blank/broken-image flash while decoding the
// next 1.1 MB PNG. With both <img>s already mounted, the only operation per
// tick is a CSS opacity flip — the compositor handles it without re-decoding.

const containerStyle: CSSProperties = {
	position: 'relative',
	width: 128,
	height: 128,
};

const baseImgStyle: CSSProperties = {
	position: 'absolute',
	left: 0,
	top: 0,
	width: 128,
	height: 128,
	filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
	pointerEvents: 'none',
	transition: 'opacity 120ms ease-in-out',
};

const AiModeSprite = () => {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % 2);
		}, FRAME_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<div className="pet-ai-mode" style={containerStyle}>
			<img
				src={aiMode1}
				alt="Codi AI mode"
				width={128}
				height={128}
				draggable={false}
				style={{ ...baseImgStyle, opacity: frame === 0 ? 1 : 0 }}
			/>
			<img
				src={aiMode2}
				alt=""
				width={128}
				height={128}
				draggable={false}
				aria-hidden="true"
				style={{ ...baseImgStyle, opacity: frame === 1 ? 1 : 0 }}
			/>
		</div>
	);
};

export default AiModeSprite;
