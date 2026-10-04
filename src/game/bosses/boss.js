/**
 * Boss base: never culled, shows an HP bar, and dies through a staged explosion sequence
 * (bullets cancelled into score gems, chained blasts, final flash/shockwave) before the
 * stage-clear flow starts.
 */
import { Enemy } from '../enemy.js';
import { frand } from '../../core/rng.js';

export class Boss extends Enemy {
  constructor(w, x, y, opt) {
    super(w, x, y, opt);
    this.boss = true;
    this.cull = false;
    this.bar = true;
    this.title = opt.title || 'BOSS';
    this.state = 'enter';
    this.st = 0;
    this.dying = false;
    this.dieT = 0;
    this.dieLen = 200;
    this.revenge = false;
    this.size = 3;
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  update() {
    if (this.dying) {
      this.t++;
      this.dieT++;
      if (this.rel) this.x += this.w.dx;
      this.dieUpdate();
      return;
    }
    this.st++;
    super.update();
  }

  boxes() {
    return this.dying ? [] : this.hitboxes();
  }

  hitboxes() {
    return [{ x: this.x, y: this.y, hw: this.hw, hh: this.hh, type: 'body' }];
  }

  /** Points used to scatter death explosions. */
  blastArea() {
    return { x: this.x, y: this.y, w: this.hw * 2, h: this.hh * 2 };
  }

  kill() {
    if (this.dying) return;
    const w = this.w;
    this.dying = true;
    this.dieT = 0;
    this.hp = 0;
    w.bullets.cancel(true);
    w.sfx('bossRoar');
    w.r.shake(0.6);
    w.r.doFlash(0.5);
    w.slowmo = 30;
    w.chargeSound(0);
    this.onDying();
  }

  onDying() {}

  dieUpdate() {
    const w = this.w;
    const A = this.blastArea();
    if (this.dieT % 7 === 0 && this.dieT < this.dieLen - 40) {
      const x = A.x + frand(-A.w / 2, A.w / 2);
      const y = A.y + frand(-A.h / 2, A.h / 2);
      w.fx.explosion(x, y, frand(0.8, 1.8), { organic: this.organic });
      w.sfx(this.dieT % 21 === 0 ? 'explodeL' : 'explodeM');
      w.r.shake(0.15);
      w.rumble(0.5, 0.6, 120);
    }
    if (this.dieT === this.dieLen - 40) {
      w.fx.explosion(A.x, A.y, 4, { organic: this.organic });
      w.fx.ring(A.x, A.y, 120, '#ffffff', 40);
      w.r.wave(A.x - w.camX, A.y, 2.2, 0.8);
      w.r.doFlash(1);
      w.r.aberration(3);
      w.r.shake(1);
      w.rumble(1, 1, 700);
      w.sfx('bossExplode');
      this.hidden = true;
      this.onFinalBlast();
    }
    if (this.dieT >= this.dieLen) {
      this.dead = true;
      w.bossDefeated(this);
    }
  }

  onFinalBlast() {}
}
