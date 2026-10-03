/**
 * Play scene: wraps a World with the HUD, stage title card, pause menu,
 * continue countdown, stage tally and transitions to the next stage / ending.
 */
import { W, H, PH, DIFFICULTIES } from '../config.js';
import { World } from '../game/world.js';
import { drawHUD } from '../game/hud.js';
import { STAGES } from '../game/stages/index.js';
import { text } from '../gfx/font.js';
import { Menu } from './menu.js';
import { formatScore } from '../core/math.js';

export function newSession(diff, opt = {}) {
  return {
    diff,
    lives: (opt.lives ?? DIFFICULTIES[diff].lives) - 1,
    score: 0,
    continues: 0,
    extends: 0,
    loop: 0,
    infinite: !!opt.infinite,
    practice: !!opt.practice,
    startStage: opt.stage ?? 0,
    totals: { kills: 0, deaths: 0, beams: 0, absorbed: 0, bestChain: 0, items: 0 },
  };
}

export class PlayScene {
  constructor(game, session, stageIdx = 0, opt = {}) {
    this.game = game;
    this.session = session;
    this.stageIdx = stageIdx;
    this.opt = opt;
    this.mode = 'play';
    this.t = 0;
    this.fade = 1;
  }

  enter() {
    this.startStage(this.stageIdx, this.opt.checkpoint || 0);
  }

  startStage(i, cp = 0) {
    const g = this.game;
    this.stageIdx = i;
    const def = STAGES[i]();
    this.world = new World(g, this.session, def, { god: this.opt.god, checkpoint: cp });
    this.world.onDone = (res) => this.onWorldDone(res);
    this.mode = 'play';
    this.introT = 0;
    this.t = 0;
    g.music(def.music, 0);
    g.markReached(this.session.diff, i + 1);
    this.applyGrade(def);
  }

  applyGrade(def) {
    const r = this.game.r;
    const gr = def.grade || {};
    r.tint = gr.tint || [1, 1, 1];
    r.sat = gr.sat ?? 1.05;
    r.contrast = gr.contrast ?? 1.04;
  }

  onWorldDone(res) {
    const s = this.session;
    const w = this.world;
    for (const k of Object.keys(s.totals)) {
      if (k === 'bestChain') s.totals[k] = Math.max(s.totals[k], w.stats[k] || 0);
      else s.totals[k] += w.stats[k] || 0;
    }
    if (res === 'gameover') {
      this.mode = 'continue';
      this.contT = 0;
      this.contCount = 10;
      this.game.music('gameover', 0, false);
    } else if (res === 'clear') {
      this.mode = 'tally';
      this.tallyT = 0;
      const stageNo = this.stageIdx + 1;
      this.bonus = [
        [this.game.L('STAGE CLEAR', 'ステージクリア'), 10000 * stageNo],
        [this.game.L('NO MISS', 'ノーミス'), w.stageDeaths === 0 ? 20000 * stageNo : 0],
        [this.game.L('BULLETS ABSORBED', '弾吸収'), w.stats.absorbed * 20],
        [this.game.L('BEST CHAIN', '最大チェイン'), w.stats.bestChain * 2000],
      ];
      this.bonusTotal = this.bonus.reduce((a, b) => a + b[1], 0);
      this.bonusPaid = false;
    }
  }

  update() {
    const g = this.game;
    const inp = g.input;
    this.t++;
    if (this.mode === 'pause') {
      this.pauseMenu.update();
      if (inp.pressed('pause')) this.resume();
      return;
    }
    if (this.mode === 'continue') return this.updateContinue();
    if (this.mode === 'tally') return this.updateTally();
    if (this.mode === 'gameover') return this.updateGameOver();
    if (inp.pressed('pause') && this.world.phase === 'play') {
      this.pause();
      return;
    }
    this.introT++;
    this.world.update();
  }

  pause() {
    const g = this.game;
    this.mode = 'pause';
    g.audio.setPause(true);
    g.audio.charge(0);
    g.audio.sfx('pause');
    this.pauseMenu = new Menu(g, [
      { label: () => g.L('RESUME', 'ゲームに戻る'), select: () => this.resume() },
      { label: () => g.L('RESTART STAGE', 'ステージをやり直す'), select: () => this.restartStage(), disabled: () => !this.session.practice && !this.session.infinite },
      {
        label: () => g.L('GRAPHICS', 'グラフィック'),
        value: () => (g.cfg.mode === 'hd' ? 'HD' : 'ARCADE'),
        left: () => g.toggleMode(),
        right: () => g.toggleMode(),
      },
      {
        label: () => g.L('SOUND', 'サウンド'),
        value: () => (g.cfg.kit === 'remastered' ? 'REMASTERED' : 'ARCADE FM'),
        left: () => g.toggleKit(),
        right: () => g.toggleKit(),
      },
      { label: () => g.L('QUIT TO TITLE', 'タイトルへ戻る'), select: () => this.quit() },
    ], { back: () => this.resume() });
  }

  resume() {
    this.mode = 'play';
    this.game.audio.setPause(false);
    this.game.input.flush();
  }

  restartStage() {
    this.game.audio.setPause(false);
    this.startStage(this.stageIdx);
  }

  quit() {
    const g = this.game;
    g.audio.setPause(false);
    g.music(null, 0.4);
    g.goTitle();
  }

  updateContinue() {
    const g = this.game;
    const inp = g.input;
    this.contT++;
    if (this.contT % 60 === 0 && this.contT > 30) {
      this.contCount--;
      g.audio.sfx('menuMove');
    }
    if (this.contT > 30 && inp.pressed('confirm')) {
      const s = this.session;
      s.continues++;
      s.lives = DIFFICULTIES[s.diff].lives - 1;
      s.score = Math.floor(s.score / 10) * 10 + Math.min(9, s.continues);
      g.audio.sfx('menuSelect');
      this.mode = 'play';
      this.world.startFrom(this.world.cpIdx);
      this.world.player.invuln = 180;
      return;
    }
    if (this.contCount < 0 || (this.contT > 30 && inp.pressed('cancel'))) {
      this.mode = 'gameover';
      this.goT = 0;
    }
  }

  updateGameOver() {
    this.goT++;
    if (this.goT > 200 || (this.goT > 60 && this.game.input.pressed('confirm'))) this.game.finishRun(this.session, this.stageIdx + 1, false);
  }

  updateTally() {
    const g = this.game;
    this.tallyT++;
    if (this.tallyT === 40 + this.bonus.length * 30 && !this.bonusPaid) {
      this.bonusPaid = true;
      this.world.addScore(this.bonusTotal);
      g.audio.sfx('extendSmall');
    } else if (this.tallyT > 40 && this.tallyT < 40 + this.bonus.length * 30 && this.tallyT % 30 === 0) g.audio.sfx('menuMove');
    if ((this.tallyT > 380 || (this.tallyT > 100 && g.input.pressed('confirm'))) && this.bonusPaid) {
      if (this.stageIdx + 1 < STAGES.length) this.startStage(this.stageIdx + 1);
      else g.goEnding(this.session);
    }
    // keep the world animating behind the tally
    this.world.r.tick();
    this.world.t++;
    this.world.fx.update(0);
  }

  post() {
    return { bloom: this.world?.stage.bloom ?? 0.85 };
  }

  draw(r) {
    const g = this.game;
    const w = this.world;
    w.draw(r);
    drawHUD(r, w, g.hiScore(this.session.diff));
    r.screen();
    // stage title card
    if (this.mode === 'play' && this.introT < 240 && w.cpIdx === 0) {
      const a = Math.min(1, this.introT / 20, (240 - this.introT) / 30);
      const st = w.stage;
      const ctx = r.ctx;
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 74, W, 62);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#3ff0ff';
      ctx.fillRect(W / 2 - 110 * Math.min(1, this.introT / 30), 78, 220 * Math.min(1, this.introT / 30), 1);
      ctx.fillRect(W / 2 - 110 * Math.min(1, this.introT / 30), 131, 220 * Math.min(1, this.introT / 30), 1);
      ctx.globalAlpha = 1;
      text(r, `STAGE ${st.index + 1}`, W / 2, 84, { align: 'center', font: 'ui', size: 12, color: '#ffb347', alpha: a, spacing: 3 });
      text(r, st.name.en, W / 2, 98, { align: 'center', font: 'ui', size: 18, color: '#ffffff', alpha: a, glow: '#3ff0ff', weight: 800, spacing: 1 });
      text(r, g.lang === 'ja' ? st.name.ja : st.sub, W / 2, 119, { align: 'center', font: g.lang === 'ja' ? 'jp' : 'ui', size: 9, color: '#a8b8d8', alpha: a });
    }
    if (this.mode === 'pause') {
      r.rect(0, 0, W, H, '#02040a', 0.72);
      text(r, 'PAUSE', W / 2, 48, { align: 'center', font: 'ui', size: 20, color: '#ffffff', weight: 800, glow: '#3ff0ff', spacing: 4 });
      this.pauseMenu.draw(r, W / 2, 86, { lh: 15, size: 10, minW: 220 });
      text(r, g.L('TAB: GRAPHICS   B: SOUND   M: MUTE   F: FULLSCREEN', 'TAB:グラフィック  B:サウンド  M:ミュート  F:全画面'), W / 2, 200, { align: 'center', font: g.lang === 'ja' ? 'jp' : 'ui', size: 8, color: '#6a7898' });
    }
    if (this.mode === 'continue') {
      r.rect(0, 0, W, PH, '#000000', Math.min(0.75, this.contT / 40));
      text(r, 'CONTINUE?', W / 2, 70, { align: 'center', font: 'ui', size: 20, color: '#ffffff', weight: 800, glow: '#ff4060', spacing: 3 });
      text(r, String(Math.max(0, this.contCount)), W / 2, 96, { align: 'center', font: 'ui', size: 36, color: '#ffb347', weight: 800 });
      text(r, g.L(`PRESS ${g.input.glyph('confirm')} TO CONTINUE`, `${g.input.glyph('confirm')} でコンティニュー`), W / 2, 150, { align: 'center', font: g.lang === 'ja' ? 'jp' : 'ui', size: 9, color: '#a8b8d8' });
    }
    if (this.mode === 'gameover') {
      r.rect(0, 0, W, PH, '#000000', 0.8);
      const a = Math.min(1, this.goT / 30);
      text(r, 'GAME OVER', W / 2, 92, { align: 'center', font: 'ui', size: 26, color: '#ff5070', weight: 800, alpha: a, spacing: 4, glow: '#ff2040' });
    }
    if (this.mode === 'tally') this.drawTally(r);
    if (this.t < 20) r.rect(0, 0, W, H, '#000000', 1 - this.t / 20);
  }

  drawTally(r) {
    const g = this.game;
    const t = this.tallyT;
    const a = Math.min(1, t / 20);
    r.rect(0, 0, W, PH, '#02040a', 0.6 * a);
    text(r, g.L('STAGE CLEAR', 'ステージクリア'), W / 2, 40, { align: 'center', font: 'ui', size: 22, color: '#ffffff', weight: 800, alpha: a, glow: '#3ff0ff', spacing: 3 });
    text(r, this.world.stage.name.en, W / 2, 66, { align: 'center', font: 'ui', size: 10, color: '#ffb347', alpha: a, spacing: 2 });
    this.bonus.forEach(([label, v], i) => {
      if (t < 40 + i * 30) return;
      const y = 92 + i * 16;
      text(r, label, 96, y, { font: g.lang === 'ja' ? 'jp' : 'ui', size: 10, color: '#a8b8d8' });
      text(r, String(v), W - 96, y, { font: 'ui', size: 10, color: v ? '#ffffff' : '#56607a', align: 'right' });
    });
    if (t >= 40 + this.bonus.length * 30) {
      const y = 92 + this.bonus.length * 16 + 8;
      r.rect(96, y - 4, W - 192, 1, '#3ff0ff', 0.6);
      text(r, g.L('TOTAL BONUS', 'ボーナス合計'), 96, y + 2, { font: g.lang === 'ja' ? 'jp' : 'ui', size: 11, color: '#ffe36b' });
      text(r, String(this.bonusTotal), W - 96, y + 2, { font: 'ui', size: 11, color: '#ffe36b', align: 'right', glow: '#ffb347' });
      text(r, formatScore(this.session.score), W / 2, 196, { align: 'center', font: 'ui', size: 12, color: '#ffffff' });
    }
  }
}
