import { useCallback, useEffect, useRef } from 'react';
import type { MediaItem, TimelineClip } from '../types';
import { FPS } from '../types';

function drawMedia(ctx: CanvasRenderingContext2D, source: CanvasImageSource, width: number, height: number, alpha: number) {
  const measurable = source as CanvasImageSource & { videoWidth?: number; videoHeight?: number; naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
  const sourceWidth = measurable.videoWidth ?? measurable.naturalWidth ?? measurable.width ?? 0;
  const sourceHeight = measurable.videoHeight ?? measurable.naturalHeight ?? measurable.height ?? 0;
  if (!sourceWidth || !sourceHeight) return;
  const sourceRatio = sourceWidth / sourceHeight;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let x = 0;
  let y = 0;
  if (sourceRatio > canvasRatio) {
    drawHeight = width / sourceRatio;
    y = (height - drawHeight) / 2;
  } else {
    drawWidth = height * sourceRatio;
    x = (width - drawWidth) / 2;
  }
  ctx.globalAlpha = alpha;
  ctx.drawImage(source, x, y, drawWidth, drawHeight);
  ctx.globalAlpha = 1;
}

function fadeAlpha(clip: TimelineClip, playhead: number): number {
  const relative = playhead - clip.startFrame;
  const length = clip.endFrame - clip.startFrame;
  let alpha = 1;
  if (clip.fades.in > 0 && relative < clip.fades.in) alpha = relative / clip.fades.in;
  if (clip.fades.out > 0 && relative > length - clip.fades.out) alpha = (length - relative) / clip.fades.out;
  return Math.max(0, Math.min(1, alpha));
}

export function useMediaPlayback(
  clips: TimelineClip[],
  mediaItems: Map<string, MediaItem>,
  playhead: number,
  playing: boolean,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>());

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const visualClips = clips
      .filter(clip => (clip.type === 'video' || clip.type === 'image') && clip.track === 0 && playhead >= clip.startFrame && playhead < clip.endFrame)
      .sort((a, b) => a.startFrame - b.startFrame);

    for (const clip of visualClips) {
      const media = mediaItems.get(clip.mediaId);
      if (!media) continue;
      const alpha = fadeAlpha(clip, playhead);
      if (media.type === 'image') {
        const cached = imageCacheRef.current.get(media.id);
        if (cached?.complete) drawMedia(context, cached, canvas.width, canvas.height, alpha);
        continue;
      }
      const video = document.getElementById(`vid-${media.id}`) as HTMLVideoElement | null;
      if (!video || video.readyState < 2) continue;
      const targetTime = (playhead - clip.startFrame + clip.srcIn) / FPS;
      if (Math.abs(video.currentTime - targetTime) > 0.03) video.currentTime = targetTime;
      drawMedia(context, video, canvas.width, canvas.height, alpha);
    }
  }, [clips, mediaItems, playhead]);

  useEffect(() => {
    for (const media of mediaItems.values()) {
      if (media.type !== 'image' || imageCacheRef.current.has(media.id)) continue;
      const image = new Image();
      image.src = media.src;
      image.onload = drawFrame;
      imageCacheRef.current.set(media.id, image);
    }
    for (const id of imageCacheRef.current.keys()) {
      if (!mediaItems.has(id)) imageCacheRef.current.delete(id);
    }

    const videoElements = [...mediaItems.values()]
      .filter(media => media.type === 'video')
      .map(media => document.getElementById(`vid-${media.id}`) as HTMLVideoElement | null)
      .filter((video): video is HTMLVideoElement => video !== null);
    videoElements.forEach(video => video.addEventListener('loadeddata', drawFrame));
    return () => videoElements.forEach(video => video.removeEventListener('loadeddata', drawFrame));
  }, [drawFrame, mediaItems]);

  useEffect(() => {
    const activeAudioIds = new Set<string>();
    for (const clip of clips.filter(item => item.type === 'audio' && item.track === 1)) {
      const audio = document.getElementById(`aud-${clip.mediaId}`) as HTMLAudioElement | null;
      if (!audio) continue;
      const active = playhead >= clip.startFrame && playhead < clip.endFrame;
      if (!active) {
        audio.pause();
        continue;
      }
      activeAudioIds.add(audio.id);
      const targetTime = (playhead - clip.startFrame + clip.srcIn) / FPS;
      if (Math.abs(audio.currentTime - targetTime) > 0.08) audio.currentTime = targetTime;
      if (playing) void audio.play().catch(() => {});
      else audio.pause();
    }
    if (!playing) {
      document.querySelectorAll<HTMLAudioElement>('audio[id^="aud-"]').forEach(audio => {
        if (!activeAudioIds.has(audio.id)) audio.pause();
      });
    }
  }, [clips, mediaItems, playhead, playing]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  useEffect(() => {
    const observer = new MutationObserver(drawFrame);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [drawFrame]);

  return canvasRef;
}
