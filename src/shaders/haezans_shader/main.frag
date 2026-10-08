#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_strength;

// Look selection (see settings.json "looks")
uniform int u_look;
// Generic per-look knobs; each look reads the ones it cares about
uniform vec4 u_params;   // x, y, z, w = param 1..4

// ─── Look 1: Plasma ─────────────────────────────────────────────────────────
vec3 lookPlasma(vec4 tex, float intensity, float speed) {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * speed;
  float plasma = (
    sin(uv.x * 10.0 + t) +
    sin(uv.y * 10.0 + t * 1.3) +
    sin((uv.x + uv.y) * 8.0 + t * 0.7) +
    sin(length(uv - 0.5) * 15.0 - t * 2.0)
  ) * 0.25;

  vec3 plasmaColor = vec3(
    sin(plasma * 3.14159 + t) * 0.5 + 0.5,
    sin(plasma * 3.14159 + t + 2.094) * 0.5 + 0.5,
    sin(plasma * 3.14159 + t + 4.188) * 0.5 + 0.5
  );

  vec2 distortion = vec2(
    sin(plasma * 5.0 + t),
    cos(plasma * 5.0 + t)
  ) * 0.02 * intensity;
  vec3 distorted = texture(u_texture, v_texCoord + distortion).bgr;

  vec3 col = mix(distorted, plasmaColor, intensity);
  return mix(tex.bgr, col, u_strength);
}

// ─── Look 2: Vignette + Grain ────────────────────────────────────────────────
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 lookVignetteGrain(vec4 tex, float vignetteStrength, float grainStrength) {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec3 col = tex.bgr;

  float d = distance(uv, vec2(0.5));
  col *= smoothstep(0.85, 0.85 - vignetteStrength * 0.6, d);

  float grain = (hash(gl_FragCoord.xy + fract(u_time) * 100.0) - 0.5) * grainStrength;
  col += grain;

  return mix(tex.bgr, col, u_strength);
}

// ─── Look 3: Hue Drift ───────────────────────────────────────────────────────
vec3 hueShift(vec3 col, float shift) {
  const vec3 k = vec3(0.57735);
  float c = cos(shift);
  float s = sin(shift);
  return col * c + cross(k, col) * s + k * dot(k, col) * (1.0 - c);
}

vec3 lookHueDrift(vec4 tex, float driftSpeed) {
  vec3 col = tex.bgr;
  float shift = u_time * driftSpeed * 6.28318;
  vec3 shifted = hueShift(col, mod(shift, 6.28318));
  return mix(col, shifted, u_strength);
}

void main() {
  vec4 tex = texture(u_texture, v_texCoord);

  if (u_look == 1) {
    outColor = vec4(lookPlasma(tex, u_params.x, u_params.y), 1.0);
  } else if (u_look == 2) {
    outColor = vec4(lookVignetteGrain(tex, u_params.x, u_params.y), 1.0);
  } else if (u_look == 3) {
    outColor = vec4(lookHueDrift(tex, u_params.x), 1.0);
  } else {
    // Look 0 / unknown: passthrough
    outColor = vec4(tex.bgr, 1.0);
  }
}
