/**
 * Pooled particles (world space). Visual only — never affects game logic,
 * so it uses the fx RNG and can be thinned out by the quality setting.
 */
import { frand } from '../core/rng.js';

export const P = {
  SPARK: 0,
  GLOW: 1,
  SMOKE: 2,
  DEBRIS: 3,
  FIRE: 4,
  RING: 5,
  GIB: 6,
  STREAK: 7,
  DOT: 8,
};

const MAX = 2400;

export class Particles {
  constructor() {
    this.items = [];
    this.free = [];
    this.density = 1;
  }

  clear() {
    for (const p of this.items) this.free.push(p);
    this.items.length = 0;
  }

  add(type, x, y, vx, vy, life, size, color, opt) {
    if (this.items.length >= MAX) return null;
    const p = this.free.pop() || {};
    p.type = type;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.max = life;
    p.size = size;
    p.color = color;
    p.drag = opt?.drag ?? 0.96;
    p.grav = opt?.grav ?? 0;
    p.rot = opt?.rot ?? frand(0, 6.28);
    p.vr = opt?.vr ?? frand(-0.3, 0.3);
    p.frame = opt?.frame ?? 0;
    p.grow = opt?.grow ?? 0;
    p.rel = opt?.rel ?? false; // move with the camera
    p.add = opt?.add ?? true;
    this.items.push(p);
    return p;
  }

  update(dx) {
    const it = this.items;
    let j = 0;
    for (let i = 0; i < it.length; i++) {
      const p = it[i];
      p.life--;
      if (p.life <= 0) {
        this.free.push(p);
        continue;
      }
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.grav;
      p.x += p.vx + (p.rel ? dx : 0);
      p.y += p.vy;
      p.rot += p.vr;
      p.size += p.grow;
      it[j++] = p;
    }
    it.length = j;
  }

  draw(r) {
    const ctx = r.ctx;
    const arc = r.arcade;
    // normal-blend pass (smoke, debris, gibs) then additive pass
    for (const p of this.items) {
      const t = p.life / p.max;
      if (p.type === P.SMOKE) {
        ctx.globalAlpha = Math.min(1, t * 1.6) * 0.45;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(arc ? Math.round(p.x) : p.x, arc ? Math.round(p.y) : p.y, p.size, 0, 6.283);
        ctx.fill();
      } else if (p.type === P.DEBRIS) {
        r.spr('debris', p.x, p.y, p.frame, arc ? 0 : p.rot, 1, 1, Math.min(1, t * 3));
      } else if (p.type === P.GIB) {
        r.spr('gib', p.x, p.y, p.frame, arc ? 0 : p.rot, 1, 1, Math.min(1, t * 3));
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      const t = p.life / p.max;
      switch (p.type) {
        case P.SPARK: {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = Math.min(1, t * 2);
          ctx.lineWidth = p.size;
          const k = 1.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * k, p.y - p.vy * k);
          ctx.stroke();
          break;
        }
        case P.STREAK: {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = t;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5);
          ctx.stroke();
          break;
        }
        case P.GLOW:
          ctx.globalCompositeOperation = 'source-over';
          r.glow(p.x, p.y, p.size * (0.4 + 0.6 * t), p.color, t);
          ctx.globalCompositeOperation = 'lighter';
          break;
        case P.DOT:
          ctx.globalAlpha = t;
          ctx.fillStyle = p.color;
          ctx.fillRect(arc ? Math.round(p.x) : p.x - p.size / 2, arc ? Math.round(p.y) : p.y - p.size / 2, p.size, p.size);
          break;
        case P.FIRE: {
          const f = Math.min(7, Math.floor((1 - t) * 8));
          ctx.globalCompositeOperation = f >= 5 ? 'source-over' : 'lighter';
          r.spr('fireball', p.x, p.y, f, arc ? 0 : p.rot, p.size, p.size, f >= 5 ? t * 1.8 : 1);
          ctx.globalCompositeOperation = 'lighter';
          break;
        }
        case P.RING: {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = t * 0.9;
          ctx.lineWidth = Math.max(0.5, 2.2 * t);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * t) + 1, 0, 6.283);
          ctx.stroke();
          break;
        }
        default:
          break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------------ presets

  sparks(x, y, n, color, speed = 3, life = 18, opt) {
    n = Math.ceil(n * this.density);
    for (let i = 0; i < n; i++) {
      const a = opt?.dir !== undefined ? opt.dir + frand(-opt.spread, opt.spread) : frand(0, 6.283);
      const s = frand(0.3, 1) * speed;
      this.add(P.SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s, life * frand(0.6, 1.2), frand(0.5, 1.1), color, { drag: 0.9, rel: opt?.rel });
    }
  }

  explosion(x, y, size = 1, opt = {}) {
    const d = this.density;
    const organic = opt.organic;
    this.add(P.GLOW, x, y, 0, 0, 14, 26 * size, organic ? '#ff7ab0' : '#ffd27a');
    const fires = Math.ceil((3 + size * 5) * d);
    for (let i = 0; i < fires; i++) {
      const a = frand(0, 6.283);
      const s = frand(0.2, 1.4) * size;
      this.add(P.FIRE, x + Math.cos(a) * 3 * size, y + Math.sin(a) * 3 * size, Math.cos(a) * s, Math.sin(a) * s, frand(22, 38), 0.45 * size + frand(0, 0.35) * size, null, { drag: 0.92, vr: frand(-0.05, 0.05) });
    }
    this.sparks(x, y, 8 + size * 10, organic ? '#ffb0d0' : '#ffe2a0', 2.8 + size, 22);
    const sm = Math.ceil((2 + size * 4) * d);
    for (let i = 0; i < sm; i++) {
      const a = frand(0, 6.283);
      const s = frand(0.1, 0.7) * size;
      this.add(P.SMOKE, x, y, Math.cos(a) * s, Math.sin(a) * s - 0.1, frand(40, 70), frand(3, 6) * size, organic ? '#3a1a28' : '#2a2626', { drag: 0.95, grow: 0.08 * size, add: false });
    }
    const deb = Math.ceil((organic ? 0 : 2 + size * 3) * d);
    for (let i = 0; i < deb; i++) {
      const a = frand(0, 6.283);
      const s = frand(1, 3) * Math.sqrt(size);
      this.add(P.DEBRIS, x, y, Math.cos(a) * s, Math.sin(a) * s - 0.6, frand(40, 80), 1, null, { drag: 0.985, grav: 0.06, frame: Math.floor(frand(0, 4)), vr: frand(-0.4, 0.4) });
    }
    if (organic) {
      for (let i = 0; i < Math.ceil((3 + size * 4) * d); i++) {
        const a = frand(0, 6.283);
        const s = frand(1, 2.6) * Math.sqrt(size);
        this.add(P.GIB, x, y, Math.cos(a) * s, Math.sin(a) * s - 0.5, frand(40, 70), 1, null, { drag: 0.97, grav: 0.07, frame: Math.floor(frand(0, 3)) });
      }
    }
    if (size >= 1.5) this.add(P.RING, x, y, 0, 0, 22, 22 * size, organic ? '#ffb0d0' : '#ffe9c0');
  }

  /** Small hit flash. */
  hit(x, y, color = '#ffffff') {
    this.add(P.GLOW, x, y, 0, 0, 6, 7, color);
    this.sparks(x, y, 3, color, 2.2, 10);
  }

  /** Armour deflection: bright ricochet sparks. */
  clink(x, y) {
    this.add(P.GLOW, x, y, 0, 0, 5, 6, '#bfe8ff');
    this.sparks(x, y, 4, '#d8f4ff', 3, 9, { dir: Math.PI, spread: 1.2 });
  }

  ring(x, y, radius, color, life = 20) {
    this.add(P.RING, x, y, 0, 0, life, radius, color);
  }

  glow(x, y, radius, color, life = 10) {
    this.add(P.GLOW, x, y, 0, 0, life, radius, color);
  }
}
