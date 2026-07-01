import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ModelEntry {
  key: string;
  label: string;
  architecture: string;
  description: string;
  modelId: string;
  sizeGb: number;
  params: string;
  quantization: string;
  vramRequiredGb: number;
  ramRequiredGb: number;
  cpuFriendly: boolean;
  badge?: string;
  cached: boolean;
  active: boolean;
}

export interface SystemSpecs {
  totalRamGb: number;
  freeRamGb: number;
  cpuCores: number;
  cpuModel: string;
  platform: string;
  arch: string;
  gpus: { name: string; vramGb: number }[];
  primaryGpuVramGb: number;
}

/** Score a model against system specs to decide if it's "recommended" */
export function scoreModel(model: ModelEntry, specs: SystemSpecs, currentDevice: 'gpu' | 'cpu'): {
  recommended: boolean;
  gpuOk: boolean;
  ramOk: boolean;
  cpuOk: boolean;
  warning?: string;
} {
  const gpuVram = specs.primaryGpuVramGb;
  const totalRam = specs.totalRamGb;

  const gpuOk = currentDevice === 'gpu' ? gpuVram >= model.vramRequiredGb : true;
  const ramOk = totalRam >= model.ramRequiredGb;
  const cpuOk = currentDevice === 'cpu' ? model.cpuFriendly : true;

  let score = 0;
  if (gpuOk) score += 3;
  if (ramOk) score += 2;
  if (cpuOk) score += 2;

  const recommended = score >= 5;

  let warning: string | undefined;
  if (currentDevice === 'gpu' && !gpuOk) {
    warning = `Needs ${model.vramRequiredGb}GB VRAM (you have ${gpuVram}GB)`;
  } else if (!ramOk) {
    warning = `Needs ${model.ramRequiredGb}GB RAM (you have ${totalRam}GB)`;
  } else if (currentDevice === 'cpu' && !model.cpuFriendly) {
    warning = 'Not optimised for CPU — may be very slow';
  }

  return { recommended, gpuOk, ramOk, cpuOk, warning };
}

export function useImageGenerator() {
  const socketRef = useRef<Socket | null>(null);
  const [modelProgress, setModelProgress] = useState({ percent: 0, status: '' });
  const [genProgress, setGenProgress] = useState({ percent: 0, status: '', sub: '' });
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [device, setDeviceState] = useState<'gpu' | 'cpu'>('gpu');

  // Model library state
  const [availableModels, setAvailableModels] = useState<ModelEntry[]>([]);
  const [activeModelKey, setActiveModelKey] = useState<string>('sd21-q8');
  const [systemSpecs, setSystemSpecs] = useState<SystemSpecs | null>(null);
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);

  const refreshModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models');
      if (res.ok) setAvailableModels(await res.json());
    } catch { /* server may not be up yet */ }
  }, []);

  useEffect(() => {
    const isElectron = (window as any).electronAPI?.isElectron;
    const socketUrl = (import.meta.env.DEV || isElectron) ? 'http://localhost:3000' : '';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.emit('trigger-model-download');

    socket.on('device-preference', (pref: 'gpu' | 'cpu') => {
      setDeviceState(pref);
    });

    socket.on('active-model', (key: string) => {
      setActiveModelKey(key);
    });

    socket.on('model-download-progress', (data: { percent: number; status: string }) => {
      setModelProgress(data);
      if (data.percent === 100) {
        setIsSwitchingModel(false);
        refreshModels();
      }
    });

    socket.on('model-catalog-update', (catalog: ModelEntry[]) => {
      setAvailableModels(catalog);
      setIsSwitchingModel(false);
    });

    socket.on('progress', (progressData) => {
      setGenProgress({
        percent: progressData.percent,
        status: progressData.status,
        sub: progressData.sub || ''
      });
    });
    socket.on('success', (data) => {
      setImage(data.url);
      setIsGenerating(false);
    });
    socket.on('error_event', (e) => {
      setError(e.message);
      setIsGenerating(false);
      setIsSwitchingModel(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsGenerating(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Connection to server lost. Please try again.');
      setIsGenerating(false);
    });

    // Fetch initial data
    fetch('/api/specs').then(r => r.ok ? r.json() : null).then(d => { if (d) setSystemSpecs(d); }).catch(() => {});
    refreshModels();

    return () => {
      socket.disconnect();
    };
  }, [refreshModels]);

  const generate = (prompt: string, ratio = '1:1') => {
    setError(null);
    setGenProgress({ percent: 0, status: 'Starting diffusion...', sub: 'DIFFUSION INITIALIZING' });
    setImage(null);
    setIsGenerating(true);
    const formattedPrompt = `${prompt}, photorealistic, highly detailed, cinematic lighting, 8k, sharp focus`;
    socketRef.current?.emit('generate', { prompt: formattedPrompt, ratio });
  };

  const setDevice = (newDevice: 'gpu' | 'cpu') => {
    setDeviceState(newDevice);
    socketRef.current?.emit('set-device', newDevice);
  };

  const switchModel = (key: string) => {
    setIsSwitchingModel(true);
    setModelProgress({ percent: 0, status: 'Loading model...' });
    socketRef.current?.emit('switch-model', key);
  };

  const deleteModel = (key: string) => {
    socketRef.current?.emit('delete-model', key);
  };

  return {
    modelProgress,
    genProgress,
    image,
    error,
    generate,
    setError,
    isGenerating,
    device,
    setDevice,
    availableModels,
    activeModelKey,
    systemSpecs,
    isSwitchingModel,
    switchModel,
    deleteModel,
  };
}
