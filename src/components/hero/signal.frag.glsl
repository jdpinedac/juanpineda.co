#version 300 es
// Cascada SDR: espectro desplazándose, portadoras que derivan y banda FFT.
precision highp float;

uniform vec2 u_res;
uniform float u_time;

out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;

  // Cascada: campo de espectro cayendo lentamente.
  float t = u_time * 0.06;
  vec2 sp = vec2(uv.x * 7.0, uv.y * 2.6 + t * 4.0);
  float s = fbm(sp);
  s = pow(smoothstep(0.38, 0.95, s), 1.6);

  // Portadoras: líneas verticales persistentes con deriva y parpadeo.
  float car = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float fx = hash(vec2(fi * 3.7, 1.0)) * 0.8 + 0.1;
    fx += 0.015 * sin(u_time * 0.3 + fi * 2.2);
    float d = abs(uv.x - fx);
    float str = 0.6 + 0.4 * sin(u_time * (0.5 + hash(vec2(fi, 7.0))) + fi);
    car += str * exp(-d * 420.0) * 1.3 + str * exp(-d * 60.0) * 0.12;
  }

  // Banda FFT al pie.
  float bins = floor(uv.x * 96.0) / 96.0;
  float amp = 0.05 + 0.22 * fbm(vec2(bins * 14.0, u_time * 0.9));
  float fft = smoothstep(amp, amp - 0.012, uv.y) * step(uv.y, 0.30) * 0.9;

  vec3 teal = vec3(0.498, 0.847, 0.784);
  vec3 vio = vec3(0.56, 0.49, 1.0);
  vec3 bg = vec3(0.047, 0.067, 0.09);

  vec3 col = bg;
  col += s * mix(vio, teal, uv.x) * (0.16 + 0.5 * uv.y);
  col += car * teal * 0.8;
  col += fft * mix(teal, vio, bins) * 0.55;

  // Viñeta hacia el fondo de página.
  float v = smoothstep(1.25, 0.35, length(uv - vec2(0.5, 0.55)));
  col = mix(bg, col, v);

  outColor = vec4(col, 1.0);
}
