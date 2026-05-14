import { useEffect, useState } from 'react';
import coding1 from '../../assets/codi/coding-1.png';
import coding2 from '../../assets/codi/coding-2.png';

// 3 fps — faster looks jittery, slower kills the typing feel.
const FRAME_INTERVAL_MS = 333;

const CodingSprite = () => {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % 2);
		}, FRAME_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<img
			src={frame === 0 ? coding1 : coding2}
			alt="Codi coding"
			width={128}
			height={128}
			draggable={false}
			style={{
				filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
				pointerEvents: 'none',
			}}
		/>
	);
};

export default CodingSprite;
