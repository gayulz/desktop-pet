# 🐾 Week 1: 보일러플레이트 + 코디 띄우기 (최종)

> Claude Code 세션 첫 작업 가이드. 프로젝트 컨텍스트는 `CLAUDE.md` 참조.

## 작업 목표

노란 레서팬더 픽셀 캐릭터 "코디"를 macOS 데스크톱에 띄우는 Electron 앱 보일러플레이트 작성.
**최종 목표는 `.dmg`로 패키징해서 정식 macOS 앱으로 배포.**

- ✅ Electron + React + TypeScript + Vite 환경 세팅
- ✅ 투명 배경 + 항상 위 + 프레임 없는 윈도우
- ✅ idle.png 표시 + CSS 통통 애니메이션
- ✅ 마우스 드래그로 위치 이동
- ✅ 우클릭으로 종료 다이얼로그
- ✅ electron-builder 패키징 설정 미리 구성

## 사전 준비

### 1. 에셋 정리 ⚠️ 중요

현재 PNG가 `/Users/focusone/workspace/assets/codi/`에 있음.
**`.dmg` 빌드 시 함께 번들링되려면 프로젝트 내부로 옮겨야 함.**

#### 워크스페이스 → 프로젝트로 복사

```bash
# 프로젝트 폴더 생성
mkdir -p ~/dev/desktop-pet/assets/codi
cd ~/dev/desktop-pet

# 워크스페이스 PNG들 복사 (원본은 백업으로 그대로 둠)
cp /Users/focusone/workspace/assets/codi/idle.png assets/codi/
cp /Users/focusone/workspace/assets/codi/walk-sheet.png assets/codi/
cp /Users/focusone/workspace/assets/codi/coding-1.png assets/codi/
cp /Users/focusone/workspace/assets/codi/coding-2.png assets/codi/
cp /Users/focusone/workspace/assets/codi/studying.png assets/codi/
cp /Users/focusone/workspace/assets/codi/ai-mode.png assets/codi/
cp /Users/focusone/workspace/assets/codi/overheated.png assets/codi/
cp /Users/focusone/workspace/assets/codi/sleeping.png assets/codi/
cp /Users/focusone/workspace/assets/codi/celebrating.png assets/codi/

# 확인
ls -la assets/codi/
```

**최종 에셋 9종**:
- idle.png, walk-sheet.png, coding-1.png, coding-2.png
- studying.png, ai-mode.png, overheated.png, sleeping.png, celebrating.png
- walk-1.png는 사용 안 함 (walk-sheet에 다 있음)

### 2. PNG 사이즈 일관성 확인

```bash
sips -g pixelWidth -g pixelHeight assets/codi/*.png
```

모든 PNG가 같은 사이즈여야 상태 전환 시 들쭉날쭉하지 않음.

### 3. Node.js 환경

```bash
node -v    # v20.x 이상
npm -v     # v10.x 이상
```

## 작업 시 사이드이펙트 미리 알림

1. **macOS 코드 서명 경고**: 개발 모드 OK, `.dmg` 빌드 시엔 우클릭 + 열기로 우회 (서명 안 했으면)
2. **투명 윈도우 검정 박스 버그**: `backgroundColor: '#00000000'`로 해결
3. **첫 `npm install` 시간**: 1~3분
4. **포트 5173 충돌**: 다른 Vite 프로젝트 종료
5. **PNG 흐릿함**: `image-rendering: pixelated` 필수
6. **에셋은 프로젝트 내부에**: 외부 경로는 빌드 시 누락됨

## 프로젝트 구조

```
desktop-pet/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml      # 패키징 설정
├── index.html
│
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   └── tsconfig.json
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   └── Codi.tsx
│   ├── styles/
│   │   └── global.css
│   └── types/
│       └── electron.d.ts
│
├── assets/
│   └── codi/                 # 9종 PNG (위 참조)
│
└── build/                    # 앱 아이콘 (Week 4에서 사용)
    └── icon.icns             # 1024x1024 macOS 아이콘
```

## 작업 순서

### Step 1: 프로젝트 초기화

```bash
cd ~/dev/desktop-pet
npm init -y
```

### Step 2: 디렉토리 구조 생성

```bash
mkdir -p electron src/components src/styles src/types build
# assets/codi/는 이미 만들어둠
```

### Step 3: 에셋 확인

```bash
ls -la assets/codi/
# idle.png 최소 1장 있어야 Week 1 시작 가능
```

### Step 4: 의존성 설치

```bash
# Runtime
npm install react react-dom

# Dev
npm install --save-dev \
  electron@^31.0.0 \
  electron-builder@^24.13.0 \
  vite@^5.3.0 \
  @vitejs/plugin-react@^4.3.0 \
  typescript@^5.5.0 \
  @types/react @types/react-dom \
  concurrently wait-on
```

### Step 5: `package.json`

```json
{
  "name": "codi",
  "version": "0.1.0",
  "description": "노란 레서팬더 데스크톱 펫",
  "author": "유우리",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "electron:compile": "tsc -p electron/tsconfig.json",
    "electron:dev": "wait-on tcp:5173 && npm run electron:compile && electron .",
    "start": "concurrently -k \"npm run dev\" \"npm run electron:dev\"",
    "build:renderer": "tsc && vite build",
    "build:electron": "tsc -p electron/tsconfig.json",
    "build": "npm run build:renderer && npm run build:electron && electron-builder",
    "build:mac": "npm run build:renderer && npm run build:electron && electron-builder --mac"
  }
}
```

### Step 6: `tsconfig.json` (Renderer)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

### Step 7: `electron/tsconfig.json` (Main)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "../dist-electron",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["./**/*.ts"]
}
```

### Step 8: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' },
  server: { port: 5173 },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@assets': resolve(__dirname, 'assets'),
    },
  },
  assetsInclude: ['**/*.png'],
});
```

### Step 9: `electron-builder.yml` ⭐ macOS 패키징 설정

```yaml
appId: com.yuwoori.codi
productName: Codi
copyright: Copyright © 2026 유우리

# 빌드 결과물
directories:
  output: release
  buildResources: build

# 포함될 파일
files:
  - dist/**/*
  - dist-electron/**/*
  - assets/**/*
  - package.json

# macOS 설정
mac:
  category: public.app-category.developer-tools
  icon: build/icon.icns
  target:
    - target: dmg
      arch:
        - arm64    # Apple Silicon
        - x64      # Intel
  # 개인용 — 서명 없이 (서명하려면 Apple Developer 가입 필요)
  identity: null
  hardenedRuntime: false
  gatekeeperAssess: false

dmg:
  title: Codi ${version}
  icon: build/icon.icns
  contents:
    - x: 130
      y: 220
      type: file
    - x: 410
      y: 220
      type: link
      path: /Applications

# 자동 업데이트 (Week 4 이후 고려)
publish: null
```

### Step 10: `electron/main.ts`

```typescript
import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';

const isDev = !app.isPackaged;
let petWindow: BrowserWindow | null = null;

function createPetWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const petSize = 220;

  petWindow = new BrowserWindow({
    width: petSize,
    height: petSize,
    x: sw - petSize - 50,
    y: sh - petSize - 50,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  petWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });

  if (isDev) {
    petWindow.loadURL('http://localhost:5173');
  } else {
    petWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  petWindow.on('closed', () => {
    petWindow = null;
  });
}

ipcMain.on('app:quit', () => {
  app.quit();
});

app.whenReady().then(() => {
  createPetWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPetWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

### Step 11: `electron/preload.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  quitApp: () => ipcRenderer.send('app:quit'),
});

export {};
```

### Step 12: `src/types/electron.d.ts`

```typescript
export interface ElectronAPI {
  quitApp: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

declare module '*.png' {
  const value: string;
  export default value;
}
```

### Step 13: `index.html`

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>Codi</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 14: `src/styles/global.css` ⭐ 픽셀 + CSS 애니메이션

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100vw;
  height: 100vh;
  background: transparent;
  overflow: hidden;
  user-select: none;
}

img {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* Week 1: idle 통통 */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.pet-idle {
  animation: bounce 1s steps(2) infinite;
}

/* Week 2~ 애니메이션 미리 정의 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  33% { transform: translateX(-3px); }
  66% { transform: translateX(3px); }
}
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
@keyframes jump {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.pet-overheated { animation: shake 0.3s steps(3) infinite; }
.pet-sleeping { animation: breathe 3s ease-in-out infinite; }
.pet-studying { animation: breathe 3s ease-in-out infinite; }
.pet-celebrating { animation: jump 0.5s steps(2) infinite; }
.pet-ai-mode { animation: float 2s ease-in-out infinite; }
```

### Step 15: `src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Step 16: `src/App.tsx`

```typescript
import Codi from './components/Codi';

function App() {
  return <Codi />;
}

export default App;
```

### Step 17: `src/components/Codi.tsx` ⭐ Week 1 핵심

```typescript
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
        // @ts-ignore - Electron 드래그
        WebkitAppRegion: 'drag',
        cursor: 'grab',
      }}
    >
      <img
        src={idleImage}
        alt="Codi"
        width={128}
        height={128}
        className="pet-idle"
        style={{
          imageRendering: 'pixelated',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
        }}
        draggable={false}
      />
    </div>
  );
};

export default Codi;
```

## 실행

### 개발 모드

```bash
npm start
```

화면 우측 하단에 코디 등장 → 통통 튀고 드래그 가능.

### 빌드 테스트 (Week 1 끝나갈 때 한 번 시도)

```bash
npm run build:mac
```

성공하면 `release/` 폴더에 `Codi-0.1.0-arm64.dmg` 같은 파일 생성.
더블클릭 → Codi 앱을 Applications로 드래그 → Launchpad에서 실행.

**서명 안 했으면**: 첫 실행 시 "확인되지 않은 개발자" 경고
- 시스템 설정 → 개인정보 보호 및 보안 → "확인 없이 열기" 클릭
- 또는 Codi.app 우클릭 → 열기 → 확인

## 검증 체크리스트

### 개발 모드
- [ ] `npm start` 실행 성공
- [ ] 화면 우측 하단에 코디 표시
- [ ] 픽셀 또렷
- [ ] 통통 애니메이션 동작
- [ ] 드래그 이동 가능
- [ ] 우클릭 종료 동작
- [ ] 다른 앱 위에 항상 떠있음

### 빌드 모드 (선택)
- [ ] `npm run build:mac` 성공
- [ ] `release/` 폴더에 `.dmg` 생성
- [ ] DMG 마운트 → Applications로 드래그 가능
- [ ] Launchpad에서 Codi 실행
- [ ] 설치된 앱이 정상 동작

## 트러블슈팅

### PNG 흐릿함
- `image-rendering: pixelated` 적용 확인
- `width/height` 명시 확인

### `Cannot find module '@assets/codi/idle.png'`
- `vite.config.ts`의 alias 확인
- `electron.d.ts`에 `declare module '*.png'` 확인
- 파일 경로 확인

### 빌드 후 앱에서 이미지 안 보임
- `electron-builder.yml`의 `files` 섹션에 `assets/**/*` 포함 확인
- `vite.config.ts`의 `base: './'` 확인 (절대 경로면 깨짐)
- 빌드된 `Codi.app/Contents/Resources/app/` 안에 assets 폴더 있는지 확인

### "확인되지 않은 개발자" 경고
- 정상 (서명 안 한 경우)
- 시스템 설정에서 허용하거나 우클릭 + 열기
- 영구 해결: Apple Developer 가입 + 서명 (연 $99)

### `.dmg` 빌드 실패
- 일반 원인: 의존성 누락, electron 버전 호환성
- `node_modules` 삭제 후 `npm install` 재실행
- `electron-builder` 최신 버전 확인

## Week 2 미리보기 (참고)

Week 2에서 추가될 핵심 코드 패턴:

```typescript
// 상태 머신 + 상태별 분기
type PetState = 'idle' | 'walking' | 'coding' | 'studying'
                | 'ai_mode' | 'overheated' | 'sleeping' | 'celebrating';

// 정지 PNG 상태들
import idleImg from '@assets/codi/idle.png';
import studyingImg from '@assets/codi/studying.png';
import aiModeImg from '@assets/codi/ai-mode.png';
import overheatedImg from '@assets/codi/overheated.png';
import sleepingImg from '@assets/codi/sleeping.png';
import celebratingImg from '@assets/codi/celebrating.png';

const staticImages: Partial<Record<PetState, string>> = {
  idle: idleImg,
  studying: studyingImg,
  ai_mode: aiModeImg,
  overheated: overheatedImg,
  sleeping: sleepingImg,
  celebrating: celebratingImg,
};

// coding은 2프레임 교체
import coding1 from '@assets/codi/coding-1.png';
import coding2 from '@assets/codi/coding-2.png';

const CodingCodi = () => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 2);
    }, 333); // 3fps (너무 빠르면 어지러움)
    return () => clearInterval(interval);
  }, []);

  return (
    <img
      src={frame === 0 ? coding1 : coding2}
      width={128}
      height={128}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

// walking은 스프라이트 시트
import walkSheet from '@assets/codi/walk-sheet.png';

const WalkingCodi = () => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, 200); // 5fps
    return () => clearInterval(interval);
  }, []);

  // walk-sheet.png 원본이 256x64 (64×4) 라고 가정
  // CSS 2배 확대 → 512x128
  return (
    <div
      style={{
        width: 128,
        height: 128,
        backgroundImage: `url(${walkSheet})`,
        backgroundSize: '512px 128px',
        backgroundPosition: `-${frame * 128}px 0px`,
        imageRendering: 'pixelated',
      }}
    />
  );
};
```

## Week 4 패키징 가이드 (참고)

### 앱 아이콘 만들기

코디 일러스트를 `.icns` 형식으로 변환:

```bash
# 1024x1024 PNG 준비 (코디 idle 확대 또는 새로 제작)
# iconutil 사용 또는 https://cloudconvert.com/png-to-icns
```

`build/icon.icns`에 배치 → `electron-builder.yml`에서 자동 참조.

### 빌드 실행

```bash
npm run build:mac
```

결과물: `release/Codi-0.1.0-arm64.dmg` (Apple Silicon용) 또는 universal binary.

### 배포 (선택)

GitHub Releases 활용:

```bash
# GitHub에 코드 푸시 후
gh release create v0.1.0 release/Codi-*.dmg --title "Codi v0.1.0"
```

다른 맥에서 다운로드 → 설치 → Launchpad에서 코디 실행 ✨
