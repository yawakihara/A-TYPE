import { W, H } from '../config.js';
import { PostFX } from './postfx.js';
import { SpriteCache } from './sprites.js';
import { frand } from '../core/rng.js';

const QUALITY_CAP = { high: 6, medium: 4, low: 2.5 };

/**
 * Owns the scene buffer (2D canvas in logical units), the display (WebGL post or 2D fallback),
 * camera shake and the screen-space effect state that the post pass consumes.
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.post = null;
    try {
      this.post = new PostFX(canvas);
    } catch (e) {
      this.post = null;
      this.disp = canvas.getContext('2d');
    }
    this.buf = document.createElement('canvas');
    this.ctx = this.buf.getContext('2d', { alpha: false });
    this.mode = 'hd';
    this.quality = 'high';
    this.crtOpt = true; // CRT shader in arcade mode
    this.S = 1;
    this.sprites = new SpriteCache();
    this.camX = 0;
    this.camY = 0;
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.kickX = 0;
    this.kickY = 0;
    this.flash = 0;
    this.flashCol = [1, 1, 1];
    this.aberr = 0;
    this.bloomBoost = 0;
    this.waves = [];
    this.tint = [1, 1, 1];
    this.sat = 1;
    this.contrast = 1;
    this.time = 0;
    this.reduceFx = false;
    this.viewX = 0;
    this.viewY = 0;
    this.viewW = W;
    this.viewH = H;
    this.onRescale = null;
    this.resize();
  }

  get arcade() {
    return this.mode === 'arcade';
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.resize(true);
  }

  setQuality(q) {
    this.quality = q;
    this.resize(true);
  }

  resize(force = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'low' ? 1 : 2);
    const cw = Math.max(1, Math.round(window.innerWidth * dpr));
    const ch = Math.max(1, Math.round(window.innerHeight * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    const fit = Math.min(cw / W, ch / H);
    this.viewW = Math.round(W * fit);
    this.viewH = Math.round(H * fit);
    this.viewX = Math.round((cw - this.viewW) / 2);
    this.viewY = Math.round((ch - this.viewH) / 2);
    let S = 1;
    if (!this.arcade) {
      S = Math.min(fit, QUALITY_CAP[this.quality] || 4);
      S = Math.max(1, Math.round(S * 4) / 4);
    }
    if (force || S !== this.S || this.buf.width !== Math.round(W * S)) {
      this.S = S;
      this.buf.width = Math.round(W * S);
      this.buf.height = Math.round(H * S);
      this.ctx = this.buf.getContext('2d', { alpha: false });
      this.sprites.reset(S, this.arcade);
      if (this.onRescale) this.onRescale();
    }
  }

  /** Convert a CSS-pixel client point to logical coordinates. */
  clientToLogical(x, y) {
    const dpr = this.canvas.width / Math.max(1, window.innerWidth);
    return { x: ((x * dpr - this.viewX) / this.viewW) * W, y: ((y * dpr - this.viewY) / this.viewH) * H };
  }

  // ------------------------------------------------------------------ effects

  shake(amount) {
    if (this.reduceFx) amount *= 0.4;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  kick(dx, dy) {
    this.kickX += dx;
    this.kickY += dy;
  }

  doFlash(a, col = [1, 1, 1]) {
    if (this.reduceFx) a *= 0.35;
    if (a > this.flash) {
      this.flash = a;
      this.flashCol = col;
    }
  }

  aberration(a) {
    this.aberr = Math.max(this.aberr, a);
  }

  /** Shockwave at logical coords. */
  wave(x, y, strength = 1, speed = 1) {
    if (this.waves.length >= 4) this.waves.shift();
    this.waves.push({ x, y, t: 0, strength, speed });
  }

  tick() {
    this.time += 1 / 60;
    const t2 = this.trauma * this.trauma;
    const mag = 7 * t2;
    this.shakeX = (frand() * 2 - 1) * mag + this.kickX;
    this.shakeY = (frand() * 2 - 1) * mag + this.kickY;
    this.trauma = Math.max(0, this.trauma - 0.022);
    this.kickX *= 0.75;
    this.kickY *= 0.75;
    this.flash *= 0.82;
    if (this.flash < 0.01) this.flash = 0;
    this.aberr *= 0.9;
    this.bloomBoost *= 0.9;
    for (const w of this.waves) w.t += w.speed / 60;
    this.waves = this.waves.filter((w) => w.t < 0.9);
  }

  // ------------------------------------------------------------------ frame

  begin() {
    const ctx = this.ctx;
    ctx.setTransform(this.S, 0, 0, this.S, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = !this.arcade;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }

  /** Enter world space (camera + shake). Arcade mode snaps to whole pixels. */
  world(parallax = 1) {
    let x = -this.camX * parallax + this.shakeX;
    let y = -this.camY * parallax + this.shakeY;
    if (this.arcade) {
      x = Math.round(x);
      y = Math.round(y);
    }
    this.ctx.setTransform(this.S, 0, 0, this.S, x * this.S, y * this.S);
  }

  /** Screen space with shake (playfield overlays). */
  screenShake() {
    let x = this.shakeX;
    let y = this.shakeY;
    if (this.arcade) {
      x = Math.round(x);
      y = Math.round(y);
    }
    this.ctx.setTransform(this.S, 0, 0, this.S, x * this.S, y * this.S);
  }

  /** Plain screen space (HUD, menus). */
  screen() {
    this.ctx.setTransform(this.S, 0, 0, this.S, 0, 0);
  }

  present(opt = {}) {
    if (this.post) {
      const arcade = this.arcade;
      const waves = this.waves.map((w) => ({
        x: w.x / W,
        y: w.y / H,
        r: w.t * 0.55,
        s: this.reduceFx ? 0 : w.strength * Math.max(0, 1 - w.t / 0.9) * (arcade ? 0.5 : 1),
      }));
      this.post.render(this.buf, {
        viewX: this.viewX,
        viewY: this.viewY,
        viewW: this.viewW,
        viewH: this.viewH,
        gameW: W,
        gameH: H,
        arcade,
        crt: arcade && this.crtOpt ? 1 : 0,
        bloom: (arcade ? 0.35 : opt.bloom ?? 0.85) + this.bloomBoost,
        threshold: arcade ? 0.72 : 0.55,
        aberr: this.reduceFx ? 0 : this.aberr + (arcade ? 0.12 : 0),
        flash: this.flash,
        flashCol: this.flashCol,
        time: this.time,
        tint: this.tint,
        sat: this.sat,
        contrast: this.contrast,
        vignette: arcade ? 0.25 : 0.32,
        grain: arcade ? 0.012 : 0.018,
        ambient: opt.ambient ?? 0.38,
        waves,
      });
    } else {
      const d = this.disp;
      d.setTransform(1, 0, 0, 1, 0, 0);
      d.fillStyle = '#04050a';
      d.fillRect(0, 0, this.canvas.width, this.canvas.height);
      d.imageSmoothingEnabled = !this.arcade;
      d.drawImage(this.buf, this.viewX, this.viewY, this.viewW, this.viewH);
      if (this.flash > 0) {
        d.globalAlpha = this.flash;
        d.fillStyle = '#fff';
        d.fillRect(this.viewX, this.viewY, this.viewW, this.viewH);
        d.globalAlpha = 1;
      }
    }
  }

  // ------------------------------------------------------------------ draw helpers

  /**
   * Draw a cached sprite at (x, y) in the current space.
   * opt: { frame, rot, sx, sy, alpha, add, flip }
   */
  spr(name, x, y, frame = 0, rot = 0, sx = 1, sy = 1, alpha = 1, add = false) {
    const e = this.sprites.get(name, frame);
    const ctx = this.ctx;
    if (alpha !== 1) ctx.globalAlpha = alpha;
    if (add) ctx.globalCompositeOperation = 'lighter';
    if (this.arcade) {
      x = Math.round(x);
      y = Math.round(y);
    }
    if (rot === 0 && sx === 1 && sy === 1) {
      ctx.drawImage(e.c, x - e.ox, y - e.oy, e.dw, e.dh);
    } else {
      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
      ctx.drawImage(e.c, -e.ox, -e.oy, e.dw, e.dh);
      ctx.restore();
    }
    if (alpha !== 1) ctx.globalAlpha = 1;
    if (add) ctx.globalCompositeOperation = 'source-over';
  }

  /** White flash overlay of a sprite. */
  sprWhite(name, x, y, frame = 0, rot = 0, sx = 1, sy = 1, alpha = 0.8) {
    const e = this.sprites.getWhite(name, frame);
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    if (this.arcade) {
      x = Math.round(x);
      y = Math.round(y);
    }
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    ctx.drawImage(e.c, -e.ox, -e.oy, e.dw, e.dh);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** Additive radial glow. */
  glow(x, y, r, color, alpha = 1) {
    if (r <= 0 || alpha <= 0) return;
    const e = this.sprites.glow(color, r);
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha);
    if (this.arcade) {
      x = Math.round(x);
      y = Math.round(y);
      ctx.drawImage(e.c, x - r, y - r, r * 2, r * 2);
    } else {
      ctx.drawImage(e.c, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  rect(x, y, w, h, color, alpha = 1) {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
}
