import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type { MediaItem, TimelineClip, Track } from '../types';
import { generateId } from '../types';

type HistoryApi = {
  push: (snapshot: unknown) => void;
};

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

  const handleFadeDragStart = useCallback(() => {
    fadeHistorySnapshotRef.current = snapshot();
    fadeChangedRef.current = false;
  }, [snapshot]);

  const handleFadeDragEnd = useCallback(() => {
    if (fadeHistorySnapshotRef.current !== null && fadeChangedRef.current) {
      history.push(fadeHistorySnapshotRef.current);
    }
    fadeHistorySnapshotRef.current = null;
    fadeChangedRef.current = false;
  }, [history]);

  const handleDropMedia = useCallback((mediaId: string, track: number, startFrame: number) => {
    const media = mediaItems.get(mediaId);
    if (!media) return;
    const trackDefinition = TRACKS[track];
    if (!trackDefinition) return;
    if (trackDefinition.type === 'video' && media.type === 'audio') return;
    if (trackDefinition.type === 'audio' && (media.type === 'video' || media.type === 'image')) return;
    history.push(snapshot());
    const endFrame = startFrame + media.duration;
    const newClip: TimelineClip = {
      id: generateId(), mediaId, track, startFrame, endFrame,
      srcIn: 0, srcOut: media.duration, fades: { in: 0, out: 0 },
      name: media.name, type: media.type,
    };
    setClips(previous => [...previous, newClip]);
  }, [history, mediaItems, setClips, snapshot]);

  const handleSelectClip = useCallback((id: string, multi: boolean) => {
    setSelectedIds(previous => {
      if (multi) return previous.includes(id) ? previous.filter(itemId => itemId !== id) : [...previous, id];
      return previous.includes(id) && previous.length === 1 ? previous : [id];
    });
  }, [setSelectedIds]);

  const handleNudge = useCallback((ids: string[], delta: number) => {
    const movers = new Set(ids);
    const next = clips.map(clip => {
      if (!movers.has(clip.id)) return clip;
      const newStart = Math.max(0, clip.startFrame + delta);
      const length = clip.endFrame - clip.startFrame;
      const wouldOverlap = clips.some(other => !movers.has(other.id) && other.track === clip.track && newStart < other.endFrame && newStart + length > other.startFrame);
      return wouldOverlap ? clip : { ...clip, startFrame: newStart, endFrame: newStart + length };
    });
    if (next.every((clip, index) => clip === clips[index])) return;
    history.push(snapshot());
    setClips(previous => {
      const movers = new Set(ids);
      return previous.map(clip => {
        if (!movers.has(clip.id)) return clip;
        const newStart = Math.max(0, clip.startFrame + delta);
        const length = clip.endFrame - clip.startFrame;
        const wouldOverlap = previous.some(other => !movers.has(other.id) && other.track === clip.track && newStart < other.endFrame && newStart + length > other.startFrame);
        return wouldOverlap ? clip : { ...clip, startFrame: newStart, endFrame: newStart + length };
      });
    });
  }, [history, setClips, snapshot]);

  const handleSplitClip = useCallback((clipId: string, frame: number) => {
    const clip = clips.find(item => item.id === clipId);
    if (!clip || frame <= clip.startFrame || frame >= clip.endFrame) return;
    history.push(snapshot());
    setClips(previous => {
      const clip = previous.find(item => item.id === clipId);
      if (!clip || frame <= clip.startFrame || frame >= clip.endFrame) return previous;
      const relativeFrame = frame - clip.startFrame;
      const firstPart: TimelineClip = { ...clip, endFrame: frame, srcOut: clip.srcIn + relativeFrame, fades: { ...clip.fades, out: 0 } };
      const secondPart: TimelineClip = { ...clip, id: generateId(), startFrame: frame, srcIn: clip.srcIn + relativeFrame, fades: { ...clip.fades, in: 0 } };
      return previous.map(item => item.id === clipId ? firstPart : item).concat(secondPart);
    });
  }, [history, setClips, snapshot]);

  const handleTrimLatter = useCallback((clipId: string, frame: number, ripple: boolean) => {
    const clip = clips.find(item => item.id === clipId);
    if (!clip || frame <= clip.startFrame) return;
    history.push(snapshot());
    setClips(previous => {
      const clip = previous.find(item => item.id === clipId);
      if (!clip || frame <= clip.startFrame) return previous;
      const newEnd = frame;
      const gap = clip.endFrame - newEnd;
      return previous.map(item => {
        if (item.id === clipId) return { ...item, endFrame: newEnd, srcOut: item.srcIn + (newEnd - item.startFrame) };
        if (ripple && item.track === clip.track && item.startFrame >= clip.endFrame) return { ...item, startFrame: item.startFrame - gap, endFrame: item.endFrame - gap };
        return item;
      });
    });
  }, [history, setClips, snapshot]);

  const handleTrimFormer = useCallback((clipId: string, frame: number, ripple: boolean) => {
    const clip = clips.find(item => item.id === clipId);
    if (!clip || frame >= clip.endFrame) return;
    history.push(snapshot());
    setClips(previous => {
      const clip = previous.find(item => item.id === clipId);
      if (!clip || frame >= clip.endFrame) return previous;
      const gap = frame - clip.startFrame;
      return previous.map(item => {
        if (item.id === clipId) return { ...item, startFrame: frame, srcIn: item.srcIn + gap };
        if (ripple && item.track === clip.track && item.startFrame < clip.startFrame) return { ...item, startFrame: Math.max(0, item.startFrame - gap), endFrame: Math.max(0, item.endFrame - gap) };
        return item;
      });
    });
  }, [history, setClips, snapshot]);

  const handleJoin = useCallback((clipAId: string, clipBId: string) => {
    const first = clips.find(item => item.id === clipAId);
    const second = clips.find(item => item.id === clipBId);
    if (!first || !second || first.mediaId !== second.mediaId) return;
    history.push(snapshot());
    setClips(previous => {
      const first = previous.find(item => item.id === clipAId);
      const second = previous.find(item => item.id === clipBId);
      if (!first || !second || first.mediaId !== second.mediaId) return previous;
      const merged: TimelineClip = { ...first, endFrame: second.endFrame, srcOut: second.srcOut, fades: { in: first.fades.in, out: second.fades.out } };
      return previous.filter(item => item.id !== clipAId && item.id !== clipBId).concat(merged);
    });
  }, [history, setClips, snapshot]);

  const handleFadeChange = useCallback((clipId: string, side: 'in' | 'out', frames: number) => {
    const clip = clips.find(item => item.id === clipId);
    if (!clip) return;
    const maxFade = Math.floor((clip.endFrame - clip.startFrame) / 2);
    const nextFade = Math.min(Math.max(0, frames), maxFade);
    if (clip.fades[side] === nextFade) return;
    fadeChangedRef.current = true;
    setClips(previous => previous.map(clip => {
      if (clip.id !== clipId) return clip;
      const maxFade = Math.floor((clip.endFrame - clip.startFrame) / 2);
      return { ...clip, fades: { ...clip.fades, [side]: Math.min(Math.max(0, frames), maxFade) } };
    }));
  }, [setClips]);

  const handleStepEdge = useCallback((clipId: string | null, cutBetween: [string, string] | null, direction: number, ripple: boolean) => {
    const hasTarget = clipId ? clips.some(clip => clip.id === clipId) : Boolean(cutBetween && cutBetween.every(id => clips.some(clip => clip.id === id)));
    if (!hasTarget || direction === 0) return;
    history.push(snapshot());
    setClips(previous => {
      if (cutBetween) {
        const [firstId, secondId] = cutBetween;
        const secondClip = previous.find(item => item.id === secondId);
        return previous.map(clip => {
          if (clip.id === firstId) return { ...clip, endFrame: clip.endFrame + direction, srcOut: clip.srcOut + direction };
          if (!ripple && clip.id === secondId) return { ...clip, startFrame: clip.startFrame + direction, srcIn: clip.srcIn + direction };
          if (ripple && clip.id !== firstId && secondClip && clip.track === secondClip.track && clip.startFrame >= secondClip.startFrame) return { ...clip, startFrame: clip.startFrame + direction, endFrame: clip.endFrame + direction };
          return clip;
        });
      }
      if (clipId) return previous.map(clip => clip.id === clipId ? { ...clip, endFrame: clip.endFrame + direction, srcOut: clip.srcOut + direction } : clip);
      return previous;
    });
  }, [history, setClips, snapshot]);

  const handleRollApply = useCallback((clipId: string, newSrcIn: number, newSrcOut: number) => {
    const clip = clips.find(item => item.id === clipId);
    if (!clip || (clip.srcIn === newSrcIn && clip.srcOut === newSrcOut)) return;
    history.push(snapshot());
    setClips(previous => previous.map(clip => clip.id === clipId ? { ...clip, srcIn: newSrcIn, srcOut: newSrcOut } : clip));
  }, [clips, history, setClips, snapshot]);

  return { handleDropMedia, handleSelectClip, handleNudge, handleSplitClip, handleTrimLatter, handleTrimFormer, handleJoin, handleFadeChange, handleFadeDragStart, handleFadeDragEnd, handleStepEdge, handleRollApply };
}
