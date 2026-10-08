/**
 * haezans_shader/index.ts
 *
 * One shader, many looks. The fragment shader selects its visual mode via
 * u_look (see settings.json "looks"); per-look knobs ride in u_params.
 * Look/params can be switched live from the settings menu via setLook() /
 * setLookParams() — no program recompile needed.
 */

import VERTEX_SOURCE from './main.vert?raw';
import FRAGMENT_SOURCE from './main.frag?raw';
import CURSOR_VERT_SOURCE from './cursor.vert?raw';
import CURSOR_FRAG_SOURCE from './cursor.frag?raw';
import SETTINGS from './settings.json';

export const SHADER_SETTINGS = SETTINGS;

const QUAD_VERTICES = new Float32Array([
  -1.0,  1.0,    0.0, 0.0,
  -1.0, -1.0,    0.0, 1.0,
   1.0,  1.0,    1.0, 0.0,
   1.0, -1.0,    1.0, 1.0,
]);

const UNIFORM_NAMES = [
  'u_texture',
  'u_resolution',
  'u_time',
  'u_strength',
  'u_look',
  'u_params',
  'u_themeColors',
  'u_medianHue',
  'u_medianSat',
  'u_medianBright',
] as const;

const CURSOR_UNIFORM_NAMES = [
  'u_cursorPos',
  'u_cursorSize',
  'u_resolution',
  'u_time',
  'u_medianHue',
  'u_medianSat',
  'u_medianBright',
] as const;

export interface ShaderRenderer {
  readonly program: WebGLProgram | null;
  readonly uniforms: Record<string, WebGLUniformLocation | null>;

  init(gl: WebGL2RenderingContext, config?: { customCursor?: boolean }): boolean;
  resize(gl: WebGL2RenderingContext, width: number, height: number): void;
  renderFrame(
    gl: WebGL2RenderingContext,
    frame: VideoFrame,
    time: number,
    strength: number,
    themeColors?: Float32Array,
  ): void;
  updateThemeColors(colors: Float32Array): void;
  updateMedianHue(hue: number): void;
  updateMedianSat(sat: number): void;
  updateMedianBright(bright: number): void;
  setCursorPosition(x: number, y: number): void;

  /** Select the active look by id (see settings.json). No-op for unknown ids. */
  setLook(lookId: number): void;
  /** Set the four generic look knobs; each look reads the ones it declares. */
  setLookParams(x: number, y: number, z: number, w: number): void;

  destroy(gl: WebGL2RenderingContext): void;
}

function compileShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
  const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }

  gl.detachShader(prog, vs);
  gl.detachShader(prog, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  return prog;
}

export function createShaderRenderer(): ShaderRenderer {
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let vbo: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  const uniforms: Record<string, WebGLUniformLocation | null> = {};

  let cursorEnabled = false;
  let cursorProgram: WebGLProgram | null = null;
  const cursorUniforms: Record<string, WebGLUniformLocation | null> = {};
  let cursorVao: WebGLVertexArrayObject | null = null;
  let cursorX = 0.5;
  let cursorY = 0.5;

  let textureWidth = 1;
  let textureHeight = 1;

  let themeColorsArray: Float32Array | null = null;
  let medianHueValue = 0.0;
  let medianSatValue = 0.0;
  let medianBrightValue = 0.0;

  // Current look selection; applied every frame (cheap uniform writes, no state churn)
  let lookId = 0;
  let lookParams: [number, number, number, number] = [0.4, 0.5, 0.0, 0.0];

  const renderer: ShaderRenderer = {
    get program() { return program; },
    get uniforms() { return uniforms; },

    init(gl: WebGL2RenderingContext, config?: { customCursor?: boolean }): boolean {
      cursorEnabled = config?.customCursor ?? false;

      program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
      if (!program) return false;

      for (const name of UNIFORM_NAMES) {
        uniforms[name] = gl.getUniformLocation(program, name);
      }

      if (cursorEnabled) {
        cursorProgram = createProgram(gl, CURSOR_VERT_SOURCE, CURSOR_FRAG_SOURCE);
        if (!cursorProgram) {
          console.warn('Custom cursor: failed to compile cursor program — disabling');
          cursorEnabled = false;
        } else {
          for (const name of CURSOR_UNIFORM_NAMES) {
            cursorUniforms[name] = gl.getUniformLocation(cursorProgram, name);
          }
          cursorVao = gl.createVertexArray();
          gl.bindVertexArray(cursorVao);
          gl.bindVertexArray(null);
        }
      }

      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);

      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);

      const texLoc = gl.getAttribLocation(program, 'a_texCoord');
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);

      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      return true;
    },

    resize(gl: WebGL2RenderingContext, width: number, height: number): void {
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      if (uniforms.u_resolution) {
        gl.uniform2f(uniforms.u_resolution, width, height);
      }
      if (cursorEnabled && cursorProgram) {
        gl.useProgram(cursorProgram);
        if (cursorUniforms.u_resolution) {
          gl.uniform2f(cursorUniforms.u_resolution, width, height);
        }
      }
    },

    updateThemeColors(colors: Float32Array): void {
      themeColorsArray = colors;
    },

    updateMedianHue(hue: number): void {
      medianHueValue = hue;
    },

    updateMedianSat(sat: number): void {
      medianSatValue = sat;
    },

    updateMedianBright(bright: number): void {
      medianBrightValue = bright;
    },

    setLook(id: number): void {
      if (!SETTINGS.looks.some(look => look.id === id)) return;
      lookId = id;
    },

    setLookParams(x: number, y: number, z: number, w: number): void {
      lookParams = [x, y, z, w];
    },

    renderFrame(
      gl: WebGL2RenderingContext,
      frame: VideoFrame,
      time: number,
      strength: number,
      themeColors?: Float32Array,
    ): void {
      if (frame.displayWidth !== textureWidth || frame.displayHeight !== textureHeight) {
        textureWidth = frame.displayWidth;
        textureHeight = frame.displayHeight;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA,
          textureWidth, textureHeight, 0,
          gl.RGBA, gl.UNSIGNED_BYTE, null,
        );
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      if (uniforms.u_texture) gl.uniform1i(uniforms.u_texture, 0);
      if (uniforms.u_time) gl.uniform1f(uniforms.u_time, time);
      if (uniforms.u_strength) gl.uniform1f(uniforms.u_strength, strength);
      if (uniforms.u_look) gl.uniform1i(uniforms.u_look, lookId);
      if (uniforms.u_params) gl.uniform4f(uniforms.u_params, ...lookParams);

      const colorsToUse = themeColors ?? themeColorsArray;
      if (uniforms.u_themeColors && colorsToUse) {
        gl.uniform3fv(uniforms.u_themeColors, colorsToUse);
      }
      if (uniforms.u_medianHue) gl.uniform1f(uniforms.u_medianHue, medianHueValue);
      if (uniforms.u_medianSat) gl.uniform1f(uniforms.u_medianSat, medianSatValue);
      if (uniforms.u_medianBright) gl.uniform1f(uniforms.u_medianBright, medianBrightValue);

      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (cursorEnabled && cursorProgram && cursorVao) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(cursorProgram);
        gl.bindVertexArray(cursorVao);

        if (cursorUniforms.u_cursorPos) gl.uniform2f(cursorUniforms.u_cursorPos, cursorX, cursorY);
        if (cursorUniforms.u_cursorSize) gl.uniform1f(cursorUniforms.u_cursorSize, 15.0);
        if (cursorUniforms.u_resolution) gl.uniform2f(cursorUniforms.u_resolution, gl.canvas.width, gl.canvas.height);
        if (cursorUniforms.u_time) gl.uniform1f(cursorUniforms.u_time, time);
        if (cursorUniforms.u_medianHue) gl.uniform1f(cursorUniforms.u_medianHue, medianHueValue);
        if (cursorUniforms.u_medianSat) gl.uniform1f(cursorUniforms.u_medianSat, medianSatValue);
        if (cursorUniforms.u_medianBright) gl.uniform1f(cursorUniforms.u_medianBright, medianBrightValue);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.bindVertexArray(null);
        gl.disable(gl.BLEND);
      }
    },

    setCursorPosition(x: number, y: number): void {
      cursorX = x;
      cursorY = y;
    },

    destroy(gl: WebGL2RenderingContext): void {
      if (vao) gl.deleteVertexArray(vao);
      if (vbo) gl.deleteBuffer(vbo);
      if (cursorVao) gl.deleteVertexArray(cursorVao);
      if (texture) gl.deleteTexture(texture);
      if (program) gl.deleteProgram(program);
      if (cursorProgram) gl.deleteProgram(cursorProgram);
      vao = null;
      vbo = null;
      cursorVao = null;
      texture = null;
      program = null;
      cursorProgram = null;
      cursorEnabled = false;
    },
  };

  return renderer;
}
