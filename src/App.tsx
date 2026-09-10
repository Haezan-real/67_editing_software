//app.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import MediaPool from './components/MediaPool';

// Web APIs not yet in TypeScript standard library
declare class MediaStreamTrackProcessor {
  readonly track: MediaStreamTrack;
  readonly readable: ReadableStream<VideoFrame>;
  constructor(options: { track: MediaStreamTrack });
}

import Viewer from './components/Viewer';
import Timeline from './components/Timeline';
import RollDialog from './components/RollDialog';
import ViewerControls from './components/ViewerControls';
import { OpenSettings } from './components/Settings';
import { OpenShaderSelector } from './components/shader_selector';
import { isShortcutMatch } from './components/shortcuts';
import { parentMap, StylesModal, applyThemeToDocument } from './components/styles';
import Splitter from './components/Splitter';
import DraggableModal from './components/DraggableModal';
import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  type MediaItem, type TimelineClip, type Track,
  FPS, generateId, secondsToFrames
} from './types';
import { HistoryProvider, useHistory } from './state/history';
import { SETTINGS_CHANGED_EVENT, getSettingsChangedDetail } from './state/settingsEvents';
import { useLayoutSettings } from './hooks/useLayoutSettings';
import { useExportJob } from './hooks/useExportJob';
import { useTimelineEditor } from './hooks/useTimelineEditor';
import { modalManager, registerModalPermissions } from './state';
import Toast from './components/Toast';
// Toast is a class, not a React component - no need to render it

const DEFAULT_IMAGE_DURATION = 5 * FPS;
const WINDOW_BUTTONS_SPACING = 10; //px
const WINDOW_BUTTONS_SIZE = 15; //px
const TOP_BAR_MENU_BUTTONS_SPACING = 0; //px
const header_font_size = 15;


// Initialize modal manager permissions
registerModalPermissions();

const TRACKS: Track[] = [
  { id: 'v1', type: 'video', label: 'V1' },
  { id: 'a1', type: 'audio', label: 'A1' },
];

function loadMediaDuration(file: File, type: MediaItem['type']): Promise<number> {
  return new Promise(resolve => {
    if (type === 'image') { resolve(DEFAULT_IMAGE_DURATION); return; }
    const el = type === 'video'
      ? document.createElement('video')
      : document.createElement('audio');
    const tempUrl = URL.createObjectURL(file);
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      el.removeAttribute('src');
      el.load();
      URL.revokeObjectURL(tempUrl);
    };
    el.preload = 'metadata';
    el.src = tempUrl;
    el.onloadedmetadata = () => {
      resolve(secondsToFrames(el.duration));
      cleanup();
    };
    el.onerror = () => {
      resolve(5 * FPS);
      cleanup();
    };
  });
}

function generateThumbnail(file: File, type: MediaItem['type']): Promise<string | undefined> {
  return new Promise(resolve => {
    if (type === 'audio') { resolve(undefined); return; }
    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const tempUrl = URL.createObjectURL(file);
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(tempUrl);
    };
    video.src = tempUrl;
    video.onloadeddata = () => { video.currentTime = 0.5; };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120; canvas.height = 68;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(video, 0, 0, 120, 68);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
      cleanup();
    };
    video.onerror = () => {
      resolve(undefined);
      cleanup();
    };
  });
}

function revokeMediaResources(items: Iterable<Pick<MediaItem, 'src'>>): void {
  for (const item of items) {
    URL.revokeObjectURL(item.src);
  }
}
function AppContent() {
  const history = useHistory();
  const multipleMenusToast = new Toast('opening multiple <br/> menus is disabled!');
  const [mediaItems, setMediaItems] = useState<Map<string, MediaItem>>(new Map());
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rollClipId, setRollClipId] = useState<string | null>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hasModalOpen, setHasModalOpen] = useState(false);
  const [shaderFps, setShaderFps] = useState<number | null>(null);
  const [shaderEnabled, setShaderEnabled] = useState(false);
  const isMountedRef = useRef(true);
  const mediaItemsRef = useRef(mediaItems);
  mediaItemsRef.current = mediaItems;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      revokeMediaResources(mediaItemsRef.current.values());
    };
  }, []);
  
  // Check if shader window is enabled from config
  useEffect(() => {
    fetch('/config.json')
      .then(r => r.json())
      .then(cfg => setShaderEnabled(!!cfg?.shader_window))
      .catch(() => setShaderEnabled(false));
  }, []);

  // Listen for FPS updates from the shader window (forwarded via main process)
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onShaderFps((fps: number) => {
      setShaderFps(fps);
    });
    return unsubscribe;
  }, []);

  // When shader window is disabled, measure the app window's own FPS
  useEffect(() => {
    if (shaderEnabled) return; // Only measure app FPS when shader is disabled
    let rafId = 0;
    let frameCount = 0;
    let fpsStartTime = performance.now();
    
    const measureFps = () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - fpsStartTime;
      if (elapsed >= 1000) {
        setShaderFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        fpsStartTime = now;
      }
      rafId = requestAnimationFrame(measureFps);
    };
    rafId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(rafId);
  }, [shaderEnabled]);

  const {
    playheadTop,
    setPlayheadTop,
    includeResizeInUndo,
    setIncludeResizeInUndo,
    leftWidthPct,
    setLeftWidthPct,
    leftCollapsed,
    timelineHeightPct,
    setTimelineHeightPct,
  } = useLayoutSettings();
  const [showStyle, setShowStyle] = useState(false);
  const [stylePage, setStylePage] = useState<string | null>(null);
  const [allowEditsWhenMenuOpen, setAllowEditsWhenMenuOpen] = useState(() => 
    (window as any).juicecut?.settings?.allowEditsWhenMenuOpen ?? true
  );

  // Watch for modal overlays in DOM to toggle hasModalOpen
  useEffect(() => {
    const checkModals = () => {
      const open = !!document.querySelector('.modal-overlay, .torus-overlay');
      setHasModalOpen(open);
    };
    checkModals();
    const observer = new MutationObserver(() => checkModals());
    observer.observe(document.body, { childList: true, subtree: false });
    return () => observer.disconnect();
  }, []);

  // Listen for settings changes to update allowEditsWhenMenuOpen reactively
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = getSettingsChangedDetail(e);
      if (detail?.key === 'allowEditsWhenMenuOpen') {
        setAllowEditsWhenMenuOpen(detail.value ?? true);
      }
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  // Listen for shader changes from the shader selector
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ shaderName?: string }>).detail;
      if (detail?.shaderName) {
        window.electronAPI?.requestShaderChange(detail.shaderName);
      }
    };
    window.addEventListener('juicecut-shader-change', handler);
    return () => window.removeEventListener('juicecut-shader-change', handler);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('mousedown', handleMouseDown, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, []);

  // Apply saved theme on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('juicecut.styles.activeTheme');
      if (!saved) window.localStorage.setItem('juicecut.styles.activeTheme', 'og-dark');
      applyThemeToDocument(saved || 'og-dark');
    } catch {}
  }, []);
  
  // Apply GUI scale on mount
  useEffect(() => {
    try {
      const v = window.localStorage.getItem('juicecut.settings.guiScale');
      const scale = v ? Number(v) / 100 : 1;
      document.documentElement.style.setProperty('--gui-scale', scale.toString());
    } catch {}
  }, []);

  // Send theme colors to shader window for dynamic effects and UI masking
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const sendThemeColorsToShader = () => {
      const styles = getComputedStyle(document.documentElement);
      // Must match the exact order of colorFields in GlobalStyleSettings.tsx
      const varNames = [
        '--bg-panel', '--bg-base', '--bg-viewer', '--video-bg', '--bg-elevated',
        '--bg-hover', '--border', '--border-mid', '--splitter', '--text-primary',
        '--text-secondary', '--text-muted', '--input-field', '--input-field-bg',
        '--playneedle', '--highlight-color', '--automation-line'
      ];

      const hexToRgb = (hex: string): [number, number, number] => {
        const clean = hex.replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16) / 255;
        const g = parseInt(clean.substring(2, 4), 16) / 255;
        const b = parseInt(clean.substring(4, 6), 16) / 255;
        return [r, g, b];
      };

      const colorArray: number[] = [];
      const rgbColors: [number, number, number][] = [];
      varNames.forEach(varName => {
        const hex = styles.getPropertyValue(varName).trim();
        const [r, g, b] = hex.startsWith('#') ? hexToRgb(hex) : [0, 0, 0];
        colorArray.push(r, g, b);
        rgbColors.push([r, g, b]);
      });

      // ── Calculate median hue and median saturation ────────────────────────
      // Convert each theme color to HSL, extract hue and saturation, sort, pick middle
      const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        const l = (max + min) / 2;
        if (d === 0) return [0, 0, l]; // achromatic (gray) → hue 0, saturation 0
        const s = d / (1 - Math.abs(2 * l - 1));
        let h = 0;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = h * 60;
        if (h < 0) h += 360;
        return [h, s, l];
      };

      const hslValues = rgbColors.map(([r, g, b]) => rgbToHsl(r, g, b));
      const hues = hslValues.map(([h]) => h).sort((a, b) => a - b);
      const sats = hslValues.map(([, s]) => s).sort((a, b) => a - b);
      const brights = hslValues.map(([, , l]) => l).sort((a, b) => a - b);
      const medianHue = hues[Math.floor(hues.length / 2)] / 360.0; // normalize to 0.0–1.0
      const medianSat = sats[Math.floor(sats.length / 2)]; // already 0.0–1.0
      const medianBright = brights[Math.floor(brights.length / 2)]; // already 0.0–1.0

      // Append median hue, median saturation, and median brightness (total: 54 floats)
      colorArray.push(medianHue);
      colorArray.push(medianSat);
      colorArray.push(medianBright);

      api.sendShaderColors(colorArray);
    };

    // Send on mount
    sendThemeColorsToShader();

    // Listen for theme/color changes
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Trigger update on any style change
      setTimeout(sendThemeColorsToShader, 50);
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    window.addEventListener('juicecut.theme-changed', handler);

    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
      window.removeEventListener('juicecut.theme-changed', handler);
    };
  }, []);

  // Apply saved elevatedPanelDarkenAmount on mount
  useEffect(() => {
    try {
      const v = window.localStorage.getItem('juicecut.settings.elevatedPanelDarkenAmount');
      if (v) {
        const pct = Number(v);
        if (!Number.isNaN(pct) && pct >= 0 && pct <= 100) {
          let overlayColor: string;
          if (pct <= 50) {
            const factor = pct / 50;
            const a = 1 - factor;
            overlayColor = `rgba(255,255,255,${a.toFixed(3)})`;
          } else {
            const factor = (pct - 50) / 50;
            overlayColor = `rgba(0,0,0,${factor.toFixed(3)})`;
          }
          document.documentElement.style.setProperty('--modal-overlay-bg', overlayColor);
        }
      }
    } catch {}
  }, []);

  // Apply saved elevatedPanelBlurAmount on mount
  useEffect(() => {
    try {
      const v = window.localStorage.getItem('juicecut.settings.elevatedPanelBlurAmount');
      if (v) {
        const pct = Number(v);
        if (!Number.isNaN(pct) && pct >= 0 && pct <= 100) {
          const blurPx = (pct / 100) * 50;
          document.documentElement.style.setProperty('--modal-overlay-blur', `${blurPx}px`);
        }
      }
    } catch {}
  }, []);



  // Determine if background should be locked
  const blockBackground = !allowEditsWhenMenuOpen && hasModalOpen;

  const [showExport, setShowExport] = useState(false);
  const totalFrames = clips.reduce((max, c) => Math.max(max, c.endFrame), 0);

  const snapshot = useCallback(() => ({
    clips: JSON.parse(JSON.stringify(clips)),
    mediaItems: Array.from(mediaItems.entries()),
    selectedIds: [...selectedIds],
    playhead,
    settings: { playheadTop, includeResizeInUndo },
    layout: { leftWidthPct, timelineHeightPct }
  }), [clips, mediaItems, selectedIds, playhead, playheadTop, includeResizeInUndo, leftWidthPct, timelineHeightPct]);

  const restore = useCallback((snap: any) => {
    try {
      setClips(Array.isArray(snap?.clips) ? snap.clips : []);
      setMediaItems(new Map(Array.isArray(snap?.mediaItems) ? snap.mediaItems : []));
      setSelectedIds(Array.isArray(snap?.selectedIds) ? snap.selectedIds : []);
      setPlayhead(typeof snap?.playhead === 'number' ? snap.playhead : 0);
      if (snap?.settings) {
        if (typeof snap.settings.playheadTop === 'number') {
          const v = snap.settings.playheadTop;
          setPlayheadTop(v >= 0 && v <= 100 ? v : 15);
        }
        setIncludeResizeInUndo(typeof snap.settings.includeResizeInUndo === 'boolean' ? snap.settings.includeResizeInUndo : includeResizeInUndo);
      }
      if (snap?.layout) {
        setLeftWidthPct(typeof snap.layout.leftWidthPct === 'number' ? snap.layout.leftWidthPct : leftWidthPct);
        setTimelineHeightPct(typeof snap.layout.timelineHeightPct === 'number' ? snap.layout.timelineHeightPct : timelineHeightPct);
      }
    } catch (err) {
      console.warn('Failed to restore snapshot', err);
    }
  }, [setClips, setMediaItems, setSelectedIds, setPlayhead, playheadTop, includeResizeInUndo, leftWidthPct, timelineHeightPct]);

  // Listen for settings changes from the Settings modal
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === 'elevatedPanelDarkenAmount' && typeof detail.value === 'number') {
        const pct = detail.value;
        let overlayColor: string;
        if (pct <= 50) {
          const factor = pct / 50;
          const a = 1 - factor;
          overlayColor = `rgba(255,255,255,${a.toFixed(3)})`;
        } else {
          const factor = (pct - 50) / 50;
          overlayColor = `rgba(0,0,0,${factor.toFixed(3)})`;
        }
        document.documentElement.style.setProperty('--modal-overlay-bg', overlayColor);
      }
      if (detail?.key === 'elevatedPanelBlurAmount' && typeof detail.value === 'number') {
        const pct = detail.value;
        const blurPx = (pct / 100) * 50;
        document.documentElement.style.setProperty('--modal-overlay-blur', `${blurPx}px`);
      }
      // Force re-render when allowEditsWhenMenuOpen changes
      if (detail?.key === 'allowEditsWhenMenuOpen') {
        setHasModalOpen(prev => prev); // trigger re-render
      }
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.includeResizeInUndo', includeResizeInUndo ? 'true' : 'false'); } catch {}
  }, [includeResizeInUndo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if graph editor already handled undo/redo via capture phase
      if ((window as any).__graphUndoRedoHandled) {
        (window as any).__graphUndoRedoHandled = false;
        return;
      }
      
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); return; }
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); history.undo(snapshot(), restore); }
      if (e.ctrlKey && ((e.shiftKey && e.key.toLowerCase() === 'z') || (e.altKey && e.key.toLowerCase() === 'z') || (e.key.toLowerCase() === 'y' && !e.altKey && !e.shiftKey))) { e.preventDefault(); history.redo(snapshot(), restore); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [history, snapshot, restore]);

  useEffect(() => {
    if (playing) {
      playIntervalRef.current = setInterval(() => {
        setPlayhead(p => { if (p >= totalFrames) { setPlaying(false); return p; } return p + 1; });
      }, 1000 / FPS);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [playing, totalFrames]);

  // Window controls (Electron only)
  const sendWindowCommand = useCallback((command: 'minimize' | 'maximize' | 'close') => {
    const api = window.electronAPI;
    if (command === 'minimize') api?.minimizeWindow();
    if (command === 'maximize') api?.toggleMaximizeWindow();
    if (command === 'close') api?.closeWindow();
  }, []);

  // Track mouse position for custom cursor overlay (sent to main process → forwarded to shader_window)
  // Listen to BOTH mousemove and pointermove — pointermove is needed because
  // the Splitter component uses pointer events for dragging, and during a
  // pointer drag the browser can suppress mousemove events.
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    const mouseHandler = (e: MouseEvent) => {
      api.sendCursorPosition({ x: e.clientX, y: e.clientY });
    };
    const pointerHandler = (e: PointerEvent) => {
      api.sendCursorPosition({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener('mousemove', mouseHandler);
    document.addEventListener('pointermove', pointerHandler);
    return () => {
      document.removeEventListener('mousemove', mouseHandler);
      document.removeEventListener('pointermove', pointerHandler);
    };
  }, []);

  // Styles back/close: goes back one level if inside a sub-page, otherwise closes
  const handleStyleBackOrClose = useCallback(() => {
    if (stylePage) {
      const parentId = parentMap[stylePage] || null;
      setStylePage(parentId);
    } else {
      setShowStyle(false);
    }
  }, [stylePage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') { e.preventDefault(); setSelectedIds([]); }
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
      if (isShortcutMatch('exitModal', e)) {
        // Don't intercept when typing in inputs
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
        if (modalManager.closeTop()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // React-state modals
        if (showExport) { e.preventDefault(); setShowExport(false); return; }
        if (showStyle) { e.preventDefault(); handleStyleBackOrClose(); return; }
      }
      // Toggle torus menu shortcut
      if (isShortcutMatch('toggleTorusMenu', e)) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
        e.preventDefault();
        // Skip if TorusMenuEditor is open — it handles the shortcut itself
        if (modalManager.isOpen('torusMenuEditor')) return;
        // Dispatch event to toggle torus menu
        window.dispatchEvent(new CustomEvent('juicecut-torus-toggle'));
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [showExport, showStyle, handleStyleBackOrClose]);

  const handleAddMedia = useCallback(async (files: FileList) => {
    history.push(snapshot());
    const supportedFiles = Array.from(files).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      return ['mp4', 'mkv', 'mov', 'webm', 'mp3', 'ogg', 'wav', 'aac', 'png', 'jpg', 'jpeg', 'avif', 'gif', 'webp'].includes(ext);
    });

    for (const file of supportedFiles) {
      if (!isMountedRef.current) return;
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const isVideo = ['mp4', 'mkv', 'mov', 'webm'].includes(ext);
      const isAudio = ['mp3', 'ogg', 'wav', 'aac'].includes(ext);
      const type: MediaItem['type'] = isVideo ? 'video' : isAudio ? 'audio' : 'image';
      const src = URL.createObjectURL(file);
      const duration = await loadMediaDuration(file, type);
      if (!isMountedRef.current) {
        revokeMediaResources([{ src }]);
        return;
      }
      const thumbnail = await generateThumbnail(file, type);
      if (!isMountedRef.current) {
        revokeMediaResources([{ src }]);
        return;
      }
      const item: MediaItem = { id: generateId(), name: file.name, type, file, src, duration, thumbnail };
      setMediaItems(previous => {
        const next = new Map(previous);
        next.set(item.id, item);
        return next;
      });
    }
  }, [history, snapshot]);

  const handleDropMediaPool = useCallback((e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.files.length) handleAddMedia(e.dataTransfer.files); }, [handleAddMedia]);
  const handleDragOverMediaPool = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }, []);

  const handleRemoveMedia = useCallback((id: string) => {
    history.push(snapshot());
    const item = mediaItems.get(id);
    if (item) revokeMediaResources([item]);
    setMediaItems(previous => {
      if (!previous.has(id)) return previous;
      const next = new Map(previous);
      next.delete(id);
      return next;
    });
    setClips(prev => prev.filter(c => c.mediaId !== id));
  }, [mediaItems, history, snapshot]);

  const {
    handleDropMedia, handleSelectClip, handleNudge, handleSplitClip,
    handleTrimLatter, handleTrimFormer, handleJoin, handleFadeChange,
    handleStepEdge, handleRollApply,
  } = useTimelineEditor({ mediaItems, setClips, setSelectedIds, history, snapshot });

  const { exportVideo: handleExport } = useExportJob({ clips, mediaItems, totalFrames });

  const rollClip = rollClipId ? clips.find(c => c.id === rollClipId) ?? null : null;
  const rollMedia = rollClip ? mediaItems.get(rollClip.mediaId) ?? null : null;

  // Toggle cursor visibility based on config.custom_cursor
  useEffect(() => {
    let injectedStyleTag: HTMLStyleElement | null = null;
    fetch('/config.json')
      .then(r => r.json())
      .then(cfg => {
        if (cfg?.custom_cursor) {
          // ENABLE CUSTOM CURSOR MODE
          document.body.classList.add('cursor-hidden');
          // Inject the nuclear option just in case
          injectedStyleTag = document.createElement('style');
          injectedStyleTag.innerHTML = '* { cursor: none !important; }';
          document.head.appendChild(injectedStyleTag);
        } else {
          // DISABLE CUSTOM CURSOR MODE (Revert to normal)
          document.body.classList.remove('cursor-hidden');
          document.documentElement.style.cursor = '';
          document.body.style.cursor = '';
          // Remove injected style if it exists
          if (injectedStyleTag && injectedStyleTag.parentNode) {
            injectedStyleTag.parentNode.removeChild(injectedStyleTag);
          }
        }
      })
      .catch(() => {});
    // Cleanup on unmount
    return () => {
      if (injectedStyleTag && injectedStyleTag.parentNode) {
        injectedStyleTag.parentNode.removeChild(injectedStyleTag);
      }
    };
  }, []);

  //add cursor: 'none' in the style=({}) section in the
  //<div id="editor-container"> 
  return (
    <div id="editor-container" style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
    <div className="app-shell">
      {/* Background blocking overlay: sits below modal/torus overlays (z-index 199 vs 200) */}
      {blockBackground && (
        <div
          className="app-bg-lock"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 199,
            background: 'transparent',
            pointerEvents: 'auto',
          }}
        />
      )}
      {Array.from(mediaItems.values()).map(item =>
        item.type === 'video' ? (
          <video key={item.id} id={`vid-${item.id}`} src={item.src} style={{ display: 'none' }} preload="auto" muted />
        ) : item.type === 'audio' ? (
          <audio key={item.id} id={`aud-${item.id}`} src={item.src} style={{ display: 'none' }} preload="auto" />
        ) : null
      )}
      <header className="app-header">
        <div className="app-logo">
          <img src="/src/67_editing_software.ico" alt="67 editing software" style={{ width: 22, height: 22, transform: 'translateY(0px)', }} />
        

          {/*67 editing software title*/}
          <span style={{
            fontSize: header_font_size,
            color: 'var(--text-secondary)',
            fontWeight: 500,
            verticalAlign: 'bottom',
            transform: 'translateY(1px)',
            position: 'relative',
            minWidth: '200px',      // 🔥 Reserve space for "fps: 999"
            }}>67 editing software | fps: {shaderFps ?? '--'}</span>
          {/* fps counter title */}
        </div>

        
        <div style={{ display: 'flex', gap: TOP_BAR_MENU_BUTTONS_SPACING, alignItems: 'center', marginLeft: WINDOW_BUTTONS_SPACING }}>
          <button className="icon-btn" onClick={() => {
            const result = modalManager.requestOpen('styles');
            if (!result.allowed) {
              multipleMenusToast.show();
              return;
            }
            modalManager.registerClose(result.id!, () => setShowStyle(false));
            setShowStyle(true);
          }} title="Style">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C12 2 5 10 5 15c0 3.866 3.134 7 7 7s7-3.134 7-7c0-5-7-13-7-13z"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={() => {
            OpenShaderSelector();
          }} title="Shaders">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L6.82 21 12 17.27 17.18 21l-.64-7.26L22 9.24l-7.19-.61z"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={() => {
            OpenSettings({ tab: 'misc' }, null);
          }} title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: WINDOW_BUTTONS_SPACING, alignItems: 'center' }}>
          <button className="status-dot" data-color="yellow" title="Minimize" onClick={() => sendWindowCommand('minimize')} style={{ width: WINDOW_BUTTONS_SIZE, height: WINDOW_BUTTONS_SIZE }} />
          <button className="status-dot" data-color="green" title="Maximize" onClick={() => sendWindowCommand('maximize')} style={{ width: WINDOW_BUTTONS_SIZE, height: WINDOW_BUTTONS_SIZE }} />
          <button className="status-dot" data-color="red" title="Close" onClick={() => sendWindowCommand('close')} style={{ width: WINDOW_BUTTONS_SIZE, height: WINDOW_BUTTONS_SIZE }} />
        </div>
      </header>
      <div
        className="workspace"
        style={{
          '--timeline-height': `${timelineHeightPct}vh`,
          '--left-width': leftCollapsed ? '36px' : `${leftWidthPct}vw`,
          '--vsplit-width': leftCollapsed ? '0px' : '8px',
        } as React.CSSProperties}
      >
        <div className="workspace-panel-mediapool" onDrop={handleDropMediaPool} onDragOver={handleDragOverMediaPool}>
          {!leftCollapsed && (
            <MediaPool items={Array.from(mediaItems.values())} selectedMediaId={selectedMediaId} onSelect={setSelectedMediaId} onAdd={handleAddMedia} onRemove={handleRemoveMedia} />
          )}
        </div>

        {!leftCollapsed && (
          <div className="workspace-vsplit">
             <Splitter orientation="vertical" onChange={(dx) => {
               const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
               const dxPct = dx / viewportWidth * 100;
               setLeftWidthPct(w => Math.max(5, Math.min(50, w + dxPct)));
             }} onDragEnd={() => { history.push({ ...snapshot(), __meta: { type: 'resize' } }); }} />
          </div>
        )}

        <div className="workspace-panel-viewer">
          <Viewer clips={clips} mediaItems={mediaItems} playhead={playhead} playing={playing} totalFrames={totalFrames} onExport={() => {
            const result = modalManager.requestOpen('export');
            if (!result.allowed) {
              multipleMenusToast.show();
              return;
            }
            modalManager.registerClose(result.id!, () => setShowExport(false));
            setShowExport(true);
          }} />
          <ViewerControls
            style={{ marginTop: 'auto' }}
            clips={clips}
            mediaItems={mediaItems}
            playhead={playhead}
            playing={playing}
            totalFrames={totalFrames}
            onPlayPause={() => setPlaying(p => !p)}
            onSeek={setPlayhead}
          />
        </div>

        <div className="workspace-hsplit">
          <Splitter orientation="horizontal" thickness={8} onChange={(dy) => {
            const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
            const dyPct = dy / viewportHeight * 100;
            setTimelineHeightPct(h => Math.max(15, Math.min(60, h - dyPct)));
          }} onDragEnd={() => { history.push({ ...snapshot(), __meta: { type: 'resize' } }); }} />
        </div>

        <Timeline clips={clips} tracks={TRACKS} mediaItems={mediaItems} playhead={playhead} selectedIds={selectedIds} onSeek={setPlayhead} onDropMedia={handleDropMedia} onSelectClip={handleSelectClip} onSplitClip={handleSplitClip} onTrimLatter={handleTrimLatter} onTrimFormer={handleTrimFormer} onNudge={handleNudge} onJoin={handleJoin} onFadeChange={handleFadeChange} onRoll={setRollClipId} onStepEdge={handleStepEdge} totalFrames={totalFrames} />
      </div>
      {showExport && (
        <DraggableModal
          title="Export"
          onClose={() => {
            modalManager.close('export');
            setShowExport(false);
          }}
          style={{ width: 400 }}
          body={
            <div className="settings-panel-content">
              <span style={{ color: 'var(--text-secondary)' }}>Export the video track as a WebM file.</span>
              <button
                className="btn-primary"
                style={{ alignSelf: 'center', padding: '8px 32px', background: 'var(--input-field)' }}
                onClick={() => {
                  modalManager.close('export');
                  setShowExport(false);
                  void handleExport();
                }}
              >
                Export video
              </button>
            </div>
          }
        />
      )}
      <StylesModal showStyle={showStyle} setShowStyle={(v) => {
        setShowStyle(v);
        if (!v) modalManager.close('styles');
      }} stylePage={stylePage} setStylePage={setStylePage} />
      {rollClip && rollMedia && (
        <RollDialog clip={rollClip} media={rollMedia} onClose={() => setRollClipId(null)} onApply={handleRollApply} />
      )}
      </div>
      

    </div>
  );
}

export default function App() {
  return (
    <HistoryProvider>
      <AppContent />
    </HistoryProvider>
  );
}