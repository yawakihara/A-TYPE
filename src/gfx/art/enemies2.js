/**
 * Stage 2 (hive caverns) art: drifter jelly, polyp, burrower worm, larva, mantis.
 * Translucent flesh, chitin plates and teal bioluminescence. Original designs.
 */
import { defineSprite } from '../sprites.js';
import { lin, rad, solid, line, circle, ellipse, emissive, path } from './kit.js';
import { BL, eye } from './enemies1.js';
import { rgba } from '../../core/math.js';

const TEAL = '#4ff0c0';
const PINK = '#ff7ab8';

// ------------------------------------------------------------------ DRIFTER (jelly)
defineSprite('jelly', {
  w: 26,
  h: 32,
  frames: 4,
  outline: false,
  draw(ctx, f, info) {
    const pulse = [0, 0.6, 1, 0.5][f];
    const bw = 10 - pulse * 1.5;
    const bh = 8 + pulse * 1.5;
    // tentacles
    for (let i = -2; i <= 2; i++) {
      const x0 = i * 3;
      ctx.strokeStyle = rgba(PINK, 0.75);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x0, 2);
      ctx.bezierCurveTo(x0 + Math.sin(f + i) * 3, 8, x0 - Math.sin(f + i * 2) * 3, 14, x0 + Math.sin(f * 1.3 + i) * 2, 20 - pulse * 2);
      ctx.stroke();
    }
    // bell
    path(ctx, [[-bw, 3], [-bw, -bh * 1.5, bw, -bh * 1.5, bw, 3], [bw * 0.5, 1, -bw * 0.5, 1, -bw, 3]]);
    ctx.fillStyle = lin(ctx, 0, -bh, 0, 3, [[0, rgba('#ffd0ea', 0.95)], [0.5, rgba('#c86ab0', 0.8)], [1, rgba('#5a1a50', 0.85)]]);
    ctx.fill();
    ctx.strokeStyle = '#2a0a26';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // inner organs
    ellipse(ctx, 0, -2, bw * 0.45, bh * 0.45, 0, rgba(TEAL, 0.85));
    emissive(ctx, info, 0, -2, bw * 1.2, TEAL, 0.6);
    line(ctx, [[-bw * 0.6, -bh * 0.6], [-bw * 0.2, -bh * 0.9]], 'rgba(255,255,255,0.7)', 0.6);
  },
});

// ------------------------------------------------------------------ POLYP (wall flower-mouth)
defineSprite('polyp', {
  w: 26,
  h: 22,
  ox: 13,
  oy: 18,
  frames: 3,
  outline: true,
  draw(ctx, f, info) {
    // stalk
    path(ctx, [[-5, 4], [-4, -4, 4, -4, 5, 4]]);
    ctx.fillStyle = lin(ctx, 0, -4, 0, 4, [[0, BL.flesh], [1, BL.fleshDk]]);
    ctx.fill();
    // ribbed head
    const open = [0, 0.5, 1][f];
    path(ctx, [[-8, -3], [-9, -12 - open * 2, 9, -12 - open * 2, 8, -3]]);
    ctx.fillStyle = lin(ctx, 0, -13, 0, -3, [[0, BL.shellHi], [1, BL.shell]]);
    ctx.fill();
    ctx.strokeStyle = BL.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    for (const x of [-5, -1.6, 1.6, 5]) line(ctx, [[x, -4], [x * 1.1, -10 - open]], 'rgba(255,255,255,0.18)', 0.5);
    // mouth
    if (open > 0) {
      ellipse(ctx, 0, -12 - open * 2, 4 + open * 2, 1.2 + open * 2, 0, '#1a0410', BL.dark, 0.5);
      for (let i = -2; i <= 2; i++) solid(ctx, [[i * 2 - 0.8, -12 - open * 2 - 1], [i * 2, -12 - open * 2 + 1 + open], [i * 2 + 0.8, -12 - open * 2 - 1]], '#fff0e0');
      emissive(ctx, info, 0, -12 - open * 2, 5 + open * 3, PINK, 0.6);
    } else {
      line(ctx, [[-4, -12], [4, -12]], BL.dark, 0.8);
    }
  },
});

// ------------------------------------------------------------------ BURROWER (worm) head + segment
defineSprite('eel_head', {
  w: 26,
  h: 22,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    const jaw = f ? 3 : 1;
    // mandibles (point along -x, the direction of travel)
    for (const s of [-1, 1]) {
      path(ctx, [[-4, s * 2], [-12, s * (5 + jaw), -13, s * 1], [-8, s * 0.5]]);
      ctx.fillStyle = lin(ctx, -13, 0, -4, 0, [[0, '#fff0d8'], [1, '#a08060']]);
      ctx.fill();
      ctx.strokeStyle = BL.dark;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ellipse(ctx, 2, 0, 9, 8, 0, lin(ctx, 0, -8, 0, 8, [[0, BL.shellHi], [0.55, BL.shell], [1, '#1a0a1e']]), BL.dark, 0.7);
    for (const x of [-1, 3, 7]) line(ctx, [[x, -7.4], [x - 1, 7.4]], 'rgba(0,0,0,0.35)', 0.6);
    eye(ctx, info, -2, -3.5, 2, '#ff6a3a');
    eye(ctx, info, -2, 3.5, 2, '#ff6a3a');
  },
});

defineSprite('eel_seg', {
  w: 18,
  h: 18,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 7, lin(ctx, 0, -7, 0, 7, [[0, BL.shellHi], [0.55, BL.shell], [1, '#1a0a1e']]), BL.dark, 0.6);
    line(ctx, [[-3, -6], [-3, 6]], 'rgba(0,0,0,0.35)', 0.6);
    line(ctx, [[2, -6.5], [2, 6.5]], 'rgba(255,255,255,0.12)', 0.6);
    circle(ctx, 0, 0, 1.6, TEAL);
    emissive(ctx, info, 0, 0, 4, TEAL, 0.5);
  },
});

// ------------------------------------------------------------------ LARVA swarm
defineSprite('larva', {
  w: 14,
  h: 10,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    const wig = f ? 1 : -1;
    path(ctx, [[-5, 0], [-2, -3, 2, -3 + wig, 5, wig * 0.5], [2, 3 + wig, -2, 3, -5, 0]]);
    ctx.fillStyle = lin(ctx, 0, -3, 0, 3, [[0, '#ffd8b0'], [1, '#c06a50']]);
    ctx.fill();
    ctx.strokeStyle = '#3a1008';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    for (const x of [-2, 0.5, 3]) line(ctx, [[x, -2.4], [x, 2.4]], 'rgba(80,20,10,0.5)', 0.4);
    circle(ctx, -3.5, -0.5, 0.9, '#200404');
    emissive(ctx, info, 3, 0, 3, PINK, 0.4);
  },
});

// ------------------------------------------------------------------ MANTIS (mid-boss walker)
defineSprite('mantis', {
  w: 74,
  h: 64,
  ox: 37,
  oy: 40,
  frames: 4,
  outline: true,
  draw(ctx, f, info) {
    const step = (f / 4) * Math.PI * 2;
    // legs
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) {
        const bx = -6 + i * 9;
        const ph = step + i * 2 + (s > 0 ? Math.PI : 0);
        const lift = Math.max(0, Math.sin(ph)) * 3;
        const kx = bx + s * 4 + Math.cos(ph) * 3;
        line(ctx, [[bx, 6], [kx, 12 - lift], [kx - 3, 22 - lift]], BL.dark, 2.6);
        line(ctx, [[bx, 6], [kx, 12 - lift], [kx - 3, 22 - lift]], '#6a5a7a', 1.4);
      }
    }
    // abdomen (weak sac, rear/right)
    ellipse(ctx, 18, 2, 14, 10, -0.2, lin(ctx, 18, -8, 18, 12, [[0, '#ffb0d0'], [0.4, BL.flesh], [1, BL.fleshDk]]), BL.dark, 0.7);
    for (let i = 0; i < 4; i++) line(ctx, [[10 + i * 5, -6 + i], [12 + i * 5, 10 - i]], 'rgba(60,10,30,0.5)', 0.6);
    emissive(ctx, info, 20, 2, 10, PINK, 0.4);
    // thorax plates
    ellipse(ctx, 0, 0, 13, 9, 0, lin(ctx, 0, -9, 0, 9, [[0, BL.shellHi], [0.5, BL.shell], [1, '#140a18']]), BL.dark, 0.7);
    line(ctx, [[-4, -8.5], [-5, 8.5]], 'rgba(0,0,0,0.4)', 0.6);
    line(ctx, [[4, -8.5], [4, 8.5]], 'rgba(0,0,0,0.4)', 0.6);
    // head
    ellipse(ctx, -17, -8, 8, 6, 0.3, lin(ctx, -17, -14, -17, -2, [[0, BL.shellHi], [1, BL.shell]]), BL.dark, 0.6);
    eye(ctx, info, -21, -9, 2.4, BL.bio);
    eye(ctx, info, -16, -11, 1.8, BL.bio);
    // scythe arm (drawn raised; animated arm drawn live)
    solid(ctx, [[-23, -4], [-27, -2], [-22, 2]], '#fff0d8', { line: BL.dark, lw: 0.5 });
  },
});

defineSprite('mantis_scythe', {
  w: 44,
  h: 18,
  ox: 4,
  oy: 9,
  outline: true,
  draw(ctx) {
    solid(ctx, [[0, -2], [16, -3], [16, 2], [0, 2.5]], lin(ctx, 0, -3, 0, 3, [[0, BL.shellHi], [1, BL.shell]]), { line: BL.dark, lw: 0.6 });
    path(ctx, [[15, -3], [30, -8, 38, 2], [30, -2, 16, 2]]);
    ctx.fillStyle = lin(ctx, 15, -6, 38, 2, [[0, '#d8d0c0'], [0.6, '#fff8ec'], [1, '#a89880']]);
    ctx.fill();
    ctx.strokeStyle = BL.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    line(ctx, [[18, -2.5], [34, -3]], 'rgba(255,255,255,0.8)', 0.4);
  },
});
