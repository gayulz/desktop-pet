import walkSheet from '../../assets/codi/walk-sheet.png';
import working1 from '../../assets/codi/working-1.png';
import working2 from '../../assets/codi/working-2.png';
import { useEffect, useState } from 'react';

const FRAME_COUNT = 4;
const FRAME_SIZE = 128;
const SHEET_WIDTH = FRAME_SIZE * FRAME_COUNT;
const WALK_FRAME_INTERVAL_MS = 200;
const TURN_FRAME_INTERVAL_MS = 200;

interface Props {
	// 1 = moving right, -1 = moving left. The walk sheet faces left by default
	// so we flip when direction is 1.
	direction: 1 | -1;
	// When true, render the turning pose (working-1/2) instead of the walking
	// sheet. The turn pose is shown for a short moment at each wall before the
	// direction actually flips, so the change of heart looks intentional rather
	// than a hard snap.
	turning?: boolean;
}

const WalkingSprite = ({ direction, turning = false }: Props) => {
	const [walkFrame, setWalkFrame] = useState(0);
	const [turnFrame, setTurnFrame] = useState(0);

	useEffect(() => {
		if (turning) return;
		const id = setInterval(() => {
			setWalkFrame((f) => (f + 1) % FRAME_COUNT);
		}, WALK_FRAME_INTERVAL_MS);
		return () => clearInterval(id);
	}, [turning]);

	useEffect(() => {
		if (!turning) return;
		setTurnFrame(0);
		const id = setInterval(() => {
			setTurnFrame((f) => (f + 1) % 2);
		}, TURN_FRAME_INTERVAL_MS);
		return () => clearInterval(id);
	}, [turning]);

	if (turning) {
		return (
			<img
				src={turnFrame === 0 ? working1 : working2}
				alt="Codi turning"
				width={FRAME_SIZE}
				height={FRAME_SIZE}
				draggable={false}
				style={{
					filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
					pointerEvents: 'none',
				}}
			/>
		);
	}

	return (
		<div
			style={{
				width: FRAME_SIZE,
				height: FRAME_SIZE,
				backgroundImage: `url(${walkSheet})`,
				backgroundSize: `${SHEET_WIDTH}px ${FRAME_SIZE}px`,
				backgroundPosition: `-${walkFrame * FRAME_SIZE}px 0px`,
				backgroundRepeat: 'no-repeat',
				transform: direction === 1 ? 'scaleX(-1)' : 'scaleX(1)',
				filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
				pointerEvents: 'none',
			}}
		/>
	);
};

export default WalkingSprite;
