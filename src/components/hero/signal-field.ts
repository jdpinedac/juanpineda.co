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
 * Monta la cascada SDR en el canvas. Si WebGL2 no está disponible no hace
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

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset.ready = '';
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

  const onLost = (e: Event) => {
    e.preventDefault();
    running = false;
    cancelAnimationFrame(raf);
    delete canvas.dataset.ready; // el fallback CSS vuelve a verse
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const onResize = () => {
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
    canvas.removeEventListener('webglcontextlost', onLost);
    window.removeEventListener('resize', onResize);
  };
}
