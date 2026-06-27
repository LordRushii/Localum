import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { ensureModelLoaded, getModelState } from './src/modelManager.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

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

  socket.on('generate', async (data) => {
    /* Phase 4 */
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('*any', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
