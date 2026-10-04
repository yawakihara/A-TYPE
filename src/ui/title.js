/**
 * Title scene: cinematic logo reveal (the HALCYON flies in and writes the logo with a LANCE),
 * press-start, main menu, idle attract mode (bot demo + high-score table).
 */
import { W, H, PH, DIFFICULTIES, BUILD } from '../config.js';
import { text } from '../gfx/font.js';
import { Menu } from './menu.js';
import { Backdrop, footer, panel, fadeIn } from './draw.js';
import { STR } from './i18n.js';
import { formatScore, easeOutCubic, clamp } from '../core/math.js';
import { frand } from '../core/rng.js';

export class TitleScene {
  constructor(game, opt = {}) {
    this.game = game;
    this.t = 0;
    this.state = opt.skipIntro ? 'press' : 'intro';
    this.idle = 0;
    this.bd = new Backdrop('title');
    this.parts = [];
    this.flash = 0;
    const g = game;
    const L = (k) => g.L(STR[k]);
    this.menu = new Menu(g, [
      { label: () => L('start'), select: () => g.openDifficulty() },
      { label: () => L('stageSelect'), select: () => g.openStageSelect() },
      { label: () => L('options'), select: () => g.openOptions() },
      { label: () => L('records'), select: () => g.openRecords() },
      { label: () => L('music'), select: () => g.openMusic() },
      { label: () => L('howto'), select: () => g.openHowto() },
      { label: () => L('credits'), select: () => g.openCredits() },
    ]);
    if (opt.menu !== undefined) {
      this.state = 'menu';
      this.menu.i = opt.menu;
    }
    this.shipX = -40;
  }

  enter() {
    if (this.state !== 'intro' && this.game.audio.ctx) this.game.music('title', 0.5);
  }

  update() {
    const g = this.game;
    const inp = g.input;
    this.t++;
    this.bd.update();
    if (this.flash > 0) this.flash *= 0.9;
    for (const p of this.parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life--;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    if (inp.anyPressed) this.idle = 0;
    else this.idle++;
    switch (this.state) {
      case 'intro': {
        if (this.t === 120) {
          this.flash = 1;
          g.r.doFlash(0.7, [0.7, 1, 1]);
          g.r.wave(W / 2, 74, 1.2, 1);
          g.audio.sfx('beam', 5);
          for (let i = 0; i < 80; i++) this.parts.push({ x: frand(40, W - 40), y: 74 + frand(-14, 14), vx: frand(-2, 2), vy: frand(-1.5, 1.5), life: frand(20, 60), c: i % 2 ? '#7ff4ff' : '#ffffff' });
        }
        if (this.t > 200 || (this.t > 10 && inp.anyPressed)) {
          this.state = 'press';
          this.t = 200;
          if (g.audio.ctx) g.music('title', 0.3);
        }
        break;
      }
      case 'press':
        if (inp.anyPressed && this.t > 205) {
          g.audio.unlock();
          g.music('title', 0.3);
          g.audio.sfx('menuSelect');
          this.state = 'menu';
          this.idle = 0;
          inp.flush();
        }
        if (this.idle > 60 * 25) this.startAttract();
        break;
      case 'menu':
        this.menu.update();
        if (inp.pressed('cancel')) this.state = 'press';
        if (this.idle > 60 * 30) this.startAttract();
        break;
      case 'scores':
        if (inp.anyPressed || this.t > this.scoresEnd) {
          this.state = 'press';
          this.idle = 0;
        }
        break;
      default:
        break;
    }
  }

  startAttract() {
    const g = this.game;
    this.idle = 0;
    if (this.attractFlip) {
      this.state = 'scores';
      this.scoresEnd = this.t + 600;
      this.attractFlip = false;
    } else {
      this.attractFlip = true;
      g.startDemo();
    }
  }

  drawLogo(r, y) {
    const ctx = r.ctx;
    const t = this.t;
    const reveal = this.state === 'intro' ? clamp((t - 70) / 50, 0, 1) : 1;
    if (reveal <= 0) return;
    const cx = W / 2;
    ctx.save();
    if (reveal < 1) {
      ctx.beginPath();
      ctx.rect(0, 0, 30 + (W - 30) * easeOutCubic(reveal), H);
      ctx.clip();
    }
    r.glow(cx, y, 150, '#1a6aff', 0.12 + this.flash * 0.4);
    r.spr('logo', cx, y);
    // shine sweep: a soft slanted band built from thin slices with a tent-shaped falloff
    const sw = (t * 2.2) % 700 - 160;
    if (!r.arcade && sw < 480) {
      const SL = 7;
      for (let i = -SL; i <= SL; i++) {
        const a = 0.42 * (1 - Math.abs(i) / (SL + 1));
        const x0 = sw + i * 3;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, y - 30);
        ctx.lineTo(x0 + 3.2, y - 30);
        ctx.lineTo(x0 - 16.8, y + 30);
        ctx.lineTo(x0 - 20, y + 30);
        ctx.closePath();
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        r.sprWhite('logo', cx, y, 0, 0, 1, 1, a);
        ctx.restore();
      }
    }
    ctx.restore();
    if (this.state === 'intro' && reveal < 1) {
      const bx = 30 + (W - 30) * easeOutCubic(reveal);
      r.glow(bx, y, 40, '#7ff4ff', 0.9);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(160,250,255,0.85)';
      ctx.fillRect(0, y - 3, bx, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, y - 1, bx, 2);
      ctx.globalCompositeOperation = 'source-over';
    }
    const subA = this.state === 'intro' ? clamp((t - 130) / 30, 0, 1) : 1;
    text(r, 'A-TYPE FIGHTER  A-01 HALCYON', cx, y + 26, { align: 'center', font: 'ui', size: 8, color: '#9fc8ff', alpha: subA, spacing: 3 });
  }

  draw(r) {
    const g = this.game;
    const t = this.t;
    this.bd.draw(r);
    const ctx = r.ctx;
    // the fighter: flies in during the intro, then idles bottom-left with AEGIS docked
    let sx;
    let sy;
    if (this.state === 'intro') {
      const k = clamp(t / 70, 0, 1);
      sx = -40 + easeOutCubic(k) * 70;
      sy = 74 + Math.sin(t * 0.05) * 2;
      if (t > 40 && t < 120) {
        const ch = (t - 40) / 80;
        r.glow(sx + 10, sy, 6 + ch * 16, '#7ff4ff', 0.6 + ch * 0.4);
      }
    } else {
      sx = 70 + Math.sin(t * 0.013) * 6;
      sy = 168 + Math.sin(t * 0.021) * 5;
    }
    r.spr('flame', sx - 21, sy + 0.1, (t >> 1) % 4, 0, 1.1, 1, 1, true);
    r.spr('ship', sx, sy, 0);
    if (this.state !== 'intro') {
      const px = sx + 19;
      const n = 4;
      r.glow(px, sy, 18, '#55b4ff', 0.4);
      for (let i = 0; i < n; i++) {
        const a = [-1.05, -0.38, 0.38, 1.05][i];
        r.spr('podshard', px + Math.cos(a) * 6.4, sy + Math.sin(a) * 6.4, 1, a);
      }
      r.spr('podcore_blue', px, sy, 1);
    }
    for (const p of this.parts) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 1.5, 1.5);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    this.logoY = this.logoY ?? 74;
    this.logoY += ((this.state === 'menu' ? 56 : 74) - this.logoY) * 0.15;
    this.drawLogo(r, this.logoY);
    if (this.state === 'press') {
      if (Math.floor(t / 30) % 2 === 0) text(r, g.L(STR.pressStart), W / 2, 140, { align: 'center', font: 'ui', size: 10, color: '#ffffff', glow: '#3ff0ff', spacing: 2 });
      const hi = g.hiScore(g.cfg.diff);
      text(r, `HI-SCORE ${formatScore(hi)}`, W / 2, 162, { align: 'center', font: 'ui', size: 8, color: '#8fa0c0' });
    }
    if (this.state === 'menu') {
      panel(r, W / 2 - 78, 100, 156, 106, 0.55);
      this.menu.draw(r, W / 2, 106, { lh: 13.5, size: 9.5, minW: 150 });
    }
    if (this.state === 'scores') this.drawScores(r);
    footer(r, g, r.arcade
      ? '© 2026 AEGIS LANCE   TAB:GFX  B:SOUND  M:MUTE  F:FULL'
      : `© 2026  AEGIS LANCE  v${BUILD.version}   ·   TAB: HD ⇄ ARCADE   B: SOUND   M: MUTE   F: FULLSCREEN`);
    fadeIn(r, t, 30);
  }

  drawScores(r) {
    const g = this.game;
    const d = g.cfg.diff;
    panel(r, 70, 104, W - 140, 104, 0.8);
    text(r, `${g.L(STR.records)} — ${g.L(STR.diffName[d])}`, W / 2, 108, { align: 'center', font: g.lang === 'ja' ? 'jp' : 'ui', size: 9, color: '#ffb347' });
    const list = g.scores[d] || [];
    list.slice(0, 8).forEach((e, i) => {
      const y = 122 + i * 10.5;
      const col = i === 0 ? '#ffe36b' : '#d8e4f8';
      text(r, `${i + 1}`.padStart(2, ' '), 96, y, { font: 'pixel', color: col });
      text(r, e.name, 118, y, { font: 'pixel', color: col });
      text(r, formatScore(e.score), 210, y, { font: 'pixel', color: col });
      text(r, `ST${e.stage}`, 280, y, { font: 'pixel', color: '#7f8ca8' });
    });
  }
}

export { DIFFICULTIES, PH };
