//src/components/GlobalStyleSettings.tsx
// Single source of truth for universal color settings used by every theme.
// Any theme (or component) that wants to define or read a color value should
// import from this file so that the key set and ordering stay consistent.

export type ColorVarName =
  | '--bg-panel'
  | '--bg-base'
  | '--bg-viewer'
  | '--bg-elevated' //draggable modal background
  | '--bg-hover'
  | '--border'
  | '--border-mid'
  | '--splitter'
  | '--text-primary'
  | '--text-secondary'
  | '--text-muted'
  | '--input-field'
  | '--input-field-bg' //secondary input field
  | '--playneedle'
  | '--video-bg'
  | '--highlight-color'
  | '--automation-line';

export type ThemeColors = Record<ColorVarName, string>;

export interface ColorField {
  varName: ColorVarName;
  label: string;
}

// Ordered list of universal color fields. The order here is the canonical
// display order in the styles UI and the order in which every theme must
// supply values.
export const colorFields: ColorField[] = [
  { varName: '--bg-panel', label: 'Primary background' },
  { varName: '--bg-base', label: 'Secondary background' },
  { varName: '--bg-viewer', label: 'Viewer background' },
  { varName: '--video-bg', label: 'Video background / transparent pixels' },
  { varName: '--bg-elevated', label: 'Panel elevated background' },
  { varName: '--bg-hover', label: 'Hover background' },
  { varName: '--border', label: 'Border / Grid line (dark)' },
  { varName: '--border-mid', label: 'Border / Grid line (mid)' },
  { varName: '--splitter', label: 'Splitters' },
  { varName: '--text-primary', label: 'Primary text' },
  { varName: '--text-secondary', label: 'Secondary text' },
  { varName: '--text-muted', label: 'Muted text' },
  { varName: '--input-field', label: 'Input field primary' },
  { varName: '--input-field-bg', label: 'Input field secondary' },
  { varName: '--playneedle', label: 'Playneedle' },
  { varName: '--highlight-color', label: 'Highlight color' },
  { varName: '--automation-line', label: 'Automation line' },
];
