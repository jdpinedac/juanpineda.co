#version 300 es
// Red esférica de Fibonacci en 3D: la geometría (rotación + proyección de
// los 34 nodos) llega ya calculada por frame vía u_nodes (xy pantalla en
// coords [0,aspect]x[0,1] + profundidad); aquí solo se evalúan distancias
// 2D. Enlaces por saltos de Fibonacci (+5/+8), un paquete por sentido en
// cada enlace y destellos al emitir/recibir. Paleta según u_light.
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_light; // 0 = tema oscuro, 1 = tema claro

const int N = 34; // Fibonacci; debe coincidir con NODE_COUNT en signal-field.ts
uniform vec3 u_nodes[N];

out vec4 outColor;

const float PHI = 1.61803398875;

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

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Misma paleta que tokens.css en cada tema.
  vec3 teal = mix(vec3(0.498, 0.847, 0.784), vec3(0.047, 0.478, 0.416), u_light);
  vec3 vio = mix(vec3(0.56, 0.49, 1.0), vec3(0.345, 0.278, 0.839), u_light);
  vec3 bg = mix(vec3(0.047, 0.067, 0.09), vec3(0.957, 0.965, 0.969), u_light);

  float nodeAcc = 0.0;
  float linkAcc = 0.0;
  float flashAcc = 0.0;
  float pktAcc = 0.0;
  vec3 pktCol = vec3(0.0);

  for (int i = 0; i < N; i++) {
    float fi = float(i);
    vec3 pa = u_nodes[i];
    float dfa = smoothstep(4.1, 1.8, pa.z); // niebla: cerca brilla

    // Enlaces por saltos de Fibonacci: vecinos espaciales en la retícula.
    for (int k = 0; k < 2; k++) {
      int j = i + (k == 0 ? 5 : 8);
      if (j >= N) continue;
      float fj = float(j);
      vec3 pb = u_nodes[j];
      float df = smoothstep(4.1, 1.8, 0.5 * (pa.z + pb.z));

      float d = sdSeg(p, pa.xy, pb.xy);
      // Culling: lejos del enlace no hay nada que sumar.
      if (d < 0.06) linkAcc += (exp(-d * 200.0) * 0.14 + exp(-d * 900.0) * 0.2) * df;

      // Tráfico bidireccional: un paquete por sentido (petición y
      // respuesta), fases y velocidades en potencias de 1/φ. El ciclo se
      // cierra en los nodos: el destino absorbe y el origen emite.
      float dfb = smoothstep(4.1, 1.8, pb.z);
      float dir = step(0.5, hash(vec2(fj * 2.1, fi)));
      vec3 colPkt = mix(teal, vio, hash(vec2(fi + fj, 3.0)));
      for (int m = 0; m < 2; m++) {
        float fm = float(m);
        float pdir = (m == 0) ? dir : 1.0 - dir;
        vec2 oP = mix(pa.xy, pb.xy, pdir);  // origen en pantalla
        vec2 dP = mix(pb.xy, pa.xy, pdir);  // destino en pantalla
        float dfO = mix(dfa, dfb, pdir);
        float dfD = mix(dfb, dfa, pdir);
        float sp = 0.15 * pow(1.0 / PHI, mod(fi + fj + fm, 3.0));
        float s = fract(u_time * sp + fm / PHI + hash(vec2(fj, fi)));
        float se = mix(s, 1.0 - s, pdir);
        vec2 q = mix(pa.xy, pb.xy, se);
        float qd = mix(pa.z, pb.z, se);
        float dq = length(p - q);
        if (dq < 0.05) {
          float glow = exp(-dq * (240.0 + 120.0 * qd)) * smoothstep(4.1, 1.8, qd);
          pktAcc += glow;
          pktCol += glow * colPkt;
        }

        // Destello: el origen al emitir (s≈0), el destino al recibir (s≈1).
        float dO = length(p - oP);
        float dD = length(p - dP);
        if (dO < 0.07) flashAcc += exp(-dO * 120.0) * smoothstep(0.1, 0.0, s) * dfO;
        if (dD < 0.07) flashAcc += exp(-dD * 120.0) * smoothstep(0.9, 1.0, s) * dfD;
      }
    }

    // Nodo base: jerarquía áurea en tamaño/brillo, niebla por profundidad.
    float wgt = 0.45 + 0.55 * pow(1.0 / PHI, mod(fi, 5.0) * 0.5);
    float dn = length(p - pa.xy);
    if (dn < 0.16) {
      nodeAcc += (exp(-dn * (230.0 + 120.0 * pa.z) / wgt) * 0.95 + exp(-dn * 70.0) * 0.06) * wgt * dfa;
    }
  }

  // Composición por mezcla (funciona igual sobre fondo claro u oscuro).
  vec3 col = bg;
  col = mix(col, mix(vio, teal, uv.x), clamp(linkAcc * 0.55, 0.0, 1.0));
  col = mix(col, teal, clamp(nodeAcc, 0.0, 1.0));
  col = mix(col, pktCol / max(pktAcc, 0.001), clamp(pktAcc, 0.0, 1.0) * 0.85);
  col = mix(col, mix(teal, vec3(1.0 - 0.85 * u_light), 0.5), clamp(flashAcc, 0.0, 1.0) * 0.9);

  // Más tenue abajo, donde vive el texto del hero.
  col = mix(bg, col, 0.35 + 0.5 * uv.y);

  // Banda de tráfico al pie.
  float bins = floor(uv.x * 96.0) / 96.0;
  float amp = 0.06 + 0.16 * vnoise(vec2(bins * 14.0, u_time * 0.9)) +
    0.08 * vnoise(vec2(bins * 40.0, u_time * 1.7));
  float fft = smoothstep(amp, amp - 0.012, uv.y) * step(uv.y, 0.30) * 0.9;
  col = mix(col, mix(teal, vio, bins), fft * 0.5);

  // Viñeta hacia el fondo de página.
  float v = smoothstep(1.25, 0.35, length(uv - vec2(0.5, 0.55)));
  col = mix(bg, col, v);

  // Fundido a fondo puro en el borde inferior: sin costura con la
  // siguiente sección.
  col = mix(col, bg, smoothstep(0.05, 0.0, uv.y));

  outColor = vec4(col, 1.0);
}
