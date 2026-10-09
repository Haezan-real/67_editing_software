#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;

// Animated plasma — the original ShaderBackground pattern.
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
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
