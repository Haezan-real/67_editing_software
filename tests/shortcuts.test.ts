import { describe, expect, it } from 'vitest';
import { isShortcutMatch, updateShortcuts } from '../src/components/shortcuts';

describe('shortcut matching', () => {
  it('matches configured modifier combinations', () => {
    updateShortcuts({
      undo: [['ctrl', 'z']], redo: [], timelineZoomToggle: [], exitModal: [], toggleTorusMenu: [],
    });
    expect(isShortcutMatch('undo', new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))).toBe(true);
    expect(isShortcutMatch('undo', new KeyboardEvent('keydown', { key: 'z' }))).toBe(false);
  });
});
