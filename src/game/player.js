/**
 * The player's fighter, A-01 HALCYON.
 * Rules follow the genre's arcade classic: tap to fire, hold to charge the BEAM meter and
 * release to loose a piercing lance; one touch of terrain or a bullet is fatal.
 */
import { W, PH, SHIP_SPEEDS, CHARGE_FULL, CHARGE_MIN } from '../config.js';
import { clamp, approach } from '../core/math.js';
import { frand } from '../core/rng.js';
import { Shot, Beam, Missile } from './weapons.js';
import { P } from '../gfx/particles.js';

export class Player {
  constructor(w) {
    this.w = w;
    this.x = 0;
    this.y = PH / 2;
    this.alive = true;
    this.visible = true;
    this.gear = 0;
    this.maxGear = 0;
    this.missiles = 0;
    this.charge = 0;
    this.chargeHeld = 0;
    this.shotCool = 0;
    this.rapidCool = 0;
    this.missileCool = 0;
    this.invuln = 0;
    this.tilt = 0;
    this.flame = 0;
    this.control = true;
    this.autoX = null;
    this.vx = 0;
    this.vy = 0;
    this.fullFlash = 0;
  }

  /** Loadout reset after a miss (difficulty may keep the pod). */
  resetLoadout() {
    this.gear = 0;
    this.maxGear = 0;
    this.missiles = 0;
    this.charge = 0;
  }

  /** Hitboxes: tiny core vs bullets, wider body vs terrain. */
  get coreHW() {
    return 3;
  }

  get coreHH() {
    return 2.2;
  }

  spawn(x, y) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this.visible = true;
    this.charge = 0;
    this.chargeHeld = 0;
    this.invuln = 150;
    this.control = true;
    this.autoX = null;
  }

  update(input) {
    const w = this.w;
    if (!this.alive) return;
    if (this.invuln > 0) this.invuln--;
    let mx = 0;
    let my = 0;
    if (this.autoX !== null) {
      // scripted flight (entry / stage exit)
      const tx = w.camX + this.autoX;
      mx = clamp((tx - this.x) / 12, -1, 1);
      my = clamp((this.autoY - this.y) / 14, -1, 1);
      if (this.exitBoost) {
        this.exitBoost = Math.min(9, this.exitBoost * 1.06 + 0.05);
        this.x += this.exitBoost;
        mx = 0;
      }
    } else if (this.control) {
      mx = input.mx;
      my = input.my;
    }
    const sp = SHIP_SPEEDS[this.gear];
    this.vx = mx * sp;
    this.vy = my * sp;
    this.x += this.vx + w.dx;
    this.y += this.vy;
    const minX = w.camX + 10;
    const maxX = w.camX + W - 22;
    if (!this.exitBoost) this.x = clamp(this.x, minX, maxX);
    this.y = clamp(this.y, 8, PH - 7);
    this.tilt = approach(this.tilt, my, 0.12);
    this.flame++;
    // terrain kills on contact (generous-but-honest body box)
    if (!w.god && this.invulnTerrain() && w.terrain.hitBox(this.x - 1, this.y + 0.5, 11, 3.6)) {
      w.killPlayer('terrain');
      return;
    }
    if (!this.control || this.autoX !== null) {
      this.charge = 0;
      return;
    }
    this.weapons(input);
  }

  invulnTerrain() {
    // terrain is lethal even while blinking after a respawn, except during the first frames of entry
    return this.invuln < 120;
  }

  weapons(input) {
    const w = this.w;
    if (this.shotCool > 0) this.shotCool--;
    if (this.missileCool > 0) this.missileCool--;
    if (input.pressed('speed')) {
      this.gear = (this.gear + 1) % (this.maxGear + 1);
      w.sfx('gear', this.gear);
      w.popText(this.x, this.y - 14, `SPEED ${this.gear + 1}`, '#7cffb0');
    }
    if (input.pressed('pod')) w.podCommand();
    const rapid = input.held('rapid');
    if (rapid) {
      // rapid fire never charges
      this.charge = 0;
      this.chargeHeld = 0;
      if (--this.rapidCool <= 0) {
        this.rapidCool = 6;
        this.fire();
      }
    } else {
      this.rapidCool = 0;
    }
    if (input.pressed('fire') && !rapid) {
      this.fire();
      this.chargeHeld = 0;
    }
    if (input.held('fire') && !rapid) {
      this.chargeHeld++;
      if (this.chargeHeld > 7) {
        const before = this.charge;
        this.charge = Math.min(CHARGE_FULL, this.charge + 1);
        if (this.charge >= CHARGE_FULL && before < CHARGE_FULL) {
          this.fullFlash = 12;
          w.sfx('chargeFull');
        }
        if (this.chargeHeld % 12 === 0 && this.charge < CHARGE_FULL) this.fire(true);
      }
      w.chargeSound(this.charge / CHARGE_FULL);
    } else {
      w.chargeSound(0);
    }
    if (input.released('fire')) {
      if (this.charge >= CHARGE_MIN) this.fireBeam();
      this.charge = 0;
      this.chargeHeld = 0;
    }
    if (this.fullFlash > 0) this.fullFlash--;
    // charging particles converge on the emitter
    if (this.charge > CHARGE_MIN * 0.5) {
      const k = this.charge / CHARGE_FULL;
      if (w.t % (k > 0.95 ? 1 : 2) === 0) {
        const a = frand(0, Math.PI * 2);
        const d = 18 + frand(0, 14);
        const ex = this.x + 8;
        const ey = this.y;
        w.fx.add(P.STREAK, ex + Math.cos(a) * d, ey + Math.sin(a) * d, -Math.cos(a) * d * 0.06, -Math.sin(a) * d * 0.06, 14, 0.7, k > 0.95 ? '#ffffff' : '#7ff4ff', { drag: 1.06, rel: true });
      }
    }
  }

  /** One trigger pull: ship pellet + pod + bits + missiles. */
  fire(quiet = false) {
    const w = this.w;
    let n = 0;
    for (const p of w.pshots) if (p.kind === 'shot' && p instanceof Shot) n++;
    if (this.shotCool <= 0 && n < 5) {
      w.pshots.push(new Shot(this.x + 18, this.y - 0.5));
      this.shotCool = 4;
      if (!quiet) w.sfx('shot');
    }
    if (w.pod) w.pod.fire();
    for (const b of w.bits) b.fire();
    if (this.missiles > 0 && this.missileCool <= 0) {
      let m = 0;
      for (const p of w.pshots) if (p.kind === 'missile') m++;
      if (m < this.missiles * 2) {
        this.missileCool = 36;
        w.pshots.push(new Missile(this.x, this.y - 4, -1));
        if (this.missiles > 1) w.pshots.push(new Missile(this.x, this.y + 4, 1));
        w.sfx('missile');
      }
    }
  }

  fireBeam() {
    const w = this.w;
    const k = this.charge / CHARGE_FULL;
    const level = k >= 1 ? 5 : 1 + Math.min(3, Math.floor(k * 4));
    w.pshots.push(new Beam(w, this.x + 16, this.y - 0.3, level));
    w.stats.beams++;
    w.fx.glow(this.x + 16, this.y, 10 + level * 4, '#7ff4ff', 10);
  }

  draw(r) {
    if (!this.alive || !this.visible) return;
    if (this.invuln > 0 && this.invuln % 6 < 3 && this.autoX === null) return;
    const t = this.tilt;
    const frame = t < -0.7 ? 2 : t < -0.25 ? 1 : t > 0.7 ? 4 : t > 0.25 ? 3 : 0;
    const fl = (this.flame >> 1) % 4;
    const boost = 1 + Math.max(0, this.vx) * 0.12 + (this.exitBoost ? 0.8 : 0);
    r.spr('flame', this.x - 21, this.y + 0.1, fl, 0, boost, 1, 1, true);
    r.spr('ship', this.x, this.y, frame);
    // charge orb between the prongs
    const k = this.charge / 96;
    if (k > 0.1) {
      const ex = this.x + 9 + k * 3;
      const ey = this.y - 0.2;
      const pulse = 1 + Math.sin(this.w.t * (k >= 1 ? 0.9 : 0.5)) * 0.15;
      r.glow(ex, ey, (5 + k * 13) * pulse, k >= 1 ? '#bffcff' : '#3ff0ff', 0.55 + k * 0.45);
      const ctx = r.ctx;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = k >= 1 ? '#ffffff' : '#c8ffff';
      ctx.beginPath();
      ctx.arc(ex, ey, (1 + k * 3.2) * pulse, 0, Math.PI * 2);
      ctx.fill();
      // arcs between the prongs
      if (!r.arcade || this.w.t % 2 === 0) {
        ctx.strokeStyle = k >= 1 ? '#ffffff' : '#7ff4ff';
        ctx.lineWidth = r.arcade ? 1 : 0.6;
        ctx.beginPath();
        let ax = this.x + 6;
        let ay = this.y - 2.4;
        ctx.moveTo(ax, ay);
        for (let i = 0; i < 4; i++) {
          ax += 3 + k * 2;
          ay = this.y - 2.4 + ((i % 2) * 4.6) + frand(-0.8, 0.8);
          ctx.lineTo(ax, ay);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (this.fullFlash > 0) r.glow(this.x + 8, this.y, 30 * (this.fullFlash / 12), '#ffffff', this.fullFlash / 12);
  }
}
