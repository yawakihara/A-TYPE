/**
 * Enemy bullets. Positions are world coordinates but motion is screen-relative
 * (each frame the camera delta is added) so speeds read the same at any scroll rate.
 */
import { W, PH } from '../config.js';

export const BK = {
  orb: { r: 2.6, absorb: true, spr: 'eb_orb' },
  orbA: { r: 2.6, absorb: true, spr: 'eb_orbA' },
  big: { r: 4.8, absorb: true, spr: 'eb_big' },
  spore: { r: 3, absorb: true, spr: 'eb_spore' },
  needle: { r: 2.2, absorb: true, spr: 'eb_needle', rotate: true },
  laser: { r: 2.5, absorb: false, spr: null },
};

export class Bullets {
  constructor(w) {
    this.w = w;
    this.list = [];
    this.pool = [];
  }

  clear() {
    for (const b of this.list) this.pool.push(b);
    this.list.length = 0;
  }

  /** Spawn with raw velocity (already in px/frame). Applies the difficulty speed multiplier. */
  spawn(x, y, vx, vy, kind = 'orb', opt) {
    const mul = this.w.bulletMul;
    const b = this.pool.pop() || {};
    const k = BK[kind] || BK.orb;
    b.x = x;
    b.y = y;
    b.vx = vx * mul;
    b.vy = vy * mul;
    b.kind = kind;
    b.r = opt?.r ?? k.r;
    b.absorb = opt?.absorb ?? k.absorb;
    b.spr = k.spr;
    b.rotate = !!k.rotate;
    b.ax = (opt?.ax ?? 0) * mul;
    b.ay = (opt?.ay ?? 0) * mul;
    b.home = opt?.home ?? 0;
    b.homeT = opt?.homeT ?? 0;
    b.life = opt?.life ?? 600;
    b.t = 0;
    b.dead = false;
    b.terrain = opt?.terrain ?? true;
    b.len = opt?.len ?? 0; // laser segment length
    b.color = opt?.color ?? '#ff4fa0';
    b.maxSpd = opt?.maxSpd ?? 99;
    this.list.push(b);
    return b;
  }

  /** Aimed shot at the player. */
  aim(x, y, speed, kind = 'orb', spread = 0, opt) {
    const p = this.w.player;
    const a = Math.atan2(p.y - y, p.x - x) + spread;
    return this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, kind, opt);
  }

  /** Fan of n shots centred on angle a. */
  fan(x, y, a, n, step, speed, kind = 'orb', opt) {
    for (let i = 0; i < n; i++) {
      const aa = a + (i - (n - 1) / 2) * step;
      this.spawn(x, y, Math.cos(aa) * speed, Math.sin(aa) * speed, kind, opt);
    }
  }

  ring(x, y, n, speed, kind = 'orb', offset = 0, opt) {
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, kind, opt);
    }
  }

  update() {
    const w = this.w;
    const dx = w.dx;
    const camX = w.camX;
    const p = w.player;
    const list = this.list;
    let j = 0;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (!b.dead) {
        b.t++;
        if (b.home && b.t < b.homeT && p.alive) {
          const a = Math.atan2(p.y - b.y, p.x - b.x);
          const sp = Math.hypot(b.vx, b.vy);
          const cur = Math.atan2(b.vy, b.vx);
          let d = a - cur;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          const na = cur + Math.max(-b.home, Math.min(b.home, d));
          b.vx = Math.cos(na) * sp;
          b.vy = Math.sin(na) * sp;
        }
        b.vx += b.ax;
        b.vy += b.ay;
        if (b.ax || b.ay) {
          const sp = Math.hypot(b.vx, b.vy);
          if (sp > b.maxSpd) {
            b.vx *= b.maxSpd / sp;
            b.vy *= b.maxSpd / sp;
          }
        }
        b.x += b.vx + dx;
        b.y += b.vy;
        const sx = b.x - camX;
        if (sx < -24 || sx > W + 24 || b.y < -24 || b.y > PH + 24 || b.t > b.life) b.dead = true;
        else if (b.terrain && b.t > 2 && w.terrain.solidAt(b.x, b.y)) {
          b.dead = true;
          w.fx.hit(b.x, b.y, '#ff8ac0');
        }
      }
      if (b.dead) this.pool.push(b);
      else list[j++] = b;
    }
    list.length = j;
  }

  /** Remove all bullets; optionally turn them into score gems. */
  cancel(toGems) {
    for (const b of this.list) {
      if (b.dead) continue;
      b.dead = true;
      if (toGems) this.w.spawnGem(b.x, b.y);
      else this.w.fx.glow(b.x, b.y, 6, '#ff9ad0', 8);
    }
  }

  draw(r) {
    const ctx = r.ctx;
    const t = this.w.t;
    for (const b of this.list) {
      if (b.kind === 'laser') {
        const a = Math.atan2(b.vy, b.vx);
        const L = b.len;
        const x0 = b.x - Math.cos(a) * L;
        const y0 = b.y - Math.sin(a) * L;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = b.r * 2.6;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = b.r * 0.9;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        continue;
      }
      const f = (t + (b.x | 0)) & 4 ? 1 : 0;
      if (b.rotate) r.spr(b.spr, b.x, b.y, f, r.arcade ? Math.round(Math.atan2(b.vy, b.vx) / (Math.PI / 8)) * (Math.PI / 8) : Math.atan2(b.vy, b.vx));
      else r.spr(b.spr, b.x, b.y, f);
    }
  }
}
