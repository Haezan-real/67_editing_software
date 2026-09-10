import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { RotateCcw } from 'lucide-react';
import Splitter from './Splitter';

// Additional imports for portal functionality
interface Props {
  value: string; // hex color like #rrggbb
  onChange: (hex: string) => void;
  fullScreen?: boolean;
  autoOpen?: boolean;
  onClose?: () => void;
  targetElement?: string;
}

function clamp(n: number, a = 0, b = 255) { return Math.min(b, Math.max(a, Math.round(n))); }

function hexToRgb(hex: string) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const h = hex.replace('#','');
  if (h.length === 3) {
    return {
      r: parseInt(h[0]+h[0], 16),
      g: parseInt(h[1]+h[1], 16),
      b: parseInt(h[2]+h[2], 16),
    };
  }
  return {
    r: parseInt(h.substring(0,2), 16),
    g: parseInt(h.substring(2,4), 16),
    b: parseInt(h.substring(4,6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// HSL helpers
function hslToRgb(h: number, s: number, l: number) {
  // h in [0,360], s,l in [0,1]
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hh >= 0 && hh < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (hh >= 1 && hh < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (hh >= 2 && hh < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (hh >= 3 && hh < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (hh >= 4 && hh < 5) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  const m = l - c/2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hslCss(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// Format title: cap at 2 lines, truncate with "…" if needed
function formatTitle(text: string | undefined): string {
  if (!text) return '';
  const maxCharsPerLine = 29;
  const maxLines = 2;
  const maxTotalChars = maxCharsPerLine * maxLines;
  
  if (text.length <= maxTotalChars) {
    // Check if we need to split into 2 lines
    if (text.length > maxCharsPerLine) {
      // Find a good split point (space or hyphen)
      let splitPoint = text.lastIndexOf(' ', maxCharsPerLine);
      if (splitPoint === -1) splitPoint = text.lastIndexOf('-', maxCharsPerLine);
      if (splitPoint === -1) splitPoint = maxCharsPerLine;
      
      const line1 = text.slice(0, splitPoint);
      const line2 = text.slice(splitPoint + 1);
      return `${line1}\n${line2}`;
    }
    return text;
  }
  
  // Truncate with "…"
  const truncated = text.slice(0, maxTotalChars - 1);
  // Find a good split point for the first line
  let splitPoint = truncated.lastIndexOf(' ', maxCharsPerLine);
  if (splitPoint === -1) splitPoint = maxCharsPerLine;
  
  const line1 = truncated.slice(0, splitPoint);
  const line2 = truncated.slice(splitPoint + 1);
  return `${line1}\n${line2}…`;
}

export default function ColorPicker({ value, onChange, fullScreen, autoOpen, onClose, targetElement }: Props) {
  // Format the title for display
  const title = formatTitle(targetElement);
  const [open, setOpen] = useState(!!autoOpen);
  const [hex, setHex] = useState(value || '#000000');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [previousHex, setPreviousHex] = useState(value || '#000000');

  // State for splitter
  const [colorPreviewWidth, setColorPreviewWidth] = useState(100);
  const [hexInputWidth, setHexInputWidth] = useState(112);

  const [borderMidColor, setBorderMidColor] = useState('transparent');
  const [borderDarkColor, setBorderDarkColor] = useState('transparent');

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setBorderMidColor(styles.getPropertyValue('--border-mid').trim() || 'transparent');
    setBorderDarkColor(styles.getPropertyValue('--border').trim() || 'transparent');
  }, []);
  // use H, S(0-1), L(0-1)
  const initHsl = hexToHsl(value || '#000000');
  const [hue, setHue] = useState(initHsl.h || 0);
  const [sat, setSat] = useState(initHsl.s || 0);
  const [light, setLight] = useState((initHsl.l || 0) * 100);
  const lightRef = useRef(light);
  useEffect(() => {
    lightRef.current = light;
  }, [light]);
  const ref = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const skipBlurApplyRef = useRef(false);
  const hexRef = useRef(hex);
  const onChangeRef = useRef(onChange);
  const isInputFocusedRef = useRef(isInputFocused);
  useEffect(() => { hexRef.current = hex; }, [hex]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { isInputFocusedRef.current = isInputFocused; }, [isInputFocused]);

  useEffect(() => {
    setHex(value || '#000000');
    const hsl = hexToHsl(value || '#000000');
    setHue(hsl.h || 0);
    setSat(hsl.s || 0);
    setLight((hsl.l || 0) * 100);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = ref.current && ref.current.contains(target);
      const insidePopover = popoverRef.current && popoverRef.current.contains(target);

      if (isInputFocused) {
        // If undo button was clicked (skipBlurApplyRef set), don't apply typed hex
        if (!skipBlurApplyRef.current) {
          onChange(hexRef.current);
        }
        setIsInputFocused(false);
        // If click was outside popover, still close it
        if (!insideTrigger && !insidePopover) {
          setOpen(false);
        }
      } else {
        // If click was outside popover, proceed with normal close logic
        if (!insideTrigger && !insidePopover) setOpen(false);
      }
    }
    if (open && !fullScreen) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, fullScreen]);

  function updatePopoverPos() {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const preferredWidth = 300; // approx popover width
    const preferredHeight = 320; // approx popover height
    let left = rect.left;
    if (left + preferredWidth > window.innerWidth) left = Math.max(8, window.innerWidth - preferredWidth - 8);
    let top = rect.bottom + 8;
    if (top + preferredHeight > window.innerHeight) {
      top = rect.top - preferredHeight - 8;
      if (top < 8) top = 8;
    }
    setPos({ left, top });
  }

  useEffect(() => {
    if (!open || fullScreen) return;
    updatePopoverPos();
    window.addEventListener('resize', updatePopoverPos);
    window.addEventListener('scroll', updatePopoverPos, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPos);
      window.removeEventListener('scroll', updatePopoverPos, true);
    };
  }, [open, fullScreen]);

  useEffect(() => {
    if (!open) setDragPos(null);
    if (!open) {
      // Then notify parent when the picker closes (this will unmount the color picker)
      try { onClose && onClose(); } catch (e) {}
    }
  }, [open]);

  function applyRgb(r: number, g: number, b: number) {
    const h = rgbToHex(r,g,b);
    setHex(h);
    onChange(h);
  }

  function onHexChange(raw: string) {
    const v = raw.trim();
    setHex(v);
    // Only update color preview for valid 6-char hex during typing
    // Don't auto-expand 3-char hex until blur to avoid premature filling
    if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
      const h = (v.startsWith('#')?v:'#'+v);
      const hs = hexToHsl(h);
      setHue(hs.h || 0); setSat(hs.s || 0); setLight((hs.l||0)*100);
    }
  }

  // draw canvas-based hue/sat wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 220;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const cx = w/2;
    const cy = h/2;
    const radius = Math.min(cx, cy);
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.sqrt(dx*dx + dy*dy);
        const idx = (y * w + x) * 4;
        if (r > radius) {
          img.data[idx+0] = 0; img.data[idx+1] = 0; img.data[idx+2] = 0; img.data[idx+3] = 0;
          continue;
        }
        let angle = Math.atan2(dy, dx) * 180 / Math.PI; // -180..180
        if (angle < 0) angle += 360;
        const hHue = angle;
        const s = Math.min(1, r / radius);
        const l = light / 100; // use current lightness to render
        const { r: rr, g: gg, b: bb } = hslToRgb(hHue, s, l);
        img.data[idx+0] = rr;
        img.data[idx+1] = gg;
        img.data[idx+2] = bb;
        img.data[idx+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [light, hue, sat]);

  // pointer handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onPointer = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
      const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
      const cx = canvas.width/2;
      const cy = canvas.height/2;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx*dx + dy*dy);
      const radius = Math.min(cx, cy);

      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      const s = Math.min(1, r / radius);
      setHue(angle);
      setSat(s);
      // update preview hex
      const previewHex = hslToHex(angle, s, lightRef.current/100);
      setHex(previewHex);
      if (!isInputFocusedRef.current) {
        onChangeRef.current(previewHex);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (draggingRef.current) onPointer(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      draggingRef.current = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (isInputFocusedRef.current) {
        onChangeRef.current(hexRef.current);
        setIsInputFocused(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      const cx = canvas.width/2;
      const cy = canvas.height/2;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx*dx + dy*dy);
      const radius = Math.min(cx, cy);

      // if (r > radius) return; // Removed this check

      draggingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      onPointer(e);
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // compute preview hex when hue/sat/light change
  useEffect(() => {
    const h = hslToHex(hue, sat, light/100);
    setHex(h);
  }, [hue, sat, light]);

  const body = (
    <div className="color-popover-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {title && (
        <div className="color-picker-title">
          {title.split('\n').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div className="color-wheel" style={{ position: 'relative', width: 220, height: 220, borderRadius: '50%', boxShadow: `0 0 0 1px ${borderMidColor}, 0 0 0 2px ${borderDarkColor}` }}>
              <canvas ref={canvasRef} style={{ borderRadius: '50%', display: 'block' }} />
              {/* selection indicator (non-interactive so events reach the canvas) */}
              <div
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${Math.cos(hue * Math.PI/180) * sat * 50}% - 6px)`,
                  top: `calc(50% + ${Math.sin(hue * Math.PI/180) * sat * 50}% - 6px)`,
                  width: 12,
                  height: 12,
                  borderRadius: 9999,
                  border: '2px solid white',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.5)',
                  pointerEvents: 'none'
                }}
              />
            </div>

        <div style={{ width: 220 }}>
          <input
            className="color-lightness-slider"
            aria-label="Lightness"
            type="range"
            min={0}
            max={100}
            value={light}
            onInput={e => {
              const newLight = Number((e.target as HTMLInputElement).value);
              if (isInputFocused) {
                onChange(hex);
                setIsInputFocused(false);
              }
              setLight(newLight);
              const previewHex = hslToHex(hue, sat, newLight / 100);
              setHex(previewHex);
              onChange(previewHex);
            }}
            style={{
              width: '100%',
              height: 24,
              background: `linear-gradient(to right, ${hslCss(hue, sat, 0)}, ${hslCss(hue, sat, 0.5)}, ${hslCss(hue, sat, 1)})`,
              WebkitAppearance: 'none',
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, width: 220 }}>
        <div className="color-preview-large" style={{ width: colorPreviewWidth, height: 28, background: hex }} />
        <Splitter
          orientation="vertical"
          onChange={(dx) => {
            const MIN_COLOR_PREVIEW_WIDTH = 50; // px
            const MIN_HEX_INPUT_WIDTH = 92; // px (for 7 chars + undo button)
            const currentTotalWidth = colorPreviewWidth + hexInputWidth; // Sum of current widths

            let newColorPreviewWidth = colorPreviewWidth + dx;
            let newHexInputWidth = hexInputWidth - dx;

            // Enforce minimums
            if (newColorPreviewWidth < MIN_COLOR_PREVIEW_WIDTH) {
              newColorPreviewWidth = MIN_COLOR_PREVIEW_WIDTH;
              newHexInputWidth = currentTotalWidth - MIN_COLOR_PREVIEW_WIDTH;
            } else if (newHexInputWidth < MIN_HEX_INPUT_WIDTH) {
              newHexInputWidth = MIN_HEX_INPUT_WIDTH;
              newColorPreviewWidth = currentTotalWidth - MIN_HEX_INPUT_WIDTH;
            }

            setColorPreviewWidth(newColorPreviewWidth);
            setHexInputWidth(newHexInputWidth);
          }}
          background={'rgba(255,255,255,0.2)'}
        />
        <div style={{ width: hexInputWidth, position: 'relative' }}>
          <input
            className="color-hex-input"
            value={hex}
            onChange={e => onHexChange(e.target.value)}
            onFocus={() => {
              setIsInputFocused(true);
              setPreviousHex(hex);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            onBlur={() => {
              setIsInputFocused(false);
              // If undo button triggered blur, skip applying
              if (skipBlurApplyRef.current) {
                skipBlurApplyRef.current = false;
                return;
              }
              const v = hex.trim();
              let normalized: string;
              if (/^#?[0-9a-fA-F]{3}$/.test(v)) {
                // Expand 3-char hex shorthand
                const raw = v.replace('#', '');
                normalized = '#' + raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
              } else if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
                normalized = v.startsWith('#') ? v : '#' + v;
              } else {
                // Invalid hex - revert to original
                normalized = value;
              }
              setHex(normalized);
              onChange(normalized);
              const hs = hexToHsl(normalized);
              setHue(hs.h || 0); setSat(hs.s || 0); setLight((hs.l || 0) * 100);
            }}
            style={{ paddingRight: isInputFocused ? 30 : 8, width: '100%', boxSizing: 'border-box' }} // Adjust padding when button is visible
          />
          {isInputFocused && (
            <button
              type="button"
              className="icon-btn"
              onMouseDown={(e) => {
                // Set flag on mousedown BEFORE blur fires, so onBlur knows to skip
                e.preventDefault();
                skipBlurApplyRef.current = true;
              }}
              onClick={() => {
                setHex(previousHex);
                onChange(previousHex);
                setIsInputFocused(false);
                // Update HSL to match reverted color
                const hs = hexToHsl(previousHex);
                setHue(hs.h || 0); setSat(hs.s || 0); setLight((hs.l || 0) * 100);
                // Unfocus the input programmatically
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
              title="Revert to previous color"
              style={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1,
              }}
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

    </div>
  );

  const shouldStartDrag = (target: EventTarget | null) => {
    if (!target) return false;
    const el = target as HTMLElement;
    if (!el) return false;
    // Don't start drag when interacting with controls.
    if (el.closest('input, button, canvas, .color-wheel')) return false;
    return true;
  };

  const getGuiScale = () => {
    try { const v = window.localStorage.getItem('juicecut.settings.guiScale'); return v ? Number(v) / 100 : 1; } catch { return 1; }
  };

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (!shouldStartDrag(e.target)) return;

    if (isInputFocused) {
      onChange(hex);
      setIsInputFocused(false);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }

    const panel = popoverRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const startLeft = dragPos?.left ?? rect.left;
    const startTop = dragPos?.top ?? rect.top;
    const scale = getGuiScale();
    dragStateRef.current = { startX: e.clientX / scale, startY: e.clientY / scale, startLeft, startTop };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const onDragPointerMove = (e: React.PointerEvent) => {
    const st = dragStateRef.current;
    if (!st) return;
    const scale = getGuiScale();
    const nextLeft = st.startLeft + (e.clientX / scale - st.startX);
    const nextTop = st.startTop + (e.clientY / scale - st.startY);
    // keep at least a small portion on-screen
    const margin = 16;
    const w = popoverRef.current?.offsetWidth ?? 0;
    const h = popoverRef.current?.offsetHeight ?? 0;
    const clampedLeft = Math.min(window.innerWidth - margin, Math.max(margin - w, nextLeft));
    const clampedTop = Math.min(window.innerHeight - margin, Math.max(margin - h, nextTop));
    setDragPos({ left: clampedLeft, top: clampedTop });
  };

  const onDragPointerUp = () => {
    dragStateRef.current = null;
  };

  const inlinePopover = open && !fullScreen && (
    <div
      className="color-popover"
      role="dialog"
      aria-label="Color picker"
      ref={popoverRef}
      onPointerDown={onDragPointerDown}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
      style={dragPos ? { left: dragPos.left, top: dragPos.top, right: 'auto' } : undefined}
    >
      {body}
    </div>
  );

  const fullscreenPopover =
    open && fullScreen
      ? createPortal(
          <div
                  className="color-fullscreen-overlay"
                  onMouseDown={() => setOpen(false)}
                  role="dialog"
                  aria-label="Color picker"
                  style={{ background: 'transparent' }}
                >
                  <div
                    className="color-fullscreen-center"
                    ref={popoverRef}
                    onMouseDown={e => e.stopPropagation()}
                    onPointerDown={onDragPointerDown}
                    onPointerMove={onDragPointerMove}
                    onPointerUp={onDragPointerUp}
                    style={dragPos ? { left: dragPos.left, top: dragPos.top, transform: 'none' } : undefined}
                  >
                    {body}
                  </div>
                </div>,
          document.body
        )
      : null;

  return (
    <div className="color-picker" ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="color-preview"
        style={{ background: hex }}
        onClick={() => setOpen(o => !o)}
        aria-label={`Open color picker (${hex})`}
      />

      {inlinePopover}
      {fullscreenPopover}
    </div>
  );
}

// Programmatic helper: mount a fullscreen ColorPicker immediately
export function OpenColorPicker(initial?: { value?: string; onChange?: (hex: string) => void; targetElement?: string; onClose?: () => void }) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const cleanup = () => {
    try { root.unmount(); } catch (e) {}
    if (container.parentNode) container.parentNode.removeChild(container);
  };
  root.render(
    <ColorPicker
      value={initial?.value || '#00ff88'}
      onChange={(hex) => { try { initial?.onChange?.(hex); } catch {} }}
      fullScreen
      autoOpen
      onClose={initial?.onClose}
      targetElement={initial?.targetElement}
    />
  );
  return cleanup;
}
