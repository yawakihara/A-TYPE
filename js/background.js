import { W, PLAY_H } from './config.js';
import { make } from './gfx.js';
import { hash2, makeRng } from './util.js';

/** 背景の配色定義。 */
const KINDS = {
  space: {
    sky: ['#04040f', '#070722', '#0b0b33', '#14104a', '#1d1560'],
    far: '#10123a', near: '#181c52', star: ['#6a78c8', '#a8b8ff', '#ffffff'],
  },
  flesh: {
    sky: ['#14040f', '#220618', '#340a24', '#4a1030', '#5e1a3a'],
    far: '#3a0e2a', near: '#52163a', star: ['#a05088', '#d878b0', '#ffc0e0'],
  },
  metal: {
    sky: ['#05080f', '#0a1020', '#101a32', '#18264a', '#223460'],
    far: '#121c34', near: '#1a2846', star: ['#5a78b0', '#90b0e8', '#d8e8ff'],
  },
};

/**
 * 空のグラデーションを段階的(バンディング)に描く。
 * @param {string[]} cols 上から下への色配列
 * @returns {HTMLCanvasElement} 背景画像
 */
function makeSky(cols) {
  const c = make(W, PLAY_H);
  const g = c.getContext('2d');
  const bands = cols.length;
  for (let b = 0; b < bands; b++) {
    g.fillStyle = cols[b];
    g.fillRect(0, Math.floor((b * PLAY_H) / bands), W, Math.ceil(PLAY_H / bands) + 1);
    // 帯の境界を市松ディザでなじませる
    if (b > 0) {
      const y0 = Math.floor((b * PLAY_H) / bands);
      g.fillStyle = cols[b - 1];
      for (let y = 0; y < 6; y++) for (let x = (y & 1); x < W; x += 2) if (y < 4) g.fillRect(x, y0 + y, 1, 1);
    }
  }
  return c;
}

/**
 * 横方向に繰り返せるシルエット帯を作る。
 * @param {'towers'|'pillars'|'city'} style 形状
 * @param {number} w 幅(繰り返し単位)
 * @param {number} h 高さ
 * @param {string} color 塗り色
 * @param {number} seed 乱数シード
 * @returns {HTMLCanvasElement} シルエット画像
 */
function makeStrip(style, w, h, color, seed) {
  const rng = makeRng(seed);
  const c = make(w, h);
  const g = c.getContext('2d');
  g.fillStyle = color;
  let x = 0;
  if (style === 'pillars') {
    while (x < w) {
      const pw = 14 + Math.floor(rng() * 22);
      const ph = 30 + Math.floor(rng() * (h - 40));
      // 柱: 上下に太くなる有機的な形
      for (let yy = 0; yy < ph; yy++) {
        const t = yy / ph;
        const wob = Math.round(Math.sin(yy * 0.35 + x) * 2);
        const half = Math.round((pw / 2) * (0.55 + 0.45 * Math.pow(Math.abs(t - 0.5) * 2, 2))) + wob;
        g.fillRect(x + pw / 2 - half, h - ph + yy, half * 2, 1);
      }
      x += pw + 4 + Math.floor(rng() * 26);
    }
  } else if (style === 'towers') {
    while (x < w) {
      const bw = 10 + Math.floor(rng() * 24);
      const bh = 24 + Math.floor(rng() * (h - 30));
      g.fillRect(x, h - bh, bw, bh);
      if (rng() < 0.5) g.fillRect(x + 2, h - bh - 8, 3, 8);
      if (rng() < 0.3) g.fillRect(x + bw - 6, h - bh - 14, 2, 14);
      x += bw + Math.floor(rng() * 6);
    }
  } else {
    // city: 高低差のある建物群
    while (x < w) {
      const bw = 12 + Math.floor(rng() * 26);
      const bh = 20 + Math.floor(rng() * (h - 24));
      g.fillRect(x, h - bh, bw, bh);
      g.fillRect(x + 3, h - bh - 4, bw - 6, 4);
      x += bw + Math.floor(rng() * 4);
    }
  }
  return c;
}

/**
 * ガス惑星を描いたスプライトを作る。
 * @param {number} d 直径
 * @param {string[]} bands 帯の色(暗→明)
 * @param {number} seed シード
 * @returns {HTMLCanvasElement} 惑星画像
 */
function makePlanet(d, bands, seed) {
  const c = make(d + 40, d + 40);
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  const R = d / 2;
  const cx = c.width / 2;
  const cy = c.height / 2;
  const rgb = bands.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const dx = (x - cx) / R;
      const dy = (y - cy) / R;
      const r2 = dx * dx + dy * dy;
      if (r2 > 1) continue;
      const dz = Math.sqrt(1 - r2);
      const light = Math.max(0, (dx * -0.55 + dy * -0.35 + dz * 0.75));
      const band = Math.sin(dy * 9 + Math.sin(dx * 3 + seed) * 0.6 + hash2(Math.floor(y / 3), 0, seed) * 0.8) * 0.5 + 0.5;
      const idx = Math.min(rgb.length - 1, Math.floor((band * 0.55 + light * 0.6) * rgb.length * 0.9));
      const i = (y * c.width + x) * 4;
      const sh = 0.35 + 0.65 * Math.pow(light, 0.7);
      img.data[i] = rgb[idx][0] * sh; img.data[i + 1] = rgb[idx][1] * sh; img.data[i + 2] = rgb[idx][2] * sh; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // リング(惑星の手前側と奥側)
  g.strokeStyle = '#a08a6a'; g.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.ellipse(cx, cy, R * (1.25 + k * 0.07), R * (0.28 + k * 0.02), -0.25, Math.PI, Math.PI * 2);
    g.globalAlpha = 0.5 - k * 0.08;
    g.stroke();
  }
  g.globalAlpha = 1;
  return c;
}

/**
 * 視差スクロール背景。ステージごとに種類を指定する。
 */
export class Background {
  /**
   * @param {'space'|'flesh'|'metal'} kind 背景の種類
   * @param {number} seed 乱数シード
   */
  constructor(kind, seed = 1) {
    this.kind = kind;
    const def = KINDS[kind];
    this.def = def;
    this.sky = makeSky(def.sky);
    const rng = makeRng(seed);
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({ x: rng() * W, y: rng() * PLAY_H, layer: rng() < 0.5 ? 0 : rng() < 0.6 ? 1 : 2, tw: rng() * 6 });
    }
    if (kind === 'space') {
      this.planet = makePlanet(110, ['#2a1a40', '#4a2a68', '#7a4a90', '#b07ab0', '#e0b0c8', '#ffe0e0'], seed);
      this.far = makeStrip('towers', 512, 90, def.far, seed + 1);
      this.near = makeStrip('towers', 512, 56, def.near, seed + 2);
    } else if (kind === 'flesh') {
      this.far = makeStrip('pillars', 512, 150, def.far, seed + 1);
      this.near = makeStrip('pillars', 512, 100, def.near, seed + 2);
      this.spores = Array.from({ length: 36 }, () => ({ x: rng() * W, y: rng() * PLAY_H, s: 0.2 + rng() * 0.6, p: rng() * 6, r: rng() < 0.3 ? 2 : 1 }));
    } else {
      this.far = makeStrip('city', 512, 150, def.far, seed + 1);
      this.near = makeStrip('city', 512, 90, def.near, seed + 2);
    }
  }

  /**
   * 横繰り返しの画像を描く。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {HTMLCanvasElement} img 繰り返し画像
   * @param {number} off 横オフセット
   * @param {number} y 描画Y
   * @returns {void}
   */
  _tile(ctx, img, off, y) {
    const w = img.width;
    let x = -(((off % w) + w) % w);
    for (; x < W; x += w) ctx.drawImage(img, Math.round(x), y);
  }

  /**
   * 背景を描画する。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {number} scrollX 現在のスクロール量(px)
   * @param {number} t 経過フレーム
   * @returns {void}
   */
  draw(ctx, scrollX, t) {
    ctx.drawImage(this.sky, 0, 0);
    const cols = this.def.star;
    for (const s of this.stars) {
      const sp = [0.08, 0.2, 0.45][s.layer];
      const x = (((s.x - scrollX * sp) % W) + W) % W;
      const tw = (Math.sin(t * 0.05 + s.tw) + 1) * 0.5;
      ctx.fillStyle = cols[s.layer];
      ctx.globalAlpha = s.layer === 0 ? 0.5 + tw * 0.4 : 0.8;
      ctx.fillRect(Math.floor(x), Math.floor(s.y), s.layer === 2 ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1;
    if (this.kind === 'space') {
      const px = (((260 - scrollX * 0.04) % (W + 260)) + (W + 260)) % (W + 260) - 130;
      ctx.drawImage(this.planet, Math.round(px - 75), 30);
    }
    this._tile(ctx, this.far, scrollX * 0.18, PLAY_H - this.far.height);
    this._tile(ctx, this.near, scrollX * 0.38, PLAY_H - this.near.height);
    if (this.kind === 'flesh') {
      for (const sp of this.spores) {
        const x = (((sp.x - scrollX * 0.6 * sp.s - t * 0.15 * sp.s) % W) + W) % W;
        const y = (sp.y + Math.sin(t * 0.03 + sp.p) * 6 + PLAY_H) % PLAY_H;
        ctx.fillStyle = sp.r > 1 ? '#f090b8' : '#b05088';
        ctx.fillRect(Math.floor(x), Math.floor(y), sp.r, sp.r);
      }
    } else if (this.kind === 'metal') {
      // 遠景の灯り
      for (let i = 0; i < 24; i++) {
        const x = (((i * 71 + 20 - scrollX * 0.25) % 512) + 512) % 512;
        if (x > W) continue;
        const on = Math.sin(t * 0.04 + i * 1.7) > 0.2;
        ctx.fillStyle = on ? '#ffd870' : '#5a4a20';
        ctx.fillRect(Math.floor(x), PLAY_H - 40 - ((i * 37) % 90), 2, 2);
      }
    }
  }
}
