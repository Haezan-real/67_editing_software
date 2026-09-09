import { useCallback, useEffect, useRef } from 'react';
import type { MediaItem, TimelineClip } from '../types';
import { FPS } from '../types';

function waitForVideoFrame(video: HTMLVideoElement, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException('Export cancelled', 'AbortError'));

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      video.removeEventListener('error', handleError);
      signal.removeEventListener('abort', handleAbort);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const handleError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Unable to decode a video frame during export.'));
    };
    const handleAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException('Export cancelled', 'AbortError'));
    };

    video.addEventListener('error', handleError, { once: true });
    signal.addEventListener('abort', handleAbort, { once: true });

    const requestVideoFrameCallback = (video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    }).requestVideoFrameCallback;
    if (requestVideoFrameCallback) {
      requestVideoFrameCallback.call(video, finish);
    } else {
      video.addEventListener('seeked', finish, { once: true });
    }
  });
}

interface ExportJobOptions {
  clips: TimelineClip[];
  mediaItems: Map<string, MediaItem>;
  totalFrames: number;
}

export function useExportJob({ clips, mediaItems, totalFrames }: ExportJobOptions) {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const exportVideo = useCallback(async () => {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;
    const { signal } = abortController;
    const videoClips = clips
      .filter(clip => clip.type === 'video' && clip.track === 0)
      .sort((a, b) => a.startFrame - b.startFrame);

    if (videoClips.length === 0) {
      abortRef.current = null;
      alert('No video clips on track V1 to export.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 854;
    canvas.height = 480;
    const context = canvas.getContext('2d');
    if (!context) {
      abortRef.current = null;
      alert('Unable to create an export canvas.');
      return;
    }

    const stream = canvas.captureStream(FPS);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    } catch {
      recorder = new MediaRecorder(stream);
    }

    const chunks: BlobPart[] = [];
    let exportCompleted = false;
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      if (!exportCompleted) return;
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'export.webm';
      link.click();
      URL.revokeObjectURL(url);
    };

    try {
      recorder.start();
      for (let frame = 0; frame <= totalFrames; frame++) {
        if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const videoClip = videoClips.find(clip => frame >= clip.startFrame && frame < clip.endFrame);
        if (videoClip) {
          const media = mediaItems.get(videoClip.mediaId);
          const video = media ? document.getElementById(`vid-${media.id}`) as HTMLVideoElement | null : null;
          if (video) {
            if (video.readyState < 2) {
              await new Promise<void>((resolve, reject) => {
                const cleanup = () => {
                  video.removeEventListener('loadeddata', handleLoadedData);
                  video.removeEventListener('error', handleLoadError);
                  signal.removeEventListener('abort', handleAbort);
                };
                const handleLoadedData = () => { cleanup(); resolve(); };
                const handleLoadError = () => { cleanup(); reject(new Error('Unable to load video for export.')); };
                const handleAbort = () => { cleanup(); reject(new DOMException('Export cancelled', 'AbortError')); };
                video.addEventListener('loadeddata', handleLoadedData, { once: true });
                video.addEventListener('error', handleLoadError, { once: true });
                signal.addEventListener('abort', handleAbort, { once: true });
              });
            }
            video.currentTime = (frame - videoClip.startFrame + videoClip.srcIn) / FPS;
            await waitForVideoFrame(video, signal);
            let alpha = 1;
            const length = videoClip.endFrame - videoClip.startFrame;
            const relativeFrame = frame - videoClip.startFrame;
            if (relativeFrame < videoClip.fades.in) alpha = relativeFrame / videoClip.fades.in;
            if (relativeFrame > length - videoClip.fades.out) alpha = (length - relativeFrame) / videoClip.fades.out;
            context.globalAlpha = Math.max(0, Math.min(1, alpha));
            const aspectRatio = video.videoWidth / video.videoHeight || 16 / 9;
            const canvasAspectRatio = canvas.width / canvas.height;
            let width = canvas.width;
            let height = canvas.height;
            let x = 0;
            let y = 0;
            if (aspectRatio > canvasAspectRatio) {
              height = canvas.width / aspectRatio;
              y = (canvas.height - height) / 2;
            } else {
              width = canvas.height * aspectRatio;
              x = (canvas.width - width) / 2;
            }
            context.drawImage(video, x, y, width, height);
            context.globalAlpha = 1;
          }
        }
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      exportCompleted = true;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Export failed:', error);
        alert('Export failed. Check the console for details.');
      }
    } finally {
      if (recorder.state !== 'inactive') recorder.stop();
      if (recorder.state === 'inactive') stream.getTracks().forEach(track => track.stop());
      if (abortRef.current === abortController) abortRef.current = null;
    }
  }, [clips, mediaItems, totalFrames]);

  return { exportVideo };
}
