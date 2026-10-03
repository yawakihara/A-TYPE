export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
export const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeInCubic = (t) => t * t * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutBack = (t) => {
  const c = 1.70158;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
export const wrapAngle = (a) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};
/** Rotate angle a toward b by at most step radians. */
export const turnToward = (a, b, step) => {
  const d = wrapAngle(b - a);
  return Math.abs(d) <= step ? b : a + Math.sign(d) * step;
};
/** Axis-aligned overlap test between boxes given as centre + half extents. */
export const boxHit = (ax, ay, ahw, ahh, bx, by, bhw, bhh) =>
  Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;
/** Circle vs centred box. */
export const circleBox = (cx, cy, r, bx, by, hw, hh) => {
  const dx = Math.max(Math.abs(cx - bx) - hw, 0);
  const dy = Math.max(Math.abs(cy - by) - hh, 0);
  return dx * dx + dy * dy < r * r;
};
/** Segment (thick) vs centred box, used by lasers. */
export const segBox = (x0, y0, x1, y1, thick, bx, by, hw, hh) => {
  const minx = Math.min(x0, x1) - thick;
  const maxx = Math.max(x0, x1) + thick;
  const miny = Math.min(y0, y1) - thick;
  const maxy = Math.max(y0, y1) + thick;
  if (maxx < bx - hw || minx > bx + hw || maxy < by - hh || miny > by + hh) return false;
  // sample along the segment (lasers are short; this is accurate enough and robust)
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(len / 4));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (circleBox(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thick, bx, by, hw, hh)) return true;
  }
  return false;
};
export const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgba = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};
/** Mix two hex colours. */
export const mixHex = (a, b, t) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
export const shade = (hex, k) => (k >= 0 ? mixHex(hex, '#ffffff', k) : mixHex(hex, '#000000', -k));
export const pad = (n, len, ch = '0') => String(n).padStart(len, ch);
export const formatScore = (n) => pad(Math.floor(n), 8);
