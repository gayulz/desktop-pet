import overheatedImage from '../../assets/codi/overheated.png';

const OverheatedSprite = () => (
	<img
		src={overheatedImage}
		alt="Codi overheated"
		width={128}
		height={128}
		className="pet-overheated"
		draggable={false}
		style={{
			filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
			pointerEvents: 'none',
		}}
	/>
);

export default OverheatedSprite;
