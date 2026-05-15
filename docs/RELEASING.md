# Codi 릴리즈 가이드

> 이 문서는 Codi의 macOS .dmg 정식 릴리즈 절차를 정의한다.
> 모든 release 작업은 main 브랜치에서 수행한다.

## 사전 조건 (최초 1회)

- `gh` CLI 설치 + 로그인: `brew install gh && gh auth login`
- GitHub 저장소(`gayulz/desktop-pet`)에 release 권한 보유
- Apple Silicon 맥에서 빌드 (x64 빌드도 Rosetta 없이 cross-compile 됨)

## 4단계 표준 절차

### 1. main 브랜치 최신화

```bash
git switch main
git pull origin main
```

작업 트리가 깨끗해야 한다. `git status`로 변경사항 없음 확인.

### 2. 버전 bump

세 가지 의미 단계 중 하나를 고른다 (semver):

| 명령 | 언제 | 예시 |
|---|---|---|
| `npm run version:patch` | 버그 픽스/회귀 수정 | 0.1.0 → 0.1.1 |
| `npm run version:minor` | 기능 추가 (호환 깨지지 않음) | 0.1.0 → 0.2.0 |
| `npm run version:major` | 호환 깨짐 변경 | 0.1.0 → 1.0.0 |

`npm version`이 자동으로:
- `package.json` / `package-lock.json` 의 version을 bump
- `chore(release): vX.Y.Z` 메시지로 커밋 생성
- `vX.Y.Z` 로컬 git tag 생성

> 만약 npm version이 만든 tag가 부담스럽다면 `package.json` 에
> `"config": { "version-git-tag": "false" }` 를 추가하면 된다. 현재는
> `gh release create` 가 같은 이름의 tag를 이미 발견하면 그것을 사용하므로
> 충돌이 발생하지 않는다.

### 3. 변경사항 + 태그 푸시

```bash
git push --follow-tags origin main
```

### 4. 빌드 + GitHub Release 게시

```bash
npm run release:mac
```

스크립트가 자동으로 수행하는 일:

1. 작업 트리 / 브랜치 / 버전 / 태그 사전 검증
2. `npm run build` — vite + electron-builder dmg arm64/x64
3. `release/Codi-X.Y.Z-arm64.dmg` , `release/Codi-X.Y.Z.dmg` 50 MB 이상 검사
4. `gh release create vX.Y.Z` 호출 (--notes-file로 `scripts/release-notes.template.md` 사용)
5. 두 .dmg를 같은 릴리즈에 업로드
6. 결과 URL 출력

### 5. 릴리즈 노트 다듬기 (사람)

GitHub Release 페이지에서 자동 생성된 노트를 열어 `## 변경 사항` 섹션을
실제 커밋 요약으로 채운 뒤 **Publish release** 누른다.

## 환경변수 (필요 시)

| 변수 | 효과 |
|---|---|
| `RELEASE_DRY_RUN=1` | gh 명령을 실제 호출하지 않고 echo만. 신규 워크플로우 테스트 용. |
| `RELEASE_DRAFT=1` | 릴리즈를 draft로 생성. 사람이 노트 다듬은 후 Publish. |
| `RELEASE_ALLOW_NON_MAIN=1` | main 외 브랜치에서 release 허용 (예: 핫픽스 브랜치). |
| `RELEASE_SKIP_BUILD=1` | `npm run build`를 건너뛰고 기존 release/ 폴더의 .dmg 사용. |

## 트러블슈팅

### "GitHub Release vX.Y.Z already exists"

이미 같은 버전의 릴리즈가 있다. 버전을 한 단계 더 bump하거나
(`npm run version:patch`), 실수로 만든 release면 GitHub UI에서 삭제 후
재시도.

### "Working tree has uncommitted changes"

`git status`로 미커밋 변경 확인 후 커밋 또는 stash.

### gh CLI 인증 만료

```bash
gh auth login
```

브라우저 OAuth 흐름으로 재로그인.

### 빌드 실패 시 .dmg 크기 < 50 MB

electron-builder가 native 모듈을 못 묶었을 수 있다. `release/`를 비우고
다시 시도하거나 `node_modules/`를 지우고 `npm install`부터 다시 한다.

## 다음 마일스톤

- **P2-2**: Apple Developer Program 가입 후 release-mac.sh에 서명/notarization 추가.
- **P2-3**: `electron-updater` + `publish: github` 설정으로 자동 업데이트 활성화.
