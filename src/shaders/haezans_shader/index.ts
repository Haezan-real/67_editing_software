/**
 * haezans_shader/index.ts
 *
 * Base shaders live as <name>.vert / <name>.frag pairs in this folder.
 * This file assigns a base shader to each panel — swap the import here to
 * change a panel's look. All shaders use the same convention:
 * full-screen triangle, attribute location 0, uniforms u_resolution + u_time.
 */

import neonGridVert from './neonGrid.vert?raw';
import neonGridFrag from './neonGrid.frag?raw';
import plasmaMorphVert from './plasmaMorph.vert?raw';
import plasmaMorphFrag from './plasmaMorph.frag?raw';

export const baseShaders = {
  neonGrid: { vert: neonGridVert, frag: neonGridFrag },
  plasmaMorph: { vert: plasmaMorphVert, frag: plasmaMorphFrag },
} as const;

export type BaseShaderName = keyof typeof baseShaders;

// ─── Panel assignments ──────────────────────────────────────────────────────
// Change a panel's look by pointing it at a different base shader.
export const panelAssignments: Record<string, BaseShaderName> = {
  viewerBackground: 'neonGrid',
};

// Resolved sources per panel, consumed by canvas components.
export const viewerBackgroundVert = baseShaders[panelAssignments.viewerBackground].vert;
export const viewerBackgroundFrag = baseShaders[panelAssignments.viewerBackground].frag;
