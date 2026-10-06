import { type ThemeColors } from './GlobalStyleSettings';

//src/components/ThemeColors.tsx

export const ogDarkColors: ThemeColors = {
  '--bg-panel': '#13141a', '--bg-base': '#0c0d10', '--bg-viewer': '#060608',
  '--bg-elevated': '#1a1c24', '--bg-hover': '#21242f', '--border': '#262830',
  '--border-mid': '#303340', '--splitter': '#08090d', '--text-primary': '#e8eaf0',
  '--text-secondary': '#8b8fa8', '--text-muted': '#4a4d5e', '--input-field': '#2c3349',
  '--input-field-bg': '#16131a', '--playneedle': '#f5f5f5', '--video-bg': '#0a0a0a',
  '--highlight-color': '#38bdf8',
  '--automation-line': '#38bdf8',
};

export const ogLightColors: ThemeColors = {
  '--bg-panel': '#f0f1f5', '--bg-base': '#e8e9ed', '--bg-viewer': '#d4d5d9',
  '--bg-elevated': '#ffffff', '--bg-hover': '#e2e4e8', '--border': '#c5c7cc',
  '--border-mid': '#d8dade', '--splitter': '#c8c9cd', '--text-primary': '#1a1c24',
  '--text-secondary': '#4a4d5e', '--text-muted': '#8b8fa8', '--input-field': '#4a5568',
  '--input-field-bg': '#e2e4e8', '--playneedle': '#1a1c24', '--video-bg': '#d0d2d8',
  '--highlight-color': '#0ea5e9',
  '--automation-line': '#0ea5e9',
};

export const monokaiColors: ThemeColors = {
  '--bg-panel': '#272822', '--bg-base': '#1c1e19', '--bg-viewer': '#1c1e19',
  '--bg-elevated': '#3c3d38', '--bg-hover': '#49483e', '--border': '#414339',
  '--border-mid': '#5a5c54', '--splitter': '#161815', '--text-primary': '#f8f8f2',
  '--text-secondary': '#a6e22e', '--text-muted': '#75715e', '--input-field': '#66d9ef',
  '--input-field-bg': '#3b3a32', '--playneedle': '#f92672', '--video-bg': '#131411',
  '--highlight-color': '#66d9ef',
  '--automation-line': '#66d9ef',
};

export const lavenderColors: ThemeColors = {
  '--bg-panel': '#2D1C4D', '--bg-base': '#1B0A3A', '--bg-viewer': '#15043A',
  '--bg-elevated': '#392358', '--bg-hover': '#432A66', '--border': '#684A9C',
  '--border-mid': '#7E5DBA', '--splitter': '#15082f', '--text-primary': '#E5DEF1',
  '--text-secondary': '#B1A3D0', '--text-muted': '#8A7B9C', '--input-field': '#7953C2',
  '--input-field-bg': '#27184A', '--playneedle': '#C4A8E8', '--video-bg': '#0d0618',
  '--highlight-color': '#a78bfa',
  '--automation-line': '#a78bfa',
};

export const cyberpunkColors: ThemeColors = {
  '--bg-panel': '#0D0221', '--bg-base': '#05010F', '--bg-viewer': '#000000',
  '--bg-elevated': '#1A0440', '--bg-hover': '#240650', '--border': '#FF00C8',
  '--border-mid': '#00F0FF', '--splitter': '#1a0035', '--text-primary': '#39FF14',
  '--text-secondary': '#00F0FF', '--text-muted': '#8A2BE2', '--input-field': '#FF00C8',
  '--input-field-bg': '#0A0118', '--playneedle': '#00F0FF', '--video-bg': '#000000',
  '--highlight-color': '#00F0FF',
  '--automation-line': '#00F0FF',
};

export const oakColors: ThemeColors = {
  '--bg-panel': '#362E2E', '--bg-base': '#2A2222', '--bg-viewer': '#1F1717',
  '--bg-elevated': '#4C4242', '--bg-hover': '#5D5050', '--border': '#706060',
  '--border-mid': '#857373', '--splitter': '#231c1c', '--text-primary': '#D4C4C4',
  '--text-secondary': '#A99A9A', '--text-muted': '#807070', '--input-field': '#b0796d',
  '--input-field-bg': '#3F3737', '--playneedle': '#d2899d', '--video-bg': '#150e0e',
  '--highlight-color': '#f59e0b',
  '--automation-line': '#f59e0b',
};

export const forestColors: ThemeColors = {
  '--bg-panel': '#1A332A', '--bg-base': '#0F261E', '--bg-viewer': '#0A1C15',
  '--bg-elevated': '#2B4D40', '--bg-hover': '#3C6656', '--border': '#4A7A6C',
  '--border-mid': '#609181', '--splitter': '#0b1f1a', '--text-primary': '#B2E8B2',
  '--text-secondary': '#88D888', '--text-muted': '#60B860', '--input-field': '#5F9EA0',
  '--input-field-bg': '#223D34', '--playneedle': '#61ff9f', '--video-bg': '#050f08',
  '--highlight-color': '#4ade80',
  '--automation-line': '#4ade80',
};

export const aquaticColors: ThemeColors = {
  '--bg-panel': '#1A3D3D', '--bg-base': '#0F2A2A', '--bg-viewer': '#0A1F1F',
  '--bg-elevated': '#224848', '--bg-hover': '#2A5555', '--border': '#3A6F6F',
  '--border-mid': '#4A7F7F', '--splitter': '#0D2323', '--text-primary': '#B2E8B2',
  '--text-secondary': '#88D8B8', '--text-muted': '#60B89F', '--input-field': '#469985',
  '--input-field-bg': '#163333', '--playneedle': '#00D8B0', '--video-bg': '#081818',
  '--highlight-color': '#00D8B0',
  '--automation-line': '#00D8B0',
};

export const themesByName: Record<string, ThemeColors> = {
  'og-dark': ogDarkColors,
  'og-light': ogLightColors,
  'monokai': monokaiColors,
  'lavender': lavenderColors,
  'cyberpunk': cyberpunkColors,
  'oak': oakColors,
  'forest': forestColors,
  'aquatic': aquaticColors,
};