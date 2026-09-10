import { useEffect, useState } from 'react';
import { dispatchSettingsChanged } from './settingsEvents';

export type ZoomEpicenter = 'playneedle' | 'middle' | 'cursor';
export type ViewerControlsType = 'compact' | 'centered';
export type TimecodePanel = 'timeline' | 'viewer' | 'both' | 'none';
export type TorusScrollingDisabled = 'whole torus menu' | 'annular sectors only' | 'none';

export interface SettingsValues {
  guiScale: number;
  includeResizeInUndo: boolean;
  zoomEpicenter: ZoomEpicenter;
  scrollSmooth: number;
  scrollAmount: number;
  scrollZoomAmount: number;
  scrollZoomSmoothness: number;
  viewerControlsType: ViewerControlsType;
  timecodePanel: TimecodePanel;
  torusScrollingDisabled: TorusScrollingDisabled;
  elevatedPanelDarken: number;
  elevatedPanelBlur: number;
  draggableHeaderButtons: boolean;
  allowMultipleMenus: boolean;
  allowEditsWhenMenuOpen: boolean;
  executeHeaderButtonsOnDrag: boolean;
  playneedle_t: number;
  playneedle_j: number;
  playneedle_k: number;
  playneedle_s: number;
  playneedle_v_o: number;
  playneedle_h_b: number;
  playneedle_h_r: number;
  playneedleIconHorizontalStretch: number;
  colorTransitionDuration: number;
}

type NumericSetting = { kind: 'number'; default: number; min: number; max: number };
type BooleanSetting = { kind: 'boolean'; default: boolean };
type EnumSetting<T extends string> = { kind: 'enum'; default: T; values: readonly T[] };
type SettingSchema = { [K in keyof SettingsValues]: NumericSetting | BooleanSetting | EnumSetting<string> };

export const SETTINGS_SCHEMA: SettingSchema = {
  guiScale: { kind: 'number', default: 100, min: 50, max: 200 },
  includeResizeInUndo: { kind: 'boolean', default: true },
  zoomEpicenter: { kind: 'enum', default: 'playneedle', values: ['playneedle', 'middle', 'cursor'] },
  scrollSmooth: { kind: 'number', default: 50, min: 0, max: 100 },
  scrollAmount: { kind: 'number', default: 100, min: 1, max: 400 },
  scrollZoomAmount: { kind: 'number', default: 25, min: 1, max: 100 },
  scrollZoomSmoothness: { kind: 'number', default: 70, min: 0, max: 100 },
  viewerControlsType: { kind: 'enum', default: 'compact', values: ['compact', 'centered'] },
  timecodePanel: { kind: 'enum', default: 'both', values: ['timeline', 'viewer', 'both', 'none'] },
  torusScrollingDisabled: { kind: 'enum', default: 'none', values: ['whole torus menu', 'annular sectors only', 'none'] },
  elevatedPanelDarken: { kind: 'number', default: 50, min: 0, max: 100 },
  elevatedPanelBlur: { kind: 'number', default: 0, min: 0, max: 100 },
  draggableHeaderButtons: { kind: 'boolean', default: true },
  allowMultipleMenus: { kind: 'boolean', default: true },
  allowEditsWhenMenuOpen: { kind: 'boolean', default: true },
  executeHeaderButtonsOnDrag: { kind: 'boolean', default: true },
  playneedle_t: { kind: 'number', default: 0.092, min: 0, max: 1 },
  playneedle_j: { kind: 'number', default: 0.049, min: 0, max: 1 },
  playneedle_k: { kind: 'number', default: 103, min: 0, max: 1000 },
  playneedle_s: { kind: 'number', default: 16.4, min: 0, max: 100 },
  playneedle_v_o: { kind: 'number', default: 0.4, min: 0, max: 1 },
  playneedle_h_b: { kind: 'number', default: 0.8, min: 0, max: 1 },
  playneedle_h_r: { kind: 'number', default: 1, min: 0, max: 1 },
  playneedleIconHorizontalStretch: { kind: 'number', default: 0.4, min: 0, max: 2 },
  colorTransitionDuration: { kind: 'number', default: 0, min: 0, max: 1000 },
};

function storageKey(key: keyof SettingsValues): string {
  return `juicecut.settings.${key}`;
}

function readSetting<K extends keyof SettingsValues>(key: K): SettingsValues[K] {
  const definition = SETTINGS_SCHEMA[key];
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (raw === null) return definition.default as SettingsValues[K];
    if (definition.kind === 'boolean') return (raw === 'true') as SettingsValues[K];
    if (definition.kind === 'enum') return (definition.values.includes(raw) ? raw : definition.default) as SettingsValues[K];
    return normalizeSetting(key, Number(raw));
  } catch {
    return definition.default as SettingsValues[K];
  }
}

function normalizeSetting<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]): SettingsValues[K] {
  const definition = SETTINGS_SCHEMA[key];
  if (definition.kind === 'boolean') return (typeof value === 'boolean' ? value : definition.default) as SettingsValues[K];
  if (definition.kind === 'enum') return (typeof value === 'string' && definition.values.includes(value) ? value : definition.default) as SettingsValues[K];
  const numericValue = Number(value);
  return (Number.isFinite(numericValue) ? Math.min(definition.max, Math.max(definition.min, numericValue)) : definition.default) as SettingsValues[K];
}

function readAllSettings(): SettingsValues {
  return (Object.keys(SETTINGS_SCHEMA) as Array<keyof SettingsValues>).reduce((values, key) => {
    values[key] = readSetting(key) as never;
    return values;
  }, {} as SettingsValues);
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsValues>(readAllSettings);

  useEffect(() => {
    (Object.keys(settings) as Array<keyof SettingsValues>).forEach(key => {
      try {
        window.localStorage.setItem(storageKey(key), String(settings[key]));
        dispatchSettingsChanged(key, settings[key]);
      } catch {}
    });
    if (document.documentElement) {
      document.documentElement.style.setProperty('--gui-scale', String(settings.guiScale / 100));
      document.documentElement.style.setProperty('--theme-transition-duration', `${settings.colorTransitionDuration}ms`);
      document.documentElement.style.setProperty('--theme-transition-timing', 'cubic-bezier(0.4, 0, 0.2, 1)');
    }
  }, [settings]);

  const updateSetting = <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => {
    setSettings(previous => ({ ...previous, [key]: normalizeSetting(key, value) }));
  };

  return {
    ...settings,
    setGuiScale: (value: number) => updateSetting('guiScale', value),
    setIncludeResizeInUndo: (value: boolean) => updateSetting('includeResizeInUndo', value),
    setZoomEpicenter: (value: ZoomEpicenter) => updateSetting('zoomEpicenter', value),
    setScrollSmooth: (value: number) => updateSetting('scrollSmooth', value),
    setScrollAmount: (value: number) => updateSetting('scrollAmount', value),
    setScrollZoomAmount: (value: number) => updateSetting('scrollZoomAmount', value),
    setScrollZoomSmoothness: (value: number) => updateSetting('scrollZoomSmoothness', value),
    setViewerControlsType: (value: ViewerControlsType) => updateSetting('viewerControlsType', value),
    setTimecodePanel: (value: TimecodePanel) => updateSetting('timecodePanel', value),
    setTorusScrollingDisabled: (value: TorusScrollingDisabled) => updateSetting('torusScrollingDisabled', value),
    setElevatedPanelDarken: (value: number) => updateSetting('elevatedPanelDarken', value),
    setElevatedPanelBlur: (value: number) => updateSetting('elevatedPanelBlur', value),
    setDraggableHeaderButtons: (value: boolean) => updateSetting('draggableHeaderButtons', value),
    setAllowMultipleMenus: (value: boolean) => updateSetting('allowMultipleMenus', value),
    setAllowEditsWhenMenuOpen: (value: boolean) => updateSetting('allowEditsWhenMenuOpen', value),
    setExecuteHeaderButtonsOnDrag: (value: boolean) => updateSetting('executeHeaderButtonsOnDrag', value),
    setPlayneedle_t: (value: number) => updateSetting('playneedle_t', value),
    setPlayneedle_j: (value: number) => updateSetting('playneedle_j', value),
    setPlayneedle_k: (value: number) => updateSetting('playneedle_k', value),
    setPlayneedle_s: (value: number) => updateSetting('playneedle_s', value),
    setPlayneedle_v_o: (value: number) => updateSetting('playneedle_v_o', value),
    setPlayneedle_h_b: (value: number) => updateSetting('playneedle_h_b', value),
    setPlayneedle_h_r: (value: number) => updateSetting('playneedle_h_r', value),
    setPlayneedleIconHorizontalStretch: (value: number) => updateSetting('playneedleIconHorizontalStretch', value),
    setColorTransitionDuration: (value: number) => updateSetting('colorTransitionDuration', value),
  };
}
