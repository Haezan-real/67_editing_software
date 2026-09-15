import React, { useRef, useEffect } from 'react';

interface Props {
  orientation: 'vertical' | 'horizontal';
  onChange: (delta: number) => void;
  onDragEnd?: () => void;
  thickness?: number;
  background?: string;
}

export default function Splitter({ orientation, onChange, onDragEnd, thickness = 8, background }: Props) {
  const startRef = useRef(0);
  const draggingRef = useRef(false);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const handlePointerMove = (e: PointerEvent) => {
    if (!draggingRef.current) return;
    const pos = orientation === 'vertical' ? e.clientX : e.clientY;
    const delta = pos - startRef.current;
    startRef.current = pos;
    onChange(delta);
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (onDragEnd) onDragEnd();
  };

  const handleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    // Signal any open torus menu to close
    try {
      window.dispatchEvent(new CustomEvent('juicecut-torus-close'));
    } catch {}
    startRef.current = orientation === 'vertical' ? e.clientX : e.clientY;
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const style: React.CSSProperties = orientation === 'vertical'
    ? { width: thickness, cursor: 'col-resize', flexShrink: 0, ...(background ? { background } : {}) }
    : { height: thickness, cursor: 'row-resize', flexShrink: 0, ...(background ? { background } : {}) };

  return <div role="separator" aria-orientation={orientation} onPointerDown={handleDown} style={style} />;
}

