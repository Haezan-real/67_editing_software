export type ZoomEpicenter = 'playneedle' | 'middle' | 'cursor';
export type ViewerControlsType = 'compact' | 'centered';
export type TimecodePanel = 'timeline' | 'viewer' | 'both' | 'none';
export type TorusScrollingDisabled = 'whole torus menu' | 'annular sectors only' | 'none';

export interface SettingsValues {
  guiScale: number;
  includeResizeInUndo: boolean;
  zoomEpicenter: ZoomEpicenter;
  scrollSmooth: number;
  scrollAmount: number;
  scrollZoomAmount: number;
  scrollZoomSmoothness: number;
  viewerControlsType: ViewerControlsType;
  timecodePanel: TimecodePanel;
  torusScrollingDisabled: TorusScrollingDisabled;
  elevatedPanelDarken: number;
  elevatedPanelBlur: number;
  draggableHeaderButtons: boolean;
  allowMultipleMenus: boolean;
  allowEditsWhenMenuOpen: boolean;
  executeHeaderButtonsOnDrag: boolean;
  playneedle_t: number;
  playneedle_j: number;
  playneedle_k: number;
  playneedle_s: number;
  playneedle_v_o: number;
  playneedle_h_b: number;
  playneedle_h_r: number;
  playneedleIconHorizontalStretch: number;
  colorTransitionDuration: number;
}

export const DEFAULT_SETTINGS: SettingsValues = {
  guiScale: 100,
  includeResizeInUndo: true,
  zoomEpicenter: 'playneedle',
  scrollSmooth: 50,
  scrollAmount: 100,
  scrollZoomAmount: 25,
  scrollZoomSmoothness: 70,
  viewerControlsType: 'compact',
  timecodePanel: 'both',
  torusScrollingDisabled: 'none',
  elevatedPanelDarken: 50,
  elevatedPanelBlur: 0,
  draggableHeaderButtons: true,
  allowMultipleMenus: true,
  allowEditsWhenMenuOpen: true,
  executeHeaderButtonsOnDrag: true,
  playneedle_t: 0.092,
  playneedle_j: 0.049,
  playneedle_k: 103,
  playneedle_s: 16.4,
  playneedle_v_o: 0.4,
  playneedle_h_b: 0.8,
  playneedle_h_r: 1,
  playneedleIconHorizontalStretch: 0.4,
  colorTransitionDuration: 0,
};

export const DEFAULT_LAYOUT = {
  playheadTop: 15,
  leftWidthPct: 20,
  leftCollapsed: false,
  timelineHeightPct: 35,
};

export const DEFAULT_TORUS_SETTINGS = {
  duration: 300,
  easing: 50,
  delay: 0,
  hoverScale: 1.08,
  scrollingDisabled: DEFAULT_SETTINGS.torusScrollingDisabled,
};

export const DEFAULT_PLAYNEEDLE_WIDTH = 20;
export const MIN_PLAYNEEDLE_WIDTH = 0;
export const MAX_PLAYNEEDLE_WIDTH = 100;
export const PLAYNEEDLE_WIDTH_STORAGE_KEY = 'juicecut.settings.playneedle_width';
