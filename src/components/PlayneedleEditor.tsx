import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import FormulaPlayneedle from './FormulaPlayneedle';
import DraggableModal from './DraggableModal';
import { showToast } from './Toast';
import { Slider } from './Adjustables';
import { modalManager } from '../state/modalManager';
import { RotateCcw } from 'lucide-react';

// Playneedle Editor modal caps
const EDITOR_MAX_WIDTH = '480px';
const EDITOR_MAX_HEIGHT = '72vh'; //default 72vh
// Left padding for the sliders column
const PADDING_LEFT = 10;

// Default values for all playneedle sliders
const DEFAULT_VALUES = {
  pnT: 0.092,
  pnJ: 0.049,
  pnK: 103,
  pnS: 28.0,
  pnVo: 0.147,
  pnHb: 0.8,
  pnHr: 1,
  pnWidth: 20,
} as const;

const MAX_VALUES = {
  pnT: 0.5,
  pnJ: 0.25,
  pnK: 1000,
  pnS: 50,
  pnVo: 1,
  pnHb: 1,
  pnHr: 1,
  pnWidth: 100,
} as const;

const MIN_VALUES = {
  pnT: 0,
  pnJ: -0.05,
  pnK: 10,
  pnS: 10,
  pnVo: 0,
  pnHb: 0.5,
  pnHr: 0,
  pnWidth: 0,
} as const;

function getSavedPnT(): number {
  try {
    const v = window.localStorage.getItem('juicecut.settings.playneedle_t');
    if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= 0 && n <= 0.5) return n; }
  } catch {}
  return 0.092;
}

function getSavedPnJ(): number {
  try {
    const v = window.localStorage.getItem('juicecut.settings.playneedle_j');
    if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= -0.05 && n <= 0.25) return n; }
  } catch {}
  return 0.049;
}

function getSavedPnK(): number {
  try {
    const v = window.localStorage.getItem('juicecut.settings.playneedle_k');
    if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= 10 && n <= 1000) return n; }
  } catch {}
  return 103;
}

function getSavedPnS(): number {
  try {
    const v = window.localStorage.getItem('juicecut.settings.playneedle_s');
    if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= 10 && n <= 50) return n; }
  } catch {}
  return 16.4;
}

function getSavedPnVo(): number {
  try {
    const v = window.localStorage.getItem('juicecut.settings.playneedle_v_o');
    if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= 0 && n <= 1) return n; }
  } catch {}
  return 0.4;
}

function getSavedPnHb(): number {
  try {
    const v = window.localStorage.getItem('juicecut.settings.playneedle_h_b');
    if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= 0.5 && n <= 1) return n; }
  } catch {}
  return 0.8;
}

function getSavedPnHr(): number {
  try {
    const v = window.localStorage.getItem('juicecut.settings.playneedle_h_r');
    if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= 0 && n <= 1) return n; }
  } catch {}
  return 1;
}

// Retrieve saved playneedle width (in pixels) for the editor UI
function getSavedPnWidth(): number {
  try {
    const v = window.localStorage.getItem('juicecut.settings.playneedle_width');
    if (v !== null) { const n = parseInt(v, 10); if (!isNaN(n) && n >= 0 && n <= 100) return n; }
  } catch {}
  // Default width matches the current hard‑coded value used elsewhere
  return 260;
}

export function OpenPlayneedleEditor(onCloseCallback?: () => void) {
  const result = modalManager.requestOpen('playneedleEditor');
  if (!result.allowed) {
    showToast(result.reason || '⚠ <br/>opening multiple menus is disabled');
    return;
  }
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const modalId = result.id!;
  const closeAndReturnToSettings = () => {
    try { root.unmount(); } catch (e) {}
    if (container.parentNode) container.parentNode.removeChild(container);
    modalManager.unregister(modalId);
    if (onCloseCallback) onCloseCallback();
  };
  const closeDirectly = () => {
    try { root.unmount(); } catch (e) {}
    if (container.parentNode) container.parentNode.removeChild(container);
    modalManager.unregister(modalId);
  };
  modalManager.registerClose(modalId, closeDirectly);
  root.render(<PlayneedleEditorModal onClose={closeDirectly} onBack={closeAndReturnToSettings} />);
  return closeDirectly;
}

export interface PlayneedleEditorModalProps {
  onClose: () => void;
  onBack: () => void;
}

export default function PlayneedleEditorModal({ onClose, onBack }: PlayneedleEditorModalProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewHeight, setPreviewHeight] = useState(260);
  // Core playneedle parameters
  const [pnT, setPnT] = useState<number>(getSavedPnT);
  const [pnJ, setPnJ] = useState<number>(getSavedPnJ);
  const [pnK, setPnK] = useState<number>(getSavedPnK);
  const [pnS, setPnS] = useState<number>(getSavedPnS);
  const [pnVo, setPnVo] = useState<number>(getSavedPnVo);
  const [pnHb, setPnHb] = useState<number>(getSavedPnHb);
  const [pnHr, setPnHr] = useState<number>(getSavedPnHr);
  // UI width for the editor preview (also used by timeline)
  const [pnWidth, setPnWidth] = useState<number>(getSavedPnWidth);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.playneedle_t', String(pnT)); dispatchSettingsChanged('playneedle_t', pnT); } catch {}
  }, [pnT]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.playneedle_j', String(pnJ)); dispatchSettingsChanged('playneedle_j', pnJ); } catch {}
  }, [pnJ]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.playneedle_k', String(pnK)); dispatchSettingsChanged('playneedle_k', pnK); } catch {}
  }, [pnK]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.playneedle_s', String(pnS)); dispatchSettingsChanged('playneedle_s', pnS); } catch {}
  }, [pnS]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.playneedle_v_o', String(pnVo)); dispatchSettingsChanged('playneedle_v_o', pnVo); } catch {}
  }, [pnVo]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.playneedle_h_b', String(pnHb)); dispatchSettingsChanged('playneedle_h_b', pnHb); } catch {}
  }, [pnHb]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.playneedle_h_r', String(pnHr)); dispatchSettingsChanged('playneedle_h_r', pnHr); } catch {}
  }, [pnHr]);

  // Persist width changes
  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.playneedle_width', String(pnWidth)); dispatchSettingsChanged('playneedle_width', pnWidth); } catch {}
  }, [pnWidth]);

  const params = useMemo(() => ({
    t: pnT,
    j: pnJ,
    k: pnK,
    s: pnS,
    v_o: pnVo,
    h_b: pnHb,
    h_r: pnHr,
  }), [pnT, pnJ, pnK, pnS, pnVo, pnHb, pnHr]);

  // Watch the preview container height to make the playneedle fill the modal
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const updateHeight = () => setPreviewHeight(el.clientHeight);
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    updateHeight();
    return () => ro.disconnect();
  }, []);

  return (
    <DraggableModal
      title="Playneedle Editor"
      onClose={onClose}
      headerLeft={
        <button
          className="icon-btn"
          onClick={onBack} 
          style={{
            position: 'absolute', 
            left: 8, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            width: 26, 
            height: 26, 
            color: 'var(--text-secondary)',
          }}
          title="Back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
      }
      style={{ width: EDITOR_MAX_WIDTH, maxHeight: EDITOR_MAX_HEIGHT, minHeight: 0, overflow: 'hidden' }}
      body={
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 16, padding: `4px 0 12px ${PADDING_LEFT}px`, flex: 1, minHeight: 0, overflow: 'hidden', height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, width: 260, overflowY: 'scroll', overflowX: 'hidden', paddingRight: 4, flexShrink: 0, minHeight: 0, flex: 3 }}>
            <Slider
              label={<span>t ！ Total thickness of the needle part</span>}
              value={pnT}
              min={0}
              max={0.5}
              step={0.001}
              onChange={setPnT}
                onReset={() => setPnT(DEFAULT_VALUES.pnT)}
              formatValue={v => v.toFixed(3)}
            />
            <Slider
              label={<span>j ！ Length of the ribbon at the top</span>}
              value={pnJ}
              min={-0.05}
              max={0.25}
              step={0.001}
              onChange={setPnJ}
                onReset={() => setPnJ(DEFAULT_VALUES.pnJ)}
              formatValue={v => v.toFixed(3)}
            />
            <Slider
              label={<span>k ！ Falloff of the ribbon (log scale)</span>}
              value={pnK}
              min={10}
              max={1000}
              step={1}
              onChange={setPnK}
                onReset={() => setPnK(DEFAULT_VALUES.pnK)}
              logScale
              formatValue={v => v.toFixed(3)}
            />
            <Slider
              label={<span>s ！ Vertical height of the playneedle button</span>}
              value={pnS}
              min={10}
              max={50}
              step={0.1}
              onChange={setPnS}
                onReset={() => setPnS(DEFAULT_VALUES.pnS)}
              formatValue={v => v.toFixed(3)}
            />
            <Slider
              label={<span>v<sub>o</sub> ！ Vertical offset of the playneedle button</span>}
              value={pnVo}
              min={0}
              max={1}
              step={0.001}
              onChange={setPnVo}
                onReset={() => setPnVo(DEFAULT_VALUES.pnVo)}
              formatValue={v => v.toFixed(3)}
            />
            <Slider
              label={<span>h<sub>b</sub> ！ Horizontal width of the playneedle button</span>}
              value={pnHb}
              min={0.5}
              max={1}
              step={0.001}
              onChange={setPnHb}
                onReset={() => setPnHb(DEFAULT_VALUES.pnHb)}
              formatValue={v => v.toFixed(3)}
            />
             <Slider
               label={<span>h<sub>r</sub> ！ Horizontal width of the ribbon</span>}
               value={pnHr}
               min={0}
               max={1}
               step={0.001}
               onChange={setPnHr}
                onReset={() => setPnHr(DEFAULT_VALUES.pnHr)}
               formatValue={v => v.toFixed(3)}
             />
              <Slider
                label={<span>Playneedle width (px)</span>}
                value={pnWidth}
                  min={0}
                max={100}
                step={1}
                onChange={setPnWidth}
                 onReset={() => setPnWidth(DEFAULT_VALUES.pnWidth)}
                formatValue={v => `${Math.round(v)}px`}
              />
          </div>

          <div
            ref={previewRef}
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: 260,
              flex: 1,
              alignSelf: 'stretch',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <FormulaPlayneedle
              height={previewHeight}
              maxWidth={pnWidth}
              color="var(--playneedle)"
              glowColor="rgba(56, 189, 248, 0.4)"
              params={params}
            />
          </div>
        </div>
      }
    />
  );
}