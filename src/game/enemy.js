/**
 * Enemy base class and registry.
 * Hitboxes are returned by boxes(): each {x,y,hw,hh,type,part?}
 *   type 'body'  – takes damage, kills the player on touch
 *   type 'weak'  – takes (amplified) damage
 *   type 'armor' – deflects shots and lasers; the pod still grinds it
 *   type 'shield'– blocks everything, harmless to touch? (touch flag decides)
 */
import { W, PH } from '../config.js';

export const REGISTRY = new Map();

export function register(name, cls) {
  REGISTRY.set(name, cls);
  cls.prototype.kindName = name;
}

export class Enemy {
  constructor(w, x, y, opt = {}) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.opt = opt;
    this.t = 0;
    this.dead = false;
    this.hw = 6;
    this.hh = 6;
    this.hp = 1;
    this.score = 100;
    this.rel = true; // screen-relative motion
    this.flashT = 0;
    this.touch = true;
    this.organic = false;
    this.size = 0.8; // explosion size
    this.layer = 1;
    this.cull = true;
    this.drop = opt.drop || null;
    this.dropColor = opt.color || null;
    this.boss = false;
    this.solid = false;
    this.hitCount = 0;
    this.revenge = true;
    this.inv = 0;
    this.fireMul = 1;
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  /** Call at the end of a subclass constructor to apply difficulty to hp. */
  setHp(hp) {
    this.hp = hp * this.w.diff.hp;
    this.maxHp = this.hp;
  }

  boxes() {
    return [{ x: this.x, y: this.y, hw: this.hw, hh: this.hh, type: 'body' }];
  }

  /**
   * Apply damage.
   * @returns {'none'|'armor'|'hit'|'kill'}
   */
  damage(amount, src, box) {
    if (this.dead) return 'none';
    const type = box ? box.type : 'body';
    if (type === 'shield') return 'armor';
    if (type === 'armor' && src !== 'pod') return 'armor';
    if (this.inv > 0) return 'armor';
    if (box && box.part && box.part.hp !== undefined) {
      const part = box.part;
      if (part.dead) return 'none';
      part.hp -= amount;
      part.flash = 3;
      this.onPartHit(part, amount, src);
      if (part.hp <= 0) {
        part.dead = true;
        this.onPartDestroyed(part, src);
      }
      return part.dead ? 'kill' : 'hit';
    }
    const k = type === 'weak' ? (box.mul ?? 1.5) : 1;
    this.hp -= amount * k;
    this.flashT = 3;
    this.hitCount++;
    this.onHit(amount * k, src, box);
    if (this.hp <= 0) {
      this.kill(src);
      return 'kill';
    }
    return 'hit';
  }

  onHit() {}

  onPartHit() {}

  onPartDestroyed() {}

  kill(src) {
    if (this.dead) return;
    this.dead = true;
    const w = this.w;
    w.addScore(this.score, this.x, this.y);
    this.explode();
    if (this.drop) w.dropItem(this.x, this.y, this.drop, this.dropColor);
    if (this.opt.onDeath) this.opt.onDeath(this);
    if (w.diff.revenge && this.revenge && !this.boss && w.player.alive) {
      const p = w.player;
      if (Math.abs(p.x - this.x) > 40) w.bullets.aim(this.x, this.y, 2.4, 'orbA');
    }
    w.onEnemyKilled(this, src);
  }

  explode() {
    const w = this.w;
    w.fx.explosion(this.x, this.y, this.size, { organic: this.organic });
    w.sfx(this.size >= 1.5 ? 'explodeL' : this.size >= 1 ? 'explodeM' : 'explodeS');
    if (this.size >= 1.2) w.r.shake(0.12 * this.size);
  }

  update() {
    this.t++;
    if (this.flashT > 0) this.flashT--;
    if (this.inv > 0) this.inv--;
    if (this.rel) this.x += this.w.dx;
    this.act();
    if (this.cull && !this.dead) {
      const sx = this.x - this.w.camX;
      if (sx < -this.cullMargin() || sx > W + 260 || this.y < -120 || this.y > PH + 120) this.dead = true;
    }
  }

  cullMargin() {
    return Math.max(this.hw, this.hh) + 32;
  }

  act() {}

  draw() {}

  /** Visible on screen (with margin) – used to gate firing. */
  onScreen(m = 0) {
    const sx = this.x - this.w.camX;
    return sx > -m && sx < W + m && this.y > -m && this.y < PH + m;
  }

  /** Fire timer helper scaled by difficulty. */
  every(n, phase = 0) {
    const k = Math.max(1, Math.round(n * this.w.diff.fire * this.fireMul));
    return (this.t + phase) % k === 0;
  }

  aim(speed, kind = 'orb', spread = 0, opt) {
    if (!this.onScreen(-4) || !this.w.player.alive) return null;
    return this.w.bullets.aim(this.x, this.y, speed, kind, spread, opt);
  }

  /** Draw a sprite, adding a white flash when recently hit. */
  spr(r, name, x, y, frame = 0, rot = 0, sx = 1, sy = 1) {
    r.spr(name, x, y, frame, rot, sx, sy);
    if (this.flashT > 0) r.sprWhite(name, x, y, frame, rot, sx, sy, 0.7);
  }
}
