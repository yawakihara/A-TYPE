/** Effect sprites: fireball sequence, debris chunks, enemy bullets, item capsules. */
import { defineSprite } from '../sprites.js';
import { lin, rad, solid, circle, ellipse, emissive, path } from './kit.js';
import { hash2 } from '../../core/rng.js';
import { rgba } from '../../core/math.js';

/** Noisy fireball; frame 0 = birth (white-hot), 7 = dying smoke. */
defineSprite('fireball', {
  w: 34,
  h: 34,
  frames: 8,
  pad: 1,
  draw(ctx, f, info) {
    const t = f / 7;
    const R = 9 + t * 7;
    const lobes = 9;
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      let n = 0;
      for (let k = 1; k <= 3; k++) n += Math.sin(a * (lobes * k * 0.5) + hash2(f, k) * 10) * (0.18 / k);
      pts.push([Math.cos(a) * R * (1 + n), Math.sin(a) * R * (1 + n)]);
    }
    const cols = [
      ['#ffffff', '#fff3b0', '#ffb347', '#ff5a1f'],
      ['#fff8d0', '#ffd25a', '#ff8a2a', '#e8381a'],
      ['#ffe08a', '#ffad3b', '#f2561e', '#a82410'],
      ['#ffc560', '#ff8c2e', '#cc3d17', '#6e1c10'],
      ['#ff9f45', '#e0602a', '#8f2a14', '#3c1610'],
      ['#d9763a', '#a3401f', '#5a2114', '#2a1612'],
      ['#7a4030', '#4a2a22', '#2e1d1a', '#1d1515'],
      ['#4a3632', '#33282a', '#241e20', '#181517'],
    ][f];
    path(ctx, pts);
    ctx.fillStyle = rad(ctx, 0, 0, 0, R * 1.15, [[0, cols[0]], [0.35, cols[1]], [0.7, cols[2]], [1, cols[3]]], -R * 0.15, -R * 0.2);
    ctx.globalAlpha = f >= 6 ? 0.75 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
    // inner turbulence blobs
    for (let i = 0; i < 6; i++) {
      const a = hash2(f * 7 + i, 3) * Math.PI * 2;
      const d = hash2(i, f) * R * 0.55;
      const rr = R * (0.18 + hash2(i + 9, f) * 0.22);
      circle(ctx, Math.cos(a) * d, Math.sin(a) * d, rr, rgba(cols[f < 4 ? 0 : 1].slice(0, 7), f < 4 ? 0.55 : 0.35));
    }
    if (!info.arcade && f < 3) emissive(ctx, info, 0, 0, R * 0.9, '#ffd27a', 0.5 - f * 0.12);
  },
});

/** Metal debris chunks (4 shapes). */
defineSprite('debris', {
  w: 8,
  h: 8,
  frames: 4,
  draw(ctx, f) {
    const shapes = [
      [[-3, -2], [2, -3], [3, 1], [-1, 3]],
      [[-3, 0], [0, -3], [3, -1], [1, 2], [-2, 2]],
      [[-2, -2], [3, -1], [-1, 3]],
      [[-3, -1], [3, -2], [2, 2], [-3, 2]],
    ];
    solid(ctx, shapes[f], lin(ctx, 0, -3, 0, 3, [[0, '#9aa3b5'], [1, '#2b303c']]), { line: '#0a0b10', lw: 0.4 });
  },
});

/** Organic debris (for bio enemies). */
defineSprite('gib', {
  w: 8,
  h: 8,
  frames: 3,
  draw(ctx, f) {
    const c = ['#7a2a4a', '#9a3a2a', '#5a2a6a'][f];
    ellipse(ctx, 0, 0, 2.6 + f * 0.4, 1.8, f, c, '#1a0810', 0.4);
    circle(ctx, -0.6, -0.5, 0.7, 'rgba(255,200,220,0.6)');
  },
});

/** Enemy bullets — high-contrast plasma beads with dark rims so they read on any backdrop. */
const BULLETS = {
  orb: { r: 3, core: '#ffffff', mid: '#ff8ad0', edge: '#ff2f8f' },
  orbA: { r: 3, core: '#ffffff', mid: '#ffc46b', edge: '#ff6a1a' },
  big: { r: 5.5, core: '#ffffff', mid: '#ff9be0', edge: '#e0207a' },
  spore: { r: 3.5, core: '#f8ffe0', mid: '#b8ff5a', edge: '#4ab81e' },
};
for (const [k, b] of Object.entries(BULLETS)) {
  defineSprite(`eb_${k}`, {
    w: b.r * 2 + 6,
    h: b.r * 2 + 6,
    frames: 2,
    draw(ctx, f, info) {
      const r = b.r * (f ? 0.86 : 1);
      if (!info.arcade) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        circle(ctx, 0, 0, r + 2.4, rgba(b.edge, 0.35));
        ctx.restore();
      }
      circle(ctx, 0, 0, r + 0.6, '#1a0410');
      circle(ctx, 0, 0, r, rad(ctx, 0, 0, 0, r, [[0, b.core], [0.4, b.mid], [1, b.edge]]));
      circle(ctx, -r * 0.25, -r * 0.3, r * 0.3, 'rgba(255,255,255,0.9)');
    },
  });
}

/** Needle bullet (points along +x). */
defineSprite('eb_needle', {
  w: 14,
  h: 6,
  draw(ctx, f, info) {
    if (!info.arcade) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ellipse(ctx, 0, 0, 7, 2.6, 0, 'rgba(255,90,160,0.35)');
      ctx.restore();
    }
    ellipse(ctx, 0, 0, 5.5, 1.6, 0, '#1a0410');
    ellipse(ctx, 0, 0, 5, 1.1, 0, lin(ctx, -5, 0, 5, 0, [[0, '#ff2f8f'], [0.7, '#ffb0e0'], [1, '#ffffff']]));
  },
});

/** Item capsule shell (letter drawn on top at runtime). frames: 0 red,1 blue,2 yellow,3 speed,4 missile,5 bit,6 bonus */
const ITEM_COL = ['#ff3d5a', '#3d9bff', '#ffcc2e', '#45e08a', '#ff8a3d', '#c08aff', '#ffffff'];
defineSprite('item', {
  w: 16,
  h: 16,
  frames: 7,
  outline: true,
  draw(ctx, f, info) {
    const c = ITEM_COL[f];
    if (f <= 2) {
      // energy crystal: faceted gem
      const pts = [[0, -7], [5.5, -2.5], [4, 5], [0, 7], [-4, 5], [-5.5, -2.5]];
      solid(ctx, pts, lin(ctx, -5, -7, 5, 7, [[0, '#ffffff'], [0.3, c], [1, '#10131c']]), { line: '#0a0c14', lw: 0.6 });
      solid(ctx, [[0, -7], [5.5, -2.5], [0, -1], [-5.5, -2.5]], 'rgba(255,255,255,0.45)');
      solid(ctx, [[0, -1], [4, 5], [0, 7], [-4, 5]], 'rgba(0,0,0,0.25)');
      emissive(ctx, info, 0, -0.5, 7, c, 0.55);
      return;
    }
    // capsule
    solid(ctx, [[-6, -4.5], [6, -4.5], [7.5, 0], [6, 4.5], [-6, 4.5], [-7.5, 0]], lin(ctx, 0, -4.5, 0, 4.5, [[0, '#f2f5fa'], [0.5, '#9aa4b6'], [1, '#3a4152']]), { line: '#0a0c14', lw: 0.6 });
    solid(ctx, [[-4.5, -3.2], [4.5, -3.2], [5.5, 0], [4.5, 3.2], [-4.5, 3.2], [-5.5, 0]], c);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-4.5, -3.2, 9, 1.4);
  },
});

/** Score gem (bullet-cancel / bonus pickups). */
defineSprite('gem', {
  w: 8,
  h: 8,
  frames: 2,
  draw(ctx, f) {
    const c = f ? '#ffe36b' : '#7ff7ff';
    solid(ctx, [[0, -3.2], [2.6, 0], [0, 3.2], [-2.6, 0]], lin(ctx, 0, -3, 0, 3, [[0, '#ffffff'], [0.5, c], [1, '#204060']]), { line: '#06121a', lw: 0.4 });
  },
});
