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

// ------------------------------------------------------------------ orbital station structures

/** Far ring-station arc with running lights. */
function ringStation(r, camX, t) {
  const ctx = r.ctx;
  const cx = 520 - camX * 0.02;
  const cy = 420;
  const R = 380;
  ctx.strokeStyle = '#0d1424';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI * 1.1, Math.PI * 1.75);
  ctx.stroke();
  ctx.strokeStyle = '#18233a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 8, Math.PI * 1.1, Math.PI * 1.75);
  ctx.stroke();
  for (let i = 0; i < 22; i++) {
    const a = Math.PI * 1.12 + i * 0.03;
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    if (x < -10 || x > W + 10) continue;
    // spokes toward the hub
    if (i % 5 === 0) {
      ctx.strokeStyle = '#0b1120';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(cx + Math.cos(a) * (R - 90), cy + Math.sin(a) * (R - 90));
      ctx.stroke();
    }
    if ((i + Math.floor(t / 30)) % 4 === 0) r.glow(x, y, 2.5, '#ffb347', 0.7);
  }
}

/** Truss girders with blinking beacons. */
function trussLayer(r, camX, par, y0, color, t) {
  const ctx = r.ctx;
  const off = camX * par;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  const cell = 16;
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(W, y0);
  ctx.moveTo(0, y0 + cell);
  ctx.lineTo(W, y0 + cell);
  for (let x = -((off % cell) + cell); x < W + cell; x += cell) {
    ctx.moveTo(x, y0);
    ctx.lineTo(x + cell, y0 + cell);
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y0 + cell);
  }
  ctx.stroke();
  const k0 = Math.floor(off / 96);
  for (let k = k0 - 1; k < k0 + 6; k++) {
    const x = k * 96 - off + 20;
    if (Math.sin(t * 0.06 + k * 1.7) > 0.7) r.glow(x, y0, 3, '#ff4a40', 0.9);
  }
}

/** Station modules: cylinders, solar arrays and antenna masts with lit windows. */
function moduleLayer(r, camX, par, baseY, sc, seed, t) {
  const ctx = r.ctx;
  const span = 230 * sc;
  const off = camX * par;
  const first = Math.floor(off / span) - 1;
  for (let k = first; k < first + Math.ceil(W / span) + 2; k++) {
    const x0 = k * span - off;
    const h = hash1(k * 13 + seed);
    const kind = Math.floor(hash1(k * 7 + seed) * 3);
    if (kind === 0) {
      // pressurised cylinder module on struts
      const w = (90 + h * 50) * sc;
      const hh = (22 + h * 10) * sc;
      const y = baseY - hh - 18 * sc;
      const g = ctx.createLinearGradient(0, y, 0, y + hh);
      g.addColorStop(0, '#2c3a56');
      g.addColorStop(0.4, '#1a2438');
      g.addColorStop(1, '#0a0f1a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0 + hh / 2, y);
      ctx.lineTo(x0 + w - hh / 2, y);
      ctx.arc(x0 + w - hh / 2, y + hh / 2, hh / 2, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x0 + hh / 2, y + hh);
      ctx.arc(x0 + hh / 2, y + hh / 2, hh / 2, Math.PI / 2, Math.PI * 1.5);
      ctx.fill();
      ctx.fillStyle = '#0a0f1a';
      ctx.fillRect(x0 + w * 0.3, y + hh, 3 * sc, 18 * sc);
      ctx.fillRect(x0 + w * 0.7, y + hh, 3 * sc, 18 * sc);
      for (let i = 0; i < 7; i++) {
        const lit = hash1(k * 31 + i) < 0.55;
        ctx.fillStyle = lit ? '#ffd38a' : '#1e2a40';
        ctx.fillRect(x0 + hh * 0.7 + i * ((w - hh * 1.4) / 7), y + hh * 0.42, 3 * sc, 2 * sc);
      }
    } else if (kind === 1) {
      // solar array wing: blue cells catching the starlight
      const w = (110 + h * 40) * sc;
      const hh = 26 * sc;
      const y = baseY - hh - 30 * sc;
      ctx.fillStyle = '#0a0f1a';
      ctx.fillRect(x0 + w / 2 - 2 * sc, y + hh, 4 * sc, 30 * sc);
      const g = ctx.createLinearGradient(x0, y, x0 + w, y + hh);
      g.addColorStop(0, '#1a3a7a');
      g.addColorStop(0.5, '#2a5aa8');
      g.addColorStop(1, '#10224a');
      ctx.fillStyle = g;
      ctx.fillRect(x0, y, w, hh);
      ctx.strokeStyle = '#0a1428';
      ctx.lineWidth = 0.8;
      for (let i = 1; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(x0 + (w * i) / 8, y);
        ctx.lineTo(x0 + (w * i) / 8, y + hh);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x0, y + hh / 2);
      ctx.lineTo(x0 + w, y + hh / 2);
      ctx.stroke();
      // specular glint sliding across the panel
      const gx = x0 + ((t * 0.4 + k * 50) % (w + 40)) - 20;
      if (!r.arcade && gx > x0 && gx < x0 + w) r.glow(gx, y + hh / 2, 10 * sc, '#9fd0ff', 0.25);
    } else {
      // antenna mast with dish and beacon
      const hh = (60 + h * 40) * sc;
      ctx.fillStyle = '#0c1220';
      ctx.fillRect(x0 + 40 * sc, baseY - hh, 5 * sc, hh);
      for (let i = 0; i < 4; i++) ctx.fillRect(x0 + 34 * sc, baseY - hh + i * hh * 0.22, 17 * sc, 2 * sc);
      ctx.beginPath();
      ctx.ellipse(x0 + 50 * sc, baseY - hh + 6 * sc, 14 * sc, 6 * sc, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1a2438';
      ctx.fill();
      if (Math.sin(t * 0.05 + k) > 0.2) r.glow(x0 + 42 * sc, baseY - hh - 2, 3, '#ff4a40', 0.9);
    }
  }
}

// ------------------------------------------------------------------ background kinds

class SpaceBG {
  constructor(opt) {
    this.opt = opt;
    this.stars = [new Stars(11, 70, 0.05, 0.8), new Stars(23, 50, 0.14, 1), new Stars(37, 26, 0.32, 1.25)];
    this.neb = null;
    this.streak = opt.streak || 0;
    if (opt.streak) this.stars.forEach((s, i) => (s.par *= 1 + opt.streak * (2 + i * 2)));
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
      ringStation(r, w.camX, t);
      trussLayer(r, w.camX, 0.12, 40, '#0f1726', t);
      moduleLayer(r, w.camX, 0.2, PH - 30, 0.7, 3, t);
      moduleLayer(r, w.camX, 0.34, PH + 6, 1, 11, t);
    }
    this.stars[2].draw(r, w.camX, t, this.streak);
    if (o.extra) o.extra(r, w);
  }
}

// ------------------------------------------------------------------ organic interiors

/** Silhouette band of stalactites/stalagmites (screen space, parallax). */
function rockBand(r, camX, par, color, seed, fromTop, depth, size) {
  const ctx = r.ctx;
  const span = 96;
  const off = camX * par;
  const first = Math.floor(off / span) - 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  const base = fromTop ? -10 : PH + 10;
  ctx.moveTo(first * span - off, base);
  for (let k = first; k < first + Math.ceil(W / span) + 3; k++) {
    const x0 = k * span - off;
    for (let j = 0; j < 4; j++) {
      const h = hash1(k * 31 + j * 7 + seed);
      const x = x0 + j * (span / 4);
      const len = depth + h * size;
      ctx.lineTo(x, fromTop ? len * 0.35 : PH - len * 0.35);
      ctx.lineTo(x + span / 8, fromTop ? len : PH - len);
    }
  }
  ctx.lineTo(W + span, base);
  ctx.closePath();
  ctx.fill();
}

class CaveBG {
  constructor(opt) {
    this.opt = opt;
    this.neb = null;
    this.spores = [];
    const rng = new Rng(opt.seed || 7);
    for (let i = 0; i < 60; i++) this.spores.push({ x: rng.range(0, W), y: rng.range(0, PH), z: rng.range(0.3, 1), ph: rng.range(0, 6.28), c: rng.next() < 0.6 ? opt.spore[0] : opt.spore[1] });
  }

  draw(r, w) {
    const o = this.opt;
    const t = w.t;
    r.screen();
    sky(r, o.sky[0], o.sky[1]);
    if (!this.neb) this.neb = nebula(o.key, 1024, o.neb, o.seed || 7, o.density ?? 0.45);
    drawStrip(r, this.neb, 1024, w.camX, 0.05, o.nebAlpha ?? 0.6);
    // light shafts
    if (!r.arcade && o.shafts) {
      const ctx = r.ctx;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const x = ((i * 160 - w.camX * 0.08) % (W + 200) + W + 200) % (W + 200) - 100;
        const g = ctx.createLinearGradient(x, 0, x + 60, PH);
        g.addColorStop(0, `${o.shafts}26`);
        g.addColorStop(1, `${o.shafts}00`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 28 + Math.sin(t * 0.01 + i) * 6, 0);
        ctx.lineTo(x + 110, PH);
        ctx.lineTo(x + 40, PH);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    rockBand(r, w.camX, 0.12, o.far, 3, true, 30, 50);
    rockBand(r, w.camX, 0.12, o.far, 9, false, 30, 50);
    // hanging tendrils with glowing bulbs (mid layer)
    const ctx = r.ctx;
    const span = 70;
    const par = 0.3;
    const off = w.camX * par;
    const first = Math.floor(off / span) - 1;
    for (let k = first; k < first + Math.ceil(W / span) + 3; k++) {
      const h = hash1(k * 13 + 5);
      if (h < 0.35) continue;
      const x = k * span - off + h * 30;
      const len = 30 + h * 70;
      const sway = Math.sin(t * 0.02 + k) * 6;
      ctx.strokeStyle = o.mid;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, -4);
      ctx.quadraticCurveTo(x + sway, len * 0.5, x + sway * 1.5, len);
      ctx.stroke();
      r.glow(x + sway * 1.5, len, 5 + h * 3, o.spore[0], 0.5 + 0.3 * Math.sin(t * 0.05 + k));
    }
    rockBand(r, w.camX, 0.24, o.near, 17, true, 14, 36);
    rockBand(r, w.camX, 0.24, o.near, 23, false, 14, 36);
    if (o.pulse) {
      // heartbeat: the whole tunnel flushes red
      const beat = Math.max(0, Math.sin(t * 0.07)) ** 6;
      const g2 = ctx.createRadialGradient(W / 2, PH / 2, PH * 0.2, W / 2, PH / 2, W * 0.75);
      g2.addColorStop(0, 'rgba(255,40,40,0)');
      g2.addColorStop(1, `rgba(255,40,40,${0.12 + beat * 0.18})`);
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, PH);
    }
    // drifting spores
    for (const s of this.spores) {
      s.y -= 0.15 * s.z;
      if (s.y < -4) s.y = PH + 4;
      let x = (s.x - w.camX * s.z * 0.6) % W;
      if (x < 0) x += W;
      const a = 0.4 + 0.4 * Math.sin(t * 0.04 + s.ph);
      r.glow(x, s.y + Math.sin(t * 0.02 + s.ph) * 4, 1.5 + s.z * 2.5, s.c, a);
    }
  }
}

/** Distant fleet: long hull silhouettes with lights, plus far-off battle flashes. */
function fleetLayer(r, w) {
  const ctx = r.ctx;
  const t = w.t;
  for (const [par, y, sc, col] of [[0.04, 70, 0.5, '#0a1018'], [0.09, 150, 0.8, '#0d141e']]) {
    const span = 700 * sc;
    const off = w.camX * par + t * 0.15 * sc;
    const first = Math.floor(off / span) - 1;
    for (let k = first; k < first + 3; k++) {
      const x0 = k * span - off;
      const h = hash1(k * 17 + y);
      const L = (260 + h * 160) * sc;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + L * 0.1, y - 10 * sc);
      ctx.lineTo(x0 + L, y - 8 * sc);
      ctx.lineTo(x0 + L + 18 * sc, y);
      ctx.lineTo(x0 + L, y + 7 * sc);
      ctx.lineTo(x0 + L * 0.08, y + 6 * sc);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 4; i++) ctx.fillRect(x0 + L * (0.3 + i * 0.12), y - 10 * sc - (8 + hash1(k + i) * 14) * sc, 8 * sc, (8 + hash1(k + i) * 14) * sc);
      for (let i = 0; i < 6; i++) if (Math.sin(t * 0.05 + i + k) > 0.3) r.glow(x0 + L * (0.15 + i * 0.13), y - 2 * sc, 2, '#ffb060', 0.6);
      r.glow(x0 + L + 20 * sc, y, 8 * sc, '#6ab0ff', 0.5);
    }
  }
  // far-off battle flashes
  const k = Math.floor(t / 90);
  const ph = t % 90;
  if (ph < 20) {
    const fx = (hash1(k * 3) * W);
    const fy = 30 + hash1(k * 5) * (PH - 60);
    r.glow(fx, fy, 6 + ph, '#ffc080', (20 - ph) / 30);
  }
}

// ------------------------------------------------------------------ foundry interior

class FoundryBG {
  constructor() {
    this.embers = [];
    const rng = new Rng(41);
    for (let i = 0; i < 50; i++) this.embers.push({ x: rng.range(0, W), y: rng.range(0, PH), z: rng.range(0.3, 1), ph: rng.range(0, 6.28) });
  }

  draw(r, w) {
    const t = w.t;
    const ctx = r.ctx;
    r.screen();
    sky(r, '#0a0605', '#1f0e06');
    // molten haze along the bottom
    const g = ctx.createLinearGradient(0, PH * 0.55, 0, PH);
    g.addColorStop(0, 'rgba(255,90,20,0)');
    g.addColorStop(1, 'rgba(255,90,20,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, PH * 0.55, W, PH * 0.45);
    // far furnaces + chimneys
    const span = 150;
    for (const [par, col, base, sc] of [[0.08, '#120a07', PH - 30, 0.8], [0.18, '#180e09', PH - 10, 1.1]]) {
      const off = w.camX * par;
      const first = Math.floor(off / span) - 1;
      for (let k = first; k < first + Math.ceil(W / span) + 3; k++) {
        const x0 = k * span - off;
        const h = hash1(k * 7 + Math.floor(par * 100));
        const fw = (50 + h * 50) * sc;
        const fh = (50 + h * 70) * sc;
        ctx.fillStyle = col;
        ctx.fillRect(x0, base - fh, fw, fh + 20);
        // chimney
        const cx = x0 + fw * (0.2 + h * 0.5);
        ctx.fillRect(cx, base - fh - 70 * sc, 10 * sc, 70 * sc);
        // furnace mouth glow
        const flick = 0.6 + 0.4 * Math.sin(t * 0.13 + k * 3);
        r.glow(x0 + fw * 0.5, base - fh * 0.35, 14 * sc, '#ff6a1a', 0.35 * flick);
        ctx.fillStyle = `rgba(255,120,40,${0.5 * flick})`;
        ctx.fillRect(x0 + fw * 0.35, base - fh * 0.45, fw * 0.3, fh * 0.18);
      }
    }
    // gantry lattice (mid layer)
    const par = 0.32;
    const off = w.camX * par;
    ctx.strokeStyle = '#2a1a12';
    ctx.lineWidth = 1.6;
    const gy = 30;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.moveTo(0, gy + 10);
    ctx.lineTo(W, gy + 10);
    for (let x = -((off % 20) + 20); x < W + 20; x += 20) {
      ctx.moveTo(x, gy);
      ctx.lineTo(x + 10, gy + 10);
      ctx.lineTo(x + 20, gy);
    }
    ctx.stroke();
    // hanging chains with hooks
    for (let k = Math.floor(off / 90) - 1; k < Math.floor(off / 90) + 7; k++) {
      const x = k * 90 - off + 40;
      const len = 40 + hash1(k * 11) * 60;
      const sway = Math.sin(t * 0.02 + k) * 3;
      ctx.strokeStyle = '#3a2618';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, gy + 10);
      ctx.lineTo(x + sway, gy + 10 + len);
      ctx.stroke();
      ctx.fillStyle = '#3a2618';
      ctx.fillRect(x + sway - 3, gy + 10 + len, 6, 4);
    }
    // embers rising
    for (const e of this.embers) {
      e.y -= 0.35 * e.z;
      if (e.y < -4) {
        e.y = PH + 4;
      }
      let x = (e.x - w.camX * e.z * 0.5 + Math.sin(t * 0.02 + e.ph) * 6) % W;
      if (x < 0) x += W;
      r.glow(x, e.y, 1.2 + e.z * 1.8, '#ff9a3a', 0.4 + 0.4 * Math.sin(t * 0.08 + e.ph));
    }
  }
}

export const BACKGROUNDS = {
  heart: () =>
    new CaveBG({
      key: 'heart',
      sky: ['#0c0104', '#26040e'],
      neb: ['#5a0a1a', '#1a0418', '#ff3050'],
      far: '#1a0208',
      mid: '#3a0612',
      near: '#0c0104',
      spore: ['#ff5a70', '#ffd0dc'],
      seed: 53,
      density: 0.55,
      nebAlpha: 0.75,
      pulse: true,
    }),
  gut: () =>
    new CaveBG({
      key: 'gut',
      sky: ['#140306', '#2c0810'],
      neb: ['#4a0a14', '#2a0a2a', '#ff6040'],
      far: '#1e050a',
      mid: '#3a0c14',
      near: '#120306',
      spore: ['#ff9050', '#ffd0a0'],
      seed: 31,
      density: 0.5,
      pulse: true,
    }),
  foundry: () => new FoundryBG(),
  fleet: () =>
    new SpaceBG({
      key: 'fleet',
      sky: ['#020308', '#0c0a18'],
      neb: ['#4a1a1a', '#1a2a5a', '#ff9040'],
      seed: 9,
      density: 0.5,
      nebAlpha: 0.75,
      streak: 1.2,
      extra: fleetLayer,
    }),
  cave: () =>
    new CaveBG({
      key: 'cave',
      sky: ['#0b0310', '#1e0a22'],
      neb: ['#3a0a3a', '#0a2a3a', '#ff70c0'],
      far: '#1a0819',
      mid: '#2e0f2e',
      near: '#120510',
      spore: ['#4ff0c0', '#ff7ab8'],
      shafts: '#7af0d0',
      seed: 7,
    }),
  title: () =>
    new SpaceBG({
      key: 'title',
      sky: ['#02030a', '#0a0f22'],
      neb: ['#14306a', '#4a1a6a', '#3ff0ff'],
      seed: 5,
      density: 0.6,
      planet: { x: 330, y: 186, r: 70, base: ['#7a3a6a', '#3a1238', '#0a0410'], atmo: '#ff70b0' },
    }),
  prologue: () =>
    new SpaceBG({
      key: 'prologue',
      sky: ['#010104', '#08040e'],
      neb: ['#3a0a2a', '#1a0a3a', '#ff4080'],
      seed: 13,
      density: 0.45,
      planet: { x: 290, y: 120, r: 54, base: ['#5a7aa8', '#1a3060', '#04081a'], atmo: '#ff6aa0' },
    }),
  ending: () =>
    new SpaceBG({
      key: 'ending',
      sky: ['#030818', '#1a1430'],
      neb: ['#1a4a8a', '#8a4a3a', '#ffd0a0'],
      seed: 21,
      density: 0.5,
      planet: { x: 318, y: 214, r: 84, base: ['#3a6aa8', '#122a5a', '#020818'], atmo: '#7ab8ff' },
    }),
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
