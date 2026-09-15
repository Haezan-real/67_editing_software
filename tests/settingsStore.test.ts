import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SETTINGS_SCHEMA, useSettings } from '../src/state/settingsStore';

describe('settings schema', () => {
  it('falls back to defaults and clamps invalid persisted numbers', () => {
    window.localStorage.setItem('juicecut.settings.guiScale', '999');
    window.localStorage.setItem('juicecut.settings.scrollAmount', 'not-a-number');
    const { result } = renderHook(() => useSettings());
    expect(result.current.guiScale).toBe(200);
    expect(result.current.scrollAmount).toBe(100);
  });

  it('normalizes runtime updates to schema ranges', () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.setElevatedPanelBlur(999));
    expect(result.current.elevatedPanelBlur).toBe(100);
    expect(SETTINGS_SCHEMA.elevatedPanelBlur).toMatchObject({ min: 0, max: 100 });
  });
});
