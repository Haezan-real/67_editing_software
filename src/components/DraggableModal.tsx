import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { SETTINGS_CHANGED_EVENT, getSettingsChangedDetail } from '../state/settingsEvents';

interface DraggableModalProps {
  /** The title text shown in the header */
  title: ReactNode;
  /** The body content (hidden when minimized) */
  body: ReactNode;
  /** Called when the close (X) button is clicked */
  onClose: () => void;
  /** Additional CSS classes for the modal-box element */
  className?: string;
  /** Whether to show the minimize button (default: true) */
  minimizable?: boolean;
  /** Extra buttons/elements to render in the header (left side) */
  headerLeft?: ReactNode;
  /** Inline styles for the modal-box element */
  style?: React.CSSProperties;
  /** Unique key for persisting page state to localStorage (e.g., 'settings', 'styles') */
  persistenceKey?: string;
  /** Current page state to persist (e.g., active tab, selected folder) */
  pageState?: any;
  /** Called when modal is about to close to save page state */
  onSavePageState?: (state: any) => void;
  /** Called when modal opens to get the restored page state */
  onRestorePageState?: (state: any) => void;
}

/**
 * A reusable draggable, minimizable modal wrapper.
 * 
 * Usage:
 * <DraggableModal
 *   title="Settings"
 *   body={<div>Content here</div>}
 *   onClose={onClose}
 *   className="settings-modal"
 * />
 */
export default function DraggableModal({ 
  title, 
  body, 
  onClose, 
  className = '', 
  minimizable = true, 
  headerLeft, 
  style,
  persistenceKey,
  pageState,
  onSavePageState,
  onRestorePageState
}: DraggableModalProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [allowEditsWhenMenuOpen, setAllowEditsWhenMenuOpen] = useState(() => 
    (window as any).juicecut?.settings?.allowEditsWhenMenuOpen ?? true
  );
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasDraggedSignificantly = useRef(false);
  const draggedButtonRef = useRef<{ type: 'minimize' | 'close' | 'back'; action: () => void } | null>(null);
  const buttonExecutedRef = useRef(false); // Track if button was executed via mouseup
  const isFirstRender = useRef(true);
  // Refs to store latest callbacks without triggering re-renders
  const onRestorePageStateRef = useRef(onRestorePageState);
  const onSavePageStateRef = useRef(onSavePageState);
  onRestorePageStateRef.current = onRestorePageState;
  onSavePageStateRef.current = onSavePageState;

  // Restore page state from localStorage on mount (only once)
  useEffect(() => {
    if (persistenceKey && onRestorePageStateRef.current) {
      try {
        const saved = window.localStorage.getItem(`juicecut.modal.${persistenceKey}.pageState`);
        if (saved) {
          const parsed = JSON.parse(saved);
          onRestorePageStateRef.current(parsed);
        }
      } catch (e) {
        console.warn(`Failed to restore page state for ${persistenceKey}:`, e);
      }
    }
  }, [persistenceKey]);

  // Save page state to localStorage when it changes
  useEffect(() => {
    if (persistenceKey && pageState !== undefined && onSavePageStateRef.current) {
      try {
        window.localStorage.setItem(`juicecut.modal.${persistenceKey}.pageState`, JSON.stringify(pageState));
        onSavePageStateRef.current(pageState);
      } catch (e) {
        console.warn(`Failed to save page state for ${persistenceKey}:`, e);
      }
    }
  }, [persistenceKey, pageState]);

  const resetPosition = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setIsMinimized(false);
  }, []);

  const handleOverlayDoubleClick = useCallback((e: React.MouseEvent) => {
    // Only reset if double-clicking directly on the overlay background, not the modal
    // And only when allowEditsWhenMenuOpen is false (checkbox disabled)
    if (!allowEditsWhenMenuOpen && e.target === overlayRef.current) {
      resetPosition();
    }
  }, [resetPosition, allowEditsWhenMenuOpen]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Check if we should allow dragging on header buttons
    const allowDraggableButtons = (window as any).juicecut?.settings?.draggableHeaderButtons ?? true;
    // Check if execute on drag is enabled
    const executeOnDrag = (window as any).juicecut?.settings?.executeHeaderButtonsOnDrag ?? true;
    
    // Check if clicking on a header button
    const minimizeBtn = target.closest('.modal-minimize-btn') as HTMLButtonElement | null;
    const closeBtn = target.closest('[aria-label="Close"]') as HTMLButtonElement | null;
    const backBtn = target.closest('.icon-btn:not(.modal-minimize-btn):not([aria-label="Close"])') as HTMLButtonElement | null;
    
    const isHeaderButton = minimizeBtn || closeBtn || backBtn;
    
    // Always track which header button was clicked (if any) for potential execution on mouseup
    // This works regardless of draggableHeaderButtons setting
    if (isHeaderButton) {
      if (minimizeBtn) {
        draggedButtonRef.current = { 
          type: 'minimize', 
          action: () => setIsMinimized(m => !m) 
        };
      } else if (closeBtn) {
        draggedButtonRef.current = { 
          type: 'close', 
          action: onClose 
        };
      } else if (backBtn) {
        draggedButtonRef.current = { 
          type: 'back', 
          action: () => backBtn.click() 
        };
      }
      
      // If execute on drag is enabled, start dragging to allow execution on mouseup
      // even if draggableHeaderButtons is false
      if (executeOnDrag) {
        setIsDragging(true);
        hasDraggedSignificantly.current = false;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        // Get the modal element's current screen position
        const modalEl = overlayRef.current?.querySelector('.modal-box') as HTMLElement | null;
        if (modalEl) {
          const modalRect = modalEl.getBoundingClientRect();
          // Store the offset from click point to the modal's top-left corner
          dragOffset.current = {
            x: e.clientX - modalRect.left,
            y: e.clientY - modalRect.top,
          };
        }
        return;
      }
    } else {
      draggedButtonRef.current = null;
    }
    
    // If draggableHeaderButtons is false and clicking a header button, 
    // don't start dragging (let the button's onClick handle it normally)
    // But if draggableHeaderButtons is true, start dragging
    if (!allowDraggableButtons && isHeaderButton) {
      // Don't start dragging, let button's onClick fire normally
      // Reset drag tracking so the onClick can execute normally
      hasDraggedSignificantly.current = false;
      return;
    }
    
    setIsDragging(true);
    hasDraggedSignificantly.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    // Get the modal element's current screen position
    const modalEl = overlayRef.current?.querySelector('.modal-box') as HTMLElement | null;
    if (modalEl) {
      const modalRect = modalEl.getBoundingClientRect();
      // Store the offset from click point to the modal's top-left corner
      dragOffset.current = {
        x: e.clientX - modalRect.left,
        y: e.clientY - modalRect.top,
      };
    }
  }, [onClose]);

  // Listen for settings changes to update allowEditsWhenMenuOpen reactively
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = getSettingsChangedDetail(e);
      if (detail?.key === 'allowEditsWhenMenuOpen') {
        setAllowEditsWhenMenuOpen(detail.value ?? true);
      }
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Track if drag distance exceeds threshold
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDraggedSignificantly.current = true;
      }
      
      // Directly set the modal position so the anchor point stays under the cursor
      const modalEl = overlayRef.current?.querySelector('.modal-box') as HTMLElement | null;
      if (modalEl) {
        const modalW = modalEl.offsetWidth;
        const modalH = modalEl.offsetHeight;
        // position.x is the offset from viewport center
        // We want: modalRect.left = e.clientX - dragOffset.x
        // modalRect.left = viewportCenterX + position.x - modalW/2 (from the CSS)
        // So: position.x = e.clientX - dragOffset.x + modalW/2 - viewportCenterX
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;
        setPosition({
          x: e.clientX - dragOffset.current.x + modalW / 2 - vw / 2,
          y: e.clientY - dragOffset.current.y + modalH / 2 - vh / 2,
        });
      }
    };

const handleMouseUp = () => {
      // If we moused down on a header button and execute on drag is enabled, execute it
      // This executes on mouseup regardless of where the mouse is or how far we dragged
      if (draggedButtonRef.current) {
        const shouldExecute = (window as any).juicecut?.settings?.executeHeaderButtonsOnDrag ?? true;
        if (shouldExecute) {
          draggedButtonRef.current.action();
          buttonExecutedRef.current = true; // Mark as handled so onClick won't also fire
        }
      }
      setIsDragging(false);
      draggedButtonRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" ref={overlayRef} onDoubleClick={handleOverlayDoubleClick}>
      {!allowEditsWhenMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          color: 'var(--text-muted)',
          fontSize: 14,
          opacity: 0.6,
          letterSpacing: '0.3px',
        }}>
          Double click background to return modal to center
        </div>
      )}
      <div
        className={`modal-box ${className}`}
        style={{
          position: 'fixed',
          left: `calc(50% + ${position.x}px)`,
          top: `calc(50% + ${position.y}px)`,
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
          ...style,
          ...(isMinimized ? { height: 'auto', minHeight: 0, maxHeight: 'none', overflow: 'hidden' } : {}),
        }}
      >
        <div
          className="modal-header modal-header--centered"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
        >
          {headerLeft}
          <span className="panel-title settings-title" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>{title}</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginLeft: 'auto', height: '100%' }}>
            {minimizable && (
             <button
                className="icon-btn modal-minimize-btn"
                onClick={() => { 
                  const shouldExecute = (window as any).juicecut?.settings?.executeHeaderButtonsOnDrag ?? true; 
                  // If execute on drag is enabled and we already executed via mouseup, skip this click
                  if (shouldExecute && buttonExecutedRef.current) {
                    buttonExecutedRef.current = false;
                    return;
                  }
                  setIsMinimized(m => !m); 
                }}
                aria-label={isMinimized ? 'Restore' : 'Minimize'}
                title={isMinimized ? 'Restore' : 'Minimize'}
                style={{ width: 32, height: 32 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
            <button className="icon-btn" onClick={(e) => { 
                const shouldExecute = (window as any).juicecut?.settings?.executeHeaderButtonsOnDrag ?? true; 
                // If execute on drag is enabled and we already executed via mouseup, skip this click
                if (shouldExecute && buttonExecutedRef.current) {
                  buttonExecutedRef.current = false;
                  return;
                }
                // Save page state before closing
                if (persistenceKey && pageState !== undefined && onSavePageStateRef.current) {
                  try {
                    window.localStorage.setItem(`juicecut.modal.${persistenceKey}.pageState`, JSON.stringify(pageState));
                    onSavePageStateRef.current(pageState);
                  } catch (e) {
                    console.warn(`Failed to save page state for ${persistenceKey}:`, e);
                  }
                }
                onClose(); 
              }} aria-label="Close" style={{ width: 32, height: 32 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        {!isMinimized && body}
      </div>
    </div>
  );
}