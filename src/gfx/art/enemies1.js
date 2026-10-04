/**
 * Bloom enemy art, part 1 (stage 1 roster). The Bloom is a bio-mechanical contagion:
 * violet chitin over gunmetal, magenta flesh, amber eyes, green bioluminescence. Original designs.
 */
import { defineSprite } from '../sprites.js';
import { lin, rad, metal, solid, line, circle, ellipse, orb, emissive, glowLine, rivet, path } from './kit.js';
import { shade, rgba } from '../../core/math.js';

export const BL = {
  shell: '#3d2448',
  shellHi: '#8a5a9e',
  flesh: '#c23f72',
  fleshDk: '#5a1834',
  eye: '#ffb030',
  bio: '#9cff6a',
  steel: '#59627a',
  dark: '#0e0812',
};

/** Glowing eye with slit pupil. */
export function eye(ctx, info, x, y, r, col = BL.eye, look = 0) {
  circle(ctx, x, y, r + 0.6, BL.dark);
  circle(ctx, x, y, r, rad(ctx, x, y, 0, r, [[0, '#fff6d8'], [0.45, col], [1, shade(col, -0.5)]]));
  ellipse(ctx, x + look * r * 0.3, y, r * 0.22, r * 0.75, 0, '#200808');
  circle(ctx, x - r * 0.35, y - r * 0.4, r * 0.22, 'rgba(255,255,255,0.9)');
  emissive(ctx, info, x, y, r * 2.2, col, 0.45);
}

// ------------------------------------------------------------------ WISP: sine-wave drone
defineSprite('wisp', {
  w: 18,
  h: 16,
  frames: 4,
  outline: true,
  draw(ctx, f, info) {
    const flap = [0, 1, 2, 1][f];
    // trailing tendrils
    for (const s of [-1, 1]) {
      path(ctx, [[-3, s * 2], [-6, s * (3 + flap * 0.6), -9, s * (2 + flap)], [-6, s * 1.5, -3, s * 0.5]]);
      ctx.fillStyle = BL.flesh;
      ctx.fill();
      ctx.strokeStyle = BL.dark;
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
    // shell
    ellipse(ctx, 0, 0, 6.5, 5.6, 0, lin(ctx, 0, -5.6, 0, 5.6, [[0, BL.shellHi], [0.5, BL.shell], [1, '#1a0e20']]), BL.dark, 0.6);
    // steel equator band
    solid(ctx, [[-6.4, -1.2], [6.4, -1.2], [6.4, 1.4], [-6.4, 1.4]], metal(ctx, -1.2, 1.4, BL.steel), { line: BL.dark, lw: 0.4 });
    for (const x of [-4, -1.5, 1, 3.5]) rivet(ctx, x, 0.1, 0.35);
    // petal ridges
    line(ctx, [[-3.5, -4.8], [-1.5, -1.4]], 'rgba(255,255,255,0.25)', 0.5);
    line(ctx, [[1, -5.4], [1.5, -1.4]], 'rgba(255,255,255,0.25)', 0.5);
    eye(ctx, info, 3.2, 0.1, 2.3, BL.eye, 1);
  },
});

// ------------------------------------------------------------------ DARTER: dash fighter
defineSprite('darter', {
  w: 28,
  h: 14,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    // dorsal spines
    solid(ctx, [[2, -2.5], [-4, -6.5], [-2, -2.5]], BL.fleshDk, { line: BL.dark, lw: 0.4 });
    solid(ctx, [[-3, -2.5], [-9, -5.5], [-7, -2]], BL.fleshDk, { line: BL.dark, lw: 0.4 });
    // hull: points LEFT (toward the player)
    const hull = [[-12, 0], [-4, -3.4], [6, -3], [11, -1.2], [11, 1.4], [6, 3.2], [-4, 3.4]];
    solid(ctx, hull, lin(ctx, 0, -3.4, 0, 3.4, [[0, BL.shellHi], [0.45, BL.shell], [1, '#140a18']]), { line: BL.dark, rim: 'rgba(255,220,255,0.35)' });
    // flesh underbelly
    solid(ctx, [[-8, 1.2], [6, 1.4], [5, 3.1], [-4, 3.3]], BL.flesh);
    // visor
    solid(ctx, [[-10.5, -0.3], [-5, -2.4], [-2, -2.2], [-5, 0.4]], lin(ctx, -10, -2, -2, 0, [[0, '#fff0c0'], [1, BL.eye]]), { line: BL.dark, lw: 0.4 });
    emissive(ctx, info, -6, -1, 4, BL.eye, 0.5);
    // engine
    solid(ctx, [[10, -1.6], [13, -2.2], [13, 2.2], [10, 1.8]], '#22182a', { line: BL.dark, lw: 0.4 });
    emissive(ctx, info, 13, 0, f ? 4.5 : 3.5, BL.bio, 0.8);
  },
});

// ------------------------------------------------------------------ CARRIER: item courier walker
defineSprite('carrier', {
  w: 28,
  h: 26,
  frames: 4,
  outline: true,
  draw(ctx, f, info) {
    // legs (walk cycle)
    const ph = (f / 4) * Math.PI * 2;
    for (let i = 0; i < 4; i++) {
      const lx = -7 + i * 4.7;
      const lift = Math.max(0, Math.sin(ph + i * 1.6)) * 2.4;
      const kx = lx + (i < 2 ? -2 : 2);
      line(ctx, [[lx, 4], [kx, 7 - lift * 0.5], [lx + (i < 2 ? -1 : 1), 11 - lift]], BL.dark, 1.6);
      line(ctx, [[lx, 4], [kx, 7 - lift * 0.5], [lx + (i < 2 ? -1 : 1), 11 - lift]], BL.steel, 0.9);
    }
    // chassis
    solid(ctx, [[-11, 1], [11, 1], [9, 5.5], [-9, 5.5]], metal(ctx, 1, 5.5, '#4a5268'), { line: BL.dark });
    rivet(ctx, -7, 3.2);
    rivet(ctx, 7, 3.2);
    // glass dome with crystal cargo
    path(ctx, [[-10, 1.5], [-10, -9, 10, -9, 10, 1.5]]);
    ctx.fillStyle = 'rgba(120,200,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = '#bfe8ff';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    solid(ctx, [[0, -6.5], [3.5, -2.5], [0, 1], [-3.5, -2.5]], lin(ctx, -3, -6, 3, 1, [[0, '#ffffff'], [0.4, '#ffd27a'], [1, '#c05a10']]), { line: '#3a1a00', lw: 0.4 });
    emissive(ctx, info, 0, -2.6, 6.5, '#ffcc4a', 0.55);
    line(ctx, [[-6.5, -5.5], [-3.5, -7.5]], 'rgba(255,255,255,0.8)', 0.6);
    // warning light
    circle(ctx, 0, -9.6, 1, f % 2 ? '#ff4a3a' : '#7a1a14', BL.dark, 0.3);
  },
});

// ------------------------------------------------------------------ TURRET: base + barrel
defineSprite('turret_base', {
  w: 22,
  h: 14,
  ox: 11,
  oy: 10,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-10, 4], [-8, 1], [8, 1], [10, 4]], metal(ctx, 1, 4, '#4a5268'), { line: BL.dark });
    path(ctx, [[-7.5, 1.5], [-7.5, -7.5, 7.5, -7.5, 7.5, 1.5]]);
    ctx.fillStyle = lin(ctx, 0, -6, 0, 1.5, [[0, BL.shellHi], [0.6, BL.shell], [1, '#1a0e20']]);
    ctx.fill();
    ctx.strokeStyle = BL.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // hex armour seams
    line(ctx, [[-4, -4.5], [-5.5, 0.5]], 'rgba(0,0,0,0.4)', 0.4);
    line(ctx, [[4, -4.5], [5.5, 0.5]], 'rgba(0,0,0,0.4)', 0.4);
    line(ctx, [[-4, -4.5], [4, -4.5]], 'rgba(255,255,255,0.25)', 0.4);
    eye(ctx, info, 0, -1.6, 2, BL.eye);
  },
});

defineSprite('turret_gun', {
  w: 16,
  h: 8,
  ox: 3,
  oy: 4,
  outline: true,
  draw(ctx) {
    solid(ctx, [[0, -2.6], [11, -2.2], [11, 2.2], [0, 2.6]], metal(ctx, -2.6, 2.6, '#6a7288'), { line: BL.dark, lw: 0.5 });
    ctx.fillStyle = '#120a14';
    ctx.fillRect(9.5, -1.3, 2, 1);
    ctx.fillRect(9.5, 0.4, 2, 1);
    solid(ctx, [[0, -3.2], [3.5, -3.2], [3.5, 3.2], [0, 3.2]], BL.fleshDk, { line: BL.dark, lw: 0.4 });
  },
});

// ------------------------------------------------------------------ HOPPER: crab walker
defineSprite('hopper', {
  w: 24,
  h: 18,
  frames: 3,
  outline: true,
  draw(ctx, f, info) {
    const crouch = [0, 1.5, -1.5][f];
    const spread = [0, 1.5, -1][f];
    for (const s of [-1, 1]) {
      for (const k of [0, 1]) {
        const bx = s * (3 + k * 3);
        const kx = s * (7 + k * 2 + spread);
        const fx = s * (8 + k * 2.5 + spread);
        line(ctx, [[bx, 1 + crouch * 0.3], [kx, -1 + crouch], [fx, 6 - crouch * 0.4]], BL.dark, 1.7);
        line(ctx, [[bx, 1 + crouch * 0.3], [kx, -1 + crouch], [fx, 6 - crouch * 0.4]], '#7a6a8a', 0.9);
      }
    }
    path(ctx, [[-8, 2 + crouch * 0.4], [-8, -7 + crouch, 8, -7 + crouch, 8, 2 + crouch * 0.4]]);
    ctx.fillStyle = lin(ctx, 0, -6, 0, 2, [[0, BL.shellHi], [0.6, BL.shell], [1, '#1a0e20']]);
    ctx.fill();
    ctx.strokeStyle = BL.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // carapace ridges
    for (const x of [-4, 0, 4]) line(ctx, [[x, -4.6 + crouch], [x * 1.2, 1.6 + crouch * 0.4]], 'rgba(255,255,255,0.18)', 0.5);
    solid(ctx, [[-7, 1.5 + crouch * 0.4], [7, 1.5 + crouch * 0.4], [5, 3.5 + crouch * 0.4], [-5, 3.5 + crouch * 0.4]], BL.flesh);
    eye(ctx, info, -3, -1.5 + crouch, 1.4, BL.bio);
    eye(ctx, info, 3, -1.5 + crouch, 1.4, BL.bio);
  },
});

// ------------------------------------------------------------------ GUNPOD: armoured shield carrier
defineSprite('gunpod', {
  w: 36,
  h: 26,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    // rear organic vent (weak side, faces right)
    path(ctx, [[6, -7], [14, -5, 15, 5], [6, 7]]);
    ctx.fillStyle = lin(ctx, 6, 0, 15, 0, [[0, BL.fleshDk], [1, BL.flesh]]);
    ctx.fill();
    ctx.strokeStyle = BL.dark;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    for (let i = -1; i <= 1; i++) line(ctx, [[8, i * 3], [13, i * 3.5]], 'rgba(255,190,220,0.5)', 0.5);
    emissive(ctx, info, 12, 0, f ? 5 : 4, BL.bio, 0.6);
    // hull body
    ellipse(ctx, 0, 0, 10, 8.5, 0, metal(ctx, -8.5, 8.5, '#5a6378'), BL.dark, 0.6);
    line(ctx, [[-4, -8], [-4, 8]], 'rgba(0,0,0,0.4)', 0.4);
    line(ctx, [[3, -8.2], [3, 8.2]], 'rgba(0,0,0,0.4)', 0.4);
    rivet(ctx, 0, -5);
    rivet(ctx, 0, 5);
    // front shield (armour) — thick curved plate facing left
    path(ctx, [[-9, -11], [-17, -6, -17, 6, -9, 11], [-6, 10], [-12, 5, -12, -5, -6, -10]]);
    ctx.fillStyle = lin(ctx, -17, 0, -6, 0, [[0, '#8a93a8'], [0.35, '#4a5266'], [1, '#262c3a']]);
    ctx.fill();
    ctx.strokeStyle = BL.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    line(ctx, [[-14.5, -6], [-15.5, 0], [-14.5, 6]], 'rgba(255,255,255,0.45)', 0.5);
    // cannon port
    solid(ctx, [[-13, -1.8], [-18.5, -1.4], [-18.5, 1.4], [-13, 1.8]], '#1a1e28', { line: BL.dark, lw: 0.4 });
    emissive(ctx, info, -18, 0, f ? 3.5 : 2.5, '#ff7a3a', 0.8);
  },
});

// ------------------------------------------------------------------ SPOREPOD: terrain growth
defineSprite('sporepod', {
  w: 24,
  h: 20,
  ox: 12,
  oy: 16,
  frames: 3,
  outline: true,
  draw(ctx, f, info) {
    // root mass
    path(ctx, [[-10, 3], [-6, -2, 6, -2, 10, 3]]);
    ctx.fillStyle = BL.fleshDk;
    ctx.fill();
    // petals
    const open = [0, 0.5, 1][f];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * (0.35 + open * 0.28);
      const len = 9;
      const tipx = Math.cos(a) * len;
      const tipy = -3 + Math.sin(a) * len;
      path(ctx, [[0, -2], [Math.cos(a - 0.4) * 5, -2 + Math.sin(a - 0.4) * 5, tipx, tipy], [Math.cos(a + 0.4) * 5, -2 + Math.sin(a + 0.4) * 5, 0, -2]]);
      ctx.fillStyle = lin(ctx, 0, -2, tipx, tipy, [[0, BL.flesh], [1, BL.shellHi]]);
      ctx.fill();
      ctx.strokeStyle = BL.dark;
      ctx.lineWidth = 0.45;
      ctx.stroke();
    }
    if (f > 0) {
      circle(ctx, 0, -3, 2.4 + f, BL.bio, BL.dark, 0.4);
      emissive(ctx, info, 0, -3, 6 + f * 2, BL.bio, 0.7);
    } else {
      circle(ctx, 0, -4, 3.2, BL.shell, BL.dark, 0.5);
    }
  },
});

// ------------------------------------------------------------------ MITE: swarm insect
defineSprite('mite', {
  w: 14,
  h: 12,
  frames: 2,
  outline: true,
  draw(ctx, f, info) {
    const flap = f ? -1 : 1;
    path(ctx, [[1, -1], [4, -5 * flap, 7, -4 * flap], [4, -0.5]]);
    ctx.fillStyle = 'rgba(200,230,255,0.55)';
    ctx.fill();
    ctx.strokeStyle = BL.dark;
    ctx.lineWidth = 0.4;
    ctx.stroke();
    solid(ctx, [[-6, 0], [-1, -2.6], [5, -1.2], [6, 0.4], [5, 1.6], [-1, 2.6]], lin(ctx, 0, -2.6, 0, 2.6, [[0, BL.shellHi], [1, BL.shell]]), { line: BL.dark, lw: 0.5 });
    solid(ctx, [[2, 0.5], [6, 1.2], [5, 2.5], [1, 2.2]], BL.flesh);
    eye(ctx, info, -3.5, -0.3, 1.5, '#ff5a3a');
  },
});

// ------------------------------------------------------------------ HATCH: spawner set into terrain
defineSprite('hatch', {
  w: 30,
  h: 14,
  ox: 15,
  oy: 10,
  frames: 3,
  outline: true,
  draw(ctx, f, info) {
    solid(ctx, [[-14, 4], [-12, -3], [12, -3], [14, 4]], metal(ctx, -3, 4, '#4a5266'), { line: BL.dark });
    for (const x of [-10, -5, 5, 10]) rivet(ctx, x, 1.5, 0.4);
    const open = [0, 3.5, 7][f];
    ctx.fillStyle = '#100810';
    ctx.fillRect(-8, -3, 16, 3);
    if (f > 0) {
      ctx.fillStyle = BL.flesh;
      ctx.fillRect(-7 + 0.5, -2.6, 14 - 1, 2);
      emissive(ctx, info, 0, -2, 6 + f * 2, BL.bio, 0.6);
    }
    solid(ctx, [[-8 - open, -4.5], [-open, -4.5], [-open, -2.5], [-8 - open, -2.5]], metal(ctx, -4.5, -2.5, '#7a8298'), { line: BL.dark, lw: 0.4 });
    solid(ctx, [[open, -4.5], [8 + open, -4.5], [8 + open, -2.5], [open, -2.5]], metal(ctx, -4.5, -2.5, '#7a8298'), { line: BL.dark, lw: 0.4 });
    line(ctx, [[-12, -3], [-14, 4]], 'rgba(255,255,255,0.3)', 0.4);
  },
});

// ------------------------------------------------------------------ SENTINEL mid-boss parts
defineSprite('sentinel_core', {
  w: 34,
  h: 34,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 14.5, '#0c0a12');
    circle(ctx, 0, 0, 13.5, metal(ctx, -13, 13, '#4c5468'), BL.dark, 0.7);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rivet(ctx, Math.cos(a) * 11.5, Math.sin(a) * 11.5, 0.45);
    }
    circle(ctx, 0, 0, 9, rad(ctx, 0, 0, 0, 9, [[0, '#3a1428'], [1, '#12060e']]), BL.dark, 0.5);
    eye(ctx, info, 0, 0, 6.2, '#ff4a6a');
    // iris rings
    ctx.strokeStyle = 'rgba(255,160,190,0.5)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
    ctx.stroke();
  },
});

defineSprite('sentinel_plate', {
  w: 14,
  h: 22,
  ox: 4,
  oy: 11,
  outline: true,
  draw(ctx) {
    path(ctx, [[0, -10], [7, -8, 9, 8, 0, 10], [-2, 8], [3, 4, 3, -4, -2, -8]]);
    ctx.fillStyle = lin(ctx, -2, 0, 9, 0, [[0, '#2a3040'], [0.5, '#6a7488'], [1, '#a8b2c8']]);
    ctx.fill();
    ctx.strokeStyle = BL.dark;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    line(ctx, [[5.5, -6], [6.5, 0], [5.5, 6]], 'rgba(255,255,255,0.5)', 0.5);
    ctx.fillStyle = '#ffb030';
    ctx.fillRect(2, -1, 2, 2);
  },
});

// ------------------------------------------------------------------ BLADE drone (boss minion)
defineSprite('blade', {
  w: 20,
  h: 20,
  frames: 4,
  outline: true,
  draw(ctx, f, info) {
    const a0 = (f / 4) * (Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const a = a0 + (i / 3) * Math.PI * 2;
      const pts = [[Math.cos(a) * 2, Math.sin(a) * 2], [Math.cos(a + 0.5) * 9, Math.sin(a + 0.5) * 9], [Math.cos(a + 0.9) * 6, Math.sin(a + 0.9) * 6]];
      solid(ctx, pts, metal(ctx, -9, 9, '#9aa4b8'), { line: BL.dark, lw: 0.5 });
    }
    circle(ctx, 0, 0, 3, BL.shell, BL.dark, 0.5);
    circle(ctx, 0, 0, 1.4, '#ff5a6a');
    emissive(ctx, info, 0, 0, 4, '#ff5a6a', 0.6);
  },
});
