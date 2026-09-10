export interface CursorPosition {
  x: number;
  y: number;
}

export interface ElectronAPI {
  minimizeWindow: () => void;
  toggleMaximizeWindow: () => void;
  toggleFullscreen: () => void;
  closeWindow: () => void;
  toggleAppClickthrough: () => void;
  requestShaderChange: (shaderName: string) => void;
  sendCursorPosition: (position: CursorPosition) => void;
  sendShaderFps: (fps: number) => void;
  sendShaderColors: (colors: number[]) => void;
  notifyShaderWindowReady: () => void;
  getWindowSourceId: () => Promise<string | null>;
  getWindowSourceDesktopId: () => Promise<string | null>;
  onShaderFps: (callback: (fps: number) => void) => () => void;
  onCursorMove: (callback: (position: CursorPosition) => void) => () => void;
  onApplyShader: (callback: (shaderName: string) => void) => () => void;
  onShaderColorsUpdate: (callback: (colors: number[]) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
