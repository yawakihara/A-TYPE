import { hash2 } from './util.js';

/**
 * オフスクリーンキャンバスを作る。
 * @param {number} w 幅
 * @param {number} h 高さ
 * @returns {HTMLCanvasElement} キャンバス
 */
export function make(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/**
 * #rrggbb を [r,g,b] に変換する。
 * @param {string} hex 色文字列
 * @returns {number[]} RGB配列
 */
export function hex2rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 文字マップ(行配列)とパレットからスプライトを作る。'.'は透明。
 * @param {string[]} rows 行データ
 * @param {Record<string,string>} pal 文字→色
 * @returns {HTMLCanvasElement} スプライト
 */
export function fromRows(rows, pal) {
  const w = Math.max(...rows.map((r) => r.length));
  const c = make(w, rows.length);
  const g = c.getContext('2d');
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/**
 * 左右反転コピーを作る。
 * @param {HTMLCanvasElement} src 元画像
 * @returns {HTMLCanvasElement} 反転画像
 */
export function flipH(src) {
  const c = make(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

/**
 * 上下反転コピーを作る。
 * @param {HTMLCanvasElement} src 元画像
 * @returns {HTMLCanvasElement} 反転画像
 */
export function flipV(src) {
  const c = make(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(0, src.height);
  g.scale(1, -1);
  g.drawImage(src, 0, 0);
  return c;
}

/**
 * 被弾フラッシュ用の白塗りコピーを作る。
 * @param {HTMLCanvasElement} src 元画像
 * @param {string} [color='#ffffff'] 塗り色
 * @returns {HTMLCanvasElement} 単色画像
 */
export function silhouette(src, color = '#ffffff') {
  const c = make(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * 列ごとに垂直方向へずらして傾き表現を作る(機体の上下傾斜用)。
 * @param {HTMLCanvasElement} src 元画像
 * @param {number} k 右端でのずらし量(px)。正で下、負で上
 * @param {number} [pad=3] 上下に追加する余白
 * @returns {HTMLCanvasElement} 変形画像
 */
export function shearY(src, k, pad = 3) {
  const c = make(src.width, src.height + pad * 2);
  const g = c.getContext('2d');
  for (let x = 0; x < src.width; x++) {
    const off = Math.round((x / (src.width - 1) - 0.5) * k);
    g.drawImage(src, x, 0, 1, src.height, x, pad + off, 1, src.height);
  }
  return c;
}

/**
 * 画像の外周に1pxの輪郭を付ける。
 * @param {HTMLCanvasElement} src 元画像
 * @param {string} color 輪郭色
 * @returns {HTMLCanvasElement} 輪郭付き画像(上下左右に1px拡大)
 */
export function outline(src, color) {
  const w = src.width + 2;
  const h = src.height + 2;
  const base = make(w, h);
  base.getContext('2d').drawImage(src, 1, 1);
  const sd = base.getContext('2d').getImageData(0, 0, w, h);
  const out = make(w, h);
  const g = out.getContext('2d');
  const od = g.createImageData(w, h);
  const [r, gg, b] = hex2rgb(color);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : sd.data[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (sd.data[i + 3] > 0) {
        od.data.set(sd.data.subarray(i, i + 4), i);
      } else if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
        od.data[i] = r; od.data[i + 1] = gg; od.data[i + 2] = b; od.data[i + 3] = 255;
      }
    }
  }
  g.putImageData(od, 0, 0);
  return out;
}

/** 円の符号付き距離。 */
export const sdCircle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
/** 角丸ボックスの符号付き距離。 */
export function sdBox(x, y, cx, cy, hw, hh, r = 0) {
  const qx = Math.abs(x - cx) - hw + r;
  const qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
/** 楕円の近似符号付き距離。 */
export function sdEllipse(x, y, cx, cy, rx, ry) {
  return (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
}
/** 線分カプセルの符号付き距離。 */
export function sdSeg(x, y, ax, ay, bx, by, r) {
  const pax = x - ax; const pay = y - ay; const bax = bx - ax; const bay = by - ay;
  const t = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay || 1)));
  return Math.hypot(pax - bax * t, pay - bay * t) - r;
}
/** 三角形(頂点3つ)の符号付き距離(近似)。 */
export function sdTri(x, y, ax, ay, bx, by, cx, cy) {
  const d = Math.min(sdSeg(x, y, ax, ay, bx, by, 0), sdSeg(x, y, bx, by, cx, cy, 0), sdSeg(x, y, cx, cy, ax, ay, 0));
  const s1 = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
  const s2 = (cx - bx) * (y - by) - (cy - by) * (x - bx);
  const s3 = (ax - cx) * (y - cy) - (ay - cy) * (x - cx);
  const inside = (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  return inside ? -d : d;
}

/**
 * 符号付き距離関数から、陰影付きのドット絵スプライトを生成する。
 * 縁を光源方向に応じて明暗付けし、外周に1pxの輪郭を付ける。
 * @param {number} w 幅
 * @param {number} h 高さ
 * @param {(x:number,y:number)=>number} fn 符号付き距離関数(負で内側)
 * @param {string[]} ramp 暗→明の色配列
 * @param {{outline?:string|null, light?:number[], depth?:number, noise?:number}} [opt] 輪郭色・光源方向・縁の厚み・ノイズ量
 * @returns {HTMLCanvasElement} スプライト
 */
export function renderSDF(w, h, fn, ramp, opt = {}) {
  const c = make(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  const rgb = ramp.map(hex2rgb);
  const oc = opt.outline === null ? null : hex2rgb(opt.outline || '#0a0a18');
  const ll = Math.hypot(...(opt.light || [-0.55, -0.65])) || 1;
  const lx = (opt.light || [-0.55, -0.65])[0] / ll;
  const ly = (opt.light || [-0.55, -0.65])[1] / ll;
  const depth = opt.depth || 4;
  const noise = opt.noise || 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const v = fn(px, py);
      const i = (y * c.width + x) * 4;
      if (v <= 0) {
        const e = 0.75;
        let gx = fn(px + e, py) - fn(px - e, py);
        let gy = fn(px, py + e) - fn(px, py - e);
        const gl = Math.hypot(gx, gy) || 1;
        gx /= gl; gy /= gl;
        const t = Math.min(1, -v / depth);
        let s = 0.52 + 0.5 * (gx * lx + gy * ly) * (1 - t * 0.75) - 0.06 * ((px / w) * 0.5 + (py / h) * 0.5 - 0.5);
        if (noise) s += (hash2(x, y, 7) - 0.5) * noise;
        const idx = Math.max(0, Math.min(rgb.length - 1, Math.floor(s * rgb.length)));
        img.data[i] = rgb[idx][0]; img.data[i + 1] = rgb[idx][1]; img.data[i + 2] = rgb[idx][2]; img.data[i + 3] = 255;
      } else if (oc && v <= 1.0) {
        img.data[i] = oc[0]; img.data[i + 1] = oc[1]; img.data[i + 2] = oc[2]; img.data[i + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * 陰影付きの球体スプライトを作る。回転表現のため帯模様の位相を指定できる。
 * @param {number} d 直径
 * @param {string[]} ramp 暗→明の色配列
 * @param {{phase?:number, bands?:number, outline?:string, bandColor?:string}} [opt] 位相・帯数・輪郭色・帯色
 * @returns {HTMLCanvasElement} スプライト
 */
export function renderSphere(d, ramp, opt = {}) {
  const c = make(d + 2, d + 2);
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  const rgb = ramp.map(hex2rgb);
  const oc = hex2rgb(opt.outline || '#0a0a18');
  const bc = opt.bandColor ? hex2rgb(opt.bandColor) : null;
  const R = d / 2;
  const cx = c.width / 2;
  const cy = c.height / 2;
  const L = [-0.5, -0.6, 0.62];
  const ln = Math.hypot(...L);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const dx = (x + 0.5 - cx) / R;
      const dy = (y + 0.5 - cy) / R;
      const r2 = dx * dx + dy * dy;
      const i = (y * c.width + x) * 4;
      if (r2 <= 1) {
        const dz = Math.sqrt(1 - r2);
        let s = Math.max(0, (dx * L[0] + dy * L[1] + dz * L[2]) / ln);
        s = 0.12 + 0.88 * s;
        let idx = Math.max(0, Math.min(rgb.length - 1, Math.floor(s * rgb.length)));
        let col = rgb[idx];
        if (bc && opt.bands) {
          const ang = Math.atan2(dy, dx) + (opt.phase || 0);
          const band = Math.sin(ang * opt.bands);
          if (band > 0.82 && r2 > 0.15) { idx = Math.min(rgb.length - 1, idx + 1); col = bc.map((v, k) => Math.round((v + rgb[idx][k]) / 2)); }
        }
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      } else if (r2 <= (1 + 1.1 / R) * (1 + 1.1 / R)) {
        img.data[i] = oc[0]; img.data[i + 1] = oc[1]; img.data[i + 2] = oc[2]; img.data[i + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * Bresenham法で1pxの線を描く(ドット感を保つため)。
 * @param {CanvasRenderingContext2D} ctx 描画先
 * @param {number} x0 始点X
 * @param {number} y0 始点Y
 * @param {number} x1 終点X
 * @param {number} y1 終点Y
 * @param {string} color 色
 * @param {number} [th=1] 太さ(px)
 * @returns {void}
 */
export function pxLine(ctx, x0, y0, x1, y1, color, th = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = color;
  for (let n = 0; n < 600; n++) {
    ctx.fillRect(x0, y0, th, th);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
