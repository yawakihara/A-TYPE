/**
 * BLOOM MOTHER (final boss) art: chitin petals, the seed-heart core, the root mass,
 * petal eyes and seed bombs. Original design.
 */
import { defineSprite } from '../sprites.js';
import { lin, rad, solid, line, circle, ellipse, emissive, path } from './kit.js';
import { eye } from './enemies1.js';
import { HT } from './enemies6.js';
import { hash1 } from '../../core/rng.js';
import { rgba } from '../../core/math.js';

/** One petal pointing along +x from its base at the origin. */
defineSprite('mother_petal', {
  w: 112,
  h: 46,
  ox: 6,
  oy: 23,
  outline: true,
  draw(ctx, f, info) {
    path(ctx, [[0, -8], [30, -22, 70, -20, 104, -2], [106, 0], [104, 2], [70, 18, 30, 20, 0, 8]]);
    ctx.fillStyle = lin(ctx, 0, -22, 0, 20, [[0, '#ff8aa0'], [0.18, '#a01a34'], [0.55, '#4a0614'], [1, '#14020a']]);
    ctx.fill();
    ctx.strokeStyle = '#0a0105';
    ctx.lineWidth = 1;
    ctx.stroke();
    // white-hot vein running along the petal
    ctx.strokeStyle = rgba('#ffd0dc', 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.quadraticCurveTo(50, -6, 100, -1);
    ctx.stroke();
    ctx.strokeStyle = rgba(HT.vein, 0.6);
    ctx.lineWidth = 0.7;
    for (let i = 1; i < 6; i++) {
      const x = i * 16;
      ctx.beginPath();
      ctx.moveTo(x, -3);
      ctx.quadraticCurveTo(x + 6, -10, x + 12, -14 + i * 1.5);
      ctx.moveTo(x, -1);
      ctx.quadraticCurveTo(x + 6, 7, x + 12, 12 - i * 1.5);
      ctx.stroke();
    }
    // black chitin plates on the back half
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * 18;
      path(ctx, [[x, 7], [x + 8, 14 - i, x + 16, 12 - i], [x + 12, 5]]);
      ctx.fillStyle = lin(ctx, x, 5, x, 14, [[0, '#3a3a48'], [1, '#0c0c12']]);
      ctx.fill();
    }
    // eye socket
    ellipse(ctx, 44, -4, 7, 5, 0, '#14020a', '#0a0105', 0.6);
    emissive(ctx, info, 100, 0, 8, HT.glow, 0.5);
  },
});

defineSprite('mother_core', {
  w: 64,
  h: 64,
  frames: 3,
  outline: false,
  draw(ctx, f, info) {
    const s = [1, 1.06, 0.95][f];
    // membrane womb
    circle(ctx, 0, 0, 24 * s, rad(ctx, -6, -6, 2, 26 * s, [[0, rgba('#ffd8e4', 0.95)], [0.4, rgba('#e04a6a', 0.9)], [0.8, rgba('#6a0a20', 0.95)], [1, '#1a0208']]), '#0a0105', 1.2);
    // veins
    ctx.strokeStyle = 'rgba(120,10,30,0.6)';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 23 * s, Math.sin(a) * 23 * s);
      ctx.quadraticCurveTo(Math.cos(a + 0.4) * 14, Math.sin(a + 0.4) * 14, Math.cos(a) * 9, Math.sin(a) * 9);
      ctx.stroke();
    }
    // the seed: a crystalline, white-gold heart of the Bloom
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + f * 0.2;
      const rr = i % 2 ? 6 : 10;
      pts.push([Math.cos(a) * rr * s, Math.sin(a) * rr * s]);
    }
    solid(ctx, pts, rad(ctx, -2, -2, 1, 10, [[0, '#ffffff'], [0.4, '#fff0a0'], [1, '#ff8a3a']]), { line: '#5a1a04', lw: 0.6 });
    emissive(ctx, info, 0, 0, 30, '#ffd0a0', 0.6);
  },
});

defineSprite('mother_root', {
  w: 180,
  h: 250,
  ox: 30,
  oy: 125,
  outline: false,
  draw(ctx, f, info) {
    // massive root body anchoring the flower to the heart wall
    path(ctx, [[-20, -125], [40, -100, 20, -40, -10, -20], [-24, 0], [-10, 20], [20, 40, 40, 100, -20, 125], [150, 125], [150, -125]]);
    ctx.fillStyle = lin(ctx, -20, 0, 150, 0, [[0, '#5a0a1e'], [0.3, '#3a0412'], [1, '#12020a']]);
    ctx.fill();
    ctx.strokeStyle = '#0a0105';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // black machine conduits fused in
    for (let i = 0; i < 7; i++) {
      const y = -110 + i * 36;
      solid(ctx, [[30, y], [150, y - 4], [150, y + 4], [30, y + 7]], lin(ctx, 0, y - 4, 0, y + 7, [[0, '#4a4a5a'], [0.5, '#1c1c26'], [1, '#0a0a10']]));
      circle(ctx, 60 + (i % 3) * 25, y + 2, 2, HT.vein);
      emissive(ctx, info, 60 + (i % 3) * 25, y + 2, 6, HT.vein, 0.6);
    }
    // pulsing veins
    ctx.strokeStyle = rgba(HT.vein, 0.55);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      const y = -120 + hash1(i * 7) * 240;
      ctx.beginPath();
      ctx.moveTo(150, y);
      ctx.bezierCurveTo(100, y + 20, 60, y - 20, 0, y * 0.3);
      ctx.stroke();
    }
  },
});

defineSprite('mother_eye', {
  w: 18,
  h: 14,
  frames: 2,
  outline: false,
  draw(ctx, f, info) {
    eye(ctx, info, 0, 0, f ? 5 : 4.2, '#ffe060');
  },
});

defineSprite('seedbomb', {
  w: 16,
  h: 16,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 ? 3.5 : 6;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    solid(ctx, pts, rad(ctx, -1, -1, 0.5, 6, [[0, '#ffffff'], [0.5, '#fff0a0'], [1, '#ff6a3a']]), { line: '#4a1004', lw: 0.5 });
    if (f) emissive(ctx, info, 0, 0, 8, '#ffd0a0', 0.8);
  },
});
