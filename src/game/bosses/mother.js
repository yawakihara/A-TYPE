/**
 * BLOOM MOTHER — final boss. A colossal flower rooted in the heart wall. Six chitin petals
 * guard a seed-heart that rejects all energy weapons: only AEGIS can wound it. Launch the pod
 * into the open core and it lodges there, grinding, until the petals snap shut and spit it out.
 * Crystal carriers keep arriving while the player has no pod.
 */
import { PH, W } from '../../config.js';
import { register } from '../enemy.js';
import { Boss } from './boss.js';
import { clamp, TAU, lerp, smooth } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { ITEM } from '../items.js';
import { P } from '../../gfx/particles.js';

const CLOSED = [-0.34, -0.2, -0.07, 0.07, 0.2, 0.34];
const OPEN = [-1.5, -1.08, -0.66, 0.66, 1.08, 1.5];

class BloomMother extends Boss {
  constructor(w, x, y, opt) {
    super(w, x, y, { ...opt, title: 'BLOOM MOTHER' });
    this.setHp(1150);
    this.score = 200000;
    this.organic = true;
    this.x = w.camX + W + 140;
    this.y = PH / 2;
    this.open = 0;
    this.petals = CLOSED.map((a, i) => ({ i, eyeHp: 30 * w.diff.hp, eyeDead: false, flash: 0, cool: 60 + i * 23 }));
    this.dieLen = 320;
    this.carrierT = 0;
    this.cycle = 0;
  }

  get phase() {
    const k = this.hp / this.maxHp;
    return k > 0.6 ? 1 : k > 0.25 ? 2 : 3;
  }

  petalAngle(i) {
    return Math.PI + lerp(CLOSED[i], OPEN[i], smooth(clamp(this.open, 0, 1))) + Math.sin(this.t * 0.03 + i) * 0.02;
  }

  petalPoint(i, d) {
    const a = this.petalAngle(i);
    return { x: this.x + Math.cos(a) * (16 + d), y: this.y + Math.sin(a) * (16 + d) };
  }

  eyePos(i) {
    const a = this.petalAngle(i);
    const ex = 16 + 44;
    return { x: this.x + Math.cos(a) * ex + Math.cos(a - Math.PI / 2) * 4, y: this.y + Math.sin(a) * ex + Math.sin(a - Math.PI / 2) * 4 };
  }

  lodgePoint() {
    return { x: this.x - 4, y: this.y };
  }

  hitboxes() {
    const b = [];
    // the seed-heart: only AEGIS can hurt it; the pod lodges on impact
    if (this.open > 0.6) b.push({ x: this.x - 4, y: this.y, hw: 17, hh: 17, type: 'weak', mul: 3, podOnly: true, lodge: true });
    else b.push({ x: this.x - 6, y: this.y, hw: 22, hh: 22, type: 'shield' });
    this.petals.forEach((pt, i) => {
      if (!pt.eyeDead) {
        const e = this.eyePos(i);
        b.push({ x: e.x, y: e.y, hw: 6, hh: 6, type: 'body', ref: pt });
      }
      for (let d = 18; d <= 96; d += 16) {
        const q = this.petalPoint(i, d);
        b.push({ x: q.x, y: q.y, hw: 8, hh: 8, type: 'armor', noPod: true });
      }
    });
    b.push({ x: this.x + 90, y: this.y, hw: 70, hh: 120, type: 'armor', noShot: true, noPod: true });
    return b;
  }

  /** Eye parts are proxied so the base damage code can track their hp. */
  damage(amount, src, box) {
    if (box && box.ref) {
      const pt = box.ref;
      if (pt.eyeDead || this.dying) return 'none';
      pt.eyeHp -= amount;
      pt.flash = 4;
      if (pt.eyeHp <= 0) {
        pt.eyeDead = true;
        const e = this.eyePos(pt.i);
        this.w.fx.explosion(e.x, e.y, 1.2, { organic: true });
        this.w.addScore(5000, e.x, e.y);
        this.w.sfx('explodeL');
        return 'kill';
      }
      return 'hit';
    }
    return super.damage(amount, src, box);
  }

  pushSolids(list) {
    list.push({ x: this.x + 100, y: this.y, hw: 60, hh: 120, owner: this });
  }

  blastArea() {
    return { x: this.x, y: this.y, w: 200, h: 200 };
  }

  act() {
    const w = this.w;
    const p = w.player;
    const ph = this.phase;
    if (this.state === 'enter') {
      const tx = w.camX + 300;
      this.x = lerp(this.x, tx, 0.018);
      if (this.st === 2) {
        w.sfx('bossRoar');
        w.r.doFlash(0.3, [1, 0.4, 0.5]);
      }
      if (this.st % 18 === 0) w.r.shake(0.15);
      if (Math.abs(this.x - tx) < 1.5) this.setState('closed');
      return;
    }
    this.x = w.camX + 300;
    this.y = PH / 2 + Math.sin(this.t * 0.012) * 8;
    // keep the player armed: AEGIS is the only key to the seed-heart
    if (!w.pod && ++this.carrierT > 420) {
      this.carrierT = 0;
      w.spawn('carrier', w.camX - 20, frand(50, PH - 50), { fly: true, drop: ITEM.CRYSTAL, walk: -1.4 });
      w.popText(w.camX + 60, 40, 'AEGIS INBOUND', '#bff8ff', 90);
    }
    // petal eyes
    for (const pt of this.petals) {
      if (pt.flash > 0) pt.flash--;
      if (pt.eyeDead) continue;
      if (--pt.cool <= 0) {
        pt.cool = Math.round((ph === 3 ? 70 : ph === 2 ? 95 : 120) * w.diff.fire) + Math.floor(frand(0, 30));
        const e = this.eyePos(pt.i);
        w.bullets.aim(e.x, e.y, 2.1, ph >= 2 ? 'orbA' : 'orb');
        if (ph === 3) w.bullets.aim(e.x, e.y, 1.6, 'orb', 0.25);
      }
    }
    switch (this.state) {
      case 'closed':
        this.open = lerp(this.open, 0, 0.1);
        if (this.st % 90 === 45) {
          // spore volleys from between the petals
          w.bullets.fan(this.x - 30, this.y, Math.PI, ph >= 2 ? 7 : 5, 0.22, 1.5, 'spore', { home: 0.008, homeT: 60 });
        }
        if (ph >= 2 && this.st % 150 === 100) w.spawn('cell', this.x - 40, this.y + frand(-40, 40), { gen: 0, vx: -1 });
        if (this.st > (ph === 3 ? 170 : 230)) {
          this.setState('opening');
          w.sfx('coreOpen');
        }
        break;
      case 'opening':
        this.open = smooth(Math.min(1, this.st / 60));
        if (this.st >= 60) this.setState('open');
        break;
      case 'open':
        this.open = 1;
        if (ph >= 2 && this.st % 70 === 20) {
          for (let k = 0; k < (ph === 3 ? 3 : 2); k++) w.spawn('seedbomb', this.x - 20, this.y, { a: Math.PI + (k - (ph === 3 ? 1 : 0.5)) * 0.7 });
        }
        if (ph === 3 && this.st % 6 === 0) {
          const a = this.st * 0.09;
          w.bullets.spawn(this.x - 10, this.y, Math.cos(a) * 1.6, Math.sin(a) * 1.6, 'orb');
          w.bullets.spawn(this.x - 10, this.y, Math.cos(a + Math.PI) * 1.6, Math.sin(a + Math.PI) * 1.6, 'orb');
        }
        if (this.st > 260) {
          this.setState('closing');
          w.sfx('crush');
        }
        break;
      case 'closing':
        this.open = 1 - smooth(Math.min(1, this.st / 36));
        if (this.st === 24 && w.pod && w.pod.state === 'lodged') {
          w.pod.eject();
          w.r.shake(0.3);
        }
        if (this.st >= 36) {
          this.cycle++;
          this.setState('closed');
        }
        break;
      default:
        break;
    }
    if (this.open > 0.6 && this.t % 3 === 0) w.fx.add(P.GLOW, this.x - 4 + frand(-14, 14), this.y + frand(-14, 14), 0, 0, 14, 4, '#ffd0a0');
  }

  onDying() {
    const w = this.w;
    if (w.pod && w.pod.state === 'lodged') w.pod.eject();
    this.open = 1;
    w.game.music(null, 2);
  }

  onFinalBlast() {
    const w = this.w;
    w.r.doFlash(1, [1, 1, 1]);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      w.fx.add(P.GIB, this.x, this.y, Math.cos(a) * frand(2, 5), Math.sin(a) * frand(2, 5), 120, 1, null, { grav: 0.04, frame: i % 3 });
    }
  }

  draw(r) {
    if (this.hidden) return;
    const w = this.w;
    r.spr('mother_root', this.x + 40, this.y);
    // core glows brighter as it opens
    r.glow(this.x - 4, this.y, 40 + this.open * 30, '#ff5a70', 0.25 + this.open * 0.35);
    r.spr('mother_core', this.x - 4, this.y, (this.t >> 3) % 3);
    if (this.flashT > 0) r.glow(this.x - 4, this.y, 28, '#ffffff', 0.6);
    // petals: back row first so the bud overlaps nicely
    const order = [0, 5, 1, 4, 2, 3];
    for (const i of order) {
      const a = this.petalAngle(i);
      const ra = r.arcade ? Math.round(a / (Math.PI / 16)) * (Math.PI / 16) : a;
      const base = { x: this.x + Math.cos(a) * 16, y: this.y + Math.sin(a) * 16 };
      r.spr('mother_petal', base.x, base.y, 0, ra, 1, i < 3 ? -1 : 1);
      const pt = this.petals[i];
      if (!pt.eyeDead) {
        const e = this.eyePos(i);
        r.spr('mother_eye', e.x, e.y, pt.cool < 20 ? 1 : 0);
        if (pt.flash > 0) r.glow(e.x, e.y, 8, '#ffffff', 0.7);
      }
    }
    if (this.open > 0.6 && w.pod && w.pod.state !== 'lodged' && this.t % 40 < 26) {
      w.textAt('LAUNCH AEGIS!', this.x - 40, this.y - 64, '#bff8ff');
    }
  }
}
register('mother', BloomMother);
