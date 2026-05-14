import { useEffect, useState } from 'react';
import celebrating1 from '../../assets/codi/celebrating-1.png';
import celebrating2 from '../../assets/codi/celebrating-2.png';

// 4 fps — pairs nicely with the .pet-celebrating CSS jump (0.5s).
// One frame swap per half-jump makes the cheer feel kinetic.
const FRAME_INTERVAL_MS = 250;

const CelebratingSprite = () => {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % 2);
		}, FRAME_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<img
			src={frame === 0 ? celebrating1 : celebrating2}
			alt="Codi celebrating"
			width={128}
			height={128}
			className="pet-celebrating"
			draggable={false}
			style={{
				filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
				pointerEvents: 'none',
			}}
		/>
	);
};

export default CelebratingSprite;
