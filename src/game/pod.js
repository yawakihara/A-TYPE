/**
 * AEGIS — the detachable crystal pod (the genre's signature device, original design).
 *  - indestructible, absorbs ordinary bullets, grinds enemies it touches, passes through walls
 *  - docks to the front or rear depending on which side touches the ship
 *  - can be launched as a battering ram and recalled
 *  - its crystal colour selects the laser: red HELIX, blue PRISM, yellow CRAWLER
 * Satellite bits are also here.
 */
import { W } from '../config.js';
import { clamp, lerp, dist2 } from '../core/math.js';
import { frand } from '../core/rng.js';
import { Pellet, Helix, Prism, Crawler } from './weapons.js';
import { POD_COLORS } from '../gfx/art/player.js';

const RADIUS = [0, 7.5, 9, 10.5];
const DOCK = [0, 15, 16.5, 18];

export class Pod {
  constructor(w, color) {
    this.w = w;
    this.level = 1;
    this.color = color;
    this.state = 'enter';
    this.x = w.camX - 20;
    this.y = w.player.y;
    this.vx = 0;
    this.side = 1;
    this.cool = 0;
    this.spin = 0;
    this.spinV = 0.06;
    this.noDock = 0;
    this.grind = 0;
    this.t = 0;
    this.flash = 0;
    this.trail = [];
  }

  get r() {
    return RADIUS[this.level];
  }

  get attached() {
    return this.state === 'front' || this.state === 'back';
  }

  upgrade(color) {
    const prev = this.level;
    this.color = color;
    this.level = Math.min(3, this.level + 1);
    this.flash = 20;
    return this.level > prev;
  }

  /** Button: launch when docked, recall otherwise. */
  command() {
    const w = this.w;
    if (this.attached) {
      this.side = this.state === 'front' ? 1 : -1;
      this.state = 'launch';
      this.vx = this.side * 6.2;
      this.noDock = 22;
      this.hitSet = new Set();
      w.sfx('podLaunch');
      w.rumble(0.3, 0.2, 80);
    } else if (this.state === 'free' || this.state === 'launch' || this.state === 'enter') {
      this.state = 'recall';
      w.sfx('podRecall');
    }
  }

  update() {
    const w = this.w;
    const p = w.player;
    this.t++;
    if (this.cool > 0) this.cool--;
    if (this.noDock > 0) this.noDock--;
    if (this.flash > 0) this.flash--;
    const prevX = this.x;
    const prevY = this.y;
    switch (this.state) {
      case 'enter': {
        // drifts in from the left edge, matching the ship's altitude
        this.x += w.dx + 2.6;
        this.y = lerp(this.y, p.y, 0.06);
        if (this.x - w.camX > W * 0.45) this.state = 'free';
        this.spinV = 0.1;
        break;
      }
      case 'free': {
        this.x += w.dx;
        if (p.alive) this.y = lerp(this.y, p.y, 0.045);
        this.spinV = lerp(this.spinV, 0.05, 0.05);
        break;
      }
      case 'launch': {
        this.x += w.dx + this.vx;
        this.spinV = 0.25;
        const sx = this.x - w.camX;
        if ((this.side > 0 && sx > W - 34) || (this.side < 0 && sx < 30)) {
          this.state = 'free';
          this.vx = 0;
        }
        break;
      }
      case 'recall': {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(d, 5.5);
        this.x += w.dx + (dx / d) * sp;
        this.y += (dy / d) * sp;
        this.spinV = 0.2;
        if (!p.alive) this.state = 'free';
        break;
      }
      case 'front':
      case 'back': {
        const s = this.state === 'front' ? 1 : -1;
        const tx = p.x + s * DOCK[this.level] + (s > 0 ? 1 : -3);
        // spring for a little weight
        this.x = lerp(this.x + w.dx, tx, 0.55);
        this.y = lerp(this.y, p.y, 0.55);
        this.spinV = lerp(this.spinV, 0, 0.2);
        break;
      }
      default:
        break;
    }
    this.spin += this.spinV;
    this.trail.push(this.x, this.y);
    if (this.trail.length > 10) this.trail.splice(0, 2);
    for (let i = 0; i < this.trail.length; i += 2) this.trail[i] += w.dx;
    // docking
    if (!this.attached && this.noDock <= 0 && p.alive && this.state !== 'launch') {
      const near = Math.abs(this.x - p.x) < this.r + 12 && Math.abs(this.y - p.y) < this.r + 4;
      if (near) {
        this.state = this.x >= p.x ? 'front' : 'back';
        w.sfx('podAttach');
        w.fx.ring(this.x, this.y, 14, '#bff8ff', 12);
        w.rumble(0.2, 0.3, 60);
      }
    }
    // bullet absorption (sweep between frames so fast launches don't tunnel)
    const R = this.r + 1;
    for (const b of w.bullets.list) {
      if (b.dead || !b.absorb) continue;
      const hit = dist2(b.x, b.y, this.x, this.y) < (R + b.r) * (R + b.r) || dist2(b.x, b.y, (this.x + prevX) / 2, (this.y + prevY) / 2) < (R + b.r) * (R + b.r);
      if (hit) {
        b.dead = true;
        this.grind = 6;
        w.fx.glow(b.x, b.y, 7, POD_COLORS[this.color].glow, 8);
        w.stats.absorbed++;
      }
    }
    if (this.grind > 0) this.grind--;
  }

  /** Contact damage per frame (world calls this for overlapping enemies). */
  contactDamage() {
    if (this.state === 'launch') return 1.2;
    if (this.attached) return 0.4;
    return 0.3;
  }

  fire() {
    const w = this.w;
    if (this.cool > 0) return;
    const lv = this.level;
    const c = this.color;
    if (this.attached) {
      const dir = this.state === 'front' ? 1 : -1;
      const fx = this.x + dir * (this.r - 2);
      if (lv === 1) {
        // basic twin pellets
        w.pshots.push(new Pellet(fx, this.y - 2.5, dir * 6.5, 0));
        w.pshots.push(new Pellet(fx, this.y + 2.5, dir * 6.5, 0));
        if (c === 'blue') {
          w.pshots.push(new Pellet(fx, this.y, dir * 6, -1.6));
          w.pshots.push(new Pellet(fx, this.y, dir * 6, 1.6));
        } else if (c === 'yellow') {
          w.pshots.push(new Pellet(fx, this.y, 0, -5.5));
          w.pshots.push(new Pellet(fx, this.y, 0, 5.5));
        }
        this.cool = 7;
        return;
      }
      if (c === 'red') {
        w.pshots.push(new Helix(fx, this.y, dir, lv));
        this.cool = lv >= 3 ? 9 : 11;
        w.sfx('helix');
      } else if (c === 'blue') {
        const base = dir > 0 ? 0 : Math.PI;
        const angs = lv >= 3 ? [-0.5, -0.17, 0.17, 0.5] : [-0.42, 0.42];
        for (const a of angs) w.pshots.push(new Prism(fx, this.y, base + (dir > 0 ? a : -a), lv));
        this.cool = lv >= 3 ? 10 : 12;
        w.sfx('prism');
      } else {
        w.pshots.push(new Crawler(this.x, this.y - 3, -1, lv, dir));
        w.pshots.push(new Crawler(this.x, this.y + 3, 1, lv, dir));
        w.pshots.push(new Pellet(fx, this.y, dir * 6.5, 0, 1));
        this.cool = lv >= 3 ? 11 : 14;
        w.sfx('crawler');
      }
      return;
    }
    if (this.state === 'free' || this.state === 'enter') {
      // detached: autonomous pellet pattern by colour
      const x = this.x;
      const y = this.y;
      if (c === 'red') {
        w.pshots.push(new Pellet(x + 6, y, 6, 0));
        w.pshots.push(new Pellet(x - 6, y, -6, 0));
        if (lv >= 2) w.pshots.push(new Pellet(x + 6, y - 4, 6, 0), new Pellet(x + 6, y + 4, 6, 0));
      } else if (c === 'blue') {
        const s = 4.4;
        w.pshots.push(new Pellet(x, y, s, -s), new Pellet(x, y, s, s), new Pellet(x, y, -s, -s), new Pellet(x, y, -s, s));
      } else {
        w.pshots.push(new Pellet(x, y - 5, 0, -6), new Pellet(x, y + 5, 0, 6), new Pellet(x + 6, y, 6, 0));
      }
      this.cool = 10;
    }
  }

  draw(r) {
    const col = POD_COLORS[this.color];
    const lv = this.level - 1;
    const ctx = r.ctx;
    // motion trail when moving fast
    if (this.state === 'launch' || this.state === 'recall' || this.state === 'enter') {
      for (let i = 0; i < this.trail.length; i += 2) {
        const k = i / this.trail.length;
        r.glow(this.trail[i], this.trail[i + 1], this.r * (0.5 + k), col.glow, 0.25 * k);
      }
    }
    // tether to the ship while docked
    if (this.attached && !r.arcade) {
      const p = this.w.player;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = col.glow;
      ctx.globalAlpha = 0.35 + Math.sin(this.t * 0.3) * 0.15;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x + (this.state === 'front' ? 8 : -12), p.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    r.glow(this.x, this.y, this.r * 2.2 + (this.flash > 0 ? 10 : 0) + (this.grind ? 4 : 0), col.glow, 0.45);
    // crystal cage: shards orbit when free, open into a forward-facing claw when docked
    const n = 4;
    const R = this.r * 0.62;
    for (let i = 0; i < n; i++) {
      let a;
      if (this.attached) {
        const dir = this.state === 'front' ? 0 : Math.PI;
        const claw = [-1.05, -0.38, 0.38, 1.05][i];
        a = dir + claw + Math.sin(this.t * 0.15 + i) * 0.05;
      } else {
        a = this.spin + (i / n) * Math.PI * 2;
      }
      let rr = R;
      if (this.attached) rr = R + 1.2;
      const sx = this.x + Math.cos(a) * rr;
      const sy = this.y + Math.sin(a) * rr;
      const ra = r.arcade ? Math.round(a / (Math.PI / 8)) * (Math.PI / 8) : a;
      r.spr('podshard', sx, sy, lv, ra);
    }
    r.spr(`podcore_${this.color}`, this.x, this.y, lv);
    if (this.flash > 0 && this.flash % 4 < 2) r.glow(this.x, this.y, 18, '#ffffff', 0.7);
  }
}

export class Bit {
  constructor(w, slot) {
    this.w = w;
    this.slot = slot; // -1 above, +1 below
    const p = w.player;
    this.x = p.x - 30;
    this.y = p.y + slot * 18;
    this.cool = 0;
    this.t = 0;
  }

  update() {
    const w = this.w;
    const p = w.player;
    this.t++;
    if (this.cool > 0) this.cool--;
    const tx = p.x - 3;
    const ty = p.y + this.slot * 17;
    this.x = lerp(this.x + w.dx, tx, 0.22);
    this.y = lerp(this.y, ty, 0.22);
    this.y = clamp(this.y, 4, 220);
    for (const b of w.bullets.list) {
      if (!b.dead && b.absorb && dist2(b.x, b.y, this.x, this.y) < (5.5 + b.r) ** 2) {
        b.dead = true;
        w.fx.glow(b.x, b.y, 6, '#ffb347', 8);
      }
    }
  }

  fire() {
    if (this.cool > 0) return;
    this.cool = 9;
    this.w.pshots.push(new Pellet(this.x + 5, this.y, 6.5, 0, 0.7));
  }

  draw(r) {
    r.glow(this.x, this.y, 9, '#ffb347', 0.35 + Math.sin(this.t * 0.2) * 0.1);
    r.spr('bit', this.x, this.y, (this.t >> 2) % 8);
  }
}

export const randomPodColor = () => ['red', 'blue', 'yellow'][Math.floor(frand(0, 3))];
