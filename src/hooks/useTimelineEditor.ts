import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type { MediaItem, TimelineClip, Track } from '../types';
import { generateId } from '../types';
import { addClip, changeFade, changeSourceRange, joinClips, nudgeClips, splitClip, stepEdge, trimFormer, trimLatter, type TimelineEditResult } from '../domain/timelineEdits';

type HistoryApi = { push: (snapshot: unknown) => void };

interface TimelineEditorOptions {
  clips: TimelineClip[];
  mediaItems: Map<string, MediaItem>;
  setClips: Dispatch<SetStateAction<TimelineClip[]>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  history: HistoryApi;
  snapshot: () => unknown;
}

const TRACKS: Track[] = [
  { id: 'v1', type: 'video', label: 'V1' },
  { id: 'a1', type: 'audio', label: 'A1' },
];

export function useTimelineEditor({ clips, mediaItems, setClips, setSelectedIds, history, snapshot }: TimelineEditorOptions) {
  const fadeHistorySnapshotRef = useRef<unknown | null>(null);
  const fadeChangedRef = useRef(false);

  const applyEdit = useCallback((result: TimelineEditResult) => {
    if (!result.ok) return false;
    history.push(snapshot());
    setClips(result.clips);
    return true;
  }, [history, setClips, snapshot]);

  const handleFadeDragStart = useCallback(() => {
    fadeHistorySnapshotRef.current = snapshot();
    fadeChangedRef.current = false;
  }, [snapshot]);

  const handleFadeDragEnd = useCallback(() => {
    if (fadeHistorySnapshotRef.current !== null && fadeChangedRef.current) history.push(fadeHistorySnapshotRef.current);
    fadeHistorySnapshotRef.current = null;
    fadeChangedRef.current = false;
  }, [history]);

  const handleDropMedia = useCallback((mediaId: string, track: number, startFrame: number) => {
    const media = mediaItems.get(mediaId);
    const trackDefinition = TRACKS[track];
    if (!media || !trackDefinition) return;
    if (trackDefinition.type === 'video' && media.type === 'audio') return;
    if (trackDefinition.type === 'audio' && (media.type === 'video' || media.type === 'image')) return;
    const newClip: TimelineClip = {
      id: generateId(), mediaId, track, startFrame, endFrame: startFrame + media.duration,
      srcIn: 0, srcOut: media.duration, fades: { in: 0, out: 0 }, name: media.name, type: media.type,
    };
    applyEdit(addClip(clips, newClip));
  }, [applyEdit, clips, mediaItems]);

  const handleSelectClip = useCallback((id: string, multi: boolean) => {
    setSelectedIds(previous => multi
      ? (previous.includes(id) ? previous.filter(itemId => itemId !== id) : [...previous, id])
      : (previous.includes(id) && previous.length === 1 ? previous : [id]));
  }, [setSelectedIds]);

  const handleNudge = useCallback((ids: string[], delta: number) => {
    applyEdit(nudgeClips(clips, ids, delta));
  }, [applyEdit, clips]);

  const handleSplitClip = useCallback((clipId: string, frame: number) => {
    applyEdit(splitClip(clips, clipId, frame));
  }, [applyEdit, clips]);

  const handleTrimLatter = useCallback((clipId: string, frame: number, ripple: boolean) => {
    applyEdit(trimLatter(clips, clipId, frame, ripple));
  }, [applyEdit, clips]);

  const handleTrimFormer = useCallback((clipId: string, frame: number, ripple: boolean) => {
    applyEdit(trimFormer(clips, clipId, frame, ripple));
  }, [applyEdit, clips]);

  const handleJoin = useCallback((clipAId: string, clipBId: string) => {
    applyEdit(joinClips(clips, clipAId, clipBId));
  }, [applyEdit, clips]);

  const handleFadeChange = useCallback((clipId: string, side: 'in' | 'out', frames: number) => {
    const result = changeFade(clips, clipId, side, frames);
    if (!result.ok) return;
    fadeChangedRef.current = true;
    setClips(result.clips);
  }, [clips, setClips]);

  const handleStepEdge = useCallback((clipId: string | null, cutBetween: [string, string] | null, direction: number, ripple: boolean) => {
    applyEdit(stepEdge(clips, clipId, cutBetween, direction, ripple));
  }, [applyEdit, clips]);

  const handleRollApply = useCallback((clipId: string, newSrcIn: number, newSrcOut: number) => {
    applyEdit(changeSourceRange(clips, clipId, newSrcIn, newSrcOut));
  }, [applyEdit, clips]);

  return {
    handleDropMedia, handleSelectClip, handleNudge, handleSplitClip,
    handleTrimLatter, handleTrimFormer, handleJoin, handleFadeChange,
    handleFadeDragStart, handleFadeDragEnd, handleStepEdge, handleRollApply,
  };
}
