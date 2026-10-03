/**
 * Common Bloom enemies (used across stages): wisp, darter, carrier, turret, hopper.
 */
import { W, PH } from '../../config.js';
import { Enemy, register } from '../enemy.js';
import { clamp, turnToward } from '../../core/math.js';
import { ITEM } from '../items.js';

/** Sine-wave formation drone. opt: {amp, freq, ph, speed, fireAt} */
class Wisp extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(1);
    this.score = 100;
    this.hw = 6;
    this.hh = 5;
    this.baseY = y;
    this.amp = opt.amp ?? 24;
    this.freq = opt.freq ?? 0.045;
    this.ph = opt.ph ?? 0;
    this.speed = opt.speed ?? 1.5;
    this.fireAt = opt.fireAt ?? -1;
    this.size = 0.7;
  }

  act() {
    this.x -= this.speed;
    this.y = this.baseY + Math.sin(this.ph + this.t * this.freq) * this.amp;
    if (this.fireAt >= 0 && this.t === this.fireAt) this.aim(2.1);
  }

  draw(r) {
    this.spr(r, 'wisp', this.x, this.y, (this.t >> 3) % 4);
  }
}
register('wisp', Wisp);

/** Dash fighter: brakes, aims, then lunges. */
class Darter extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(2);
    this.score = 200;
    this.hw = 9;
    this.hh = 4;
    this.vx = -4;
    this.stopX = opt.stopX ?? 250 + (y % 60);
    this.state = 0;
    this.size = 0.8;
  }

  act() {
    const w = this.w;
    if (this.state === 0) {
      this.x += this.vx;
      if (this.x - w.camX < this.stopX) {
        this.vx *= 0.88;
        if (Math.abs(this.vx) < 0.25) {
          this.state = 1;
          this.st = 0;
        }
      }
    } else if (this.state === 1) {
      this.st++;
      const p = w.player;
      this.y += clamp((p.y - this.y) * 0.03, -0.8, 0.8);
      if (this.st === 26) this.aim(2.3);
      if (this.st > 38) {
        this.state = 2;
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        this.dvx = Math.cos(a) * 4.6;
        this.dvy = Math.sin(a) * 4.6;
        if (this.dvx > -1.5) this.dvx = -2.5;
      }
    } else {
      this.x += this.dvx;
      this.y += this.dvy;
    }
  }

  draw(r) {
    if (this.state === 1 && this.st % 6 < 3) r.glow(this.x - 6, this.y - 1, 6, '#ffb030', 0.6);
    this.spr(r, 'darter', this.x, this.y, this.t % 6 < 3 ? 1 : 0);
  }
}
register('darter', Darter);

/** Item courier: walks along the floor or ceiling, or hovers if there is none. */
class Carrier extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(4);
    this.score = 300;
    this.hw = 10;
    this.hh = 9;
    this.drop = opt.drop || ITEM.CRYSTAL;
    this.dropColor = opt.color || null;
    this.ceil = !!opt.ceil;
    this.fly = !!opt.fly;
    this.size = 0.9;
    this.rel = this.fly;
    this.walk = opt.walk ?? 0.45;
  }

  act() {
    const T = this.w.terrain;
    if (this.fly) {
      this.x -= this.walk + 0.4;
      this.y += Math.sin(this.t * 0.05) * 0.4;
      return;
    }
    this.x -= this.walk;
    if (this.ceil) {
      const c = T.ceilAt(this.x);
      this.y = c > -900 ? c + 11 : this.y;
    } else {
      const f = T.floorAt(this.x);
      this.y = f < 900 ? f - 11 : this.y;
    }
  }

  draw(r) {
    const f = this.fly ? 0 : (this.t >> 3) % 4;
    if (this.fly) {
      r.glow(this.x, this.y + 9, 6, '#7fd8ff', 0.6);
    }
    this.spr(r, 'carrier', this.x, this.y, f, 0, 1, this.ceil ? -1 : 1);
  }
}
register('carrier', Carrier);

/** Terrain-mounted cannon. opt: {ceil, burst, rate, speed, wx} */
class Turret extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(opt.hp ?? 6);
    this.score = 300;
    this.rel = false;
    this.ceil = !!opt.ceil;
    const T = w.terrain;
    if (opt.y === undefined) {
      if (this.ceil) this.y = T.ceilAt(x) + 7;
      else this.y = T.floorAt(x) - 7;
    }
    this.hw = 8;
    this.hh = 6;
    this.ang = this.ceil ? Math.PI / 2 : -Math.PI / 2;
    this.rate = opt.rate ?? 100;
    this.burst = opt.burst ?? 2;
    this.speed = opt.speed ?? 2.2;
    this.phase = opt.phase ?? Math.floor(x) % 50;
    this.size = 0.9;
  }

  act() {
    const p = this.w.player;
    let target = Math.atan2(p.y - (this.y - (this.ceil ? -2 : 2)), p.x - this.x);
    // keep the barrel out of the wall it sits on
    if (this.ceil) target = clamp(target, 0.15, Math.PI - 0.15);
    else target = clamp(target, -Math.PI + 0.15, -0.15);
    this.ang = turnToward(this.ang, target, 0.05);
    const cyc = Math.round(this.rate * this.w.diff.fire);
    const k = (this.t + this.phase) % cyc;
    if (k >= cyc - this.burst * 8 && k % 8 === 0 && this.onScreen(-8)) {
      const mx = this.x + Math.cos(this.ang) * 10;
      const my = this.y - (this.ceil ? -2 : 2) + Math.sin(this.ang) * 10;
      this.w.bullets.spawn(mx, my, Math.cos(this.ang) * this.speed, Math.sin(this.ang) * this.speed, 'orb');
      this.w.fx.glow(mx, my, 6, '#ff9ad0', 6);
    }
  }

  draw(r) {
    const gy = this.y - (this.ceil ? -2 : 2);
    const a = r.arcade ? Math.round(this.ang / (Math.PI / 8)) * (Math.PI / 8) : this.ang;
    this.spr(r, 'turret_gun', this.x, gy, 0, a);
    this.spr(r, 'turret_base', this.x, this.y + (this.ceil ? -3 : 3), 0, 0, 1, this.ceil ? -1 : 1);
  }
}
register('turret', Turret);

/** Crab walker that hops toward the player and sprays at the apex. */
class Hopper extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.setHp(4);
    this.score = 300;
    this.rel = false;
    this.ceil = !!opt.ceil;
    this.hw = 8;
    this.hh = 6;
    this.g = this.ceil ? -0.16 : 0.16;
    this.state = 'wait';
    this.st = 20 + (Math.floor(x) % 30);
    this.size = 0.9;
    this.snap();
  }

  surf() {
    const T = this.w.terrain;
    return this.ceil ? T.ceilAt(this.x) + 7 : T.floorAt(this.x) - 7;
  }

  snap() {
    const s = this.surf();
    if (Math.abs(s) < 900) this.y = s;
  }

  act() {
    const p = this.w.player;
    if (this.state === 'wait') {
      this.snap();
      if (--this.st <= 0) {
        this.state = 'jump';
        this.vx = clamp((p.x - this.x) / 60, -1.6, 1.0) - 0.2;
        this.vy = this.ceil ? 3.3 : -3.3;
        this.fired = false;
      }
    } else {
      this.x += this.vx;
      this.vy += this.g;
      this.y += this.vy;
      if (!this.fired && Math.abs(this.vy) < 0.4) {
        this.fired = true;
        if (this.onScreen(-6)) {
          const base = this.ceil ? Math.PI / 2 : -Math.PI / 2;
          const toP = Math.atan2(p.y - this.y, p.x - this.x);
          const a = this.ceil ? clamp(toP, 0.3, Math.PI - 0.3) : clamp(toP, -Math.PI + 0.3, -0.3);
          this.w.bullets.fan(this.x, this.y, a || base, 3, 0.28, 1.9, 'orb');
        }
      }
      const s = this.surf();
      if ((!this.ceil && this.vy > 0 && this.y >= s) || (this.ceil && this.vy < 0 && this.y <= s)) {
        this.y = s;
        this.state = 'wait';
        this.st = 36;
      }
      if (Math.abs(s) > 900 && (this.y < -40 || this.y > PH + 40)) this.dead = true;
    }
  }

  draw(r) {
    const f = this.state === 'wait' ? (this.st < 10 ? 1 : 0) : 2;
    this.spr(r, 'hopper', this.x, this.y, f, 0, 1, this.ceil ? -1 : 1);
  }
}
register('hopper', Hopper);

export { Wisp, Darter, Carrier, Turret, Hopper };
void W;
