/**
 * Stage 6 (the heart of the Bloom) art: guardian cell, eye wall, tendril, spawner,
 * heart valve flap. Crimson tissue, black machinery and white-hot veins. Original designs.
 */
import { defineSprite } from '../sprites.js';
import { lin, rad, solid, line, circle, ellipse, emissive, path } from './kit.js';
import { BL, eye } from './enemies1.js';
import { rgba } from '../../core/math.js';

export const HT = { flesh: '#8a1428', fleshDk: '#2a040c', vein: '#ff3050', machine: '#1c1c26', glow: '#ff5a70', white: '#ffe8ec' };

defineSprite('cell', {
  w: 30,
  h: 30,
  frames: 3,
  outline: false,
  draw(ctx, f, info) {
    const s = [1, 1.06, 0.95][f];
    circle(ctx, 0, 0, 11 * s, rad(ctx, -3, -3, 1, 12 * s, [[0, rgba('#ffd0dc', 0.95)], [0.5, rgba('#d03a5a', 0.85)], [1, rgba('#3a0414', 0.95)]]), '#1a0208', 0.8);
    // nucleus
    ellipse(ctx, 1, 1, 4.5, 3.6, 0.5, rad(ctx, 0, 0, 0.5, 5, [[0, '#ffffff'], [0.4, '#ffb0c0'], [1, '#7a1028']]), '#2a0410', 0.5);
    // organelles
    for (const [x, y] of [[-5, 3], [4, -5], [-3, -6], [6, 4]]) circle(ctx, x * s, y * s, 1.1, rgba('#ffe0e8', 0.7));
    circle(ctx, -4, -5, 1.6, 'rgba(255,255,255,0.8)');
    emissive(ctx, info, 0, 0, 14, HT.glow, 0.35);
  },
});

defineSprite('eyewall', {
  w: 34,
  h: 22,
  ox: 17,
  oy: 18,
  frames: 3,
  outline: true,
  draw(ctx, f, info) {
    path(ctx, [[-15, 4], [-12, -8, 12, -8, 15, 4]]);
    ctx.fillStyle = lin(ctx, 0, -8, 0, 4, [[0, HT.flesh], [1, HT.fleshDk]]);
    ctx.fill();
    ctx.strokeStyle = '#140206';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    const open = [0.15, 0.6, 1][f];
    for (const [x, r] of [[-7, 3.2], [0, 4.2], [7, 3.2]]) {
      ellipse(ctx, x, -3, r + 0.8, (r + 0.8) * open + 0.4, 0, '#1a0206');
      if (open > 0.3) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, -3, r, r * open, 0, 0, Math.PI * 2);
        ctx.clip();
        eye(ctx, info, x, -3, r, '#ffe060');
        ctx.restore();
      }
    }
  },
});

defineSprite('tendril_seg', {
  w: 14,
  h: 14,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 5, lin(ctx, 0, -5, 0, 5, [[0, '#d04a6a'], [0.6, HT.flesh], [1, HT.fleshDk]]), '#140206', 0.5);
    circle(ctx, 1, 1.5, 1, HT.vein);
    void info;
  },
});

defineSprite('tendril_tip', {
  w: 22,
  h: 16,
  ox: 8,
  oy: 8,
  outline: true,
  draw(ctx, f, info) {
    path(ctx, [[-6, -5], [6, -6, 12, -1, 14, 0], [12, 1, 6, 6, -6, 5]]);
    ctx.fillStyle = lin(ctx, -6, 0, 14, 0, [[0, HT.flesh], [1, '#ffd0dc']]);
    ctx.fill();
    ctx.strokeStyle = '#140206';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    eye(ctx, info, 0, 0, 2.6, '#ffe060');
  },
});

defineSprite('spawner', {
  w: 32,
  h: 26,
  ox: 16,
  oy: 22,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    path(ctx, [[-14, 4], [-14, -14, 14, -14, 14, 4]]);
    ctx.fillStyle = rad(ctx, 0, -4, 2, 18, [[0, f ? '#ffb0c0' : '#c04a6a'], [0.7, HT.flesh], [1, HT.fleshDk]]);
    ctx.fill();
    ctx.strokeStyle = '#140206';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // black machine ribs grafted on
    for (const x of [-8, 0, 8]) {
      solid(ctx, [[x - 1.6, 4], [x - 1.2, -11], [x + 1.2, -11], [x + 1.6, 4]], lin(ctx, x - 2, 0, x + 2, 0, [[0, '#0c0c12'], [0.5, '#4a4a5a'], [1, '#0c0c12']]));
    }
    ellipse(ctx, 0, -6, 4, 2.5 + f * 2, 0, '#1a0206', '#140206', 0.5);
    if (f) emissive(ctx, info, 0, -6, 9, HT.glow, 0.7);
  },
});

defineSprite('valve', {
  w: 52,
  h: 70,
  ox: 26,
  oy: 2,
  outline: true,
  draw(ctx, f, info) {
    // a flap of tissue hanging from the ceiling (mirrored for the floor flap)
    path(ctx, [[-24, 0], [-26, 30, -16, 58, 0, 66], [16, 58, 26, 30, 24, 0]]);
    ctx.fillStyle = lin(ctx, 0, 0, 0, 66, [[0, HT.fleshDk], [0.5, HT.flesh], [1, '#d04a6a']]);
    ctx.fill();
    ctx.strokeStyle = '#140206';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = rgba(HT.vein, 0.7);
    ctx.lineWidth = 0.9;
    for (const x of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.moveTo(x, 2);
      ctx.quadraticCurveTo(x * 1.3, 30, x * 0.4, 60);
      ctx.stroke();
    }
    // black cartilage rim
    path(ctx, [[-24, 0], [-26, 30, -16, 58, 0, 66], [16, 58, 26, 30, 24, 0]], false);
    ctx.strokeStyle = '#2a2a36';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    emissive(ctx, info, 0, 58, 8, HT.glow, 0.4);
  },
});
