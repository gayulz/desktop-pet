import studyingImage from '../../assets/codi/studying.png';

const StudyingSprite = () => (
	<img
		src={studyingImage}
		alt="Codi studying"
		width={128}
		height={128}
		className="pet-studying"
		draggable={false}
		style={{
			filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
			pointerEvents: 'none',
		}}
	/>
);

export default StudyingSprite;
