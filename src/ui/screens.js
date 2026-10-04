/**
 * Menu screens: difficulty, stage select, options, records, music room (with live
 * spectrum), how-to-play pages, credits, attract demo, prologue and name entry.
 */
import { W, H, PH, DIFFICULTIES } from '../config.js';
import { text, wrap } from '../gfx/font.js';
import { Menu } from './menu.js';
import { Backdrop, panel, header, footer, fadeIn } from './draw.js';
import { STR, PROLOGUE, HOWTO, CREDITS } from './i18n.js';
import { SONG_LIST } from '../audio/songs/index.js';
import { STAGES } from '../game/stages/index.js';
import { formatScore, clamp } from '../core/math.js';
import { save } from '../core/storage.js';
import { STORE } from '../config.js';
import { World } from '../game/world.js';
import { makeBot } from '../game/bot.js';
import { newSession } from './play.js';

const jp = (g) => (g.lang === 'ja' ? 'jp' : 'ui');

class Screen {
  constructor(game, bd) {
    this.game = game;
    this.t = 0;
    this.bd = bd || new Backdrop('title');
  }

  update() {
    this.t++;
    this.bd.update();
  }

  back(menuIndex) {
    this.game.goTitle({ skipIntro: true, menu: menuIndex });
  }

  drawBase(r) {
    this.bd.draw(r);
    r.rect(0, 0, W, H, '#02040a', 0.35);
  }
}

// ------------------------------------------------------------------ difficulty

export class DifficultyScene extends Screen {
  constructor(game) {
    super(game);
    const g = game;
    this.menu = new Menu(g, DIFFICULTIES.map((d, i) => ({
      label: () => g.L(STR.diffName[i]),
      select: () => g.beginRun(i),
      hint: () => g.L(STR.diffDesc[i]),
    })), { back: () => this.back(0) });
    this.menu.i = g.cfg.diff;
  }

  update() {
    super.update();
    this.menu.update();
  }

  draw(r) {
    const g = this.game;
    this.drawBase(r);
    header(r, g, g.L(STR.difficulty));
    panel(r, W / 2 - 90, 70, 180, 58);
    this.menu.draw(r, W / 2, 78, { lh: 15, size: 11, minW: 170, hintY: 146 });
    const d = DIFFICULTIES[this.menu.i];
    const info = `${g.L('LIVES', '残機')} ${d.lives}   ${g.L('BULLET SPEED', '弾速')} ×${d.bullet.toFixed(2)}`;
    text(r, info, W / 2, 162, { align: 'center', font: jp(g), size: 8, color: '#ffb347' });
    footer(r, g, g.L(STR.hintMenu));
    fadeIn(r, this.t, 12);
  }
}

// ------------------------------------------------------------------ stage select

export class StageSelectScene extends Screen {
  constructor(game) {
    super(game);
    this.diff = game.cfg.diff;
    this.sel = 0;
    this.practice = true;
  }

  reached() {
    const g = this.game;
    if (g.opt.params && g.opt.params.get('unlock') === '1') return STAGES.length;
    return Math.max(...[0, 1, 2].map((d) => g.progress.reached[d] || 1));
  }

  update() {
    super.update();
    const g = this.game;
    const inp = g.input;
    const n = STAGES.length;
    if (inp.repeat('right') || inp.repeat('down')) {
      this.sel = (this.sel + 1) % n;
      g.audio.sfx('menuMove');
    }
    if (inp.repeat('left') || inp.repeat('up')) {
      this.sel = (this.sel - 1 + n) % n;
      g.audio.sfx('menuMove');
    }
    if (inp.pressed('rapid')) {
      this.diff = (this.diff + 1) % 3;
      g.audio.sfx('menuMove');
    }
    if (inp.pressed('confirm')) {
      if (this.sel < this.reached()) {
        g.audio.sfx('menuSelect');
        g.startRun(this.diff, { stage: this.sel, infinite: true, practice: true });
      } else g.audio.sfx('menuBack');
    }
    if (inp.pressed('cancel')) {
      g.audio.sfx('menuBack');
      this.back(1);
    }
  }

  draw(r) {
    const g = this.game;
    this.drawBase(r);
    header(r, g, g.L(STR.stageSelect), g.L(STR.practice));
    const reached = this.reached();
    const cw = 108;
    const ch = 52;
    STAGES.forEach((f, i) => {
      const st = f();
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = W / 2 - cw * 1.5 - 8 + col * (cw + 8);
      const y = 58 + row * (ch + 10);
      const open = i < reached;
      const sel = i === this.sel;
      panel(r, x, y, cw, ch, sel ? 0.85 : 0.55);
      if (sel) r.rect(x, y, cw, ch, '#3ff0ff', 0.08 + 0.05 * Math.sin(this.t * 0.15));
      text(r, `STAGE ${i + 1}`, x + 8, y + 7, { font: 'ui', size: 8, color: open ? '#ffb347' : '#4a5468' });
      text(r, open ? st.name.en : '??????', x + 8, y + 19, { font: 'ui', size: 9, weight: 800, color: open ? '#ffffff' : '#4a5468' });
      text(r, open ? (g.lang === 'ja' ? st.name.ja : '') : g.L(STR.locked), x + 8, y + 33, { font: jp(g), size: 8, color: '#8fa0c0' });
    });
    text(r, `${g.L(STR.difficulty)}: ${g.L(STR.diffName[this.diff])}   (${g.input.glyph('rapid')}: ${g.L('CHANGE', '変更')})`, W / 2, 190, { align: 'center', font: jp(g), size: 8, color: '#ffe36b' });
    footer(r, g, g.L(STR.hintMenu));
    fadeIn(r, this.t, 12);
  }
}

// ------------------------------------------------------------------ options

export class OptionsScene extends Screen {
  constructor(game) {
    super(game);
    const g = game;
    const c = g.cfg;
    const L = (k) => g.L(STR[k]);
    const apply = () => {
      g.applyCfg();
      g.saveCfg();
    };
    const vol = (k) => ({
      value: () => `${'■'.repeat(Math.round(c[k] * 10))}${'·'.repeat(10 - Math.round(c[k] * 10))}`,
      left: () => {
        c[k] = clamp(Math.round((c[k] - 0.1) * 10) / 10, 0, 1);
        apply();
      },
      right: () => {
        c[k] = clamp(Math.round((c[k] + 0.1) * 10) / 10, 0, 1);
        apply();
      },
    });
    let resetArm = 0;
    this.menu = new Menu(g, [
      { label: () => L('graphics'), value: () => (c.mode === 'hd' ? 'HD REMASTER' : 'ARCADE 1987'), left: () => g.toggleMode(), right: () => g.toggleMode() },
      { label: () => L('crt'), value: () => (c.crt ? L('on') : L('off')), left: () => ((c.crt = !c.crt), apply()), right: () => ((c.crt = !c.crt), apply()) },
      {
        label: () => L('quality'),
        value: () => c.quality.toUpperCase(),
        left: () => ((c.quality = { high: 'low', medium: 'high', low: 'medium' }[c.quality]), apply()),
        right: () => ((c.quality = { high: 'medium', medium: 'low', low: 'high' }[c.quality]), apply()),
      },
      { label: () => L('sound'), value: () => (c.kit === 'remastered' ? 'REMASTERED' : 'ARCADE FM'), left: () => g.toggleKit(), right: () => g.toggleKit() },
      { label: () => L('musicVol'), ...vol('music') },
      { label: () => L('sfxVol'), ...vol('sfx') },
      { label: () => L('shake'), value: () => (c.reduceFx ? L('reduced') : L('full')), left: () => ((c.reduceFx = !c.reduceFx), apply()), right: () => ((c.reduceFx = !c.reduceFx), apply()) },
      { label: () => L('language'), value: () => (c.lang === 'ja' ? '日本語' : 'ENGLISH'), left: () => ((c.lang = c.lang === 'ja' ? 'en' : 'ja'), apply()), right: () => ((c.lang = c.lang === 'ja' ? 'en' : 'ja'), apply()) },
      { label: () => L('fullscreen'), select: () => g.toggleFullscreen() },
      {
        label: () => (resetArm > 0 ? L('confirmReset') : L('resetRecords')),
        select: () => {
          if (resetArm > 0) {
            g.resetRecords();
            resetArm = 0;
            g.notify('RECORDS CLEARED', '#ff8090');
          } else resetArm = 180;
        },
      },
      { label: () => L('back'), select: () => this.back(2) },
    ], { back: () => this.back(2) });
    this.tickReset = () => {
      if (resetArm > 0) resetArm--;
    };
  }

  update() {
    super.update();
    this.tickReset();
    this.menu.update();
  }

  draw(r) {
    const g = this.game;
    this.drawBase(r);
    header(r, g, g.L(STR.options));
    panel(r, 52, 46, W - 104, 162);
    this.menu.draw(r, W / 2, 52, { lh: 14, size: 9, minW: W - 120 });
    footer(r, g, g.L(STR.hintMenu));
    fadeIn(r, this.t, 12);
  }
}

// ------------------------------------------------------------------ records

export class RecordsScene extends Screen {
  constructor(game, highlight) {
    super(game);
    this.diff = highlight ? highlight.diff : game.cfg.diff;
    this.hl = highlight || null;
  }

  enter() {
    this.game.music('records', 0.5);
  }

  update() {
    super.update();
    const g = this.game;
    const inp = g.input;
    if (inp.repeat('right')) {
      this.diff = (this.diff + 1) % 3;
      g.audio.sfx('menuMove');
    }
    if (inp.repeat('left')) {
      this.diff = (this.diff + 2) % 3;
      g.audio.sfx('menuMove');
    }
    if (inp.pressed('cancel') || inp.pressed('confirm')) {
      g.audio.sfx('menuBack');
      g.music('title', 0.5);
      this.back(3);
    }
  }

  draw(r) {
    const g = this.game;
    this.drawBase(r);
    header(r, g, g.L(STR.records), `◀ ${g.L(STR.diffName[this.diff])} ▶`);
    panel(r, 60, 52, W - 120, 150);
    const list = g.scores[this.diff] || [];
    text(r, g.L(STR.rank), 78, 58, { font: jp(g), size: 7.5, color: '#7f8ca8' });
    text(r, 'NAME', 116, 58, { font: 'ui', size: 7.5, color: '#7f8ca8' });
    text(r, 'SCORE', 238, 58, { font: 'ui', size: 7.5, color: '#7f8ca8', align: 'right' });
    text(r, 'STAGE', 296, 58, { font: 'ui', size: 7.5, color: '#7f8ca8', align: 'right' });
    list.forEach((e, i) => {
      const y = 72 + i * 12.5;
      const hl = this.hl && this.hl.diff === this.diff && this.hl.index === i && this.t % 20 < 14;
      const col = hl ? '#3ff0ff' : i === 0 ? '#ffe36b' : i < 3 ? '#ffffff' : '#c0cbe0';
      text(r, `${i + 1}`, 84, y, { font: 'pixel', color: col, align: 'right' });
      text(r, e.name, 116, y, { font: 'pixel', color: col });
      text(r, formatScore(e.score), 238, y, { font: 'pixel', color: col, align: 'right' });
      text(r, e.cleared ? 'ALL' : `${e.stage}`, 296, y, { font: 'pixel', color: e.cleared ? '#7cffb0' : '#8fa0c0', align: 'right' });
    });
    footer(r, g, g.L('←→ DIFFICULTY   ENTER/ESC BACK', '←→ 難易度   ENTER/ESC 戻る'));
    fadeIn(r, this.t, 12);
  }
}

// ------------------------------------------------------------------ music room

export class MusicScene extends Screen {
  constructor(game) {
    super(game);
    this.sel = 0;
    this.playing = null;
    this.bins = new Float32Array(48);
  }

  update() {
    super.update();
    const g = this.game;
    const inp = g.input;
    const n = SONG_LIST.length;
    if (inp.repeat('down')) {
      this.sel = (this.sel + 1) % n;
      g.audio.sfx('menuMove');
    }
    if (inp.repeat('up')) {
      this.sel = (this.sel - 1 + n) % n;
      g.audio.sfx('menuMove');
    }
    if (inp.pressed('confirm')) {
      const name = SONG_LIST[this.sel][0];
      if (this.playing === name) {
        g.music(null, 0.3);
        this.playing = null;
      } else {
        g.audio.unlock();
        g.audio.stopMusic(0.1);
        g.audio.playMusic(name, { fade: 0.1, loop: true });
        this.playing = name;
      }
    }
    if (inp.repeat('left') || inp.repeat('right') || inp.pressed('rapid')) {
      g.toggleKit();
    }
    if (inp.pressed('cancel')) {
      g.audio.sfx('menuBack');
      g.music('title', 0.4);
      this.back(4);
    }
    const spec = g.audio.spectrum ? g.audio.spectrum() : null;
    for (let i = 0; i < this.bins.length; i++) {
      const v = spec ? spec[Math.floor(Math.pow(i / this.bins.length, 1.7) * spec.length * 0.7)] / 255 : 0;
      this.bins[i] = Math.max(v, this.bins[i] * 0.88);
    }
  }

  draw(r) {
    const g = this.game;
    this.drawBase(r);
    header(r, g, g.L(STR.music), g.cfg.kit === 'remastered' ? 'SOUND SET: REMASTERED' : 'SOUND SET: ARCADE FM');
    panel(r, 22, 48, 180, 158);
    SONG_LIST.forEach(([key, title], i) => {
      const y = 53 + i * 10.8;
      const sel = i === this.sel;
      if (sel) r.rect(24, y - 1.5, 176, 10, '#3ff0ff', 0.12);
      const playing = this.playing === key;
      text(r, `${String(i + 1).padStart(2, '0')}`, 30, y, { font: 'pixel', color: playing ? '#3ff0ff' : '#5a6a88' });
      text(r, title, 48, y - 0.5, { font: 'ui', size: 7.5, color: playing ? '#3ff0ff' : sel ? '#ffffff' : '#a8b4cc' });
      if (playing) text(r, '♪', 192, y, { font: 'pixel', color: '#ffe36b' });
    });
    // spectrum visualiser
    panel(r, 212, 48, 150, 158);
    const ctx = r.ctx;
    const n = this.bins.length;
    for (let i = 0; i < n; i++) {
      const v = this.bins[i];
      const h = v * 110;
      const x = 220 + i * 2.85;
      const grd = ctx.createLinearGradient(0, 170, 0, 170 - 110);
      grd.addColorStop(0, '#1a6aff');
      grd.addColorStop(0.6, '#3ff0ff');
      grd.addColorStop(1, '#ffffff');
      ctx.fillStyle = grd;
      ctx.fillRect(x, 170 - h, 2, h);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x, 172, 2, h * 0.3);
      ctx.globalAlpha = 1;
    }
    const cur = this.playing ? SONG_LIST.find((s) => s[0] === this.playing)[1] : '—';
    text(r, g.L(STR.nowPlaying), 287, 54, { align: 'center', font: jp(g), size: 7.5, color: '#7f8ca8' });
    text(r, cur, 287, 64, { align: 'center', font: 'ui', size: 8, color: '#ffffff', maxW: 140 });
    text(r, g.L('ALL TRACKS ORIGINAL', '全曲オリジナル'), 287, 182, { align: 'center', font: jp(g), size: 7, color: '#6a7898', maxW: 140 });
    text(r, g.L('SYNTHESISED LIVE', 'リアルタイム合成'), 287, 191, { align: 'center', font: jp(g), size: 7, color: '#6a7898', maxW: 140 });
    footer(r, g, g.L('↑↓ SELECT   ENTER PLAY/STOP   ←→ SOUND SET   ESC BACK', '↑↓ 選択   ENTER 再生/停止   ←→ 音源切替   ESC 戻る'));
    fadeIn(r, this.t, 12);
  }
}

// ------------------------------------------------------------------ how to play

export class HowtoScene extends Screen {
  constructor(game) {
    super(game);
    this.page = 0;
  }

  update() {
    super.update();
    const g = this.game;
    const inp = g.input;
    if (inp.repeat('right') || inp.pressed('confirm')) {
      if (this.page < HOWTO.length - 1) {
        this.page++;
        this.pt = 0;
        g.audio.sfx('menuMove');
      } else if (inp.pressed('confirm')) this.back(5);
    }
    if (inp.repeat('left') && this.page > 0) {
      this.page--;
      g.audio.sfx('menuMove');
    }
    if (inp.pressed('cancel')) {
      g.audio.sfx('menuBack');
      this.back(5);
    }
  }

  draw(r) {
    const g = this.game;
    this.drawBase(r);
    const p = HOWTO[this.page];
    header(r, g, g.L(p.title), `${this.page + 1} / ${HOWTO.length}`);
    panel(r, 30, 50, W - 60, 152);
    const lines = p.lines[g.lang] || p.lines.en;
    let y = 60;
    for (const l of lines) {
      for (const ln of wrap(r, l, W - 84, { font: jp(g), size: 8.5 })) {
        text(r, ln, 42, y, { font: jp(g), size: 8.5, color: '#d8e4f8' });
        y += 13;
      }
      y += 3;
    }
    this.illustrate(r, this.page);
    footer(r, g, g.L('←→ PAGE   ESC BACK', '←→ ページ   ESC 戻る'));
    fadeIn(r, this.t, 12);
  }

  illustrate(r, page) {
    const t = this.t;
    if (page === 1) {
      const k = (t % 150) / 100;
      r.spr('ship', 300, 188, 0);
      if (k < 1) r.glow(312, 188, 4 + k * 14, '#7ff4ff', 0.8);
      else {
        const x = 318 + (k - 1) * 200;
        r.ctx.globalCompositeOperation = 'lighter';
        r.rect(318, 186, Math.min(60, x - 318), 4, '#7ff4ff', 0.9);
        r.ctx.globalCompositeOperation = 'source-over';
      }
    }
    if (page === 2) {
      r.spr('ship', 296, 188, 0);
      const a = t * 0.08;
      for (let i = 0; i < 4; i++) r.spr('podshard', 330 + Math.cos(a + i * 1.57) * 6, 188 + Math.sin(a + i * 1.57) * 6, 1, a + i * 1.57);
      r.spr('podcore_red', 330, 188, 1);
    }
    if (page === 3) {
      ['red', 'blue', 'yellow'].forEach((c, i) => r.spr('item', 290 + i * 22, 188, i));
    }
  }
}

// ------------------------------------------------------------------ credits

export class CreditsScene extends Screen {
  update() {
    super.update();
    const inp = this.game.input;
    if (inp.pressed('cancel') || inp.pressed('confirm')) {
      this.game.audio.sfx('menuBack');
      this.back(6);
    }
  }

  draw(r) {
    const g = this.game;
    this.drawBase(r);
    header(r, g, g.L(STR.credits));
    panel(r, 40, 48, W - 80, 156);
    const col = 152;
    CREDITS.forEach(([a, b, full], i) => {
      const y = 56 + i * 12.4;
      if (i === 0) {
        text(r, a, W / 2, y, { align: 'center', font: 'ui', size: 11, weight: 800, color: '#ffffff', glow: '#3ff0ff', spacing: 2 });
        return;
      }
      if (full) {
        text(r, b, W / 2, y, { align: 'center', font: 'ui', size: 7.5, color: '#9fb0cc', maxW: W - 96 });
        return;
      }
      if (a) text(r, a, col - 6, y, { align: 'right', font: 'ui', size: 7.5, color: '#7f8ca8', maxW: col - 54 });
      if (b) text(r, b, col + 6, y, { font: 'ui', size: 8, color: '#d8e4f8', maxW: W - 48 - col - 6 });
    });
    footer(r, g, g.L('ENTER/ESC BACK', 'ENTER/ESC 戻る'));
    fadeIn(r, this.t, 12);
  }
}

// ------------------------------------------------------------------ attract demo

export class DemoScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    const s = newSession(1, { infinite: true });
    this.world = new World(game, s, STAGES[0](), { god: true });
    this.prevBot = game.input.bot;
    game.input.bot = makeBot(() => this.world);
    game.audio.demoMute = true;
  }

  exit() {
    this.game.input.bot = this.prevBot || null;
    this.game.audio.demoMute = false;
  }

  update() {
    this.t++;
    this.world.update();
    const inp = this.game.input;
    // a real key press (not the bot) ends the demo
    const human = inp.keys.size > 0 || inp.clicked || inp.pads.some((p) => p.buttons.some((b) => b && b.pressed));
    if ((this.t > 30 && human) || this.t > 60 * 40) this.game.goTitle({ skipIntro: true });
  }

  draw(r) {
    this.world.draw(r);
    r.screen();
    if (Math.floor(this.t / 40) % 2 === 0) text(r, this.game.L(STR.demo), W / 2, 196, { align: 'center', font: 'ui', size: 12, weight: 800, color: '#ffffff', glow: '#3ff0ff', spacing: 4 });
    text(r, this.game.L(STR.pressStart), W / 2, 214, { align: 'center', font: 'ui', size: 8, color: '#a8b8d8' });
    fadeIn(r, this.t, 20);
  }
}

// ------------------------------------------------------------------ prologue

export class PrologueScene extends Screen {
  constructor(game, onDone) {
    super(game, new Backdrop('prologue'));
    this.onDone = onDone;
  }

  enter() {
    this.game.music('prologue', 0.6);
  }

  update() {
    super.update();
    const inp = this.game.input;
    const lines = PROLOGUE[this.game.lang] || PROLOGUE.en;
    if ((this.t > 20 && (inp.pressed('confirm') || inp.pressed('pause'))) || this.t > 60 + lines.length * 200) this.onDone();
  }

  draw(r) {
    const g = this.game;
    this.drawBase(r);
    const lines = PROLOGUE[g.lang] || PROLOGUE.en;
    const per = 200;
    const idx = Math.min(lines.length - 1, Math.floor(this.t / per));
    const lt = this.t - idx * per;
    // stacked lines: previous ones dim, current types in
    let y = 60;
    for (let i = Math.max(0, idx - 3); i <= idx; i++) {
      const str = lines[i];
      const cur = i === idx;
      const shown = cur ? str.slice(0, Math.floor(lt * (g.lang === 'ja' ? 0.45 : 0.9))) : str;
      const lns = wrap(r, shown, W - 80, { font: jp(g), size: 10 });
      for (const ln of lns) {
        text(r, ln, 40, y, { font: jp(g), size: 10, color: cur ? '#ffffff' : '#6a7898', alpha: cur ? 1 : 0.8, glow: cur ? '#3ff0ff' : null });
        y += 15;
      }
      y += 6;
    }
    footer(r, g, g.L(STR.skip));
    fadeIn(r, this.t, 40);
  }
}

// ------------------------------------------------------------------ name entry

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-!? ';

export class NameEntryScene extends Screen {
  constructor(game, session, stage, cleared) {
    super(game);
    this.session = session;
    this.stage = stage;
    this.cleared = cleared;
    this.name = ['A', 'A', 'A'];
    this.pos = 0;
    this.timer = 60 * 30;
  }

  enter() {
    this.game.music('records', 0.5);
    this.game.input.textMode = true;
  }

  exit() {
    this.game.input.textMode = false;
  }

  commit() {
    const g = this.game;
    const s = this.session;
    const entry = { name: this.name.join('').trim() || '---', score: s.score, stage: this.stage, cleared: this.cleared, date: new Date().toISOString().slice(0, 10) };
    const index = g.addScore(s.diff, entry);
    g.audio.sfx('extend');
    g.setScene(new RecordsScene(g, { diff: s.diff, index }));
  }

  update() {
    super.update();
    const g = this.game;
    const inp = g.input;
    if (--this.timer <= 0) return this.commit();
    for (const ch of inp.typed) {
      if (ch === '\b') {
        this.pos = Math.max(0, this.pos - 1);
        continue;
      }
      const up = ch.toUpperCase();
      if (CHARS.includes(up) && this.pos < 3) {
        this.name[this.pos] = up;
        this.pos++;
        g.audio.sfx('menuMove');
      }
    }
    if (this.pos >= 3) {
      if (inp.pressed('confirm')) this.commit();
      if (inp.pressed('cancel')) this.pos = 2;
      return;
    }
    const cur = CHARS.indexOf(this.name[this.pos]);
    if (inp.repeat('up')) {
      this.name[this.pos] = CHARS[(cur + 1) % CHARS.length];
      g.audio.sfx('menuMove');
    }
    if (inp.repeat('down')) {
      this.name[this.pos] = CHARS[(cur - 1 + CHARS.length) % CHARS.length];
      g.audio.sfx('menuMove');
    }
    if (inp.pressed('fire') || inp.repeat('right')) {
      this.pos++;
      g.audio.sfx('menuSelect');
    }
    if ((inp.pressed('pod') || inp.repeat('left')) && this.pos > 0) this.pos--;
    if (inp.pressed('pause') && !inp.pressed('fire')) this.pos = 3;
  }

  draw(r) {
    const g = this.game;
    this.drawBase(r);
    header(r, g, g.L(STR.newRecord), g.L(STR.enterName));
    text(r, formatScore(this.session.score), W / 2, 60, { align: 'center', font: 'ui', size: 18, weight: 800, color: '#ffe36b', glow: '#ffb347' });
    for (let i = 0; i < 3; i++) {
      const x = W / 2 - 36 + i * 36;
      const sel = i === this.pos;
      panel(r, x - 14, 96, 28, 34, sel ? 0.9 : 0.5);
      text(r, this.name[i], x, 103, { align: 'center', font: 'ui', size: 18, weight: 800, color: sel && this.t % 20 < 12 ? '#3ff0ff' : '#ffffff' });
    }
    const okSel = this.pos >= 3;
    const kb = g.input.lastDevice === 'keyboard';
    const ok = kb ? 'ENTER' : g.input.glyph('confirm');
    const hint = okSel
      ? g.L(`PRESS ${ok} TO REGISTER`, `${ok}で登録`)
      : kb
        ? g.L('TYPE YOUR NAME   ←→ MOVE   ↑↓ LETTER   ENTER DONE', 'キーで名前を入力   ←→ 移動   ↑↓ 文字   ENTER 決定')
        : g.L(`↑↓ LETTER   ${g.input.glyph('fire')} NEXT   ${g.input.glyph('pod')} BACK`, `↑↓ 文字   ${g.input.glyph('fire')} 次へ   ${g.input.glyph('pod')} 戻る`);
    text(r, hint, W / 2, 146, { align: 'center', font: jp(g), size: 8.5, color: okSel ? '#7cffb0' : '#a8b8d8', maxW: W - 24 });
    text(r, `${Math.ceil(this.timer / 60)}`, W / 2, 166, { align: 'center', font: 'ui', size: 10, color: '#7f8ca8' });
    fadeIn(r, this.t, 12);
  }
}

export function resetRecordsImpl(g, defaults) {
  g.scores = defaults();
  save(STORE.scores, g.scores);
}

export { PH };
