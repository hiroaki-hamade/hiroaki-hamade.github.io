// Procedural, cinema-inspired artwork; not a calibrated relativistic simulation.
export const vertexShader = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const fragmentShader = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_resolution;
uniform vec2 u_view;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_pulse;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}
float fbm(vec2 p) {
  float value = 0.0, weight = 0.5;
  for (int i = 0; i < 3; i++) { value += weight * noise(p); p = p * 2.03 + 7.2; weight *= 0.5; }
  return value;
}
vec3 disk(vec3 hit) {
  float r = length(hit.xz);
  float edge = smoothstep(2.7, 3.05, r) * (1.0 - smoothstep(4.4, 6.0, r));
  float angle = atan(hit.z, hit.x);
  float phase = angle - u_time * 0.7 / pow(r / 3.0, 1.5);
  float cloud = fbm(vec2(r * 13.0, phase * 5.0));
  float strands = 0.78 + 0.12 * sin(r * 65.0 + cloud * 2.0)
                       + 0.05 * sin(r * 133.0 + phase * 0.3);
  float heat = pow(3.0 / r, 1.7);
  float asymmetry = 0.60 + 0.60 * pow(0.5 + 0.5 * cos(angle + 0.5), 2.0);
  vec3 color = mix(vec3(0.70, 0.34, 0.12), vec3(1.0, 0.90, 0.73), heat);
  return color * edge * heat * strands * (0.7 + cloud) * asymmetry * 2.8;
}
vec3 sky(vec3 direction) {
  vec2 sphere = vec2(atan(direction.z, direction.x), asin(clamp(direction.y, -1.0, 1.0)));
  vec2 grid = sphere * 145.0;
  vec2 id = floor(grid), local = fract(grid) - 0.5;
  float star = step(0.986, hash(id)) * exp(-dot(local, local) * 370.0);
  vec3 tint = mix(vec3(0.66, 0.74, 0.9), vec3(1.0, 0.86, 0.65), hash(id + 4.0));
  return vec3(0.0015, 0.0018, 0.0028) + star * tint * 0.65;
}
vec3 tonemap(vec3 color) {
  color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
  return pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
}
void main() {
  vec2 screen = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  float envelope = 1.0 - smoothstep(0.43, 0.98, length(screen * vec2(0.90, 1.0)));
  if (envelope < 0.002) { outColor = vec4(0.0); return; }

  float roll = u_view.x + u_pointer.x * 0.055;
  float elevation = clamp(u_view.y + u_pointer.y * 0.035, 0.025, 1.05);
  mat2 turn = mat2(cos(roll), -sin(roll), sin(roll), cos(roll));
  vec2 uv = turn * (screen - u_pointer * 0.018);
  vec3 position = vec3(0.0, sin(elevation), cos(elevation)) * 9.0;
  vec3 forward = normalize(-position);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 velocity = normalize(forward + (right * uv.x + up * uv.y) * 0.76);
  vec3 angularMomentum = cross(position, velocity);
  float h2 = dot(angularMomentum, angularMomentum);
  vec3 light = vec3(0.0);
  float transmission = 1.0;
  bool captured = false;

  // Integrate a central bending field. Plane crossings reveal the disk's
  // far side above and below the shadow, including secondary light paths.
  for (int stepIndex = 0; stepIndex < 112; stepIndex++) {
    float r = length(position);
    if (r < 1.01) { captured = true; break; }
    if (r > 17.0) break;
    float ds = clamp(r * 0.095, 0.045, 0.46);
    vec3 acceleration = -1.5 * h2 * position / pow(r, 5.0);
    vec3 next = position + velocity * ds + 0.5 * acceleration * ds * ds;
    float nextR = max(length(next), 0.9);
    vec3 nextAcceleration = -1.5 * h2 * next / pow(nextR, 5.0);
    velocity += 0.5 * (acceleration + nextAcceleration) * ds;
    if (position.y * next.y < 0.0) {
      vec3 hit = mix(position, next, abs(position.y) / (abs(position.y) + abs(next.y)));
      float hitRadius = length(hit.xz);
      if (hitRadius > 2.7 && hitRadius < 6.0) {
        light += disk(hit) * transmission;
        transmission *= 0.45;
      }
    }
    position = next;
  }
  if (!captured) light += sky(normalize(velocity)) * transmission;
  float radius = length(uv);
  float photonGlow = exp(-pow((radius - 0.385) / 0.012, 2.0));
  light += photonGlow * vec3(0.04, 0.024, 0.012);
  light *= 1.0 + u_pulse * 0.32;
  vec3 color = tonemap(light);
  outColor = vec4(color, envelope);
}`;
