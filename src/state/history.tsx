import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

export type AppSnapshot = any; // opaque snapshot type (App decides structure)

export type HistoryAction = 'push' | 'undo' | 'redo' | 'clear';

export function logHistoryAction(
  scope: string,
  action: HistoryAction,
  detail?: Record<string, unknown>,
) {
  console.log(`[history:${scope}] ${action}`, {
    ...detail,
    timestamp: new Date().toISOString(),
  });
}

type HistoryStack<T> = {
  push: (snapshot: T) => void;
  undo: (currentSnapshot: T, restore: (snap: T) => void) => void;
  redo: (currentSnapshot: T, restore: (snap: T) => void) => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

function readIncludeResize(): boolean {
  try {
    const v = window.localStorage.getItem('juicecut.settings.includeResizeInUndo');
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

export function useLocalHistory<T>(scope: string, max = 200): HistoryStack<T> {
  const [undoStack, setUndoStack] = useState<T[]>([]);
  const [redoStack, setRedoStack] = useState<T[]>([]);
  const undoStackRef = useRef<T[]>([]);
  const redoStackRef = useRef<T[]>([]);

  const push = useCallback((snapshot: T) => {
    const previous = undoStackRef.current;
    const next = previous.concat([snapshot]);
    const nextUndoStack = next.length > max ? next.slice(next.length - max) : next;
    logHistoryAction(scope, 'push', {
      undoDepthBefore: previous.length,
      undoDepthAfter: nextUndoStack.length,
    });
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = [];
    setUndoStack(nextUndoStack);
    setRedoStack([]);
  }, [scope, max]);

  const undo = useCallback((currentSnapshot: T, restore: (snap: T) => void) => {
    const previous = undoStackRef.current;
    if (previous.length === 0) return;
    const nextUndoStack = previous.slice(0, -1);
    const toRestore = previous[previous.length - 1];
    const nextRedoStack = redoStackRef.current.concat([currentSnapshot]);
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = nextRedoStack;
    setUndoStack(nextUndoStack);
    setRedoStack(nextRedoStack);
    restore(toRestore);
  }, [scope]);

  const redo = useCallback((currentSnapshot: T, restore: (snap: T) => void) => {
    const previous = redoStackRef.current;
    if (previous.length === 0) {
      logHistoryAction(scope, 'redo', { result: 'noop', reason: 'empty redo stack' });
      return;
    }
    const nextRedoStack = previous.slice(0, -1);
    const toRestore = previous[previous.length - 1];
    const nextUndoStack = undoStackRef.current.concat([currentSnapshot]);
    logHistoryAction(scope, 'redo', {
      redoDepthAfter: nextRedoStack.length,
    });
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = nextRedoStack;
    setUndoStack(nextUndoStack);
    setRedoStack(nextRedoStack);
    restore(toRestore);
  }, [scope]);

  const clear = useCallback(() => {
    logHistoryAction(scope, 'clear', {
      undoDepthBefore: undoStackRef.current.length,
      redoDepthBefore: redoStackRef.current.length,
    });
    undoStackRef.current = [];
    redoStackRef.current = [];
    setUndoStack([]);
    setRedoStack([]);
  }, [scope]);

  return {
    push,
    undo,
    redo,
    clear,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}

type HistoryContextType = HistoryStack<AppSnapshot>;

const HistoryContext = createContext<HistoryContextType | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [undoStack, setUndoStack] = useState<AppSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<AppSnapshot[]>([]);
  const undoStackRef = useRef<AppSnapshot[]>([]);
  const redoStackRef = useRef<AppSnapshot[]>([]);
  const MAX = 200;
  const scope = 'app';

  const push = (snapshot: AppSnapshot) => {
    const previous = undoStackRef.current;
    const next = previous.concat([snapshot]);
    const nextUndoStack = next.length > MAX ? next.slice(next.length - MAX) : next;
    logHistoryAction(scope, 'push', {
      undoDepthBefore: previous.length,
      undoDepthAfter: nextUndoStack.length,
      meta: snapshot?.__meta,
    });
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = [];
    setUndoStack(nextUndoStack);
    setRedoStack([]);
  };

  const undo = (currentSnapshot: AppSnapshot, restore: (snap: AppSnapshot) => void) => {
    const includeResize = readIncludeResize();
    const previous = undoStackRef.current;
    if (previous.length === 0) {
      logHistoryAction(scope, 'undo', { result: 'noop', reason: 'empty undo stack' });
      return;
    }
    const nextUndoStack = [...previous];
    const movedToRedo: AppSnapshot[] = [];
    while (nextUndoStack.length > 0) {
      const last = nextUndoStack[nextUndoStack.length - 1];
      if (!includeResize && last?.__meta?.type === 'resize') {
        movedToRedo.push(nextUndoStack.pop()!);
        continue;
      }
      const toRestore = nextUndoStack.pop()!;
      logHistoryAction(scope, 'undo', {
        undoDepthAfter: nextUndoStack.length,
        skippedResizeSnapshots: movedToRedo.length,
        restoredMeta: toRestore?.__meta,
      });
      const nextRedoStack = redoStackRef.current.concat([currentSnapshot], movedToRedo.reverse());
      undoStackRef.current = nextUndoStack;
      redoStackRef.current = nextRedoStack;
      setUndoStack(nextUndoStack);
      setRedoStack(nextRedoStack);
      restore(toRestore);
      return;
    }
    logHistoryAction(scope, 'undo', { result: 'noop', reason: 'only resize snapshots remaining' });
  };

  const redo = (currentSnapshot: AppSnapshot, restore: (snap: AppSnapshot) => void) => {
    const includeResize = readIncludeResize();
    const previous = redoStackRef.current;
    if (previous.length === 0) {
      logHistoryAction(scope, 'redo', { result: 'noop', reason: 'empty redo stack' });
      return;
    }
    const nextRedoStack = [...previous];
    const movedToUndo: AppSnapshot[] = [];
    while (nextRedoStack.length > 0) {
      const last = nextRedoStack[nextRedoStack.length - 1];
      if (!includeResize && last?.__meta?.type === 'resize') {
        movedToUndo.push(nextRedoStack.pop()!);
        continue;
      }
      const toRestore = nextRedoStack.pop()!;
      logHistoryAction(scope, 'redo', {
        redoDepthAfter: nextRedoStack.length,
        skippedResizeSnapshots: movedToUndo.length,
        restoredMeta: toRestore?.__meta,
      });
      const nextUndoStack = undoStackRef.current.concat([currentSnapshot], movedToUndo.reverse());
      undoStackRef.current = nextUndoStack;
      redoStackRef.current = nextRedoStack;
      setUndoStack(nextUndoStack);
      setRedoStack(nextRedoStack);
      restore(toRestore);
      return;
    }
    logHistoryAction(scope, 'redo', { result: 'noop', reason: 'only resize snapshots remaining' });
  };

  const clear = () => {
    logHistoryAction(scope, 'clear', {
      undoDepthBefore: undoStackRef.current.length,
      redoDepthBefore: redoStackRef.current.length,
    });
    undoStackRef.current = [];
    redoStackRef.current = [];
    setUndoStack([]);
    setRedoStack([]);
  };

  const value: HistoryContextType = {
    push,
    undo,
    redo,
    clear,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within a HistoryProvider');
  return ctx;
}

export default HistoryProvider;
