
# 🔥 LOCALUM — YOUR MACHINE. YOUR MIND. YOUR ART. 🔥

```
██╗      ██████╗  ██████╗ █████╗ ██╗      ██╗   ██╗███╗   ███╗
██║     ██╔═══██╗██╔════╝██╔══██╗██║      ██║   ██║████╗ ████║
██║     ██║   ██║██║     ███████║██║      ██║   ██║██╔████╔██║
██║     ██║   ██║██║     ██╔══██║██║      ██║   ██║██║╚██╔╝██║
███████╗╚██████╔╝╚██████╗██║  ██║███████╗ ╚██████╔╝██║ ╚═╝ ██║
╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝  ╚═════╝ ╚═╝     ╚═╝
```

### *The AI Image Generator That Lives Inside Your Iron, Not Some Silicon Valley Server Farm.*

[![Built with QVAC SDK](https://img.shields.io/badge/Powered%20By-QVAC%20SDK-D98E3F?style=for-the-badge)](https://qvac.dev)
[![Electron 42](https://img.shields.io/badge/Desktop-Electron%2042-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React 19](https://img.shields.io/badge/UI-React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 6](https://img.shields.io/badge/Types-TypeScript%206-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Socket.IO 4](https://img.shields.io/badge/Realtime-Socket.IO%204-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

> *"The cloud is just someone else's computer. Why trust it with your creativity?"*

---

## 🤯 What THE HECK Is Localum?

Localum is a **fully offline, 100% private, zero-cloud, runs-on-YOUR-machine** AI image generator wrapped in a beautiful desktop app. No subscriptions. No API keys. No *"your image data is used to train our next model"* nightmares.

You type a prompt. Your own GPU (or CPU if you're a patient legend) **melts silicon into art**. The image appears on your screen. That's it. That's the whole pipeline. No bytes leave your house.

**It's Stable Diffusion. On your box. With a slick dark UI. And a glowing amber scan line. Because aesthetics.**

---

## 🧠 The Architecture That Slaps

```
┌─────────────────────────────────────────────────────────────────────┐
│                         YOUR MACHINE                                │
│                                                                     │
│  ┌──────────────────┐    WebSocket      ┌───────────────────────┐  │
│  │   React 19 UI    │◄──────────────────►│  Express + Socket.IO  │  │
│  │  (Vite + TS)     │   (localhost:3000) │   Server  (Node.js)   │  │
│  │                  │                   │                         │  │
│  │  ● Prompt Input  │                   │  ┌─────────────────┐   │  │
│  │  ● Aspect Ratio  │                   │  │  Model Manager  │   │  │
│  │  ● GPU/CPU Toggle│                   │  │  (@qvac/sdk)    │   │  │
│  │  ● Live Progress │                   │  └────────┬────────┘   │  │
│  │  ● Scan Line FX  │                   │           │             │  │
│  └──────────────────┘                   │  ┌────────▼────────┐   │  │
│          ▲                              │  │ Diffusion Svc   │   │  │
│          │                             │  │ SD v2.1 1B Q8_0 │   │  │
│  ┌───────┴──────────┐                  │  │ 30 steps, cfg7.5│   │  │
│  │  Electron Shell  │                  │  └─────────────────┘   │  │
│  │  (BrowserWindow) │                  └───────────────────────┘  │
│  │  Health Polling  │                                              │
│  │  Graceful Kill   │             GPU ──────────────────────► 🎨  │
│  └──────────────────┘              └──── (auto-falls to CPU!)      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Features That Go Absolutely Unhinged

### 🖥️ It's a Desktop App. A Real One.
Powered by **Electron 42**. Packaged as **NSIS installer** on Windows, **DMG** on Mac, **AppImage** on Linux. Drag it to your Applications folder. Double-click it. Use it like a normal human being. A *real app icon* and everything. `appId: com.localum.imggen`.

---

### 🧠 Stable Diffusion v2.1 1B Q8_0 — Baked Right In
The model is **Stable Diffusion v2.1 quantized to 8-bit (Q8_0)** via the `@qvac/sdk`. It downloads **once**, caches itself at `%APPDATA%\Localum\qvac-models\` (userData path), and wakes up instantly every subsequent launch. 

Your prompt is also secretly supercharged:
```
"a dog" → "a dog, photorealistic, highly detailed, cinematic lighting, 8k, sharp focus"
```
You're welcome.

---

### ⚡ GPU-First. CPU-Fallback. Zero Drama.
Localum tries your **GPU** first. If your drivers decide to have an existential crisis and the worker process self-destructs (`WORKER_CRASHED`, `RPC initialization timed out`, error code `50205`), Localum doesn't explode. It:
1. Detects the crash signature
2. Auto-switches to CPU
3. Saves preference to `.device-preference.json`
4. Reloads the model on CPU
5. Finishes your generation

Completely transparent. No lost prompts. No cryptic errors. **You can also manually toggle GPU/CPU from the UI at any time**, even mid-session. The model reloads on the new device automatically.

---

### 📡 Real-Time Everything via Socket.IO
No polling. No "check back later" button-mashing energy. Everything is **pure WebSocket push**:

| Event | Direction | What It Does |
|-------|-----------|-------------|
| `trigger-model-download` | Client → Server | Wake up the model loader |
| `model-download-progress` | Server → Client | Stream % + status while model downloads |
| `generate` | Client → Server | Fire the diffusion pipeline |
| `progress` | Server → Client | Step-by-step diffusion progress (e.g., `Denoising step 14/30...`) |
| `success` | Server → Client | Return final base64 image + seed |
| `error_event` | Server → Client | Send error message (auto-toast, 5s dismiss) |
| `set-device` | Client → Server | Switch GPU/CPU, broadcast to all clients |
| `device-preference` | Server → All Clients | Sync device state across every open window |

---

### 🎬 The Developing Tray — A Darkroom For The Digital Age
While your image generates, you don't see a boring spinner. You see:
- **Noise overlay** — pure fractal film grain SVG noise, `mix-blend-mode: overlay`, 15% opacity. Looks like a photographic darkroom developing bath.
- **Amber scan line** — a 2px glowing amber (`#D98E3F`) horizontal bar with `box-shadow` that sweeps the canvas at exactly `top: ${genProgress.percent}%`, tracking each denoising step in real time.
- **Accessibility first** — detects `prefers-reduced-motion` and disables the scan line animation automatically.

---

### 📐 Three Aspect Ratios. Zero Cropping Regrets.

| Ratio | Dimensions | Perfect For |
|-------|-----------|-------------|
| **1:1** | 512 × 512 | Portraits, Profile Pics, Square Art |
| **16:9** | 768 × 448 | Wallpapers, Cinematic Landscapes |
| **9:16** | 448 × 768 | Mobile Wallpapers, Stories, Posters |

The canvas aspect ratio updates live in the UI using CSS `aspect-ratio`. No re-render lag. No flash of wrong content.

---

### 💾 One-Click PNG Download
Generated something absolutely unhinged? Hit the `↓ Download` button (bottom-right of canvas). It saves as `generated-{Date.now()}.png`. Timestamped. Clean. No screenshotting your own app like an animal.

---

### 🏗️ The Server Startup Ceremony (That You Never See)
When you launch Localum, the Electron main process runs this entire orchestration invisibly:

1. **Checks port 3000** — if a server is already there (dev mode), skip spawn
2. **Forks a child process** with the compiled `server.js`, passing `MODEL_STORAGE_PATH` via env
3. **Health-polls `/health` every 200ms for up to 15 seconds** (75 attempts) — not the raw port, the actual `/health` Express route that confirms Express is fully initialized
4. **On failure** — shows a native OS error dialog with the actual last 2KB of server stderr so you know EXACTLY what went wrong. No "something went wrong" vagueness.
5. **On success** — opens the `BrowserWindow` and you see the UI
6. **On quit** — sends `SIGTERM` for graceful shutdown, waits up to 8 seconds, then force-kills

---

### 🎨 The UI Is Dripping With Atmosphere
- **IBM Plex Mono** — for brand name, labels, status bar (that terminal hacker energy)
- **IBM Plex Sans** — for readable body text  
- **Background** `#15120F` — not generic black, a *dark espresso brown*
- **Amber accent** `#D98E3F` — warm, premium, aged whiskey in a glass
- **Muted steel** `#5C7A8A` — for when things are quiet
- **Dot-grid canvas** — the developing tray has a `radial-gradient` dot grid background so you know it's empty and waiting for your vision
- **Responsive** — collapses to vertical mobile layout under 768px like a well-behaved adult

---

## 🔧 Tech Stack — The Full Roster

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| **Desktop Shell** | Electron | 42 | Cross-platform native app with full OS integration |
| **UI Framework** | React + Vite | 19 / 8 | Bleeding edge React, zero-config HMR |
| **Language** | TypeScript | 6 | Full-stack type safety, frontend AND backend |
| **Styling** | Vanilla CSS | — | Zero runtime overhead, full control |
| **Fonts** | IBM Plex Mono/Sans | — | That premium terminal/editorial vibe |
| **Backend** | Express | 5 | Lightweight REST + static file server |
| **Real-time** | Socket.IO | 4.8 | Bidirectional WebSocket event streaming |
| **AI Engine** | `@qvac/sdk` | ^0.13.5 | Local on-device model inference runtime |
| **AI Model** | SD v2.1 1B Q8_0 | — | Quantized Stable Diffusion, runs on consumer hardware |
| **Package Manager** | pnpm | 10.26 | Fast, disk-efficient monorepo management |
| **Linter** | oxlint | 1.69 | Rust-speed JavaScript/TypeScript linting |
| **Native Runtime** | bare-runtime-win32-x64 | — | Windows-native model execution layer |
| **Bundler** | electron-builder | 26 | Packages into NSIS/DMG/AppImage installers |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- pnpm 10.26+
- A GPU (optional but *deeply* recommended for your patience and mental health)

### Development Mode

```bash
# Install root dependencies
pnpm install

# Install client dependencies
cd client && pnpm install && cd ..

# Run everything: server + Vite + Electron (all hot-reloading)
pnpm run electron:dev
```

What spins up concurrently:
- 🔴 `tsx watch server.ts` — Express/Socket.IO backend with file-watch hot-reload
- 🟡 `vite` — React UI dev server at `http://localhost:5173`
- 🔵 `tsc -p tsconfig.electron.json -w` — TypeScript watcher for Electron main process
- 🟢 `electron .` — Desktop window (waits for Vite + server to be healthy via `wait-on`)

### Build for Distribution

```bash
pnpm run electron:build
```

This runs: `tsc` (server) → `vite build` (React) → `tsc` (Electron) → `electron-builder` (package).

Output in `/release/`:
- **Windows**: `.exe` (NSIS installer)
- **macOS**: `.dmg`
- **Linux**: `.AppImage`

---

## 📁 Project Structure

```
qvac-image-gen/
│
├── server.ts                         # Express + Socket.IO server (the brain)
│
├── src/
│   ├── modelManager.ts               # QVAC SDK: load, cache, health-check, reset
│   ├── diffusionService.ts           # Run diffusion: steps, cfg_scale, dimensions, buffers
│   └── deviceFallback.ts             # GPU/CPU preference file I/O + crash signature detection
│
├── client/
│   ├── electron/
│   │   ├── main.ts                   # Electron main: BrowserWindow, child proc, health poll
│   │   └── preload.ts                # Context bridge (contextIsolation enabled, nodeIntegration off)
│   │
│   └── src/
│       ├── App.tsx                   # Root React component: all UI state + render
│       ├── index.css                 # Full design system: tokens, layout, animations
│       ├── App.css                   # Legacy component styles
│       └── hooks/
│           └── useImageGenerator.ts  # Socket.IO hook: connect, emit, listen, state
│
├── package.json                      # Root monorepo: scripts + server dependencies
├── client/package.json               # Client: React deps + electron-builder config
└── .device-preference.json           # Persisted GPU/CPU preference (auto-created)
```

---

## 🎭 The Philosophy: Why This Exists

Localum exists because AI image generation shouldn't require:
- ~~A credit card~~
- ~~An internet connection~~  
- ~~Trust that some company won't scrape your prompts~~
- ~~A monthly subscription that dies when the startup pivots~~
- ~~"Sorry, our servers are busy"~~
- ~~"You've used your 10 free generations this month"~~

Your creativity is **local**. Your data is **yours**. Your GPU is a *weapon* — point it at pixels.

> **Localum** = *Local* + *Lumen* (Latin for light).  
> Light. Generated. Locally. On your machine. By your hardware. For your eyes only.

---

## 🔮 Deep Dive: What `@qvac/sdk` Does

The SDK is the secret sauce — a native inference runtime that:
- Downloads quantized model weights (`SD_V2_1_1B_Q8_0`) and caches them
- Runs inference inside a **worker subprocess** (isolated, crash-recoverable)
- Exposes a clean async API: `loadModel()`, `diffusion()`, `getLoadedModelInfo()`, `close()`
- Streams denoising progress as an **async iterable** (`for await` over `progressStream`)
- Returns raw pixel `Buffer[]` that gets base64-encoded to a PNG data URL

The complete generation pipeline in ~15 lines:

```typescript
const { progressStream, outputs, stats } = diffusion({
  modelId, prompt, negative_prompt,
  width: 512, height: 512,
  cfg_scale: 7.5,
  steps: 30
});

for await (const { step, totalSteps } of progressStream) {
  const percent = Math.round((step / totalSteps) * 100);
  onProgress(percent, `Denoising step ${step}/${totalSteps}...`);
}

const [buffer] = await outputs;
const dataUrl = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
const { seed } = await stats; // The exact seed used — reproducible!
```

---

## 🛡️ Privacy By Design

| ✅ What Localum DOES | ❌ What Localum NEVER Does |
|---------------------|--------------------------|
| Runs 100% on your hardware | Send prompts to any remote server |
| Caches models in your `userData` dir | Upload generated images anywhere |
| Persists device preference as local JSON | Call home for analytics or telemetry |
| Works fully offline after first model download | Require account creation or login |
| Open, auditable TypeScript source | Use opaque black-box cloud APIs |

---

## 💥 Known Behaviors That Are Actually Features

| Behavior | What Actually Happens |
|----------|----------------------|
| **GPU Worker Crash** | Auto-detected by error code `50205` / message patterns. Silently falls back to CPU, reloads model, continues generation. |
| **"Cannot Set New Job"** | Pipeline got jammed. Model state is reset, error toast shown, ready for clean next attempt immediately. |
| **Spam-clicking Download** | `isLoading` guard prevents duplicate model load requests. Current progress is streamed instead. |
| **Auto Negative Prompt** | Every generation includes `blurry, low quality, deformed, extra limbs, watermark, text, bad anatomy, ugly`. You don't need to type it. |
| **Prompt Auto-Enhance** | Appends `, photorealistic, highly detailed, cinematic lighting, 8k, sharp focus` to every prompt. Silently. Generously. |
| **Seed in Response** | Every `success` event returns the `seed` used. Reproducible generations are possible. |

---

## ⚙️ Configuration Reference

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `MODEL_STORAGE_PATH` | `~/.localum/models` | Where model weights are cached |
| `PORT` | `3000` | Express server port |
| `FORCE_CPU` | unset | Set to any value to force CPU inference regardless of preference |
| `NODE_ENV` | `production` | Set to `development` to enable Electron DevTools |

---

## 🌑 Status Bar Reference

The monospace status bar at the bottom of the canvas shows your current system state:

| Status | Meaning |
|--------|---------|
| `DOWNLOADING MODEL... Downloading... (42.3%)` | Model is being fetched and cached |
| `DIFFUSION INITIALIZING` | About to start generating |
| `RUNNING DIFFUSION — Denoising step 14/30...` | Active generation, real step count |
| `RUNNING DIFFUSION (CPU) — Denoising step 8/30...` | Same, but on CPU fallback |
| `CPU FALLBACK` | GPU crashed, switched to CPU |
| `READY` | Image generated successfully |
| `SYSTEM IDLE` | Waiting for your prompt |

---

<div align="center">

---

## 🔥 Dark. Local. Yours.

```
LOCALUM v1.0.0
════════════════════════════════════
STATUS ............... SYSTEM IDLE
DEVICE ............... GPU
MODEL .... SD_V2_1_1B_Q8_0 LOADED
PRIVACY .............. ABSOLUTE
CLOUD CALLS .......... 0
════════════════════════════════════
```

*Built for the paranoid, the creative, and the ones who believe their GPU deserves a real job.*

**No clouds were consulted in the making of your images.**

</div>
