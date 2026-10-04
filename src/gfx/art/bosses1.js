/**
 * IRIS WARDEN (stage 1 boss) art: gate wall, aperture ring, eye, turret node, arm links.
 * The eight aperture blades are drawn live (they open and close), see bosses/iris.js.
 */
import { defineSprite } from '../sprites.js';
import { lin, rad, metal, solid, line, circle, ellipse, emissive, rivet, path } from './kit.js';
import { BL, eye } from './enemies1.js';
import { hash1 } from '../../core/rng.js';

const STEEL = '#4a5268';

defineSprite('iris_wall', {
  w: 110,
  h: 250,
  ox: 10,
  oy: 125,
  outline: false,
  draw(ctx, f, info) {
    // massive gate pillar the ring is mounted into
    solid(ctx, [[0, -125], [100, -125], [100, 125], [0, 125]], lin(ctx, 0, 0, 100, 0, [[0, '#2c3346'], [0.3, '#3c445a'], [1, '#141824']]), { line: '#07080c' });
    for (let y = -120; y < 125; y += 22) {
      line(ctx, [[0, y], [100, y]], 'rgba(0,0,0,0.5)', 0.8);
      line(ctx, [[0, y + 1], [100, y + 1]], 'rgba(255,255,255,0.08)', 0.6);
      for (let x = 8; x < 100; x += 18) rivet(ctx, x, y + 5, 0.6);
    }
    // vertical conduits
    for (const x of [14, 30, 82]) {
      solid(ctx, [[x - 3, -125], [x + 3, -125], [x + 3, 125], [x - 3, 125]], lin(ctx, x - 3, 0, x + 3, 0, [[0, '#1c202c'], [0.5, '#6a7288'], [1, '#1c202c']]));
    }
    // hazard trim
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -125, 6, 250);
    ctx.clip();
    for (let y = -125; y < 125; y += 8) {
      ctx.fillStyle = (y / 8) % 2 ? '#d8a018' : '#141008';
      ctx.fillRect(0, y, 6, 4);
    }
    ctx.restore();
    // bloom overgrowth creeping over the pillar
    for (let i = 0; i < 14; i++) {
      const y = -110 + i * 17;
      const x = 2 + hash1(i * 7) * 30;
      ellipse(ctx, x, y, 6 + hash1(i) * 8, 3 + hash1(i + 3) * 4, hash1(i + 9) * 3, lin(ctx, x, y - 5, x, y + 5, [[0, BL.flesh], [1, BL.fleshDk]]), BL.dark, 0.4);
      if (hash1(i + 20) < 0.4) emissive(ctx, info, x, y, 4, BL.bio, 0.5);
    }
    // warning lights
    for (const y of [-100, 100]) {
      circle(ctx, 60, y, 3, '#ff4030', '#000', 0.5);
      emissive(ctx, info, 60, y, 8, '#ff4030', 0.7);
    }
  },
});

defineSprite('iris_ring', {
  w: 184,
  h: 184,
  outline: false,
  draw(ctx, f, info) {
    const R0 = 86;
    const R1 = 56;
    // outer ring body
    ctx.beginPath();
    ctx.arc(0, 0, R0, 0, Math.PI * 2);
    ctx.arc(0, 0, R1, 0, Math.PI * 2, true);
    ctx.fillStyle = rad(ctx, 0, 0, R1, R0, [[0, '#1a1e2a'], [0.25, '#5a6378'], [0.55, '#3a4256'], [1, '#141824']], -20, -20);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#06070b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, R0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R1, 0, Math.PI * 2);
    ctx.stroke();
    // segment joints + bolts
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      line(ctx, [[Math.cos(a) * R1, Math.sin(a) * R1], [Math.cos(a) * R0, Math.sin(a) * R0]], 'rgba(0,0,0,0.6)', 1);
      line(ctx, [[Math.cos(a + 0.012) * R1, Math.sin(a + 0.012) * R1], [Math.cos(a + 0.012) * R0, Math.sin(a + 0.012) * R0]], 'rgba(255,255,255,0.12)', 0.6);
      const b = a + Math.PI / 16;
      rivet(ctx, Math.cos(b) * (R1 + 6), Math.sin(b) * (R1 + 6), 0.9);
      rivet(ctx, Math.cos(b) * (R0 - 6), Math.sin(b) * (R0 - 6), 0.9);
    }
    // inner lip highlight
    ctx.strokeStyle = 'rgba(190,210,255,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, R1 + 2, Math.PI * 0.95, Math.PI * 1.7);
    ctx.stroke();
    // hydraulic rams
    for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
      const x0 = Math.cos(a) * (R0 - 4);
      const y0 = Math.sin(a) * (R0 - 4);
      const x1 = Math.cos(a) * (R1 + 4);
      const y1 = Math.sin(a) * (R1 + 4);
      line(ctx, [[x0, y0], [x1, y1]], '#0a0c12', 5);
      line(ctx, [[x0, y0], [x1, y1]], '#8a94aa', 2.6);
      line(ctx, [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2]], '#c8d0e0', 1);
    }
    // overgrowth on the ring
    for (let i = 0; i < 10; i++) {
      const a = hash1(i * 13 + 5) * Math.PI * 2;
      const rr = R1 + 8 + hash1(i * 3) * 20;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      ellipse(ctx, x, y, 5 + hash1(i + 2) * 6, 3 + hash1(i + 4) * 3, a, lin(ctx, x, y - 4, x, y + 4, [[0, BL.flesh], [1, BL.fleshDk]]), BL.dark, 0.4);
      if (hash1(i + 30) < 0.5) emissive(ctx, info, x, y, 4, BL.bio, 0.6);
    }
    // status lamps
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      circle(ctx, Math.cos(a) * (R0 - 13), Math.sin(a) * (R0 - 13), 1.4, '#ffb347', '#000', 0.3);
      emissive(ctx, info, Math.cos(a) * (R0 - 13), Math.sin(a) * (R0 - 13), 4, '#ffb347', 0.5);
    }
  },
});

/** The eye behind the aperture (pupil drawn live). */
defineSprite('iris_eye', {
  w: 64,
  h: 64,
  outline: false,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 30, rad(ctx, 0, 0, 4, 30, [[0, '#7a1a2a'], [0.7, '#3a0a14'], [1, '#12030a']]));
    // veins
    ctx.strokeStyle = 'rgba(255,90,120,0.45)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.quadraticCurveTo(Math.cos(a + 0.3) * 22, Math.sin(a + 0.3) * 22, Math.cos(a + 0.1) * 16, Math.sin(a + 0.1) * 16);
      ctx.stroke();
    }
    // iris
    circle(ctx, 0, 0, 16, rad(ctx, 0, 0, 2, 16, [[0, '#fff2c0'], [0.25, '#ffb030'], [0.6, '#e04a1a'], [1, '#5a1008']]), '#200404', 0.8);
    ctx.strokeStyle = 'rgba(255,230,150,0.55)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      line(ctx, [[Math.cos(a) * 5, Math.sin(a) * 5], [Math.cos(a) * 15, Math.sin(a) * 15]], 'rgba(255,220,140,0.35)', 0.4);
    }
    emissive(ctx, info, 0, 0, 26, '#ff6a2a', 0.45);
  },
});

defineSprite('iris_pupil', {
  w: 12,
  h: 24,
  outline: false,
  draw(ctx) {
    ellipse(ctx, 0, 0, 3.6, 10, 0, '#120202');
    ellipse(ctx, -1.2, -4, 1, 2.2, 0, 'rgba(255,255,255,0.6)');
  },
});

defineSprite('iris_node', {
  w: 26,
  h: 26,
  outline: true,
  draw(ctx, f, info) {
    circle(ctx, 0, 0, 10, metal(ctx, -10, 10, STEEL), BL.dark, 0.7);
    circle(ctx, 0, 0, 7, lin(ctx, 0, -7, 0, 7, [[0, BL.shellHi], [1, BL.shell]]), BL.dark, 0.5);
    eye(ctx, info, 0, 0, 3.2, '#ffb030');
  },
});

defineSprite('iris_barrel', {
  w: 20,
  h: 8,
  ox: 2,
  oy: 4,
  outline: true,
  draw(ctx) {
    solid(ctx, [[0, -2.4], [15, -2], [15, 2], [0, 2.4]], metal(ctx, -2.4, 2.4, '#6a7288'), { line: BL.dark, lw: 0.5 });
    ctx.fillStyle = '#120a14';
    ctx.fillRect(13.5, -1, 2, 2);
  },
});

defineSprite('iris_link', {
  w: 16,
  h: 12,
  outline: true,
  draw(ctx, f, info) {
    ellipse(ctx, 0, 0, 7, 5, 0, metal(ctx, -5, 5, '#5a6378'), BL.dark, 0.6);
    ellipse(ctx, 0, 0, 3.5, 2.5, 0, lin(ctx, 0, -2.5, 0, 2.5, [[0, BL.flesh], [1, BL.fleshDk]]));
    emissive(ctx, info, 0, 0, 3, BL.bio, 0.4);
  },
});

defineSprite('iris_claw', {
  w: 22,
  h: 18,
  ox: 6,
  oy: 9,
  outline: true,
  draw(ctx, f, info) {
    ellipse(ctx, 0, 0, 6, 6, 0, metal(ctx, -6, 6, '#5a6378'), BL.dark, 0.6);
    for (const s of [-1, 1]) {
      path(ctx, [[2, s * 2], [10, s * 7, 14, s * 1.5], [8, s * 3.5, 3, s * 0.5]]);
      ctx.fillStyle = lin(ctx, 2, 0, 14, 0, [[0, '#8a94aa'], [1, '#2a3040']]);
      ctx.fill();
      ctx.strokeStyle = BL.dark;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    eye(ctx, info, 0, 0, 2.2, '#ff5a3a');
  },
});
