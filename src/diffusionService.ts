import { diffusion } from '@qvac/sdk';

export interface DiffusionResult {
  dataUrl: string;
  seed: number;
}

export async function runDiffusion(
  modelId: string,
  prompt: string,
  onProgress?: (percent: number, status: string) => void
): Promise<DiffusionResult> {
  const { progressStream, outputs, stats } = diffusion({ modelId, prompt });

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
