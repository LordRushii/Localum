import express from 'express';
import path from 'path';
import os from 'os';
import http from 'http';
import fs from 'fs';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { ensureModelLoaded, getModelState, resetModelState, MODEL_CONSTANTS } from './src/modelManager.js';
import { runDiffusion } from './src/diffusionService.js';
import { isWorkerCrash, setPreferredDevice, getPreferredDevice } from './src/deviceFallback.js';
import { getSystemSpecs } from './src/systemInfo.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Resolve a persistent, writable model storage directory.
// In a packaged Electron app, main.ts sets MODEL_STORAGE_PATH to
// path.join(app.getPath('userData'), 'qvac-models') via the child process env.
// In dev / standalone mode we fall back to HOME/.localum/models.
const MODEL_STORAGE_PATH = process.env.MODEL_STORAGE_PATH
  || path.join(process.env.HOME || process.env.USERPROFILE || os.homedir(), '.localum', 'models');

console.log(`[Server] ${new Date().toISOString()} Starting — model storage path: ${MODEL_STORAGE_PATH}`);

// ── Model catalog ─────────────────────────────────────────────────────────────
// Each entry describes one downloadable model. `modelConst` is the SDK constant
// passed directly to ensureModelLoaded. `modelId` is the filename on disk.
// Recommendation thresholds are conservative estimates from empirical testing.
export interface ModelEntry {
  key: string;
  label: string;
  architecture: string;
  description: string;
  modelConst: any;
  modelId: string;         // filename inside MODEL_STORAGE_PATH
  sizeGb: number;
  params: string;
  quantization: string;
  vramRequiredGb: number;  // minimum GPU VRAM to run comfortably
  ramRequiredGb: number;   // minimum system RAM
  cpuFriendly: boolean;    // usable on CPU without extreme slowdown
  badge?: string;          // e.g. "Fastest" / "Best Quality" / "Balanced"
}

export const MODEL_CATALOG: ModelEntry[] = [
  {
    key: 'sd21-q4',
    label: 'SD v2.1 Q4',
    architecture: 'Stable Diffusion 2.1',
    description: 'Smallest & fastest. Great for quick iterations on CPU or low-end GPU. Slightly lower fidelity due to Q4 compression.',
    modelConst: MODEL_CONSTANTS.SD_V2_1_1B_Q4_0,
    modelId: 'stable-diffusion-v2-1-Q4_0.gguf',
    sizeGb: 2.0,
    params: '1B',
    quantization: 'Q4_0',
    vramRequiredGb: 2,
    ramRequiredGb: 4,
    cpuFriendly: true,
    badge: 'Fastest',
  },
  {
    key: 'sd21-q8',
    label: 'SD v2.1 Q8',
    architecture: 'Stable Diffusion 2.1',
    description: 'Default model. Full 8-bit precision gives excellent quality with moderate resource use. Recommended for most setups.',
    modelConst: MODEL_CONSTANTS.SD_V2_1_1B_Q8_0,
    modelId: 'stable-diffusion-v2-1-Q8_0.gguf',
    sizeGb: 2.2,
    params: '1B',
    quantization: 'Q8_0',
    vramRequiredGb: 3,
    ramRequiredGb: 6,
    cpuFriendly: true,
    badge: 'Balanced',
  },
  {
    key: 'flux-klein-q4',
    label: 'Flux.2 Klein Q4',
    architecture: 'Flux',
    description: 'Flux architecture brings modern diffusion transformer design. Q4 keeps it lean while delivering noticeably sharper outputs than SD 2.1.',
    modelConst: MODEL_CONSTANTS.FLUX_2_KLEIN_4B_Q4_0,
    modelId: 'flux-2-klein-4b-Q4_0.gguf',
    sizeGb: 2.3,
    params: '4B',
    quantization: 'Q4_0',
    vramRequiredGb: 4,
    ramRequiredGb: 8,
    cpuFriendly: false,
    badge: 'Modern',
  },
  {
    key: 'flux-klein-q4km',
    label: 'Flux.2 Klein Q4_K_M',
    architecture: 'Flux',
    description: 'Flux with K-quant mixed precision. Slightly better quality than plain Q4 with minimal extra memory. A sweet spot for mid-range GPUs.',
    modelConst: MODEL_CONSTANTS.FLUX_2_KLEIN_4B_Q4_K_M,
    modelId: 'flux-2-klein-4b-Q4_K_M.gguf',
    sizeGb: 2.4,
    params: '4B',
    quantization: 'Q4_K_M',
    vramRequiredGb: 4,
    ramRequiredGb: 8,
    cpuFriendly: false,
  },
  {
    key: 'flux-klein-q6k',
    label: 'Flux.2 Klein Q6_K',
    architecture: 'Flux',
    description: 'High-precision Flux with 6-bit K-quant. Detailed textures, vibrant compositions. Needs a decent GPU.',
    modelConst: MODEL_CONSTANTS.FLUX_2_KLEIN_4B_Q6_K,
    modelId: 'flux-2-klein-4b-Q6_K.gguf',
    sizeGb: 3.2,
    params: '4B',
    quantization: 'Q6_K',
    vramRequiredGb: 5,
    ramRequiredGb: 10,
    cpuFriendly: false,
    badge: 'High Quality',
  },
  {
    key: 'sdxl-q4',
    label: 'SDXL Q4',
    architecture: 'Stable Diffusion XL',
    description: 'SDXL native resolution (1024px). Richer compositions and photorealism. Q4 compression makes it accessible on 4–6 GB VRAM GPUs.',
    modelConst: MODEL_CONSTANTS.SDXL_BASE_1_0_3B_Q4_0,
    modelId: 'stable-diffusion-xl-base-1.0-Q4_0.gguf',
    sizeGb: 3.7,
    params: '3B',
    quantization: 'Q4_0',
    vramRequiredGb: 5,
    ramRequiredGb: 10,
    cpuFriendly: false,
  },
  {
    key: 'flux-klein-q8',
    label: 'Flux.2 Klein Q8',
    architecture: 'Flux',
    description: 'Full 8-bit Flux. Stunning detail and color accuracy. Requires a capable GPU (6+ GB VRAM recommended).',
    modelConst: MODEL_CONSTANTS.FLUX_2_KLEIN_4B_Q8_0,
    modelId: 'flux-2-klein-4b-Q8_0.gguf',
    sizeGb: 4.0,
    params: '4B',
    quantization: 'Q8_0',
    vramRequiredGb: 6,
    ramRequiredGb: 12,
    cpuFriendly: false,
    badge: 'Best Quality',
  },
  {
    key: 'sdxl-q8',
    label: 'SDXL Q8',
    architecture: 'Stable Diffusion XL',
    description: 'Maximum quality SDXL at full 8-bit precision. Breathtaking results for those with a high-end GPU (8+ GB VRAM).',
    modelConst: MODEL_CONSTANTS.SDXL_BASE_1_0_3B_Q8_0,
    modelId: 'stable-diffusion-xl-base-1.0-Q8_0.gguf',
    sizeGb: 4.7,
    params: '3B',
    quantization: 'Q8_0',
    vramRequiredGb: 8,
    ramRequiredGb: 14,
    cpuFriendly: false,
  },
];

// Track which model key is currently loaded
let activeModelKey = 'sd21-q8'; // default

function getCatalogWithDiskStatus() {
  return MODEL_CATALOG.map(m => {
    const filePath = path.join(MODEL_STORAGE_PATH, m.modelId);
    const cached = fs.existsSync(filePath);
    return { ...m, modelConst: undefined, cached, active: m.key === activeModelKey };
  });
}

// ── Express setup ─────────────────────────────────────────────────────────────
app.use(express.json());

const clientBuildPath = __dirname.endsWith('dist')
  ? path.join(__dirname, '..', 'client', 'dist')
  : path.join(__dirname, 'client', 'dist');

app.use(express.static(clientBuildPath));

// ── Health check endpoint ─────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.sendStatus(200);
});

// ── System specs endpoint ─────────────────────────────────────────────────────
app.get('/api/specs', (_req, res) => {
  res.json(getSystemSpecs());
});

// ── Model catalog endpoint ────────────────────────────────────────────────────
app.get('/api/models', (_req, res) => {
  res.json(getCatalogWithDiskStatus());
});

// ── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current preferred device to client on connection
  socket.emit('device-preference', getPreferredDevice() || 'gpu');
  // Send active model key
  socket.emit('active-model', activeModelKey);

  socket.on('set-device', async (device: 'gpu' | 'cpu') => {
    if (device !== 'gpu' && device !== 'cpu') return;

    console.log(`[Server] Setting preferred device to ${device}`);
    setPreferredDevice(device);

    // Broadcast updated preference to all clients
    io.emit('device-preference', device);

    // Reset model state since device config changed
    await resetModelState();

    // Automatically trigger model reload on the new device
    const entry = MODEL_CATALOG.find(m => m.key === activeModelKey) ?? MODEL_CATALOG[1];
    io.emit('model-download-progress', { percent: 0, status: `Re-initializing model on ${device.toUpperCase()}...` });
    try {
      const modelId = await ensureModelLoaded(MODEL_STORAGE_PATH, (percent, status) => {
        io.emit('model-download-progress', { percent: Math.round(percent), status });
      }, entry.modelConst);
      if (modelId) {
        io.emit('model-download-progress', { percent: 100, status: 'Model fully loaded locally.' });
      }
    } catch (err: any) {
      io.emit('model-download-progress', { percent: 0, status: `Failed to load model: ${err.message}` });
    }
  });

  socket.on('trigger-model-download', async () => {
    const state = getModelState();
    if (state.loadedModelId) {
      socket.emit('model-download-progress', { percent: 100, status: 'Model fully loaded locally.' });
      return;
    }
    if (state.isLoading) {
      socket.emit('model-download-progress', { percent: Math.round(state.loadPercent), status: state.loadStatus });
      return;
    }

    const entry = MODEL_CATALOG.find(m => m.key === activeModelKey) ?? MODEL_CATALOG[1];

    try {
      const modelId = await ensureModelLoaded(MODEL_STORAGE_PATH, (percent, status) => {
        io.emit('model-download-progress', { percent: Math.round(percent), status });
      }, entry.modelConst);
      if (modelId) {
        io.emit('model-download-progress', { percent: 100, status: 'Model fully loaded locally.' });
      }
    } catch (err: any) {
      if (isWorkerCrash(err)) {
        // GPU worker failed to init (e.g. RPC timeout, WORKER_CRASHED) — auto-fall back to CPU.
        console.log('[Server] GPU worker failed during model load. Auto-switching to CPU...');
        setPreferredDevice('cpu');
        io.emit('device-preference', 'cpu');
        await resetModelState();
        io.emit('model-download-progress', { percent: 0, status: 'GPU init failed. Falling back to CPU...' });
        try {
          const modelId = await ensureModelLoaded(MODEL_STORAGE_PATH, (percent, status) => {
            io.emit('model-download-progress', { percent: Math.round(percent), status });
          }, entry.modelConst);
          if (modelId) {
            io.emit('model-download-progress', { percent: 100, status: 'Model fully loaded locally.' });
          }
        } catch (cpuErr: any) {
          await resetModelState();
          io.emit('model-download-progress', { percent: 0, status: `Failed to load model on CPU: ${cpuErr.message}` });
        }
      } else {
        io.emit('model-download-progress', { percent: 0, status: `Failed to load model: ${err.message}` });
      }
    }
  });

  // ── switch-model ─────────────────────────────────────────────────────────
  socket.on('switch-model', async (modelKey: string) => {
    const entry = MODEL_CATALOG.find(m => m.key === modelKey);
    if (!entry) {
      socket.emit('error_event', { message: `Unknown model key: ${modelKey}` });
      return;
    }

    console.log(`[Server] Switching to model: ${entry.label}`);
    activeModelKey = modelKey;
    io.emit('active-model', modelKey);

    await resetModelState();
    io.emit('model-download-progress', { percent: 0, status: `Loading ${entry.label}...` });

    try {
      const modelId = await ensureModelLoaded(MODEL_STORAGE_PATH, (percent, status) => {
        io.emit('model-download-progress', { percent: Math.round(percent), status });
      }, entry.modelConst);

      if (modelId) {
        io.emit('model-download-progress', { percent: 100, status: `${entry.label} loaded.` });
        io.emit('model-catalog-update', getCatalogWithDiskStatus());
      }
    } catch (err: any) {
      if (isWorkerCrash(err)) {
        setPreferredDevice('cpu');
        io.emit('device-preference', 'cpu');
        await resetModelState();
        io.emit('model-download-progress', { percent: 0, status: 'GPU init failed. Falling back to CPU...' });
        try {
          const modelId = await ensureModelLoaded(MODEL_STORAGE_PATH, (percent, status) => {
            io.emit('model-download-progress', { percent: Math.round(percent), status });
          }, entry.modelConst);
          if (modelId) {
            io.emit('model-download-progress', { percent: 100, status: `${entry.label} loaded on CPU.` });
            io.emit('model-catalog-update', getCatalogWithDiskStatus());
          }
        } catch (cpuErr: any) {
          await resetModelState();
          io.emit('model-download-progress', { percent: 0, status: `Failed: ${cpuErr.message}` });
        }
      } else {
        await resetModelState();
        io.emit('model-download-progress', { percent: 0, status: `Failed to load ${entry.label}: ${err.message}` });
      }
    }
  });

  // ── delete-model ──────────────────────────────────────────────────────────
  socket.on('delete-model', async (modelKey: string) => {
    const entry = MODEL_CATALOG.find(m => m.key === modelKey);
    if (!entry) {
      socket.emit('error_event', { message: `Unknown model key: ${modelKey}` });
      return;
    }

    // Refuse to delete the currently loaded model
    if (modelKey === activeModelKey && getModelState().loadedModelId) {
      socket.emit('error_event', { message: `Cannot delete "${entry.label}" while it is loaded. Switch to another model first.` });
      return;
    }

    const filePath = path.join(MODEL_STORAGE_PATH, entry.modelId);
    try {
      await fs.promises.unlink(filePath);
      console.log(`[Server] Deleted model file: ${filePath}`);
      io.emit('model-catalog-update', getCatalogWithDiskStatus());
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // File already gone — just refresh catalog
        io.emit('model-catalog-update', getCatalogWithDiskStatus());
      } else {
        socket.emit('error_event', { message: `Failed to delete ${entry.label}: ${err.message}` });
      }
    }
  });

  socket.on('generate', async ({ prompt, ratio }) => {
    if (!prompt?.trim()) return socket.emit('error_event', { message: 'Prompt is required' });
    const { loadedModelId } = getModelState();
    if (!loadedModelId) return socket.emit('error_event', { message: 'Model is not loaded yet' });
    try {
      socket.emit('progress', { percent: 0, status: 'Starting diffusion...', sub: 'DIFFUSION INITIALIZING' });
      const { dataUrl, seed } = await runDiffusion(loadedModelId, prompt, ratio,
        (percent, status) => socket.emit('progress', { percent, status, sub: 'RUNNING DIFFUSION' })
      );
      socket.emit('success', { url: dataUrl, prompt, seed });
    } catch (err: any) {
      if (isWorkerCrash(err)) {
        setPreferredDevice('cpu');
        io.emit('device-preference', 'cpu');
        await resetModelState(); // clear loadedModelId / process.modelId
        socket.emit('progress', { percent: 0, status: 'GPU driver crashed. Falling back to CPU...', sub: 'CPU FALLBACK' });
        const entry = MODEL_CATALOG.find(m => m.key === activeModelKey) ?? MODEL_CATALOG[1];
        try {
          const modelId = await ensureModelLoaded(MODEL_STORAGE_PATH, (p, s) => io.emit('model-download-progress', { percent: Math.round(p), status: s }), entry.modelConst);
          if (!modelId) {
            throw new Error('Model failed to load on CPU');
          }
          const { dataUrl, seed } = await runDiffusion(modelId, prompt, ratio, (p, s) =>
            socket.emit('progress', { percent: p, status: s, sub: 'RUNNING DIFFUSION (CPU)' }));
          socket.emit('success', { url: dataUrl, prompt, seed });
        } catch (cpuErr: any) {
          await resetModelState();
          socket.emit('error_event', { message: 'Image generation failed on CPU: ' + cpuErr.message });
        }
      } else {
        if (err.message && err.message.includes('Cannot set new job')) {
          await resetModelState();
        }
        socket.emit('error_event', { message: 'Image generation failed: ' + err.message });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('*any', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const activeServer = server.listen(PORT, () => {
  console.log(`[Server] ${new Date().toISOString()} Server running at http://localhost:${PORT}`);
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('Received shutdown signal. Closing server...');
  
  // Close socket.io connections first
  io.close(() => {
    console.log('Socket.io server closed.');
    
    // Close the HTTP server
    activeServer.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('Forcefully shutting down...');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
