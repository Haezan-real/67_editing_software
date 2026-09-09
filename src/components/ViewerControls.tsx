import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import type { TimelineClip, MediaItem } from '../types';
import { formatTimecode } from '../types';
import { SETTINGS_CHANGED_EVENT } from '../state/settingsEvents';

interface Props {
  clips: TimelineClip[];
  mediaItems: Map<string, MediaItem>;
  playhead: number;
  playing: boolean;
  totalFrames: number;
  onPlayPause: () => void;
  onSeek: (frame: number) => void;
  style?: React.CSSProperties;
}

export default function ViewerControls({
  clips, mediaItems, playhead, playing, totalFrames,
  onPlayPause, onSeek, style
}: Props) {
  const [controlsType, setControlsType] = useState<string>(() => {
    try { return window.localStorage.getItem('juicecut.settings.viewerControlsType') || 'compact'; } catch { return 'compact'; }
  });
  const [timecodePanel, setTimecodePanel] = useState<string>(() => {
    try { return window.localStorage.getItem('juicecut.settings.timecodePanel') || 'both'; } catch { return 'both'; }
  });

  useEffect(() => {
    const handler = () => {
      try { setControlsType(window.localStorage.getItem('juicecut.settings.viewerControlsType') || 'compact'); } catch {}
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      try { setTimecodePanel(window.localStorage.getItem('juicecut.settings.timecodePanel') || 'both'); } catch {}
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  const progress = totalFrames > 0 ? (playhead / totalFrames) * 100 : 0;

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.round(ratio * totalFrames));
  };

  const skipBtn = (onClick: () => void, title: string, icon: React.ReactNode, className: string) => (
    <button onClick={onClick} title={title} className={`ctrl-btn ${className}`}>{icon}</button>
  );

  return (
    <>
      {controlsType === 'compact' ? (
        <div className="viewer-controls viewer-controls--compact" style={style}>
          {skipBtn(() => onSeek(0), 'Go to start', <SkipBack size={12} />, 'ctrl-btn-small')}
          <button onClick={onPlayPause} title={playing ? 'Pause' : 'Play'} className="viewer-play-btn ctrl-btn-small">
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
          {skipBtn(() => onSeek(totalFrames), 'Go to end', <SkipForward size={12} />, 'ctrl-btn-small')}
          <div onClick={handleScrub} style={{ flex:1, position:'relative', height: 3, borderRadius:2, background:'var(--border-mid)', cursor:'pointer' }}>
            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${progress}%`, background:'var(--input-field)', borderRadius:2 }} />
            <div style={{ position:'absolute', top:'50%', left:`${progress}%`, transform:'translate(-50%,-50%)', width:8, height:8, borderRadius:'50%', background:'var(--text-primary)', boxShadow:'0 0 0 2px var(--bg-panel)', pointerEvents:'none' }} />
          </div>
          {timecodePanel === 'viewer' || timecodePanel === 'both' ? (
            <span className="viewer-timecode">{formatTimecode(playhead)}</span>
          ) : null}
          <Volume2 size={12} className="viewer-volume-icon viewer-volume-icon--compact" />
        </div>
      ) : (
        <div className="viewer-controls viewer-controls--full" style={style}>
          <div onClick={handleScrub} style={{ flex:1, position:'relative', height: 4, borderRadius:2, background:'var(--border-mid)', cursor:'pointer' }}>
            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${progress}%`, background:'var(--input-field)', borderRadius:2 }} />
            <div style={{ position:'absolute', top:'50%', left:`${progress}%`, transform:'translate(-50%,-50%)', width:8, height:8, borderRadius:'50%', background:'var(--text-primary)', boxShadow:'0 0 0 2px var(--bg-panel)', pointerEvents:'none' }} />
          </div>
          <div className="viewer-controls-row">
            {timecodePanel === 'viewer' || timecodePanel === 'both' ? (
              <span className="viewer-timecode viewer-timecode--full">{formatTimecode(playhead)}</span>
            ) : (
              <span className="viewer-timecode-placeholder" />
            )}
            <div className="viewer-controls-center">
              {skipBtn(() => onSeek(0), 'Go to start', <SkipBack size={14} />, 'ctrl-btn')}
              <button onClick={onPlayPause} title={playing ? 'Pause' : 'Play'} className="viewer-play-btn ctrl-btn">
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              {skipBtn(() => onSeek(totalFrames), 'Go to end', <SkipForward size={14} />, 'ctrl-btn')}
            </div>
            <div className="viewer-controls-right">
              <Volume2 size={14} className="viewer-volume-icon viewer-volume-icon--full" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}