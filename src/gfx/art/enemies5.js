/**
 * Stage 5 (the living tunnel) art: leech, spitter maw, bone spike, cyst, wyrmling,
 * and the giant tail used by the mid-boss. Bone, sinew and ember-orange glands. Original designs.
 */
import { defineSprite } from '../sprites.js';
import { lin, rad, solid, line, circle, ellipse, emissive, path } from './kit.js';
import { BL, eye } from './enemies1.js';
import { rgba } from '../../core/math.js';

export const SN = { bone: '#d8c8a4', boneDk: '#6a5a40', sinew: '#8a2a2a', sinewDk: '#3a0c0c', gland: '#ff8a3a', dark: '#140806' };

defineSprite('leech', {
  w: 22,
  h: 12,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    const wig = f ? 1 : -1;
    path(ctx, [[-8, 0], [-4, -4, 3, -3.5 + wig, 9, wig], [3, 3.5 + wig, -4, 4, -8, 0]]);
    ctx.fillStyle = lin(ctx, 0, -4, 0, 4, [[0, '#f0d8b0'], [0.5, '#c88a6a'], [1, '#5a2a1a']]);
    ctx.fill();
    ctx.strokeStyle = SN.dark;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    for (const x of [-3, 0.5, 4, 7]) line(ctx, [[x, -3], [x - 0.5, 3]], 'rgba(90,30,20,0.5)', 0.45);
    // sucker mouth with teeth (front = left)
    circle(ctx, -8, 0, 3, '#3a0808', SN.dark, 0.5);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      circle(ctx, -8 + Math.cos(a) * 2, Math.sin(a) * 2, 0.5, '#fff0e0');
    }
    emissive(ctx, info, 5, 0, 3, SN.gland, 0.4);
  },
});

defineSprite('spitter', {
  w: 28,
  h: 22,
  ox: 14,
  oy: 18,
  frames: 3,
  outline: true,
  draw(ctx, f, info) {
    const open = [0, 0.5, 1][f];
    // fleshy socket
    path(ctx, [[-12, 4], [-10, -6, 10, -6, 12, 4]]);
    ctx.fillStyle = lin(ctx, 0, -6, 0, 4, [[0, SN.sinew], [1, SN.sinewDk]]);
    ctx.fill();
    // throat
    if (open > 0) {
      ellipse(ctx, 0, -6 - open * 3, 5 + open * 2, 2 + open * 3, 0, rad(ctx, 0, -6, 1, 8, [[0, '#ffb070'], [0.4, '#c02a1a'], [1, '#2a0404']]));
      emissive(ctx, info, 0, -7 - open * 3, 6 + open * 3, SN.gland, 0.6);
    }
    // bony jaws
    for (const s of [-1, 1]) {
      const a = s * (0.15 + open * 0.55);
      ctx.save();
      ctx.translate(s * 2, -5);
      ctx.rotate(a);
      path(ctx, [[0, 0], [s * -1, -10, s * 7, -12], [s * 6, -4, s * 6, 0]]);
      ctx.fillStyle = lin(ctx, 0, -12, 0, 0, [[0, '#fff4dc'], [1, SN.boneDk]]);
      ctx.fill();
      ctx.strokeStyle = SN.dark;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      for (let k = 0; k < 3; k++) solid(ctx, [[s * (1 + k * 1.8), -3 - k * 2], [s * (2 + k * 1.8), -1.5 - k * 2], [s * (1.2 + k * 1.8), -1 - k * 2]], '#fff8ec');
      ctx.restore();
    }
  },
});

defineSprite('spike', {
  w: 14,
  h: 46,
  ox: 7,
  oy: 44,
  outline: true,
  draw(ctx) {
    path(ctx, [[-5, 0], [-1, -42], [0, -43], [1, -42], [5, 0]]);
    ctx.fillStyle = lin(ctx, -5, 0, 5, 0, [[0, SN.boneDk], [0.4, '#fff4dc'], [1, '#8a7a5a']]);
    ctx.fill();
    ctx.strokeStyle = SN.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    for (let y = -6; y > -38; y -= 6) line(ctx, [[-4 + (-y / 42) * 3.5, y], [4 - (-y / 42) * 3.5, y]], 'rgba(90,70,40,0.6)', 0.5);
  },
});

defineSprite('cyst', {
  w: 22,
  h: 22,
  frames: 3,
  outline: false,
  draw(ctx, f, info) {
    const s = [1, 1.08, 0.95][f];
    circle(ctx, 0, 0, 8 * s, rad(ctx, -2, -2, 1, 9 * s, [[0, rgba('#ffe0c0', 0.9)], [0.6, rgba('#d0603a', 0.75)], [1, rgba('#5a1408', 0.9)]]), '#2a0604', 0.7);
    ellipse(ctx, 0.5, 0.5, 3.5, 2.6, 0.4, '#3a0a06');
    circle(ctx, -0.5, 0, 0.9, SN.gland);
    ctx.strokeStyle = 'rgba(120,20,10,0.6)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 7.5 * s, Math.sin(a) * 7.5 * s);
      ctx.quadraticCurveTo(Math.cos(a + 0.4) * 4, Math.sin(a + 0.4) * 4, Math.cos(a) * 2, Math.sin(a) * 2);
      ctx.stroke();
    }
    circle(ctx, -3, -3.5, 1.4, 'rgba(255,255,255,0.7)');
    emissive(ctx, info, 0, 0, 10, SN.gland, 0.35);
  },
});

defineSprite('wyrmling_head', {
  w: 20,
  h: 16,
  outline: true,
  draw(ctx, f, info) {
    path(ctx, [[-8, 0], [-5, -6, 4, -6, 7, -2], [7, 2], [4, 6, -5, 6, -8, 0]]);
    ctx.fillStyle = lin(ctx, 0, -6, 0, 6, [[0, '#fff0d0'], [0.5, SN.bone], [1, SN.boneDk]]);
    ctx.fill();
    ctx.strokeStyle = SN.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    solid(ctx, [[-8, 0], [-11, -2], [-10, 0], [-11, 2]], '#fff8ec', { line: SN.dark, lw: 0.4 });
    eye(ctx, info, -3, -2.5, 1.3, SN.gland);
    eye(ctx, info, -3, 2.5, 1.3, SN.gland);
  },
});

defineSprite('wyrmling_seg', {
  w: 14,
  h: 14,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 5, lin(ctx, 0, -5, 0, 5, [[0, '#f0e0c0'], [0.5, SN.bone], [1, SN.boneDk]]), SN.dark, 0.5);
    line(ctx, [[-2, -4.6], [-2, 4.6]], 'rgba(80,60,30,0.6)', 0.6);
    circle(ctx, 1, 0, 1.1, SN.sinew);
    void info;
  },
});

defineSprite('tail_seg', {
  w: 38,
  h: 38,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 15, lin(ctx, 0, -15, 0, 15, [[0, SN.sinew], [1, SN.sinewDk]]), SN.dark, 0.8);
    // overlapping bone plates
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      ctx.save();
      ctx.rotate(a);
      path(ctx, [[0, -15.5], [6, -14, 8, -6, 6, 0], [0, -4], [-6, 0], [-8, -6, -6, -14, 0, -15.5]]);
      ctx.fillStyle = lin(ctx, 0, -16, 0, 0, [[0, '#fff4dc'], [0.6, SN.bone], [1, SN.boneDk]]);
      ctx.fill();
      ctx.strokeStyle = SN.dark;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
    circle(ctx, 0, 6, 2.2, SN.gland);
    emissive(ctx, info, 0, 6, 6, SN.gland, 0.5);
  },
});

defineSprite('tail_stinger', {
  w: 46,
  h: 26,
  ox: 30,
  oy: 13,
  outline: true,
  draw(ctx, f, info) {
    // venom gland (weak point) at the base, barb points left
    ellipse(ctx, 4, 0, 11, 9, 0, rad(ctx, 2, -2, 1, 11, [[0, '#ffe0a0'], [0.4, SN.gland], [1, '#7a1a08']]), SN.dark, 0.7);
    emissive(ctx, info, 4, 0, 14, SN.gland, 0.6);
    path(ctx, [[-5, -6], [-18, -4, -28, -1, -30, 0], [-28, 1, -18, 4, -5, 6]]);
    ctx.fillStyle = lin(ctx, -30, 0, -5, 0, [[0, '#fffaf0'], [0.5, SN.bone], [1, SN.boneDk]]);
    ctx.fill();
    ctx.strokeStyle = SN.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    for (const s of [-1, 1]) solid(ctx, [[-14, s * 3], [-18, s * 9], [-20, s * 3]], '#f0e4c8', { line: SN.dark, lw: 0.5 });
  },
});
