import { useEffect, useRef } from 'react';

const DEFAULT_SHADER = 'haezans_shader';
const ACTIVE_SHADER_KEY = 'juicecut.shaders.active';

function getSelectedShader(): string {
  try {
    return window.localStorage.getItem(ACTIVE_SHADER_KEY) || DEFAULT_SHADER;
  } catch {
    return DEFAULT_SHADER;
  }
}

interface ShaderSources {
  vert: string;
  frag: string;
}

async function loadShaderSources(shaderName: string): Promise<ShaderSources | null> {
  try {
    const mod = await import(`../shaders/${shaderName}/index.ts`);
    return {
      vert: mod.viewerBackgroundVert as string,
      frag: mod.viewerBackgroundFrag as string,
    };
  } catch (e) {
    console.error(`ShaderBackground: failed to load shader "${shaderName}"`, e);
    return null;
  }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('ShaderBackground compile error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/** Full-screen procedural shader behind the viewer canvas, loaded from the selected shader pack. */
export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) {
      console.error('ShaderBackground: WebGL2 context unavailable');
      return;
    }

    let disposed = false;
    let rafId = 0;
    let ro: ResizeObserver | null = null;
    let cleanupGL: (() => void) | null = null;

    const setup = async (shaderName: string) => {
      const sources = await loadShaderSources(shaderName);
      if (!sources || disposed) return;

      const vs = compile(gl, gl.VERTEX_SHADER, sources.vert);
      const fs = compile(gl, gl.FRAGMENT_SHADER, sources.frag);
      if (!vs || !fs) return;

      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('ShaderBackground link error:', gl.getProgramInfoLog(prog));
        return;
      }
      gl.useProgram(prog);

      // Full-screen triangle
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      const uRes = gl.getUniformLocation(prog, 'u_res');
      const uResolution = gl.getUniformLocation(prog, 'u_resolution');
      const uTime = gl.getUniformLocation(prog, 'u_time');

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = Math.floor(rect.width * dpr);
        const h = Math.floor(rect.height * dpr);
        if (w === 0 || h === 0) return false;
        if (canvas.width === w && canvas.height === h) return true;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        return true;
      };
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(canvas);

      let loggedFirstFrame = false;
      const start = performance.now();
      const loop = () => {
        if (canvas.width === 0 || canvas.height === 0) resize();
        if (canvas.width > 0 && canvas.height > 0) {
          if (!loggedFirstFrame) {
            loggedFirstFrame = true;
            console.log(`ShaderBackground: "${shaderName}" first frame at`, canvas.width, 'x', canvas.height);
          }
          if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
          if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);
          gl.uniform1f(uTime, (performance.now() - start) / 1000);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);

      cleanupGL = () => {
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buf);
      };
    };

    setup(getSelectedShader());

    // Live-switch when the shader selector dispatches a change
    const onShaderChange = (e: Event) => {
      const shaderName = (e as CustomEvent<{ shaderName?: string }>).detail?.shaderName;
      if (!shaderName) return;
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      cleanupGL?.();
      cleanupGL = null;
      setup(shaderName);
    };
    window.addEventListener('juicecut-shader-change', onShaderChange);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      cleanupGL?.();
      window.removeEventListener('juicecut-shader-change', onShaderChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="shader-background" />;
}
