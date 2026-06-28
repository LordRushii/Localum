import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDist = __dirname.split(/[\\\/]/).includes('dist');

// Resolve to a writable location.
// In a packaged Electron app the directory containing this file is inside the
// read-only asar archive, so __dirname-based paths cannot be written to.
// main.ts sets MODEL_STORAGE_PATH (= app.getPath('userData')/qvac-models),
// and the server child-process inherits that env var, so we use the parent of
// that directory (userData root) to keep .device-preference.json alongside
// other user data rather than inside the model cache subdirectory.
function resolveConfigPath(): string {
  if (process.env.MODEL_STORAGE_PATH) {
    // userData/qvac-models -> go up one level -> userData/.device-preference.json
    return path.join(process.env.MODEL_STORAGE_PATH, '..', '.device-preference.json');
  }
  // Dev / standalone fallback: project root
  if (isDist) {
    return path.join(__dirname, '..', '..', '.device-preference.json');
  }
  return path.join(__dirname, '..', '.device-preference.json');
}

const CONFIG_PATH = resolveConfigPath();

export function getPreferredDevice(): string | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).device || null;
    }
  } catch (err: any) {
    console.error('Failed to read device preference:', err.message);
  }
  return null;
}

export function setPreferredDevice(device: string): void {
  try {
    // Ensure the parent directory exists (needed on first run)
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ device }), 'utf8');
  } catch (err: any) {
    console.error('Failed to write device preference:', err.message);
  }
}

export function isWorkerCrash(err: any): boolean {
  return err.code === 50205 || (err.message && err.message.includes('WORKER_CRASHED'));
}
