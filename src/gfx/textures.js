/**
 * Procedural, seamlessly tiling terrain textures (one per stage theme).
 * HD renders crisp vector detail at the render scale; per-pixel noise is generated at a
 * capped resolution and smoothed. ARCADE renders everything at 1x and quantises colours.
 */
import { fbm, voronoi } from './noise.js';
import { hash2 } from '../core/rng.js';
import { hexToRgb, shade } from '../core/math.js';
import { pixelize } from './sprites.js';

export const TEX = 128; // logical size of one tile

function canvas(px) {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  return c;
}

/** Per-pixel fill through a shader function f(u,v) -> [r,g,b] with u,v in tile units [0,TEX). */
function shadePixels(px, f) {
  const c = canvas(px);
  const g = c.getContext('2d');
  const img = g.createImageData(px, px);
  const d = img.data;
  const k = TEX / px;
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const [r, gg, b] = f(x * k, y * k);
      const i = (y * px + x) * 4;
      d[i] = r;
      d[i + 1] = gg;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * Tileable fBm at roughly `scale` texels per lattice cell. The lattice count is snapped to an
 * integer so one tile spans whole periods and the texture wraps without a seam.
 */
function tfbm(u, v, scale, oct, seed, ox = 0, oy = 0) {
  const n = Math.max(1, Math.round(TEX / scale));
  return fbm((u / TEX) * n + ox, (v / TEX) * n + oy, oct, n, seed);
}

const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scalec = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// ------------------------------------------------------------------ themes

/** Station hull plating: panels, seams, vents, rivets, lights, grime. */
function hull(S, pal) {
  const px = Math.round(TEX * S);
  const c = canvas(px);
  const g = c.getContext('2d');
  g.scale(S, S);
  g.fillStyle = pal.base;
  g.fillRect(0, 0, TEX, TEX);
  // panel grid with random sub-division
  const cells = [];
  const N = 4;
  const sz = TEX / N;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const h = hash2(i, j + 40);
      if (h < 0.3) {
        cells.push([i * sz, j * sz, sz / 2, sz]);
        cells.push([i * sz + sz / 2, j * sz, sz / 2, sz]);
      } else if (h < 0.55) {
        cells.push([i * sz, j * sz, sz, sz / 2]);
        cells.push([i * sz, j * sz + sz / 2, sz, sz / 2]);
      } else cells.push([i * sz, j * sz, sz, sz]);
    }
  }
  cells.forEach(([x, y, w, h], n) => {
    const v = hash2(n, 7);
    const tone = shade(pal.base, (v - 0.5) * 0.25);
    const grd = g.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, shade(tone, 0.12));
    grd.addColorStop(1, shade(tone, -0.18));
    g.fillStyle = grd;
    g.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // bevel
    g.fillStyle = pal.hi;
    g.globalAlpha = 0.55;
    g.fillRect(x + 0.5, y + 0.5, w - 1, 0.7);
    g.fillRect(x + 0.5, y + 0.5, 0.7, h - 1);
    g.fillStyle = pal.dark;
    g.globalAlpha = 0.8;
    g.fillRect(x + 0.5, y + h - 1.2, w - 1, 0.7);
    g.fillRect(x + w - 1.2, y + 0.5, 0.7, h - 1);
    g.globalAlpha = 1;
    // rivets in corners
    for (const [rx, ry] of [[x + 2.5, y + 2.5], [x + w - 2.5, y + 2.5], [x + 2.5, y + h - 2.5], [x + w - 2.5, y + h - 2.5]]) {
      g.fillStyle = pal.dark;
      g.beginPath();
      g.arc(rx, ry, 0.7, 0, 6.283);
      g.fill();
      g.fillStyle = pal.hi;
      g.beginPath();
      g.arc(rx - 0.25, ry - 0.25, 0.3, 0, 6.283);
      g.fill();
    }
    const kind = hash2(n, 11);
    if (kind < 0.18 && w >= 16 && h >= 16) {
      // vent slats
      g.fillStyle = pal.dark;
      for (let k = 0; k < 5; k++) g.fillRect(x + 4, y + 5 + k * ((h - 10) / 5), w - 8, 1.2);
    } else if (kind < 0.3) {
      // hazard stripe
      g.save();
      g.beginPath();
      g.rect(x + 3, y + h / 2 - 2.5, w - 6, 5);
      g.clip();
      g.fillStyle = pal.hazard;
      g.fillRect(x, y, w, h);
      g.fillStyle = '#16120a';
      for (let k = -h; k < w + h; k += 5) {
        g.beginPath();
        g.moveTo(x + k, y + h / 2 + 3);
        g.lineTo(x + k + 2.5, y + h / 2 + 3);
        g.lineTo(x + k + 7.5, y + h / 2 - 3);
        g.lineTo(x + k + 5, y + h / 2 - 3);
        g.fill();
      }
      g.restore();
    } else if (kind < 0.42) {
      // little indicator light
      g.fillStyle = pal.dark;
      g.fillRect(x + w / 2 - 3, y + h / 2 - 1.5, 6, 3);
      g.fillStyle = hash2(n, 3) < 0.5 ? pal.light : pal.light2;
      g.fillRect(x + w / 2 - 2, y + h / 2 - 0.8, 1.6, 1.6);
      g.fillRect(x + w / 2 + 0.4, y + h / 2 - 0.8, 1.6, 1.6);
    } else if (kind < 0.55) {
      // pipe run
      const py = y + h * 0.35;
      const grd2 = g.createLinearGradient(0, py - 2, 0, py + 2);
      grd2.addColorStop(0, shade(pal.base, 0.4));
      grd2.addColorStop(0.5, shade(pal.base, 0.05));
      grd2.addColorStop(1, pal.dark);
      g.fillStyle = grd2;
      g.fillRect(x + 1, py - 2, w - 2, 4);
      g.fillStyle = pal.dark;
      g.fillRect(x + w * 0.3, py - 2.5, 1.5, 5);
      g.fillRect(x + w * 0.7, py - 2.5, 1.5, 5);
    }
  });
  // grime overlay (low-res noise multiplied in)
  const gp = Math.min(px, Math.round(TEX * Math.min(S, 2)));
  const noise = shadePixels(gp, (u, v) => {
    const n = tfbm(u, v, 16, 4, 3);
    const k = 0.75 + n * 0.5;
    return [255 * k, 255 * k, 255 * k];
  });
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.drawImage(noise, 0, 0, px, px);
  g.globalCompositeOperation = 'source-over';
  return c;
}

/** Fleshy cellular growth: bulbous Voronoi cells, dark rims, veins, glow spores. */
function flesh(S, pal) {
  const rs = Math.min(S, 2.5);
  const px = Math.round(TEX * rs);
  const base = hexToRgb(pal.base);
  const rim = hexToRgb(pal.rim);
  const hi = hexToRgb(pal.hi);
  const glow = hexToRgb(pal.glow);
  const cellsPer = pal.cells || 8;
  const c = shadePixels(px, (u, v) => {
    const sx = (u / TEX) * cellsPer;
    const sy = (v / TEX) * cellsPer;
    const [f1, f2, id] = voronoi(sx, sy, cellsPer, pal.seed || 1, 0.95);
    const edge = f2 - f1;
    const bulge = Math.max(0, 1 - f1 * 1.5);
    const n = tfbm(u, v, 10, 3, 5);
    let col = mixc(scalec(base, 0.6 + hash2(id, 3) * 0.5), hi, bulge * bulge * 0.55);
    col = scalec(col, 0.75 + n * 0.5);
    // dark crevices between cells
    const crev = Math.min(1, edge * 7);
    col = mixc(rim, col, crev);
    // veins
    const vn = Math.abs(tfbm(u, v, 22, 3, 9, 3) - 0.5);
    if (vn < 0.03) col = mixc(col, scalec(rim, 0.5), 1 - vn / 0.03);
    // spores
    if (hash2(id, 77) < 0.12 && f1 < 0.12) col = mixc(col, glow, 1 - f1 / 0.12);
    // specular highlight on bulges
    if (bulge > 0.85) col = mixc(col, [255, 230, 240], (bulge - 0.85) * 2);
    return col;
  });
  return c;
}

/**
 * Ribbed bone: rounded ribs of varying thickness with vertebral knuckles, lit from the upper
 * left, separated by occluded, glistening flesh and sinew.
 */
function bone(S, pal) {
  const rs = Math.min(S, 2.5);
  const px = Math.round(TEX * rs);
  const b = hexToRgb(pal.bone);
  const d = hexToRgb(pal.dark);
  const f = hexToRgb(pal.flesh);
  const RIBS = 6;
  const SEG = 4;
  return shadePixels(px, (u, v) => {
    const uw = (u / TEX) * RIBS + (tfbm(u, v, 20, 2, 4) - 0.5) * 0.7;
    const cell = Math.floor(uw);
    const k = ((cell % RIBS) + RIBS) % RIBS;
    const fx = uw - cell;
    // knuckles along each rib, staggered per rib
    const sv = (((v / TEX) * SEG + hash2(k, 9)) % 1 + 1) % 1;
    const joint = Math.exp(-(((sv - 0.5) / 0.07) ** 2));
    const half = (0.26 + hash2(k, 3) * 0.12) * (1 + joint * 0.22);
    const x = (fx - 0.5) / half;
    const n = tfbm(u, v, 12, 4, 2);
    if (Math.abs(x) < 1) {
      const cyl = Math.sqrt(1 - x * x);
      let col = scalec(b, (0.5 + n * 0.4) * (0.3 + cyl * 0.62 - x * 0.16));
      // knuckle ridge: a darker groove with a lit lip
      const g = Math.abs(sv - 0.5);
      if (g < 0.02) col = scalec(col, 0.55);
      else if (g < 0.045 && sv < 0.5) col = mixc(col, [255, 240, 214], 0.18 * cyl);
      // porous pitting
      const pit = tfbm(u, v, 3, 2, 31);
      if (pit > 0.72) col = scalec(col, 1 - (pit - 0.72) * 1.6);
      // specular streak along the lit side
      if (x < -0.2 && x > -0.55) col = mixc(col, [255, 246, 226], (1 - Math.abs(x + 0.38) / 0.17) * 0.28 * cyl);
      return col;
    }
    // flesh between ribs, occluded towards the bone
    const gap = (Math.abs(x) - 1) * half;
    const ao = Math.min(1, gap / 0.14);
    let col = scalec(mixc(d, f, 0.25 + n * 0.75), 0.3 + ao * 0.7);
    // sinew strands crossing the gap
    const sinew = Math.abs(tfbm(u, v, 9, 2, 17, 0, 7) - 0.5);
    if (sinew < 0.035) col = mixc(col, scalec(f, 1.6), (1 - sinew / 0.035) * 0.55 * ao);
    // wet glints
    if (n > 0.68 && ao > 0.6) col = mixc(col, [255, 170, 150], (n - 0.68) * 1.4);
    return col;
  });
}

/** Industrial foundry plate: rusted steel, rivet rows, hazard bands. */
function foundry(S, pal) {
  const px = Math.round(TEX * S);
  const c = canvas(px);
  const g = c.getContext('2d');
  const rs = Math.min(S, 2);
  const rust = hexToRgb(pal.rust);
  const steel = hexToRgb(pal.steel);
  const noise = shadePixels(Math.round(TEX * rs), (u, v) => {
    const n = tfbm(u, v, 14, 5, 8);
    const r2 = tfbm(u, v, 30, 3, 2, 5);
    const col = mixc(steel, rust, Math.max(0, Math.min(1, (r2 - 0.45) * 3)));
    return scalec(col, 0.65 + n * 0.6);
  });
  g.drawImage(noise, 0, 0, px, px);
  g.scale(S, S);
  for (let j = 0; j < 2; j++) {
    const y = j * 64;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, y, TEX, 1.2);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(0, y + 1.2, TEX, 0.6);
    for (let i = 0; i < 16; i++) {
      const x = i * 8 + 4;
      for (const yy of [y + 4, y + 60]) {
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.beginPath();
        g.arc(x, yy, 1, 0, 6.283);
        g.fill();
        g.fillStyle = 'rgba(255,240,220,0.35)';
        g.beginPath();
        g.arc(x - 0.3, yy - 0.3, 0.45, 0, 6.283);
        g.fill();
      }
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(63.5, 0, 1, TEX);
  return c;
}

/** Final-stage tissue fused with black machinery and pulsing red veins. */
function core(S, pal) {
  const rs = Math.min(S, 2.5);
  const px = Math.round(TEX * rs);
  const fl = hexToRgb(pal.flesh);
  const mc = hexToRgb(pal.machine);
  const vein = hexToRgb(pal.vein);
  return shadePixels(px, (u, v) => {
    const [f1, f2, id] = voronoi((u / TEX) * 6, (v / TEX) * 6, 6, 4, 0.8);
    const n = tfbm(u, v, 9, 4, 12);
    const machine = hash2(id, 5) < 0.35;
    let col;
    if (machine) {
      const grid = (Math.floor(u / 4) + Math.floor(v / 4)) % 2 ? 0.9 : 1.05;
      col = scalec(mc, (0.7 + n * 0.5) * grid);
    } else {
      const bulge = Math.max(0, 1 - f1 * 1.6);
      col = scalec(mixc(fl, [200, 60, 80], bulge * 0.35), 0.7 + n * 0.55);
    }
    const edge = f2 - f1;
    if (edge < 0.06) col = mixc(vein, col, edge / 0.06);
    return col;
  });
}

/** Asteroid / rock (used for debris fields). */
function rock(S, pal) {
  const rs = Math.min(S, 2);
  const px = Math.round(TEX * rs);
  const a = hexToRgb(pal.a);
  const b = hexToRgb(pal.b);
  return shadePixels(px, (u, v) => {
    const n = tfbm(u, v, 18, 5, 21);
    const [f1, f2] = voronoi((u / TEX) * 5, (v / TEX) * 5, 5, 9, 1);
    const crack = Math.min(1, (f2 - f1) * 10);
    return scalec(mixc(a, b, n), 0.45 + crack * 0.6);
  });
}

export const THEMES = {
  hull: { fn: hull, pal: { base: '#2c3548', hi: '#8c9ab4', dark: '#0d1119', hazard: '#d8a018', light: '#ffb347', light2: '#38f2d4' }, rim: '#9fb4d8', edge: '#0a0d14', glow: '#38f2d4' },
  warship: { fn: hull, pal: { base: '#3c4642', hi: '#93a39a', dark: '#0e1311', hazard: '#d8a018', light: '#ff4030', light2: '#ffb347' }, rim: '#b0c4b8', edge: '#070a09', glow: '#ff5040' },
  wreck: { fn: hull, pal: { base: '#3a3634', hi: '#9a8a80', dark: '#141010', hazard: '#c86420', light: '#ff5040', light2: '#ffb347' }, rim: '#c0a898', edge: '#0d0a0a', glow: '#ff7040' },
  flesh: { fn: flesh, pal: { base: '#7a2c5a', rim: '#1a0614', hi: '#d070a0', glow: '#4ff0c0', seed: 3, cells: 8 }, rim: '#e890c0', edge: '#12040e', glow: '#4ff0c0' },
  bone: { fn: bone, pal: { bone: '#c8b896', dark: '#1a120c', flesh: '#5a1a22' }, rim: '#fff0d0', edge: '#100a08', glow: '#ff9050' },
  foundry: { fn: foundry, pal: { rust: '#7a4428', steel: '#4c5058' }, rim: '#d0b090', edge: '#0c0a08', glow: '#ff8020' },
  core: { fn: core, pal: { flesh: '#6a1020', machine: '#1c1c26', vein: '#ff3050' }, rim: '#ff7090', edge: '#0a0206', glow: '#ff3050' },
  rock: { fn: rock, pal: { a: '#3a3a44', b: '#6a645c' }, rim: '#a8a090', edge: '#0a0a0c', glow: '#ffb347' },
};

const cache = new Map();

/** Get (and cache) a theme tile canvas for the current scale. */
export function themeTexture(theme, S, arcade) {
  const key = `${theme}|${arcade ? 1 : S}`;
  let c = cache.get(key);
  if (c) return c;
  const T = THEMES[theme];
  c = T.fn(arcade ? 1 : S, T.pal);
  if (arcade) pixelize(c, false);
  cache.set(key, c);
  return c;
}

export function clearTextureCache() {
  cache.clear();
}
