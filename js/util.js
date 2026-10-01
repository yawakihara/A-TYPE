/**
 * 再現性のある乱数生成器(mulberry32)を作る。
 * @param {number} seed 乱数シード
 * @returns {() => number} 0以上1未満の乱数を返す関数
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 値を範囲内に収める。
 * @param {number} v 値
 * @param {number} lo 下限
 * @param {number} hi 上限
 * @returns {number} 範囲内に収めた値
 */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * 線形補間。
 * @param {number} a 始点
 * @param {number} b 終点
 * @param {number} t 0〜1の補間量
 * @returns {number} 補間結果
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * 値を目標に向けて一定量だけ近づける。
 * @param {number} v 現在値
 * @param {number} target 目標値
 * @param {number} step 1回の最大変化量
 * @returns {number} 更新後の値
 */
export function approach(v, target, step) {
  if (v < target) return Math.min(v + step, target);
  return Math.max(v - step, target);
}

/**
 * 中心座標＋半サイズ(hw,hh)を持つ2つの矩形が重なっているか判定する。
 * @param {{x:number,y:number,hw:number,hh:number}} a 矩形A
 * @param {{x:number,y:number,hw:number,hh:number}} b 矩形B
 * @returns {boolean} 重なっていれば true
 */
export function overlap(a, b) {
  return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
}

/**
 * 2点間の距離。
 * @param {number} x1 点1のX
 * @param {number} y1 点1のY
 * @param {number} x2 点2のX
 * @param {number} y2 点2のY
 * @returns {number} 距離
 */
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

/**
 * 2進数的に整数座標から疑似乱数(0〜1)を引く。空間ノイズ用。
 * @param {number} x 整数X
 * @param {number} y 整数Y
 * @param {number} [s=0] シード
 * @returns {number} 0以上1未満の値
 */
export function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * 数値を指定桁でゼロ埋めした文字列にする。
 * @param {number} n 数値
 * @param {number} len 桁数
 * @returns {string} ゼロ埋め文字列
 */
export const pad = (n, len) => String(Math.max(0, Math.floor(n))).padStart(len, '0');
