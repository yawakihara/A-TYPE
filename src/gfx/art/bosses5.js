/** COIL WYRM (stage 5 boss) art: skull-plated head, lower jaw, body segments with glands. Original design. */
import { defineSprite } from '../sprites.js';
import { lin, rad, solid, line, circle, ellipse, emissive, path } from './kit.js';
import { eye } from './enemies1.js';
import { SN } from './enemies5.js';

defineSprite('wyrm_head', {
  w: 84,
  h: 60,
  ox: 40,
  oy: 30,
  outline: true,
  draw(ctx, f, info) {
    // skull: snout points left
    path(ctx, [[-38, 2], [-30, -12, -10, -24, 14, -24], [30, -22, 40, -12, 40, 0], [40, 10, 30, 18, 14, 18], [-10, 16, -28, 12, -38, 2]]);
    ctx.fillStyle = lin(ctx, 0, -24, 0, 18, [[0, '#fff6e0'], [0.35, SN.bone], [0.75, '#9a8460'], [1, SN.boneDk]]);
    ctx.fill();
    ctx.strokeStyle = SN.dark;
    ctx.lineWidth = 1;
    ctx.stroke();
    // crest spines
    for (let i = 0; i < 5; i++) {
      const x = -4 + i * 9;
      solid(ctx, [[x - 4, -22], [x + 2, -36 + i * 2], [x + 4, -22]], lin(ctx, x, -36, x, -22, [[0, '#ffffff'], [1, '#a89068']]), { line: SN.dark, lw: 0.6 });
    }
    // plate seams
    for (const x of [-18, -2, 14, 28]) line(ctx, [[x, -22], [x - 3, 16]], 'rgba(90,70,40,0.55)', 0.8);
    // upper fangs
    for (let i = 0; i < 6; i++) solid(ctx, [[-34 + i * 6, 6], [-32 + i * 6, 13], [-30 + i * 6, 6]], '#fffaf0', { line: SN.dark, lw: 0.4 });
    // eye sockets
    ellipse(ctx, -12, -8, 7, 5, -0.2, '#1a0604', SN.dark, 0.6);
    eye(ctx, info, -12, -8, 4, SN.gland);
    ellipse(ctx, 6, -10, 4, 3, -0.2, '#1a0604', SN.dark, 0.5);
    eye(ctx, info, 6, -10, 2.4, SN.gland);
    // nostril vents
    ellipse(ctx, -32, -2, 2.2, 1.2, -0.4, '#2a0a06');
  },
});

defineSprite('wyrm_jaw', {
  w: 70,
  h: 26,
  ox: 30,
  oy: 4,
  outline: true,
  draw(ctx) {
    path(ctx, [[-32, 0], [-20, 12, 10, 14, 30, 6], [32, 0], [0, 2, -20, 2, -32, 0]]);
    ctx.fillStyle = lin(ctx, 0, 0, 0, 14, [[0, '#f0e0c0'], [1, SN.boneDk]]);
    ctx.fill();
    ctx.strokeStyle = SN.dark;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    for (let i = 0; i < 6; i++) solid(ctx, [[-28 + i * 6, 1.5], [-26 + i * 6, -5], [-24 + i * 6, 1.5]], '#fffaf0', { line: SN.dark, lw: 0.4 });
  },
});

defineSprite('wyrm_mouth', {
  w: 40,
  h: 30,
  outline: false,
  draw(ctx, f, info) {
    ellipse(ctx, 0, 0, 16, 11, 0, rad(ctx, 0, 0, 1, 16, [[0, '#ffe0a0'], [0.35, SN.gland], [0.7, '#7a1406'], [1, '#1a0402']]));
    emissive(ctx, info, 0, 0, 20, SN.gland, 0.6);
  },
});

defineSprite('wyrm_seg', {
  w: 50,
  h: 50,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 20, lin(ctx, 0, -20, 0, 20, [[0, SN.sinew], [1, SN.sinewDk]]), SN.dark, 1);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.45;
      ctx.save();
      ctx.rotate(a);
      path(ctx, [[0, -21], [7, -19, 10, -9, 8, -1], [0, -6], [-8, -1], [-10, -9, -7, -19, 0, -21]]);
      ctx.fillStyle = lin(ctx, 0, -21, 0, 0, [[0, '#fff4dc'], [0.55, SN.bone], [1, SN.boneDk]]);
      ctx.fill();
      ctx.strokeStyle = SN.dark;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    }
    if (f === 1) {
      // exposed gland node (weak spot)
      circle(ctx, 0, 8, 6.5, rad(ctx, -1, 6, 1, 7, [[0, '#ffffff'], [0.3, '#ffd080'], [0.7, SN.gland], [1, '#601404']]), SN.dark, 0.7);
      emissive(ctx, info, 0, 8, 14, SN.gland, 0.7);
    } else {
      circle(ctx, 0, 9, 3, SN.sinew, SN.dark, 0.5);
    }
  },
});
