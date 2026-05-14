# 데스크톱 펫 "코디(Codi)" 프로젝트

## 프로젝트 개요

macOS 데스크톱 펫 애플리케이션. 노란 레서팬더 캐릭터 "코디"가 화면 우측 하단에 떠다니며 사용자의 개발/학습 활동을 시각화한다.

- **타겟 OS**: macOS (Apple Silicon 우선, Intel도 호환)
- **목적**: 개인용 + 유튜브 dev vlog 콘텐츠 소재
- **배포 형태**: `.dmg` 패키징 → `/Applications/Codi.app` 정식 macOS 앱
- **개발자**: 백엔드 개발자 2년차 (Java/Spring 메인, Node.js/React 학습 병행)

## 캐릭터 컨셉

**이름**: 코디 (Codi · Coding + Red panda)
**종족**: 노란 레서팬더 (오리지널 캐릭터)
**설정**: 사용자 키보드 옆에 사는 작은 레서팬더. 코드를 좋아하고, 인프런 강의도 같이 듣고, 커밋 소리에 신난다.

### 비주얼 특징
- **메인 색상**: 따뜻한 골든 옐로우
- **얼굴/배**: 크림 화이트
- **꼬리/귀 줄무늬**: 갈색 (레서팬더 정체성 유지)
- **눈**: 점 두 개 + 하이라이트
- **사이즈**: 원본 PNG → CSS에서 128x128로 렌더링

### 상태(State) 정의 - 총 8개

| 상태 | 자동 트리거 | 수동 토글 | 시각 표현 | 프레임 |
|---|---|---|---|---|
| `idle` | 기본 | - | 평상시 통통 | 1장 + CSS 통통 |
| `walking` | 일정 시간마다 발동 | - | 옆모습 걷기 | **4프레임 시트** (walk-sheet.png) |
| `coding` | VSCode/터미널 활성 + 키 입력 | ✅ | 안경 + 노트북 + 타이핑 | **2프레임 교체** (coding-1, coding-2) |
| `studying` | 창 제목에 "인프런"/"Inflearn" | ✅ | 책 + 연필 + 머그컵 | 1장 + CSS 호흡 |
| `ai_mode` | `~/.claude/` 파일 변화 감지 | - | 보라 마법사 모자 | 1장 + CSS 둥둥 |
| `overheated` | CPU > 80% | - | 빨간 얼굴, 땀방울 | 1장 + CSS 좌우 흔들 |
| `sleeping` | 5분 무활동 | - | 눈 감음, Z 표시 | 1장 + CSS 호흡 |
| `celebrating` | Git commit 감지 | - | 만세, 색종이 | 1장 + CSS 펄쩍 |

**상태 우선순위 (높을수록 우선)**:
1. 수동 오버라이드
2. celebrating (커밋 직후 3초)
3. overheated (시스템 위급)
4. ai_mode (Claude Code 작업 중)
5. studying (인프런 시청)
6. coding (개발 도구 활성)
7. sleeping (무활동)
8. walking (랜덤 발동)
9. idle (기본값)

## 에셋 파일 구조

```
assets/codi/                 # 프로젝트 내부 (필수: .dmg 빌드 시 함께 번들링됨)
├── idle.png                # 정면 - 평상시
├── walk-sheet.png          # 옆모습 - 걷기 4프레임 (가로 시트)
├── coding-1.png            # 정면 - 안경 + 노트북 (프레임 1)
├── coding-2.png            # 정면 - 안경 + 노트북 (프레임 2, 타이핑)
├── studying.png            # 정면 - 책 들고 공부
├── ai-mode.png             # 정면 - 마법사 모자
├── overheated.png          # 정면 - 빨간 얼굴, 땀
├── sleeping.png            # 정면 - 자는 중
└── celebrating.png         # 정면 - 만세
```

**중요**: `.dmg`로 패키징하려면 에셋이 **프로젝트 내부**에 있어야 함.
외부 경로(`/Users/.../workspace/`) 참조는 빌드 시 포함되지 않아 다른 맥에서 깨짐.

## 기술 스택

- **Framework**: Electron 31+
- **UI**: React 18 + TypeScript
- **번들러**: Vite 5
- **시스템 모니터링**:
  - `systeminformation` — Week 2
  - `active-win` (활성 앱 + 창 제목) — Week 3
  - `simple-git` — Week 3
  - `chokidar` (파일 watch) — Week 4
  - `node-global-key-listener` — Week 3
- **패키징**: `electron-builder` → `.dmg` (macOS Universal Binary)

## 단계별 로드맵

### Week 1: 보일러플레이트 + 펫 화면 띄우기 ← **현재 단계**
- [x] 캐릭터 9종 완성
- [ ] Electron + React + TS 프로젝트 세팅
- [ ] 투명/항상 위 윈도우
- [ ] idle.png 통통 애니메이션
- [ ] 드래그 이동
- [ ] 우클릭 종료

### Week 2: 시스템 모니터링 + 상태 머신 + CSS 애니메이션
- `systeminformation`으로 CPU/메모리 수집
- 상태 머신 구현 (idle / overheated / sleeping)
- 상태별 PNG 교체 로직
- CSS keyframes 애니메이션
- 걷기 스프라이트 시트 (walk-sheet.png)
- coding 2프레임 교체 (coding-1 ↔ coding-2)
- 말풍선 UI

### Week 3: 코딩/학습 활동 감지
- `active-win` — 활성 앱 + 창 제목
- 인프런 시청 감지 → studying 상태
- VSCode/터미널 → coding 상태
- Git 커밋 감지 → celebrating
- 접근성 권한 + 키 입력 카운트

### Week 4: Claude Code 연동 + 수동 토글 + **macOS 앱 패키징**
- `~/.claude/projects/` 파일 watch → ai_mode
- 수동 상태 토글 메뉴 (트레이/우클릭)
- 설정 UI
- 메뉴바 트레이 아이콘
- **`.dmg` 빌드** (`electron-builder`)
  - `/Applications/Codi.app` 정식 앱
  - 첫 빌드는 서명 없이 (개인용)
  - GitHub Releases에 `.dmg` 업로드 (선택)

## 개발 컨벤션

### 코드 스타일
- TypeScript strict mode
- React 함수형 컴포넌트 + Hooks
- 상태 관리는 useState/useReducer 우선
- 한국어 주석 OK

### Electron 보안
- `contextIsolation: true`, `nodeIntegration: false` 필수
- Node API는 `preload.ts`의 `contextBridge`로만 노출

### 픽셀 아트 렌더링
- `image-rendering: pixelated` CSS 필수
- 원본 PNG → CSS 128x128 렌더링
- 스프라이트 시트(walk): `background-image` + `background-position`
- 2프레임 교체(coding): `src` 속성 또는 두 `<img>` opacity 전환

### CSS 애니메이션 패턴
정지 PNG에 작은 모션 효과:
- bounce (idle): 위아래 통통
- breathe (sleeping/studying): scale 호흡
- shake (overheated): 좌우 흔들
- jump (celebrating): 펄쩍펄쩍
- float (ai_mode): 부드럽게 둥둥

### 패키징 규칙
- 모든 에셋은 프로젝트 내부 (`assets/`) 에 위치
- 외부 경로 참조 금지 (빌드 시 포함되지 않음)
- `electron-builder` config는 `package.json`의 `build` 키 또는 `electron-builder.yml`

### 성능
- CPU/메모리 폴링: 5초
- 활성 앱 폴링: 2초
- 파일 watch: 이벤트 기반
- 배터리 모드 시 폴링 주기 늘리기
- 걷기 애니메이션: 5fps (200ms)
- coding 2프레임 교체: 3fps (333ms, 너무 빠르면 어지러움)
- CSS 통통: 8fps (125ms)

## 개발자 컨텍스트

- 백엔드 메인 (Java/Spring) — Node.js 깊이는 얕음
- 직접적이고 간결한 한국어 설명 선호
- 작업 전 사이드이펙트/영향도 미리 알리기
- 추천안은 이유와 함께 제시
- **정식 macOS 앱 배포가 최종 목표** (개인용 + 다른 맥에서도 설치 가능)

## 현재 작업

`HANDOFF.md`의 Week 1 보일러플레이트 가이드 진행.
