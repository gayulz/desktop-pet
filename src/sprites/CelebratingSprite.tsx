import celebratingImage from '../../assets/codi/celebrating.png';

const CelebratingSprite = () => (
	<img
		src={celebratingImage}
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

export default CelebratingSprite;
