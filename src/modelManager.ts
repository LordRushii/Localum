import { loadModel, getLoadedModelInfo, close } from '@qvac/sdk';
import * as qvac from '@qvac/sdk';
import { getPreferredDevice } from './deviceFallback.js';

const SD_V2_1_1B_Q8_0 = (qvac as any).SD_V2_1_1B_Q8_0;

// Extend the global Process interface for TypeScript
declare global {
  namespace NodeJS {
    interface Process {
      modelId?: string | null;
    }
  }
}

let loadedModelId: string | null = process.modelId || null;
let isLoading = false;
let loadPercent = 0;
let loadStatus = 'Awaiting trigger...';

export function getModelState() {
  return { loadedModelId, isLoading, loadPercent, loadStatus };
}

export async function resetModelState() {
  loadedModelId = null;
  process.modelId = null;
  try {
    await close();
  } catch (err: any) {
    console.error('Failed to close QVAC connection:', err.message);
  }
}

export async function ensureModelLoaded(
  modelStoragePath: string,
  onProgress?: (percent: number, status: string) => void
): Promise<string | null> {
  // Always log the resolved model storage path so it's visible in terminal/logs.
  console.log(`[ModelManager] ${new Date().toISOString()} Model storage path: ${modelStoragePath}`);

  if (loadedModelId) {
    try {
      await getLoadedModelInfo({ modelId: loadedModelId });
      return loadedModelId; // alive, reuse it
    } catch {
      loadedModelId = null;
      process.modelId = null; // stale -> wipe and fall through to reload
    }
  }

  if (isLoading) return null; // caller should poll progress instead

  isLoading = true;
  console.log(`[ModelManager] ${new Date().toISOString()} Starting model load (cache dir: ${modelStoragePath})...`);
  const preferredDevice = process.env.FORCE_CPU ? 'cpu' : getPreferredDevice();
  const loadConfig: any = { prediction: 'v' };

  if (preferredDevice) {
    loadConfig.device = preferredDevice;
    if (preferredDevice === 'cpu') {
      loadConfig.threads = 4;
    }
  }

  try {
    loadedModelId = await loadModel({
      modelSrc: SD_V2_1_1B_Q8_0,
      modelType: 'sdcpp-generation',
      modelConfig: loadConfig,
      onProgress: (p: any) => {
        loadPercent = p.percentage;
        loadStatus = p.percentage >= 100
          ? 'Model fully loaded locally.'
          : `Downloading... (${p.percentage.toFixed(1)}%)`;
        onProgress?.(loadPercent, loadStatus);
      }
    });

    process.modelId = loadedModelId;
    console.log(`[ModelManager] ${new Date().toISOString()} Model loaded successfully. ID: ${loadedModelId}`);
  } catch (error) {
    loadStatus = 'Failed to load model.';
    console.error(`[ModelManager] ${new Date().toISOString()} Error in loadModel:`, error);
    throw error;
  } finally {
    isLoading = false;
  }

  return loadedModelId;
}
