import {
  make, fromRows, flipH, flipV, silhouette, shearY, renderSDF, renderSphere,
  sdCircle, sdBox, sdEllipse, sdSeg, sdTri,
} from './gfx.js';
import { PAL, SHIP_ROWS } from './spritedata.js';
import { drawText } from './font.js';
import { hash2 } from './util.js';

/** 色ランプ(暗→明)。 */
export const RAMPS = {
  steel: ['#1b2033', '#323a57', '#4f5a7d', '#7b88b0', '#b5c2e6', '#eef3ff'],
  purple: ['#1d0b2e', '#3f1760', '#6b2a96', '#a049c6', '#d98ae8', '#ffd0ff'],
  red: ['#2a0a10', '#59121c', '#8f1f2a', '#c93a3a', '#f2704f', '#ffc09a'],
  orange: ['#2b1405', '#5c2a0a', '#99440e', '#d6701a', '#ffa63d', '#ffe08a'],
  green: ['#06210f', '#0e4a22', '#1a7a38', '#33b052', '#7ae07e', '#d4ffc8'],
  teal: ['#04222a', '#0a4a54', '#14808a', '#25bdb8', '#6df0dc', '#d0fff4'],
  blue: ['#0a1236', '#14297a', '#2350c4', '#4a86f0', '#92c2ff', '#e0f0ff'],
  flesh: ['#2d0b1c', '#5e1736', '#962a54', '#cc4a74', '#f08aa6', '#ffd0d8'],
  gold: ['#2a1d04', '#5a4008', '#94700f', '#d6a51c', '#ffd84a', '#fff6b0'],
  magenta: ['#2a0a22', '#5a1248', '#962a78', '#cc4aa2', '#f08acb', '#ffd0ee'],
};

/** 生成済みスプライト群。buildSprites() で初期化される。 */
export const SPR = {};

/** アイテム種別ごとの表示設定(文字・ランプ)。 */
export const ITEM_STYLE = {
  speed: { ch: '>', ramp: 'green' },
  orb: { ch: 'O', ramp: 'teal' },
  ricochet: { ch: 'R', ramp: 'red' },
  piercer: { ch: 'P', ramp: 'blue' },
  seeker: { ch: 'H', ramp: 'gold' },
  missile: { ch: 'M', ramp: 'orange' },
  bit: { ch: 'T', ramp: 'purple' },
};

/**
 * フレーム列を関数から生成する。
 * @param {number} n フレーム数
 * @param {(f:number)=>HTMLCanvasElement} fn フレーム生成関数
 * @returns {HTMLCanvasElement[]} フレーム配列
 */
const frames = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

/**
 * 爆発アニメーションのフレームを作る。
 * @param {number} size 1フレームの一辺
 * @param {number} count フレーム数
 * @param {number} seed ノイズシード
 * @returns {HTMLCanvasElement[]} フレーム配列
 */
function makeExplosion(size, count, seed) {
  const ramp = ['#ffffff', '#fff7a8', '#ffd24a', '#ff9a2a', '#e8481f', '#9c2218', '#4a2a30', '#2a2030'];
  const rgb = ramp.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  return frames(count, (f) => {
    const c = make(size, size);
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const p = (f + 0.5) / count;
    const R = (size / 2) * (0.28 + 0.72 * Math.sqrt(p));
    const inner = R * Math.max(0, (p - 0.3) * 1.15);
    const cx = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cx;
        const r = Math.hypot(dx, dy);
        const sector = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 18);
        const wob = 0.72 + hash2(sector, f, seed) * 0.5;
        const rr = r / wob;
        if (rr > R || rr < inner) continue;
        const t = rr / Math.max(1, R);
        const heat = (1 - p) * (1 - t * 0.55) + (hash2(x, y, f + seed) - 0.5) * 0.22;
        const idx = Math.max(0, Math.min(rgb.length - 1, Math.floor((1 - heat) * rgb.length * 0.95)));
        const i = (y * size + x) * 4;
        img.data[i] = rgb[idx][0]; img.data[i + 1] = rgb[idx][1]; img.data[i + 2] = rgb[idx][2];
        img.data[i + 3] = p > 0.8 && hash2(x, y, f) < (p - 0.8) * 4 ? 0 : 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

/**
 * アイテムカプセルを作る。
 * @param {string} ch 表示文字
 * @param {string[]} ramp 色ランプ
 * @param {number} shine 光沢の位相(0〜3)
 * @returns {HTMLCanvasElement} スプライト
 */
function makeCapsule(ch, ramp, shine) {
  const body = renderSDF(18, 12, (x, y) => sdBox(x, y, 9, 6, 8, 5, 4), ramp, { depth: 3 });
  const g = body.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.55)';
  const sx = 3 + shine * 3;
  g.fillRect(sx, 2, 2, 1);
  g.fillRect(sx + 1, 3, 1, 1);
  drawText(g, ch, 6, 3, '#0b0b1a');
  drawText(g, ch, 6, 2, '#ffffff');
  return body;
}

/**
 * 全スプライトを生成する。起動時に一度だけ呼ぶ。
 * @returns {void}
 */
export function buildSprites() {
  // --- 自機 ---
  const ship = fromRows(SHIP_ROWS, PAL);
  SPR.ship = { mid: shearY(ship, 0), up: shearY(ship, -3), dn: shearY(ship, 3) };

  // --- ポッド(球体)：レベル0..2 x 回転4フレーム ---
  const podRamps = [RAMPS.teal, RAMPS.blue, RAMPS.magenta];
  const podBand = ['#ffffff', '#d0e8ff', '#ffe0f8'];
  SPR.pod = podRamps.map((r, lv) => frames(6, (f) => renderSphere(14 + lv * 2, r, { bands: 3, phase: (f * Math.PI) / 9, bandColor: podBand[lv] })));
  SPR.bit = frames(4, (f) => renderSDF(9, 9, (x, y) => {
    const a = (f * Math.PI) / 8;
    const rx = (x - 4.5) * Math.cos(a) + (y - 4.5) * Math.sin(a);
    const ry = -(x - 4.5) * Math.sin(a) + (y - 4.5) * Math.cos(a);
    return Math.abs(rx) + Math.abs(ry) - 3.9;
  }, RAMPS.gold, { depth: 2 }));

  // --- 敵 ---
  SPR.drone = frames(6, (f) => {
    const s = renderSphere(14, RAMPS.purple, { bands: 2, phase: (f * Math.PI) / 6, bandColor: '#ffd0ff' });
    const g = s.getContext('2d');
    g.fillStyle = '#0b0b1a'; g.fillRect(5, 6, 5, 4);
    g.fillStyle = '#7dffff'; g.fillRect(6, 7, 3, 2);
    g.fillStyle = '#ffffff'; g.fillRect(6, 7, 1, 1);
    return s;
  });
  SPR.swooper = frames(2, (f) => renderSDF(20, 16, (x, y) => {
    const wing = f ? 1 : 0;
    const body = sdEllipse(x, y, 11, 8, 9, 5 + wing);
    const cut = sdCircle(x, y, 18, 8, 7.5);
    return Math.max(body, -cut);
  }, RAMPS.orange, { depth: 3 }));
  SPR.walker = renderSDF(20, 12, (x, y) => Math.max(sdEllipse(x, y, 10, 11, 9, 9.5), y - 11.5), RAMPS.green, { depth: 3 });
  SPR.turretBase = renderSDF(18, 10, (x, y) => Math.max(sdEllipse(x, y, 9, 9.5, 8.5, 8.5), y - 9.5), RAMPS.steel, { depth: 3 });
  SPR.mine = frames(2, (f) => renderSDF(22, 22, (x, y) => {
    let d = sdCircle(x, y, 11, 11, 6);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + f * (Math.PI / 8);
      d = Math.min(d, sdSeg(x, y, 11, 11, 11 + Math.cos(a) * 9.5, 11 + Math.sin(a) * 9.5, 0.9));
    }
    return d;
  }, RAMPS.red, { depth: 3 }));
  SPR.serpentHead = renderSphere(16, RAMPS.teal, { bands: 2, phase: 0.4, bandColor: '#d0fff4' });
  {
    const g = SPR.serpentHead.getContext('2d');
    g.fillStyle = '#0b0b1a'; g.fillRect(3, 5, 6, 3);
    g.fillStyle = '#ff6a6a'; g.fillRect(4, 6, 2, 1); g.fillRect(7, 6, 1, 1);
  }
  SPR.serpentSeg = frames(2, (f) => renderSphere(12, f ? RAMPS.teal : RAMPS.green, { bands: 2, phase: f, bandColor: '#d0fff4' }));
  SPR.rusher = renderSDF(20, 10, (x, y) => sdTri(x, y, 0.5, 5, 19, 0.5, 19, 9.5), RAMPS.red, { depth: 3 });
  SPR.orbiter = frames(4, (f) => renderSphere(10, RAMPS.teal, { bands: 2, phase: f * 0.8, bandColor: '#ffffff' }));
  SPR.cargo = frames(2, (f) => {
    const c = renderSDF(32, 20, (x, y) => {
      const body = sdBox(x, y, 16, 10, 13, 6, 5);
      const fin1 = sdTri(x, y, 8, 4, 18, 0.5, 20, 4);
      const fin2 = sdTri(x, y, 8, 16, 18, 19.5, 20, 16);
      return Math.min(body, fin1, fin2);
    }, RAMPS.gold, { depth: 3 });
    const g = c.getContext('2d');
    g.fillStyle = '#0b0b1a'; g.fillRect(7, 8, 18, 4);
    g.fillStyle = f ? '#ff5a5a' : '#6a1a1a'; g.fillRect(9, 9, 3, 2);
    g.fillStyle = f ? '#6a1a1a' : '#ff5a5a'; g.fillRect(14, 9, 3, 2); g.fillRect(19, 9, 3, 2);
    return c;
  });
  SPR.gunship = renderSDF(46, 28, (x, y) => {
    const body = sdBox(x, y, 25, 14, 17, 7, 6);
    const nose = sdTri(x, y, 2, 14, 12, 7, 12, 21);
    const w1 = sdTri(x, y, 24, 7, 38, 0.5, 40, 8);
    const w2 = sdTri(x, y, 24, 21, 38, 27.5, 40, 20);
    return Math.min(body, nose, w1, w2);
  }, RAMPS.steel, { depth: 4 });
  {
    const g = SPR.gunship.getContext('2d');
    g.fillStyle = '#0b0b1a'; g.fillRect(12, 12, 14, 4);
    g.fillStyle = '#ff5a5a'; g.fillRect(14, 13, 10, 2);
    g.fillStyle = '#ffb0a0'; g.fillRect(15, 13, 3, 1);
  }

  // --- アイテム ---
  SPR.item = {};
  for (const [type, st] of Object.entries(ITEM_STYLE)) {
    SPR.item[type] = frames(4, (f) => makeCapsule(st.ch, RAMPS[st.ramp], f));
  }

  // --- 爆発 ---
  SPR.expTiny = makeExplosion(14, 6, 11);
  SPR.expSmall = makeExplosion(28, 8, 23);
  SPR.expBig = makeExplosion(64, 12, 37);
  SPR.expHuge = makeExplosion(110, 14, 51);

  // --- 敵弾 ---
  SPR.pellet = frames(4, (f) => {
    const c = make(7, 7);
    const g = c.getContext('2d');
    const cols = [['#ff9a2a', '#ffe28a'], ['#ff6a2a', '#ffc070'], ['#ff9a2a', '#ffe28a'], ['#ffd02a', '#ffffff']];
    g.fillStyle = '#0b0b1a'; g.fillRect(1, 0, 5, 7); g.fillRect(0, 1, 7, 5);
    g.fillStyle = cols[f][0]; g.fillRect(1, 1, 5, 5);
    g.fillStyle = cols[f][1]; g.fillRect(2, 2, 3, 3);
    g.fillStyle = '#ffffff'; g.fillRect(2, 2, 1, 1);
    return c;
  });
  SPR.orbShot = frames(4, (f) => renderSphere(10, f % 2 ? RAMPS.magenta : RAMPS.purple, { bands: 2, phase: f, bandColor: '#ffffff' }));
  SPR.spore = frames(4, (f) => renderSphere(12, RAMPS.green, { bands: 3, phase: f * 0.5, bandColor: '#d4ffc8' }));
  SPR.eMissile = frames(2, (f) => {
    const c = make(12, 5);
    const g = c.getContext('2d');
    g.fillStyle = '#0b0b1a'; g.fillRect(0, 0, 12, 5);
    g.fillStyle = '#9aa3c0'; g.fillRect(2, 1, 9, 3);
    g.fillStyle = '#e8eeff'; g.fillRect(3, 1, 6, 1);
    g.fillStyle = '#ff5a4a'; g.fillRect(9, 1, 2, 3);
    g.fillStyle = f ? '#ffe070' : '#ff9a2a'; g.fillRect(0, 1, 2, 3);
    return c;
  });

  // --- 反転版(左向き/天井用)を必要に応じて ---
  SPR.walkerFlip = flipV(SPR.walker);
  SPR.turretBaseFlip = flipV(SPR.turretBase);
  SPR.flash = new Map();
}

/**
 * スプライトの被弾フラッシュ版を取得(キャッシュ)する。
 * @param {HTMLCanvasElement} img 元画像
 * @returns {HTMLCanvasElement} 白塗り画像
 */
export function flashOf(img) {
  let f = SPR.flash.get(img);
  if (!f) { f = silhouette(img, '#ffffff'); SPR.flash.set(img, f); }
  return f;
}

export { flipH, flipV };
