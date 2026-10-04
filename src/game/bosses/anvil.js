/**
 * ANVIL — stage 4 boss. A forging press the Bloom has taken over: its hammer rides a rail,
 * tracks the player and slams the floor; after two blows the furnace grill lifts to vent,
 * exposing the molten core. Rivet guns cover the approach.
 */
import { PH, W } from '../../config.js';
import { register } from '../enemy.js';
import { Boss } from './boss.js';
import { clamp, lerp, smooth } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { P } from '../../gfx/particles.js';

const RAIL_Y = 38;

class Anvil extends Boss {
  constructor(w, x, y, opt) {
    super(w, x, y, { ...opt, title: 'ANVIL' });
    this.setHp(480);
    this.score = 80000;
    this.x = w.camX + W + 120;
    this.y = PH / 2;
    this.hx = w.camX + 200;
    this.hy = -60;
    this.grill = 0;
    this.slams = 0;
    this.guns = [-1, 1].map((s) => ({ s, hp: 30 * w.diff.hp, dead: false, flash: 0, cool: 50 + (s > 0 ? 30 : 0) }));
    this.dieLen = 240;
  }

  get phase() {
    return this.hp / this.maxHp > 0.5 ? 1 : 2;
  }

  get floorY() {
    const f = this.w.terrain.floorAt(this.hx);
    return Math.abs(f) < 900 ? f : PH;
  }

  gunPos(g) {
    return { x: this.x - 12, y: this.y + g.s * 72 };
  }

  hitboxes() {
    const b = [];
    if (this.grill > 0.75) b.push({ x: this.x + 20, y: this.y, hw: 13, hh: 13, type: 'weak', mul: 1 });
    else b.push({ x: this.x + 20, y: this.y, hw: 26, hh: 26, type: 'shield' });
    for (const g of this.guns) {
      if (g.dead) continue;
      const p = this.gunPos(g);
      b.push({ x: p.x, y: p.y, hw: 9, hh: 8, type: 'body', part: g });
    }
    b.push({ x: this.hx, y: this.hy, hw: 32, hh: 21, type: 'armor', noPod: true });
    b.push({ x: this.x + 45, y: this.y, hw: 51, hh: 54, type: 'armor', noShot: true, noPod: true });
    return b;
  }

  pushSolids(list) {
    list.push({ x: this.x - 3, y: this.y - 90, hw: 17, hh: 36, owner: this });
    list.push({ x: this.x - 3, y: this.y + 90, hw: 17, hh: 36, owner: this });
    list.push({ x: this.x + 85, y: this.y, hw: 35, hh: 120, owner: this });
    list.push({ x: this.hx, y: this.hy + 1, hw: 32, hh: 22, owner: this });
  }

  blastArea() {
    return { x: this.x + 40, y: this.y, w: 150, h: 220 };
  }

  onPartHit(part) {
    part.flash = 4;
  }

  onPartDestroyed(part) {
    const p = this.gunPos(part);
    this.w.fx.explosion(p.x, p.y, 1.4);
    this.w.addScore(3000, p.x, p.y);
    this.w.sfx('explodeL');
  }

  act() {
    const w = this.w;
    const p = w.player;
    const ph = this.phase;
    this.solid = true;
    if (this.state === 'enter') {
      const tx = w.camX + 300;
      this.x = lerp(this.x, tx, 0.025);
      this.hy = lerp(this.hy, RAIL_Y, 0.03);
      this.hx = lerp(this.hx, w.camX + 200, 0.05);
      if (this.st % 14 === 0) w.r.shake(0.1);
      if (this.st === 2) w.sfx('bossRoar');
      if (Math.abs(this.x - tx) < 1.5) this.setState('track');
      return;
    }
    this.x = w.camX + 300;
    // rivet guns
    for (const g of this.guns) {
      if (g.flash > 0) g.flash--;
      if (g.dead) continue;
      if (--g.cool <= 0) {
        g.cool = Math.round((ph === 2 ? 70 : 100) * w.diff.fire);
        const q = this.gunPos(g);
        const a = Math.atan2(p.y - q.y, p.x - q.x);
        for (let k = 0; k < 3; k++) w.after(1 + k * 5, () => !g.dead && !this.dying && w.bullets.spawn(q.x - 8, q.y, Math.cos(a) * 3.4, Math.sin(a) * 3.4, 'needle'));
      }
    }
    const minX = w.camX + 40;
    const maxX = w.camX + 246;
    switch (this.state) {
      case 'track':
        this.grill = lerp(this.grill, 0, 0.12);
        this.hy = lerp(this.hy, RAIL_Y, 0.15);
        this.hx = clamp(this.hx + clamp(p.x - this.hx, -2.4, 2.4) * (ph === 2 ? 1.25 : 1), minX, maxX);
        if (ph === 2 && this.st % 120 === 50) for (const s of [-1, 1]) w.spawnR('welder', 10, PH / 2 + s * 50, { stopX: 260 });
        if (this.st > (ph === 2 ? 55 : 70)) {
          this.setState('warn');
          w.sfx('coreOpen');
        }
        break;
      case 'warn':
        this.hy = RAIL_Y + Math.sin(this.st * 1.2) * 1.2;
        if (this.st > 38) this.setState('slam');
        break;
      case 'slam': {
        const target = this.floorY - 23;
        this.hy = Math.min(target, this.hy + 13);
        if (this.hy >= target) {
          this.slams++;
          this.setState('stuck');
          w.sfx('crush');
          w.r.shake(0.6);
          w.rumble(0.8, 0.5, 200);
          w.r.wave(this.hx - w.camX, this.floorY, 0.6, 1.2);
          const fy = this.floorY - 5;
          const n = ph === 2 ? 4 : 3;
          for (const s of [-1, 1]) for (let i = 0; i < n; i++) w.bullets.spawn(this.hx + s * 34, fy - i * 7, s * (2 + i * 0.4), -0.1 * i, 'orbA');
          for (let i = 0; i < 16; i++) w.fx.add(P.SPARK, this.hx + frand(-30, 30), this.floorY, frand(-4, 4), frand(-4, -0.5), 20, 0.9, '#ffd080', { drag: 0.9, grav: 0.1 });
          for (let i = 0; i < 6; i++) w.fx.add(P.SMOKE, this.hx + frand(-30, 30), this.floorY - 4, frand(-1.5, 1.5), frand(-0.8, 0), 50, 5, '#4a4440', { grow: 0.15, add: false });
        }
        break;
      }
      case 'stuck':
        if (this.st > 46) this.setState('lift');
        break;
      case 'lift':
        this.hy = lerp(this.hy, RAIL_Y, 0.06);
        if (this.st > 40) {
          if (this.slams >= (ph === 2 ? 1 : 2)) {
            this.slams = 0;
            this.setState('vent');
            w.sfx('coreOpen');
          } else this.setState('track');
        }
        break;
      case 'vent': {
        this.grill = lerp(this.grill, 1, 0.08);
        const cx = this.x + 20;
        if (this.st > 20 && this.st % (ph === 2 ? 22 : 30) === 0) {
          const a = Math.atan2(p.y - this.y, p.x - cx);
          w.bullets.fan(cx - 10, this.y, a, ph === 2 ? 5 : 3, 0.25, 1.8, 'big');
          w.sfx('explodeS');
        }
        if (this.st % 3 === 0) w.fx.add(P.FIRE, cx + frand(-8, 8), this.y + frand(-8, 8), frand(-1.2, -0.3), frand(-0.6, 0.6), 22, 0.4, null, { drag: 0.97 });
        if (this.st > 200) this.setState('track');
        break;
      }
      default:
        break;
    }
  }

  draw(r) {
    if (this.hidden) return;
    const w = this.w;
    // core + grill
    const cx = this.x + 20;
    r.spr('anvil_frame', this.x, this.y);
    r.glow(cx, this.y, 34, '#ff7a1a', 0.35 + this.grill * 0.4);
    r.spr('anvil_core', cx, this.y, (this.t >> 3) % 3);
    if (this.flashT > 0 && this.grill > 0.75) r.glow(cx, this.y, 22, '#ffffff', 0.5);
    r.spr('anvil_grill', cx, this.y - smooth(clamp(this.grill, 0, 1)) * 44, 0);
    for (const g of this.guns) {
      if (g.dead) continue;
      const q = this.gunPos(g);
      r.spr('railgun', q.x, q.y, 0, -Math.PI / 2, 1, 1);
      if (g.flash > 0) r.sprWhite('railgun', q.x, q.y, 0, -Math.PI / 2, 1, 1, 0.6);
    }
    // hammer rail + hammer
    for (let y = -20; y < this.hy - 20; y += 26) r.spr('anvil_rail', this.hx, y);
    if (this.state === 'warn' && this.st % 8 < 5) {
      const ctx = r.ctx;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#ff3a20';
      ctx.fillRect(this.hx - 32, this.hy + 23, 64, this.floorY - this.hy - 23);
      ctx.globalAlpha = 1;
      r.glow(this.hx, this.hy + 20, 26, '#ff4020', 0.5);
    }
    r.spr('anvil_hammer', this.hx, this.hy);
    void w;
  }
}
register('anvil', Anvil);
