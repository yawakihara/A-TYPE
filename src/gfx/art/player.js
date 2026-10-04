/**
 * Player-side art: A-01 "HALCYON" (twin-prong lance fighter), thruster, AEGIS pod parts,
 * satellite bits, shots and missiles. Original designs.
 */
import { defineSprite } from '../sprites.js';
import { path, lin, rad, metal, solid, line, circle, ellipse, orb, emissive, glowLine, rivet } from './kit.js';
import { shade, rgba } from '../../core/math.js';

export const HULL = '#dfe6ef';
export const GUN = '#3b4456';
export const TEAL = '#38f2d4';
export const RED = '#ff3b5c';
export const CANOPY = '#ffb13b';

export const POD_COLORS = {
  red: { core: '#ff3d5a', glow: '#ff5a6e', light: '#ffc2cb' },
  blue: { core: '#3d9bff', glow: '#55b4ff', light: '#c6e6ff' },
  yellow: { core: '#ffcc2e', glow: '#ffd84f', light: '#fff1b8' },
};

function drawShip(ctx, info, tilt) {
  ctx.rotate(tilt * 0.085);
  ctx.scale(1, 1 - Math.abs(tilt) * 0.06);
  // --- fins (behind body)
  solid(ctx, [[-15, -4.2], [-20, -10.4], [-17.2, -10.6], [-9.5, -4.4]], metal(ctx, -10.6, -4, '#c7d0dc'), { line: '#1a2030' });
  line(ctx, [[-18.6, -9.6], [-12.5, -4.6]], RED, 0.9);
  solid(ctx, [[-14, 4.4], [-18, 9], [-15.6, 9.2], [-9, 4.6]], metal(ctx, 4.4, 9.2, '#aeb8c8'), { line: '#1a2030' });
  // --- engine block
  const eng = [[-20, -4], [-12, -4.8], [-9.5, -3.8], [-9.5, 3.9], [-12, 5], [-20, 4.3]];
  solid(ctx, eng, metal(ctx, -4.8, 5, GUN, { hi: 0.45 }), { line: '#0d1018' });
  line(ctx, [[-17, -4.2], [-17, 4.5]], 'rgba(0,0,0,0.5)', 0.4);
  line(ctx, [[-13.5, -4.5], [-13.5, 4.7]], 'rgba(0,0,0,0.5)', 0.4);
  rivet(ctx, -15.3, -2.5, 0.4);
  rivet(ctx, -15.3, 2.7, 0.4);
  // nozzle
  solid(ctx, [[-20, -3.2], [-21.6, -2.6], [-21.6, 2.8], [-20, 3.4]], '#1b1f29', { line: '#06070b' });
  emissive(ctx, info, -21, 0.1, 3.2, '#7fd8ff', 0.8);
  // --- main fuselage
  const fus = [[-12.5, -3.9], [-6, -4.7], [-3.5, -5.4], [3.8, -4.3], [7.5, -3.3], [7.5, 3.3], [2, 4.6], [-8, 4.9], [-12.5, 4.1]];
  solid(ctx, fus, metal(ctx, -5.6, 5, HULL), { line: '#1a2030', rim: 'rgba(255,255,255,0.75)' });
  // belly shadow plate
  solid(ctx, [[-11, 2.4], [5, 2.2], [2, 4.4], [-8, 4.7], [-11, 4]], 'rgba(40,50,70,0.35)');
  // intake band with emissive seam
  solid(ctx, [[-12, -0.9], [5.5, -1.1], [5.5, 1.3], [-12, 1.7]], lin(ctx, 0, -1, 0, 1.7, [[0, '#2a3242'], [1, '#141821']]), { line: '#0b0e15', lw: 0.4 });
  glowLine(ctx, info, [[-11.5, 0.35], [5, 0.15]], TEAL, 0.55);
  // panel lines
  line(ctx, [[-6, -4.6], [-6, -1]], 'rgba(20,28,40,0.55)', 0.35);
  line(ctx, [[1.5, -4.5], [1.5, -1.1]], 'rgba(20,28,40,0.55)', 0.35);
  line(ctx, [[-6, 1.7], [-6, 4.8]], 'rgba(20,28,40,0.55)', 0.35);
  line(ctx, [[-3, 1.6], [4.5, 1.5]], 'rgba(20,28,40,0.35)', 0.3);
  rivet(ctx, -9.5, -2.6, 0.35);
  rivet(ctx, -9.5, 3, 0.35);
  // red accent chevron
  solid(ctx, [[-8.5, -4.75], [-5.8, -4.75], [-7.6, -2.4], [-10.2, -2.4]], RED);
  // --- canopy
  const can = [[-4.5, -4.9], [-2.2, -7.4], [2.6, -7.0], [5.2, -4.5]];
  path(ctx, [can[0], [-3.6, -6.6, -2.2, -7.4], [0, -7.6, 2.6, -7.0], [4.2, -6.4, 5.2, -4.5]], true);
  ctx.fillStyle = lin(ctx, 0, -7.6, 0, -4.4, [[0, shade(CANOPY, 0.55)], [0.45, CANOPY], [1, shade(CANOPY, -0.6)]]);
  ctx.fill();
  ctx.strokeStyle = '#2a1500';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  line(ctx, [[-2.4, -6.7], [1.6, -6.85]], 'rgba(255,255,255,0.85)', 0.5);
  line(ctx, [[0.8, -7.3], [0.3, -4.7]], 'rgba(60,30,0,0.6)', 0.35);
  // --- twin prongs (the lance fork)
  const up = [[4, -3.7], [13, -3.6], [21.5, -2.3], [21.9, -1.75], [13, -1.55], [5, -1.4]];
  solid(ctx, up, metal(ctx, -3.7, -1.5, '#e7edf5'), { line: '#141a26', lw: 0.5 });
  line(ctx, [[8, -2.15], [20.5, -1.95]], TEAL, 0.35, 0.9);
  const lo = [[4, 1.0], [12, 1.2], [18, 1.9], [18.2, 2.45], [12, 2.95], [4, 3.25]];
  solid(ctx, lo, metal(ctx, 1, 3.2, '#c3ccd9'), { line: '#141a26', lw: 0.5 });
  line(ctx, [[8, 1.65], [17.2, 2.05]], TEAL, 0.3, 0.8);
  // emitter
  solid(ctx, [[5.5, -1.5], [8.2, -1.2], [8.2, 1.2], [5.5, 1.1]], '#1c2230', { line: '#0b0e15', lw: 0.35 });
  circle(ctx, 7.6, -0.15, 1.15, info.arcade ? '#bffcff' : '#e8ffff');
  emissive(ctx, info, 7.8, -0.15, 3.4, TEAL, 0.85);
}

/** Ship frames: 0 level, 1/2 banking up, 3/4 banking down. */
defineSprite('ship', { w: 46, h: 26, ox: 23, oy: 13, frames: 5, outline: true, draw: (ctx, frame, info) => drawShip(ctx, info, [0, -0.5, -1, 0.5, 1][frame]) });

/** Thruster plume, drawn additively behind the nozzle (anchor at nozzle). */
defineSprite('flame', {
  w: 26,
  h: 10,
  ox: 24,
  oy: 5,
  frames: 4,
  pixel: false,
  draw(ctx, f, info) {
    const len = [16, 20, 14, 22][f];
    const wv = [3.2, 3.6, 3.0, 3.8][f];
    if (info.arcade) {
      ellipse(ctx, -len * 0.45, 0, len * 0.5, wv * 0.6, 0, '#2a6dff');
      ellipse(ctx, -len * 0.3, 0, len * 0.32, wv * 0.4, 0, '#7fd8ff');
      ellipse(ctx, -2.5, 0, 3.2, 1.3, 0, '#ffffff');
      return;
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lin(ctx, 0, 0, -len, 0, [[0, 'rgba(255,255,255,0.95)'], [0.15, 'rgba(140,230,255,0.9)'], [0.5, 'rgba(60,120,255,0.55)'], [1, 'rgba(40,60,255,0)']]);
    path(ctx, [[0, -wv], [-len * 0.4, -wv * 0.75, -len, 0], [-len * 0.4, wv * 0.75, 0, wv]]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ellipse(ctx, -2.2, 0, 3.4, 1.2, 0, 'rgba(255,255,255,0.9)');
  },
});

/** AEGIS pod core sphere: frames index = level 0..2, one sprite per colour. */
for (const [name, c] of Object.entries(POD_COLORS)) {
  defineSprite(`podcore_${name}`, {
    w: 18,
    h: 18,
    frames: 3,
    outline: true,
    draw(ctx, lv, info) {
      const r = [4.2, 5.2, 6.2][lv];
      // dark socket
      circle(ctx, 0, 0, r + 1.2, '#10131c', '#05060a', 0.5);
      orb(ctx, 0, 0, r, c.core, { line: shade(c.core, -0.7) });
      // inner swirl of the caged seed
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = rgba(c.light, 0.7);
      ctx.lineWidth = 0.55;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const a = (i / 3) * Math.PI * 2;
        ctx.arc(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25, r * 0.6, a, a + 2.2);
        ctx.stroke();
      }
      ctx.restore();
      emissive(ctx, info, 0, 0, r * 1.6, c.glow, 0.55);
      circle(ctx, -r * 0.3, -r * 0.35, r * 0.22, 'rgba(255,255,255,0.95)');
    },
  });
}

/** A single crystal shard of the AEGIS cage (points outward along +x). frames = level. */
defineSprite('podshard', {
  w: 12,
  h: 8,
  ox: 2,
  oy: 4,
  frames: 3,
  outline: '#0b1622',
  draw(ctx, lv) {
    const L = [6.5, 7.8, 9][lv];
    const Wd = [2.2, 2.6, 3][lv];
    const pts = [[0, 0], [L * 0.45, -Wd], [L, 0], [L * 0.45, Wd]];
    solid(ctx, pts, lin(ctx, 0, -Wd, 0, Wd, [[0, '#f4fdff'], [0.45, '#a9dcf0'], [0.55, '#5a9ec4'], [1, '#2d5a7c']]), { line: '#0b1622', lw: 0.45 });
    line(ctx, [[0.6, 0], [L - 0.6, 0]], 'rgba(255,255,255,0.8)', 0.35);
  },
});

/** Satellite bit: small armoured sphere with a spinning band. frames = rotation. */
defineSprite('bit', {
  w: 14,
  h: 14,
  frames: 8,
  outline: true,
  draw(ctx, f, info) {
    orb(ctx, 0, 0, 4.4, '#8e9bb0', { line: '#151a24' });
    const a = (f / 8) * Math.PI;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(20,24,34,0.85)';
    const off = Math.cos(a) * 3.2;
    ctx.fillRect(off - 0.9, -5, 1.8, 10);
    ctx.restore();
    circle(ctx, 0, 0, 1.6, '#fff4c2');
    emissive(ctx, info, 0, 0, 3.5, '#ffb347', 0.8);
  },
});

/** Standard pellet. */
defineSprite('shot', {
  w: 14,
  h: 6,
  pixel: true,
  draw(ctx, f, info) {
    if (!info.arcade) {
      ctx.globalCompositeOperation = 'lighter';
      ellipse(ctx, -1, 0, 7, 2.6, 0, 'rgba(255,200,80,0.35)');
    }
    ellipse(ctx, 0, 0, 5.2, 1.5, 0, '#ffd75a');
    ellipse(ctx, 1, 0, 3.2, 0.8, 0, '#fffbe6');
  },
});

/** Small pod / bit pellet. */
defineSprite('pellet', {
  w: 8,
  h: 8,
  draw(ctx, f, info) {
    if (!info.arcade) {
      ctx.globalCompositeOperation = 'lighter';
      circle(ctx, 0, 0, 3.4, 'rgba(255,170,90,0.35)');
    }
    circle(ctx, 0, 0, 1.9, '#ffbe5c');
    circle(ctx, -0.3, -0.3, 0.9, '#ffffff');
  },
});

/** Homing missile (points along +x). */
defineSprite('missile', {
  w: 14,
  h: 6,
  outline: true,
  draw(ctx) {
    solid(ctx, [[-5, -1.2], [3, -1.2], [5.5, 0], [3, 1.2], [-5, 1.2]], metal(ctx, -1.2, 1.2, '#cfd6e0'), { line: '#1a2030', lw: 0.4 });
    solid(ctx, [[-5, -1.2], [-6.5, -2.6], [-4, -1.2]], RED);
    solid(ctx, [[-5, 1.2], [-6.5, 2.6], [-4, 1.2]], RED);
    solid(ctx, [[3, -1.2], [5.5, 0], [3, 1.2]], '#ff6b3d');
  },
});
