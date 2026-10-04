/**
 * LEVIATHAN CORE — stage 3 boss. The dreadnought's forward bulwark: sponson guns, missile
 * batteries and a main cannon whose giant beam forces the reactor shutters to vent afterwards.
 */
import { PH, W } from '../../config.js';
import { register } from '../enemy.js';
import { Boss } from './boss.js';
import { clamp, lerp, smooth, turnToward } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { P } from '../../gfx/particles.js';

class Leviathan extends Boss {
  constructor(w, x, y, opt) {
    super(w, x, y, { ...opt, title: 'LEVIATHAN CORE' });
    this.setHp(620);
    this.score = 70000;
    this.x = w.camX + W + 100;
    this.y = PH / 2;
    this.shut = 0; // 0 closed .. 1 open
    this.guns = [-1, 1].map((s) => ({ s, hp: 40 * w.diff.hp, dead: false, flash: 0, ang: Math.PI, cool: 60 + (s > 0 ? 40 : 0) }));
    this.bats = [-1, 1].map((s) => ({ s, hp: 30 * w.diff.hp, dead: false, flash: 0, cool: 90 + (s > 0 ? 45 : 0) }));
    this.beam = 0;
    this.dieLen = 250;
  }

  get phase() {
    return this.hp / this.maxHp > 0.5 ? 1 : 2;
  }

  gunPos(g) {
    return { x: this.x + 54, y: this.y + g.s * 74 };
  }

  batPos(b) {
    return { x: this.x + 128, y: this.y + b.s * 108 };
  }

  get mouth() {
    return { x: this.x - 30, y: this.y };
  }

  hitboxes() {
    const b = [];
    for (const g of this.guns) {
      if (g.dead) continue;
      const p = this.gunPos(g);
      b.push({ x: p.x, y: p.y, hw: 11, hh: 9, type: 'body', part: g });
    }
    for (const bt of this.bats) {
      if (bt.dead) continue;
      const p = this.batPos(bt);
      b.push({ x: p.x, y: p.y, hw: 12, hh: 6, type: 'body', part: bt });
    }
    if (this.shut > 0.7) b.push({ x: this.x + 34, y: this.y, hw: 15, hh: 15, type: 'weak', mul: 1 });
    else b.push({ x: this.x + 34, y: this.y, hw: 24, hh: 22, type: 'shield' });
    // hull (lethal to touch, solid to shots)
    b.push({ x: this.x + 118, y: this.y, hw: 74, hh: 110, type: 'armor', noShot: true, noPod: true });
    b.push({ x: this.x + 30, y: this.y - 62, hw: 42, hh: 28, type: 'armor', noPod: true });
    b.push({ x: this.x + 30, y: this.y + 62, hw: 42, hh: 28, type: 'armor', noPod: true });
    b.push({ x: this.x - 12, y: this.y - 28, hw: 24, hh: 10, type: 'armor', noPod: true });
    b.push({ x: this.x - 12, y: this.y + 28, hw: 24, hh: 10, type: 'armor', noPod: true });
    return b;
  }

  pushSolids(list) {
    list.push({ x: this.x + 130, y: this.y, hw: 70, hh: 120, owner: this });
  }

  blastArea() {
    return { x: this.x + 60, y: this.y, w: 200, h: 220 };
  }

  onPartHit(part) {
    part.flash = 4;
  }

  onPartDestroyed(part) {
    const p = part.ang !== undefined ? this.gunPos(part) : this.batPos(part);
    this.w.fx.explosion(p.x, p.y, 1.5);
    this.w.addScore(3000, p.x, p.y);
    this.w.sfx('explodeL');
    this.w.r.shake(0.3);
  }

  act() {
    const w = this.w;
    const p = w.player;
    if (this.state === 'enter') {
      const tx = w.camX + 250;
      this.x = lerp(this.x, tx, 0.025);
      if (this.st % 12 === 0) w.r.shake(0.12);
      if (this.st === 2) w.sfx('bossRoar');
      if (Math.abs(this.x - tx) < 1.5) this.setState('guns');
      return;
    }
    this.x = w.camX + 250;
    this.y = PH / 2 + Math.sin(this.t * 0.008) * (this.phase === 2 ? 26 : 14);
    for (const g of this.guns) {
      if (g.flash > 0) g.flash--;
      if (g.dead) continue;
      const gp = this.gunPos(g);
      g.ang = turnToward(g.ang, Math.atan2(p.y - gp.y, p.x - gp.x), 0.04);
      if (--g.cool <= 0 && this.state !== 'fire') {
        g.cool = Math.round((this.phase === 2 ? 60 : 85) * w.diff.fire);
        for (let k = 0; k < 3; k++) {
          w.after(1 + k * 6, () => {
            if (g.dead || this.dying) return;
            const q = this.gunPos(g);
            w.bullets.spawn(q.x + Math.cos(g.ang) * 18, q.y + Math.sin(g.ang) * 18, Math.cos(g.ang) * 2.5, Math.sin(g.ang) * 2.5, 'orbA');
          });
        }
      }
    }
    for (const b of this.bats) {
      if (b.flash > 0) b.flash--;
      if (b.dead) continue;
      if (--b.cool <= 0) {
        b.cool = Math.round((this.phase === 2 ? 100 : 140) * w.diff.fire);
        const q = this.batPos(b);
        w.spawn('emissile', q.x - 8, q.y + b.s * 4, { a: Math.PI + b.s * 0.9 });
        w.sfx('missile');
      }
    }
    switch (this.state) {
      case 'guns':
        this.shut = lerp(this.shut, 0, 0.1);
        if (this.st > (this.phase === 2 ? 150 : 210)) {
          this.setState('charge');
          w.sfx('laserCharge', 1.5);
        }
        break;
      case 'charge': {
        const m = this.mouth;
        if (this.st % 2 === 0) {
          const a = frand(0, Math.PI * 2);
          const d = frand(20, 46);
          w.fx.add(P.STREAK, m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, -Math.cos(a) * 1.8, -Math.sin(a) * 1.8, 16, 1, '#ffb070', { drag: 1.04 });
        }
        if (this.st > 95) {
          this.setState('fire');
          w.sfx('laserFire', 1.4);
          w.r.shake(0.5);
          w.r.doFlash(0.3, [1, 0.8, 0.6]);
        }
        break;
      }
      case 'fire': {
        this.beam = Math.min(1, this.st / 8);
        const m = this.mouth;
        if (p.alive && p.invuln <= 0 && p.x < m.x && Math.abs(p.y - m.y) < 13 * this.beam) w.killPlayer('laser');
        if (this.st % 3 === 0) w.r.shake(0.08);
        if (this.st > 80) {
          this.beam = 0;
          this.setState('vent');
          w.sfx('coreOpen');
        }
        break;
      }
      case 'vent': {
        this.shut = lerp(this.shut, 1, 0.08);
        if (this.st % 3 === 0) w.fx.add(P.SMOKE, this.x + 34 + frand(-10, 10), this.y + (frand(0, 1) < 0.5 ? -24 : 24), frand(-0.6, 0.2), frand(-0.6, 0.6), 40, 3, '#9a9aa0', { grow: 0.15, add: false });
        if (this.phase === 2 && this.st % 45 === 20) w.bullets.ring(this.x + 34, this.y, 12, 1.5, 'orb', this.st * 0.1);
        if (this.st > 210) this.setState('guns');
        break;
      }
      default:
        break;
    }
  }

  draw(r) {
    if (this.hidden) return;
    const w = this.w;
    const ctx = r.ctx;
    // core behind the shutters
    const cx = this.x + 34;
    r.glow(cx, this.y, 30, '#ff7020', 0.3 + this.shut * 0.4);
    r.spr('bship_core', cx, this.y, (this.t >> 3) % 3);
    if (this.flashT > 0 && this.shut > 0.7) r.glow(cx, this.y, 24, '#ffffff', 0.5);
    // shutters slide apart vertically
    const open = smooth(clamp(this.shut, 0, 1)) * 22;
    r.spr('bship_shutter', cx, this.y - open, 0);
    r.spr('bship_shutter', cx, this.y + open, 0, 0, 1, -1);
    r.spr('bship_bow', this.x, this.y);
    // guns + batteries
    for (const g of this.guns) {
      if (g.dead) continue;
      const q = this.gunPos(g);
      const a = r.arcade ? Math.round(g.ang / (Math.PI / 8)) * (Math.PI / 8) : g.ang;
      r.spr('bship_barrel', q.x, q.y - g.s * 2, 1, a);
      r.spr('bship_turret', q.x, q.y, 0, 0, 1.1, g.s > 0 ? -1.1 : 1.1);
      if (g.flash > 0) r.sprWhite('bship_turret', q.x, q.y, 0, 0, 1.1, g.s > 0 ? -1.1 : 1.1, 0.6);
    }
    for (const b of this.bats) {
      if (b.dead) continue;
      const q = this.batPos(b);
      r.spr('silo', q.x, q.y, b.cool < 30 ? 2 : 0, 0, 1, b.s > 0 ? -1 : 1);
      if (b.flash > 0) r.sprWhite('silo', q.x, q.y, 0, 0, 1, b.s > 0 ? -1 : 1, 0.6);
    }
    // main cannon
    const m = this.mouth;
    if (this.state === 'charge') {
      const k = this.st / 95;
      r.glow(m.x, m.y, 10 + k * 30, '#ffb070', 0.5 + k * 0.5);
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.st * 0.7);
      ctx.fillStyle = '#ff6040';
      ctx.fillRect(w.camX, m.y - 13, m.x - w.camX, 1);
      ctx.fillRect(w.camX, m.y + 12, m.x - w.camX, 1);
      ctx.globalAlpha = 1;
    }
    if (this.beam > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const hh = 13 * this.beam;
      for (const [k, col, al] of [[1.6, '#ff3a10', 0.35], [1, '#ff8a3a', 0.75], [0.45, '#fff4e0', 1]]) {
        ctx.globalAlpha = al;
        ctx.fillStyle = col;
        const wob = Math.sin(this.t * 1.7) * 1.2;
        ctx.fillRect(w.camX - 10, m.y - hh * k - wob, m.x - w.camX + 10, hh * 2 * k + wob * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      r.glow(m.x, m.y, 40, '#ffb070', 1);
      if (this.t % 2 === 0) w.fx.sparks(m.x - frand(0, 300), m.y + frand(-hh, hh), 2, '#ffd0a0', 3, 10);
    }
  }
}
register('leviathan', Leviathan);
