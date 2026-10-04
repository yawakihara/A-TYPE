/**
 * Stage 3 (the dreadnought) art: deck guns, flak mount, missile silo + missile, laser fin,
 * exhaust vent, stern engine, command tower + radar, belly mine dropper. Original designs.
 */
import { defineSprite } from '../sprites.js';
import { lin, rad, metal, solid, line, circle, ellipse, emissive, rivet, path } from './kit.js';
import { BL, eye } from './enemies1.js';
import { hash1 } from '../../core/rng.js';

export const NAVY = { steel: '#4c5752', hi: '#a4b4aa', dark: '#0f1412', red: '#d83a30', yellow: '#e0b020' };

function bloomPatch(ctx, info, x, y, s) {
  ellipse(ctx, x, y, 4 * s, 2.4 * s, 0.3, lin(ctx, x, y - 2 * s, x, y + 2 * s, [[0, BL.flesh], [1, BL.fleshDk]]), BL.dark, 0.4);
  circle(ctx, x + s, y - 0.5 * s, 0.9 * s, BL.bio);
  emissive(ctx, info, x + s, y - 0.5 * s, 3 * s, BL.bio, 0.4);
}

defineSprite('bship_turret', {
  w: 30,
  h: 18,
  ox: 15,
  oy: 12,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-13, 5], [-11, 0], [11, 0], [13, 5]], metal(ctx, 0, 5, NAVY.steel), { line: NAVY.dark });
    path(ctx, [[-9, 0.5], [-9, -9, 9, -9, 9, 0.5]]);
    ctx.fillStyle = metal(ctx, -8, 0.5, '#5c6862');
    ctx.fill();
    ctx.strokeStyle = NAVY.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    line(ctx, [[-7, -3], [7, -3]], 'rgba(0,0,0,0.35)', 0.5);
    for (const x of [-6, 0, 6]) rivet(ctx, x, 2.5, 0.45);
    ctx.fillStyle = NAVY.yellow;
    ctx.fillRect(-12, 3.6, 24, 0.9);
    bloomPatch(ctx, info, 5, -5, 0.7);
  },
});

defineSprite('bship_barrel', {
  w: 26,
  h: 10,
  ox: 3,
  oy: 5,
  frames: 2,
  outline: true,
  draw(ctx, f) {
    const twin = f === 1;
    for (const oy of twin ? [-2, 2] : [0]) {
      solid(ctx, [[0, oy - 1.6], [20, oy - 1.3], [20, oy + 1.3], [0, oy + 1.6]], metal(ctx, oy - 1.6, oy + 1.6, '#6c7872'), { line: NAVY.dark, lw: 0.45 });
      solid(ctx, [[18, oy - 1.9], [21.5, oy - 1.9], [21.5, oy + 1.9], [18, oy + 1.9]], '#2a302d', { line: NAVY.dark, lw: 0.4 });
    }
    solid(ctx, [[-1, -4], [5, -4], [5, 4], [-1, 4]], metal(ctx, -4, 4, '#3a4440'), { line: NAVY.dark, lw: 0.5 });
  },
});

defineSprite('flak', {
  w: 30,
  h: 22,
  ox: 15,
  oy: 14,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-13, 6], [-12, -2], [12, -2], [13, 6]], metal(ctx, -2, 6, NAVY.steel), { line: NAVY.dark });
    solid(ctx, [[-9, -2], [-7, -9], [7, -9], [9, -2]], metal(ctx, -9, -2, '#68746e'), { line: NAVY.dark });
    for (let i = 0; i < 4; i++) {
      const x = -6 + i * 4;
      line(ctx, [[x, -9], [x - 2 + i, -15]], NAVY.dark, 2.2);
      line(ctx, [[x, -9], [x - 2 + i, -15]], '#8a9690', 1.1);
    }
    circle(ctx, 0, -5, 1.6, NAVY.red);
    emissive(ctx, info, 0, -5, 4, NAVY.red, 0.6);
    for (let k = -10; k <= 10; k += 5) {
      ctx.fillStyle = (k / 5) % 2 ? NAVY.yellow : '#141008';
      ctx.fillRect(k, 4, 5, 1.6);
    }
  },
});

defineSprite('silo', {
  w: 26,
  h: 10,
  ox: 13,
  oy: 6,
  frames: 3,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-12, 3], [-11, -2], [11, -2], [12, 3]], metal(ctx, -2, 3, NAVY.steel), { line: NAVY.dark });
    const open = [0, 3, 6][f];
    ctx.fillStyle = '#080a09';
    ctx.fillRect(-7, -2.5, 14, 2);
    if (f > 0) emissive(ctx, info, 0, -2, 4 + f * 2, '#ff8040', 0.6);
    solid(ctx, [[-7 - open, -3.6], [-open, -3.6], [-open, -2], [-7 - open, -2]], metal(ctx, -3.6, -2, '#7c8882'), { line: NAVY.dark, lw: 0.4 });
    solid(ctx, [[open, -3.6], [7 + open, -3.6], [7 + open, -2], [open, -2]], metal(ctx, -3.6, -2, '#7c8882'), { line: NAVY.dark, lw: 0.4 });
    ctx.fillStyle = NAVY.red;
    ctx.fillRect(-11, 1.2, 3, 1);
    ctx.fillRect(8, 1.2, 3, 1);
  },
});

defineSprite('emissile', {
  w: 16,
  h: 8,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-6, -1.5], [3, -1.5], [6, 0], [3, 1.5], [-6, 1.5]], metal(ctx, -1.5, 1.5, '#d8dcd8'), { line: NAVY.dark, lw: 0.4 });
    solid(ctx, [[3, -1.5], [6, 0], [3, 1.5]], NAVY.red);
    solid(ctx, [[-6, -1.5], [-8, -3.5], [-4.5, -1.5]], '#4a5450');
    solid(ctx, [[-6, 1.5], [-8, 3.5], [-4.5, 1.5]], '#4a5450');
    emissive(ctx, info, -7, 0, 3, '#ffb060', 0.8);
  },
});

defineSprite('laserfin', {
  w: 22,
  h: 30,
  ox: 11,
  oy: 24,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-9, 5], [-4, -16], [4, -16], [9, 5]], metal(ctx, -16, 5, '#56625c'), { line: NAVY.dark });
    line(ctx, [[-2, -14], [-5, 3]], 'rgba(255,255,255,0.25)', 0.6);
    circle(ctx, -4.5, -10, 3.4, '#1a1214', NAVY.dark, 0.5);
    circle(ctx, -4.5, -10, 2.4, f ? '#ffd0c0' : '#a02020');
    if (f) emissive(ctx, info, -4.5, -10, 8, '#ff4030', 0.9);
    ctx.fillStyle = NAVY.yellow;
    ctx.fillRect(-7, 2, 14, 1.2);
  },
});

defineSprite('vent', {
  w: 30,
  h: 10,
  ox: 15,
  oy: 6,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-13, 3], [-12, -3], [12, -3], [13, 3]], metal(ctx, -3, 3, '#3e4844'), { line: NAVY.dark });
    ctx.fillStyle = '#0a0606';
    ctx.fillRect(-10, -2.5, 20, 3);
    for (let x = -9; x <= 9; x += 2.5) {
      ctx.fillStyle = '#6a7470';
      ctx.fillRect(x, -2.5, 0.9, 3);
    }
    emissive(ctx, info, 0, -1, 7, '#ff6020', 0.5);
  },
});

defineSprite('engine', {
  w: 46,
  h: 40,
  ox: 30,
  oy: 20,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    // nozzle bell opening to the left
    path(ctx, [[10, -11], [0, -12, -10, -16, -16, -18], [-16, 18], [-10, 16, 0, 12, 10, 11]]);
    ctx.fillStyle = lin(ctx, 0, -18, 0, 18, [[0, '#a8b4ae'], [0.3, '#5a6660'], [0.7, '#2e3634'], [1, '#141a18']]);
    ctx.fill();
    ctx.strokeStyle = NAVY.dark;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    for (let i = 0; i < 5; i++) line(ctx, [[8 - i * 5, -11 - i], [8 - i * 5, 11 + i]], 'rgba(0,0,0,0.35)', 0.6);
    ellipse(ctx, -15, 0, 4, 17, 0, rad(ctx, -15, 0, 1, 16, [[0, '#ffffff'], [0.3, '#ffd080'], [0.7, '#ff6020'], [1, '#401008']]), NAVY.dark, 0.7);
    emissive(ctx, info, -15, 0, f ? 18 : 15, '#ff8030', 0.8);
    // mount
    solid(ctx, [[10, -13], [16, -13], [16, 13], [10, 13]], metal(ctx, -13, 13, '#3a4440'), { line: NAVY.dark });
    rivet(ctx, 13, -9, 0.6);
    rivet(ctx, 13, 9, 0.6);
  },
});

defineSprite('tower', {
  w: 74,
  h: 150,
  ox: 37,
  oy: 146,
  outline: true,
  draw(ctx, f, info) {
    // stacked bridge decks, widest at the base
    const decks = [[-30, -40, 60, 40], [-24, -76, 48, 36], [-18, -104, 36, 28], [-12, -124, 24, 20]];
    decks.forEach(([x, y, w, h], i) => {
      solid(ctx, [[x, y + h], [x, y + 3], [x + 3, y], [x + w - 3, y], [x + w, y + 3], [x + w, y + h]], metal(ctx, y, y + h, i % 2 ? '#56625c' : '#4c5752'), { line: NAVY.dark, rim: 'rgba(255,255,255,0.3)' });
      // window strip
      const wy = y + 6;
      ctx.fillStyle = '#0a1014';
      ctx.fillRect(x + 4, wy, w - 8, 4);
      for (let k = x + 5; k < x + w - 6; k += 4) {
        const lit = hash1(k * 7 + i) < 0.6;
        ctx.fillStyle = lit ? '#ffd890' : '#24343c';
        ctx.fillRect(k, wy + 1, 2.4, 2);
      }
      for (let k = x + 6; k < x + w - 4; k += 8) rivet(ctx, k, y + h - 3, 0.45);
    });
    // mast + antennae
    line(ctx, [[0, -124], [0, -144]], NAVY.dark, 2.4);
    line(ctx, [[0, -124], [0, -144]], '#8a9690', 1.2);
    line(ctx, [[-8, -136], [8, -136]], '#8a9690', 0.9);
    circle(ctx, 0, -145, 1.6, NAVY.red);
    emissive(ctx, info, 0, -145, 5, NAVY.red, 0.8);
    // hull number band
    ctx.fillStyle = NAVY.yellow;
    ctx.fillRect(-30, -10, 60, 2);
    // bloom infestation crawling up the tower
    for (let i = 0; i < 9; i++) bloomPatch(ctx, info, -26 + hash1(i * 3) * 50, -10 - hash1(i * 5 + 1) * 110, 0.9 + hash1(i) * 0.6);
  },
});

defineSprite('radar', {
  w: 30,
  h: 14,
  frames: 8,
  outline: true,
  draw(ctx, f) {
    const k = Math.cos((f / 8) * Math.PI * 2);
    ellipse(ctx, 0, 0, 12 * Math.abs(k) + 2, 5, 0, lin(ctx, 0, -5, 0, 5, [[0, '#c8d4ce'], [1, '#4a5450']]), NAVY.dark, 0.6);
    line(ctx, [[0, 0], [0, 6]], NAVY.dark, 1.6);
  },
});

defineSprite('dropper', {
  w: 28,
  h: 16,
  ox: 14,
  oy: 4,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-12, -3], [12, -3], [9, 6], [-9, 6]], metal(ctx, -3, 6, '#56625c'), { line: NAVY.dark });
    ctx.fillStyle = '#0a0c0b';
    ctx.fillRect(-5, 5, 10, 2.5);
    circle(ctx, -7, 1, 1.2, f ? NAVY.red : '#501010');
    circle(ctx, 7, 1, 1.2, f ? NAVY.red : '#501010');
    if (f) emissive(ctx, info, 0, 7, 6, '#ff6040', 0.6);
    eye(ctx, info, 0, 1.5, 1.6, '#ffb030');
  },
});

defineSprite('mine', {
  w: 14,
  h: 14,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 4.5, metal(ctx, -4.5, 4.5, '#5a6460'), NAVY.dark, 0.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      line(ctx, [[Math.cos(a) * 4.5, Math.sin(a) * 4.5], [Math.cos(a) * 6.2, Math.sin(a) * 6.2]], NAVY.dark, 1.4);
    }
    circle(ctx, 0, 0, 1.6, f ? '#ff5040' : '#701810');
    if (f) emissive(ctx, info, 0, 0, 6, '#ff5040', 0.8);
  },
});
