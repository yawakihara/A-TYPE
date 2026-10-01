import { W, PLAY_H } from './config.js';
import { getParts } from './enemies.js';
import { SPEEDS } from './entities.js';

/**
 * デモプレイ・自動テスト用のボット入力を作る。
 * 弾・敵・地形の先読み評価で9方向から最も安全な移動を選び、チャージ撃ちを繰り返す。
 * @param {object} g ゲーム状態
 * @returns {() => Record<string, boolean>} 毎フレーム呼ぶと入力状態を返す関数
 */
export function makeBot(g) {
  let t = 0;
  return () => {
    t++;
    const out = { up: false, down: false, left: false, right: false, fire: false, pod: false, rapid: true, start: false, pause: false };
    const p = g.player;
    if (!p.alive) return out;
    const ph = t % 140;
    out.fire = ph < 108;
    if (g.pod && t % 600 === 300) out.pod = true;

    const sp = SPEEDS[p.speedLv];
    const parts = [];
    for (const e of g.enemies) {
      if (e.dead || e.dying !== undefined) continue;
      if (!e.def.isBoss && e.x - e.hw > W + 20) continue;
      for (const part of getParts(e)) parts.push({ part, vx: e.vx || 0, vy: e.vy || 0 });
    }
    // 追尾対象: 画面内で自機より右にいる最寄りの敵
    let target = null;
    let td = 1e9;
    for (const e of g.enemies) {
      if (e.dead || e.dying !== undefined || e.x > W - 6 || e.x < p.x - 4) continue;
      const d = Math.abs(e.y - p.y) + (e.x - p.x) * 0.3;
      if (d < td) { td = d; target = e; }
    }
    let item = null;
    for (const it of g.items) if (it.x > p.x - 40 && (!item || it.x < item.x)) item = it;

    let best = { dx: 0, dy: 0 };
    let bestS = -1e12;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const k = dx && dy ? 0.7071 : 1;
        let s = 0;
        for (let f = 1; f <= 9; f++) {
          const px = Math.max(22, Math.min(W - 22, p.x + dx * sp * k * f));
          const py = Math.max(9, Math.min(PLAY_H - 9, p.y + dy * sp * k * f));
          if (g.terrain.hits(g.scrollX + g.scrollSpeed * f + px - 14, py - 7, g.scrollX + g.scrollSpeed * f + px + 16, py + 7)) s -= 4000 / f;
          for (const b of g.ebullets) {
            const bx = b.x + b.vx * f;
            const by = b.y + b.vy * f;
            if (Math.abs(bx - px) < 14 && Math.abs(by - py) < 8) s -= 700 / f;
          }
          for (const q of parts) {
            const ex = q.part.x + q.vx * f;
            const ey = q.part.y + q.vy * f;
            if (Math.abs(ex - px) < q.part.hw + 15 && Math.abs(ey - py) < q.part.hh + 8) s -= 600 / f;
          }
        }
        const fx = Math.max(22, Math.min(W - 22, p.x + dx * sp * k * 9));
        const fy = Math.max(9, Math.min(PLAY_H - 9, p.y + dy * sp * k * 9));
        if (target) s -= Math.abs(fy - target.y) * 0.05;
        if (item) s -= Math.hypot(fx - item.x, fy - item.y) * 0.12;
        s -= Math.abs(fx - 80) * 0.03;
        s -= Math.abs(fy - 120) * 0.004;
        if (!dx && !dy) s += 0.5;
        if (s > bestS) { bestS = s; best = { dx, dy }; }
      }
    }
    out.left = best.dx < 0;
    out.right = best.dx > 0;
    out.up = best.dy < 0;
    out.down = best.dy > 0;
    return out;
  };
}
