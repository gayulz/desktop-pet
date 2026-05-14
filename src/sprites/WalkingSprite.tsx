import walkSheet from '../../assets/codi/walk-sheet.png';
import { useEffect, useState } from 'react';

const FRAME_COUNT = 4;
const FRAME_SIZE = 128;
const SHEET_WIDTH = FRAME_SIZE * FRAME_COUNT;
const FRAME_INTERVAL_MS = 200;

interface Props {
	// 1 = moving right, -1 = moving left. The sprite faces left by default,
	// so we flip when direction is 1.
	direction: 1 | -1;
}

const WalkingSprite = ({ direction }: Props) => {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % FRAME_COUNT);
		}, FRAME_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<div
			style={{
				width: FRAME_SIZE,
				height: FRAME_SIZE,
				backgroundImage: `url(${walkSheet})`,
				backgroundSize: `${SHEET_WIDTH}px ${FRAME_SIZE}px`,
				backgroundPosition: `-${frame * FRAME_SIZE}px 0px`,
				backgroundRepeat: 'no-repeat',
				transform: direction === 1 ? 'scaleX(-1)' : 'scaleX(1)',
				filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
				pointerEvents: 'none',
			}}
		/>
	);
};

export default WalkingSprite;
