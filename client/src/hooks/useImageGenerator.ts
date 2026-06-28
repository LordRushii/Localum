import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useImageGenerator() {
  const socketRef = useRef<Socket | null>(null);
  const [modelProgress, setModelProgress] = useState({ percent: 0, status: '' });
  const [genProgress, setGenProgress] = useState({ percent: 0, status: '', sub: '' });
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [device, setDeviceState] = useState<'gpu' | 'cpu'>('gpu');

  useEffect(() => {
    const isElectron = (window as any).electronAPI?.isElectron;
    const socketUrl = (import.meta.env.DEV || isElectron) ? 'http://localhost:3000' : '';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.emit('trigger-model-download');

    socket.on('device-preference', (pref: 'gpu' | 'cpu') => {
      setDeviceState(pref);
    });
    socket.on('model-download-progress', setModelProgress);
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

    return () => {
      socket.disconnect();
    };
  }, []);

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

  return { modelProgress, genProgress, image, error, generate, setError, isGenerating, device, setDevice };
}

