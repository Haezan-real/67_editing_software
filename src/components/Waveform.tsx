import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  width: number;
  height: number;
  color?: string;
};

const peaksCache = new Map<string, Float32Array>();

async function computePeaks(src: string, samples: number): Promise<Float32Array> {
  const cached = peaksCache.get(src + '|' + samples);
  if (cached) return cached;
  const resp = await fetch(src);
  const ab = await resp.arrayBuffer();
  const audioCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 2, 44100);
  const decoded = await audioCtx.decodeAudioData(ab.slice(0));
  const channelCount = Math.max(1, decoded.numberOfChannels);
  const chData: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) chData.push(decoded.getChannelData(c));
  const blockSize = Math.floor(decoded.length / samples) || 1;
  const peaks = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    let start = i * blockSize;
    let end = Math.min(decoded.length, start + blockSize);
    let max = 0;
    for (let c = 0; c < channelCount; c++) {
      const data = chData[c];
      for (let j = start; j < end; j++) {
        const v = Math.abs(data[j]); if (v > max) max = v;
      }
    }
    peaks[i] = max;
  }
  peaksCache.set(src + '|' + samples, peaks);
  return peaks;
}

export default function Waveform({ src, width, height, color = '#fff' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const dpr = window.devicePixelRatio || 1;
        const samples = Math.max(1, Math.floor(width * dpr));
        const peaks = await computePeaks(src, samples);
        if (!mounted) return;
        const canvas = canvasRef.current!;
        canvas.width = samples;
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, dpr);
        const mid = canvas.height / 2;
        ctx.beginPath();
        for (let i = 0; i < peaks.length; i++) {
          const v = peaks[i];
          const y = v * (canvas.height / 2 - 1);
          ctx.moveTo(i + 0.5, mid - y);
          ctx.lineTo(i + 0.5, mid + y);
        }
        ctx.stroke();
        setReady(true);
      } catch (err) {
        // fail silently
      }
    })();
    return () => { mounted = false; };
  }, [src, width, height, color]);

  return <canvas ref={canvasRef} className="waveform-canvas" aria-hidden={!ready} />;
}
