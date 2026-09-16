import { useEffect, useState } from 'react';
import { dispatchSettingsChanged } from './settingsEvents';
import { DEFAULT_SETTINGS, type SettingsValues, type TimecodePanel, type TorusScrollingDisabled, type ViewerControlsType, type ZoomEpicenter } from './settingsDefaults';

type NumericSetting = { kind: 'number'; default: number; min: number; max: number };
type BooleanSetting = { kind: 'boolean'; default: boolean };
type EnumSetting<T extends string> = { kind: 'enum'; default: T; values: readonly T[] };
type SettingSchema = { [K in keyof SettingsValues]: NumericSetting | BooleanSetting | EnumSetting<string> };

export const SETTINGS_SCHEMA: SettingSchema = {
  guiScale: { kind: 'number', default: DEFAULT_SETTINGS.guiScale, min: 50, max: 200 },
  includeResizeInUndo: { kind: 'boolean', default: DEFAULT_SETTINGS.includeResizeInUndo },
  zoomEpicenter: { kind: 'enum', default: DEFAULT_SETTINGS.zoomEpicenter, values: ['playneedle', 'middle', 'cursor'] },
  scrollSmooth: { kind: 'number', default: DEFAULT_SETTINGS.scrollSmooth, min: 0, max: 100 },
  scrollAmount: { kind: 'number', default: DEFAULT_SETTINGS.scrollAmount, min: 1, max: 400 },
  scrollZoomAmount: { kind: 'number', default: DEFAULT_SETTINGS.scrollZoomAmount, min: 1, max: 100 },
  scrollZoomSmoothness: { kind: 'number', default: DEFAULT_SETTINGS.scrollZoomSmoothness, min: 0, max: 100 },
  viewerControlsType: { kind: 'enum', default: DEFAULT_SETTINGS.viewerControlsType, values: ['compact', 'centered'] },
  timecodePanel: { kind: 'enum', default: DEFAULT_SETTINGS.timecodePanel, values: ['timeline', 'viewer', 'both', 'none'] },
  torusScrollingDisabled: { kind: 'enum', default: DEFAULT_SETTINGS.torusScrollingDisabled, values: ['whole torus menu', 'annular sectors only', 'none'] },
  elevatedPanelDarken: { kind: 'number', default: DEFAULT_SETTINGS.elevatedPanelDarken, min: 0, max: 100 },
  elevatedPanelBlur: { kind: 'number', default: DEFAULT_SETTINGS.elevatedPanelBlur, min: 0, max: 100 },
  draggableHeaderButtons: { kind: 'boolean', default: DEFAULT_SETTINGS.draggableHeaderButtons },
  allowMultipleMenus: { kind: 'boolean', default: DEFAULT_SETTINGS.allowMultipleMenus },
  allowEditsWhenMenuOpen: { kind: 'boolean', default: DEFAULT_SETTINGS.allowEditsWhenMenuOpen },
  executeHeaderButtonsOnDrag: { kind: 'boolean', default: DEFAULT_SETTINGS.executeHeaderButtonsOnDrag },
  playneedle_t: { kind: 'number', default: DEFAULT_SETTINGS.playneedle_t, min: 0, max: 1 },
  playneedle_j: { kind: 'number', default: DEFAULT_SETTINGS.playneedle_j, min: 0, max: 1 },
  playneedle_k: { kind: 'number', default: DEFAULT_SETTINGS.playneedle_k, min: 0, max: 1000 },
  playneedle_s: { kind: 'number', default: DEFAULT_SETTINGS.playneedle_s, min: 0, max: 100 },
  playneedle_v_o: { kind: 'number', default: DEFAULT_SETTINGS.playneedle_v_o, min: 0, max: 1 },
  playneedle_h_b: { kind: 'number', default: DEFAULT_SETTINGS.playneedle_h_b, min: 0, max: 1 },
  playneedle_h_r: { kind: 'number', default: DEFAULT_SETTINGS.playneedle_h_r, min: 0, max: 1 },
  playneedleIconHorizontalStretch: { kind: 'number', default: DEFAULT_SETTINGS.playneedleIconHorizontalStretch, min: 0, max: 2 },
  colorTransitionDuration: { kind: 'number', default: DEFAULT_SETTINGS.colorTransitionDuration, min: 0, max: 1000 },
};

function storageKey(key: keyof SettingsValues): string {
  const legacyKeys: Partial<Record<keyof SettingsValues, string>> = {
    elevatedPanelDarken: 'juicecut.settings.elevatedPanelDarkenAmount',
    elevatedPanelBlur: 'juicecut.settings.elevatedPanelBlurAmount',
  };
  return legacyKeys[key] ?? `juicecut.settings.${key}`;
}

function readSetting<K extends keyof SettingsValues>(key: K): SettingsValues[K] {
  const definition = SETTINGS_SCHEMA[key];
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (raw === null) return definition.default as SettingsValues[K];
    if (definition.kind === 'boolean') return (raw === 'true') as SettingsValues[K];
    if (definition.kind === 'enum') return (definition.values.includes(raw) ? raw : definition.default) as SettingsValues[K];
    return normalizeSetting(key, Number(raw) as SettingsValues[K]);
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
