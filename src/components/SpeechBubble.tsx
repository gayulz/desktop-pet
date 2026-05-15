import { type CSSProperties } from 'react';

/**
 * Small speech bubble that floats at Codi's top-right when an external
 * notice arrives with text. Renders inside the same pet window as Codi;
 * the window is wider than Codi's sprite so this bubble has room without
 * needing a separate BrowserWindow.
 *
 * Clicking the bubble dismisses it (and the underlying notice state).
 */
interface Props {
	title?: string;
	body?: string;
	onDismiss: () => void;
}

// Window 360x220, Codi sprite occupies the left 220px column. Codi's right
// edge sits around x=174 (window left). Anchor the bubble just to the right
// of Codi (left=178) and lift it so the tail points at Codi's upper face.
const wrapperStyle: CSSProperties = {
	position: 'absolute',
	left: 178,
	top: 30,
	width: 170,
	maxHeight: 150,
	background: 'rgba(255, 255, 255, 0.96)',
	color: '#1f2937',
	borderRadius: 10,
	padding: '8px 10px',
	boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
	fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
	fontSize: 11,
	lineHeight: 1.35,
	cursor: 'pointer',
	pointerEvents: 'auto',
	overflow: 'hidden',
	wordBreak: 'break-word',
};

const titleStyle: CSSProperties = {
	fontWeight: 700,
	fontSize: 12,
	marginBottom: 3,
	color: '#111827',
};

const bodyStyle: CSSProperties = {
	color: '#374151',
	display: '-webkit-box',
	WebkitLineClamp: 4,
	WebkitBoxOrient: 'vertical',
	overflow: 'hidden',
};

// Speech-bubble tail pointing toward Codi (sits to the left of the bubble).
const tailStyle: CSSProperties = {
	position: 'absolute',
	left: -6,
	top: 18,
	width: 0,
	height: 0,
	borderTop: '6px solid transparent',
	borderBottom: '6px solid transparent',
	borderRight: '7px solid rgba(255, 255, 255, 0.96)',
};

const SpeechBubble = ({ title, body, onDismiss }: Props) => {
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onDismiss();
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		// Stop the bubble click from triggering the pet window drag.
		e.stopPropagation();
	};

	return (
		<div
			className="pet-bubble"
			style={wrapperStyle}
			onClick={handleClick}
			onMouseDown={handleMouseDown}
			title="클릭하여 닫기"
		>
			<span style={tailStyle} />
			{title ? <div style={titleStyle}>{title}</div> : null}
			{body ? <div style={bodyStyle}>{body}</div> : null}
		</div>
	);
};

export default SpeechBubble;
