import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { ensureModelLoaded, getModelState, resetModelState } from './src/modelManager.js';
import { runDiffusion } from './src/diffusionService.js';
import { isWorkerCrash, setPreferredDevice, getPreferredDevice } from './src/deviceFallback.js';


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

app.use(express.json());

const clientBuildPath = __dirname.endsWith('dist')
  ? path.join(__dirname, '..', 'client', 'dist')
  : path.join(__dirname, 'client', 'dist');

app.use(express.static(clientBuildPath));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current preferred device to client on connection
  socket.emit('device-preference', getPreferredDevice() || 'gpu');

  socket.on('set-device', async (device: 'gpu' | 'cpu') => {
    if (device !== 'gpu' && device !== 'cpu') return;

    console.log(`[Server] Setting preferred device to ${device}`);
    setPreferredDevice(device);

    // Broadcast updated preference to all clients
    io.emit('device-preference', device);

    // Reset model state since device config changed
    await resetModelState();

    // Automatically trigger model reload on the new device
    io.emit('model-download-progress', { percent: 0, status: `Re-initializing model on ${device.toUpperCase()}...` });
    try {
      const modelId = await ensureModelLoaded((percent, status) => {
        io.emit('model-download-progress', { percent: Math.round(percent), status });
      });
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

    try {
      const modelId = await ensureModelLoaded((percent, status) => {
        io.emit('model-download-progress', { percent: Math.round(percent), status });
      });
      if (modelId) {
        io.emit('model-download-progress', { percent: 100, status: 'Model fully loaded locally.' });
      }
    } catch (err: any) {
      io.emit('model-download-progress', { percent: 0, status: `Failed to load model: ${err.message}` });
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
        try {
          const modelId = await ensureModelLoaded((p, s) => io.emit('model-download-progress', { percent: Math.round(p), status: s }));
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
  console.log(`Server running at http://localhost:${PORT}`);
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
