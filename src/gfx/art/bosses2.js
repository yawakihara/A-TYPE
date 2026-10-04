/** BROODMOTHER (stage 2 boss) art: brood sac, rib plates, heart, tentacle parts. Original design. */
import { defineSprite } from '../sprites.js';
import { lin, rad, solid, line, circle, ellipse, emissive, path } from './kit.js';
import { BL, eye } from './enemies1.js';
import { hash1 } from '../../core/rng.js';
import { rgba } from '../../core/math.js';

const TEAL = '#4ff0c0';
const PINK = '#ff7ab8';

defineSprite('brood_body', {
  w: 170,
  h: 150,
  ox: 85,
  oy: 70,
  outline: false,
  draw(ctx, f, info) {
    // stalk into the ceiling
    path(ctx, [[-26, -70], [-30, -40, -50, -30, -60, -10], [60, -10], [50, -30, 30, -40, 26, -70]]);
    ctx.fillStyle = lin(ctx, 0, -70, 0, -10, [[0, '#1a0618'], [1, '#4a1438']]);
    ctx.fill();
    // main sac with irregular rim
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const rr = 1 + (hash1(i * 3) - 0.5) * 0.08;
      pts.push([Math.cos(a) * 74 * rr, 6 + Math.sin(a) * 58 * rr * (Math.sin(a) > 0 ? 1.08 : 0.9)]);
    }
    path(ctx, pts);
    ctx.fillStyle = rad(ctx, -10, -10, 10, 90, [[0, '#c86a9c'], [0.3, '#8a2e62'], [0.7, '#4a1036'], [1, '#1a0414']], -30, -30);
    ctx.fill();
    ctx.strokeStyle = '#14030e';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // veins
    ctx.strokeStyle = 'rgba(60,8,30,0.55)';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 16; i++) {
      const a = hash1(i * 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 70, 6 + Math.sin(a) * 52);
      ctx.quadraticCurveTo(Math.cos(a + 0.5) * 40, 6 + Math.sin(a + 0.5) * 30, Math.cos(a + 0.2) * 22, 8 + Math.sin(a + 0.2) * 16);
      ctx.stroke();
    }
    // translucent embryos inside
    for (let i = 0; i < 7; i++) {
      const x = -50 + hash1(i + 40) * 100;
      const y = -26 + hash1(i + 60) * 60;
      if (Math.abs(x) < 26 && Math.abs(y - 8) < 22) continue;
      ellipse(ctx, x, y, 7, 5, hash1(i) * 3, rgba('#ffd0e8', 0.25), rgba('#3a0820', 0.4), 0.5);
      circle(ctx, x - 2, y, 1.2, rgba('#200410', 0.6));
    }
    // heart cavity
    ellipse(ctx, 0, 10, 26, 22, 0, rad(ctx, 0, 10, 2, 26, [[0, '#4a0a20'], [1, '#14030a']]), '#0a0206', 1);
    // bioluminescent nodes
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3;
      const x = Math.cos(a) * 62;
      const y = 6 + Math.sin(a) * 48;
      circle(ctx, x, y, 1.8, TEAL, '#082018', 0.5);
      emissive(ctx, info, x, y, 5, TEAL, 0.35);
    }
    // specular sheen
    ellipse(ctx, -34, -24, 22, 9, -0.5, 'rgba(255,230,245,0.09)');
  },
});

defineSprite('brood_rib', {
  w: 16,
  h: 56,
  ox: 8,
  oy: 4,
  outline: true,
  draw(ctx) {
    path(ctx, [[-3, 0], [-7, 18, -6, 36, 0, 50], [3, 48], [-1, 34, -1, 18, 3, 0]]);
    ctx.fillStyle = lin(ctx, -7, 0, 3, 0, [[0, '#d8c8a8'], [0.5, '#9a8466'], [1, '#4a3a2a']]);
    ctx.fill();
    ctx.strokeStyle = '#1a0e08';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    line(ctx, [[-3.5, 6], [-4.5, 24], [-2.5, 42]], 'rgba(255,255,255,0.35)', 0.5);
  },
});

defineSprite('brood_heart', {
  w: 40,
  h: 36,
  frames: 3,
  outline: false,
  draw(ctx, f, info) {
    const s = [1, 1.08, 0.95][f];
    ctx.save();
    ctx.scale(s, s);
    path(ctx, [[0, 14], [-18, 2, -16, -12, -6, -12], [-2, -12, 0, -8, 0, -6], [0, -8, 2, -12, 6, -12], [16, -12, 18, 2, 0, 14]]);
    ctx.fillStyle = rad(ctx, -3, -4, 1, 18, [[0, '#fff0f4'], [0.25, '#ff7aa0'], [0.7, '#c0204a'], [1, '#5a0820']]);
    ctx.fill();
    ctx.strokeStyle = '#2a0410';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    line(ctx, [[-6, -8], [-9, 0], [-4, 6]], 'rgba(120,10,40,0.6)', 0.8);
    line(ctx, [[5, -9], [8, -2]], 'rgba(120,10,40,0.6)', 0.8);
    ctx.restore();
    emissive(ctx, info, 0, 0, 22, '#ff4a7a', 0.55);
  },
});

defineSprite('brood_seg', {
  w: 16,
  h: 16,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 5.5, lin(ctx, 0, -5.5, 0, 5.5, [[0, '#8a5aa0'], [0.6, '#4a2060'], [1, '#1a0824']]), '#0a0310', 0.6);
    circle(ctx, -1.5, -1.5, 1.2, 'rgba(255,220,240,0.5)');
    circle(ctx, 1, 1.5, 1, TEAL);
    emissive(ctx, info, 1, 1.5, 3, TEAL, 0.4);
  },
});

defineSprite('brood_mouth', {
  w: 22,
  h: 22,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 8, lin(ctx, 0, -8, 0, 8, [[0, '#9a6ab0'], [1, '#3a1448']]), '#0a0310', 0.7);
    const open = f ? 4 : 1.5;
    ellipse(ctx, 0, 3, 5, open, 0, '#1a0410', '#14030e', 0.5);
    for (let i = -2; i <= 2; i++) solid(ctx, [[i * 1.9 - 0.7, 3 - open], [i * 1.9, 3 - open + 1.6], [i * 1.9 + 0.7, 3 - open]], '#fff0e0');
    eye(ctx, info, -3.5, -3, 1.4, '#ffb030');
    eye(ctx, info, 3.5, -3, 1.4, '#ffb030');
    if (f) emissive(ctx, info, 0, 4, 7, PINK, 0.7);
  },
});
