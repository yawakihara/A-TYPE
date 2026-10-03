/** Tileable value noise, fBm and Voronoi for procedural textures. */
import { hash2 } from '../core/rng.js';

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** Value noise on a lattice that wraps every `period` cells. */
export function vnoise(x, y, period = 256, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const p = period;
  const w = (v) => ((v % p) + p) % p;
  const a = hash2(w(xi) + seed * 1013, w(yi));
  const b = hash2(w(xi + 1) + seed * 1013, w(yi));
  const c = hash2(w(xi) + seed * 1013, w(yi + 1));
  const d = hash2(w(xi + 1) + seed * 1013, w(yi + 1));
  const u = fade(xf);
  const v = fade(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, oct = 4, period = 256, seed = 0) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    s += vnoise(x * f, y * f, period * f, seed + i) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / norm;
}

/** Tileable Voronoi: returns [F1, F2, cellId] for point in a period×period cell grid. */
export function voronoi(x, y, period, seed = 0, jitter = 0.9) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i;
      const cy = yi + j;
      const wx = ((cx % period) + period) % period;
      const wy = ((cy % period) + period) % period;
      const px = cx + 0.5 + (hash2(wx + seed * 31, wy) - 0.5) * jitter;
      const py = cy + 0.5 + (hash2(wy + seed * 57, wx + 7) - 0.5) * jitter;
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = wx * 131 + wy;
      } else if (d < f2) f2 = d;
    }
  }
  return [f1, f2, id];
}

/** Value noise in 1D (for terrain roughness). */
export function noise1(x, seed = 0) {
  const xi = Math.floor(x);
  const t = fade(x - xi);
  const a = hash2(xi, seed);
  const b = hash2(xi + 1, seed);
  return a + (b - a) * t;
}

export function fbm1(x, oct = 3, seed = 0) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  let n = 0;
  for (let i = 0; i < oct; i++) {
    s += noise1(x * f, seed + i * 17) * amp;
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / n;
}
