import { useState, useEffect } from 'react';
import { useImageGenerator } from './hooks/useImageGenerator';
import './index.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('1:1');
  const [toastVisible, setToastVisible] = useState(false);
  const [closingToast, setClosingToast] = useState(false);

  const { modelProgress, genProgress, image, error, generate, setError, isGenerating } = useImageGenerator();

  const isModelLoaded = modelProgress.percent === 100;

  useEffect(() => {
    if (error) {
      setToastVisible(true);
      setClosingToast(false);

      const timer = setTimeout(() => {
        closeToast();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  const closeToast = () => {
    setClosingToast(true);
    setTimeout(() => {
      setToastVisible(false);
      setError(null);
    }, 300);
  };

  const handleGenerate = () => {
    if (!prompt.trim() || !isModelLoaded || isGenerating) return;
    generate(prompt, ratio);
  };

  const getStatusText = () => {
    if (!isModelLoaded) {
      return `DOWNLOADING MODEL... ${modelProgress.status || ''}`;
    }
    if (isGenerating) {
      return `${genProgress.status || 'PROCESSING'} ${genProgress.sub ? '- ' + genProgress.sub : ''}`;
    }
    if (image) {
      return 'READY';
    }
    return 'SYSTEM IDLE';
  };

  const getAspectClass = (r: string) => {
    if (r === '16:9') return 'tray-aspect-16-9';
    if (r === '9:16') return 'tray-aspect-9-16';
    return 'tray-aspect-1-1';
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="container">
      {/* Left Rail */}
      <div className="left-rail">
        <div className="app-brand">
          <h1>Localum</h1>
          <p>Runs entirely on this device.</p>
        </div>

        <div className="input-group">
          <label htmlFor="prompt">Describe the image</label>
          <textarea
            id="prompt"
            placeholder="A futuristic cyberpunk city in the rain..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!isModelLoaded || isGenerating}
            autoComplete="off"
          />
        </div>

        <div className="input-group">
          <label>Aspect Ratio</label>
          <div className="segmented-control">
            <button
              type="button"
              className={`segment-btn ${ratio === '1:1' ? 'active' : ''}`}
              onClick={() => setRatio('1:1')}
              disabled={!isModelLoaded || isGenerating}
            >
              1:1
            </button>
            <button
              type="button"
              className={`segment-btn ${ratio === '16:9' ? 'active' : ''}`}
              onClick={() => setRatio('16:9')}
              disabled={!isModelLoaded || isGenerating}
            >
              16:9
            </button>
            <button
              type="button"
              className={`segment-btn ${ratio === '9:16' ? 'active' : ''}`}
              onClick={() => setRatio('9:16')}
              disabled={!isModelLoaded || isGenerating}
            >
              9:16
            </button>
          </div>
        </div>

        <button
          className={`generate-btn ${isModelLoaded && prompt.trim() && !isGenerating ? 'ready' : ''}`}
          onClick={handleGenerate}
          disabled={!isModelLoaded || !prompt.trim() || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Right Pane */}
      <div className="right-pane">
        <div className={`developing-tray ${getAspectClass(ratio)}`}>
          {image && <img src={image} alt={prompt} className="canvas-image" />}
          
          {isGenerating && (
            <>
              <div className="noise-overlay"></div>
              {!prefersReducedMotion && (
                <div 
                  className="scan-line" 
                  style={{ top: `${genProgress.percent}%` }}
                ></div>
              )}
            </>
          )}

          {image && !isGenerating && (
            <a
              href={image}
              download={`generated-${Date.now()}.png`}
              className="download-link"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </a>
          )}
        </div>
        
        <div className="typewriter-status">
          {getStatusText()}
        </div>
      </div>

      {toastVisible && (
        <div className={`toast ${closingToast ? 'closing' : ''}`}>
          <div style={{ flex: 1 }}>{error}</div>
          <button className="toast-close" onClick={closeToast}>&times;</button>
        </div>
      )}
    </div>
  );
}

export default App;


