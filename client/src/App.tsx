import { useState, useEffect } from 'react';
import { useImageGenerator, scoreModel } from './hooks/useImageGenerator';
import './index.css';

import logoMark from './assets/logo.png';
import { Trash2, Cpu, AlertTriangle, Check, Play, DownloadCloud } from 'lucide-react';

type Tab = 'generator' | 'models';

function App() {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('1:1');
  const [generatedRatio, setGeneratedRatio] = useState('1:1');
  const [toastVisible, setToastVisible] = useState(false);
  const [closingToast, setClosingToast] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('generator');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const {
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
  } = useImageGenerator();

  const isModelLoaded = modelProgress.percent === 100;

  useEffect(() => {
    if (error) {
      setToastVisible(true);
      setClosingToast(false);
      const timer = setTimeout(() => closeToast(), 5000);
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
    setGeneratedRatio(ratio);
    generate(prompt, ratio);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const getStatusText = () => {
    if (isSwitchingModel) return modelProgress.status || 'Loading model...';
    if (!isModelLoaded) return modelProgress.status || 'Downloading model...';
    if (isGenerating) return genProgress.status || 'Generating...';
    if (image) return 'Ready';
    return 'Idle';
  };

  const getAspectClass = (r: string) => {
    if (r === '16:9') return 'tray-aspect-16-9';
    if (r === '9:16') return 'tray-aspect-9-16';
    return 'tray-aspect-1-1';
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const activeModel = availableModels.find(m => m.key === activeModelKey);
  const isBusy = isSwitchingModel || isGenerating;

  return (
    <div className="app-shell">

      {/* ── Top Navbar ─────────────────────────────────────────────────────── */}
      <header className="navbar">
        <div className="navbar-logo" style={{ alignItems: 'center', height: '100%', display: 'flex' }}>
          <img src={logoMark} alt="Localum Logo" style={{ height: '32px', transform: 'scale(3.8)', transformOrigin: 'left center', objectFit: 'contain' }} />
        </div>

        <nav className="navbar-tabs">
          <button
            id="tab-generator"
            className={`navbar-tab ${activeTab === 'generator' ? 'navbar-tab--active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            Generator
          </button>
          <button
            id="tab-models"
            className={`navbar-tab ${activeTab === 'models' ? 'navbar-tab--active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            Models
          </button>
        </nav>

        <div className="navbar-end">
          {/* Action buttons could go here */}
        </div>
      </header>

      {/* ── Main Body ──────────────────────────────────────────────────────── */}
      <div className="main-body">

        {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-content">

            <div className="field-group">
              <label className="field-label" htmlFor="prompt">Describe the image</label>
              <div className="textarea-wrap">
                <textarea
                  id="prompt"
                  className="prompt-textarea"
                  placeholder="A futuristic cyberpunk city in the rain..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!isModelLoaded || isGenerating}
                  autoComplete="off"
                />
                <span className="textarea-icon">✦</span>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Aspect Ratio</label>
              <div className="seg-control">
                {(['1:1', '16:9', '9:16'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`seg-btn ${ratio === r ? 'seg-btn--active' : ''}`}
                    onClick={() => setRatio(r)}
                    disabled={!isModelLoaded || isGenerating}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Hardware Device</label>
              <div className="seg-control">
                {(['gpu', 'cpu'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`seg-btn ${device === d ? 'seg-btn--active' : ''}`}
                    onClick={() => setDevice(d)}
                    disabled={isGenerating}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-divider" />

            {/* Advanced collapsible */}
            <div className="field-group">
              <button
                className="advanced-toggle"
                onClick={() => setAdvancedOpen(v => !v)}
                type="button"
                id="advanced-toggle-btn"
              >
                <span>Advanced</span>
                <span className={`advanced-chevron ${advancedOpen ? 'advanced-chevron--open' : ''}`}>›</span>
              </button>
              {advancedOpen && (
                <div className="advanced-panel">
                  <div className="adv-row">
                    <span className="adv-label">Model</span>
                    <span className="adv-value">{activeModel?.label ?? activeModelKey}</span>
                  </div>
                  <div className="adv-row">
                    <span className="adv-label">Architecture</span>
                    <span className="adv-value">{activeModel?.architecture ?? '—'}</span>
                  </div>
                  <div className="adv-row">
                    <span className="adv-label">Quantization</span>
                    <span className="adv-value">{activeModel?.quantization ?? '—'}</span>
                  </div>
                  <div className="adv-row">
                    <span className="adv-label">Size</span>
                    <span className="adv-value">{activeModel ? `${activeModel.sizeGb} GB` : '—'}</span>
                  </div>
                  {systemSpecs && (
                    <>
                      <div className="adv-row">
                        <span className="adv-label">GPU</span>
                        <span className="adv-value adv-value--small">
                          {systemSpecs.gpus.find(g => /nvidia|amd|arc/i.test(g.name))?.name ?? systemSpecs.cpuModel}
                        </span>
                      </div>
                      <div className="adv-row">
                        <span className="adv-label">VRAM</span>
                        <span className="adv-value">{systemSpecs.primaryGpuVramGb > 0 ? `${systemSpecs.primaryGpuVramGb} GB` : 'N/A'}</span>
                      </div>
                      <div className="adv-row">
                        <span className="adv-label">RAM</span>
                        <span className="adv-value">{systemSpecs.totalRamGb} GB</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Generate button pinned to bottom */}
          <div className="sidebar-footer">
            {!isModelLoaded && !isSwitchingModel && (
              <div className="model-progress-wrap">
                <div className="model-progress-bar-bg">
                  <div className="model-progress-bar-fill" style={{ width: `${modelProgress.percent}%` }} />
                </div>
                <span className="model-progress-label">{modelProgress.status || 'Downloading...'}</span>
              </div>
            )}
            {isSwitchingModel && (
              <div className="model-progress-wrap">
                <div className="model-progress-bar-bg">
                  <div className="model-progress-bar-fill" style={{ width: `${modelProgress.percent}%` }} />
                </div>
                <span className="model-progress-label">{modelProgress.status || 'Loading model...'}</span>
              </div>
            )}
            <button
              id="generate-btn"
              className={`generate-btn ${isModelLoaded && prompt.trim() && !isGenerating ? 'generate-btn--ready' : ''}`}
              onClick={handleGenerate}
              disabled={!isModelLoaded || !prompt.trim() || isGenerating || isSwitchingModel}
            >
              {isGenerating
                ? <><span className="gen-spinner" /> Generating...</>
                : <><span className="gen-icon">✦</span> Generate</>
              }
            </button>
            {isModelLoaded && !isGenerating && prompt.trim() && (
              <div className="generate-shortcut">Ctrl + Enter</div>
            )}
          </div>
        </aside>

        {/* ── Canvas Area ──────────────────────────────────────────────────── */}
        {activeTab === 'generator' && (
          <main className="canvas-area">
            <div className={`canvas-tray ${getAspectClass(image ? generatedRatio : ratio)}`}>
              {image && <img src={image} alt={prompt} className="canvas-image" />}

              {/* Empty state */}
              {!image && !isGenerating && (
                <div className="canvas-empty">
                  <svg className="canvas-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="canvas-empty-text">
                    {isModelLoaded ? 'Your image will appear here' : 'Preparing model…'}
                  </span>
                </div>
              )}

              {/* Generating animation */}
              {isGenerating && (
                <div className="gen-overlay">
                  {!prefersReducedMotion && (
                    <>
                      <div className="blob blob-1" />
                      <div className="blob blob-2" />
                      <div className="blob blob-3" />
                      <div className="shimmer" />
                    </>
                  )}
                  <div className="gen-hud">
                    <div className="gen-hud-spinner" />
                    <span className="gen-hud-label">Creating image...</span>
                    <span className="gen-hud-pct">{genProgress.percent}%</span>
                  </div>
                  <div className="gen-progress-track">
                    <div className="gen-progress-fill" style={{ width: `${genProgress.percent}%` }} />
                  </div>
                </div>
              )}

              {/* Download button */}
              {image && !isGenerating && (
                <a
                  href={image}
                  download={`localum-${Date.now()}.png`}
                  className="download-btn"
                  id="download-image-btn"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Save Image
                </a>
              )}
            </div>
          </main>
        )}

        {/* ── Models Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'models' && (
          <main className="models-area">
            <div className="models-area-head">
              <div>
                <h2 className="models-area-title">Model Library</h2>
                {systemSpecs && (
                  <p className="models-area-specs">
                    {systemSpecs.gpus.find(g => /nvidia|amd|radeon|arc/i.test(g.name))?.name ?? systemSpecs.cpuModel}
                    {systemSpecs.primaryGpuVramGb > 0 ? ` · ${systemSpecs.primaryGpuVramGb}GB VRAM` : ''}
                    {` · ${systemSpecs.totalRamGb}GB RAM · ${systemSpecs.cpuCores} cores`}
                  </p>
                )}
              </div>
            </div>

            <div className="model-cards-grid">
              {availableModels.map(model => {
                const score = systemSpecs
                  ? scoreModel(model, systemSpecs, device)
                  : { recommended: false, gpuOk: true, ramOk: true, cpuOk: true };
                const isActive = model.key === activeModelKey;

                return (
                  <div
                    key={model.key}
                    id={`model-card-${model.key}`}
                    className={`model-card ${isActive ? 'model-card--active' : ''} ${score.recommended ? 'model-card--recommended' : ''} ${(!score.gpuOk || !score.ramOk) ? 'model-card--warn' : ''}`}
                  >
                    <div className="model-card-top">
                      <div className="model-card-badges">
                        {score.recommended && <span className="badge badge--recommended">Recommended</span>}
                        {isActive && <span className="badge badge--active">Active</span>}
                        {model.badge && !score.recommended && <span className="badge badge--info">{model.badge}</span>}
                        {(!score.gpuOk || !score.ramOk) && <span className="badge badge--warn">High Spec</span>}
                      </div>
                      {model.cached && !isActive && (
                        <button
                          className="model-delete-btn"
                          onClick={() => setConfirmDelete(model.key)}
                          disabled={isBusy}
                          title={`Delete ${model.label}`}
                          id={`delete-btn-${model.key}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    <div className="model-card-name">{model.label}</div>

                    <div className="model-card-meta">
                      <span className="model-meta-pill">{model.params}</span>
                      <span className="model-meta-pill">{model.quantization}</span>
                      <span className="model-meta-pill">{model.sizeGb}GB</span>
                      {model.cpuFriendly && <span className="model-meta-pill model-meta-pill--cpu" style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Cpu size={10} /> CPU ✓</span>}
                    </div>

                    {score.warning && <div className="model-card-warning" style={{display: 'flex', alignItems: 'flex-start', gap: '6px'}}><AlertTriangle size={12} style={{flexShrink: 0, marginTop: '2px'}} /> <span>{score.warning}</span></div>}

                    {systemSpecs && systemSpecs.primaryGpuVramGb > 0 && (
                      <div className="model-vram-bar-wrap">
                        <div className="model-vram-bar-label" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2px'}}>
                          <span>VRAM</span>
                          <span>{model.vramRequiredGb}GB / {systemSpecs.primaryGpuVramGb}GB</span>
                        </div>
                        <div className="model-vram-bar-track">
                          <div
                            className={`model-vram-bar-fill ${score.gpuOk ? 'fill--ok' : 'fill--warn'}`}
                            style={{ width: `${Math.min(100, (model.vramRequiredGb / systemSpecs.primaryGpuVramGb) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      id={`load-btn-${model.key}`}
                      className={`model-load-btn ${isActive ? 'model-load-btn--active' : model.cached ? 'model-load-btn--cached' : 'model-load-btn--download'}`}
                      onClick={() => { if (!isActive) { switchModel(model.key); setActiveTab('generator'); } }}
                      disabled={isActive || isBusy}
                    >
                      {isActive ? <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}><Check size={14} /> Loaded</div>
                        : isSwitchingModel && activeModelKey === model.key ? 'Loading...'
                          : model.cached ? <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}><Play size={14} /> Switch Model</div>
                            : <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}><DownloadCloud size={14} /> Download ({model.sizeGb}GB)</div>}
                    </button>
                  </div>
                );
              })}
            </div>
          </main>
        )}
      </div>

      {/* ── Bottom Status Bar ─────────────────────────────────────────────── */}
      <footer className="status-bar">
        <div className="status-item">
          <span className={`status-dot ${device === 'gpu' ? 'status-dot--cyan' : 'status-dot--muted'}`} />
          <span className="status-label">DEVICE:</span>
          <span className="status-value">{device.toUpperCase()}</span>
        </div>
        <div className="status-sep" />
        <div className="status-item">
          <span className={`status-dot ${isModelLoaded ? 'status-dot--cyan' : 'status-dot--warn'}`} />
          <span className="status-label">MODEL:</span>
          <span className="status-value">{activeModel?.label ?? activeModelKey}</span>
        </div>
        <div className="status-sep" />
        <div className="status-item">
          <span className={`status-dot ${isGenerating ? 'status-dot--warn status-dot--pulse' : isModelLoaded ? 'status-dot--cyan' : 'status-dot--muted'}`} />
          <span className="status-label">STATUS:</span>
          <span className="status-value">{getStatusText()}</span>
        </div>
      </footer>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">Delete model?</h3>
            <p className="confirm-body">
              This will permanently remove <strong>{availableModels.find(m => m.key === confirmDelete)?.label}</strong> from disk.
              You can re-download it any time.
            </p>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setConfirmDelete(null)} id="confirm-cancel-btn">Cancel</button>
              <button className="confirm-delete" onClick={() => { deleteModel(confirmDelete); setConfirmDelete(null); }} id="confirm-delete-btn">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
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
