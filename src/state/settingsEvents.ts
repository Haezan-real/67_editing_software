export const SETTINGS_CHANGED_EVENT = 'juicecut.settings-changed';

export interface SettingsChangedDetail {
  key: string;
  value: unknown;
}

export function dispatchSettingsChanged(key: string, value: unknown): void {
  window.dispatchEvent(
    new CustomEvent<SettingsChangedDetail>(SETTINGS_CHANGED_EVENT, {
      detail: { key, value },
    }),
  );
}

export function getSettingsChangedDetail(event: Event): SettingsChangedDetail | null {
  const detail = (event as CustomEvent<SettingsChangedDetail>).detail;
  if (!detail || typeof detail.key !== 'string' || !('value' in detail)) return null;
  return detail;
}