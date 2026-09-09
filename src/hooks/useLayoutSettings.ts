import { useEffect, useState } from 'react';
import { SETTINGS_CHANGED_EVENT, getSettingsChangedDetail } from '../state/settingsEvents';

const DEFAULT_PLAYHEAD_TOP = 15;
const DEFAULT_LEFT_WIDTH = 20;
const DEFAULT_TIMELINE_HEIGHT = 35;

function readNumber(key: string, fallback: number, min?: number, max?: number): number {
  try {
    const value = Number(window.localStorage.getItem(key));
    if (!Number.isFinite(value)) return fallback;
    if (min !== undefined && value < min) return fallback;
    if (max !== undefined && value > max) return fallback;
    return value;
  } catch {
    return fallback;
  }
}

function readBoolean(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
}

export function useLayoutSettings() {
  const [playheadTop, setPlayheadTop] = useState(() => {
    const stored = readNumber('juicecut.settings.playheadTopPercent', DEFAULT_PLAYHEAD_TOP, 0, 100);
    if (stored !== DEFAULT_PLAYHEAD_TOP) return stored;
    return readNumber('juicecut.settings.playheadTop', DEFAULT_PLAYHEAD_TOP, 0, 100);
  });
  const [includeResizeInUndo, setIncludeResizeInUndo] = useState(() =>
    readBoolean('juicecut.settings.includeResizeInUndo', true),
  );
  const [leftWidthPct, setLeftWidthPct] = useState(() =>
    readNumber('juicecut.layout.leftWidthPct', DEFAULT_LEFT_WIDTH, 5, 50),
  );
  const [leftCollapsed, setLeftCollapsed] = useState(() =>
    readBoolean('juicecut.layout.leftCollapsed', false),
  );
  const [timelineHeightPct, setTimelineHeightPct] = useState(() =>
    readNumber('juicecut.layout.timelineHeightPct', DEFAULT_TIMELINE_HEIGHT, 15, 60),
  );
  const [, setGuiScale] = useState(() => readNumber('juicecut.settings.guiScale', 100, 50, 200));

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.layout.leftCollapsed', String(leftCollapsed)); } catch {}
  }, [leftCollapsed]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.layout.leftWidthPct', String(leftWidthPct)); } catch {}
  }, [leftWidthPct]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.layout.timelineHeightPct', String(timelineHeightPct)); } catch {}
  }, [timelineHeightPct]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.playheadTopPercent', String(playheadTop)); } catch {}
  }, [playheadTop]);

  useEffect(() => {
    try { window.localStorage.setItem('juicecut.settings.includeResizeInUndo', String(includeResizeInUndo)); } catch {}
  }, [includeResizeInUndo]);

  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const detail = getSettingsChangedDetail(event);
      if (!detail) return;
      if (detail.key === 'playheadTopPercent' && typeof detail.value === 'number') {
        setPlayheadTop(Math.max(0, Math.min(100, detail.value)));
      }
      if (detail.key === 'guiScale' && typeof detail.value === 'number') {
        setGuiScale(detail.value);
      }
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChange);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChange);
  }, []);

  return {
    playheadTop,
    setPlayheadTop,
    includeResizeInUndo,
    setIncludeResizeInUndo,
    leftWidthPct,
    setLeftWidthPct,
    leftCollapsed,
    timelineHeightPct,
    setTimelineHeightPct,
  };
}
