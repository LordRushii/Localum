import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;

function isServerRunning(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built static React client
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startBackendAndCreateWindow() {
  const alreadyRunning = await isServerRunning(PORT);
  
  if (alreadyRunning) {
    console.log(`[Electron] Backend server is already running on port ${PORT}.`);
  } else {
    console.log(`[Electron] Backend server not running. Spawning it...`);
    
    let serverPath: string;
    if (isDev) {
      // In dev, the server.ts is at the root directory (parent of client/)
      serverPath = path.join(__dirname, '..', '..', 'server.ts');
    } else {
      // In production, server is compiled to dist-server/server.js
      serverPath = path.join(__dirname, '..', 'dist-server', 'server.js');
      if (serverPath.includes('app.asar')) {
        serverPath = serverPath.replace('app.asar', 'app.asar.unpacked');
      }
    }

    const userDataPath = app.getPath('userData');
    
    if (isDev) {
      // For development, if we need to spawn it ourselves, run tsx
      const rootDir = path.join(__dirname, '..', '..');
      const tsxBin = process.platform === 'win32' 
        ? path.join(rootDir, 'node_modules', '.bin', 'tsx.cmd')
        : path.join(rootDir, 'node_modules', '.bin', 'tsx');

      const { spawn } = await import('child_process');
      serverProcess = spawn(tsxBin, [serverPath], {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HOME: userDataPath,
          USERPROFILE: userDataPath,
          PORT: String(PORT),
        }
      });
    } else {
      // In production, fork the compiled JS server script
      serverProcess = fork(serverPath, [], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          HOME: userDataPath,
          USERPROFILE: userDataPath,
          PORT: String(PORT),
        }
      });
    }

    serverProcess.stdout?.on('data', (data: any) => {
      console.log(`[Server stdout] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on('data', (data: any) => {
      console.error(`[Server stderr] ${data.toString().trim()}`);
    });

    serverProcess.on('close', (code: number) => {
      console.log(`[Server] Process exited with code ${code}`);
      serverProcess = null;
    });
  }

  // Poll server port until it's active before opening window
  let attempts = 0;
  const maxAttempts = 60; // Wait up to 60 seconds
  let serverReady = false;

  while (attempts < maxAttempts) {
    const isReady = await isServerRunning(PORT);
    if (isReady) {
      serverReady = true;
      break;
    }
    console.log(`[Electron] Waiting for backend server to listen on port ${PORT}... (attempt ${attempts + 1}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  if (!serverReady) {
    console.error('[Electron] Backend server failed to start or listen on port.');
  }

  createWindow();
}

app.whenReady().then(() => {
  startBackendAndCreateWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

let isQuitting = false;
app.on('before-quit', (e) => {
  if (serverProcess && !isQuitting) {
    e.preventDefault();
    isQuitting = true;
    console.log('[Electron] App is quitting. Terminating backend server gracefully...');

    const quitTimeout = setTimeout(() => {
      console.error('[Electron] Backend server shutdown timed out, force quitting.');
      app.quit();
    }, 8000);

    serverProcess.on('exit', () => {
      clearTimeout(quitTimeout);
      console.log('[Electron] Backend server terminated successfully. Quitting App.');
      app.quit();
    });

    // Send SIGTERM to let server run its graceful shutdown logic (closing socket.io and model)
    serverProcess.kill('SIGTERM');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
