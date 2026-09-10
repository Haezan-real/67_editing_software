//preload.cjs
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

console.log('🔧 Preload script loaded');

// 1. Read config.json safely
const configPath = path.join(__dirname, 'config.json');
let borderRadius = '0px'; // Default fallback
try {
  const configData = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configData);
  
  // Explicitly check for undefined so that '0' is treated as a valid number
  const radiusVal = config.electron_window_border_radius !== undefined 
    ? config.electron_window_border_radius 
    : 0;
    
  borderRadius = `${radiusVal}px`;
} catch (err) {
  console.error('🔧 Failed to read config.json in preload:', err);
}

// 2. Inject the CSS variable safely AFTER the DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --electron-window-border-radius: ${borderRadius};
    }
  `;
  
  // Double-check that document.head exists before appending
  if (document.head) {
    document.head.appendChild(style);
  }
});

function subscribe(channel, callback) {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

// 3. Expose an explicit, allowlisted IPC API
contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window-maximize'),
  toggleFullscreen: () => ipcRenderer.send('window-fullscreen'),
  closeWindow: () => ipcRenderer.send('window-close'),
  toggleAppClickthrough: () => ipcRenderer.send('toggle-app-clickthrough'),
  requestShaderChange: (shaderName) => {
    if (typeof shaderName === 'string' && shaderName.length > 0) {
      ipcRenderer.send('change-shader', shaderName);
    }
  },
  sendCursorPosition: (position) => {
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
      ipcRenderer.send('cursor-move', { x: position.x, y: position.y });
    }
  },
  sendShaderFps: (fps) => {
    if (Number.isFinite(fps)) ipcRenderer.send('shader-fps', fps);
  },
  sendShaderColors: (colors) => {
    if (Array.isArray(colors) && colors.every(color => Number.isFinite(color))) {
      ipcRenderer.send('update-shader-colors', colors);
    }
  },
  onShaderFps: callback => subscribe('shader-fps', callback),
  onCursorMove: callback => subscribe('cursor-move', callback),
  onApplyShader: callback => subscribe('apply-shader', callback),
  onShaderColorsUpdate: callback => subscribe('shader-colors-update', callback),
  getWindowSourceId: () => ipcRenderer.invoke('get-window-source-id'),
  getWindowSourceDesktopId: () => ipcRenderer.invoke('get-window-source-desktop-id'),
  notifyShaderWindowReady: () => ipcRenderer.send('shader-window-ready'),
});