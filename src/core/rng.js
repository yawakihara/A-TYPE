/** Small deterministic RNG (mulberry32) so stages, bots and tests are reproducible. */
export class Rng {
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }

  seed(s) {
    this.s = s >>> 0 || 1;
  }

  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a, b) {
    return a + (b - a) * this.next();
  }

  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }

  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  chance(p) {
    return this.next() < p;
  }

  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }
}

/** Shared visual-only RNG (particles etc.) – never used by game logic. */
export const fxRng = new Rng(0x5eed);
export const frand = (a = 0, b = 1) => a + (b - a) * fxRng.next();

/** Integer hash -> [0,1) used for stable procedural detail. */
export function hash1(n) {
  let x = Math.imul(n | 0, 0x27d4eb2d) ^ 0x165667b1;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function hash2(a, b) {
  return hash1(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
}
