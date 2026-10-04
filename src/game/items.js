/**
 * Power-up items dropped by carrier enemies.
 * Crystals cycle red -> blue -> yellow so the pickup colour can be timed.
 */
import { W } from '../config.js';
import { frand } from '../core/rng.js';

export const ITEM = {
  CRYSTAL: 'crystal',
  SPEED: 'speed',
  MISSILE: 'missile',
  BIT: 'bit',
  BONUS: 'bonus',
};

const CYCLE = ['red', 'blue', 'yellow'];
const FRAME = { red: 0, blue: 1, yellow: 2, speed: 3, missile: 4, bit: 5, bonus: 6 };
const LETTER = { speed: 'S', missile: 'M', bit: 'B', bonus: '★' };

export class Item {
  /**
   * @param {string} type ITEM.*
   * @param {string} [color] fixed crystal colour; omitted = cycling
   */
  constructor(w, x, y, type, color) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.type = type;
    this.fixed = color || null;
    this.cycle = Math.floor(frand(0, 3));
    this.t = 0;
    this.vx = -0.15;
    this.vy = -1.2;
    this.dead = false;
  }

  get color() {
    if (this.fixed) return this.fixed;
    return CYCLE[(this.cycle + Math.floor(this.t / 80)) % 3];
  }

  update() {
    const w = this.w;
    this.t++;
    this.vy *= 0.94;
    this.x += this.vx;
    this.y += this.vy + Math.sin(this.t * 0.06) * 0.15;
    if (this.y < 10) this.y = 10;
    if (this.y > 214) this.y = 214;
    if (this.x - w.camX < -20) this.dead = true;
    if (this.x - w.camX > W + 40) this.x = w.camX + W + 40;
    const p = w.player;
    if (p.alive && Math.abs(p.x - this.x) < 15 && Math.abs(p.y - this.y) < 11) {
      this.dead = true;
      w.collect(this);
    }
  }

  draw(r) {
    const f = this.type === ITEM.CRYSTAL ? FRAME[this.color] : FRAME[this.type];
    const bob = Math.sin(this.t * 0.12) * 0.8;
    const glowCol = ['#ff3d5a', '#3d9bff', '#ffcc2e', '#45e08a', '#ff8a3d', '#c08aff', '#ffffff'][f];
    r.glow(this.x, this.y + bob, 13 + Math.sin(this.t * 0.2) * 2, glowCol, 0.5);
    r.spr('item', this.x, this.y + bob, f);
    if (this.type !== ITEM.CRYSTAL) {
      this.w.textAt(LETTER[this.type], this.x, this.y + bob - 3.5, '#10131c');
    } else if (!this.fixed && (this.t / 80) % 1 > 0.85 && this.t % 4 < 2) {
      r.glow(this.x, this.y + bob, 10, '#ffffff', 0.5);
    }
  }
}
