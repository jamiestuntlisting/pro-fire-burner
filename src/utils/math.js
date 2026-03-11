export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

export function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

export function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function lerpColor(color1, color2, t) {
  const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
  const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
  const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
  return `rgb(${r},${g},${b})`;
}

export function lerpColorMulti(colors, t) {
  const clamped = clamp(t, 0, 1);
  const segments = colors.length - 1;
  const segment = Math.min(Math.floor(clamped * segments), segments - 1);
  const localT = (clamped * segments) - segment;
  return lerpColor(colors[segment], colors[segment + 1], localT);
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

export function pointInCone(px, py, coneX, coneY, coneDirX, coneDirY, coneRange, coneHalfAngle) {
  const dx = px - coneX;
  const dy = py - coneY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > coneRange || dist === 0) return false;
  const ndx = dx / dist;
  const ndy = dy / dist;
  const d = dot(ndx, ndy, coneDirX, coneDirY);
  return d >= Math.cos(coneHalfAngle);
}

export function snap8Dir(x, y) {
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const angle = Math.atan2(y, x);
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return { x: Math.cos(snapped), y: Math.sin(snapped) };
}
