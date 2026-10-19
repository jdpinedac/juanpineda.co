// Shader alterno del hero. Para activarlo: copiar sobre ../signal.frag.glsl
// (mismos uniforms: u_res, u_time, u_light). Guardado 2026-10-19.
#version 300 es
// Waterfall SDR literal: filas de espectro cayendo (como gqrx/SDR++),
// piso de ruido moteado, portadoras que derivan y banda FFT coherente.
// Paleta según u_light.
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_light; // 0 = tema oscuro, 1 = tema claro

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

// Señales del espectro en la frecuencia x para la fila (instante) dada.
// Composición áurea: posiciones por secuencia de Weyl (fract(c + i/φ),
// mínima discrepancia: nunca se amontonan), la dominante en la sección
// áurea del ancho (x≈0.618), y jerarquía de amplitud/ancho/ritmo en
// potencias de 1/φ (una protagonista, el resto decrece geométricamente).
const float PHI = 1.61803398875;

float signalAt(float x, float row) {
  float sig = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    // Secuencia áurea calibrada para que i=0 caiga en x=0.618.
    float fx = 0.07 + 0.86 * fract(0.637 + fi / PHI);
    float wgt = pow(1.0 / PHI, fi * 0.5); // jerarquía: 1, .79, .62, .49, .38
    fx += 0.012 * wgt * sin(row * 0.015 * pow(PHI, fi * 0.5) + fi * 2.2);
    float bw = 0.011 * pow(1.0 / PHI, fi * 0.8) + 0.0012;
    float d = abs(x - fx);
    float env = smoothstep(bw, bw * 0.2, d);
    // Ritmos inconmensurables: el periodo de actividad escala por φ.
    float act = smoothstep(0.26, 0.6, vnoise(vec2(fi * 7.3, row * 0.05 / pow(PHI, fi * 0.4))));
    float tex = 0.55 + 0.45 * vnoise(vec2((x - fx) * 700.0, row * 0.35));
    sig += wgt * env * act * tex;
  }
  return sig;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;

  // Rejilla del waterfall: filas de 3 px cayendo a 24 px/s, bins de 3 px.
  float row = floor((gl_FragCoord.y + u_time * 24.0) / 3.0);
  float bin = floor(gl_FragCoord.x / 3.0);

  // Piso de ruido: moteado fino por celda, cae con la rejilla.
  float noiseFloor = pow(hash(vec2(bin, row)), 5.0) * 0.34;

  float w = clamp(noiseFloor + signalAt(uv.x, row), 0.0, 1.0);

  // Misma paleta que tokens.css en cada tema.
  vec3 teal = mix(vec3(0.498, 0.847, 0.784), vec3(0.047, 0.478, 0.416), u_light);
  vec3 vio = mix(vec3(0.56, 0.49, 1.0), vec3(0.345, 0.278, 0.839), u_light);
  vec3 bg = mix(vec3(0.047, 0.067, 0.09), vec3(0.957, 0.965, 0.969), u_light);

  // Mapa de calor del waterfall: fondo -> violeta -> teal (por mezcla,
  // funciona igual sobre fondo claro u oscuro).
  vec3 wcol = bg;
  wcol = mix(wcol, vio, smoothstep(0.08, 0.46, w) * 0.4);
  wcol = mix(wcol, teal, smoothstep(0.42, 0.92, w));
  // Más tenue abajo, donde vive el texto del hero.
  vec3 col = mix(bg, wcol, 0.3 + 0.55 * uv.y);

  // Banda FFT al pie, leyendo las mismas señales de "ahora".
  float rowNow = (u_time * 24.0) / 3.0;
  float spec = 0.06 + 0.1 * vnoise(vec2(uv.x * 30.0, u_time * 0.7)) +
    0.22 * clamp(signalAt(uv.x, rowNow), 0.0, 1.0);
  float fft = smoothstep(spec, spec - 0.012, uv.y) * step(uv.y, 0.30) * 0.9;
  float binsX = floor(uv.x * 96.0) / 96.0;
  col = mix(col, mix(teal, vio, binsX), fft * 0.5);

  // Viñeta hacia el fondo de página.
  float v = smoothstep(1.25, 0.35, length(uv - vec2(0.5, 0.55)));
  col = mix(bg, col, v);

  outColor = vec4(col, 1.0);
}
