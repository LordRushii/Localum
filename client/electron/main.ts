import { app, BrowserWindow, dialog } from 'electron';
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

// ── Diagnostics helpers ──────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[Electron] ${new Date().toISOString()} ${msg}`);
}
function logErr(msg: string) {
  console.error(`[Electron] ${new Date().toISOString()} ${msg}`);
}

// ── Health check ─────────────────────────────────────────────────────────────
// Hits the dedicated /health endpoint added to server.ts so that we only
// proceed once the Express app is fully initialised (not just port-open).
function checkHealth(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// Poll /health every 200 ms for up to 15 seconds (75 attempts).
async function waitForServer(
  port: number,
  intervalMs = 200,
  maxAttempts = 75
): Promise<{ ready: boolean; attempts: number }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = await checkHealth(port);
    if (ok) return { ready: true, attempts: attempt };
    // Log every 5th attempt to reduce noise while still being visible
    if (attempt % 5 === 0) {
      log(`Waiting for backend /health on port ${port}... (attempt ${attempt}/${maxAttempts})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { ready: false, attempts: maxAttempts };
}

function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '..', 'public', 'logo.png')
    : path.join(__dirname, '..', 'dist', 'logo.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
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
  // Derive the persistent, writable user-data path for model storage.
  // This is passed to the server process via env so modelManager.ts can
  // forward it to @qvac/sdk as `modelCacheDir`.
  const userDataPath = app.getPath('userData');
  const modelStoragePath = path.join(userDataPath, 'qvac-models');

  log(`App userData path : ${userDataPath}`);
  log(`Model storage path: ${modelStoragePath}`);

  // Check if a server is already running (e.g. in dev mode started separately)
  const alreadyRunning = await checkHealth(PORT);

  if (alreadyRunning) {
    log(`Backend server already running and healthy on port ${PORT}.`);
  } else {
    log(`Backend server not running. Spawning...`);

    let serverPath: string;
    if (isDev) {
      serverPath = path.join(__dirname, '..', '..', 'server.ts');
    } else {
      serverPath = path.join(__dirname, '..', 'dist-server', 'server.js');
    }

    log(`Server script path: ${serverPath}`);

    // Buffer stderr so we can display it in an error dialog if startup fails.
    let stderrBuffer = '';

    const serverEnv = {
      ...process.env,
      HOME: userDataPath,
      USERPROFILE: userDataPath,
      PORT: String(PORT),
      // Key: tell server.ts / modelManager.ts where to store model files.
      MODEL_STORAGE_PATH: modelStoragePath,
    };

    const spawnStart = Date.now();

    if (isDev) {
      const rootDir = path.join(__dirname, '..', '..');
      const tsxBin = process.platform === 'win32'
        ? path.join(rootDir, 'node_modules', '.bin', 'tsx.cmd')
        : path.join(rootDir, 'node_modules', '.bin', 'tsx');

      const { spawn } = await import('child_process');
      serverProcess = spawn(tsxBin, [serverPath], {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: serverEnv,
      });
    } else {
      serverProcess = fork(serverPath, [], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: serverEnv,
      });
    }

    log(`Server process spawned (PID: ${serverProcess.pid}) in ${Date.now() - spawnStart}ms`);

    serverProcess.stdout?.on('data', (data: any) => {
      process.stdout.write(`[Server stdout] ${data.toString()}`);
    });

    serverProcess.stderr?.on('data', (data: any) => {
      const text = data.toString();
      stderrBuffer += text;
      process.stderr.write(`[Server stderr] ${text}`);
    });

    serverProcess.on('close', (code: number) => {
      log(`Server process exited with code ${code}`);
      serverProcess = null;
    });

    // ── Wait for /health ───────────────────────────────────────────────────
    const healthStart = Date.now();
    const { ready, attempts } = await waitForServer(PORT);

    if (ready) {
      log(`Health check passed after ${attempts} attempt(s) (${Date.now() - healthStart}ms)`);
    } else {
      logErr(`Health check FAILED after ${attempts} attempt(s) (${Date.now() - healthStart}ms)`);

      // Show a human-readable error dialog with the actual server stderr output
      // instead of silently opening a broken renderer.
      const stderrSnippet = stderrBuffer.trim()
        ? stderrBuffer.trim().slice(-2000) // last 2 KB to keep dialog manageable
        : '(no stderr output captured)';

      dialog.showErrorBox(
        'Localum — Server Failed to Start',
        `The backend server did not respond on port ${PORT} within 15 seconds.\n\n` +
        `Server path: ${serverPath}\n` +
        `Model storage: ${modelStoragePath}\n\n` +
        `--- Server stderr (last 2 KB) ---\n${stderrSnippet}`
      );

      app.quit();
      return;
    }
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
    log('App is quitting — terminating backend server gracefully...');

    const quitTimeout = setTimeout(() => {
      logErr('Backend server shutdown timed out, force quitting.');
      app.quit();
    }, 8000);

    serverProcess.on('exit', () => {
      clearTimeout(quitTimeout);
      log('Backend server terminated. Quitting app.');
      app.quit();
    });

    // Send SIGTERM to let server run its graceful shutdown logic
    serverProcess.kill('SIGTERM');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
