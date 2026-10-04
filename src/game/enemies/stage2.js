/**
 * Stage 2 roster: drifter (jelly), polyp, burrower (worm), larva, mantis (mid-boss).
 */
import { PH } from '../../config.js';
import { Enemy, register } from '../enemy.js';
import { clamp, TAU, lerp } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { ITEM } from '../items.js';
import { P } from '../../gfx/particles.js';

/** Translucent drifter that pulses toward the player's altitude. */
class Jelly extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(3);
    this.score = 200;
    this.hw = 9;
    this.hh = 8;
    this.organic = true;
    this.size = 0.8;
    this.ph = opt.ph ?? frand(0, 6);
    this.vy = 0;
  }

  act() {
    const p = this.w.player;
    const cyc = (this.t + Math.floor(this.ph * 20)) % 90;
    const burst = cyc < 18;
    this.x -= burst ? 1.4 : 0.55;
    this.vy = lerp(this.vy, clamp((p.y - this.y) * 0.02, -1, 1) * (burst ? 1.6 : 0.6), 0.1);
    this.y += this.vy + Math.sin(this.t * 0.05 + this.ph) * 0.3;
    if (cyc === 0 && this.onScreen(-10) && this.w.rng.chance(0.35)) this.aim(1.6, 'spore');
  }

  draw(r) {
    const cyc = (this.t + Math.floor(this.ph * 20)) % 90;
    const f = cyc < 6 ? 1 : cyc < 12 ? 2 : cyc < 18 ? 3 : 0;
    r.glow(this.x, this.y - 2, 12, '#4ff0c0', 0.25);
    this.spr(r, 'jelly', this.x, this.y + 4, f);
  }
}
register('jelly', Jelly);

/** Wall-mounted flower mouth: opens and spits a fan. */
class Polyp extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(7);
    this.score = 500;
    this.rel = false;
    this.organic = true;
    this.ceil = !!opt.ceil;
    const T = w.terrain;
    this.y = this.ceil ? T.ceilAt(x) + 3 : T.floorAt(x) - 3;
    this.hw = 9;
    this.hh = 8;
    this.phase = Math.floor(x * 3) % 120;
    this.n = opt.n ?? 5;
  }

  boxes() {
    return [{ x: this.x, y: this.y + (this.ceil ? 9 : -9), hw: 9, hh: 9, type: 'body' }];
  }

  act() {
    const cyc = Math.round(160 * this.w.diff.fire);
    const k = (this.t + this.phase) % cyc;
    this.open = k > cyc - 40 ? (k > cyc - 25 ? 2 : 1) : 0;
    if (k === cyc - 20 && this.onScreen(-12)) {
      const mx = this.x;
      const my = this.y + (this.ceil ? 16 : -16);
      const p = this.w.player;
      let a = Math.atan2(p.y - my, p.x - mx);
      a = this.ceil ? clamp(a, 0.25, Math.PI - 0.25) : clamp(a, -Math.PI + 0.25, -0.25);
      this.w.bullets.fan(mx, my, a, this.n, 0.2, 1.8, 'orb');
      this.w.sfx('squish');
    }
  }

  draw(r) {
    this.spr(r, 'polyp', this.x, this.y, this.open, 0, 1, this.ceil ? -1 : 1);
  }
}
register('polyp', Polyp);

/** Burrower: bursts from a surface, arcs across, and dives into the other side. */
class Eel extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(9);
    this.score = 800;
    this.organic = true;
    this.rel = false;
    this.fromCeil = !!opt.ceil;
    this.span = opt.span ?? 170;
    this.peak = opt.peak ?? 70;
    this.state = 'warn';
    this.trail = [];
    this.segs = 9;
    this.hw = 9;
    this.hh = 8;
    this.size = 1.2;
    const T = w.terrain;
    this.x0 = x;
    this.y0 = this.fromCeil ? T.ceilAt(x) : T.floorAt(x);
    this.x = x;
    this.y = this.y0 + (this.fromCeil ? -10 : 10);
    this.u = 0;
  }

  boxes() {
    if (this.state === 'warn') return [];
    const b = [{ x: this.x, y: this.y, hw: 8, hh: 7, type: 'weak', mul: 1 }];
    for (let i = 1; i <= this.segs; i++) {
      const p = this.trail[Math.min(this.trail.length - 1, i * 4)];
      if (p) b.push({ x: p[0], y: p[1], hw: 6, hh: 6, type: 'armor' });
    }
    return b;
  }

  act() {
    const w = this.w;
    if (this.state === 'warn') {
      if (this.t % 3 === 0) w.fx.add(P.GIB, this.x0 + frand(-6, 6), this.y0, frand(-0.8, 0.8), this.fromCeil ? frand(0.5, 1.5) : frand(-2, -0.5), 30, 1, null, { grav: this.fromCeil ? 0.05 : 0.08, frame: Math.floor(frand(0, 3)) });
      if (this.t > 45) {
        this.state = 'leap';
        w.sfx('squish');
      }
      return;
    }
    if (this.state === 'leap') {
      this.u += 1 / 95;
      const u = this.u;
      const dir = this.fromCeil ? 1 : -1;
      const T = w.terrain;
      const xe = this.x0 - this.span;
      const ye = this.fromCeil ? T.floorAt(xe) : T.ceilAt(xe);
      const endY = Math.abs(ye) < 900 ? ye : this.fromCeil ? PH + 20 : -20;
      const prevX = this.x;
      const prevY = this.y;
      this.x = lerp(this.x0, xe, u);
      const base = lerp(this.y0, endY, u);
      this.y = base - dir * Math.sin(u * Math.PI) * this.peak * 0.4;
      this.ang = Math.atan2(this.y - prevY, this.x - prevX);
      if (u >= 1.25) this.dead = true;
      if (this.t % 50 === 0 && this.onScreen(-10)) this.aim(1.9, 'orb');
    }
    this.trail.unshift([this.x, this.y]);
    if (this.trail.length > this.segs * 4 + 2) this.trail.pop();
  }

  draw(r) {
    if (this.state === 'warn') return;
    for (let i = this.segs; i >= 1; i--) {
      const p = this.trail[Math.min(this.trail.length - 1, i * 4)];
      if (p) r.spr('eel_seg', p[0], p[1], 0, 0, 1 - i * 0.03, 1 - i * 0.03);
    }
    const a = (this.ang ?? Math.PI) + Math.PI;
    this.spr(r, 'eel_head', this.x, this.y, (this.t >> 3) & 1, r.arcade ? Math.round(a / (Math.PI / 8)) * (Math.PI / 8) : a);
  }
}
register('eel', Eel);

/** Larva: small homing wriggler, comes in swarms. */
class Larva extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(1);
    this.score = 50;
    this.hw = 5;
    this.hh = 4;
    this.organic = true;
    this.size = 0.5;
    this.a = opt.a ?? Math.PI;
    this.sp = opt.sp ?? 1.5;
  }

  act() {
    const p = this.w.player;
    const ta = Math.atan2(p.y - this.y, p.x - this.x);
    let d = ta - this.a;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    if (this.t < 160) this.a += clamp(d, -0.04, 0.04);
    this.x += Math.cos(this.a) * this.sp + Math.sin(this.t * 0.3) * 0.2;
    this.y += Math.sin(this.a) * this.sp;
  }

  draw(r) {
    this.spr(r, 'larva', this.x, this.y, (this.t >> 2) & 1, r.arcade ? 0 : this.a + Math.PI);
  }
}
register('larva', Larva);

/** MANTIS — mid-boss: scythe-armed walker with a soft abdomen. */
class Mantis extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(170);
    this.score = 12000;
    this.rel = true;
    this.organic = true;
    this.size = 2;
    this.cull = false;
    this.bar = true;
    this.title = 'MANTIS';
    this.state = 'enter';
    this.st = 0;
    this.arm = -0.6;
    this.armV = 0;
    this.vy = 0;
    this.y = this.groundY();
  }

  groundY() {
    const f = this.w.terrain.floorAt(this.x);
    return (Math.abs(f) < 900 ? f : PH) - 23;
  }

  armTip() {
    const bx = this.x - 22;
    const by = this.y - 6;
    return { bx, by, a: Math.PI + this.arm };
  }

  boxes() {
    const b = [
      { x: this.x + 18, y: this.y + 2, hw: 12, hh: 9, type: 'weak', mul: 1.6 },
      { x: this.x, y: this.y, hw: 12, hh: 9, type: 'body' },
      { x: this.x - 17, y: this.y - 8, hw: 7, hh: 6, type: 'body' },
    ];
    const t = this.armTip();
    for (let k = 1; k <= 4; k++) {
      const d = k * 8;
      b.push({ x: t.bx + Math.cos(t.a) * d, y: t.by + Math.sin(t.a) * d, hw: 4, hh: 4, type: 'armor' });
    }
    return b;
  }

  act() {
    const w = this.w;
    const p = w.player;
    this.st++;
    const enraged = this.hp < this.maxHp * 0.5;
    if (this.state === 'enter') {
      this.x -= 0.9;
      this.y = this.groundY();
      if (this.x - w.camX < 290) this.setState('walk');
      return;
    }
    if (this.state === 'walk') {
      const tx = w.camX + 250 + Math.sin(this.st * 0.012) * 60;
      this.x += clamp(tx - this.x, -0.8, 0.8);
      this.y = this.groundY();
      this.arm = lerp(this.arm, -0.5 + Math.sin(this.st * 0.05) * 0.1, 0.1);
      if (this.st % Math.round((enraged ? 70 : 100) * w.diff.fire) === 40) {
        const a = Math.atan2(p.y - (this.y - 10), p.x - (this.x - 22));
        w.bullets.fan(this.x - 22, this.y - 10, a, enraged ? 7 : 5, 0.16, 2, 'orb');
      }
      if (this.st > 200) this.setState(Math.abs(p.x - this.x) < 120 ? 'slash' : 'leap');
    } else if (this.state === 'slash') {
      // wind up then sweep the scythe down through the space in front
      if (this.st < 30) this.arm = lerp(this.arm, -1.6, 0.15);
      else if (this.st < 50) this.arm = lerp(this.arm, 1.0, 0.35);
      else this.arm = lerp(this.arm, -0.5, 0.08);
      if (this.st === 32) w.sfx('podLaunch');
      if (this.st > 90) this.setState('walk');
    } else if (this.state === 'leap') {
      if (this.st === 1) {
        this.vx = clamp((p.x - this.x) / 60, -3, 1);
        this.vy = -4.2;
      }
      if (this.st > 20) {
        this.x += this.vx;
        this.vy += 0.15;
        this.y += this.vy;
        const gy = this.groundY();
        if (this.vy > 0 && this.y >= gy) {
          this.y = gy;
          w.r.shake(0.35);
          w.sfx('crush');
          for (const s of [-1, 1]) for (let i = 0; i < 3; i++) w.bullets.spawn(this.x, this.y + 18, s * (1.2 + i * 0.6), -0.2 - i * 0.25, 'orbA');
          this.setState('walk');
        }
      }
    }
  }

  kill(src) {
    super.kill(src);
    const w = this.w;
    w.bullets.cancel(true);
    w.r.shake(0.5);
    w.sfx('bossExplode');
    const x0 = this.x;
    const y0 = this.y;
    for (let i = 0; i < 6; i++) w.after(i * 6 + 1, () => w.fx.explosion(x0 + frand(-30, 30), y0 + frand(-20, 20), 1.2, { organic: true }));
    w.dropItem(this.x, this.y - 10, ITEM.CRYSTAL);
  }

  draw(r) {
    const walking = this.state === 'walk' || this.state === 'enter';
    const f = walking ? (this.t >> 3) % 4 : 0;
    const t = this.armTip();
    const a = r.arcade ? Math.round(t.a / (Math.PI / 8)) * (Math.PI / 8) : t.a;
    this.spr(r, 'mantis', this.x, this.y, f);
    this.spr(r, 'mantis_scythe', t.bx, t.by, 0, a);
    if (this.state === 'slash' && this.st < 30) r.glow(t.bx, t.by, 14, '#ff7ab8', 0.5);
  }
}
register('mantis', Mantis);

export { Jelly, Polyp, Eel, Larva, Mantis };
