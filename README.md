# 🐾 Codi — 데스크톱 동반자

macOS 데스크톱에 사는 작은 노란 레서팬더. 시스템 활동을 감지해서 같이 일하고,
같이 공부하고, 같이 쉽니다.

## 무엇을 하나

| 상태 | 트리거 | 모션 |
|---|---|---|
| **walking** | 시작 직후 또는 활발한 입력 | 좌우 산책 + 방향 전환 |
| **idle** | 잠깐의 무활동 | 통통 |
| **sleeping** | 5분 무활동 | 호흡 |
| **coding** | VSCode / iTerm / 터미널 활성 | 안경 + 노트북 |
| **studying** | 브라우저 + "인프런/강의/학습" 등 | 책 들고 공부 |
| **overheated** | CPU > 80% | 빨간 얼굴 + 흔들기 |
| **celebrating** | `git commit` 감지 | 만세 + 색종이 |
| **ai_mode** | `~/.claude/` 활동 | 마법사 모자 |
| **notice** | `curl POST /notify` 외부 알림 | 종 흔들기, 좌클릭 dismiss |

## 외부 알림 보내기 (notice)

다른 도구가 코디에게 "사용자 attention 필요" 신호를 보낼 수 있습니다.

```bash
# 단순 호출
curl -X POST http://127.0.0.1:7777/notify

# 제목·본문 포함 (현재는 알림만, 본문 표시는 추후 말풍선 UI에서)
curl -X POST http://127.0.0.1:7777/notify \
  -H 'Content-Type: application/json' \
  -d '{"title":"Claude needs you","body":"answer in CLI"}'
```

코디 좌클릭으로 알림을 dismiss합니다.

## 사용법

### 개발 모드

```bash
npm install
npm start
```

### .dmg 빌드 (배포용)

```bash
npm run build:mac
# → release/Codi-0.1.0-arm64.dmg 생성
```

## 🔑 권한 안내

코디는 **추가 권한 없이 바로 동작합니다**:
- walking · idle · sleeping · overheated · ai_mode · celebrating · notice

**추가 권한이 필요한 기능 (기본 OFF)**:
- **활성 창 감지 (coding / studying)** — macOS Accessibility + Screen Recording 권한 필요
  - 첫 실행 시 권한 다이얼로그를 피하기 위해 **기본값 OFF**
  - 트레이 메뉴 → **설정 열기...** → "활성 창 감지" ON → 저장
  - 그러면 macOS가 한 번 권한 다이얼로그 표시 → 시스템 설정에서 Codi.app 토글 ON
  - **studying 자동 감지는 Screen Recording 권한도 필요** (코드 수정 필요, 향후 UI 옵션화 예정)

> 활성 창 감지가 OFF인 동안에도 **코딩 모드**는 우클릭 메뉴 / 트레이 메뉴에서 **수동 토글** 가능합니다.

### "확인되지 않은 개발자" 경고

서명 없이 빌드된 첫 .dmg는 macOS Gatekeeper가 차단합니다.
- `Codi.app` 우클릭 → **열기** → **확인 없이 열기**
- 또는 시스템 설정 → 개인정보 보호 및 보안 → 하단의 **"확인 없이 열기"** 버튼

## 설정 (메뉴바 → 설정 열기)

- **학습 키워드**: 브라우저 페이지 제목이 이 단어를 포함하면 studying 진입.
  기본값: `인프런, inflearn, 강의, 학습, 공부`. Udemy, Coursera 같은 단어 추가 가능.
- **자동 감지 채널 토글**: 활성 창 / Claude 활동 / Git 커밋 각각 ON/OFF.
  Claude와 학습을 동시에 하느라 ai_mode가 studying을 가린다면 Claude
  감지를 일시적으로 끌 수 있습니다.

설정은 `~/Library/Application Support/codi/settings.json`에 저장되며
저장 즉시 적용됩니다 (재시작 불필요).

## 조작

| 입력 | 동작 |
|---|---|
| 코디 좌클릭 + 드래그 | 임의 위치로 이동. 공중에 놓으면 천천히 떨어짐 |
| 코디 좌클릭 (notice 중) | 알림 dismiss |
| 코디 우클릭 | 컨텍스트 메뉴 (모드 토글, 설정, 종료) |
| 메뉴바 아이콘 클릭 | 동일 메뉴 + 코디 보이기/숨기기 |

## 기술 스택

- Electron 31, React 19, TypeScript 5, Vite 5
- 시스템 통합: systeminformation, active-win, chokidar
- 빌드: electron-builder
- 시스템 요구: macOS 12+ (Apple Silicon 또는 Intel)
