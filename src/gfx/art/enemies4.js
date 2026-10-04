/**
 * Stage 4 (the foundry) art: welder drone, crusher piston, rail turret, scrap tank,
 * assembler (mid-boss) + saw blade. Rust, hazard paint and molten glow. Original designs.
 */
import { defineSprite } from '../sprites.js';
import { lin, rad, metal, solid, line, circle, ellipse, emissive, rivet, path } from './kit.js';
import { BL, eye } from './enemies1.js';

export const FD = { steel: '#5a5652', rust: '#8a4a28', dark: '#120e0c', hazard: '#e8b818', molten: '#ff7a1a', glow: '#ffb040' };

function hazardBand(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = FD.hazard;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#16120a';
  for (let k = -h; k < w + h; k += h * 1.6) {
    ctx.beginPath();
    ctx.moveTo(x + k, y + h);
    ctx.lineTo(x + k + h * 0.8, y + h);
    ctx.lineTo(x + k + h * 1.6, y);
    ctx.lineTo(x + k + h * 0.8, y);
    ctx.fill();
  }
  ctx.restore();
}

defineSprite('welder', {
  w: 24,
  h: 20,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    // rotor housing
    solid(ctx, [[-8, -6], [8, -6], [10, -3], [-10, -3]], metal(ctx, -6, -3, '#6a6660'), { line: FD.dark, lw: 0.5 });
    line(ctx, [[-11, -7.5], [11, -7.5]], f ? 'rgba(220,220,220,0.8)' : 'rgba(220,220,220,0.3)', 0.8);
    // body
    solid(ctx, [[-9, -3], [9, -3], [7, 5], [-7, 5]], lin(ctx, 0, -3, 0, 5, [[0, '#b0a090'], [0.5, FD.rust], [1, '#3a2014']]), { line: FD.dark });
    hazardBand(ctx, -7, 2.5, 14, 2);
    // welding arm + torch (points left)
    line(ctx, [[-6, 2], [-10, 6], [-13, 5]], FD.dark, 1.8);
    line(ctx, [[-6, 2], [-10, 6], [-13, 5]], '#9a948c', 0.9);
    circle(ctx, -13.5, 5, 1.4, '#ffffff');
    emissive(ctx, info, -13.5, 5, f ? 6 : 4, '#7fd8ff', 0.9);
    eye(ctx, info, 3, 0.5, 1.8, FD.glow);
  },
});

defineSprite('crusher', {
  w: 40,
  h: 46,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-17, -20], [17, -20], [17, 20], [-17, 20]], lin(ctx, -17, 0, 17, 0, [[0, '#3a3632'], [0.3, '#7a746c'], [0.6, '#5a5550'], [1, '#2a2622']]), { line: FD.dark, lw: 0.8 });
    hazardBand(ctx, -17, 14, 34, 6);
    for (const x of [-12, -4, 4, 12]) rivet(ctx, x, -16, 0.7);
    line(ctx, [[-17, -6], [17, -6]], 'rgba(0,0,0,0.45)', 0.8);
    line(ctx, [[-17, 4], [17, 4]], 'rgba(0,0,0,0.45)', 0.8);
    // teeth
    for (let x = -15; x <= 13; x += 4) solid(ctx, [[x, 20], [x + 2, 23], [x + 4, 20]], '#8a847c', { line: FD.dark, lw: 0.4 });
    circle(ctx, 0, -1, 2.6, '#2a0a06', FD.dark, 0.4);
    emissive(ctx, info, 0, -1, 4, '#ff4020', 0.5);
  },
});

defineSprite('crusher_rod', {
  w: 12,
  h: 20,
  outline: false,
  draw(ctx) {
    solid(ctx, [[-4, -10], [4, -10], [4, 10], [-4, 10]], lin(ctx, -4, 0, 4, 0, [[0, '#4a4642'], [0.4, '#c8c0b4'], [1, '#3a3632']]));
  },
});

defineSprite('railgun', {
  w: 28,
  h: 18,
  ox: 14,
  oy: 12,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-12, 5], [-10, -1], [10, -1], [12, 5]], metal(ctx, -1, 5, FD.steel), { line: FD.dark });
    hazardBand(ctx, -11, 3, 22, 2);
    solid(ctx, [[-6, -1], [-5, -7], [5, -7], [6, -1]], lin(ctx, 0, -7, 0, -1, [[0, '#8a847c'], [1, '#3a3632']]), { line: FD.dark });
    circle(ctx, 0, -4, 2, f ? '#bff8ff' : '#2a4a5a', FD.dark, 0.4);
    if (f) emissive(ctx, info, 0, -4, 6, '#7ff4ff', 0.8);
  },
});

defineSprite('railgun_barrel', {
  w: 30,
  h: 8,
  ox: 2,
  oy: 4,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    for (const oy of [-1.8, 1.8]) solid(ctx, [[0, oy - 1], [24, oy - 0.8], [24, oy + 0.8], [0, oy + 1]], metal(ctx, oy - 1, oy + 1, '#9a948c'), { line: FD.dark, lw: 0.35 });
    if (f) {
      line(ctx, [[2, 0], [23, 0]], '#bff8ff', 0.8);
      emissive(ctx, info, 24, 0, 4, '#7ff4ff', 0.8);
    }
  },
});

defineSprite('tank', {
  w: 26,
  h: 18,
  ox: 13,
  oy: 12,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    // treads
    solid(ctx, [[-11, 2], [11, 2], [12, 4.5], [10, 7], [-10, 7], [-12, 4.5]], '#2a2622', { line: FD.dark, lw: 0.5 });
    for (let x = -9 + (f ? 1.5 : 0); x < 10; x += 3) circle(ctx, x, 4.5, 1.1, '#6a6660');
    // hull
    solid(ctx, [[-10, 2], [-8, -4], [8, -4], [10, 2]], lin(ctx, 0, -4, 0, 2, [[0, '#c0a080'], [0.5, FD.rust], [1, '#3a2014']]), { line: FD.dark });
    solid(ctx, [[-4, -4], [-3, -8], [4, -8], [5, -4]], metal(ctx, -8, -4, '#6a6660'), { line: FD.dark, lw: 0.5 });
    eye(ctx, info, 0, -6, 1.4, '#ff6030');
  },
});

defineSprite('tank_gun', {
  w: 16,
  h: 6,
  ox: 1,
  oy: 3,
  outline: true,
  draw(ctx) {
    solid(ctx, [[0, -1], [11, -0.8], [11, 0.8], [0, 1]], metal(ctx, -1, 1, '#8a847c'), { line: FD.dark, lw: 0.35 });
  },
});

defineSprite('assembler', {
  w: 56,
  h: 56,
  outline: true,
  draw(ctx, f, info) {
    const hex = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      hex.push([Math.cos(a) * 20, Math.sin(a) * 20]);
    }
    solid(ctx, hex, lin(ctx, 0, -20, 0, 20, [[0, '#c8b49a'], [0.35, '#8a6a4a'], [0.7, '#5a3a24'], [1, '#2a1a10']]), { line: FD.dark, lw: 1 });
    hazardBand(ctx, -17, -3, 34, 6);
    for (let i = 0; i < 6; i++) rivet(ctx, hex[i][0] * 0.82, hex[i][1] * 0.82, 0.8);
    circle(ctx, 0, 0, 9.5, '#14100e', FD.dark, 0.8);
    circle(ctx, 0, 0, 7.5, rad(ctx, -2, -2, 1, 8, [[0, '#ffffff'], [0.3, '#7ff4ff'], [0.8, '#1a5a7a'], [1, '#08202a']]));
    emissive(ctx, info, 0, 0, 14, '#7ff4ff', 0.5);
    // bloom tendrils clinging to the casing
    for (const [x, y] of [[-14, -12], [12, 14], [16, -8]]) {
      ellipse(ctx, x, y, 4, 2.2, 0.5, lin(ctx, x, y - 2, x, y + 2, [[0, BL.flesh], [1, BL.fleshDk]]), BL.dark, 0.4);
    }
  },
});

defineSprite('assembler_arm', {
  w: 30,
  h: 10,
  ox: 2,
  oy: 5,
  outline: true,
  draw(ctx) {
    solid(ctx, [[0, -2.5], [22, -2], [22, 2], [0, 2.5]], metal(ctx, -2.5, 2.5, '#7a746c'), { line: FD.dark, lw: 0.5 });
    circle(ctx, 0, 0, 3.4, metal(ctx, -3.4, 3.4, '#5a5550'), FD.dark, 0.5);
    circle(ctx, 22, 0, 2.6, metal(ctx, -2.6, 2.6, '#5a5550'), FD.dark, 0.5);
  },
});

defineSprite('saw', {
  w: 26,
  h: 26,
  frames: 4,
  outline: true,
  draw(ctx, f) {
    const a0 = (f / 4) * (Math.PI / 6);
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const a = a0 + (i / 24) * Math.PI * 2;
      const rr = i % 2 ? 9 : 11.5;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    solid(ctx, pts, rad(ctx, -3, -3, 1, 12, [[0, '#ffffff'], [0.5, '#c8c4bc'], [1, '#6a665e']]), { line: FD.dark, lw: 0.6 });
    circle(ctx, 0, 0, 3.2, '#3a3632', FD.dark, 0.5);
    for (let i = 0; i < 3; i++) {
      const a = a0 * 2 + (i / 3) * Math.PI * 2;
      circle(ctx, Math.cos(a) * 6, Math.sin(a) * 6, 1.2, '#4a4642');
    }
  },
});
