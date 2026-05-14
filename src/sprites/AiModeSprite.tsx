import { useEffect, useState } from 'react';
import aiMode1 from '../../assets/codi/ai-mode-1.png';
import aiMode2 from '../../assets/codi/ai-mode-2.png';

// Slow swap (~600ms) keeps the wizard pose calm — Codi is thinking, not panicking.
const FRAME_INTERVAL_MS = 600;

const AiModeSprite = () => {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % 2);
		}, FRAME_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<img
			src={frame === 0 ? aiMode1 : aiMode2}
			alt="Codi AI mode"
			width={128}
			height={128}
			className="pet-ai-mode"
			draggable={false}
			style={{
				filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
				pointerEvents: 'none',
			}}
		/>
	);
};

export default AiModeSprite;
