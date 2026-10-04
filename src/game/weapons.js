/**
 * Player projectiles: pellets, the charged LANCE beam, the three AEGIS lasers
 * (HELIX / PRISM / CRAWLER) and homing missiles.
 * Every projectile exposes a collision shape via shape() and reacts in onHit().
 */
import { W, PH } from '../config.js';
import { frand } from '../core/rng.js';
import { P } from '../gfx/particles.js';

export const BEAM_DMG = [0, 4, 7, 11, 17, 28];
export const BEAM_TH = [0, 3.5, 5.5, 8, 11, 15];
export const BEAM_LEN = [0, 26, 40, 58, 80, 120];

class Proj {
  constructor() {
    this.dead = false;
    this.t = 0;
    this.kind = 'shot';
    this.pierce = false;
    this.hitT = null; // Map enemy -> frame when it may be hit again
  }

  canHit(e, w, gap) {
    if (!this.hitT) this.hitT = new Map();
    const t = this.hitT.get(e);
    if (t !== undefined && w.t < t) return false;
    this.hitT.set(e, w.t + gap);
    return true;
  }

  offscreen(w, m = 16) {
    const sx = this.x - w.camX;
    return sx < -m || sx > W + m || this.y < -m || this.y > PH + m;
  }
}

/** Ship pellet. */
export class Shot extends Proj {
  constructor(x, y, vx = 7.5, vy = 0) {
    super();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dmg = 1;
    this.kind = 'shot';
  }

  update(w) {
    this.t++;
    this.x += this.vx + w.dx;
    this.y += this.vy;
    if (this.offscreen(w)) this.dead = true;
    else if (w.shotSolid(this.x + 3, this.y)) {
      this.dead = true;
      w.terrain.damageAt(this.x + 3, this.y, 1, w);
      w.fx.hit(this.x + 2, this.y, '#ffe08a');
    }
  }

  shape() {
    return { x: this.x, y: this.y, hw: 5, hh: 2.2 };
  }

  onHit(w, res) {
    if (res === 'armor') w.fx.clink(this.x + 3, this.y);
    else w.fx.hit(this.x + 3, this.y, '#ffe9a8');
    this.dead = true;
  }

  draw(r) {
    r.spr('shot', this.x, this.y);
  }
}

/** Small pellet from pod / bits (any direction). */
export class Pellet extends Proj {
  constructor(x, y, vx, vy, dmg = 0.8) {
    super();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dmg = dmg;
    this.kind = 'shot';
  }

  update(w) {
    this.t++;
    this.x += this.vx + w.dx;
    this.y += this.vy;
    if (this.offscreen(w)) this.dead = true;
    else if (w.shotSolid(this.x, this.y)) {
      this.dead = true;
      w.terrain.damageAt(this.x, this.y, this.dmg, w);
      w.fx.hit(this.x, this.y, '#ffc070');
    }
  }

  shape() {
    return { x: this.x, y: this.y, hw: 2.5, hh: 2.5 };
  }

  onHit(w, res) {
    if (res === 'armor') w.fx.clink(this.x, this.y);
    else w.fx.hit(this.x, this.y, '#ffd090');
    this.dead = true;
  }

  draw(r) {
    r.spr('pellet', this.x, this.y);
  }
}

/** The charged LANCE: a piercing spear of plasma whose size scales with charge (level 1..5). */
export class Beam extends Proj {
  constructor(w, x, y, level) {
    super();
    this.level = level;
    this.x = x; // head
    this.tail = x;
    this.y = y;
    this.kind = 'beam';
    this.pierce = true;
    this.dmg = BEAM_DMG[level];
    this.th = BEAM_TH[level];
    this.len = BEAM_LEN[level];
    this.speed = 10;
    this.attached = true;
    this.blocked = false;
    this.kills = 0;
    this.phase = frand(0, 6);
    this.hitSet = new Set();
    w.sfx('beam', level);
    w.r.kick(-1.5 - level * 0.6, 0);
    if (level >= 4) {
      w.r.shake(0.12 + (level - 4) * 0.1);
      w.r.wave(x - w.camX, y, 0.35 + level * 0.08, 1.4);
      w.r.aberration(0.5 + level * 0.15);
      w.r.bloomBoost += 0.25;
    }
    w.rumble(0.25 + level * 0.12, 0.4, 90 + level * 25);
  }

  update(w) {
    this.t++;
    const ship = w.player;
    if (this.attached && ship.alive) {
      // tail stays on the emitter until the full length is out
      this.tail = ship.x + 16;
      if (this.x - this.tail >= this.len) this.attached = false;
    } else {
      this.attached = false;
      this.tail += this.speed + w.dx;
    }
    if (!this.blocked) {
      const nx = this.x + this.speed + w.dx;
      // terrain check along the head's path (destructible blocks take damage and let it through)
      for (let s = 0; s <= this.speed; s += 3) {
        const hx = this.x + s;
        for (const oy of [0, -this.th * 0.35, this.th * 0.35]) {
          if (w.shotSolid(hx, this.y + oy)) {
            if (w.terrain.damageAt(hx, this.y + oy, this.dmg * 2, w, true)) continue;
            this.blocked = true;
            this.x = hx;
            w.fx.sparks(hx, this.y, 10, '#bff8ff', 3, 16, { dir: Math.PI, spread: 1.3 });
            w.fx.glow(hx, this.y, 10 + this.th, '#7ff4ff', 10);
            break;
          }
        }
        if (this.blocked) break;
      }
      if (!this.blocked) this.x = nx;
    } else {
      this.x += w.dx;
      if (w.t % 3 === 0) w.fx.sparks(this.x, this.y, 2, '#bff8ff', 2.5, 12, { dir: Math.PI, spread: 1.2 });
    }
    if (this.tail >= this.x - 2) this.dead = true;
    if (this.tail - w.camX > W + 20) this.dead = true;
    // particle wake
    if (w.t % 2 === 0 && this.level >= 2) {
      const px = frand(this.tail, this.x);
      w.fx.add(P.SPARK, px, this.y + frand(-this.th, this.th) * 0.5, frand(-1, 1), frand(-1.2, 1.2), 12, 0.7, '#9ff6ff', { drag: 0.9 });
    }
  }

  shape() {
    const hw = (this.x - this.tail) / 2;
    return { x: this.tail + hw, y: this.y, hw: Math.max(1, hw), hh: this.th * 0.55 + 1 };
  }

  canHit(e) {
    if (this.hitSet.has(e)) return false;
    this.hitSet.add(e);
    return true;
  }

  onHit(w, res, e) {
    // fragments born inside the beam (splitting cells) don't extend the chain
    if (res === 'kill' && !e.noChain) {
      this.kills++;
      if (this.kills >= 2) w.beamChain(this.kills, e.x, e.y);
    }
    if (res === 'armor') w.fx.clink(e.x - 4, this.y);
  }

  draw(r) {
    const ctx = r.ctx;
    const x0 = this.tail;
    const x1 = this.x;
    if (x1 - x0 < 1) return;
    const y = this.y;
    const th = this.th;
    const t = this.t;
    const lv = this.level;
    if (r.arcade) {
      // banded period-style beam
      ctx.fillStyle = '#1aa6c8';
      ctx.fillRect(Math.round(x0), Math.round(y - th / 2), Math.round(x1 - x0), Math.round(th));
      ctx.fillStyle = '#7ff4ff';
      ctx.fillRect(Math.round(x0 + 2), Math.round(y - th / 3), Math.round(x1 - x0 - 4), Math.max(1, Math.round((th * 2) / 3)));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x0 + 4), Math.round(y - th / 7), Math.round(x1 - x0 - 6), Math.max(1, Math.round((th * 2) / 7)));
      // wave crests
      ctx.fillStyle = '#e0ffff';
      for (let k = x0 + ((t * 3) % 10); k < x1 - 4; k += 10) {
        const hh = Math.round(th * 0.62 + Math.sin(k * 0.4 + this.phase) * 1.5);
        ctx.fillRect(Math.round(k), Math.round(y - hh), 2, hh * 2);
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(Math.round(x1), Math.round(y - th / 2));
      ctx.lineTo(Math.round(x1 + th * 0.9), Math.round(y));
      ctx.lineTo(Math.round(x1), Math.round(y + th / 2));
      ctx.fill();
      return;
    }
    ctx.globalCompositeOperation = 'lighter';
    // outer aura
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#29c8ff';
    lance(ctx, x0 - 4, x1 + 6, y, th * 1.9);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#3ff0ff';
    lance(ctx, x0, x1 + 3, y, th * 1.15);
    ctx.globalAlpha = 1;
    // body with travelling wave modulation
    ctx.fillStyle = '#9ffbff';
    ctx.beginPath();
    const steps = Math.max(4, Math.ceil((x1 - x0) / 4));
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const x = x0 + (x1 - x0) * k;
      const taper = Math.min(1, k * 4) * Math.min(1, (1 - k) * 2.2 + 0.25);
      const hh = (th * 0.5 + Math.sin(x * 0.35 - t * 0.9 + this.phase) * th * 0.12) * taper;
      if (i === 0) ctx.moveTo(x, y - hh);
      else ctx.lineTo(x, y - hh);
    }
    ctx.lineTo(x1 + th * 0.9, y);
    for (let i = steps; i >= 0; i--) {
      const k = i / steps;
      const x = x0 + (x1 - x0) * k;
      const taper = Math.min(1, k * 4) * Math.min(1, (1 - k) * 2.2 + 0.25);
      const hh = (th * 0.5 + Math.sin(x * 0.35 - t * 0.9 + this.phase + 1.7) * th * 0.12) * taper;
      ctx.lineTo(x, y + hh);
    }
    ctx.closePath();
    ctx.fill();
    // white-hot core
    ctx.fillStyle = '#ffffff';
    lance(ctx, x0 + 3, x1 + th * 0.45, y, th * 0.32);
    // helical ribbons for high charge
    if (lv >= 3) {
      ctx.strokeStyle = lv >= 5 ? '#ffffff' : '#c8ffff';
      ctx.lineWidth = lv >= 5 ? 1.1 : 0.8;
      for (let s = 0; s < 2; s++) {
        ctx.beginPath();
        for (let x = x0 + 2; x <= x1; x += 2) {
          const k = (x - x0) / Math.max(1, x1 - x0);
          const taper = Math.min(1, k * 5) * Math.min(1, (1 - k) * 3 + 0.3);
          const yy = y + Math.sin(x * 0.22 - t * 0.6 + s * Math.PI) * th * 0.75 * taper;
          if (x === x0 + 2) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
    }
    // shock rings near the head
    for (let i = 0; i < 3; i++) {
      const rx = x1 - ((t * 4 + i * 14) % 42);
      if (rx < x0 + 4) continue;
      const a = 1 - (x1 - rx) / 42;
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = '#e8ffff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(rx, y, 1.6, th * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    r.glow(x1 + 2, y, th * 1.6 + 6, '#7ff4ff', 0.9);
  }
}

function lance(ctx, x0, x1, y, h) {
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo(x0 + 4, y - h / 2, x0 + 10, y - h / 2);
  ctx.lineTo(x1 - h * 0.7, y - h / 2);
  ctx.lineTo(x1, y);
  ctx.lineTo(x1 - h * 0.7, y + h / 2);
  ctx.lineTo(x0 + 10, y + h / 2);
  ctx.quadraticCurveTo(x0 + 4, y + h / 2, x0, y);
  ctx.fill();
}

/** HELIX laser (red): twin strands spiralling along a straight line, piercing. */
export class Helix extends Proj {
  constructor(x, y, dir, level) {
    super();
    this.x = x; // head
    this.x0 = x; // origin (tail starts here)
    this.y = y;
    this.dir = dir;
    this.level = level;
    this.kind = 'laser';
    this.pierce = true;
    this.maxLen = level >= 3 ? 84 : 60;
    this.amp = level >= 3 ? 5.5 : 4;
    this.dmg = level >= 3 ? 1.5 : 1.1;
    this.speed = 9;
    this.tailX = x;
  }

  update(w) {
    this.t++;
    this.x += this.dir * this.speed + w.dx;
    this.x0 += w.dx;
    const len = Math.min(this.maxLen, Math.abs(this.x - this.x0));
    this.tailX = this.x - this.dir * len;
    if (Math.abs(this.x - this.x0) >= this.maxLen) this.x0 = this.tailX;
    const sx = this.tailX - w.camX;
    if (sx < -100 || sx > W + 100) this.dead = true;
    if (w.shotSolid(this.x, this.y)) {
      w.terrain.damageAt(this.x, this.y, this.dmg, w);
      w.fx.sparks(this.x, this.y, 3, '#ff9aa8', 2, 10);
      this.dead = true;
    }
  }

  shape() {
    const a = Math.min(this.x, this.tailX);
    const b = Math.max(this.x, this.tailX);
    return { x: (a + b) / 2, y: this.y, hw: Math.max(2, (b - a) / 2), hh: this.amp + 1 };
  }

  canHit(e, w) {
    return super.canHit(e, w, 7);
  }

  onHit(w, res, e) {
    if (res === 'armor') w.fx.clink(e.x, this.y);
    else w.fx.hit(e.x - this.dir * 4, this.y, '#ffb0c0');
  }

  draw(r) {
    const ctx = r.ctx;
    const a = this.tailX;
    const b = this.x;
    const y = this.y;
    const t = this.t;
    const strands = this.level >= 3 ? 3 : 2;
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < strands; s++) {
      const ph = (s / strands) * Math.PI * 2;
      if (!r.arcade) {
        ctx.strokeStyle = 'rgba(255,60,90,0.4)';
        ctx.lineWidth = 3.2;
        strand(ctx, a, b, y, this.amp, ph, t, this.dir);
      }
      ctx.strokeStyle = s === 0 ? '#ff5a72' : s === 1 ? '#ff9a6a' : '#ffd0d8';
      ctx.lineWidth = r.arcade ? 1 : 1.3;
      strand(ctx, a, b, y, this.amp, ph, t, this.dir);
    }
    if (!r.arcade) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(a, y);
      ctx.lineTo(b, y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    r.glow(b, y, 7, '#ff5a72', 0.9);
  }
}

function strand(ctx, a, b, y, amp, ph, t, dir) {
  ctx.beginPath();
  const n = Math.max(2, Math.ceil(Math.abs(b - a) / 2.5));
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const k = i / n;
    const env = Math.min(1, k * 3) * Math.min(1, (1 - k) * 6 + 0.2);
    const yy = y + Math.sin(x * 0.28 * dir + ph - t * 0.2) * amp * env;
    if (i === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
}

/** PRISM laser (blue): straight segments that ricochet off terrain. */
export class Prism extends Proj {
  constructor(x, y, a, level) {
    super();
    this.x = x;
    this.y = y;
    this.vx = Math.cos(a) * 7.5;
    this.vy = Math.sin(a) * 7.5;
    this.level = level;
    this.kind = 'laser';
    this.pierce = true;
    this.dmg = level >= 3 ? 1.3 : 1;
    this.len = level >= 3 ? 26 : 20;
    this.bounces = level >= 3 ? 4 : 3;
    this.trail = [];
  }

  update(w) {
    this.t++;
    this.trail.push(this.x, this.y);
    if (this.trail.length > 12) this.trail.splice(0, 2);
    for (let i = 0; i < this.trail.length; i += 2) this.trail[i] += w.dx;
    const steps = 3;
    for (let s = 0; s < steps; s++) {
      const nx = this.x + this.vx / steps;
      const ny = this.y + this.vy / steps;
      if (w.shotSolid(nx, ny)) {
        w.terrain.damageAt(nx, ny, this.dmg, w);
        const hitX = w.shotSolid(nx, this.y);
        const hitY = w.shotSolid(this.x, ny);
        if (hitY || !hitX) this.vy = -this.vy;
        if (hitX) this.vx = -this.vx;
        this.bounces--;
        w.fx.sparks(this.x, this.y, 3, '#bfe4ff', 2, 9);
        if (this.bounces < 0) {
          this.dead = true;
          return;
        }
      } else {
        this.x = nx;
        this.y = ny;
      }
    }
    this.x += w.dx;
    if (this.offscreen(w, 30)) this.dead = true;
  }

  shape() {
    return { x: this.x, y: this.y, hw: 5, hh: 5 };
  }

  canHit(e, w) {
    return super.canHit(e, w, 10);
  }

  onHit(w, res, e) {
    if (res === 'armor') {
      w.fx.clink(this.x, this.y);
      this.dead = true;
    } else w.fx.hit(this.x, this.y, '#c0e8ff');
    void e;
  }

  draw(r) {
    const ctx = r.ctx;
    const sp = Math.hypot(this.vx, this.vy);
    const ux = this.vx / sp;
    const uy = this.vy / sp;
    const x0 = this.x - ux * this.len;
    const y0 = this.y - uy * this.len;
    ctx.globalCompositeOperation = 'lighter';
    if (!r.arcade && this.trail.length >= 4) {
      ctx.strokeStyle = 'rgba(80,160,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(this.trail[0], this.trail[1]);
      for (let i = 2; i < this.trail.length; i += 2) ctx.lineTo(this.trail[i], this.trail[i + 1]);
      ctx.stroke();
    }
    if (!r.arcade) {
      ctx.strokeStyle = 'rgba(70,150,255,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#7fc4ff';
    ctx.lineWidth = r.arcade ? 2 : 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = r.arcade ? 1 : 0.8;
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    r.glow(this.x, this.y, 5, '#7fc4ff', 0.8);
  }
}

/** CRAWLER laser (yellow): flies vertically, then hugs floor/ceiling and runs forward. */
export class Crawler extends Proj {
  constructor(x, y, vdir, level, hdir = 1) {
    super();
    this.x = x;
    this.y = y;
    this.vdir = vdir;
    this.hdir = hdir;
    this.level = level;
    this.kind = 'laser';
    this.pierce = true;
    this.dmg = level >= 3 ? 1.7 : 1.3;
    this.mode = 'fly';
    this.life = 170;
    this.size = level >= 3 ? 4.5 : 3.5;
    this.trail = [];
  }

  update(w) {
    this.t++;
    const T = w.terrain;
    this.trail.push(this.x, this.y);
    if (this.trail.length > 16) this.trail.splice(0, 2);
    for (let i = 0; i < this.trail.length; i += 2) this.trail[i] += w.dx;
    if (this.mode === 'fly') {
      this.y += this.vdir * 6;
      this.x += w.dx + this.hdir * 0.8;
      const surf = this.vdir > 0 ? T.floorAt(this.x) : T.ceilAt(this.x);
      if ((this.vdir > 0 && this.y >= surf - this.size) || (this.vdir < 0 && this.y <= surf + this.size)) {
        this.mode = 'crawl';
        this.y = this.vdir > 0 ? surf - this.size : surf + this.size;
        w.fx.sparks(this.x, this.y, 5, '#fff0a0', 2.2, 10);
      }
      if (this.y < -10 || this.y > PH + 10) this.dead = true;
    } else {
      const speed = this.level >= 3 ? 5.2 : 4.4;
      const nx = this.x + this.hdir * speed;
      const surf = this.vdir > 0 ? T.floorAt(nx) : T.ceilAt(nx);
      const ny = this.vdir > 0 ? surf - this.size : surf + this.size;
      if (Math.abs(ny - this.y) > 14 || T.blockAt(nx, ny)) {
        // a wall: try climbing it (follow the step), otherwise die
        if (Math.abs(ny - this.y) <= 28 && !T.blockAt(nx, ny)) {
          this.y = ny;
          this.x = nx + w.dx;
        } else {
          this.dead = true;
          T.damageAt(nx, this.y, this.dmg * 2, w);
          w.fx.sparks(this.x, this.y, 6, '#fff0a0', 2.5, 12);
        }
      } else {
        this.x = nx + w.dx;
        this.y = ny;
      }
      if (w.t % 2 === 0) w.fx.add(P.SPARK, this.x, this.y, frand(-1, 1) - this.hdir, -this.vdir * frand(0.5, 1.5), 10, 0.6, '#fff3a0', { drag: 0.88 });
    }
    if (--this.life <= 0 || this.offscreen(w, 20)) this.dead = true;
  }

  shape() {
    return { x: this.x, y: this.y, hw: this.size + 1.5, hh: this.size + 1.5 };
  }

  canHit(e, w) {
    return super.canHit(e, w, 8);
  }

  onHit(w, res) {
    if (res === 'armor') w.fx.clink(this.x, this.y);
    else w.fx.hit(this.x, this.y, '#fff3b0');
  }

  draw(r) {
    const ctx = r.ctx;
    ctx.globalCompositeOperation = 'lighter';
    if (this.trail.length >= 4) {
      ctx.strokeStyle = r.arcade ? '#d8a020' : 'rgba(255,210,60,0.55)';
      ctx.lineWidth = this.size * 1.2;
      ctx.beginPath();
      ctx.moveTo(this.trail[0], this.trail[1]);
      for (let i = 2; i < this.trail.length; i += 2) ctx.lineTo(this.trail[i], this.trail[i + 1]);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffe14f';
    ctx.beginPath();
    const s = this.size;
    const jag = this.t % 4 < 2 ? 1 : 0.8;
    ctx.moveTo(this.x + s * 1.4 * this.hdir, this.y);
    ctx.lineTo(this.x, this.y - s * jag);
    ctx.lineTo(this.x - s * this.hdir, this.y);
    ctx.lineTo(this.x, this.y + s * jag);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    r.glow(this.x, this.y, s * 2.4, '#ffd84f', 0.85);
  }
}

/** Homing missile. */
export class Missile extends Proj {
  constructor(x, y, vy) {
    super();
    this.x = x;
    this.y = y;
    this.a = vy < 0 ? -0.5 : 0.5;
    this.sp = 2.2;
    this.dmg = 2.2;
    this.kind = 'missile';
    this.target = null;
  }

  update(w) {
    this.t++;
    if (!this.target || this.target.dead || this.t % 20 === 0) this.target = w.nearestEnemy(this.x, this.y, true);
    if (this.target && this.t > 6) {
      const ta = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      let d = ta - this.a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.a += Math.max(-0.11, Math.min(0.11, d));
    } else {
      this.a *= 0.9;
    }
    this.sp = Math.min(5.5, this.sp + 0.2);
    this.x += Math.cos(this.a) * this.sp + w.dx;
    this.y += Math.sin(this.a) * this.sp;
    if (w.t % 2 === 0) w.fx.add(P.SMOKE, this.x - Math.cos(this.a) * 5, this.y - Math.sin(this.a) * 5, 0, 0, 16, 1.6, '#8a8a90', { grow: 0.12, rel: true, add: false });
    if (this.offscreen(w, 30) || this.t > 160) this.dead = true;
    else if (w.shotSolid(this.x, this.y)) {
      w.terrain.damageAt(this.x, this.y, 2, w);
      w.fx.explosion(this.x, this.y, 0.35);
      this.dead = true;
    }
  }

  shape() {
    return { x: this.x, y: this.y, hw: 4, hh: 3 };
  }

  onHit(w, res) {
    if (res === 'armor') w.fx.clink(this.x, this.y);
    w.fx.explosion(this.x, this.y, 0.3);
    this.dead = true;
  }

  draw(r) {
    r.glow(this.x - Math.cos(this.a) * 6, this.y - Math.sin(this.a) * 6, 4, '#ffb347', 0.8);
    const a = r.arcade ? Math.round(this.a / (Math.PI / 8)) * (Math.PI / 8) : this.a;
    r.spr('missile', this.x, this.y, 0, a);
  }
}
