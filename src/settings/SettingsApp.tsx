import { useEffect, useState } from 'react';
import type { AppSettings } from '../types/electron';

const DEFAULT_FALLBACK: AppSettings = {
	studyKeywords: [],
	enableActiveWindow: true,
	enableClaudeWatch: true,
	enableGitWatch: true,
};

const SettingsApp = () => {
	const [settings, setSettings] = useState<AppSettings>(DEFAULT_FALLBACK);
	const [loading, setLoading] = useState(true);
	const [newKeyword, setNewKeyword] = useState('');
	const [status, setStatus] = useState('');

	useEffect(() => {
		window.settingsAPI.get().then((s) => {
			setSettings(s);
			setLoading(false);
		});
	}, []);

	const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
		setStatus('');
	};

	const addKeyword = () => {
		const trimmed = newKeyword.trim();
		if (!trimmed) return;
		if (settings.studyKeywords.includes(trimmed)) {
			setNewKeyword('');
			return;
		}
		updateField('studyKeywords', [...settings.studyKeywords, trimmed]);
		setNewKeyword('');
	};

	const removeKeyword = (k: string) => {
		updateField(
			'studyKeywords',
			settings.studyKeywords.filter((x) => x !== k)
		);
	};

	const save = async () => {
		const saved = await window.settingsAPI.save(settings);
		setSettings(saved);
		setStatus('저장됨 — 즉시 적용 완료');
	};

	if (loading) {
		return (
			<div className="settings">
				<p>로딩 중...</p>
			</div>
		);
	}

	return (
		<div className="settings">
			<h1>코디 설정</h1>

			<section>
				<h2>학습 감지 키워드</h2>
				<p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
					브라우저 활성 창 제목에 이 단어들이 들어있으면 코디가 공부 모드로 전환됩니다.
				</p>
				<div className="keyword-list">
					{settings.studyKeywords.map((k) => (
						<span key={k} className="keyword-chip">
							{k}
							<button onClick={() => removeKeyword(k)} aria-label="제거">×</button>
						</span>
					))}
				</div>
				<div className="add-row">
					<input
						type="text"
						value={newKeyword}
						onChange={(e) => setNewKeyword(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') addKeyword();
						}}
						placeholder="예: udemy, coursera"
					/>
					<button onClick={addKeyword}>추가</button>
				</div>
			</section>

			<section>
				<h2>자동 감지 채널</h2>
				<label className="toggle">
					<span>활성 창 감지 (coding · studying)</span>
					<input
						type="checkbox"
						checked={settings.enableActiveWindow}
						onChange={(e) => updateField('enableActiveWindow', e.target.checked)}
					/>
				</label>
				<label className="toggle">
					<span>Claude 활동 감지 (ai_mode)</span>
					<input
						type="checkbox"
						checked={settings.enableClaudeWatch}
						onChange={(e) => updateField('enableClaudeWatch', e.target.checked)}
					/>
				</label>
				<label className="toggle">
					<span>Git 커밋 감지 (celebrating)</span>
					<input
						type="checkbox"
						checked={settings.enableGitWatch}
						onChange={(e) => updateField('enableGitWatch', e.target.checked)}
					/>
				</label>
			</section>

			<div className="status">{status}</div>

			<div className="save-row">
				<button onClick={save}>저장 (즉시 적용)</button>
			</div>
		</div>
	);
};

export default SettingsApp;
