import { diffusion } from '@qvac/sdk';
import { getPreferredDevice } from './deviceFallback.js';

export interface DiffusionResult {
  dataUrl: string;
  seed: number;
}

const DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1':  { width: 512, height: 512 },
  '16:9': { width: 768, height: 448 },
  '9:16': { width: 448, height: 768 }
};

export async function runDiffusion(
  modelId: string,
  prompt: string,
  ratio?: string,
  onProgress?: (percent: number, status: string) => void,
  negative_prompt = "blurry, low quality, deformed, extra limbs, watermark, text, bad anatomy, ugly"
): Promise<DiffusionResult> {
  const { width, height } = DIMENSIONS[ratio || '1:1'] || DIMENSIONS['1:1'];
  
  const device = process.env.FORCE_CPU ? 'cpu' : (getPreferredDevice() || 'gpu');
  console.log(`[Diffusion] Generating image on device: ${device}`);

  const { progressStream, outputs, stats } = diffusion({
    modelId,
    prompt,
    negative_prompt,
    width,
    height,
    cfg_scale: 7.5,
    steps: 30
  });

  for await (const progress of progressStream) {
    const { step, totalSteps } = progress;
    const percent = Math.round((step / totalSteps) * 100);
    onProgress?.(percent, `Denoising step ${step}/${totalSteps}...`);
  }

  const buffers = await outputs;
  if (!buffers || !buffers.length) {
    throw new Error('No image buffer returned from diffusion model.');
  }

  const base64Data = Buffer.from(buffers[0]).toString('base64');
  const dataUrl = `data:image/png;base64,${base64Data}`;
  const seed = (await stats).seed ?? -1;

  return { dataUrl, seed };
}

