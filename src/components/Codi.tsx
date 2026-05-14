import idleImage from '@assets/codi/idle.png';

const Codi = () => {
	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		if (confirm('코디를 재울까요? (앱 종료)')) {
			window.electronAPI.quitApp();
		}
	};

	return (
		<div
			onContextMenu={handleContextMenu}
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<img
				src={idleImage}
				alt="Codi"
				width={128}
				height={128}
				className="pet-idle"
				style={{
					filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
				}}
				draggable={false}
			/>
		</div>
	);
};

export default Codi;
