# 🚀 Claude Code 시작 가이드 (최종)

## 사용법

이 폴더의 3개 파일을 새 프로젝트 폴더에 복사한 뒤, Claude Code 세션을 열고 아래 첫 프롬프트를 그대로 붙여넣으면 된다.

## 파일 구성

1. **`CLAUDE.md`** — 프로젝트 컨텍스트 (Claude Code가 자동 인식)
2. **`HANDOFF.md`** — Week 1 상세 작업 가이드
3. **`START_PROMPT.md`** — 이 파일 (첫 프롬프트 내용)

## 사전 준비

### 1. 캐릭터 PNG 파일 준비

GPT에서 받은 PNG 파일들을 모두 모아두기:

```
□ idle.png            ← Week 1 필수
□ walk-sheet.png      ← 스프라이트 시트
□ coding.png          ← 노트북 추가 버전으로 다시 받기
□ studying.png        ← 책 들고 공부하는 신규
□ ai-mode.png         ← 받음
□ overheated.png      ← 받음
□ sleeping.png        ← 받음
□ celebrating.png     ← 받음
```

### 2. 프로젝트 폴더 세팅

```bash
mkdir ~/dev/desktop-pet
cd ~/dev/desktop-pet
mkdir -p assets/codi

# 받은 PNG들을 assets/codi/에 복사
cp ~/Downloads/idle.png assets/codi/
cp ~/Downloads/walk-sheet.png assets/codi/
# ... 나머지

# 인수인계 파일 복사
cp /path/to/CLAUDE.md .
cp /path/to/HANDOFF.md .
```

### 3. Claude Code 실행

```bash
claude
```

## 첫 프롬프트 (복붙용)

아래 내용을 그대로 Claude Code에 첫 메시지로 입력:

---

```
안녕! 데스크톱 펫 "코디" 프로젝트를 시작하려고 해.

프로젝트 컨텍스트는 CLAUDE.md, Week 1 상세 작업 가이드는 HANDOFF.md에 있어. 
두 파일 먼저 읽어보고 작업 시작해줘.

assets/codi/ 폴더에 캐릭터 PNG들 다 준비해뒀어. 
일단 Week 1에서는 idle.png만 사용할 거야.

요청사항:
1. HANDOFF.md의 Step 1~16을 순서대로 실행
2. 각 Step 진행 전에 사이드이펙트나 영향도가 있으면 미리 알려줘
3. 의존성 설치 같은 시간 걸리는 작업은 진행 상황 알려줘
4. 에러 발생 시 트러블슈팅 섹션 참고
5. 모든 Step 완료 후 npm start 실행해서 코디가 정상적으로 뜨는지 확인하는 것까지 도와줘
6. 캐릭터 PNG 파일들이 모두 같은 사이즈인지 체크해줘 (다르면 알려줘)

추가 컨텍스트:
- 나는 백엔드 개발자 2년차야. Java/Spring 메인이라 Node.js 깊이는 얕아.
- 명령어 실행 결과나 코드 변경사항이 있으면 무엇이 왜 그렇게 되는지 간단히 설명 부탁
- 너무 길게 설명하지 말고, 핵심만 짚어주면 돼
- 진행 중 선택지가 있으면 추천안과 이유를 같이 제시해줘

자, 시작해보자!
```

---

## 작업 진행 팁

### Claude Code 자주 쓰는 명령어

- `/help` — 도움말
- `/clear` — 컨텍스트 초기화 (Week 끝나고 새 작업 시작할 때)
- `/cost` — 토큰 사용량 확인
- `Esc Esc` — 작업 중단

### 권한 관련

- 파일 생성/수정은 자동 허용 권장 (Don't ask again for this session)
- npm install 같은 명령어는 확인 후 허용
- 시스템 설정 변경하는 명령어는 신중하게

### 진행이 막힐 때 쓸 만한 질문

- "이 부분 더 자세히 설명해줘"
- "다른 방법은 없어?"
- "지금까지 진행상황 요약해줘"
- "왜 이렇게 한 거야?"

## Week 1 완료 후

새 Claude Code 세션에서:

```
Week 1은 완료했어. CLAUDE.md 읽고 Week 2 작업 시작해줘.
이번엔 시스템 모니터링을 추가할 거야. 
- systeminformation 라이브러리로 CPU/메모리 수집
- 상태 머신 구현 (idle / overheated / sleeping)
- 상태별 PNG 교체 로직
- 걷기 스프라이트 시트 애니메이션 (walk-sheet.png)
```

## 추가 GPT 작업 필요 항목

Week 1 진행하면서 동시에 GPT에서 받을 거:

### coding.png 수정
현재 안경만 있고 노트북이 없음 → 노트북 추가해서 다시 받기

```
이 안경 쓴 코딩 캐릭터에 노트북을 추가해줘.
- 같은 캐릭터 유지
- 펼쳐진 노트북, 화면에 코드 라인 표시
- 캐릭터가 키보드에 손 올린 자세
- 64x64 픽셀, 투명 배경
```

### studying.png 신규
인프런 강의 들을 때 표시될 책 들고 공부하는 모습

```
이 노란 레서팬더 캐릭터로 "공부 중" 상태 만들어줘.
- 양손으로 책 들고 있는 모습
- 책 표지에 별/체크 아이콘
- 머리 위에 작은 전구 표시 (학습 깨달음)
- 진지하지만 귀여운 표정
- 64x64 픽셀, 투명 배경, 정면 뷰
```
