/**
 * Stage 4 roster (the foundry): welder drone, crusher piston, rail turret, scrap tank,
 * assembler (mid-boss) and its boomerang saws.
 */
import { PH } from '../../config.js';
import { Enemy, register } from '../enemy.js';
import { clamp, turnToward, TAU, lerp } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { ITEM } from '../items.js';
import { P } from '../../gfx/particles.js';

class Welder extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(3);
    this.score = 250;
    this.hw = 9;
    this.hh = 7;
    this.size = 0.8;
    this.state = 'in';
    this.stopX = opt.stopX ?? 230 + frand(0, 90);
  }

  act() {
    const w = this.w;
    const p = w.player;
    if (this.state === 'in') {
      this.x -= 2;
      this.y += clamp((p.y - this.y) * 0.02, -1, 1);
      if (this.x - w.camX < this.stopX) this.setState('aim');
    } else if (this.state === 'aim') {
      this.y += clamp((p.y - this.y) * 0.05, -1.2, 1.2);
      if (this.st === 30) {
        w.bullets.fan(this.x - 14, this.y + 5, Math.atan2(p.y - this.y, p.x - this.x), 3, 0.2, 2.2, 'orbA');
        w.fx.sparks(this.x - 14, this.y + 5, 6, '#bff8ff', 2.5, 10);
      }
      if (this.st > 60) this.setState('out');
    } else {
      this.x -= 2.8;
      this.y += Math.sin(this.t * 0.1) * 0.8;
    }
    if (this.t % 4 === 0 && this.state === 'aim') w.fx.add(P.SPARK, this.x - 13.5, this.y + 5, frand(-1.5, 1.5), frand(-1, 2), 10, 0.6, '#ffe0a0');
  }

  draw(r) {
    this.spr(r, 'welder', this.x, this.y, (this.t >> 1) & 1);
  }
}
register('welder', Welder);

/** Hydraulic crusher: an indestructible, lethal block that slams floor-to-ceiling. */
class Crusher extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.rel = false;
    this.setHp(9999);
    this.score = 0;
    this.solid = true;
    this.touch = false;
    this.fromFloor = !!opt.floor;
    const T = w.terrain;
    this.c = T.ceilAt(x);
    this.f = T.floorAt(x);
    this.upY = this.fromFloor ? this.f - 20 : this.c + 20;
    this.downY = this.fromFloor ? this.c + 22 : this.f - 22;
    this.y = this.upY;
    this.state = 'up';
    this.st = Math.floor(opt.phase ?? 0);
    this.period = opt.period ?? 150;
    this.untargetable = true;
    this.revenge = false;
  }

  boxes() {
    return [{ x: this.x, y: this.y, hw: 17, hh: 20, type: 'shield', noPod: true }];
  }

  pushSolids(list) {
    list.push({ x: this.x, y: this.y + (this.fromFloor ? -1 : 1), hw: 17, hh: 21, owner: this });
  }

  damage() {
    return 'armor';
  }

  act() {
    const w = this.w;
    this.st++;
    switch (this.state) {
      case 'up':
        if (this.st > this.period) this.setState('warn');
        break;
      case 'warn':
        this.y = this.upY + Math.sin(this.st * 1.4) * 0.8;
        if (this.st === 1 && this.onScreen(30)) w.sfx('coreOpen');
        if (this.st > 36) this.setState('slam');
        break;
      case 'slam': {
        const dir = Math.sign(this.downY - this.upY);
        this.y += dir * 8;
        if ((dir > 0 && this.y >= this.downY) || (dir < 0 && this.y <= this.downY)) {
          this.y = this.downY;
          this.setState('hold');
          if (this.onScreen(20)) {
            w.sfx('crush');
            w.r.shake(0.3);
            w.rumble(0.5, 0.3, 120);
            const iy = this.fromFloor ? this.y - 22 : this.y + 22;
            for (let i = 0; i < 10; i++) w.fx.add(P.SPARK, this.x + frand(-16, 16), iy, frand(-3, 3), frand(-2, 2), 16, 0.8, '#ffd080', { drag: 0.88 });
            for (let i = 0; i < 4; i++) w.fx.add(P.SMOKE, this.x + frand(-16, 16), iy, frand(-1, 1), frand(-0.5, 0.5), 40, 4, '#4a4440', { grow: 0.12, add: false });
          }
        }
        break;
      }
      case 'hold':
        if (this.st > 26) this.setState('rise');
        break;
      case 'rise': {
        const dir = Math.sign(this.upY - this.downY);
        this.y += dir * 1.4;
        if ((dir > 0 && this.y >= this.upY) || (dir < 0 && this.y <= this.upY)) {
          this.y = this.upY;
          this.setState('up');
        }
        break;
      }
      default:
        break;
    }
  }

  draw(r) {
    const anchor = this.fromFloor ? this.f : this.c;
    const top = this.fromFloor ? this.y + 20 : anchor;
    const bot = this.fromFloor ? anchor : this.y - 20;
    for (let y = top; y < bot; y += 18) r.spr('crusher_rod', this.x, y + 9);
    r.spr('crusher', this.x, this.y, 0, 0, 1, this.fromFloor ? -1 : 1);
    if (this.state === 'warn' && this.st % 8 < 4) {
      r.glow(this.x, this.y, 22, '#ff4020', 0.6);
      const ctx = r.ctx;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ff3a20';
      const y0 = Math.min(this.y, this.downY);
      ctx.fillRect(this.x - 17, y0, 34, Math.abs(this.downY - this.y));
      ctx.globalAlpha = 1;
    }
  }
}
register('crusher', Crusher);

/** Rail turret: locks on with a sight line, then fires a hypersonic slug. */
class Railgun extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(10);
    this.score = 700;
    this.rel = false;
    this.ceil = !!opt.ceil;
    const T = w.terrain;
    this.y = opt.y ?? (this.ceil ? T.ceilAt(x) + 6 : T.floorAt(x) - 6);
    this.hw = 11;
    this.hh = 7;
    this.ang = this.ceil ? Math.PI / 2 : -Math.PI / 2;
    this.phase = Math.floor(x) % 80;
    this.size = 1.1;
  }

  act() {
    const w = this.w;
    const p = w.player;
    const gy = this.y + (this.ceil ? 4 : -4);
    const cyc = Math.round(170 * w.diff.fire);
    const k = (this.t + this.phase) % cyc;
    this.lock = k > cyc - 70 && k < cyc - 10;
    if (k < cyc - 25) {
      let target = Math.atan2(p.y - gy, p.x - this.x);
      target = this.ceil ? clamp(target, 0.1, Math.PI - 0.1) : clamp(target, -Math.PI + 0.1, -0.1);
      this.ang = turnToward(this.ang, target, 0.06);
    }
    if (k === cyc - 10 && this.onScreen(-10)) {
      const c = Math.cos(this.ang);
      const s = Math.sin(this.ang);
      w.bullets.spawn(this.x + c * 24, gy + s * 24, c * 5.5, s * 5.5, 'needle');
      w.fx.glow(this.x + c * 24, gy + s * 24, 10, '#7ff4ff', 8);
      w.sfx('helix');
    }
  }

  draw(r) {
    const gy = this.y + (this.ceil ? 4 : -4);
    const a = r.arcade ? Math.round(this.ang / (Math.PI / 8)) * (Math.PI / 8) : this.ang;
    if (this.lock) {
      const ctx = r.ctx;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#7ff4ff';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(this.x, gy);
      ctx.lineTo(this.x + Math.cos(this.ang) * 400, gy + Math.sin(this.ang) * 400);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    this.spr(r, 'railgun_barrel', this.x, gy, this.lock ? 1 : 0, a);
    this.spr(r, 'railgun', this.x, this.y + (this.ceil ? -3 : 3), this.lock ? 1 : 0, 0, 1, this.ceil ? -1 : 1);
  }
}
register('railgun', Railgun);

/** Scrap tank: trundles along a surface and lobs aimed shots. */
class Tank extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(5);
    this.score = 400;
    this.rel = false;
    this.ceil = !!opt.ceil;
    this.hw = 11;
    this.hh = 7;
    this.speed = opt.speed ?? -0.35;
    this.ang = Math.PI;
    this.phase = Math.floor(x * 3) % 70;
    this.snap();
  }

  snap() {
    const T = this.w.terrain;
    const s = this.ceil ? T.ceilAt(this.x) + 7 : T.floorAt(this.x) - 7;
    if (Math.abs(s) < 900) this.y = s;
  }

  act() {
    const w = this.w;
    const p = w.player;
    this.x += this.speed;
    this.snap();
    let target = Math.atan2(p.y - this.y, p.x - this.x);
    target = this.ceil ? clamp(target, 0.15, Math.PI - 0.15) : clamp(target, -Math.PI + 0.15, -0.15);
    this.ang = turnToward(this.ang, target, 0.05);
    if ((this.t + this.phase) % Math.round(110 * w.diff.fire) === 0 && this.onScreen(-10)) {
      w.bullets.spawn(this.x + Math.cos(this.ang) * 12, this.y + Math.sin(this.ang) * 12, Math.cos(this.ang) * 2.1, Math.sin(this.ang) * 2.1, 'orbA');
    }
  }

  draw(r) {
    const gy = this.y + (this.ceil ? 5 : -5);
    const a = r.arcade ? Math.round(this.ang / (Math.PI / 8)) * (Math.PI / 8) : this.ang;
    this.spr(r, 'tank_gun', this.x, gy, 0, a);
    this.spr(r, 'tank', this.x, this.y, (this.t >> 3) & 1, 0, 1, this.ceil ? -1 : 1);
  }
}
register('tank', Tank);

/** ASSEMBLER — mid-boss: a hex drone that hurls boomerang saws and fires its lens. */
class Assembler extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(190);
    this.score = 14000;
    this.cull = false;
    this.bar = true;
    this.title = 'ASSEMBLER';
    this.size = 2;
    this.state = 'enter';
    this.st = 0;
    this.arms = [0, 1, 2, 3].map((i) => ({ a: (i / 4) * TAU, saw: true }));
    this.spin = 0;
    this.baseY = PH / 2;
  }

  boxes() {
    const b = [
      { x: this.x, y: this.y, hw: 9, hh: 9, type: 'weak', mul: 1.3 },
      { x: this.x, y: this.y - 14, hw: 19, hh: 6, type: 'armor' },
      { x: this.x, y: this.y + 14, hw: 19, hh: 6, type: 'armor' },
      { x: this.x, y: this.y, hw: 19, hh: 19, type: 'armor', noShot: true },
    ];
    for (const arm of this.arms) {
      if (!arm.saw) continue;
      const a = arm.a + this.spin;
      b.push({ x: this.x + Math.cos(a) * 26, y: this.y + Math.sin(a) * 26, hw: 9, hh: 9, type: 'armor', noShot: true });
    }
    return b;
  }

  act() {
    const w = this.w;
    const p = w.player;
    this.st++;
    const enraged = this.hp < this.maxHp * 0.5;
    this.spin += enraged ? 0.05 : 0.03;
    if (this.state === 'enter') {
      this.x += (w.camX + 280 - this.x) * 0.03;
      if (this.st > 90) this.setState('hover');
      return;
    }
    this.x += (w.camX + 280 + Math.sin(this.st * 0.013) * 40 - this.x) * 0.05;
    this.y += (this.baseY + Math.sin(this.st * 0.021) * 64 - this.y) * 0.05;
    if (this.state === 'hover') {
      if (this.st % Math.round((enraged ? 70 : 100) * w.diff.fire) === 40) {
        const arm = this.arms.find((a) => a.saw);
        if (arm) {
          arm.saw = false;
          const a = arm.a + this.spin;
          w.spawn('saw', this.x + Math.cos(a) * 26, this.y + Math.sin(a) * 26, { owner: this, arm });
          w.sfx('podLaunch');
        }
      }
      if (this.st % 150 === 120) this.setState('lens');
    } else if (this.state === 'lens') {
      if (this.st < 40 && this.st % 2 === 0) w.fx.add(P.STREAK, this.x + frand(-20, 20), this.y + frand(-20, 20), 0, 0, 10, 0.8, '#7ff4ff', { rel: true });
      if (this.st === 40) {
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        for (let k = -2; k <= 2; k++) w.bullets.spawn(this.x, this.y, Math.cos(a + k * 0.07) * (3 + Math.abs(k) * 0.2), Math.sin(a + k * 0.07) * (3 + Math.abs(k) * 0.2), 'needle');
        w.sfx('laserFire', 0.4);
      }
      if (this.st > 70) this.setState('hover');
    }
  }

  kill(src) {
    super.kill(src);
    const w = this.w;
    w.bullets.cancel(true);
    w.sfx('bossExplode');
    w.r.shake(0.5);
    const x0 = this.x;
    const y0 = this.y;
    for (let i = 0; i < 6; i++) w.after(1 + i * 6, () => w.fx.explosion(x0 + frand(-24, 24), y0 + frand(-24, 24), 1.2));
    for (const e of w.enemies) if (e.kindName === 'saw') e.dead = true;
    w.dropItem(this.x, this.y, ITEM.CRYSTAL);
  }

  draw(r) {
    for (const arm of this.arms) {
      const a = arm.a + this.spin;
      const ra = r.arcade ? Math.round(a / (Math.PI / 8)) * (Math.PI / 8) : a;
      r.spr('assembler_arm', this.x, this.y, 0, ra);
      if (arm.saw) r.spr('saw', this.x + Math.cos(a) * 26, this.y + Math.sin(a) * 26, (this.t >> 1) % 4);
    }
    if (this.state === 'lens') r.glow(this.x, this.y, 10 + this.st * 0.4, '#7ff4ff', 0.6);
    this.spr(r, 'assembler', this.x, this.y);
  }
}
register('assembler', Assembler);

/** Boomerang saw thrown by the assembler (returns to its arm). */
class Saw extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(6);
    this.score = 300;
    this.hw = 9;
    this.hh = 9;
    this.size = 0.8;
    const p = w.player;
    const a = Math.atan2(p.y - y, p.x - x);
    this.vx = Math.cos(a) * 3.6;
    this.vy = Math.sin(a) * 3.6;
    this.cull = false;
  }

  act() {
    const o = this.opt.owner;
    if (!o || o.dead) {
      this.dead = true;
      return;
    }
    // pulled back toward the owner like a boomerang
    const dx = o.x - this.x;
    const dy = o.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const pull = this.t > 30 ? 0.16 : 0.03;
    this.vx += (dx / d) * pull;
    this.vy += (dy / d) * pull;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 4.2) {
      this.vx *= 4.2 / sp;
      this.vy *= 4.2 / sp;
    }
    this.x += this.vx;
    this.y += this.vy;
    if (this.t > 50 && d < 18) {
      this.dead = true;
      if (this.opt.arm) this.opt.arm.saw = true;
    }
    if (this.t > 600) this.dead = true;
  }

  kill(src) {
    super.kill(src);
    if (this.opt.arm) this.opt.arm.saw = true;
  }

  draw(r) {
    this.spr(r, 'saw', this.x, this.y, (this.t >> 1) % 4);
  }
}
register('saw', Saw);

export { Welder, Crusher, Railgun, Tank, Assembler, Saw };
void lerp;
