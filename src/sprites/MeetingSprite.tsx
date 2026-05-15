// Meeting sprite — shown while the user has a video-conferencing app in the
// foreground (Zoom, Microsoft Teams, Google Meet, etc.).
//
// The asset (assets/codi/meeting.png) is currently a placeholder copied from
// idle.png; the real meeting illustration (suit + finger to the lips) will
// replace it later without touching this file.

import meetingImage from '../../assets/codi/meeting.png';

const MeetingSprite = () => (
	<img
		src={meetingImage}
		alt="Codi meeting"
		width={128}
		height={128}
		className="pet-meeting"
		draggable={false}
		style={{
			filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
			pointerEvents: 'none',
		}}
	/>
);

export default MeetingSprite;
