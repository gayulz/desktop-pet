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

// Window 320x220, Codi sprite occupies the left 220px column. The visible
// Codi body (PNG content bbox is ~93% of the 128px sprite) actually ends near
// x≈165, not at the full sprite box (x=174). Pull the bubble in so it visually
// hugs Codi's cheek instead of floating in the transparent space.
const wrapperStyle: CSSProperties = {
	position: 'absolute',
	left: 150,
	top: 30,
	width: 150,
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
// Tip pokes 8px to the left of the bubble so the arrow seems to actually
// touch Codi's cheek rather than floating in space.
const tailStyle: CSSProperties = {
	position: 'absolute',
	left: -8,
	top: 22,
	width: 0,
	height: 0,
	borderTop: '7px solid transparent',
	borderBottom: '7px solid transparent',
	borderRight: '9px solid rgba(255, 255, 255, 0.96)',
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
