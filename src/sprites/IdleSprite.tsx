import idleImage from '../../assets/codi/idle.png';

const IdleSprite = () => (
	<img
		src={idleImage}
		alt="Codi idle"
		width={128}
		height={128}
		className="pet-idle"
		draggable={false}
		style={{
			filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
			pointerEvents: 'none',
		}}
	/>
);

export default IdleSprite;
