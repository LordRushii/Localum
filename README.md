# LOCALUM


```
██╗      ██████╗  ██████╗ █████╗ ██╗      ██╗   ██╗███╗   ███╗
██║     ██╔═══██╗██╔════╝██╔══██╗██║      ██║   ██║████╗ ████║
██║     ██║   ██║██║     ███████║██║      ██║   ██║██╔████╔██║
██║     ██║   ██║██║     ██╔══██║██║      ██║   ██║██║╚██╔╝██║
███████╗╚██████╔╝╚██████╗██║  ██║███████╗ ╚██████╔╝██║ ╚═╝ ██║
╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝  ╚═════╝ ╚═╝     ╚═╝
```

**The AI image generator that runs entirely on your machine. No cloud. No subscriptions. No data leaving your box.**

[![Electron 42](https://img.shields.io/badge/Desktop-Electron%2042-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React 19](https://img.shields.io/badge/UI-React%2019-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![QVAC SDK](https://img.shields.io/badge/Powered%20by-QVAC%20SDK-D98E3F?style=flat-square)](https://qvac.dev)

> *"The cloud is just someone else's computer. Why trust it with your creativity?"*

---

## What Is Localum?

Localum (`Local + Lumen`, Latin for light) is a fully offline AI image generator wrapped in a native desktop app. You type a prompt, your GPU (or CPU) runs Stable Diffusion locally, and the image appears — no bytes leave your machine.

**Localum = Local + Lumen.** Light. Generated. On your hardware. For your eyes only.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        YOUR MACHINE                         │
│                                                             │
│  ┌──────────────────┐  WebSocket   ┌─────────────────────┐ │
│  │   React 19 UI    │◄────────────►│ Express + Socket.IO │ │
│  │   (Vite + TS)    │ localhost:3000│     (Node.js)       │ │
│  │                  │              │                     │ │
│  │  Prompt Input    │              │  ┌───────────────┐  │ │
│  │  Aspect Ratio    │              │  │ Model Manager │  │ │
│  │  GPU/CPU Toggle  │              │  │  (@qvac/sdk)  │  │ │
│  │  Live Progress   │              │  └──────┬────────┘  │ │
│  │  Scan Line FX    │              │         │            │ │
│  └──────────────────┘              │  ┌──────▼────────┐  │ │
│          ▲                         │  │ Diffusion Svc │  │ │
│          │                         │  │ SD v2.1 Q8_0  │  │ │
│  ┌───────┴──────────┐              │  │ 30 steps      │  │ │
│  │  Electron Shell  │              │  └───────────────┘  │ │
│  │  Health Polling  │              └─────────────────────┘ │
│  │  Child Process   │                                       │
│  └──────────────────┘        GPU ──────────────────► Image │
│                               └── (auto-falls to CPU)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

### Fully Offline Stable Diffusion
Uses **SD v2.1 1B Q8_0** via `@qvac/sdk`. The model downloads once, caches to your user data folder, and loads instantly on every subsequent launch. Every prompt is silently enhanced:

```
"a dog" → "a dog, photorealistic, highly detailed, cinematic lighting, 8k, sharp focus"
```

A negative prompt (`blurry, low quality, deformed, extra limbs...`) is also auto-injected on every generation.

### GPU-First with Automatic CPU Fallback
Localum targets your GPU by default. If the worker process crashes (`WORKER_CRASHED`, `RPC initialization timed out`, error `50205`), it automatically falls back to CPU, saves the preference, reloads the model, and retries — without losing your prompt. You can also switch devices manually from the UI at any time.

### Real-Time Progress via Socket.IO
Everything is WebSocket push — no polling:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `trigger-model-download` | Client → Server | Start model loading |
| `model-download-progress` | Server → Client | Stream download % |
| `generate` | Client → Server | Start diffusion |
| `progress` | Server → Client | Per-step diffusion progress |
| `success` | Server → Client | Final base64 image + seed |
| `error_event` | Server → Client | Error toast (auto-dismiss 5s) |
| `set-device` | Client → Server | Switch GPU/CPU |
| `device-preference` | Server → All | Sync device state to all clients |

### The Developing Tray
While generating, the canvas shows a film-grain noise overlay and an amber scan line that tracks real diffusion progress (`top: ${percent}%`). Respects `prefers-reduced-motion` — scan line is disabled for accessibility.

### Aspect Ratios

| Ratio | Dimensions | Use Case |
|-------|-----------|---------|
| 1:1 | 512 × 512 | Portraits, Profile Pics |
| 16:9 | 768 × 448 | Wallpapers, Landscapes |
| 9:16 | 448 × 768 | Mobile, Stories, Posters |

### Packaged Desktop App
Distributed as a native installer: **NSIS** on Windows, **DMG** on macOS, **AppImage** on Linux. The Electron main process health-polls `/health` every 200ms (up to 15s / 75 attempts) before opening the window. On failure it shows a native error dialog with the last 2KB of server stderr so you know exactly what went wrong.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 42 |
| UI | React 19 + Vite 8 |
| Language | TypeScript 6 (full-stack) |
| Styling | Vanilla CSS + IBM Plex Fonts |
| Backend | Express 5 + Node.js |
| Real-time | Socket.IO 4.8 |
| AI Engine | `@qvac/sdk` ^0.13.5 |
| AI Model | Stable Diffusion v2.1 1B Q8_0 |
| Packaging | electron-builder 26 |
| Linter | oxlint |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 10.26+
- A GPU (optional but highly recommended)

### Development

```bash
pnpm install
cd client && pnpm install && cd ..
pnpm run electron:dev
```

Starts concurrently: Express server (tsx watch) + Vite dev server + Electron with hot-reload.

### Build

```bash
pnpm run electron:build
```

Output lands in `/release/` as a platform-native installer.

---

## Project Structure

```
qvac-image-gen/
├── server.ts                        # Express + Socket.IO server
├── src/
│   ├── modelManager.ts              # Model lifecycle: load, cache, reset
│   ├── diffusionService.ts          # Diffusion runner: steps, dimensions, buffers
│   └── deviceFallback.ts            # GPU/CPU preference + crash detection
└── client/
    ├── electron/
    │   ├── main.ts                  # BrowserWindow, child process, health poll
    │   └── preload.ts               # Context bridge
    └── src/
        ├── App.tsx                  # Root React component
        ├── index.css                # Design system: tokens, layout, animations
        └── hooks/
            └── useImageGenerator.ts # Socket.IO hook: connect, emit, listen
```

---

## Privacy

| Localum Does | Localum Never Does |
|-------------|-------------------|
| Runs 100% on your hardware | Send prompts to any remote server |
| Caches models in your `userData` | Upload generated images |
| Works fully offline after first download | Require login or account |
| Open, auditable TypeScript source | Call home for analytics |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_STORAGE_PATH` | `~/.localum/models` | Model weights cache location |
| `PORT` | `3000` | Express server port |
| `FORCE_CPU` | unset | Force CPU inference regardless of preference |

---

## The Philosophy

Localum exists because AI image generation shouldn't require:

- A credit card
- An internet connection
- Trust that some company won't scrape your prompts
- A monthly subscription that dies when the startup pivots
- *"Sorry, our servers are busy"*
- *"You've used your 10 free generations this month"*

Your creativity is **local**. Your data is **yours**. Your GPU is a weapon — point it at pixels.

> **Localum** = *Local* + *Lumen* (Latin for light).
> Light. Generated. Locally. On your machine. By your hardware. For your eyes only.

---

```
LOCALUM v1.0.0
════════════════════════════════════
STATUS ............... SYSTEM IDLE
DEVICE ............... GPU
MODEL .... SD_V2_1_1B_Q8_0 LOADED
CLOUD CALLS .......... 0
════════════════════════════════════
```

*Built for the paranoid, the creative, and the ones who believe their GPU deserves a real job.*
*No clouds were consulted in the making of your images.*

---

Built by **LordRushii**
