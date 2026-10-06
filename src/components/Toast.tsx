// Simple DOM-based toast notification class
// Can be used anywhere in the program with: new Toast(message)

//src/components/Toast.tsx

class Toast {
  private static activeToast: HTMLDivElement | null = null;
  private static activeTimer: ReturnType<typeof setTimeout> | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  show(targetElement?: HTMLElement | null) {
    // Remove any existing toast
    Toast.hide();

    const reason = this.message;
    
    // Get the target position
    let left = 0;
    let top = 0;

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      left = rect.left + rect.width / 2 - 110;
      top = rect.bottom + 10;
    } else {
      left = (window as any).mouseX || window.innerWidth / 2;
      top = (window as any).mouseY || window.innerHeight / 2;
    }

    // Clamp to viewport
    if (left < 10) left = 10;
    if (left > window.innerWidth - 230) left = window.innerWidth - 230;

    // Create the arrow
    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 50%;
      margin-left: -8px;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid var(--border-mid, #334155);
    `;

    // Create the arrow fill (overlaps the arrow border minus 1px)
    const arrowFill = document.createElement('div');
    arrowFill.style.cssText = `
      position: absolute;
      bottom: calc(100% - 1px);
      left: 50%;
      margin-left: -7px;
      width: 0;
      height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-bottom: 7px solid var(--bg-elevated, #1e293b);
    `;

    // Create the toast content
    const content = document.createElement('div');
    content.innerHTML = reason;
    content.style.cssText = `
      background: var(--bg-elevated, #1e293b);
      border: 1px solid var(--border-mid, #334155);
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 12px;
      color: var(--text-primary, #f1f5f9);
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      text-align: center;
      line-height: 1.4;
    `;

    // Create the container
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: ${top}px;
      z-index: 999999;
      pointer-events: none;
      display: inline-block;
    `;
    container.appendChild(arrow);
    container.appendChild(arrowFill);
    container.appendChild(content);
    document.body.appendChild(container);

    // Position the container so the arrow points to the target center
    const toastRect = container.getBoundingClientRect();
    const toastWidth = toastRect.width;
    if (targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const targetCenterX = targetRect.left + targetRect.width / 2;
      // Position so the arrow (center of toast) aligns with target center
      container.style.left = `${targetCenterX - toastWidth / 2}px`;
    } else {
      // Center on mouse position or viewport center
      const mouseX = (window as any).mouseX || window.innerWidth / 2;
      container.style.left = `${mouseX - toastWidth / 2}px`;
    }

    // Track as active toast
    Toast.activeToast = container;

    // Auto-hide after 2 seconds
    Toast.activeTimer = setTimeout(() => {
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        if (container.parentNode) container.parentNode.removeChild(container);
        if (Toast.activeToast === container) Toast.activeToast = null;
      }, 300);
    }, 2000);
  }

  static hide() {
    if (Toast.activeToast) {
      Toast.activeToast.remove();
      Toast.activeToast = null;
    }
    if (Toast.activeTimer) {
      clearTimeout(Toast.activeTimer);
      Toast.activeTimer = null;
    }
  }
}

// Track mouse position globally
if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e: MouseEvent) => {
    (window as any).mouseX = e.clientX;
    (window as any).mouseY = e.clientY;
  }, true);
}

// Convenience function for backwards compatibility
export function showToast(reason: string, targetElement?: HTMLElement | null) {
  new Toast(reason).show(targetElement);
}

// Export the class as default for new usage
export default Toast;
