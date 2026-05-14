import { useEffect, useState } from 'react';
import notice1 from '../../assets/codi/notice-1.png';
import notice2 from '../../assets/codi/notice-2.png';

// 5 fps — fast swap signals "hey, look at me!".
const FRAME_INTERVAL_MS = 200;

const NoticeSprite = () => {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % 2);
		}, FRAME_INTERVAL_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<img
			src={frame === 0 ? notice1 : notice2}
			alt="Codi notice"
			width={128}
			height={128}
			className="pet-notice"
			draggable={false}
			style={{
				filter: 'drop-shadow(0 4px 8px rgba(255, 180, 0, 0.6))',
				pointerEvents: 'none',
			}}
		/>
	);
};

export default NoticeSprite;
