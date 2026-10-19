import fragSrc from './signal.frag.glsl?raw';

const VERT = `#version 300 es
in vec2 p;
void main() {
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const DPR_CAP = 1.75;
/** Frame fijo que se dibuja con prefers-reduced-motion. */
const STILL_TIME = 12.0;

/**
 * Monta el campo de señal (red 3D de Fibonacci) en el canvas. Si WebGL2 no está disponible no hace
 * nada y el fallback CSS queda a la vista. Devuelve una función de limpieza.
 */
export function mountSignalField(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    powerPreference: 'low-power',
  });
  if (!gl) return () => {};

  const compile = (type: number, src: string): WebGLShader | null => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return () => {};

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return () => {};
  gl.useProgram(prog);

  // Un solo triángulo que cubre la pantalla.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uLight = gl.getUniformLocation(prog, 'u_light');
  const uNodes = gl.getUniformLocation(prog, 'u_nodes');

  // Retícula esférica de Fibonacci: la rotación y proyección de los nodos
  // se calculan aquí UNA vez por frame (no por pixel) y viajan por uniform.
  const NODE_COUNT = 34; // debe coincidir con N en signal.frag.glsl
  const GOLDEN_ANGLE = 2.39996322973;
  const nodeZ = new Float32Array(NODE_COUNT);
  const nodeR = new Float32Array(NODE_COUNT);
  for (let i = 0; i < NODE_COUNT; i++) {
    nodeZ[i] = 1 - (2 * (i + 0.5)) / NODE_COUNT;
    nodeR[i] = Math.sqrt(1 - nodeZ[i] * nodeZ[i]);
  }
  const nodesOut = new Float32Array(NODE_COUNT * 3);

  const projectNodes = (t: number) => {
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const cy = Math.cos(t * 0.09);
    const sy = Math.sin(t * 0.09);
    const ax = 0.42 + 0.12 * Math.sin(t * 0.047);
    const cx = Math.cos(ax);
    const sx = Math.sin(ax);
    for (let i = 0; i < NODE_COUNT; i++) {
      const a = i * GOLDEN_ANGLE + 0.04 * Math.sin(t * 0.13 + i);
      let x = nodeR[i] * Math.cos(a) + 0.008 * Math.sin(t * 0.21 + i * 1.7);
      let y = nodeR[i] * Math.sin(a) + 0.008 * Math.cos(t * 0.17 + i * 2.3);
      let z = nodeZ[i];
      // giro (Y) + cabeceo (X)
      const x1 = cy * x + sy * z;
      const z1 = -sy * x + cy * z;
      const y1 = cx * y - sx * z1;
      const z2 = sx * y + cx * z1;
      // perspectiva; pantalla en coords [0,aspect]x[0,1], centro áureo
      const depth = z2 + 2.7;
      const f = (0.52 * 2.2) / depth;
      nodesOut[i * 3] = 0.618 * aspect + x1 * f;
      nodesOut[i * 3 + 1] = 0.6 + y1 * f;
      nodesOut[i * 3 + 2] = depth;
    }
    gl.uniform3fv(uNodes, nodesOut);
  };

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lightQuery = window.matchMedia('(prefers-color-scheme: light)');
  // Tema efectivo: la elección del botón (data-theme) manda; si no, el sistema.
  const isLight = () => {
    const forced = document.documentElement.getAttribute('data-theme');
    return forced === 'light' || (forced !== 'dark' && lightQuery.matches);
  };
  let raf = 0;
  let running = false;
  let inView = true;
  let disposed = false;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  const drawFrame = (seconds: number) => {
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, seconds);
    gl.uniform1f(uLight, isLight() ? 1 : 0);
    projectNodes(seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!('ready' in canvas.dataset)) canvas.dataset.ready = '';
  };

  const loop = (ms: number) => {
    if (!running) return;
    drawFrame(ms / 1000);
    raf = requestAnimationFrame(loop);
  };

  const update = () => {
    if (disposed) return;
    const shouldRun = inView && !document.hidden && !motionQuery.matches;
    if (shouldRun && !running) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
    if (motionQuery.matches) drawFrame(STILL_TIME);
  };

  const io = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    update();
  });
  io.observe(canvas);

  const onVisibility = () => update();
  document.addEventListener('visibilitychange', onVisibility);
  motionQuery.addEventListener('change', update);

  // Cambio de tema (sistema o botón): si el loop corre lo toma en el próximo
  // frame; si está quieto por reduced-motion, redibuja el frame fijo.
  const onTheme = () => {
    if (disposed) return;
    if (motionQuery.matches) drawFrame(STILL_TIME);
  };
  lightQuery.addEventListener('change', onTheme);
  const themeObserver = new MutationObserver(onTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  const onLost = () => {
    // Pérdida de contexto = terminal: el fallback CSS vuelve y nada
    // (IO, visibilitychange, motion) puede reencender el loop muerto.
    disposed = true;
    running = false;
    cancelAnimationFrame(raf);
    delete canvas.dataset.ready;
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const onResize = () => {
    if (disposed) return;
    if (motionQuery.matches) drawFrame(STILL_TIME);
  };
  window.addEventListener('resize', onResize);

  update();

  return () => {
    disposed = true;
    running = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    motionQuery.removeEventListener('change', update);
    lightQuery.removeEventListener('change', onTheme);
    themeObserver.disconnect();
    canvas.removeEventListener('webglcontextlost', onLost);
    window.removeEventListener('resize', onResize);
  };
}
