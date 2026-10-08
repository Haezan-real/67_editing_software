#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;

// Neon grid — synthwave-style perspective floor grid
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // Perspective: horizon at 60% height, floor below it
  float horizon = 0.6;
  vec3 col = vec3(0.02, 0.0, 0.05); // deep purple sky

  if (uv.y < horizon) {
    float depth = (horizon - uv.y) / horizon;          // 0 at horizon, 1 at bottom
    float pz = 1.0 / max(depth, 0.05);                  // perspective divide
    vec2 gp = vec2((uv.x - 0.5) * pz * 4.0, pz + u_time * 2.0); // grid position, scrolling

    vec2 grid = abs(fract(gp) - 0.5);
    float line = smoothstep(0.48, 0.5, max(grid.x, grid.y));
    float fade = exp(-depth * 4.0);                     // fade near horizon

    vec3 gridCol = vec3(1.0, 0.1, 0.6);                 // hot pink lines
    col += gridCol * line * fade * 0.7;
    col += vec3(0.05, 0.0, 0.12) * (1.0 - depth);       // floor base glow
  } else {
    // Sky: subtle vertical gradient + slow pulse
    float sky = (uv.y - horizon) / (1.0 - horizon);
    col += vec3(0.05, 0.0, 0.1) * sky;
    col += vec3(0.08, 0.0, 0.15) * (0.5 + 0.5 * sin(u_time * 0.8)) * (1.0 - sky);
  }

  outColor = vec4(col, 1.0);
}
