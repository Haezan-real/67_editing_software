/**
 * haezans_shader/index.ts
 *
 * Shader sources for each panel this shader skins, exported as raw GLSL
 * strings. Filename = the panel being replaced (e.g. viewerBackground).
 * Procedural only: u_resolution + u_time, no input texture.
 */

export { default as viewerBackgroundVert } from './viewerBackground.vert?raw';
export { default as viewerBackgroundFrag } from './viewerBackground.frag?raw';
