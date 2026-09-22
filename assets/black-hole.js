import { vertexShader, fragmentShader } from './black-hole-shader.js';

const art = document.querySelector('.cosmic-art');
if (art) {
  try { initialize(art); }
  catch { /* Keep the static artwork when graphics are unavailable. */ }
}

function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL2 is unavailable');
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error);
    }
    return shader;
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexShader);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentShader);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  const uniforms = Object.fromEntries(['resolution', 'view', 'pointer', 'time', 'pulse'].map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
  return {
    draw(state, width, height) {
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform2f(uniforms.view, state.roll, state.elevation);
      gl.uniform2f(uniforms.pointer, state.pointerX, state.pointerY);
      gl.uniform1f(uniforms.time, state.time);
      gl.uniform1f(uniforms.pulse, state.pulse);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { gl.deleteProgram(program); },
  };
}

function initialize(root) {
  const surface = root.querySelector('.cosmic-window');
  const canvas = root.querySelector('.cosmic-canvas');
  const trails = root.querySelector('.cosmic-trails');
  const ink = trails.getContext('2d');
  let renderer;
  try { renderer = createRenderer(canvas); }
  catch (error) { root.dataset.error = error.message; return; }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const initial = { roll: -0.12, elevation: 0.17 };
  const state = { ...initial, pointerX: 0, pointerY: 0, time: 0, pulse: 0 };
  const target = { x: 0, y: 0 };
  let width = 188, height = 167, ratio = 1;
  let hover = false, visible = false, ready = true;
  let pointer = null, pointerStart, previous, distance = 0;
  let velocity = 0, suppressClick = false;
  let stars = [], frame = 0, last = 0, lastPaint = 0, clock = 0, intro = 2.2;
  let launchCount = 0;

  function cancel() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    root.dataset.running = 'false';
  }
  function shouldMove() {
    return hover || pointer !== null || stars.length > 0 || intro > 0 || Math.abs(velocity) > .002
      || Math.abs(state.pointerX - target.x) + Math.abs(state.pointerY - target.y) > .001;
  }
  function schedule() {
    if (!ready || !visible || document.hidden || frame) return;
    frame = requestAnimationFrame(tick);
  }
  function draw() {
    if (!ready) return;
    renderer.draw(state, canvas.width, canvas.height);
    drawStars();
    root.dataset.view = `${state.roll.toFixed(3)},${state.elevation.toFixed(3)}`;
  }
  function tick(now) {
    frame = 0;
    if (!ready || !visible || document.hidden) { last = 0; return; }
    if (now - lastPaint < 1000 / 30) { schedule(); return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 30;
    last = lastPaint = now;
    if (reduceMotion.matches) {
      state.pointerX = target.x;
      state.pointerY = target.y;
      velocity = 0;
      stars = [];
      intro = 0;
      draw();
      last = 0;
      root.dataset.running = 'false';
      return;
    }
    clock += dt;
    intro = Math.max(0, intro - dt);
    state.time += dt * (hover || pointer !== null ? 1.25 : .4);
    const ease = 1 - Math.exp(-9 * dt);
    state.pointerX += (target.x - state.pointerX) * ease;
    state.pointerY += (target.y - state.pointerY) * ease;
    if (pointer === null) {
      state.roll += velocity * dt;
      velocity *= Math.exp(-4.2 * dt);
    }
    state.pulse = stars.reduce((value, star) => Math.max(value, Math.exp(-Math.pow((clock - star.birth - 1.8) / .2, 2))), 0);
    stars = stars.filter(star => clock - star.birth < 2.3);
    draw();
    if (shouldMove()) schedule();
    else { last = 0; root.dataset.running = 'false'; }
  }
  function wake() {
    if (!ready || !visible || document.hidden) return;
    root.dataset.running = 'true';
    schedule();
  }
  function local(event) {
    const rect = surface.getBoundingClientRect();
    return { x: (event.clientX - rect.left - rect.width / 2) / (rect.height / 2), y: (rect.top + rect.height / 2 - event.clientY) / (rect.height / 2) };
  }
  function launch(point = { x: .92, y: .14 }) {
    if (!ready) return;
    launchCount++;
    root.dataset.launches = String(launchCount);
    if (reduceMotion.matches) {
      state.time += 1.6;
      draw();
      return;
    }
    const radius = Math.max(.68, Math.min(1.0, Math.hypot(point.x, point.y)));
    stars.push({ birth: clock, radius, angle: Math.atan2(-point.y, point.x) - state.roll });
    if (stars.length > 7) stars.shift();
    wake();
  }
  function orbit(star, age) {
    const t = Math.max(0, Math.min(1, age / 2.05));
    const r = star.radius * Math.pow(1 - t, .57);
    const angle = star.angle + t * 8.5 + t * t * 6;
    const x = r * Math.cos(angle), y = r * Math.sin(angle) * (.32 + state.elevation * .32);
    const c = Math.cos(state.roll), s = Math.sin(state.roll);
    return { x: (x * c - y * s) * height / 2 + width / 2, y: (x * s + y * c) * height / 2 + height / 2, alpha: (1 - Math.pow(t, 6)) * Math.min(1, t * 14), t };
  }
  function drawStars() {
    if (!ink) return;
    ink.clearRect(0, 0, width, height);
    ink.globalCompositeOperation = 'lighter';
    for (const star of stars) {
      const age = clock - star.birth;
      if (age < 0 || age > 2.05) continue;
      for (let tail = 17; tail >= 0; tail--) {
        const a = orbit(star, age - tail * .012);
        const b = orbit(star, age - (tail + 1) * .012);
        ink.beginPath();
        ink.moveTo(a.x, a.y);
        ink.lineTo(b.x, b.y);
        ink.strokeStyle = `rgba(244,213,166,${a.alpha * (1 - tail / 18) * .66})`;
        ink.lineWidth = .8;
        ink.stroke();
      }
      const head = orbit(star, age);
      ink.beginPath();
      ink.arc(head.x, head.y, 1.05, 0, Math.PI * 2);
      ink.fillStyle = `rgba(255,244,219,${head.alpha})`;
      ink.shadowColor = '#f2c18a';
      ink.shadowBlur = 7;
      ink.fill();
      ink.shadowBlur = 0;
    }
  }
  function resize() {
    const rect = root.getBoundingClientRect();
    width = rect.width; height = rect.height;
    ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = trails.width = Math.round(width * ratio);
    canvas.height = trails.height = Math.round(height * ratio);
    if (ink) ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  surface.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hover = true;
    const p = local(event); target.x = p.x; target.y = p.y;
    wake();
  });
  surface.addEventListener('pointerleave', () => {
    hover = false;
    if (pointer === null) { target.x = target.y = 0; wake(); }
  });
  surface.addEventListener('pointerdown', event => {
    if (pointer !== null || event.button !== 0) return;
    pointer = event.pointerId;
    previous = pointerStart = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    distance = 0;
    velocity = 0;
    suppressClick = false;
    root.dataset.dragging = 'true';
    surface.setPointerCapture(pointer);
    wake();
  });
  surface.addEventListener('pointermove', event => {
    if (pointer !== null && event.pointerId === pointer) {
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      const elapsed = Math.max(16, event.timeStamp - previous.time);
      const sensitivity = 1.55 / width;
      state.roll += dx * sensitivity;
      state.elevation = Math.max(.025, Math.min(1.0, state.elevation + dy * sensitivity * .65));
      velocity = Math.max(-2.0, Math.min(2.0, dx * sensitivity / (elapsed / 1000)));
      distance = Math.max(distance, Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y));
      previous = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      target.x = target.y = 0;
      wake();
    } else if (event.pointerType === 'mouse') {
      const p = local(event); target.x = p.x; target.y = p.y;
      wake();
    }
  });
  function release(event, canceled = false) {
    if (event.pointerId !== pointer) return;
    suppressClick = canceled || distance > 4;
    if (canceled || reduceMotion.matches) velocity = 0;
    const id = pointer;
    pointer = null;
    root.dataset.dragging = 'false';
    if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
    target.x = target.y = 0;
    wake();
  }
  surface.addEventListener('pointerup', event => release(event));
  surface.addEventListener('pointercancel', event => release(event, true));
  surface.addEventListener('lostpointercapture', event => release(event, true));
  surface.addEventListener('click', event => {
    if (suppressClick && event.detail) { suppressClick = false; return; }
    suppressClick = false;
    launch(event.detail ? local(event) : undefined);
  });
  surface.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') state.roll -= .16;
    if (event.key === 'ArrowRight') state.roll += .16;
    if (event.key === 'ArrowUp') state.elevation = Math.min(1.0, state.elevation + .10);
    if (event.key === 'ArrowDown') state.elevation = Math.max(.025, state.elevation - .10);
    if (event.key === 'Escape' || event.key === 'Home') {
      Object.assign(state, initial, { time: 0, pointerX: 0, pointerY: 0, pulse: 0 });
      target.x = target.y = 0;
      velocity = 0; stars = []; intro = 0;
    }
    draw();
    wake();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancel(); ready = false;
    root.dataset.ready = 'false';
    surface.hidden = true;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    try {
      renderer = createRenderer(canvas);
      ready = true;
      surface.hidden = false;
      resize();
      root.dataset.ready = 'true';
    } catch { /* Leave the static fallback visible. */ }
  });
  reduceMotion.addEventListener('change', () => {
    cancel(); stars = []; velocity = 0; intro = 0;
    state.pointerX = target.x; state.pointerY = target.y;
    draw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel();
    else if (shouldMove()) wake();
  });
  new ResizeObserver(resize).observe(root);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && shouldMove()) wake();
    else cancel();
  }, { threshold: .05 }).observe(root);
  surface.hidden = false;
  resize();
  root.dataset.ready = 'true';
}
