/**
 * BROODMOTHER — stage 2 boss. A brood sac hanging from the cavern roof; its heart sits behind
 * a cage of ribs that opens only to breathe. Three tentacles end in spitting mouths and can be
 * severed. It drops larvae and lashes at the player.
 */
import { PH, W } from '../../config.js';
import { register } from '../enemy.js';
import { Boss } from './boss.js';
import { clamp, TAU, lerp, smooth } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { P } from '../../gfx/particles.js';

const RIBS = 6;

class Broodmother extends Boss {
  constructor(w, x, y, opt) {
    super(w, x, y, { ...opt, title: 'BROODMOTHER' });
    this.setHp(640);
    this.score = 60000;
    this.organic = true;
    this.x = w.camX + 272;
    this.y = -90;
    this.open = 0;
    this.tents = [-44, 0, 44].map((dx, i) => ({
      dx,
      hp: 36 * w.diff.hp,
      dead: false,
      flash: 0,
      ph: i * 2.1,
      lash: 0,
      cool: 60 + i * 30,
      pts: [],
    }));
    this.dieLen = 240;
    this.cyc = 0;
  }

  get phase() {
    return this.hp / this.maxHp > 0.5 ? 1 : 2;
  }

  heart() {
    return { x: this.x, y: this.y + 16 };
  }

  tentPoints(tn) {
    const pts = [];
    let x = this.x + tn.dx;
    let y = this.y + 58 - Math.abs(tn.dx) * 0.3;
    let a = Math.PI / 2;
    pts.push([x, y]);
    const p = this.w.player;
    for (let i = 0; i < 11; i++) {
      const sway = Math.sin(this.t * 0.035 + tn.ph + i * 0.5) * (0.12 + i * 0.012);
      let toward = 0;
      if (tn.lash > 0) {
        let d = Math.atan2(p.y - y, p.x - x) - a;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        toward = d * 0.16 * tn.lash;
      }
      a += sway + toward;
      x += Math.cos(a) * 9;
      y += Math.sin(a) * 9;
      pts.push([x, y]);
    }
    tn.pts = pts;
    return pts;
  }

  hitboxes() {
    const b = [];
    const h = this.heart();
    if (this.open > 0.6) b.push({ x: h.x, y: h.y, hw: 14, hh: 13, type: 'weak', mul: 1 });
    else b.push({ x: h.x, y: h.y, hw: 20, hh: 18, type: 'shield' });
    for (const tn of this.tents) {
      if (tn.dead) continue;
      const pts = tn.pts.length ? tn.pts : this.tentPoints(tn);
      const tip = pts[pts.length - 1];
      b.push({ x: tip[0], y: tip[1], hw: 8, hh: 8, type: 'body', part: tn });
      for (let i = 2; i < pts.length - 1; i += 2) b.push({ x: pts[i][0], y: pts[i][1], hw: 5, hh: 5, type: 'armor', noShot: true });
    }
    // the sac itself: lethal to touch, translucent to shots
    b.push({ x: this.x, y: this.y + 6, hw: 62, hh: 44, type: 'armor', noShot: true, noPod: true });
    b.push({ x: this.x, y: this.y - 48, hw: 30, hh: 26, type: 'armor', noShot: true, noPod: true });
    return b;
  }

  blastArea() {
    return { x: this.x, y: this.y, w: 140, h: 110 };
  }

  onPartHit(part) {
    part.flash = 4;
  }

  onPartDestroyed(tn) {
    const w = this.w;
    for (const pt of tn.pts) {
      w.fx.add(P.GIB, pt[0], pt[1], frand(-1, 1), frand(-1, 0.5), 80, 1, null, { grav: 0.08, frame: Math.floor(frand(0, 3)) });
    }
    const tip = tn.pts[tn.pts.length - 1];
    w.fx.explosion(tip[0], tip[1], 1.4, { organic: true });
    w.addScore(3000, tip[0], tip[1]);
    w.sfx('explodeL');
    w.r.shake(0.25);
  }

  act() {
    const w = this.w;
    this.x = w.camX + 272;
    for (const tn of this.tents) {
      if (tn.flash > 0) tn.flash--;
      if (!tn.dead) this.tentPoints(tn);
    }
    if (this.state === 'enter') {
      this.y = lerp(-90, 66, smooth(Math.min(1, this.st / 130)));
      if (this.st === 2) w.sfx('bossRoar');
      if (this.st % 15 === 0) {
        w.r.shake(0.12);
        w.fx.add(P.GIB, this.x + frand(-40, 40), 4, frand(-0.5, 0.5), 1, 60, 1, null, { grav: 0.06, frame: 0 });
      }
      if (this.st >= 130) this.setState('idle');
      return;
    }
    this.y = 66 + Math.sin(this.t * 0.02) * 4;
    const ph = this.phase;
    const p = w.player;
    // tentacle mouths
    for (const tn of this.tents) {
      if (tn.dead) continue;
      tn.lash = lerp(tn.lash, this.state === 'lash' ? 1 : 0, 0.06);
      if (--tn.cool <= 0 && this.state !== 'lash') {
        tn.cool = Math.round((ph === 2 ? 70 : 100) * w.diff.fire) + Math.floor(frand(0, 30));
        const tip = tn.pts[tn.pts.length - 1];
        const a = Math.atan2(p.y - tip[1], p.x - tip[0]);
        w.bullets.fan(tip[0], tip[1], a, ph === 2 ? 3 : 2, 0.25, 2, 'orb');
        tn.spit = 10;
      }
      if (tn.spit > 0) tn.spit--;
    }
    switch (this.state) {
      case 'idle':
        this.open = lerp(this.open, 0, 0.1);
        if (this.st % (ph === 2 ? 90 : 140) === 60) this.spawnLarvae(ph === 2 ? 4 : 3);
        if (this.st > (ph === 2 ? 140 : 190)) this.setState('open');
        break;
      case 'open': {
        this.open = lerp(this.open, 1, 0.06);
        if (this.st === 10) w.sfx('coreOpen');
        const h = this.heart();
        if (this.st > 30 && this.st % (ph === 2 ? 36 : 50) === 0) {
          w.bullets.ring(h.x, h.y, ph === 2 ? 12 : 9, 1.5, 'spore', this.st * 0.05, { home: 0.012, homeT: 80 });
          w.sfx('squish');
        }
        if (this.st > 180) {
          this.cyc++;
          this.setState(this.tents.some((tn) => !tn.dead) ? 'lash' : 'idle');
        }
        break;
      }
      case 'lash':
        this.open = lerp(this.open, 0, 0.12);
        if (this.st === 5) w.sfx('bossRoar');
        if (this.st > 110) this.setState('idle');
        break;
      default:
        break;
    }
  }

  spawnLarvae(n) {
    const w = this.w;
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? 1 : -1;
      w.after(1 + i * 8, () => {
        if (this.dying) return;
        w.spawn('larva', this.x + s * 50, this.y + 30, { a: Math.PI + s * 0.8, sp: 1.6 });
      });
    }
    w.sfx('squish');
  }

  onDying() {
    this.open = 1;
  }

  draw(r) {
    if (this.hidden) return;
    const t = this.t;
    // tentacles behind the body
    for (const tn of this.tents) {
      if (tn.dead || !tn.pts.length) continue;
      const pts = tn.pts;
      for (let i = 1; i < pts.length - 1; i++) r.spr('brood_seg', pts[i][0], pts[i][1], 0, 0, 1.15 - i * 0.04, 1.15 - i * 0.04);
      const tip = pts[pts.length - 1];
      r.spr('brood_mouth', tip[0], tip[1], tn.spit > 0 ? 1 : 0);
      if (tn.flash > 0) r.sprWhite('brood_mouth', tip[0], tip[1], 0, 0, 1, 1, 0.7);
      if (tn.lash > 0.5) r.glow(tip[0], tip[1], 12, '#ff7ab8', 0.4);
    }
    r.spr('brood_body', this.x, this.y);
    // heart
    const h = this.heart();
    const beat = (t % 40) < 6 ? 1 : (t % 40) < 12 ? 2 : 0;
    r.glow(h.x, h.y, 26 + this.open * 14, '#ff4a7a', 0.25 + this.open * 0.45);
    r.spr('brood_heart', h.x, h.y, beat);
    if (this.flashT > 0 && this.open > 0.6) r.glow(h.x, h.y, 20, '#ffffff', 0.5);
    // rib cage
    for (let i = 0; i < RIBS; i++) {
      const k = i - (RIBS - 1) / 2;
      const px = h.x + k * 7.5;
      const py = h.y - 22;
      const side = k < 0 ? -1 : 1;
      const ang = side * (0.08 + Math.abs(k) * 0.07) + side * this.open * (0.55 + Math.abs(k) * 0.28);
      r.spr('brood_rib', px, py, 0, r.arcade ? Math.round(ang / 0.2) * 0.2 : ang);
    }
  }
}
register('brood', Broodmother);
void PH;
void W;
void clamp;
