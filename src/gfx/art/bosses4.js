/** ANVIL (stage 4 boss) art: press frame, sliding hammer, furnace core + grill, rivet gun. Original design. */
import { defineSprite } from '../sprites.js';
import { lin, rad, metal, solid, line, circle, ellipse, emissive, rivet, path } from './kit.js';
import { BL } from './enemies1.js';
import { FD } from './enemies4.js';
import { hash1 } from '../../core/rng.js';

function hazard(ctx, x, y, w, h) {
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

defineSprite('anvil_frame', {
  w: 150,
  h: 240,
  ox: 30,
  oy: 120,
  outline: false,
  draw(ctx, f, info) {
    // two pillars + crossbeams of a monstrous press
    for (const x of [-20, 80]) {
      solid(ctx, [[x, -120], [x + 34, -120], [x + 34, 120], [x, 120]], lin(ctx, x, 0, x + 34, 0, [[0, '#2a2622'], [0.3, '#6a645c'], [0.65, '#4a4540'], [1, '#1a1612']]), { line: FD.dark, lw: 1 });
      for (let y = -110; y < 120; y += 20) {
        rivet(ctx, x + 6, y, 0.9);
        rivet(ctx, x + 28, y, 0.9);
      }
      hazard(ctx, x, -120, 34, 6);
      hazard(ctx, x, 114, 34, 6);
    }
    // central housing around the furnace
    solid(ctx, [[-6, -54], [96, -54], [96, 54], [-6, 54]], lin(ctx, 0, -54, 0, 54, [[0, '#7a6a5a'], [0.5, FD.rust], [1, '#2a1810']]), { line: FD.dark, lw: 1 });
    ellipse(ctx, 20, 0, 30, 30, 0, rad(ctx, 20, 0, 6, 32, [[0, '#ffd080'], [0.4, '#ff6a10'], [0.75, '#801a04'], [1, '#200602']]), FD.dark, 1.2);
    emissive(ctx, info, 20, 0, 40, FD.molten, 0.55);
    // pipes
    for (const y of [-40, 40]) {
      solid(ctx, [[50, y - 4], [96, y - 4], [96, y + 4], [50, y + 4]], lin(ctx, 0, y - 4, 0, y + 4, [[0, '#a8a090'], [0.5, '#5a5550'], [1, '#2a2622']]), { line: FD.dark, lw: 0.6 });
    }
    // heat streaks
    ctx.strokeStyle = 'rgba(255,140,40,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(60 + i * 5, -50);
      ctx.lineTo(62 + i * 5, 50);
      ctx.stroke();
    }
    // bloom overgrowth
    for (let i = 0; i < 10; i++) {
      const x = -16 + hash1(i * 5) * 130;
      const y = -110 + hash1(i * 9 + 2) * 220;
      if (Math.abs(y) < 60 && x > -6 && x < 96) continue;
      ellipse(ctx, x, y, 5 + hash1(i) * 6, 3 + hash1(i + 3) * 3, hash1(i + 1) * 3, lin(ctx, x, y - 4, x, y + 4, [[0, BL.flesh], [1, BL.fleshDk]]), BL.dark, 0.5);
      if (hash1(i + 33) < 0.5) emissive(ctx, info, x, y, 4, BL.bio, 0.5);
    }
  },
});

defineSprite('anvil_grill', {
  w: 64,
  h: 64,
  outline: true,
  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.clip();
    for (let x = -30; x <= 30; x += 6) {
      solid(ctx, [[x - 1.6, -32], [x + 1.6, -32], [x + 1.6, 32], [x - 1.6, 32]], lin(ctx, x - 1.6, 0, x + 1.6, 0, [[0, '#2a2622'], [0.5, '#8a847c'], [1, '#2a2622']]));
    }
    ctx.restore();
    ctx.strokeStyle = FD.dark;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
  },
});

defineSprite('anvil_core', {
  w: 36,
  h: 36,
  frames: 3,
  outline: false,
  draw(ctx, f, info) {
    const s = [1, 1.07, 0.95][f];
    circle(ctx, 0, 0, 13 * s, rad(ctx, -3, -3, 1, 14 * s, [[0, '#ffffff'], [0.3, '#ffe0a0'], [0.65, '#ff7a1a'], [1, '#601404']]), '#1a0402', 1);
    ctx.strokeStyle = 'rgba(255,255,220,0.6)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + f;
      line(ctx, [[Math.cos(a) * 4, Math.sin(a) * 4], [Math.cos(a) * 11 * s, Math.sin(a) * 11 * s]], 'rgba(255,255,220,0.5)', 0.6);
    }
    emissive(ctx, info, 0, 0, 24, FD.molten, 0.7);
  },
});

defineSprite('anvil_hammer', {
  w: 72,
  h: 50,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-32, -20], [32, -20], [32, 18], [-32, 18]], lin(ctx, -32, 0, 32, 0, [[0, '#2a2622'], [0.25, '#8a847c'], [0.6, '#5a5550'], [1, '#1a1612']]), { line: FD.dark, lw: 1 });
    hazard(ctx, -32, 12, 64, 6);
    for (const x of [-26, -13, 0, 13, 26]) rivet(ctx, x, -14, 0.9);
    line(ctx, [[-32, -4], [32, -4]], 'rgba(0,0,0,0.45)', 0.8);
    solid(ctx, [[-34, 18], [34, 18], [34, 23], [-34, 23]], lin(ctx, 0, 18, 0, 23, [[0, '#d0c8bc'], [1, '#5a5550']]), { line: FD.dark, lw: 0.6 });
    // heat-glow on the striking face
    emissive(ctx, info, 0, 22, 14, '#ff8040', 0.35);
  },
});

defineSprite('anvil_rail', {
  w: 20,
  h: 30,
  ox: 10,
  oy: 2,
  outline: false,
  draw(ctx) {
    solid(ctx, [[-5, 0], [5, 0], [5, 28], [-5, 28]], lin(ctx, -5, 0, 5, 0, [[0, '#3a3632'], [0.5, '#c8c0b4'], [1, '#3a3632']]));
  },
});
