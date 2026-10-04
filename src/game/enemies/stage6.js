/**
 * Stage 6 roster (the heart): guardian cell (splits), eye wall, tendril, spawner,
 * heart valve (hazard) and the VALVE GUARDIAN mid-boss.
 */
import { W, PH } from '../../config.js';
import { Enemy, register } from '../enemy.js';
import { clamp, turnToward, TAU, lerp, smooth } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { ITEM } from '../items.js';
import { P } from '../../gfx/particles.js';

/** Guardian cell: drifts at the player and divides when destroyed. */
class Cell extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.gen = opt.gen ?? 0;
    this.noChain = this.gen > 0;
    this.sc = [1, 0.7, 0.45][this.gen];
    this.setHp([6, 3, 1][this.gen]);
    this.score = [300, 150, 80][this.gen];
    this.hw = 10 * this.sc;
    this.hh = 10 * this.sc;
    this.organic = true;
    this.size = 0.7 + (2 - this.gen) * 0.2;
    this.vx = opt.vx ?? -0.6;
    this.vy = opt.vy ?? 0;
    this.ph = frand(0, 6);
  }

  act() {
    const p = this.w.player;
    const sp = [0.55, 0.85, 1.2][this.gen];
    const a = Math.atan2(p.y - this.y, p.x - this.x);
    this.vx = lerp(this.vx, Math.cos(a) * sp - 0.2, 0.02);
    this.vy = lerp(this.vy, Math.sin(a) * sp, 0.02);
    this.x += this.vx + Math.sin(this.t * 0.07 + this.ph) * 0.2;
    this.y += this.vy;
  }

  kill(src) {
    super.kill(src);
    if (this.gen < 2) {
      for (const s of [-1, 1]) this.w.spawn('cell', this.x, this.y + s * 4, { gen: this.gen + 1, vx: -0.3 + s * 0.4, vy: s * 1.4 });
    }
  }

  draw(r) {
    this.spr(r, 'cell', this.x, this.y, (this.t >> 4) % 3, 0, this.sc, this.sc);
  }
}
register('cell', Cell);

class EyeWall extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(10);
    this.score = 700;
    this.rel = false;
    this.organic = true;
    this.ceil = !!opt.ceil;
    const T = w.terrain;
    this.y = this.ceil ? T.ceilAt(x) + 3 : T.floorAt(x) - 3;
    this.hw = 14;
    this.hh = 6;
    this.phase = Math.floor(x * 3) % 100;
  }

  boxes() {
    return [{ x: this.x, y: this.y + (this.ceil ? 5 : -5), hw: 14, hh: 7, type: 'body' }];
  }

  act() {
    const T = this.w.terrain;
    this.y = this.ceil ? T.ceilAt(this.x) + 3 : T.floorAt(this.x) - 3;
    const cyc = Math.round(140 * this.w.diff.fire);
    const k = (this.t + this.phase) % cyc;
    this.open = k > cyc - 50 ? (k > cyc - 35 ? 2 : 1) : 0;
    if (k === cyc - 20 && this.onScreen(-12)) {
      const my = this.y + (this.ceil ? 6 : -6);
      const p = this.w.player;
      let a = Math.atan2(p.y - my, p.x - this.x);
      a = this.ceil ? clamp(a, 0.2, Math.PI - 0.2) : clamp(a, -Math.PI + 0.2, -0.2);
      for (const dx of [-7, 0, 7]) this.w.bullets.spawn(this.x + dx, my, Math.cos(a) * 2.6, Math.sin(a) * 2.6, 'needle');
    }
  }

  draw(r) {
    this.spr(r, 'eyewall', this.x, this.y, this.open, 0, 1, this.ceil ? -1 : 1);
  }
}
register('eyewall', EyeWall);

/** Tendril rooted in the wall; sways, then whips at the player. */
class Tendril extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(8);
    this.score = 800;
    this.rel = false;
    this.organic = true;
    this.ceil = !!opt.ceil;
    this.n = opt.n ?? 9;
    this.pts = [];
    this.whip = 0;
    this.phase = Math.floor(x) % 120;
    this.size = 1;
  }

  chain() {
    const T = this.w.terrain;
    const by = this.ceil ? T.ceilAt(this.x) : T.floorAt(this.x);
    const p = this.w.player;
    let a = this.ceil ? Math.PI / 2 : -Math.PI / 2;
    let x = this.x;
    let y = by;
    const pts = [[x, y]];
    for (let i = 0; i < this.n; i++) {
      const sway = Math.sin(this.t * 0.04 + i * 0.6) * 0.18;
      let d = Math.atan2(p.y - y, p.x - x) - a;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      a += sway + d * 0.12 * this.whip;
      x += Math.cos(a) * 8;
      y += Math.sin(a) * 8;
      pts.push([x, y]);
    }
    this.pts = pts;
  }

  boxes() {
    if (!this.pts.length) this.chain();
    const tip = this.pts[this.pts.length - 1];
    const b = [{ x: tip[0], y: tip[1], hw: 7, hh: 6, type: 'weak', mul: 1 }];
    for (let i = 2; i < this.pts.length - 1; i += 2) b.push({ x: this.pts[i][0], y: this.pts[i][1], hw: 5, hh: 5, type: 'armor' });
    return b;
  }

  act() {
    const k = (this.t + this.phase) % 160;
    this.whip = k > 110 ? lerp(this.whip, 1, 0.15) : lerp(this.whip, 0, 0.05);
    this.chain();
  }

  kill(src) {
    super.kill(src);
    for (const pt of this.pts) this.w.fx.add(P.GIB, pt[0], pt[1], frand(-1, 1), frand(-1, 1), 60, 1, null, { grav: 0.06, frame: Math.floor(frand(0, 3)) });
  }

  draw(r) {
    for (let i = 1; i < this.pts.length - 1; i++) r.spr('tendril_seg', this.pts[i][0], this.pts[i][1], 0, 0, 1.15 - i * 0.04, 1.15 - i * 0.04);
    const n = this.pts.length - 1;
    if (n > 0) {
      const a = Math.atan2(this.pts[n][1] - this.pts[n - 1][1], this.pts[n][0] - this.pts[n - 1][0]);
      this.spr(r, 'tendril_tip', this.pts[n][0], this.pts[n][1], 0, r.arcade ? Math.round(a / (Math.PI / 8)) * (Math.PI / 8) : a);
    }
  }
}
register('tendril', Tendril);

class Spawner extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(14);
    this.score = 1200;
    this.rel = false;
    this.organic = true;
    this.ceil = !!opt.ceil;
    const T = w.terrain;
    this.y = this.ceil ? T.ceilAt(x) + 2 : T.floorAt(x) - 2;
    this.size = 1.2;
    this.count = opt.count ?? 3;
  }

  boxes() {
    return [{ x: this.x, y: this.y + (this.ceil ? 9 : -9), hw: 13, hh: 10, type: 'body' }];
  }

  act() {
    const k = this.t % 130;
    this.open = k > 100 ? 1 : 0;
    if (k === 110 && this.count > 0 && this.onScreen(-20)) {
      this.count--;
      for (let i = 0; i < 3; i++) this.w.after(1 + i * 6, () => !this.dead && this.w.spawn('larva', this.x, this.y + (this.ceil ? 12 : -12), { a: this.ceil ? Math.PI * 0.75 : Math.PI * 1.25, sp: 1.6 }));
      this.w.sfx('squish');
    }
  }

  draw(r) {
    this.spr(r, 'spawner', this.x, this.y, this.open, 0, 1, this.ceil ? -1 : 1);
  }
}
register('spawner', Spawner);

/** Heart valve: two flaps that beat shut across the passage. Indestructible hazard. */
class Valve extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.rel = false;
    this.setHp(9999);
    this.score = 0;
    this.solid = true;
    this.touch = false;
    this.untargetable = true;
    this.revenge = false;
    // the beat is tied to the camera position, not to when the valve was spawned, so it reaches the
    // ship in the same rhythm whether the stretch is entered by scrolling or after a checkpoint restart
    this.phase = ((opt.phase ?? 0) + Math.round(2 * w.camX)) % 190;
    this.k = 1;
  }

  ext() {
    const T = this.w.terrain;
    const c = T.ceilAt(this.x);
    const f = T.floorAt(this.x);
    const mid = (c + f) / 2;
    const full = mid - c;
    return { c, f, len: full * (1 - this.k) + 6 * this.k };
  }

  boxes() {
    return [];
  }

  damage() {
    return 'armor';
  }

  pushSolids(list) {
    const { c, f, len } = this.ext();
    list.push({ x: this.x, y: c + len / 2, hw: 20, hh: len / 2, owner: this });
    list.push({ x: this.x, y: f - len / 2, hw: 20, hh: len / 2, owner: this });
  }

  act() {
    const k = (this.t + this.phase) % 190;
    // open 110 → closing 16 → closed 40 → opening 24
    if (k < 110) this.k = 1;
    else if (k < 126) this.k = 1 - smooth((k - 110) / 16);
    else if (k < 166) this.k = 0;
    else this.k = smooth((k - 166) / 24);
    if (k === 110 && this.onScreen(30)) this.w.sfx('squish');
    if (k === 126 && this.onScreen(30)) {
      this.w.sfx('crush');
      this.w.r.shake(0.15);
    }
  }

  draw(r) {
    const { c, f, len } = this.ext();
    const sy = len / 66;
    r.spr('valve', this.x, c - 2, 0, 0, 0.8, sy);
    r.spr('valve', this.x, f + 2, 0, 0, 0.8, -sy);
    if (this.k < 1 && this.k > 0 && this.t % 6 < 3) r.glow(this.x, (c + f) / 2, 12, '#ff5a70', 0.4);
  }
}
register('valve', Valve);

/** VALVE GUARDIAN — mid-boss: an eye cluster between two beating valve flaps. */
class ValveGuardian extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(220);
    this.score = 18000;
    this.organic = true;
    this.cull = false;
    this.bar = true;
    this.title = 'VALVE GUARDIAN';
    this.size = 2.4;
    this.state = 'enter';
    this.st = 0;
    this.k = 0;
  }

  get flapLen() {
    return 22 + (1 - this.k) * 62;
  }

  boxes() {
    const L = this.flapLen;
    const b = [];
    if (this.k > 0.55) b.push({ x: this.x, y: this.y, hw: 13, hh: 13, type: 'weak', mul: 1 });
    else b.push({ x: this.x, y: this.y, hw: 18, hh: 18, type: 'shield' });
    b.push({ x: this.x, y: 12 + L / 2, hw: 22, hh: L / 2, type: 'armor', noPod: true });
    b.push({ x: this.x, y: PH - 12 - L / 2, hw: 22, hh: L / 2, type: 'armor', noPod: true });
    return b;
  }

  act() {
    const w = this.w;
    const p = w.player;
    this.st++;
    const enraged = this.hp < this.maxHp * 0.5;
    if (this.state === 'enter') {
      this.x += (w.camX + 290 - this.x) * 0.04;
      this.y = PH / 2;
      if (this.st > 80) this.setState('beat');
      return;
    }
    this.x = w.camX + 290;
    const cyc = enraged ? 150 : 200;
    const k = this.st % cyc;
    const openStart = cyc * 0.45;
    if (k < openStart) this.k = lerp(this.k, 0, 0.12);
    else this.k = lerp(this.k, 1, 0.08);
    if (k === Math.floor(openStart) + 10) w.sfx('coreOpen');
    if (this.k > 0.55 && this.st % (enraged ? 14 : 20) === 0) {
      const a = this.st * 0.11;
      w.bullets.ring(this.x, this.y, enraged ? 10 : 8, 1.5, 'orb', a);
    }
    if (this.k < 0.3 && this.st % (enraged ? 50 : 70) === 0) {
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      for (let i = -1; i <= 1; i++) w.bullets.spawn(this.x - 16, this.y, Math.cos(ang + i * 0.08) * 3, Math.sin(ang + i * 0.08) * 3, 'needle');
    }
    if (enraged && this.st % 160 === 80) w.spawnR('cell', 10, frand(60, 160), { gen: 0 });
  }

  kill(src) {
    super.kill(src);
    const w = this.w;
    w.bullets.cancel(true);
    w.sfx('bossExplode');
    w.r.shake(0.6);
    const x0 = this.x;
    for (let i = 0; i < 8; i++) w.after(1 + i * 6, () => w.fx.explosion(x0 + frand(-20, 20), frand(20, PH - 20), 1.3, { organic: true }));
    w.dropItem(this.x, this.y, ITEM.CRYSTAL);
  }

  draw(r) {
    const L = this.flapLen;
    r.spr('valve', this.x, 10, 0, 0, 1, L / 60);
    r.spr('valve', this.x, PH - 10, 0, 0, 1, -L / 60);
    r.glow(this.x, this.y, 24, '#ff5a70', 0.25 + this.k * 0.4);
    const s = 1.4;
    for (const [dx, dy, sc] of [[0, 0, 1.2], [-9, -9, 0.8], [9, -8, 0.7], [-8, 10, 0.75], [9, 9, 0.8]]) {
      r.spr('mother_eye', this.x + dx * s, this.y + dy * s, this.k > 0.55 ? 1 : 0, 0, sc * (0.4 + this.k * 0.6), sc * (0.4 + this.k * 0.6));
    }
    if (this.flashT > 0 && this.k > 0.55) r.glow(this.x, this.y, 18, '#ffffff', 0.6);
  }
}
register('valveguardian', ValveGuardian);

/** Seed bomb from the Bloom Mother: drifts out, then bursts into a ring. */
class SeedBomb extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(3);
    this.score = 200;
    this.hw = 5;
    this.hh = 5;
    this.size = 0.6;
    this.a = opt.a ?? Math.PI;
    this.sp = 2.2;
    this.revenge = false;
  }

  act() {
    this.sp *= 0.97;
    this.x += Math.cos(this.a) * this.sp;
    this.y += Math.sin(this.a) * this.sp;
    if (this.t > 64) {
      this.dead = true;
      this.w.fx.explosion(this.x, this.y, 0.6);
      this.w.sfx('explodeS');
      if (this.onScreen(0)) this.w.bullets.ring(this.x, this.y, 9, 1.5, 'orbA', this.t * 0.3);
    }
  }

  draw(r) {
    this.spr(r, 'seedbomb', this.x, this.y, this.t % 8 < 4 ? 1 : 0, r.arcade ? 0 : this.t * 0.1);
  }
}
register('seedbomb', SeedBomb);

export { Cell, EyeWall, Tendril, Spawner, Valve, ValveGuardian, SeedBomb };
void W;
void turnToward;
