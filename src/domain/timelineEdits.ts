import type { TimelineClip } from '../types';
import { generateId } from '../types';

export type TimelineEditErrorCode =
  | 'clip-not-found'
  | 'invalid-frame'
  | 'invalid-source-range'
  | 'overlap'
  | 'not-adjacent'
  | 'no-change';

export type TimelineEditResult =
  | { ok: true; clips: TimelineClip[] }
  | { ok: false; error: { code: TimelineEditErrorCode; message: string } };

const failure = (code: TimelineEditErrorCode, message: string): TimelineEditResult => ({ ok: false, error: { code, message } });
const success = (clips: TimelineClip[]): TimelineEditResult => ({ ok: true, clips });

function clipLength(clip: TimelineClip): number {
  return clip.endFrame - clip.startFrame;
}

function isValidClip(clip: TimelineClip): boolean {
  return Number.isInteger(clip.startFrame)
    && Number.isInteger(clip.endFrame)
    && clip.startFrame >= 0
    && clip.endFrame > clip.startFrame
    && Number.isInteger(clip.srcIn)
    && Number.isInteger(clip.srcOut)
    && clip.srcIn >= 0
    && clip.srcOut > clip.srcIn
    && clip.srcOut - clip.srcIn === clipLength(clip);
}

function hasOverlap(clips: TimelineClip[]): boolean {
  return clips.some((clip, index) => clips.some((other, otherIndex) =>
    index !== otherIndex
    && clip.track === other.track
    && clip.startFrame < other.endFrame
    && other.startFrame < clip.endFrame,
  ));
}

function validateResult(clips: TimelineClip[]): TimelineEditResult {
  if (clips.some(clip => !isValidClip(clip))) return failure('invalid-source-range', 'The edit would create an invalid clip range.');
  if (hasOverlap(clips)) return failure('overlap', 'The edit would make clips overlap on the same track.');
  return success(clips);
}

function findClip(clips: TimelineClip[], id: string): TimelineClip | null {
  return clips.find(clip => clip.id === id) ?? null;
}

export function addClip(clips: TimelineClip[], clip: TimelineClip): TimelineEditResult {
  if (!isValidClip(clip)) return failure('invalid-source-range', 'The new clip has an invalid range.');
  return validateResult([...clips, clip]);
}

export function nudgeClips(clips: TimelineClip[], ids: string[], delta: number): TimelineEditResult {
  if (!Number.isInteger(delta) || delta === 0) return failure('no-change', 'The nudge does not change the clips.');
  const moving = new Set(ids);
  if (ids.length === 0 || ids.some(id => !findClip(clips, id))) return failure('clip-not-found', 'One or more clips were not found.');
  const next = clips.map(clip => moving.has(clip.id) ? { ...clip, startFrame: Math.max(0, clip.startFrame + delta), endFrame: Math.max(0, clip.endFrame + delta) } : clip);
  if (next.some((clip, index) => moving.has(clip.id) && clip.startFrame !== clips[index].startFrame + delta)) return failure('invalid-frame', 'The nudge would move a clip before frame zero.');
  return validateResult(next);
}

export function splitClip(clips: TimelineClip[], clipId: string, frame: number): TimelineEditResult {
  const clip = findClip(clips, clipId);
  if (!clip) return failure('clip-not-found', 'The clip to split was not found.');
  if (!Number.isInteger(frame) || frame <= clip.startFrame || frame >= clip.endFrame) return failure('invalid-frame', 'The split frame must be inside the clip.');
  const relative = frame - clip.startFrame;
  const first = { ...clip, endFrame: frame, srcOut: clip.srcIn + relative, fades: { ...clip.fades, out: 0 } };
  const second = { ...clip, id: generateId(), startFrame: frame, srcIn: clip.srcIn + relative, fades: { ...clip.fades, in: 0 } };
  return validateResult(clips.map(item => item.id === clipId ? first : item).concat(second));
}

export function trimLatter(clips: TimelineClip[], clipId: string, frame: number, ripple: boolean): TimelineEditResult {
  const clip = findClip(clips, clipId);
  if (!clip) return failure('clip-not-found', 'The clip to trim was not found.');
  if (!Number.isInteger(frame) || frame <= clip.startFrame || frame >= clip.endFrame) return failure('invalid-frame', 'The trim frame must leave a positive clip duration.');
  const gap = clip.endFrame - frame;
  const next = clips.map(item => {
    if (item.id === clipId) return { ...item, endFrame: frame, srcOut: item.srcIn + (frame - item.startFrame) };
    if (ripple && item.track === clip.track && item.startFrame >= clip.endFrame) return { ...item, startFrame: item.startFrame - gap, endFrame: item.endFrame - gap };
    return item;
  });
  return validateResult(next);
}

export function trimFormer(clips: TimelineClip[], clipId: string, frame: number, ripple: boolean): TimelineEditResult {
  const clip = findClip(clips, clipId);
  if (!clip) return failure('clip-not-found', 'The clip to trim was not found.');
  if (!Number.isInteger(frame) || frame <= clip.startFrame || frame >= clip.endFrame) return failure('invalid-frame', 'The trim frame must leave a positive clip duration.');
  const shift = frame - clip.startFrame;
  const next = clips.map(item => {
    if (item.id === clipId) return { ...item, startFrame: frame, srcIn: item.srcIn + shift };
    if (ripple && item.track === clip.track && item.startFrame < clip.startFrame) return { ...item, startFrame: item.startFrame - shift, endFrame: item.endFrame - shift };
    return item;
  });
  return validateResult(next);
}

export function joinClips(clips: TimelineClip[], firstId: string, secondId: string): TimelineEditResult {
  const first = findClip(clips, firstId);
  const second = findClip(clips, secondId);
  if (!first || !second) return failure('clip-not-found', 'Both clips to join must exist.');
  if (first.id === second.id) return failure('not-adjacent', 'A clip cannot be joined with itself.');
  if (!isValidClip(first) || !isValidClip(second)) return failure('invalid-source-range', 'Both clips must have valid frame and source ranges.');
  if (first.track !== second.track) return failure('not-adjacent', 'Clips must be on the same track.');
  if (first.mediaId !== second.mediaId) return failure('not-adjacent', 'Clips must reference the same media item.');
  if (first.startFrame >= second.startFrame) return failure('not-adjacent', 'The first clip must come before the second clip.');
  if (first.endFrame !== second.startFrame) return failure('not-adjacent', 'Clips must be directly adjacent in the timeline.');
  if (first.srcOut !== second.srcIn) return failure('not-adjacent', 'Clip source ranges must be continuous.');
  const merged = { ...first, endFrame: second.endFrame, srcOut: second.srcOut, fades: { in: first.fades.in, out: second.fades.out } };
  return validateResult(clips.filter(clip => clip.id !== firstId && clip.id !== secondId).concat(merged));
}

export function changeFade(clips: TimelineClip[], clipId: string, side: 'in' | 'out', frames: number): TimelineEditResult {
  const clip = findClip(clips, clipId);
  if (!clip) return failure('clip-not-found', 'The clip was not found.');
  const nextFrames = Math.min(Math.max(0, Math.round(frames)), Math.floor(clipLength(clip) / 2));
  if (clip.fades[side] === nextFrames) return failure('no-change', 'The fade value did not change.');
  return success(clips.map(item => item.id === clipId ? { ...item, fades: { ...item.fades, [side]: nextFrames } } : item));
}

export function changeSourceRange(clips: TimelineClip[], clipId: string, srcIn: number, srcOut: number): TimelineEditResult {
  const clip = findClip(clips, clipId);
  if (!clip) return failure('clip-not-found', 'The clip was not found.');
  if (!Number.isInteger(srcIn) || !Number.isInteger(srcOut) || srcIn < 0 || srcOut <= srcIn || srcOut - srcIn !== clipLength(clip)) {
    return failure('invalid-source-range', 'The source range must be non-negative and match the clip duration.');
  }
  if (clip.srcIn === srcIn && clip.srcOut === srcOut) return failure('no-change', 'The source range did not change.');
  return success(clips.map(item => item.id === clipId ? { ...item, srcIn, srcOut } : item));
}

export function stepEdge(clips: TimelineClip[], clipId: string | null, cutBetween: [string, string] | null, direction: number, ripple: boolean): TimelineEditResult {
  if (!Number.isInteger(direction) || direction === 0) return failure('no-change', 'The edge step does not change the timeline.');
  if (cutBetween) {
    const [firstId, secondId] = cutBetween;
    const first = findClip(clips, firstId);
    const second = findClip(clips, secondId);
    if (!first || !second) return failure('clip-not-found', 'Both clips at the cut must exist.');
    if (first.track !== second.track || first.endFrame !== second.startFrame || first.srcOut !== second.srcIn) return failure('not-adjacent', 'The clips at the cut are not continuous.');
    const next = clips.map(clip => {
      if (clip.id === firstId) return { ...clip, endFrame: clip.endFrame + direction, srcOut: clip.srcOut + direction };
      if (!ripple && clip.id === secondId) return { ...clip, startFrame: clip.startFrame + direction, srcIn: clip.srcIn + direction };
      if (ripple && clip.id !== firstId && clip.track === second.track && clip.startFrame >= second.startFrame) return { ...clip, startFrame: clip.startFrame + direction, endFrame: clip.endFrame + direction };
      return clip;
    });
    return validateResult(next);
  }
  if (!clipId || !findClip(clips, clipId)) return failure('clip-not-found', 'The clip edge was not found.');
  const next = clips.map(clip => clip.id === clipId ? { ...clip, endFrame: clip.endFrame + direction, srcOut: clip.srcOut + direction } : clip);
  return validateResult(next);
}
