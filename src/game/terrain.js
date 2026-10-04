/**
 * Stage terrain: sampled ceiling/floor heightfields, static blocks (some destructible)
 * and dynamic solids contributed by moving machinery. Contact with any of it is fatal.
 */
import { W, PH } from '../config.js';
import { fbm1 } from '../gfx/noise.js';
import { themeTexture, THEMES } from '../gfx/textures.js';
import { hash1 } from '../core/rng.js';
import { rgba, shade } from '../core/math.js';

export const STEP = 4;
export const NONE_C = -999;
export const NONE_F = 999;

function sample(points, out, none, rough, seed) {
  const n = out.length;
  if (!points || !points.length) {
    out.fill(none);
    return;
  }
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const x = i * STEP;
    while (seg < points.length - 2 && points[seg + 1][0] <= x) seg++;
    const a = points[seg];
    const b = points[Math.min(seg + 1, points.length - 1)];
    let y;
    if (x <= a[0]) y = a[1];
    else if (x >= b[0]) y = b[1];
    else if (a[1] === null || b[1] === null) y = null;
    else {
      const t = (x - a[0]) / (b[0] - a[0]);
      const e = a[2] === 'smooth' ? t * t * (3 - 2 * t) : t;
      y = a[1] + (b[1] - a[1]) * e;
    }
    if (y === null || y === undefined) out[i] = none;
    else {
      if (rough) y += (fbm1(x / rough.scale, 3, seed) - 0.5) * 2 * rough.amp * (none < 0 ? 1 : -1);
      out[i] = y;
    }
  }
}

export class Terrain {
  constructor(def) {
    this.def = def;
    this.len = def.length;
    this.theme = def.theme || 'hull';
    const n = Math.ceil(this.len / STEP) + 4;
    this.n = n;
    this.ceil = new Float32Array(n);
    this.floor = new Float32Array(n);
    sample(def.ceil, this.ceil, NONE_C, def.roughC, 11);
    sample(def.floor, this.floor, NONE_F, def.roughF, 23);
    this.blocks = (def.blocks || []).map((b, i) => ({
      x: b[0],
      y: b[1],
      w: b[2],
      h: b[3],
      hp: b[4] ?? Infinity,
      maxHp: b[4] ?? Infinity,
      style: b[5] || 'plain',
      alive: true,
      id: i,
      flash: 0,
    }));
    this.blocks.sort((a, b) => a.x - b.x);
    this.vis = [];
    this.dyn = [];
    // living walls: [x0, x1, amp, speed, wavelength]
    this.pulse = def.pulse || [];
    this.time = 0;
  }

  /** Peristaltic wall motion (positive = the passage narrows). */
  pulseAt(x) {
    let v = 0;
    for (const [x0, x1, amp, speed, wl] of this.pulse) {
      if (x < x0 || x > x1) continue;
      const edge = Math.min(1, (x - x0) / 80, (x1 - x) / 80);
      v += amp * edge * (0.5 + 0.5 * Math.sin(this.time * speed - (x / wl) * Math.PI * 2));
    }
    return v;
  }

  ceilS(i) {
    const v = this.ceil[i];
    return v === NONE_C || !this.pulse.length ? v : v + this.pulseAt(i * STEP);
  }

  floorS(i) {
    const v = this.floor[i];
    return v === NONE_F || !this.pulse.length ? v : v - this.pulseAt(i * STEP);
  }

  /** Called once per frame with the camera so block queries only scan nearby blocks. */
  prepare(camX) {
    this.vis.length = 0;
    for (const b of this.blocks) {
      if (!b.alive) continue;
      if (b.x > camX + W + 64) break;
      if (b.x + b.w < camX - 64) continue;
      this.vis.push(b);
    }
  }

  ceilAt(x) {
    const f = x / STEP;
    let i = Math.floor(f);
    if (i < 0) i = 0;
    if (i >= this.n - 1) return this.ceil[this.n - 1];
    const a = this.ceil[i];
    const b = this.ceil[i + 1];
    if (a === NONE_C || b === NONE_C) return Math.max(a, b) === NONE_C ? NONE_C : f - i < 0.5 ? a : b;
    const v = a + (b - a) * (f - i);
    return this.pulse.length ? v + this.pulseAt(x) : v;
  }

  floorAt(x) {
    const f = x / STEP;
    let i = Math.floor(f);
    if (i < 0) i = 0;
    if (i >= this.n - 1) return this.floor[this.n - 1];
    const a = this.floor[i];
    const b = this.floor[i + 1];
    if (a === NONE_F || b === NONE_F) return Math.min(a, b) === NONE_F ? NONE_F : f - i < 0.5 ? a : b;
    const v = a + (b - a) * (f - i);
    return this.pulse.length ? v - this.pulseAt(x) : v;
  }

  blockAt(x, y) {
    for (const b of this.vis) {
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b;
    }
    for (const d of this.dyn) {
      if (Math.abs(x - d.x) < d.hw && Math.abs(y - d.y) < d.hh) return d;
    }
    return null;
  }

  solidAt(x, y) {
    return y < this.ceilAt(x) || y > this.floorAt(x) || this.blockAt(x, y) !== null;
  }

  /** Box (centre + half extents) against all solids. */
  hitBox(cx, cy, hw, hh) {
    const x0 = cx - hw;
    const x1 = cx + hw;
    for (let x = x0; x <= x1 + 0.01; x += Math.min(STEP, (x1 - x0) / 2 || 1)) {
      if (cy - hh < this.ceilAt(x) || cy + hh > this.floorAt(x)) return true;
    }
    for (const b of this.vis) {
      if (x1 > b.x && x0 < b.x + b.w && cy + hh > b.y && cy - hh < b.y + b.h) return true;
    }
    for (const d of this.dyn) {
      if (Math.abs(cx - d.x) < hw + d.hw && Math.abs(cy - d.y) < hh + d.hh) return true;
    }
    return false;
  }

  /**
   * Damage a destructible block at a point.
   * @returns {boolean} true when the point was a destructible block (projectiles that pierce may continue)
   */
  damageAt(x, y, dmg, w, pierce = false) {
    for (const b of this.vis) {
      if (!b.alive || !(x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) continue;
      if (b.hp === Infinity) return false;
      b.hp -= dmg;
      b.flash = 4;
      if (b.hp <= 0) {
        b.alive = false;
        w.blockDestroyed(b);
        return true;
      }
      return pierce ? false : true;
    }
    for (const d of this.dyn) {
      if (d.owner && Math.abs(x - d.x) < d.hw && Math.abs(y - d.y) < d.hh && d.owner.onSolidHit) {
        d.owner.onSolidHit(dmg, x, y);
        return false;
      }
    }
    return false;
  }

  // ------------------------------------------------------------------ rendering

  draw(r, t) {
    const T = THEMES[this.theme];
    const tex = themeTexture(this.theme, r.S, r.arcade);
    const ctx = r.ctx;
    const pat = ctx.createPattern(tex, 'repeat');
    const k = 1 / (r.arcade ? 1 : r.S);
    if (pat.setTransform) pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    const camX = r.camX;
    const i0 = Math.max(0, Math.floor((camX - 24) / STEP));
    const i1 = Math.min(this.n - 1, Math.ceil((camX + W + 24) / STEP));
    this.drawSurface(r, pat, T, i0, i1, false, t);
    this.drawSurface(r, pat, T, i0, i1, true, t);
    this.drawBlocks(r, pat, T, t);
  }

  runs(arr, none, i0, i1) {
    const out = [];
    let s = -1;
    for (let i = i0; i <= i1; i++) {
      const has = arr[i] !== none;
      if (has && s < 0) s = i;
      if ((!has || i === i1) && s >= 0) {
        out.push([s, has ? i : i - 1]);
        s = -1;
      }
    }
    return out;
  }

  drawSurface(r, pat, T, i0, i1, isFloor, t) {
    const raw = isFloor ? this.floor : this.ceil;
    const none = isFloor ? NONE_F : NONE_C;
    let arr = raw;
    if (this.pulse.length) {
      arr = this.tmp || (this.tmp = new Float32Array(this.n));
      for (let i = i0; i <= i1; i++) arr[i] = isFloor ? this.floorS(i) : this.ceilS(i);
    }
    const ctx = r.ctx;
    const far = isFloor ? PH + 40 : -40;
    const dir = isFloor ? 1 : -1;
    for (const [a, b] of this.runs(raw, none, i0, i1)) {
      if (b <= a) continue;
      const edge = (off) => {
        ctx.moveTo(a * STEP, far);
        for (let i = a; i <= b; i++) ctx.lineTo(i * STEP, arr[i] + off * dir);
        ctx.lineTo(b * STEP, far);
        ctx.closePath();
      };
      ctx.beginPath();
      edge(0);
      ctx.fillStyle = pat;
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      edge(0);
      ctx.clip();
      // depth bands that follow the contour
      const bands = r.arcade ? [[5, 0.22], [14, 0.3]] : [[3, 0.12], [8, 0.16], [16, 0.2], [30, 0.25]];
      for (const [d, al] of bands) {
        ctx.beginPath();
        edge(d);
        ctx.fillStyle = `rgba(0,0,0,${al})`;
        ctx.fill();
      }
      // trim band right at the surface
      ctx.beginPath();
      for (let i = a; i <= b; i++) ctx.lineTo(i * STEP, arr[i] + 2.2 * dir);
      ctx.strokeStyle = rgba(shade(T.rim, -0.45), 0.9);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      // rim light + dark outline against the sky
      ctx.beginPath();
      for (let i = a; i <= b; i++) {
        if (i === a) ctx.moveTo(i * STEP, arr[i]);
        else ctx.lineTo(i * STEP, arr[i]);
      }
      ctx.strokeStyle = T.edge;
      ctx.lineWidth = r.arcade ? 1 : 1.6;
      ctx.stroke();
      ctx.beginPath();
      for (let i = a; i <= b; i++) {
        if (i === a) ctx.moveTo(i * STEP, arr[i] + 0.9 * dir);
        else ctx.lineTo(i * STEP, arr[i] + 0.9 * dir);
      }
      ctx.strokeStyle = rgba(T.rim, isFloor ? 0.85 : 0.45);
      ctx.lineWidth = r.arcade ? 1 : 0.7;
      ctx.stroke();
      this.decorate(r, T, a, b, arr, isFloor, t);
    }
  }

  /** Small details anchored to the surface (lights, growths) – deterministic per sample index. */
  decorate(r, T, a, b, arr, isFloor, t) {
    const dir = isFloor ? 1 : -1;
    const theme = this.theme;
    for (let i = a; i <= b; i++) {
      const h = hash1(i * 7 + (isFloor ? 3 : 101));
      const x = i * STEP;
      const y = arr[i];
      if (theme === 'hull' || theme === 'wreck' || theme === 'warship') {
        if (h < 0.035) {
          const on = Math.sin(t * 0.08 + i) > -0.2;
          r.rect(x - 1, y + dir * 4 - 1, 2, 2, on ? T.glow : '#203038');
          if (on) r.glow(x, y + dir * 4, 5, T.glow, 0.5);
        }
      } else if (theme === 'flesh' || theme === 'core') {
        if (h < 0.05) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 0.06 + i * 1.7);
          r.glow(x, y + dir * 3, 4 + pulse * 3, T.glow, 0.35 + pulse * 0.35);
        }
      } else if (theme === 'bone') {
        if (h < 0.06) {
          const ctx = r.ctx;
          ctx.fillStyle = '#d8c8a4';
          ctx.beginPath();
          ctx.moveTo(x - 2, y);
          ctx.lineTo(x, y - dir * (4 + h * 60));
          ctx.lineTo(x + 2, y);
          ctx.fill();
        }
      }
    }
  }

  drawBlocks(r, pat, T, t) {
    const ctx = r.ctx;
    for (const b of this.vis) {
      if (!b.alive) continue;
      const destr = b.hp !== Infinity;
      ctx.fillStyle = pat;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // bevel
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x, b.y, b.w, 1.2);
      ctx.fillRect(b.x, b.y, 1.2, b.h);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(b.x, b.y + b.h - 1.6, b.w, 1.6);
      ctx.fillRect(b.x + b.w - 1.6, b.y, 1.6, b.h);
      if (destr) {
        const dmg = 1 - b.hp / b.maxHp;
        ctx.strokeStyle = rgba(T.glow, 0.5 + dmg * 0.5);
        ctx.lineWidth = 0.8;
        ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
        if (dmg > 0.3) {
          ctx.beginPath();
          ctx.moveTo(b.x + b.w * 0.2, b.y + b.h * 0.3);
          ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.55);
          ctx.lineTo(b.x + b.w * 0.75, b.y + b.h * 0.4);
          ctx.stroke();
        }
        if (b.flash > 0) {
          b.flash--;
          r.rect(b.x, b.y, b.w, b.h, '#ffffff', 0.35);
        }
      }
      ctx.strokeStyle = T.edge;
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    }
  }
}
