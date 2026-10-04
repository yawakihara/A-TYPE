/**
 * One stage of play: camera/scroll, timeline events, checkpoints, entities, collisions,
 * death/respawn rules, items and scoring, boss and stage-clear flow.
 */
import { W, PH, DIFFICULTIES, EXTENDS, EXTEND_EVERY } from '../config.js';
import { boxHit, circleBox, clamp } from '../core/math.js';
import { Rng, frand } from '../core/rng.js';
import { Particles, P } from '../gfx/particles.js';
import { Player } from './player.js';
import { Pod, Bit } from './pod.js';
import { Bullets } from './bullets.js';
import { Item, ITEM } from './items.js';
import { Terrain } from './terrain.js';
import { REGISTRY } from './enemy.js';
import { makeBackground } from './backgrounds.js';
import { text } from '../gfx/font.js';

export class World {
  /**
   * @param {object} game Game (renderer, input, audio, settings)
   * @param {object} session persistent run state (score, lives, difficulty…)
   * @param {object} stage stage definition (from stages/)
   */
  constructor(game, session, stage, opt = {}) {
    this.game = game;
    this.r = game.r;
    this.input = game.input;
    this.audio = game.audio;
    this.session = session;
    this.stage = stage;
    this.diff = DIFFICULTIES[session.diff];
    this.bulletMul = this.diff.bullet * (1 + session.loop * 0.15);
    this.god = !!opt.god;
    this.rng = new Rng(1234 + stage.index * 77);
    this.terrain = new Terrain(stage.terrain);
    this.bg = makeBackground(stage.bg, this);
    this.player = new Player(this);
    this.pod = null;
    this.podColorKept = null;
    this.bits = [];
    this.pshots = [];
    this.enemies = [];
    this.items = [];
    this.gems = [];
    this.bullets = new Bullets(this);
    this.fx = new Particles();
    this.popups = [];
    this.camX = 0;
    this.camY = 0;
    this.dx = 0;
    this.scroll = stage.scroll ?? 0.5;
    this.scrollTarget = this.scroll;
    this.t = 0;
    this.events = stage.events.map((e) => ({ ...e, done: false }));
    this.events.sort((a, b) => a.at - b.at);
    this.evIdx = 0;
    this.checkpoints = stage.checkpoints || [0];
    this.cpIdx = 0;
    this.phase = 'play';
    this.phaseT = 0;
    this.boss = null;
    this.bossState = 'none';
    this.warnT = 0;
    this.stats = { kills: 0, beams: 0, absorbed: 0, deaths: 0, chain: 0, bestChain: 0, items: 0, enemies: 0 };
    this.stageDeaths = 0;
    this.chargeLevel = 0;
    this.slowmo = 0;
    this.hitstop = 0;
    this.msg = null;
    this.timers = [];
    this.onDone = null; // (result) => void : 'clear' | 'gameover'
    this.startFrom(opt.checkpoint ?? 0, true);
  }

  // ------------------------------------------------------------------ setup / restart

  startFrom(cpIndex, first = false) {
    this.cpIdx = clamp(cpIndex, 0, this.checkpoints.length - 1);
    const cx = this.checkpoints[this.cpIdx];
    this.camX = cx;
    this.dx = 0;
    this.enemies.length = 0;
    this.pshots.length = 0;
    this.items.length = 0;
    this.gems.length = 0;
    this.bullets.clear();
    this.fx.clear();
    this.popups.length = 0;
    this.timers.length = 0;
    this.boss = null;
    this.bossState = 'none';
    this.warnT = 0;
    this.scroll = this.scrollAt(cx);
    this.scrollTarget = this.scroll;
    for (const b of this.terrain.blocks) {
      b.alive = true;
      b.hp = b.maxHp;
    }
    for (const e of this.events) e.done = (e.wx ?? e.at) < cx - 1 && !(e.wx !== undefined && e.wx >= cx);
    this.evIdx = 0;
    this.bits.length = 0;
    const p = this.player;
    if (!first) {
      p.resetLoadout();
      if (this.diff.keepPod && this.podColorKept) {
        this.pod = new Pod(this, this.podColorKept);
      } else this.pod = null;
    }
    p.spawn(cx - 24, PH / 2);
    p.autoX = 60;
    p.autoY = PH / 2;
    p.control = false;
    this.entryT = 50;
    this.phase = 'play';
    this.phaseT = 0;
    if (this.stage.onRestart) this.stage.onRestart(this, cx);
    if (!first) this.game.music(this.stage.music);
  }

  scrollAt(x) {
    let s = this.stage.scroll ?? 0.5;
    for (const e of this.events) if (e.scroll !== undefined && e.at <= x) s = e.scroll;
    return s;
  }

  // ------------------------------------------------------------------ helpers used by entities

  sfx(name, arg) {
    this.audio.sfx(name, arg);
  }

  chargeSound(k) {
    this.chargeLevel = k;
    this.audio.charge(k);
  }

  rumble(s, w, ms) {
    this.input.rumble(s, w, ms);
  }

  spawn(name, x, y, opt = {}) {
    const C = REGISTRY.get(name);
    if (!C) throw new Error(`unknown enemy ${name}`);
    const e = new C(this, x, y, opt);
    this.enemies.push(e);
    this.stats.enemies++;
    return e;
  }

  /** Spawn relative to the right screen edge. */
  spawnR(name, dx, y, opt) {
    return this.spawn(name, this.camX + W + dx, y, opt);
  }

  setScroll(v) {
    this.scrollTarget = v;
  }

  /** Run fn after n logic frames (respects pause / slow-motion, unlike setTimeout). */
  after(n, fn) {
    this.timers.push({ t: this.t + Math.max(1, n), fn });
  }

  nearestEnemy(x, y, onscreen) {
    let best = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (e.dead || e.untargetable) continue;
      if (onscreen && !e.onScreen(-6)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  addScore(n, x, y) {
    if (!n) return;
    const s = this.session;
    s.score += n;
    while (s.score >= nextExtendAt(s.extends)) {
      s.extends++;
      s.lives++;
      this.sfx('extend');
      this.popText(this.player.x, this.player.y - 20, '1UP', '#7cffb0', 90);
    }
    if (x !== undefined && n >= 200) this.popText(x, y - 6, String(n), n >= 1000 ? '#ffe36b' : '#e8ecf6', 40);
  }

  popText(x, y, str, color = '#ffffff', life = 45) {
    this.popups.push({ x, y, str, color, life, max: life });
  }

  dropItem(x, y, type, color) {
    this.items.push(new Item(this, x, y, type, color));
  }

  spawnGem(x, y) {
    this.gems.push({ x, y, vx: frand(-0.6, 0.6), vy: frand(-1.2, 0.4), t: 0, dead: false });
  }

  collect(item) {
    const p = this.player;
    this.stats.items++;
    this.addScore(500);
    switch (item.type) {
      case ITEM.CRYSTAL: {
        const c = item.color;
        if (!this.pod) {
          this.pod = new Pod(this, c);
          this.sfx('podSummon');
          this.popText(p.x, p.y - 16, 'AEGIS', '#bff8ff', 60);
        } else {
          const up = this.pod.upgrade(c);
          this.sfx('powerup');
          const name = { red: 'HELIX', blue: 'PRISM', yellow: 'CRAWLER' }[c];
          this.popText(p.x, p.y - 16, up ? `${name} LV${this.pod.level}` : name, { red: '#ff7a8a', blue: '#7fc4ff', yellow: '#ffe36b' }[c], 60);
        }
        this.podColorKept = c;
        break;
      }
      case ITEM.SPEED:
        if (p.maxGear < 3) {
          p.maxGear++;
          p.gear = p.maxGear;
        }
        this.sfx('speedup');
        this.popText(p.x, p.y - 16, 'SPEED UP', '#7cffb0', 60);
        break;
      case ITEM.MISSILE:
        p.missiles = Math.min(2, p.missiles + 1);
        this.sfx('powerup');
        this.popText(p.x, p.y - 16, `MISSILE ${p.missiles}`, '#ffb070', 60);
        break;
      case ITEM.BIT:
        if (this.bits.length < 2) this.bits.push(new Bit(this, this.bits.length === 0 ? -1 : 1));
        this.sfx('powerup');
        this.popText(p.x, p.y - 16, 'BIT', '#d0a8ff', 60);
        break;
      default:
        this.addScore(4500, p.x, p.y);
        this.sfx('powerup');
        break;
    }
    this.fx.ring(p.x, p.y, 22, '#ffffff', 16);
    this.rumble(0.1, 0.4, 70);
  }

  podCommand() {
    if (this.pod) this.pod.command();
  }

  onEnemyKilled(e) {
    this.stats.kills++;
    this.game.medalEvent('kill', e);
  }

  blockDestroyed(b) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    this.fx.explosion(cx, cy, Math.min(1.6, (b.w + b.h) / 30));
    this.addScore(b.score ?? 100, cx, cy);
    this.sfx('blockBreak');
  }

  beamChain(n, x, y) {
    const bonus = [0, 0, 1000, 2000, 4000, 8000, 16000][Math.min(6, n)] || 16000;
    this.addScore(bonus);
    this.popText(x, y - 14, `CHAIN ×${n}  +${bonus}`, '#7ff4ff', 70);
    this.stats.bestChain = Math.max(this.stats.bestChain, n);
    this.game.medalEvent('chain', n);
  }

  /** Text helper for in-world labels (items). */
  textAt(str, x, y, color) {
    text(this.r, str, x, y, { align: 'center', color, font: 'pixel' });
  }

  showMessage(lines, frames = 180, color = '#ffffff') {
    this.msg = { lines, t: 0, life: frames, color };
  }

  // ------------------------------------------------------------------ player death / respawn

  killPlayer(cause) {
    const p = this.player;
    if (!p.alive || this.god || this.phase !== 'play') return;
    p.alive = false;
    this.stats.deaths++;
    this.stageDeaths++;
    this.chargeSound(0);
    this.fx.explosion(p.x, p.y, 2.2);
    this.fx.sparks(p.x, p.y, 40, '#bff8ff', 5, 30);
    for (let i = 0; i < 8; i++) this.fx.add(P.DEBRIS, p.x, p.y, frand(-3, 3), frand(-3, 2), 90, 1, null, { grav: 0.05, frame: i % 4, drag: 0.985 });
    this.r.shake(0.7);
    this.r.doFlash(0.6, [1, 0.85, 0.7]);
    this.r.wave(p.x - this.camX, p.y, 1.2, 1);
    this.r.aberration(2);
    this.rumble(1, 1, 450);
    this.sfx('playerDeath');
    this.hitstop = 8;
    this.slowmo = 40;
    if (this.pod) {
      const pod = this.pod;
      this.fx.explosion(pod.x, pod.y, 1);
      this.fx.sparks(pod.x, pod.y, 20, '#bff8ff', 4, 26);
      this.pod = null;
    }
    for (const b of this.bits) this.fx.explosion(b.x, b.y, 0.6);
    this.bits.length = 0;
    this.phase = 'dead';
    this.phaseT = 0;
    this.game.medalEvent('death', cause);
  }

  // ------------------------------------------------------------------ boss flow

  startBoss(name, opt = {}) {
    if (this.bossState !== 'none') return;
    this.bossState = 'warn';
    this.warnT = 0;
    this.bossName = name;
    this.bossOpt = opt;
    this.setScroll(opt.scroll ?? 0);
    this.game.music(null, 1.2);
    this.sfx('warning');
  }

  bossDefeated(boss) {
    if (this.bossState === 'dead') return;
    this.bossState = 'dead';
    this.bullets.cancel(true);
    this.addScore(boss.score, boss.x, boss.y);
    this.phase = 'clear';
    this.phaseT = 0;
    this.slowmo = 50;
    this.game.music(null, 0.5);
    this.game.medalEvent('boss', { stage: this.stage.index, deaths: this.stageDeaths });
  }

  // ------------------------------------------------------------------ main update

  update() {
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }
    if (this.slowmo > 0) {
      this.slowmo--;
      if (this.slowmo % 2 === 0) return;
    }
    this.t++;
    this.phaseT++;
    if (this.timers.length) {
      const now = this.t;
      const due = this.timers.filter((x) => x.t <= now);
      if (due.length) {
        this.timers = this.timers.filter((x) => x.t > now);
        for (const d of due) d.fn();
      }
    }
    // scroll
    this.scroll += clamp(this.scrollTarget - this.scroll, -0.01, 0.01);
    const prev = this.camX;
    const maxCam = this.terrain.len - W;
    this.camX = Math.min(maxCam, this.camX + this.scroll);
    this.dx = this.camX - prev;
    this.r.camX = this.camX;
    this.r.camY = this.camY;
    this.terrain.time = this.t;
    this.terrain.prepare(this.camX);
    this.terrain.dyn.length = 0;
    for (const e of this.enemies) if (e.solid && !e.dead) e.pushSolids(this.terrain.dyn);
    this.runEvents();
    while (this.cpIdx + 1 < this.checkpoints.length && this.camX >= this.checkpoints[this.cpIdx + 1]) this.cpIdx++;
    // entry choreography
    const p = this.player;
    if (this.entryT > 0) {
      this.entryT--;
      if (this.entryT === 0) {
        p.autoX = null;
        p.control = true;
      }
    }
    p.update(this.input);
    if (this.pod) this.pod.update();
    for (const b of this.bits) b.update();
    for (const s of this.pshots) s.update(this);
    for (const e of this.enemies) if (!e.dead) e.update();
    this.bullets.update();
    for (const it of this.items) it.update();
    this.updateGems();
    this.collide();
    this.pshots = this.pshots.filter((s) => !s.dead);
    this.enemies = this.enemies.filter((e) => !e.dead || e.keep);
    this.items = this.items.filter((i) => !i.dead);
    this.fx.update(this.dx);
    for (const pp of this.popups) {
      pp.life--;
      pp.y -= 0.35;
      pp.x += this.dx;
    }
    this.popups = this.popups.filter((pp) => pp.life > 0);
    if (this.msg && ++this.msg.t > this.msg.life) this.msg = null;
    this.bg.update?.(this);
    this.updateBoss();
    this.updatePhase();
  }

  runEvents() {
    const ev = this.events;
    while (this.evIdx < ev.length && ev[this.evIdx].done) this.evIdx++;
    for (let i = this.evIdx; i < ev.length && ev[i].at <= this.camX; i++) {
      const e = ev[i];
      if (e.done) continue;
      e.done = true;
      if (e.scroll !== undefined) this.setScroll(e.scroll);
      if (e.fn) e.fn(this);
    }
  }

  updateBoss() {
    if (this.bossState === 'warn') {
      this.warnT++;
      if (this.warnT === 30) this.game.music(this.bossOpt.music || 'boss');
      if (this.warnT >= (this.bossOpt.warn ?? 170)) {
        this.bossState = 'fight';
        this.boss = this.spawn(this.bossName, this.camX + W + 60, PH / 2, this.bossOpt);
        this.boss.boss = true;
      }
    }
  }

  updatePhase() {
    const p = this.player;
    if (this.phase === 'dead') {
      if (this.phaseT === 150) {
        if (this.session.lives > 0 || this.session.infinite) {
          if (!this.session.infinite) this.session.lives--;
          this.startFrom(this.cpIdx);
        } else {
          this.phase = 'over';
          this.phaseT = 0;
          if (this.onDone) this.onDone('gameover');
        }
      }
    } else if (this.phase === 'clear') {
      if (this.phaseT === 100) {
        this.game.music('clear', 0, false);
        p.control = false;
        p.autoX = 80;
        p.autoY = PH / 2;
      }
      if (this.phaseT === 190) p.exitBoost = 0.5;
      if (this.phaseT === 330) {
        p.exitBoost = 0;
        p.visible = false;
        this.phase = 'tally';
        this.phaseT = 0;
        if (this.onDone) this.onDone('clear');
      }
    }
  }

  updateGems() {
    const p = this.player;
    for (const g of this.gems) {
      g.t++;
      if (g.t > 20 && p.alive) {
        const dx = p.x - g.x;
        const dy = p.y - g.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(8, 1 + g.t * 0.08);
        g.vx = (dx / d) * sp;
        g.vy = (dy / d) * sp;
        if (d < 10) {
          g.dead = true;
          this.addScore(100);
          this.sfx('gem');
        }
      } else {
        g.vx *= 0.95;
        g.vy *= 0.95;
      }
      g.x += g.vx + this.dx;
      g.y += g.vy;
      if (g.t > 240) g.dead = true;
    }
    this.gems = this.gems.filter((g) => !g.dead);
  }

  // ------------------------------------------------------------------ collisions

  collide() {
    const p = this.player;
    const enemies = this.enemies;
    // player projectiles vs enemies
    for (const s of this.pshots) {
      if (s.dead) continue;
      const sh = s.shape();
      for (const e of enemies) {
        if (e.dead || e.untouchable) continue;
        const boxes = e.boxes();
        let hit = null;
        if (s.kind === 'beam') {
          // the LANCE pierces armour: strike the most vulnerable overlapping box behind it
          let rank = -1;
          for (const b of boxes) {
            if (b.noShot || (b.part && b.part.dead)) continue;
            if (!boxHit(sh.x, sh.y, sh.hw, sh.hh, b.x, b.y, b.hw, b.hh)) continue;
            const r = b.type === 'weak' ? 3 : b.type === 'body' ? 2 : 1;
            if (r > rank) {
              rank = r;
              hit = b;
            }
          }
        } else {
          for (const b of boxes) {
            if (b.noShot || (b.part && b.part.dead)) continue;
            if (boxHit(sh.x, sh.y, sh.hw, sh.hh, b.x, b.y, b.hw, b.hh)) {
              hit = b;
              break;
            }
          }
        }
        if (!hit) continue;
        if (s.pierce && !s.canHit(e, this)) continue;
        const res = e.damage(s.dmg, s.kind, hit);
        if (res !== 'none') s.onHit(this, res, e, hit);
        if (res === 'armor') this.sfx('clink');
        else if (res === 'hit') this.sfx('hit');
        if (s.dead) break;
      }
    }
    // pod & bits grind enemies
    if (this.pod) {
      const pod = this.pod;
      const dmg = pod.contactDamage();
      for (const e of enemies) {
        if (e.dead || e.untouchable) continue;
        for (const b of e.boxes()) {
          if (b.noPod || (b.part && b.part.dead)) continue;
          if (b.type === 'shield' && !b.podPierce) continue;
          if (circleBox(pod.x, pod.y, pod.r, b.x, b.y, b.hw, b.hh)) {
            let d = dmg;
            if (pod.state === 'launch' && pod.hitSet && !pod.hitSet.has(e)) {
              pod.hitSet.add(e);
              d += 4;
              this.r.shake(0.08);
            }
            if (b.lodge && pod.state === 'launch') pod.lodge(e);
            const res = e.damage(d, 'pod', b);
            if (res === 'hit' && this.t % 4 === 0) this.fx.sparks(pod.x + (b.x - pod.x) * 0.5, pod.y + (b.y - pod.y) * 0.5, 2, '#ffe0f0', 2.5, 8);
            pod.grind = 6;
            break;
          }
        }
      }
    }
    for (const bit of this.bits) {
      for (const e of enemies) {
        if (e.dead || e.untouchable) continue;
        for (const b of e.boxes()) {
          if (b.part && b.part.dead) continue;
          if (circleBox(bit.x, bit.y, 5, b.x, b.y, b.hw, b.hh)) {
            e.damage(0.15, 'bit', b);
            break;
          }
        }
      }
    }
    if (!p.alive || this.god || p.invuln > 0 || this.phase !== 'play') return;
    // bullets vs player core
    for (const b of this.bullets.list) {
      if (b.dead) continue;
      if (b.kind === 'laser') {
        const a = Math.atan2(b.vy, b.vx);
        for (let k = 0; k <= b.len; k += 3) {
          if (circleBox(b.x - Math.cos(a) * k, b.y - Math.sin(a) * k, b.r, p.x, p.y, p.coreHW, p.coreHH)) {
            this.killPlayer('bullet');
            return;
          }
        }
      } else if (circleBox(b.x, b.y, b.r * 0.8, p.x, p.y, p.coreHW, p.coreHH)) {
        this.killPlayer('bullet');
        return;
      }
    }
    // enemy bodies vs player
    for (const e of enemies) {
      if (e.dead || !e.touch) continue;
      for (const b of e.boxes()) {
        if (b.part && b.part.dead) continue;
        if (b.touch === false) continue;
        if (boxHit(p.x, p.y, 8, 3.2, b.x, b.y, b.hw * 0.85, b.hh * 0.85)) {
          this.killPlayer('enemy');
          return;
        }
      }
    }
  }

  // ------------------------------------------------------------------ draw

  draw(r) {
    r.camX = this.camX;
    r.camY = this.camY;
    this.bg.draw(r, this);
    r.world();
    for (const e of this.enemies) if (!e.dead && e.layer === 0) e.draw(r);
    this.terrain.draw(r, this.t);
    for (const e of this.enemies) if (!e.dead && e.layer === 1) e.draw(r);
    for (const it of this.items) it.draw(r);
    for (const s of this.pshots) if (s.kind !== 'beam') s.draw(r);
    for (const b of this.bits) b.draw(r);
    this.player.draw(r);
    if (this.pod) this.pod.draw(r);
    for (const e of this.enemies) if (!e.dead && e.layer === 2) e.draw(r);
    for (const s of this.pshots) if (s.kind === 'beam') s.draw(r);
    this.fx.draw(r);
    for (const g of this.gems) r.spr('gem', g.x, g.y, (g.t >> 3) & 1);
    this.bullets.draw(r);
    for (const e of this.enemies) if (!e.dead && e.layer === 3) e.draw(r);
    this.bg.drawFront?.(r, this);
    for (const pp of this.popups) {
      text(r, pp.str, pp.x, pp.y, { align: 'center', color: pp.color, alpha: Math.min(1, pp.life / 15), font: 'pixel', shadow: true });
    }
    r.screenShake();
    this.drawOverlay(r);
  }

  drawOverlay(r) {
    const bar = this.enemies.find((e) => e.bar && !e.dead && !e.dying && e.state !== 'enter');
    if (bar) {
      const k = Math.max(0, bar.hp / bar.maxHp);
      const bw = 180;
      const bx = W / 2 - bw / 2;
      const ctx = r.ctx;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx - 1, 5, bw + 2, 5);
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#ff2a4a');
      g.addColorStop(1, '#ffb347');
      ctx.fillStyle = g;
      ctx.fillRect(bx, 6, bw * k, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(bx, 6, bw * k, 1);
      text(r, bar.title || 'BOSS', bx, 12, { font: 'pixel', color: '#ffb0c0', alpha: 0.9 });
    }
    if (this.bossState === 'warn') {
      const t = this.warnT;
      const a = Math.min(1, t / 20) * (t > 150 ? Math.max(0, (170 - t) / 20) : 1);
      const blink = Math.floor(t / 10) % 2 === 0;
      const ctx = r.ctx;
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = '#ff1840';
      ctx.fillRect(0, 86, W, 2);
      ctx.fillRect(0, 136, W, 2);
      ctx.globalAlpha = a * 0.22;
      ctx.fillRect(0, 88, W, 48);
      ctx.globalAlpha = 1;
      if (blink) text(r, 'WARNING', W / 2, 96, { align: 'center', font: 'pixel', size: 3, color: '#ff5070', alpha: a, glow: '#ff2040' });
      text(r, this.bossOpt.title || 'COLOSSAL BLOOM SIGNATURE', W / 2, 122, { align: 'center', font: 'pixel', color: '#ffd0d8', alpha: a });
    }
    if (this.msg) {
      const m = this.msg;
      const a = Math.min(1, m.t / 15, (m.life - m.t) / 15);
      m.lines.forEach((l, i) => text(r, l, W / 2, 70 + i * 14, { align: 'center', font: 'ui', size: 10, color: m.color, alpha: a, shadow: true }));
    }
  }
}

export function nextExtendAt(n) {
  if (n < EXTENDS.length) return EXTENDS[n];
  return EXTENDS[EXTENDS.length - 1] + (n - EXTENDS.length + 1) * EXTEND_EVERY;
}
