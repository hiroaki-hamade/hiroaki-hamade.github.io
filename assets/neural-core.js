import { drawNetwork, routeThrough, INITIAL_VIEW } from './neural-core-art.js';

const root = document.querySelector('.neural-art');
if (root) {
  try { initialize(root); }
  catch { /* A static image remains available if canvas is unsupported. */ }
}

function initialize(art) {
  const surface = art.querySelector('button');
  const canvas = art.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { ...INITIAL_VIEW, time: 0, hover: false, selected: 22, route: routeThrough(), signals: [] };
  let width = 188, height = 167, projected = [];
  let visible = false, frame = 0, last = 0, lastPaint = 0, clock = 0;
  let pointer = null, origin = null, previous = null, distance = 0;
  let velocity = { x: 0, y: 0 }, tilt = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  let suppressClick = false, count = 0, signals = [];

  function draw() {
    projected = drawNetwork(ctx, { ...state, yaw: state.yaw + tilt.x, pitch: state.pitch + tilt.y }, width, height);
    art.dataset.view = `${state.yaw.toFixed(3)},${state.pitch.toFixed(3)}`;
    art.dataset.route = state.route.join(',');
  }
  function resize() {
    const rect = art.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  function cancel() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    art.dataset.running = 'false';
  }
  function moving() {
    return !reduced.matches && (state.hover || pointer !== null || signals.length || Math.abs(velocity.x) + Math.abs(velocity.y) > .002 || Math.abs(tilt.x - target.x) + Math.abs(tilt.y - target.y) > .001);
  }
  function wake() {
    if (!visible || document.hidden || frame) return;
    art.dataset.running = 'true'; frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden) { cancel(); return; }
    if (now - lastPaint < 1000 / 30) { wake(); return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 30;
    last = lastPaint = now;
    if (!reduced.matches) {
      clock += dt; state.time += dt;
      if (pointer === null) {
        state.yaw += velocity.x * dt;
        state.pitch = Math.max(-.72, Math.min(.85, state.pitch + velocity.y * dt));
        velocity.x *= Math.exp(-5.0 * dt); velocity.y *= Math.exp(-5.0 * dt);
      }
      tilt.x += (target.x - tilt.x) * (1 - Math.exp(-10 * dt));
      tilt.y += (target.y - tilt.y) * (1 - Math.exp(-10 * dt));
      signals = signals.filter(signal => clock - signal.birth < 2.25);
      state.signals = signals.map(signal => ({ route: signal.route, progress: (clock - signal.birth) / 1.95 }));
    }
    draw();
    if (moving()) wake();
    else { last = 0; art.dataset.running = 'false'; }
  }
  function position(event) {
    const box = surface.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }
  function nearest(point) {
    return projected.reduce((best, node) => {
      const distance = Math.hypot(node.x - point.x, node.y - point.y);
      return distance < best.distance ? { id: node.id, distance } : best;
    }, { id: state.selected, distance: Infinity }).id;
  }
  function choose(event) {
    const p = position(event);
    const selected = nearest(p);
    if (selected !== state.selected) {
      state.selected = selected;
      state.route = routeThrough(selected, count);
    }
    if (!reduced.matches) {
      target.x = (p.x / width - .5) * .15;
      target.y = (p.y / height - .5) * .10;
    }
    draw(); wake();
  }
  function fire() {
    count++;
    state.route = routeThrough(state.selected, count);
    art.dataset.launches = String(count);
    if (!reduced.matches) {
      signals.push({ birth: clock, route: [...state.route] });
      if (signals.length > 6) signals.shift();
      wake();
    } else draw();
  }
  surface.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    state.hover = true; choose(event);
  });
  surface.addEventListener('pointerleave', () => {
    state.hover = false;
    target.x = target.y = 0;
    if (reduced.matches) draw();
    else wake();
  });
  surface.addEventListener('pointerdown', event => {
    if (pointer !== null || event.button !== 0) return;
    pointer = event.pointerId;
    origin = previous = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    distance = 0; velocity.x = velocity.y = 0; suppressClick = false;
    art.dataset.dragging = 'true'; surface.setPointerCapture(pointer);
    choose(event);
  });
  surface.addEventListener('pointermove', event => {
    if (pointer !== null && event.pointerId === pointer) {
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      const elapsed = Math.max(16, event.timeStamp - previous.time) / 1000;
      const horizontal = dx * 3.5 / width, vertical = dy * 1.7 / height;
      state.yaw += horizontal;
      state.pitch = Math.max(-.72, Math.min(.85, state.pitch + vertical));
      velocity.x = Math.max(-2, Math.min(2, horizontal / elapsed));
      velocity.y = Math.max(-1.1, Math.min(1.1, vertical / elapsed));
      target.x = target.y = 0;
      distance = Math.max(distance, Math.hypot(event.clientX - origin.x, event.clientY - origin.y));
      previous = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      draw(); wake();
    } else if (event.pointerType === 'mouse') choose(event);
  });
  function release(event, canceled = false) {
    if (event.pointerId !== pointer) return;
    suppressClick = canceled || distance > 4;
    if (canceled || reduced.matches) velocity.x = velocity.y = 0;
    const id = pointer; pointer = null;
    art.dataset.dragging = 'false';
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
    if (event.detail) state.selected = nearest(position(event));
    fire();
  });
  surface.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Home'].includes(event.key)) return;
    event.preventDefault();
    velocity.x = velocity.y = 0;
    if (event.key === 'ArrowLeft') state.yaw -= .16;
    if (event.key === 'ArrowRight') state.yaw += .16;
    if (event.key === 'ArrowUp') state.pitch = Math.min(.85, state.pitch + .1);
    if (event.key === 'ArrowDown') state.pitch = Math.max(-.72, state.pitch - .1);
    if (event.key === 'Escape' || event.key === 'Home') {
      Object.assign(state, INITIAL_VIEW, { route: routeThrough(), selected: 22, signals: [], time: 0 });
      signals = []; target.x = target.y = tilt.x = tilt.y = 0;
    }
    draw(); wake();
  });
  reduced.addEventListener('change', () => {
    cancel(); signals = []; state.signals = [];
    velocity.x = velocity.y = tilt.x = tilt.y = target.x = target.y = 0;
    draw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel();
    else if (moving()) wake();
  });
  new ResizeObserver(resize).observe(art);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && moving()) wake();
    else cancel();
  }, { threshold: .05 }).observe(art);
  if (!reduced.matches) signals = [{ birth: 0, route: [...state.route] }];
  surface.hidden = false; resize(); art.dataset.ready = 'true';
}
