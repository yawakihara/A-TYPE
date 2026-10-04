/**
 * COIL WYRM — stage 5 boss. A serpent of bone and sinew whose body follows its head across
 * the whole screen. The mouth is vulnerable while the jaw hangs open; gland nodes along the
 * body can be burst for heavy damage. Patterns: figure-eight, edge dives, tightening coil.
 */
import { PH, W } from '../../config.js';
import { register } from '../enemy.js';
import { Boss } from './boss.js';
import { clamp, TAU, lerp, turnToward } from '../../core/math.js';
import { frand } from '../../core/rng.js';
import { P } from '../../gfx/particles.js';

const SEGS = 16;
const GAP = 17;

class CoilWyrm extends Boss {
  constructor(w, x, y, opt) {
    super(w, x, y, { ...opt, title: 'COIL WYRM' });
    this.setHp(820);
    this.score = 90000;
    this.organic = true;
    this.x = w.camX + W + 60;
    this.y = PH + 40;
    this.a = Math.PI * 1.2;
    this.trail = [];
    for (let i = 0; i < SEGS * GAP + 10; i++) this.trail.push([this.x + i * 0.5, this.y + i * 0.6]);
    this.jaw = 0;
    this.nodes = [4, 8, 12].map((i) => ({ i, hp: 26 * w.diff.hp, dead: false, flash: 0 }));
    this.pattern = 'eight';
    this.pt = 0;
    this.dieLen = 260;
    this.cool = 90;
  }

  get phase() {
    const k = this.hp / this.maxHp;
    return k > 0.6 ? 1 : k > 0.3 ? 2 : 3;
  }

  seg(i) {
    return this.trail[Math.min(this.trail.length - 1, i * GAP)];
  }

  hitboxes() {
    const b = [];
    const ha = this.a;
    // mouth (only while the jaw is open)
    if (this.jaw > 0.6) b.push({ x: this.x + Math.cos(ha) * 22, y: this.y + Math.sin(ha) * 22 + 4, hw: 11, hh: 9, type: 'weak', mul: 1 });
    for (const n of this.nodes) {
      if (n.dead) continue;
      const s = this.seg(n.i);
      b.push({ x: s[0], y: s[1] + 8, hw: 7, hh: 7, type: 'body', part: n });
    }
    b.push({ x: this.x, y: this.y, hw: 26, hh: 18, type: 'armor' });
    for (let i = 1; i <= SEGS; i++) {
      const s = this.seg(i);
      b.push({ x: s[0], y: s[1], hw: 15, hh: 15, type: 'armor' });
    }
    return b;
  }

  blastArea() {
    return { x: this.w.camX + W / 2, y: PH / 2, w: W - 40, h: PH - 40 };
  }

  onPartHit(n) {
    n.flash = 4;
  }

  onPartDestroyed(n) {
    const w = this.w;
    const s = this.seg(n.i);
    w.fx.explosion(s[0], s[1], 1.6, { organic: true });
    w.addScore(4000, s[0], s[1]);
    this.hp -= 80 * w.diff.hp;
    this.flashT = 6;
    w.sfx('explodeL');
    w.r.shake(0.35);
    if (this.hp <= 0) this.kill('pod');
  }

  /** Steering target for the current movement pattern. */
  target() {
    const w = this.w;
    const cx = w.camX + W / 2 + 20;
    const cy = PH / 2;
    const t = this.pt;
    switch (this.pattern) {
      case 'eight':
        return { x: cx + Math.cos(t * 0.012) * 130, y: cy + Math.sin(t * 0.024) * 70 };
      case 'dive': {
        // sweep from edge to edge
        const k = (t % 260) / 260;
        const side = Math.floor(t / 260) % 2 ? 1 : -1;
        return { x: cx - side * (200 - k * 400), y: cy + Math.sin(k * Math.PI * 2) * 80 };
      }
      case 'coil': {
        const r = 104 - Math.min(30, t * 0.05);
        return { x: cx + Math.cos(t * 0.02) * r * 1.5, y: cy + Math.sin(t * 0.02) * r * 0.8 };
      }
      default:
        return { x: cx, y: cy };
    }
  }

  act() {
    const w = this.w;
    const p = w.player;
    const ph = this.phase;
    this.pt++;
    const T = this.target();
    const speed = this.state === 'enter' ? 2.4 : ph === 3 ? 2.7 : ph === 2 ? 2.4 : 2.1;
    const turn = this.pattern === 'dive' ? 0.07 : 0.05;
    this.a = turnToward(this.a, Math.atan2(T.y - this.y, T.x - this.x), turn);
    this.x += Math.cos(this.a) * speed + w.dx;
    this.y += Math.sin(this.a) * speed;
    this.trail.unshift([this.x, this.y]);
    this.trail.length = Math.min(this.trail.length, SEGS * GAP + 10);
    for (const s of this.trail) s[0] += 0; // trail lives in world space; the camera is stopped
    for (const n of this.nodes) if (n.flash > 0) n.flash--;
    if (this.state === 'enter') {
      if (this.st === 2) w.sfx('bossRoar');
      if (this.st % 20 === 0) w.r.shake(0.15);
      if (this.st > 150) this.setState('fight');
      return;
    }
    // pattern schedule
    if (this.pt > (this.pattern === 'eight' ? 700 : 520)) {
      this.pattern = ph === 1 ? (this.pattern === 'eight' ? 'dive' : 'eight') : ['eight', 'dive', 'coil'][Math.floor(frand(0, 3))];
      this.pt = 0;
    }
    // jaw opens to breathe fire
    if (--this.cool <= 0 && this.state === 'fight') {
      this.setState('breath');
      this.cool = Math.round((ph === 3 ? 120 : 170) * w.diff.fire);
    }
    if (this.state === 'breath') {
      this.jaw = lerp(this.jaw, 1, 0.12);
      const mx = this.x + Math.cos(this.a) * 26;
      const my = this.y + Math.sin(this.a) * 26 + 4;
      if (this.st > 20 && this.st < 80 && this.st % (ph >= 2 ? 8 : 12) === 0) {
        const aim = Math.atan2(p.y - my, p.x - mx);
        w.bullets.fan(mx, my, aim, ph === 3 ? 5 : 3, 0.22, 2, 'big');
        w.fx.add(P.FIRE, mx, my, Math.cos(aim) * 1.5, Math.sin(aim) * 1.5, 18, 0.5, null);
      }
      if (this.st > 110) this.setState('fight');
    } else {
      this.jaw = lerp(this.jaw, 0, 0.1);
    }
    // body glands weep spores in later phases
    if (ph >= 2 && this.t % 70 === 0) {
      for (const n of this.nodes) {
        if (n.dead) continue;
        const s = this.seg(n.i);
        w.bullets.aim(s[0], s[1] + 8, 1.4, 'spore', 0, { home: 0.015, homeT: 70 });
      }
    }
  }

  onDying() {
    const w = this.w;
    for (let i = SEGS; i >= 1; i--) {
      w.after(1 + (SEGS - i) * 8, () => {
        const s = this.seg(i);
        w.fx.explosion(s[0], s[1], 1.4, { organic: true });
        w.sfx('explodeM');
      });
    }
  }

  draw(r) {
    if (this.hidden) return;
    // body from tail to head
    for (let i = SEGS; i >= 1; i--) {
      const s = this.seg(i);
      const node = this.nodes.find((n) => n.i === i && !n.dead);
      const sc = 1 - i * 0.022;
      r.spr('wyrm_seg', s[0], s[1], node ? 1 : 0, 0, sc, sc);
      if (node && node.flash > 0) r.glow(s[0], s[1] + 8, 10, '#ffffff', 0.6);
    }
    // head: rotate so the snout leads (sprite faces left)
    let a = this.a + Math.PI;
    const flip = Math.cos(this.a) > 0;
    if (r.arcade) a = Math.round(a / (Math.PI / 8)) * (Math.PI / 8);
    const sy = flip ? -1 : 1;
    const ctx = r.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(a);
    ctx.scale(1, sy);
    if (this.jaw > 0.05) {
      r.spr('wyrm_mouth', -14, 6 + this.jaw * 6, 0);
      if (this.flashT > 0 && this.jaw > 0.6) r.glow(-14, 8, 14, '#ffffff', 0.6);
    }
    r.spr('wyrm_jaw', 0, 10, 0, this.jaw * 0.45);
    r.spr('wyrm_head', 0, 0, 0);
    ctx.restore();
    if (this.state === 'breath' && this.st < 20) r.glow(this.x + Math.cos(this.a) * 26, this.y + Math.sin(this.a) * 26, 12 + this.st, '#ff8a3a', 0.6);
  }
}
register('wyrm', CoilWyrm);
void clamp;
void TAU;
