export type MediaType = 'video' | 'audio' | 'image';

//src/types.ts

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  file: File;
  src: string;
  duration: number;
  width?: number;
  height?: number;
  thumbnail?: string;
}

export interface Fade {
  in: number;
  out: number;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  track: number;
  startFrame: number;
  endFrame: number;
  srcIn: number;
  srcOut: number;
  fades: Fade;
  name: string;
  type: MediaType;
}

export interface Track {
  id: string;
  type: 'video' | 'audio';
  label: string;
}

export const FPS = 30;

export function framesToSeconds(frames: number): number {
  return frames / FPS;
}

export function secondsToFrames(seconds: number): number {
  return Math.round(seconds * FPS);
}

export function formatTimecode(frames: number): string {
  const totalSeconds = Math.floor(frames / FPS);
  const f = frames % FPS;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
