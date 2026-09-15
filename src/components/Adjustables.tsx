import React from 'react';
import { RotateCcw, Plus } from 'lucide-react';

// ─── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onReset: () => void;
  formatValue?: (v: number) => string;
  logScale?: boolean;
}

export function Slider({ label, value, min, max, onChange, onReset, formatValue, logScale }: SliderProps) {
  const defaultFormat = (v: number) => v.toFixed(3);
  const fmt = formatValue || defaultFormat;
  const displayValue = fmt(value);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(displayValue);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const sliderToValue = (slider: number) => {
    if (!logScale) return min + (slider / 1000) * (max - min);
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    return Math.pow(10, logMin + (slider / 1000) * (logMax - logMin));
  };
  const valueToSlider = (val: number) => {
    if (!logScale) return ((val - min) / (max - min)) * 1000;
    return ((Math.log10(val) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * 1000;
  };

  const handleBlur = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(displayValue);
      setIsEditing(false);
    }
  };

  const handleClick = () => {
    setEditValue(displayValue);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  return (
    <div className="settings-field" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ flex: 1, lineHeight: 1.2 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'nowrap',
                background: 'var(--bg-hover)',
                border: '1px solid var(--highlight-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                width: 'ch',
                minWidth: 60,
                outline: 'none',
              }}
            />
          ) : (
            <span
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'nowrap',
                cursor: 'text',
                userSelect: 'all',
                padding: '2px 4px',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                transition: 'background 0.15s',
              }}
              onClick={handleClick}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="Click to edit"
            >
              {displayValue}
            </span>
          )}
          <button type="button" className="icon-btn" onClick={onReset} title="Reset to default" style={{ padding: 4 }}><RotateCcw size={14} /></button>
        </div>
      </div>
      <input type="range" className="settings-range-input" min={0} max={1000} step={1} value={valueToSlider(value)} onChange={e => onChange(sliderToValue(Number(e.target.value)))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}><span>{fmt(min)}</span><span>{fmt(max)}</span></div>
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

interface CheckboxProps {
  label: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  onReset: () => void;
}

export function Checkbox({ label, checked, onChange, onReset }: CheckboxProps) {
  return (
    <div className="settings-field" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ flex: 1, lineHeight: 1.2 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" className="settings-checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <button type="button" className="icon-btn" onClick={onReset} title="Reset to default" style={{ padding: 4 }}><RotateCcw size={14} /></button>
      </div>
    </div>
  );
}

// ─── Multiselect ─────────────────────────────────────────────────────────────

interface MultiselectProps<T extends string> {
  label: React.ReactNode;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  formatOption?: (opt: T) => string;
}

export function Multiselect<T extends string>({ label, options, value, onChange, formatOption }: MultiselectProps<T>) {
  const fmt = formatOption || ((opt: T) => opt.charAt(0).toUpperCase() + opt.slice(1));
  return (
    <div className="settings-field" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <span style={{ lineHeight: 1.2 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(opt => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                padding: '5px 14px',
                borderRadius: 'var(--radius-sm)',
                border: active ? '1px solid var(--highlight-color)' : '1px solid var(--border-mid)',
                background: active ? 'rgba(56,189,248,0.15)' : 'var(--bg-elevated)',
                color: active ? 'var(--highlight-color)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {fmt(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Keybind ──────────────────────────────────────────────────────────────────

interface KeybindProps {
  label: React.ReactNode;
  keys: string[][];
  onChange: (keys: string[][]) => void;
  onReset: () => void;
  onAdd: () => void;
}

function formatKeyCombo(keys: string[]): string {
  const sorted = [...keys].sort((a, b) => {
    const order = ['ctrl', 'shift', 'alt', 'meta'];
    const ia = order.indexOf(a.toLowerCase());
    const ib = order.indexOf(b.toLowerCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
  return sorted.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' + ');
}

export function Keybind({ label, keys, onChange, onReset, onAdd }: KeybindProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const newKeys: string[] = [];
    if (e.ctrlKey || e.metaKey) newKeys.push('ctrl');
    if (e.shiftKey) newKeys.push('shift');
    if (e.altKey) newKeys.push('alt');
    const key = e.key.toLowerCase();
    if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
      newKeys.push(key === ' ' ? 'space' : key);
    }
    if (newKeys.length > 0) {
      const updated = [...keys];
      updated[index] = newKeys;
      onChange(updated);
    }
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    const updated = keys.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : [[]]);
    setEditingIndex(null);
  };

  return (
    <div className="settings-field" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ lineHeight: 1.2 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="icon-btn" onClick={onAdd} title="Add shortcut combination" style={{ padding: 4 }}><Plus size={14} /></button>
          <button type="button" className="icon-btn" onClick={onReset} title="Reset to default" style={{ padding: 4 }}><RotateCcw size={14} /></button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {keys.map((combo, idx) => {
          const isEditing = editingIndex === idx;
          return (
            <div
              key={idx}
              tabIndex={0}
              onFocus={() => setEditingIndex(idx)}
              onBlur={() => { setTimeout(() => setEditingIndex(null), 150); }}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: isEditing ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                border: isEditing ? '1px solid var(--highlight-color)' : '1px solid var(--border-mid)',
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
                cursor: 'pointer',
                outline: 'none',
                minHeight: 28,
              }}
              title={isEditing ? 'Press keys to assign...' : combo.length === 0 ? 'Click then press keys to assign' : 'Click then press new keys to reassign'}
            >
              <span style={{ fontSize: 12, color: combo.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'monospace' }}>
                {isEditing && combo.length === 0 ? '...' : combo.length > 0 ? formatKeyCombo(combo) : 'None'}
              </span>
              {keys.length > 1 && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                  onMouseDown={(e) => { e.stopPropagation(); handleRemove(idx); }}
                  title="Remove this combination"
                >
                  x
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}