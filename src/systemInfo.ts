import os from 'os';
import { execSync } from 'child_process';

export interface SystemSpecs {
  totalRamGb: number;
  freeRamGb: number;
  cpuCores: number;
  cpuModel: string;
  platform: string;
  arch: string;
  gpus: GpuInfo[];
  /** Best detected discrete GPU VRAM in GB (0 if unknown / integrated only) */
  primaryGpuVramGb: number;
}

export interface GpuInfo {
  name: string;
  vramGb: number;
}

function toGb(bytes: number): number {
  return Math.round((bytes / 1_073_741_824) * 10) / 10;
}

/** Try to detect GPU list on Windows via PowerShell CIM */
function detectGpusWindows(): GpuInfo[] {
  try {
    const raw = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json"',
      { timeout: 6000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const gpus = Array.isArray(parsed) ? parsed : [parsed];

    return gpus
      .map((g: any) => ({
        name: (g.Name || '').trim(),
        vramGb: toGb(g.AdapterRAM || 0)
      }))
      .filter(g => g.name.length > 0);
  } catch {
    return [];
  }
}

/** Try to detect GPU info on Linux via lspci / free */
function detectGpusLinux(): GpuInfo[] {
  try {
    const raw = execSync("lspci | grep -i 'vga\\|3d\\|display'", { timeout: 4000, stdio: ['pipe', 'pipe', 'pipe'] })
      .toString().trim();
    return raw
      .split('\n')
      .filter(Boolean)
      .map(line => ({ name: line.replace(/^.*?:\s*/, '').trim(), vramGb: 0 }));
  } catch {
    return [];
  }
}

/** Try to detect GPU on macOS via system_profiler */
function detectGpusMac(): GpuInfo[] {
  try {
    const raw = execSync(
      "system_profiler SPDisplaysDataType | grep -E 'Chipset Model|VRAM'",
      { timeout: 6000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();

    const gpus: GpuInfo[] = [];
    let currentName = '';
    for (const line of raw.split('\n')) {
      if (line.includes('Chipset Model')) {
        currentName = line.split(':')[1]?.trim() || '';
        gpus.push({ name: currentName, vramGb: 0 });
      } else if (line.includes('VRAM') && gpus.length > 0) {
        const match = line.match(/(\d+)\s*GB/i);
        if (match) gpus[gpus.length - 1].vramGb = parseInt(match[1], 10);
      }
    }
    return gpus;
  } catch {
    return [];
  }
}

/** Pick the GPU with highest VRAM — prefers discrete (skips "Intel", "UHD", "Iris" if a better one exists) */
function pickPrimaryGpu(gpus: GpuInfo[]): number {
  if (!gpus.length) return 0;

  const discreteKeywords = /nvidia|amd|radeon|geforce|quadro|arc|rx\s/i;
  const discrete = gpus.filter(g => discreteKeywords.test(g.name));

  const pool = discrete.length ? discrete : gpus;
  const best = pool.reduce((a, b) => (a.vramGb >= b.vramGb ? a : b));
  return best.vramGb;
}

let _cached: SystemSpecs | null = null;

export function getSystemSpecs(): SystemSpecs {
  if (_cached) return _cached;

  const platform = os.platform();
  let gpus: GpuInfo[] = [];

  if (platform === 'win32') {
    gpus = detectGpusWindows();
  } else if (platform === 'linux') {
    gpus = detectGpusLinux();
  } else if (platform === 'darwin') {
    gpus = detectGpusMac();
  }

  const specs: SystemSpecs = {
    totalRamGb: toGb(os.totalmem()),
    freeRamGb: toGb(os.freemem()),
    cpuCores: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? 'Unknown',
    platform,
    arch: os.arch(),
    gpus,
    primaryGpuVramGb: pickPrimaryGpu(gpus),
  };

  _cached = specs;
  console.log(`[SystemInfo] ${JSON.stringify(specs)}`);
  return specs;
}
