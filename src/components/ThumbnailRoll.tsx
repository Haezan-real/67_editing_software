import { useEffect, useState } from 'react';

type Props = {
  src: string;
  totalWidth: number; // available width in px
  height: number;
  count?: number; // number of thumbnails to generate
};

async function captureFrames(src: string, count: number, thumbW: number, thumbH: number): Promise<string[]> {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.src = src;

  await new Promise<void>((resolve) => {
    const onLoaded = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); resolve(); };
    function cleanup() { video.onloadedmetadata = null; video.onerror = null; }
    video.onloadedmetadata = onLoaded;
    video.onerror = onError;
  });

  const duration = Math.max(0.001, video.duration || 0.001);
  const results: string[] = [];
  const dpr = window.devicePixelRatio || 1;

  for (let i = 0; i < count; i++) {
    const t = Math.min(duration, ((i + 0.5) / count) * duration);
    try {
      await new Promise<void>((resolve) => {
        const onSeek = () => {
          const canvas = document.createElement('canvas');
          const cw = Math.max(1, Math.floor(thumbW * dpr));
          const ch = Math.max(1, Math.floor(thumbH * dpr));
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // preserve aspect ratio and center-crop (cover)
            const vw = video.videoWidth || 1;
            const vh = video.videoHeight || 1;
            const scale = Math.max(cw / vw, ch / vh);
            const sw = Math.floor(cw / scale);
            const sh = Math.floor(ch / scale);
            const sx = Math.max(0, Math.floor((vw - sw) / 2));
            const sy = Math.max(0, Math.floor((vh - sh) / 2));
            try {
              ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
              results.push(canvas.toDataURL('image/jpeg', 0.6));
            } catch {
              results.push('');
            }
          } else {
            results.push('');
          }
          video.onseeked = null;
          resolve();
        };
        video.onseeked = onSeek;
        // setting currentTime triggers seek
        try { video.currentTime = t; }
        catch { video.onseeked = null; resolve(); }
      });
    } catch {
      results.push('');
    }
  }

  return results;
}

export default function ThumbnailRoll({ src, totalWidth, height, count = 6 }: Props) {
  const [thumbs, setThumbs] = useState<string[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const thumbW = Math.max(24, Math.floor(totalWidth / count));
        const results = await captureFrames(src, count, thumbW, height);
        if (!mounted) return;
        setThumbs(results);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [src, totalWidth, height, count]);

  if (!thumbs) return <div className="thumb-roll placeholder" style={{ height }} />;

  const thumbW = Math.max(24, Math.floor(totalWidth / thumbs.length));

  return (
    <div className="thumb-roll" style={{ display: 'flex', gap: 2, alignItems: 'center', height }}>
      {thumbs.map((t, i) => (
        <img key={i} src={t || undefined} alt="" style={{ width: thumbW, height, objectFit: 'cover', background: '#111' }} />
      ))}
    </div>
  );
}
