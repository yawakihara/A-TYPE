import { COL_W, PLAY_H, W } from './config.js';
import { make, flipV } from './gfx.js';
import { hash2, makeRng } from './util.js';

/** 地形テーマごとの配色。 */
export const THEMES = {
  rock: { base: '#3d4c70', mid: '#2f3c5a', dark: '#222c47', light: '#5d70a0', spec: '#90a8d8', edge: '#b4c8f0', glow: '#4a6ab0' },
  flesh: { base: '#7c3050', mid: '#62243e', dark: '#451828', light: '#aa5270', spec: '#e08aa0', edge: '#ffb0c0', glow: '#c04870' },
  metal: { base: '#5a667c', mid: '#464f63', dark: '#2e3548', light: '#8c98b2', spec: '#c4d0ea', edge: '#e6eeff', glow: '#6890d0' },
};

/**
 * 8x8のタイル群を生成する。
 * @param {'rock'|'flesh'|'metal'} theme テーマ名
 * @returns {{fill: HTMLCanvasElement[], edgeT: HTMLCanvasElement, edgeB: HTMLCanvasElement}} タイルセット
 */
export function makeTiles(theme) {
  const p = THEMES[theme];
  const mk = (variant, edge) => {
    const c = make(COL_W, COL_W);
    const g = c.getContext('2d');
    g.fillStyle = p.base;
    g.fillRect(0, 0, 8, 8);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const r = hash2(x, y, variant * 31 + 5);
        if (theme === 'rock') {
          if (r < 0.1) g.fillStyle = p.mid; else if (r < 0.16) g.fillStyle = p.dark; else if (r < 0.2) g.fillStyle = p.light; else if (r > 0.985) g.fillStyle = p.spec; else continue;
          g.fillRect(x, y, 1, 1);
        } else if (theme === 'flesh') {
          const wave = Math.round(3.5 + Math.sin((x + variant * 2) * 0.8) * 1.5);
          if (y === wave) { g.fillStyle = p.light; g.fillRect(x, y, 1, 1); }
          else if (y === wave + 1) { g.fillStyle = p.mid; g.fillRect(x, y, 1, 1); }
          else if (r < 0.08) { g.fillStyle = p.dark; g.fillRect(x, y, 1, 1); }
          else if (r > 0.97) { g.fillStyle = p.spec; g.fillRect(x, y, 1, 1); }
        }
      }
    }
    if (theme === 'metal') {
      g.fillStyle = p.light; g.fillRect(0, 0, 8, 1); g.fillRect(0, 0, 1, 8);
      g.fillStyle = p.dark; g.fillRect(0, 7, 8, 1); g.fillRect(7, 0, 1, 8);
      g.fillStyle = p.mid; g.fillRect(1, 1, 6, 1);
      g.fillStyle = p.spec; g.fillRect(2, 2, 1, 1); g.fillRect(5, 5, 1, 1);
      g.fillStyle = p.dark; g.fillRect(3, 2, 1, 1); g.fillRect(6, 5, 1, 1);
      if (variant === 1) { g.fillStyle = p.mid; g.fillRect(2, 4, 4, 1); g.fillRect(2, 6, 4, 1); }
      if (variant === 2) { g.fillStyle = '#c8a028'; for (let i = 0; i < 8; i += 4) { g.fillRect(i, 3, 2, 2); g.fillRect(i + 2, 5, 2, 2); } }
    }
    if (edge) {
      // 露出面(上側)を明るく、直下を影にする
      g.fillStyle = p.edge; g.fillRect(0, 0, 8, 1);
      g.fillStyle = p.light; g.fillRect(0, 1, 8, 1);
      g.fillStyle = p.spec;
      for (let x = 0; x < 8; x++) if (hash2(x, variant, 9) < 0.3) g.fillRect(x, 0, 1, 1);
      g.fillStyle = p.dark; g.fillRect(0, 2, 8, 1);
    }
    return c;
  };
  const fill = [0, 1, 2, 3].map((v) => mk(v, false));
  const edgeT = mk(0, true);
  return { fill, edgeT, edgeB: flipV(edgeT) };
}

/**
 * 天井と床からなる横スクロール地形。列(COL_W px)ごとに高さを持つ。
 */
export class Terrain {
  /**
   * @param {number[]} ceil 列ごとの天井下端Y(px)。0なら天井なし
   * @param {number[]} floor 列ごとの床上端Y(px)。PLAY_Hなら床なし
   * @param {'rock'|'flesh'|'metal'} theme 見た目のテーマ
   */
  constructor(ceil, floor, theme) {
    this.ceil = ceil;
    this.floor = floor;
    this.theme = theme;
    this.tiles = null;
  }

  /** 列数。 */
  get cols() { return this.ceil.length; }

  /**
   * 世界X座標から列番号を求める(範囲外は端の列に丸める)。
   * @param {number} wx 世界X
   * @returns {number} 列番号
   */
  idx(wx) {
    const i = Math.floor(wx / COL_W);
    return i < 0 ? 0 : i >= this.ceil.length ? this.ceil.length - 1 : i;
  }

  /**
   * 天井下端のY。
   * @param {number} wx 世界X
   * @returns {number} Y(px)
   */
  ceilAt(wx) { return this.ceil[this.idx(wx)]; }

  /**
   * 床上端のY。
   * @param {number} wx 世界X
   * @returns {number} Y(px)
   */
  floorAt(wx) { return this.floor[this.idx(wx)]; }

  /**
   * 指定矩形(世界X、画面Y)が地形にめり込むか判定する。
   * @param {number} wx0 左端(世界X)
   * @param {number} y0 上端Y
   * @param {number} wx1 右端(世界X)
   * @param {number} y1 下端Y
   * @returns {boolean} めり込めば true
   */
  hits(wx0, y0, wx1, y1) {
    const a = this.idx(wx0);
    const b = this.idx(wx1);
    for (let i = a; i <= b; i++) {
      if (y0 < this.ceil[i] || y1 > this.floor[i]) return true;
    }
    return false;
  }

  /**
   * 点が地形内か判定する。
   * @param {number} wx 世界X
   * @param {number} y Y
   * @returns {boolean} 地形内なら true
   */
  solidAt(wx, y) {
    const i = this.idx(wx);
    return y < this.ceil[i] || y >= this.floor[i];
  }

  /**
   * 地形を描画する。
   * @param {CanvasRenderingContext2D} ctx 描画先
   * @param {number} scrollX 画面左端の世界X
   * @returns {void}
   */
  draw(ctx, scrollX) {
    if (!this.tiles) this.tiles = makeTiles(this.theme);
    const t = this.tiles;
    const p = THEMES[this.theme];
    const i0 = Math.floor(scrollX / COL_W);
    const i1 = i0 + Math.ceil(W / COL_W) + 1;
    const n = this.ceil.length;
    const at = (arr, i) => arr[i < 0 ? 0 : i >= n ? n - 1 : i];
    for (let i = i0; i <= i1; i++) {
      const x = Math.round(i * COL_W - scrollX);
      const c = at(this.ceil, i);
      const f = at(this.floor, i);
      for (let y = 0, r = 0; y < c; y += COL_W, r++) {
        const img = y + COL_W >= c ? t.edgeB : t.fill[(hash2(i, r, 3) * 4) | 0];
        ctx.drawImage(img, x, y);
      }
      for (let y = f, r = 0; y < PLAY_H; y += COL_W, r++) {
        const img = r === 0 ? t.edgeT : t.fill[(hash2(i, r + 40, 3) * 4) | 0];
        ctx.drawImage(img, x, y);
      }
      // 垂直面の陰影
      const pc = at(this.ceil, i - 1);
      const nc = at(this.ceil, i + 1);
      const pf = at(this.floor, i - 1);
      const nf = at(this.floor, i + 1);
      if (c > pc) { ctx.fillStyle = p.edge; ctx.fillRect(x, pc, 1, c - pc); }
      if (c > nc) { ctx.fillStyle = p.dark; ctx.fillRect(x + COL_W - 1, nc, 1, c - nc); }
      if (f < pf) { ctx.fillStyle = p.edge; ctx.fillRect(x, f, 1, pf - f); }
      if (f < nf) { ctx.fillStyle = p.dark; ctx.fillRect(x + COL_W - 1, f, 1, nf - f); }
    }
  }
}

/**
 * 区間定義から地形を組み立てる。
 * 区間: { n:列数, c:天井の厚み(px), f:床の厚み(px), ramp:true で前区間から直線的に変化, wob:天井/床のうねり量(px) }
 * 天井と床の隙間は最低 minGap px を保証する。
 * @param {Array<{n:number,c?:number,f?:number,ramp?:boolean,wob?:number}>} segs 区間配列
 * @param {'rock'|'flesh'|'metal'} theme テーマ
 * @param {number} [seed=1] 乱数シード
 * @param {number} [minGap=88] 最小の隙間
 * @returns {Terrain} 地形
 */
export function buildTerrain(segs, theme, seed = 1, minGap = 88) {
  const rng = makeRng(seed);
  const ceil = [];
  const floor = [];
  let pc = 0;
  let pf = 0;
  let k0 = 0;
  const ph = [rng() * 6, rng() * 6, rng() * 6, rng() * 6];
  for (const s of segs) {
    const tc = s.c ?? pc;
    const tf = s.f ?? pf;
    for (let k = 0; k < s.n; k++) {
      const t = s.ramp ? (k + 1) / s.n : 1;
      let c = pc + (tc - pc) * t;
      let f = pf + (tf - pf) * t;
      if (s.wob) {
        const g = k0 + k;
        const wc = Math.sin(g * 0.23 + ph[0]) * 0.6 + Math.sin(g * 0.071 + ph[1]) * 0.4;
        const wf = Math.sin(g * 0.19 + ph[2]) * 0.6 + Math.sin(g * 0.083 + ph[3]) * 0.4;
        if (tc > 0) c += wc * s.wob;
        if (tf > 0) f += wf * s.wob;
      }
      c = Math.max(0, Math.round(c / COL_W) * COL_W);
      f = Math.max(0, Math.round(f / COL_W) * COL_W);
      if (c + f > PLAY_H - minGap) {
        const over = c + f - (PLAY_H - minGap);
        if (f >= c) f = Math.max(0, f - Math.ceil(over / COL_W) * COL_W);
        else c = Math.max(0, c - Math.ceil(over / COL_W) * COL_W);
      }
      ceil.push(c);
      floor.push(PLAY_H - f);
    }
    k0 += s.n;
    pc = tc;
    pf = tf;
  }
  return new Terrain(ceil, floor, theme);
}
