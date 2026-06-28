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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit} className="glass-panel">
        <div className="header">
          <h1>Localum</h1>
          <p>AI-Powered Image Generation Studio</p>
        </div>

        {!isModelLoaded && (
          <div className="progress-container model-progress">
            <div className="progress-header">
              <span>Downloading AI Model</span>
              <span className="progress-status">{modelProgress.percent.toFixed(0)}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${modelProgress.percent}%` }}
              ></div>
            </div>
            <div className="progress-header" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
              <span>{modelProgress.status}</span>
            </div>
          </div>
        )}

        <div className="input-group">
          <label htmlFor="prompt">Creation Prompt</label>
          <input
            id="prompt"
            type="text"
            placeholder="A futuristic cyberpunk city in the rain..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!isModelLoaded || isGenerating}
            autoComplete="off"
          />
        </div>

        <div className="controls">
          <div className="input-group">
            <label htmlFor="ratio">Aspect Ratio</label>
            <select
              id="ratio"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              disabled={!isModelLoaded || isGenerating}
            >
              <option value="1:1">1:1 Square</option>
              <option value="16:9">16:9 Widescreen</option>
              <option value="9:16">9:16 Portrait</option>
              <option value="4:3">4:3 Standard</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="submit"
              disabled={!isModelLoaded || !prompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="spinner"></div>
                  Generating...
                </>
              ) : (
                'Generate Image'
              )}
            </button>
          </div>
        </div>

        {isGenerating && (
          <div className="progress-container loading">
            <div className="progress-header">
              <span>Rendering Image</span>
              <span className="progress-status">{genProgress.percent.toFixed(0)}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill pulse"
                style={{ width: `${genProgress.percent}%` }}
              ></div>
            </div>
            <div className="progress-header" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
              <span>{genProgress.status}</span>
              {genProgress.sub && (
                <span className="progress-sub-status">{genProgress.sub}</span>
              )}
            </div>
          </div>
        )}

        {image && !isGenerating && (
          <div className="image-preview">
            <img src={image} alt={prompt} />
            <a
              href={image}
              download={`generated-${Date.now()}.png`}
              className="download-link"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </a>
          </div>
        )}
      </form>

      {toastVisible && (
        <div className={`toast ${closingToast ? 'closing' : ''}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div style={{ flex: 1 }}>{error}</div>
          <button className="toast-close" onClick={closeToast}>&times;</button>
        </div>
      )}
    </div>
  );
}

export default App;

