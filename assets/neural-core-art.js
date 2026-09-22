// An abstract, interactive neural network — not a diagram of a specific model.
const LAYERS = 5;
const SIDE = 3;
const SPACING = .69;
const HALF = .76;
export const INITIAL_VIEW = { yaw: -.63, pitch: .29 };

const nodes = Array.from({ length: LAYERS * SIDE * SIDE }, (_, id) => {
  const layer = Math.floor(id / 9), index = id % 9;
  return { id, layer, index, x: (layer - 2) * SPACING, y: (1 - Math.floor(index / 3)) * .49, z: (index % 3 - 1) * .49 };
});
const edges = [];
for (let layer = 0; layer < LAYERS - 1; layer++) {
  for (let index = 0; index < 9; index++) {
    const destinations = new Set([index, (index * 2 + 3 + layer) % 9]);
    for (const next of destinations) edges.push({ a: layer * 9 + index, b: (layer + 1) * 9 + next });
  }
}

export function routeThrough(anchor = 22, seed = 0) {
  const layer = Math.floor(anchor / 9);
  const route = Array(LAYERS);
  route[layer] = anchor;
  for (let i = layer; i < LAYERS - 1; i++) {
    const options = edges.filter(edge => edge.a === route[i]);
    route[i + 1] = options[(seed + i) % options.length].b;
  }
  for (let i = layer; i > 0; i--) {
    const options = edges.filter(edge => edge.b === route[i]);
    route[i - 1] = options[(seed + i) % options.length].a;
  }
  return route;
}

function mix(a, b, t) { return a + (b - a) * t; }
function roundedPlane(x) {
  const points = [], radius = .09;
  for (const [y, z, start] of [[HALF - radius, HALF - radius, 0], [-HALF + radius, HALF - radius, 90], [-HALF + radius, -HALF + radius, 180], [HALF - radius, -HALF + radius, 270]]) {
    for (let i = 0; i <= 5; i++) {
      const angle = (start + i * 18) * Math.PI / 180;
      points.push({ x, y: y + Math.cos(angle) * radius, z: z + Math.sin(angle) * radius });
    }
  }
  return points;
}

function projection(view) {
  const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
  const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
  function rotate(point) {
    const x = point.x * cy + point.z * sy;
    const z = -point.x * sy + point.z * cy;
    const y = point.y * cp - z * sp;
    const depth = point.y * sp + z * cp;
    const perspective = 7.8 / (7.8 - depth);
    return { x: x * perspective, y: -y * perspective, depth, perspective };
  }
  const corners = [];
  for (const x of [-1.45, 1.45]) for (const y of [-HALF, HALF]) for (const z of [-HALF, HALF]) corners.push(rotate({ x, y, z }));
  const maxX = Math.max(...corners.map(point => Math.abs(point.x)));
  const maxY = Math.max(...corners.map(point => Math.abs(point.y)));
  const scale = Math.min(96, 179 / maxX, 139 / maxY);
  return point => {
    const p = rotate(point);
    return { ...p, x: 200 + p.x * scale, y: 166 + p.y * scale };
  };
}

function path(ctx, points, close = false) {
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  if (close) ctx.closePath();
}
function dot(ctx, point, radius, color) {
  ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}

export function drawNetwork(ctx, state, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(width / 400, height / 356);
  const project = projection(state);
  const points = nodes.map(project);
  const route = state.route || routeThrough();
  const routeNodes = new Set(route);
  const routeEdges = new Set(route.slice(0, -1).map((id, i) => `${id}:${route[i + 1]}`));
  const signals = state.signals || [];
  const time = state.time || 0;
  const strength = state.hover ? 1 : .72;

  // A light grounding shadow, with no enclosing card or background panel.
  ctx.save();
  ctx.translate(203, 305); ctx.scale(1, .16);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 145);
  shadow.addColorStop(0, 'rgba(47,48,65,.075)'); shadow.addColorStop(1, 'rgba(47,48,65,0)');
  ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(0, 0, 145, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const objects = [];
  for (let layer = 0; layer < LAYERS; layer++) {
    const x = (layer - 2) * SPACING;
    const outline = roundedPlane(x).map(project);
    const back = roundedPlane(x - .026).map(project);
    const center = project({ x, y: 0, z: 0 });
    objects.push({ depth: center.depth - .01, draw() {
      const gradient = ctx.createLinearGradient(center.x - 45, center.y - 75, center.x + 50, center.y + 90);
      gradient.addColorStop(0, 'rgba(255,255,255,.37)');
      gradient.addColorStop(.52, 'rgba(232,233,241,.10)');
      gradient.addColorStop(1, 'rgba(123,125,145,.15)');
      path(ctx, back, true); ctx.strokeStyle = 'rgba(63,65,81,.25)'; ctx.lineWidth = .9; ctx.stroke();
      path(ctx, outline, true); ctx.fillStyle = gradient; ctx.fill();
      ctx.strokeStyle = layer === 2 ? 'rgba(76,78,102,.65)' : 'rgba(88,90,108,.44)';
      ctx.lineWidth = layer === 2 ? 1.25 : 1.0; ctx.stroke();
      ctx.save(); ctx.clip();
      // Sparse matrix rulings and a fine moving reflection on the glass.
      ctx.strokeStyle = 'rgba(81,85,107,.06)'; ctx.lineWidth = .65;
      for (const offset of [-.245, .245]) {
        path(ctx, [project({ x, y: offset, z: -HALF }), project({ x, y: offset, z: HALF })]); ctx.stroke();
        path(ctx, [project({ x, y: -HALF, z: offset }), project({ x, y: HALF, z: offset })]); ctx.stroke();
      }
      const sweep = state.hover ? Math.sin(time * .8 + layer * .36) * .7 : -.35;
      path(ctx, [project({ x, y: HALF, z: sweep }), project({ x, y: -HALF, z: sweep + .28 })]);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.0; ctx.stroke();
      ctx.restore();
      // Tiny silver fasteners distinguish the layers from a generic point cloud.
      for (const y of [-.65, .65]) for (const z of [-.65, .65]) dot(ctx, project({ x, y, z }), 1.05, 'rgba(101,103,121,.30)');
    }});
  }

  for (const edge of edges) {
    const a = points[edge.a], b = points[edge.b];
    const active = routeEdges.has(`${edge.a}:${edge.b}`);
    objects.push({ depth: (a.depth + b.depth) / 2, draw() {
      path(ctx, [a, b]);
      ctx.lineWidth = active ? 1.5 : .75;
      ctx.strokeStyle = active ? `rgba(93,85,158,${.67 * strength})` : 'rgba(78,84,107,.145)';
      ctx.stroke();
    }});
  }

  for (const node of nodes) {
    const point = points[node.id];
    let energy = 0;
    for (const signal of signals) {
      const position = signal.route.indexOf(node.id);
      if (position !== -1) energy = Math.max(energy, Math.exp(-Math.pow((signal.progress * 4 - position) * 3.8, 2)));
    }
    const active = routeNodes.has(node.id);
    const selected = state.selected === node.id && state.hover;
    objects.push({ depth: point.depth + .028, draw() {
      if (energy > .02 || selected) {
        const amount = Math.max(energy, selected ? .65 : 0);
        const halo = ctx.createRadialGradient(point.x, point.y, 1, point.x, point.y, 11);
        halo.addColorStop(0, `rgba(147,135,234,${amount * .46})`); halo.addColorStop(1, 'rgba(147,135,234,0)');
        dot(ctx, point, 11, halo);
      }
      const radius = (active ? 2.7 : 2.15) * point.perspective + energy * .9;
      dot(ctx, point, radius + .9, 'rgba(250,250,252,.65)');
      dot(ctx, point, radius, energy > .35 ? '#8a79d8' : active ? '#625782' : 'rgba(69,77,96,.82)');
      dot(ctx, { x: point.x - radius * .23, y: point.y - radius * .28 }, radius * .30, 'rgba(255,255,255,.65)');
      if (selected) {
        ctx.beginPath(); ctx.arc(point.x, point.y, 6.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(107,92,173,.55)'; ctx.lineWidth = .85; ctx.stroke();
      }
    }});
  }
  objects.sort((a, b) => a.depth - b.depth);
  for (const object of objects) object.draw();

  // Signal heads and their short tails run through actual edges of the drawing.
  for (const signal of signals) {
    const t = signal.progress * 4;
    for (let trail = 12; trail >= 0; trail--) {
      const p = t - trail * .025;
      if (p < 0 || p >= 4) continue;
      const i = Math.floor(p), amount = p - i;
      const a = points[signal.route[i]], b = points[signal.route[i + 1]];
      const point = { x: mix(a.x, b.x, amount), y: mix(a.y, b.y, amount) };
      dot(ctx, point, trail === 0 ? 3.2 : 1.6, `rgba(137,119,217,${(1 - trail / 13) * .85})`);
      if (!trail) dot(ctx, point, 1.4, '#f6f2ff');
    }
    if (signal.progress > .86) {
      const point = points[signal.route[4]], finish = Math.min(1, (signal.progress - .86) / .3);
      ctx.beginPath(); ctx.arc(point.x, point.y, 4 + finish * 17, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(133,117,195,${(1 - finish) * .5})`; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  ctx.restore();
  return points.map((point, id) => ({ id, x: point.x * width / 400, y: point.y * height / 356, depth: point.depth }));
}
