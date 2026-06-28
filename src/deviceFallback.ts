import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDist = __dirname.split(/[\\/]/).includes('dist');
const CONFIG_PATH = isDist
  ? path.join(__dirname, '..', '..', '.device-preference.json')
  : path.join(__dirname, '..', '.device-preference.json');

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
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ device }), 'utf8');
  } catch (err: any) {
    console.error('Failed to write device preference:', err.message);
  }
}

export function isWorkerCrash(err: any): boolean {
  return err.code === 50205 || (err.message && err.message.includes('WORKER_CRASHED'));
}
