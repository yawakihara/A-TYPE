/** Shared helpers for procedural vector art (all coordinates in logical px). */
import { shade, rgba } from '../../core/math.js';

export function path(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p.length === 6) ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
    else if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    else ctx.lineTo(p[0], p[1]);
  }
  if (close) ctx.closePath();
}

export function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

export function rad(ctx, x, y, r0, r1, stops, fx = x, fy = y) {
  const g = ctx.createRadialGradient(fx, fy, r0, x, y, r1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

/** Vertical metal shading for a shape spanning y0..y1. */
export function metal(ctx, y0, y1, base, opt = {}) {
  const hi = opt.hi ?? 0.55;
  const lo = opt.lo ?? -0.55;
  return lin(ctx, 0, y0, 0, y1, [
    [0, shade(base, hi)],
    [0.18, shade(base, hi * 0.5)],
    [0.45, base],
    [0.55, shade(base, lo * 0.4)],
    [0.82, shade(base, lo * 0.85)],
    [1, shade(base, lo)],
  ]);
}

/** Fill + outline + top rim highlight in one go. */
export function solid(ctx, pts, fill, opt = {}) {
  path(ctx, pts, opt.close !== false);
  ctx.fillStyle = fill;
  ctx.fill();
  if (opt.rim) {
    ctx.save();
    ctx.clip();
    path(ctx, pts.map(([x, y, ...rest]) => (rest.length ? [x, y + 0.9, ...rest] : [x, y + 0.9])), opt.close !== false);
    ctx.strokeStyle = opt.rim;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
  }
  if (opt.line) {
    path(ctx, pts, opt.close !== false);
    ctx.strokeStyle = opt.line;
    ctx.lineWidth = opt.lw ?? 0.6;
    ctx.stroke();
  }
}

export function line(ctx, pts, color, w = 0.5, alpha = 1) {
  ctx.globalAlpha = alpha;
  path(ctx, pts, false);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function circle(ctx, x, y, r, fill, stroke, lw = 0.6) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function ellipse(ctx, x, y, rx, ry, rot, fill, stroke, lw = 0.6) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Glossy sphere (light from upper-left). */
export function orb(ctx, x, y, r, base, opt = {}) {
  ctx.fillStyle = rad(ctx, x, y, 0, r, [
    [0, shade(base, 0.75)],
    [0.35, shade(base, 0.2)],
    [0.8, base],
    [1, shade(base, -0.55)],
  ], x - r * 0.35, y - r * 0.4);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (opt.line !== false) {
    ctx.strokeStyle = opt.line || shade(base, -0.75);
    ctx.lineWidth = opt.lw ?? 0.6;
    ctx.stroke();
  }
  if (opt.spec !== false) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.28, r * 0.17, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Emissive glow baked into a sprite (HD only; arcade keeps the hard core). */
export function emissive(ctx, info, x, y, r, color, alpha = 0.9) {
  if (info.arcade) {
    circle(ctx, x, y, Math.max(0.8, r * 0.35), color);
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rad(ctx, x, y, 0, r, [
    [0, rgba('#ffffff', alpha)],
    [0.25, rgba(color, alpha)],
    [1, rgba(color, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Thin glowing line (HD) / plain line (arcade). */
export function glowLine(ctx, info, pts, color, w = 0.6) {
  if (!info.arcade) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    line(ctx, pts, rgba(color, 0.35), w * 3.5);
    ctx.restore();
  }
  line(ctx, pts, color, w);
  if (!info.arcade) line(ctx, pts, 'rgba(255,255,255,0.7)', w * 0.4);
}

/** Small rivet / bolt. */
export function rivet(ctx, x, y, r = 0.45) {
  circle(ctx, x, y, r, 'rgba(0,0,0,0.45)');
  circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.5, 'rgba(255,255,255,0.5)');
}

/** Organic membrane fill: radial with darker veins sketched along given curves. */
export function veins(ctx, pts, color, w = 0.4, alpha = 0.5) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  for (const p of pts) {
    path(ctx, p, false);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Rotate points around origin. */
export function rot(pts, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}

export function mirrorY(pts) {
  return pts.map(([x, y]) => [x, -y]);
}
