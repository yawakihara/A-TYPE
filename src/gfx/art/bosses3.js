/** LEVIATHAN CORE (stage 3 boss) art: armoured bow, reactor core, shutters, main cannon. Original design. */
import { defineSprite } from '../sprites.js';
import { lin, rad, metal, solid, line, circle, ellipse, emissive, rivet, path } from './kit.js';
import { BL } from './enemies1.js';
import { NAVY } from './enemies3.js';
import { hash1 } from '../../core/rng.js';

defineSprite('bship_bow', {
  w: 230,
  h: 232,
  ox: 40,
  oy: 116,
  outline: false,
  draw(ctx, f, info) {
    // prow silhouette: a wedge pointing left with a gaping cannon mouth in the middle
    const hull = [[-36, -18], [-20, -46], [10, -78], [60, -112], [190, -116], [190, 116], [60, 112], [10, 78], [-20, 46], [-36, 18]];
    solid(ctx, hull, lin(ctx, 0, -116, 0, 116, [[0, '#7c8a84'], [0.25, '#56625c'], [0.5, '#3a4440'], [0.75, '#2a322f'], [1, '#141a18']]), { line: NAVY.dark, lw: 1.4 });
    // armour plate seams
    for (let i = 0; i < 9; i++) {
      const x = -10 + i * 22;
      line(ctx, [[x, -100 + Math.max(0, 40 - i * 12)], [x + 4, 100 - Math.max(0, 40 - i * 12)]], 'rgba(0,0,0,0.35)', 0.8);
    }
    for (const y of [-70, -40, 40, 70]) line(ctx, [[-10, y], [190, y * 1.2]], 'rgba(0,0,0,0.3)', 0.8);
    for (let i = 0; i < 26; i++) rivet(ctx, 10 + hash1(i) * 170, -100 + hash1(i + 50) * 200, 0.7);
    // upper and lower gun sponsons
    for (const s of [-1, 1]) {
      solid(ctx, [[30, s * 60], [70, s * 58], [80, s * 86], [36, s * 90]], metal(ctx, s * 58, s * 90, '#4c5752'), { line: NAVY.dark });
      ctx.fillStyle = NAVY.yellow;
      ctx.fillRect(34, s * 74 - 1, 40, 2);
    }
    // cannon mouth housing (dark recess where core + muzzle sit)
    path(ctx, [[-30, -16], [10, -34], [70, -36], [70, 36], [10, 34], [-30, 16]]);
    ctx.fillStyle = rad(ctx, 30, 0, 4, 60, [[0, '#2a1410'], [0.6, '#120806'], [1, '#050303']]);
    ctx.fill();
    ctx.strokeStyle = '#020202';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // hazard chevrons on the lip
    ctx.save();
    path(ctx, [[-36, -18], [-30, -16], [-30, 16], [-36, 18]]);
    ctx.clip();
    for (let y = -20; y < 20; y += 6) {
      ctx.fillStyle = (y / 6) % 2 ? NAVY.yellow : '#141008';
      ctx.fillRect(-36, y, 8, 3);
    }
    ctx.restore();
    // registry stripe and lights
    ctx.fillStyle = NAVY.red;
    ctx.fillRect(100, -112, 6, 224);
    for (let i = 0; i < 6; i++) {
      const y = -90 + i * 36;
      circle(ctx, 150, y, 1.8, '#ffd890', '#000', 0.4);
      emissive(ctx, info, 150, y, 5, '#ffd890', 0.6);
    }
    // the Bloom has rooted into the bow
    for (let i = 0; i < 16; i++) {
      const x = 20 + hash1(i * 7) * 160;
      const y = (hash1(i * 3 + 1) - 0.5) * 200;
      if (Math.abs(y) < 44 && x < 80) continue;
      ellipse(ctx, x, y, 6 + hash1(i) * 9, 3 + hash1(i + 9) * 5, hash1(i + 4) * 3, lin(ctx, x, y - 5, x, y + 5, [[0, BL.flesh], [1, BL.fleshDk]]), BL.dark, 0.5);
      if (hash1(i + 30) < 0.5) emissive(ctx, info, x, y, 5, BL.bio, 0.5);
    }
  },
});

defineSprite('bship_core', {
  w: 44,
  h: 44,
  frames: 3,
  outline: false,
  draw(ctx, f, info) {
    const s = [1, 1.06, 0.96][f];
    circle(ctx, 0, 0, 17 * s, rad(ctx, -4, -4, 1, 18 * s, [[0, '#ffffff'], [0.25, '#ffe080'], [0.6, '#ff7020'], [1, '#601004']]), '#200402', 1);
    ctx.strokeStyle = 'rgba(255,240,200,0.7)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 12 * s, 4 + i * 3, i * 1.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    emissive(ctx, info, 0, 0, 30, '#ff8030', 0.6);
  },
});

defineSprite('bship_shutter', {
  w: 56,
  h: 30,
  ox: 28,
  oy: 28,
  outline: true,
  draw(ctx) {
    // top shutter (mirrored at runtime for the bottom)
    solid(ctx, [[-26, -26], [26, -26], [26, 0], [-26, 0]], metal(ctx, -26, 0, '#5c6862'), { line: NAVY.dark, rim: 'rgba(255,255,255,0.3)' });
    for (let x = -22; x <= 22; x += 11) line(ctx, [[x, -24], [x, -2]], 'rgba(0,0,0,0.35)', 0.8);
    for (let x = -26; x < 26; x += 6) {
      ctx.fillStyle = (x / 6) % 2 ? NAVY.yellow : '#141008';
      ctx.fillRect(x, -3, 6, 3);
    }
  },
});
