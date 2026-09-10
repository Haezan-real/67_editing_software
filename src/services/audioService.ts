import bigWoosh from '../sounds/SFX/big_woosh.wav';
import smallWoosh from '../sounds/SFX/small_woosh.wav';
import thock from '../sounds/sfx/thock.wav';

type SoundKey = 'bigWoosh' | 'smallWoosh' | 'thock';

interface AudioService {
  ready: Promise<boolean>;
  playSound: (key: SoundKey, volume?: number) => void;
  release: () => void;
}

let context: AudioContext | null = null;
let buffers = new Map<SoundKey, AudioBuffer>();
let loading: Promise<boolean> | null = null;
let consumers = 0;

const sounds: Record<SoundKey, string> = {
  bigWoosh,
  smallWoosh,
  thock,
};

function ensureLoaded(): Promise<boolean> {
  if (loading) return loading;
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return Promise.resolve(false);
  context = context ?? new AudioContextConstructor();
  const activeContext = context;
  loading = Promise.all(
    (Object.entries(sounds) as Array<[SoundKey, string]>).map(async ([key, url]) => {
      const response = await fetch(url);
      const data = await response.arrayBuffer();
      const decoded = await activeContext.decodeAudioData(data);
      if (context === activeContext) buffers.set(key, decoded);
    }),
  ).then(() => true).catch(error => {
    console.warn('Audio service failed to load sound effects:', error);
    return false;
  });
  return loading;
}

export function acquireAudioService(): AudioService {
  consumers += 1;
  const ready = ensureLoaded();
  let released = false;

  return {
    ready,
    playSound: (key, volume = 1) => {
      const activeContext = context;
      const buffer = buffers.get(key);
      if (!activeContext || !buffer) return;
      if (activeContext.state === 'suspended') void activeContext.resume();
      const source = activeContext.createBufferSource();
      const gain = activeContext.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(activeContext.destination);
      source.start();
    },
    release: () => {
      if (released) return;
      released = true;
      consumers -= 1;
      if (consumers > 0) return;
      const closingContext = context;
      context = null;
      buffers = new Map();
      loading = null;
      void closingContext?.close().catch(() => {});
    },
  };
}
