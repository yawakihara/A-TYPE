import { SPR } from './sprites.js';
import { drawText } from './font.js';

/**
 * 爆発アニメーション。scroll=true なら地形と共に左へ流れる。
 */
export class Explosion {
  /**
   * @param {number} x 中心X
   * @param {number} y 中心Y
   * @param {'tiny'|'small'|'big'|'huge'} size 大きさ
   * @param {{delay?:number, scroll?:boolean, speed?:number}} [opt] 開始遅延・地形追従・再生速度
   */
  constructor(x, y, size, opt = {}) {
    this.x = x;
    this.y = y;
    this.frames = SPR[`exp${size[0].toUpperCase()}${size.slice(1)}`];
    this.t = -(opt.delay || 0);
    this.scroll = !!opt.scroll;
    this.speed = opt.speed || (size === 'tiny' ? 0.5 : size === 'small' ? 0.45 : 0.4);
    this.dead = false;
  }

  /**
   * 1フレーム進める。
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  update(g) {
    this.t += 1;
    if (this.scroll) this.x -= g.scrollSpeed;
    if (this.t * this.speed >= this.frames.length) this.dead = true;
  }

  /**
   * 描画する。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  draw(ctx) {
    if (this.t < 0) return;
    const f = this.frames[Math.min(this.frames.length - 1, Math.floor(this.t * this.speed))];
    ctx.drawImage(f, Math.round(this.x - f.width / 2), Math.round(this.y - f.height / 2));
  }
}

/**
 * 火花・破片などの粒子。
 */
export class Particle {
  /**
   * @param {number} x 初期X
   * @param {number} y 初期Y
   * @param {number} vx X速度
   * @param {number} vy Y速度
   * @param {number} life 寿命(フレーム)
   * @param {string} color 色
   * @param {number} [size=1] 大きさ(px)
   * @param {number} [grav=0] 重力
   */
  constructor(x, y, vx, vy, life, color, size = 1, grav = 0) {
    Object.assign(this, { x, y, vx, vy, life, max: life, color, size, grav, dead: false });
  }

  /**
   * 1フレーム進める。
   * @param {object} g ゲーム状態
   * @returns {void}
   */
  update(g) {
    this.x += this.vx - (this.scroll ? g.scrollSpeed : 0);
    this.y += this.vy;
    this.vy += this.grav;
    if (--this.life <= 0) this.dead = true;
  }

  /**
   * 描画する。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  draw(ctx) {
    ctx.fillStyle = this.color;
    if (this.life < this.max * 0.25 && (this.life & 1)) return;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
  }
}

/**
 * 広がるリング(衝撃波)。
 */
export class Ring {
  /**
   * @param {number} x 中心X
   * @param {number} y 中心Y
   * @param {number} maxR 最大半径
   * @param {string} color 色
   * @param {number} [life=24] 寿命(フレーム)
   */
  constructor(x, y, maxR, color, life = 24) {
    Object.assign(this, { x, y, maxR, color, life, max: life, dead: false });
  }

  /**
   * 1フレーム進める。
   * @returns {void}
   */
  update() {
    if (--this.life <= 0) this.dead = true;
  }

  /**
   * 描画する(ドット円)。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  draw(ctx) {
    const p = 1 - this.life / this.max;
    const r = this.maxR * Math.sqrt(p);
    const n = Math.max(12, Math.floor(r * 2.2));
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 1 - p * 0.8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.fillRect(Math.round(this.x + Math.cos(a) * r), Math.round(this.y + Math.sin(a) * r), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * 得点ポップアップ。
 */
export class Popup {
  /**
   * @param {number} x X
   * @param {number} y Y
   * @param {string} text 表示文字
   * @param {string} [color='#ffffff'] 色
   */
  constructor(x, y, text, color = '#ffffff') {
    Object.assign(this, { x, y, text, color, life: 50, dead: false });
  }

  /**
   * 1フレーム進める。
   * @returns {void}
   */
  update() {
    this.y -= 0.35;
    this.x -= 0.3;
    if (--this.life <= 0) this.dead = true;
  }

  /**
   * 描画する。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @returns {void}
   */
  draw(ctx) {
    if (this.life < 12 && (this.life & 1)) return;
    drawText(ctx, this.text, this.x, this.y, this.color, { align: 'center', shadow: '#000' });
  }
}
