import { useEffect, useRef } from 'react';

const VERT = `#version 300 es
layout(location = 0) in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Animated plasma background — procedural, no input texture.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv * 6.0;
  float t = u_time * 0.6;
  float v = sin(p.x + t)
          + sin((p.y + t) * 0.7)
          + sin((p.x + p.y + t) * 0.5)
          + sin(length(p - vec2(sin(t * 0.3), cos(t * 0.4)) * 2.5) * 1.2 - t);
  v *= 0.25;
  vec3 col = 0.5 + 0.5 * cos(vec3(v * 3.14159) + vec3(0.0, 2.1, 4.2));
  // Keep it dark so overlaying UI text stays readable
  outColor = vec4(col * 0.25, 1.0);
}
`;

/** Procedural GLSL background rendered behind the viewer canvas (proof-of-concept). */
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
    console.log('ShaderBackground: WebGL2 context created');

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('ShaderBackground compile error:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
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
    const uTime = gl.getUniformLocation(prog, 'u_time');

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);
      if (w === 0 || h === 0) return false; // not laid out yet
      if (canvas.width === w && canvas.height === h) return true;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      return true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let rafId = 0;
    let loggedFirstFrame = false;
    const start = performance.now();
    const loop = () => {
      // Keep trying until layout gives us a real size (mount before layout)
      if (canvas.width === 0 || canvas.height === 0) resize();
      if (canvas.width > 0 && canvas.height > 0) {
        if (!loggedFirstFrame) {
          loggedFirstFrame = true;
          console.log('ShaderBackground: first frame rendered at', canvas.width, 'x', canvas.height);
        }
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (performance.now() - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={canvasRef} className="shader-background" />;
}
