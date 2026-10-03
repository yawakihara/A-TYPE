/**
 * Parallax backgrounds per stage theme. Everything is procedural: star layers, nebula strips
 * baked from fBm at low resolution, distant silhouettes drawn with vector shapes.
 */
import { W, H, PH } from '../config.js';
import { fbm } from '../gfx/noise.js';
import { Rng, hash1 } from '../core/rng.js';
import { hexToRgb, rgba } from '../core/math.js';

const nebulaCache = new Map();

/** Bake a horizontally tiling nebula strip (logical width `lw`, height PH) at 1/4 res. */
function nebula(key, lw, cols, seed, density = 0.5) {
  const k = `${key}|${lw}`;
  if (nebulaCache.has(k)) return nebulaCache.get(k);
  const pw = Math.round(lw / 4);
  const ph = Math.round(PH / 4);
  const c = document.createElement('canvas');
  c.width = pw;
  c.height = ph;
  const g = c.getContext('2d');
  const img = g.createImageData(pw, ph);
  const d = img.data;
  const A = hexToRgb(cols[0]);
  const B = hexToRgb(cols[1]);
  const C = hexToRgb(cols[2] || cols[1]);
  const per = pw / 16;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const n = fbm(x / 16, y / 16 + 3, 5, per, seed);
      const m = fbm(x / 32 + 9, y / 32, 3, per / 2, seed + 5);
      const band = Math.exp(-(((y / ph - 0.5) * 2.2) ** 2));
      let a = Math.max(0, (n - (1 - density)) * 2.6) * (0.4 + band * 0.8);
      a = Math.min(1, a);
      const t = m;
      const r = A[0] + (B[0] - A[0]) * t + C[0] * a * 0.15;
      const gg = A[1] + (B[1] - A[1]) * t + C[1] * a * 0.15;
      const b = A[2] + (B[2] - A[2]) * t + C[2] * a * 0.15;
      const i = (y * pw + x) * 4;
      d[i] = Math.min(255, r);
      d[i + 1] = Math.min(255, gg);
      d[i + 2] = Math.min(255, b);
      d[i + 3] = a * 200;
    }
  }
  g.putImageData(img, 0, 0);
  nebulaCache.set(k, c);
  return c;
}

class Stars {
  constructor(seed, n, par, sizeK = 1, colors = ['#ffffff', '#bcd8ff', '#ffe2c0']) {
    const rng = new Rng(seed);
    this.par = par;
    this.span = W + 64;
    this.s = [];
    for (let i = 0; i < n; i++) {
      this.s.push({
        x: rng.range(0, this.span),
        y: rng.range(0, PH),
        b: rng.range(0.3, 1),
        z: rng.next() < 0.08 ? 1.6 * sizeK : rng.next() < 0.3 ? 1 * sizeK : 0.6 * sizeK,
        tw: rng.range(0, 6.28),
        c: colors[rng.int(0, colors.length - 1)],
      });
    }
  }

  draw(r, camX, t, streak = 0) {
    const ctx = r.ctx;
    const off = camX * this.par;
    for (const s of this.s) {
      let x = (s.x - off) % this.span;
      if (x < 0) x += this.span;
      x -= 32;
      const tw = 0.65 + 0.35 * Math.sin(t * 0.05 + s.tw);
      const a = s.b * tw;
      ctx.globalAlpha = a;
      ctx.fillStyle = s.c;
      if (r.arcade) {
        ctx.fillRect(Math.round(x), Math.round(s.y), s.z > 1.2 ? 2 : 1, s.z > 1.2 ? 2 : 1);
      } else {
        const len = streak * s.z * 6;
        ctx.fillRect(x - len, s.y - s.z / 2, s.z + len, s.z);
        if (s.z > 1.2) r.glow(x, s.y, 4, s.c.length === 7 ? s.c : '#ffffff', a * 0.5);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawStrip(r, img, lw, camX, par, alpha = 1, y = 0, h = PH) {
  const ctx = r.ctx;
  let x = -((camX * par) % lw);
  if (x > 0) x -= lw;
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  for (; x < W; x += lw) ctx.drawImage(img, x, y, lw + 0.5, h);
  ctx.imageSmoothingEnabled = !r.arcade;
  ctx.globalAlpha = 1;
}

function sky(r, top, bottom) {
  const ctx = r.ctx;
  const g = ctx.createLinearGradient(0, 0, 0, PH);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Planet with atmosphere rim (screen space). */
function planet(r, x, y, R, base, atmo, t) {
  const ctx = r.ctx;
  const g = ctx.createRadialGradient(x - R * 0.4, y - R * 0.4, R * 0.1, x, y, R);
  g.addColorStop(0, base[0]);
  g.addColorStop(0.6, base[1]);
  g.addColorStop(1, base[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  // bands
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? '#000000' : '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, y - R + i * (R / 4.2), R * 1.1, R / 14 + (i % 3), 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  // terminator shadow
  ctx.globalAlpha = 1;
  const s = ctx.createRadialGradient(x + R * 0.5, y + R * 0.45, R * 0.2, x + R * 0.2, y + R * 0.2, R * 1.4);
  s.addColorStop(0, 'rgba(0,0,0,0.0)');
  s.addColorStop(0.5, 'rgba(0,0,0,0.0)');
  s.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = s;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
  r.glow(x, y, R * 1.3, atmo, 0.1);
  ctx.strokeStyle = rgba(atmo, 0.5);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, R + 0.5, Math.PI * 0.9, Math.PI * 1.75);
  ctx.stroke();
}

// ------------------------------------------------------------------ station silhouettes

function stationLayer(r, camX, par, color, seed, baseY, scale, lights, t) {
  const ctx = r.ctx;
  const span = 520 * scale;
  const off = camX * par;
  const first = Math.floor(off / span) - 1;
  for (let k = first; k < first + 4; k++) {
    const x0 = k * span - off;
    const h = hash1(k * 13 + seed);
    ctx.fillStyle = color;
    // long truss with towers and dishes
    const ty = baseY;
    ctx.fillRect(x0, ty, span, 6 * scale);
    for (let i = 0; i < 6; i++) {
      const hx = x0 + i * (span / 6) + hash1(k * 7 + i) * 20;
      const hh = (20 + hash1(k * 31 + i + seed) * 60) * scale;
      const ww = (10 + hash1(k * 17 + i) * 26) * scale;
      ctx.fillRect(hx, ty - hh, ww, hh + 6 * scale);
      if (hash1(i + k * 3) < 0.5) {
        ctx.beginPath();
        ctx.arc(hx + ww / 2, ty - hh - 6 * scale, 8 * scale, Math.PI, 0);
        ctx.fill();
      }
      // girders
      ctx.fillRect(hx + ww, ty - hh * 0.6, 18 * scale, 2 * scale);
      if (lights) {
        const blink = Math.sin(t * 0.05 + i * 2 + k) > 0.6;
        if (blink) r.glow(hx + ww / 2, ty - hh, 3, lights, 0.8);
      }
    }
    if (h < 0.5) {
      // ring module
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.ellipse(x0 + span * 0.6, ty - 40 * scale, 30 * scale, 50 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------------------ background kinds

class SpaceBG {
  constructor(opt) {
    this.opt = opt;
    this.stars = [new Stars(11, 70, 0.05, 0.8), new Stars(23, 50, 0.14, 1), new Stars(37, 26, 0.32, 1.25)];
    this.neb = null;
    this.streak = 0;
  }

  draw(r, w) {
    const o = this.opt;
    r.screen();
    sky(r, o.sky[0], o.sky[1]);
    if (!this.neb) this.neb = nebula(o.key, 1024, o.neb, o.seed || 3, o.density ?? 0.55);
    drawStrip(r, this.neb, 1024, w.camX, 0.035, o.nebAlpha ?? 0.9);
    const t = w.t;
    this.stars[0].draw(r, w.camX, t, this.streak);
    if (o.planet) {
      const pl = o.planet;
      planet(r, pl.x - w.camX * 0.02, pl.y, pl.r, pl.base, pl.atmo, t);
    }
    this.stars[1].draw(r, w.camX, t, this.streak);
    if (o.station) {
      stationLayer(r, w.camX, 0.18, o.station[0], 3, PH - 40, 0.6, null, t);
      stationLayer(r, w.camX, 0.34, o.station[1], 9, PH - 10, 0.9, '#ffb347', t);
    }
    this.stars[2].draw(r, w.camX, t, this.streak);
    if (o.extra) o.extra(r, w);
  }
}

export const BACKGROUNDS = {
  station: () =>
    new SpaceBG({
      key: 'station',
      sky: ['#02040c', '#0a1428'],
      neb: ['#1a3a7a', '#5a2a8a', '#40e0ff'],
      seed: 3,
      planet: { x: 300, y: 52, r: 34, base: ['#5a86b8', '#23406e', '#060c1c'], atmo: '#6ab4ff' },
      station: ['#0b1220', '#111a2c'],
    }),
  deep: () =>
    new SpaceBG({
      key: 'deep',
      sky: ['#010208', '#060a18'],
      neb: ['#3a1a5a', '#0a3a5a', '#ff70c0'],
      seed: 7,
      density: 0.5,
    }),
};

export function makeBackground(kind, w) {
  const f = BACKGROUNDS[kind] || BACKGROUNDS.deep;
  return f(w);
}
