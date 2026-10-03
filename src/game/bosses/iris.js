/**
 * IRIS WARDEN — stage 1 boss. A gate-sized aperture mechanism grown over by the Bloom.
 * Its eye is only vulnerable while the eight blades are open. Turret nodes on the ring are
 * destructible; segmented arms join the fight in phase 2; the eye sweeps a laser.
 */
import { PH, W } from '../../config.js';
import { register } from '../enemy.js';
import { Boss } from './boss.js';
import { clamp, TAU, lerp, smooth } from '../../core/math.js';
import { frand } from '../../core/rng.js';

const R_IN = 56;
const NODE_ANG = [Math.PI * 0.62, Math.PI * 0.86, Math.PI * 1.14, Math.PI * 1.38];

class IrisWarden extends Boss {
  constructor(w, x, y, opt) {
    super(w, x, y, { ...opt, title: 'IRIS WARDEN' });
    this.setHp(700);
    this.score = 50000;
    this.x = w.camX + W + 120;
    this.y = PH / 2;
    this.aperture = 0;
    this.spin = 0;
    this.cycle = 0;
    this.nodes = NODE_ANG.map((a) => ({ a, hp: 32 * w.diff.hp, dead: false, flash: 0, aim: Math.PI, cool: 40 + frand(0, 40) }));
    this.arms = [
      { base: Math.PI * 0.7, links: 9, ph: 0, reach: 0 },
      { base: Math.PI * 1.3, links: 9, ph: Math.PI, reach: 0 },
    ];
    this.laser = null;
    this.look = Math.PI;
    this.organic = false;
    this.dieLen = 230;
  }

  get cx() {
    return this.x;
  }

  get phase() {
    const k = this.hp / this.maxHp;
    return k > 0.6 ? 1 : k > 0.28 ? 2 : 3;
  }

  nodePos(n) {
    return { x: this.x + Math.cos(n.a) * 70, y: this.y + Math.sin(n.a) * 70 };
  }

  armPoints(arm) {
    const pts = [];
    let a = arm.base;
    let x = this.x + Math.cos(arm.base) * 84;
    let y = this.y + Math.sin(arm.base) * 84;
    pts.push([x, y]);
    const p = this.w.player;
    for (let i = 0; i < arm.links; i++) {
      const wave = Math.sin(this.t * 0.04 + arm.ph + i * 0.55) * 0.35;
      const toP = Math.atan2(p.y - y, p.x - x);
      let d = toP - a;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      a += wave * 0.4 + d * 0.12 * arm.reach;
      const len = 11 * arm.ext;
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
      pts.push([x, y]);
    }
    return pts;
  }

  hitboxes() {
    const b = [];
    for (const n of this.nodes) {
      if (n.dead) continue;
      const p = this.nodePos(n);
      b.push({ x: p.x, y: p.y, hw: 9, hh: 9, type: 'body', part: n });
    }
    for (const arm of this.arms) {
      if (!arm.ext) continue;
      const pts = this.armPoints(arm);
      for (let i = 1; i < pts.length; i++) b.push({ x: pts[i][0], y: pts[i][1], hw: 5, hh: 5, type: 'armor' });
    }
    if (this.aperture > 34) b.push({ x: this.x, y: this.y, hw: 17, hh: 17, type: 'weak', mul: 1 });
    else b.push({ x: this.x, y: this.y, hw: 44, hh: 44, type: 'shield', touch: true, podPierce: false });
    // ring segments (touch-lethal armour)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      b.push({ x: this.x + Math.cos(a) * 72, y: this.y + Math.sin(a) * 72, hw: 13, hh: 13, type: 'armor', noShot: true, noPod: true });
    }
    return b;
  }

  pushSolids(list) {
    list.push({ x: this.x + 110, y: PH / 2, hw: 52, hh: PH, owner: this });
  }

  blastArea() {
    return { x: this.x, y: this.y, w: 170, h: 170 };
  }

  onPartHit(part) {
    part.flash = 4;
  }

  onPartDestroyed(part) {
    const p = this.nodePos(part);
    this.w.fx.explosion(p.x, p.y, 1.4);
    this.w.addScore(2000, p.x, p.y);
    this.w.sfx('explodeL');
    this.w.r.shake(0.25);
  }

  act() {
    const w = this.w;
    this.solid = true;
    // track the camera
    if (this.state === 'enter') {
      const tx = w.camX + 302;
      this.x = lerp(this.x, tx, 0.02) + w.dx;
      if (this.st === 1) {
        w.sfx('bossRoar');
        w.r.shake(0.4);
      }
      if (this.st % 20 === 0) w.r.shake(0.1);
      if (Math.abs(this.x - tx) < 1.5) this.setState('closed');
      return;
    }
    this.x = w.camX + 302;
    const ph = this.phase;
    const p = w.player;
    // eye looks at the player
    this.look = Math.atan2(p.y - this.y, p.x - this.x);
    // arms come alive in phase 2+
    for (const arm of this.arms) {
      const target = ph >= 2 ? 1 : 0;
      arm.ext = clamp((arm.ext || 0) + (target ? 0.01 : -0.02), 0, 1);
      arm.reach = ph >= 3 ? 1 : 0.6;
    }
    // turret nodes
    for (const n of this.nodes) {
      if (n.dead) continue;
      if (n.flash > 0) n.flash--;
      const np = this.nodePos(n);
      n.aim = Math.atan2(p.y - np.y, p.x - np.x);
      if (--n.cool <= 0) {
        const burst = ph >= 2 ? 3 : 2;
        n.cool = Math.round((ph >= 3 ? 70 : 100) * w.diff.fire) + Math.floor(frand(0, 30));
        for (let k = 0; k < burst; k++) {
          w.after(k * 7, () => {
            if (n.dead || this.dying) return;
            const q = this.nodePos(n);
            w.bullets.spawn(q.x + Math.cos(n.aim) * 12, q.y + Math.sin(n.aim) * 12, Math.cos(n.aim) * 2.3, Math.sin(n.aim) * 2.3, 'orb');
          });
        }
      }
    }
    const fast = ph >= 3 ? 0.75 : 1;
    switch (this.state) {
      case 'closed': {
        this.aperture = lerp(this.aperture, 0, 0.2);
        if (ph >= 2 && this.st % Math.round(140 * fast) === 60) {
          for (const s of [-1, 1]) w.spawn('blade', this.x - 40, this.y + s * 46, { a: Math.PI + s * 0.6 });
          w.sfx('spawn');
        }
        if (this.st > 220 * fast) {
          this.setState('opening');
          w.sfx('coreOpen');
        }
        break;
      }
      case 'opening': {
        this.aperture = smooth(Math.min(1, this.st / 50)) * 50;
        this.spin += 0.012;
        if (this.st >= 50) {
          this.cycle++;
          this.setState(this.cycle % 2 ? 'spiral' : 'laser');
        }
        break;
      }
      case 'spiral': {
        this.aperture = 50;
        const every = ph >= 3 ? 4 : 5;
        if (this.st % every === 0 && this.st < 190) {
          const arms = ph >= 2 ? 3 : 2;
          for (let k = 0; k < arms; k++) {
            const a = this.st * 0.07 + (k / arms) * TAU;
            w.bullets.spawn(this.x + Math.cos(a) * 16, this.y + Math.sin(a) * 16, Math.cos(a) * 1.7, Math.sin(a) * 1.7, 'orb');
          }
        }
        if (ph >= 3 && this.st % 60 === 30) w.bullets.ring(this.x, this.y, 18, 1.3, 'orbA', this.st * 0.1);
        if (this.st > 230) this.setState('closing');
        break;
      }
      case 'laser': {
        this.aperture = 50;
        if (this.st === 1) {
          w.sfx('laserCharge', 1);
          const up = p.y < this.y;
          this.laser = { from: Math.PI + (up ? 0.55 : -0.55), to: Math.PI + (up ? -0.55 : 0.55), a: 0, on: false };
          this.laser.a = this.laser.from;
        }
        const L = this.laser;
        if (this.st === 60) {
          L.on = true;
          w.sfx('laserFire', 1.6);
          w.r.shake(0.3);
        }
        if (L.on) {
          const k = clamp((this.st - 60) / 100, 0, 1);
          L.a = lerp(L.from, L.to, smooth(k));
          if (w.t % 2 === 0) w.r.shake(0.05);
          this.laserHit();
          if (this.st > 165) {
            L.on = false;
            this.laser = null;
            this.setState('closing');
          }
        }
        break;
      }
      case 'closing': {
        this.aperture = 50 * (1 - smooth(Math.min(1, this.st / 45)));
        this.spin -= 0.012;
        if (this.st >= 45) this.setState('closed');
        break;
      }
      default:
        break;
    }
  }

  laserHit() {
    const w = this.w;
    const p = w.player;
    const L = this.laser;
    const dx = Math.cos(L.a);
    const dy = Math.sin(L.a);
    const px = p.x - this.x;
    const py = p.y - this.y;
    const along = px * dx + py * dy;
    if (along > 0) {
      const perp = Math.abs(px * dy - py * dx);
      if (perp < 6 && p.alive && p.invuln <= 0) w.killPlayer('laser');
    }
    // impact sparks where the beam hits terrain
    const T = w.terrain;
    for (let d = 30; d < 460; d += 6) {
      const x = this.x + dx * d;
      const y = this.y + dy * d;
      if (T.solidAt(x, y) || x < w.camX - 10) {
        if (w.t % 2 === 0) w.fx.sparks(x, y, 3, '#ffc0a0', 3, 12);
        L.len = d;
        return;
      }
    }
    L.len = 460;
  }

  onFinalBlast() {
    const w = this.w;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      w.fx.add(3, this.x + Math.cos(a) * 60, this.y + Math.sin(a) * 60, Math.cos(a) * 3, Math.sin(a) * 3, 120, 1, null, { grav: 0.05, frame: i % 4, drag: 0.98 });
    }
  }

  drawBlades(r) {
    const ctx = r.ctx;
    const a0 = this.aperture;
    const cx = this.x;
    const cy = this.y;
    for (let i = 0; i < 8; i++) {
      const th = (i / 8) * TAU + this.spin;
      const span = TAU / 8 + 0.32;
      const twist = 0.9;
      const p1 = [cx + Math.cos(th) * (R_IN + 8), cy + Math.sin(th) * (R_IN + 8)];
      const p2 = [cx + Math.cos(th + span) * (R_IN + 8), cy + Math.sin(th + span) * (R_IN + 8)];
      const ai = Math.max(0.01, a0);
      const p3 = [cx + Math.cos(th + span + twist) * ai, cy + Math.sin(th + span + twist) * ai];
      const p4 = [cx + Math.cos(th + twist * 0.6) * ai * 0.9, cy + Math.sin(th + twist * 0.6) * ai * 0.9];
      const mid = th + span * 0.5;
      const g = ctx.createLinearGradient(cx + Math.cos(mid) * R_IN, cy + Math.sin(mid) * R_IN, cx, cy);
      const lightK = 0.5 + 0.5 * Math.cos(mid + 2.3);
      g.addColorStop(0, `rgb(${40 + lightK * 60},${46 + lightK * 66},${62 + lightK * 76})`);
      g.addColorStop(1, `rgb(${20 + lightK * 30},${22 + lightK * 32},${30 + lightK * 40})`);
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.quadraticCurveTo(cx + Math.cos(th + span + 0.4) * ai * 1.6, cy + Math.sin(th + span + 0.4) * ai * 1.6, p3[0], p3[1]);
      ctx.lineTo(p4[0], p4[1]);
      ctx.closePath();
      ctx.fillStyle = r.arcade ? `rgb(${50 + lightK * 60},${56 + lightK * 64},${72 + lightK * 70})` : g;
      ctx.fill();
      ctx.strokeStyle = '#07080c';
      ctx.lineWidth = r.arcade ? 1 : 0.9;
      ctx.stroke();
      // leading-edge highlight
      ctx.beginPath();
      ctx.moveTo(p2[0], p2[1]);
      ctx.quadraticCurveTo(cx + Math.cos(th + span + 0.4) * ai * 1.6, cy + Math.sin(th + span + 0.4) * ai * 1.6, p3[0], p3[1]);
      ctx.strokeStyle = `rgba(200,215,255,${0.25 + lightK * 0.35})`;
      ctx.lineWidth = r.arcade ? 1 : 0.7;
      ctx.stroke();
    }
  }

  draw(r) {
    if (this.hidden) return;
    const w = this.w;
    r.spr('iris_wall', this.x + 60, this.y, 0);
    // eye + pupil
    const lx = Math.cos(this.look) * 6;
    const ly = Math.sin(this.look) * 6;
    r.spr('iris_eye', this.x, this.y);
    const charging = this.state === 'laser' && this.st < 60;
    r.spr('iris_pupil', this.x + lx, this.y + ly, 0, 0, charging ? 0.6 : 1, charging ? 1.15 : 1);
    if (this.flashT > 0 && this.aperture > 34) r.glow(this.x, this.y, 24, '#ffffff', 0.5);
    if (charging) r.glow(this.x, this.y, 10 + this.st * 0.5, '#ff4a2a', 0.4 + this.st / 100);
    this.drawBlades(r);
    r.spr('iris_ring', this.x, this.y);
    for (const n of this.nodes) {
      if (n.dead) continue;
      const p = this.nodePos(n);
      const a = r.arcade ? Math.round(n.aim / (Math.PI / 8)) * (Math.PI / 8) : n.aim;
      r.spr('iris_barrel', p.x, p.y, 0, a);
      r.spr('iris_node', p.x, p.y);
      if (n.flash > 0) r.sprWhite('iris_node', p.x, p.y, 0, 0, 1, 1, 0.7);
    }
    for (const arm of this.arms) {
      if (!arm.ext) continue;
      const pts = this.armPoints(arm);
      for (let i = 1; i < pts.length - 1; i++) {
        const a = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
        r.spr('iris_link', pts[i][0], pts[i][1], 0, r.arcade ? 0 : a, 0.7 + arm.ext * 0.3, 0.7 + arm.ext * 0.3);
      }
      const n = pts.length - 1;
      const a = Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][0] - pts[n - 1][0]);
      r.spr('iris_claw', pts[n][0], pts[n][1], 0, r.arcade ? Math.round(a / (Math.PI / 4)) * (Math.PI / 4) : a);
    }
    // laser
    const L = this.laser;
    if (L) {
      const ctx = r.ctx;
      const len = L.len || 460;
      const x1 = this.x + Math.cos(L.a) * len;
      const y1 = this.y + Math.sin(L.a) * len;
      if (!L.on) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(w.t * 0.8);
        ctx.strokeStyle = '#ff5a3a';
        ctx.lineWidth = 0.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(L.from) * 420, this.y + Math.sin(L.from) * 420);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (const [wd, col, al] of [[16, '#ff2a1a', 0.35], [9, '#ff6a3a', 0.7], [4, '#ffe0c0', 1]]) {
          ctx.globalAlpha = al;
          ctx.strokeStyle = col;
          ctx.lineWidth = wd * (0.85 + 0.15 * Math.sin(w.t * 1.3));
          ctx.beginPath();
          ctx.moveTo(this.x + Math.cos(L.a) * 14, this.y + Math.sin(L.a) * 14);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        r.glow(this.x, this.y, 30, '#ff5a3a', 0.9);
        r.glow(x1, y1, 14, '#ffb080', 0.8);
      }
    }
  }
}
register('iris', IrisWarden);
