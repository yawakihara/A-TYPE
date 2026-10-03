/**
 * Autopilot used for the attract-mode demo and automated tests.
 * Each frame it scores nine candidate moves by predicted bullet/terrain/enemy danger over a
 * short horizon, then steers toward a firing lane on the best target. Fires rapidly and
 * looses charged beams at large targets.
 */
import { W, PH, SHIP_SPEEDS } from '../config.js';

export function makeBot(getWorld) {
  let charge = 0;
  let mode = 'rapid';
  let podT = 0;
  return () => {
    const w = getWorld();
    if (!w || !w.player) return null;
    const p = w.player;
    if (!p.alive) return { mx: 0, my: 0 };
    const sp = SHIP_SPEEDS[p.gear];
    // pick a target
    let target = null;
    let best = Infinity;
    for (const e of w.enemies) {
      if (e.dead || e.dying || !e.onScreen(-8)) continue;
      const bx = e.boxes();
      const weak = bx.find((b) => b.type === 'weak') || bx.find((b) => b.type === 'body') || bx[0];
      if (!weak) continue;
      const d = Math.abs(weak.y - p.y) + Math.max(0, p.x - weak.x) * 3 + (e.boss ? -200 : 0);
      if (d < best) {
        best = d;
        target = weak;
      }
    }
    const camX = w.camX;
    const T = w.terrain;
    const prefX = camX + (target && target.x - camX < 160 ? 50 : 80);
    const prefY = target ? target.y : PH / 2;
    let bestMove = [0, 0];
    let bestScore = -Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const len = Math.hypot(dx, dy) || 1;
        let danger = 0;
        for (let k = 1; k <= 14; k += 2) {
          const px = p.x + (dx / len) * sp * k + w.dx * k;
          const py = p.y + (dy / len) * sp * k;
          if (py < 10 || py > PH - 9 || px < camX + 12 || px > camX + W - 24) danger += 40;
          if (T.hitBox(px, py, 13, 6)) danger += 300 / k;
          for (const b of w.bullets.list) {
            if (b.dead) continue;
            const bx = b.x + (b.vx + w.dx) * k;
            const by = b.y + b.vy * k;
            const d2 = (bx - px) ** 2 + (by - py) ** 2;
            const r = b.r + 7;
            if (d2 < r * r) danger += 400 / k;
            else if (d2 < (r + 10) ** 2) danger += 30 / k;
          }
          for (const e of w.enemies) {
            if (e.dead || !e.touch) continue;
            for (const bb of e.boxes()) {
              if (Math.abs(bb.x - px) < bb.hw + 12 && Math.abs(bb.y - py) < bb.hh + 7) danger += 120 / k;
            }
          }
        }
        const nx = p.x + (dx / len) * sp * 8;
        const ny = p.y + (dy / len) * sp * 8;
        const seek = -Math.abs(ny - prefY) * 0.6 - Math.abs(nx - prefX) * 0.25;
        const score = seek - danger;
        if (score > bestScore) {
          bestScore = score;
          bestMove = [dx / len, dy / len];
        }
      }
    }
    // weapons: beam bursts against big targets, otherwise rapid fire
    let fire = false;
    let rapid = false;
    const big = target && w.enemies.some((e) => e.boss || e.bar || e.hp > 10);
    if (mode === 'rapid') {
      rapid = true;
      if (big && Math.random() < 0.02) {
        mode = 'charge';
        charge = 0;
      }
    } else {
      fire = true;
      charge++;
      if (charge > 100) {
        fire = false;
        mode = 'rapid';
      }
    }
    let pod = false;
    if (w.pod && !w.pod.attached && w.pod.state === 'free' && ++podT > 90) {
      pod = true;
      podT = 0;
    }
    return { mx: bestMove[0], my: bestMove[1], fire, rapid, pod };
  };
}
