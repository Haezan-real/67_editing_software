import { useEffect, useRef, useState } from 'react';
import type { TimelineClip, MediaItem } from '../types';
import { FPS, formatTimecode } from '../types';
import DraggableModal from './DraggableModal';

//src/components/RollDialog.tsx

interface Props {
  clip: TimelineClip;
  media: MediaItem;
  onClose: () => void;
  onApply: (clipId: string, newSrcIn: number, newSrcOut: number) => void;
}

export default function RollDialog({ clip, media, onClose, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [srcIn, setSrcIn] = useState(clip.srcIn);
  const duration = clip.endFrame - clip.startFrame;
  const maxSrcOut = media.duration;

  useEffect(() => {
    if (videoRef.current && media.type === 'video') {
      videoRef.current.src = media.src;
      videoRef.current.currentTime = srcIn / FPS;
    }
  }, [media, srcIn]);

  const handleApply = () => {
    const newOut = Math.min(srcIn + duration, maxSrcOut);
    onApply(clip.id, srcIn, newOut);
    onClose();
  };

  return (
    <DraggableModal
      title={`Roll Edit — ${clip.name}`}
      onClose={onClose}
      minimizable={false}
      body={
        <div style={{ padding: 12 }}>
          <p className="modal-desc">Adjust which part of the source is used. Timeline in/out points stay fixed.</p>
          {media.type === 'video' && (
            <video ref={videoRef} className="roll-preview" controls muted />
          )}
          <div className="roll-controls">
            <label>
              <span>Source In: {formatTimecode(srcIn)}</span>
              <input
                type="range" min={0} max={Math.max(0, maxSrcOut - duration)}
                value={srcIn}
                onChange={e => {
                  const v = Number(e.target.value);
                  setSrcIn(v);
                  if (videoRef.current) videoRef.current.currentTime = v / FPS;
                }}
              />
            </label>
          </div>
          <div className="modal-footer" style={{ justifyContent: 'flex-end', padding: '8px 0 0' }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleApply}>Apply</button>
          </div>
        </div>
      }
    />
  );
}