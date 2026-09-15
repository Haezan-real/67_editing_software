import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalHistory } from '../src/state/history';

describe('local history', () => {
  it('restores undo and redo without side effects in state updaters', () => {
    const restored: number[] = [];
    const { result } = renderHook(() => useLocalHistory<number>('test'));
    act(() => {
      result.current.push(1);
      result.current.push(2);
    });
    act(() => result.current.undo(3, value => restored.push(value)));
    expect(restored).toEqual([2]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.redo(4, value => restored.push(value)));
    expect(restored).toEqual([2, 3]);
  });
});
