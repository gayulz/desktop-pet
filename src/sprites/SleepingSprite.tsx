import sleepingImage from '../../assets/codi/sleeping.png';

const SleepingSprite = () => (
	<img
		src={sleepingImage}
		alt="Codi sleeping"
		width={128}
		height={128}
		className="pet-sleeping"
		draggable={false}
		style={{
			filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
			pointerEvents: 'none',
		}}
	/>
);

export default SleepingSprite;
