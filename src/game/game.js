/**
 * Top-level game object: owns renderer/input/audio, persistent settings and records,
 * the active scene, and global hotkeys (graphics mode, sound kit, mute, fullscreen).
 */
import { STORE, DIFFICULTIES } from '../config.js';
import { load, save } from '../core/storage.js';
import { text } from '../gfx/font.js';
import { W, H } from '../config.js';

const DEFAULT_CFG = {
  mode: 'hd',
  crt: true,
  quality: 'high',
  kit: 'remastered',
  music: 0.7,
  sfx: 0.8,
  lang: null,
  diff: 1,
  reduceFx: false,
  shake: true,
};

export class Game {
  constructor(r, input, audio, opt = {}) {
    this.r = r;
    this.input = input;
    this.audio = audio;
    this.opt = opt;
    this.cfg = { ...DEFAULT_CFG, ...load(STORE.cfg, {}) };
    if (!this.cfg.lang) this.cfg.lang = (navigator.language || 'en').startsWith('ja') ? 'ja' : 'en';
    this.defaultScores = defaultScores;
    this.scores = load(STORE.scores, null) || defaultScores();
    this.progress = load(STORE.progress, { reached: [1, 1, 1], cleared: [false, false, false] });
    this.medals = load(STORE.medals, {});
    this.scene = null;
    this.t = 0;
    this.toast = null;
    this.applyCfg();
  }

  applyCfg() {
    const c = this.cfg;
    this.r.setMode(c.mode);
    this.r.crtOpt = c.crt;
    this.r.reduceFx = c.reduceFx;
    if (this.r.quality !== c.quality) this.r.setQuality(c.quality);
    this.audio.setKit(c.kit);
    this.audio.setVolumes(c.music, c.sfx);
  }

  saveCfg() {
    save(STORE.cfg, this.cfg);
  }

  setScene(scene) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.scene = scene;
    this.input.flush();
    if (scene.enter) scene.enter();
  }

  get lang() {
    return this.cfg.lang;
  }

  /** Pick a string by language: L({ja, en}) or L('en', 'ja'). */
  L(en, ja) {
    if (typeof en === 'object') return en[this.cfg.lang] ?? en.en;
    return this.cfg.lang === 'ja' && ja !== undefined ? ja : en;
  }

  music(name, fade = 0.6, loop = true) {
    if (!name) this.audio.stopMusic(fade);
    else this.audio.playMusic(name, { fade, loop });
  }

  notify(str, color = '#ffffff') {
    this.toast = { str, color, t: 0 };
  }

  toggleMode() {
    this.cfg.mode = this.cfg.mode === 'hd' ? 'arcade' : 'hd';
    this.r.setMode(this.cfg.mode);
    this.saveCfg();
    this.notify(this.cfg.mode === 'hd' ? 'GRAPHICS: HD REMASTER' : 'GRAPHICS: ARCADE 1987', '#7ff4ff');
  }

  toggleKit() {
    this.cfg.kit = this.cfg.kit === 'remastered' ? 'arcade' : 'remastered';
    this.audio.setKit(this.cfg.kit);
    this.saveCfg();
    this.notify(this.cfg.kit === 'remastered' ? 'SOUND: REMASTERED' : 'SOUND: ARCADE FM', '#ffd84f');
  }

  toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) {
      /* fullscreen refused */
    }
  }

  medalEvent(type, data) {
    if (this.scene && this.scene.onMedalEvent) this.scene.onMedalEvent(type, data);
  }

  update() {
    this.t++;
    this.r.tick();
    const inp = this.input;
    inp.update();
    if (inp.pressed('mode')) this.toggleMode();
    if (inp.pressed('kit')) this.toggleKit();
    if (inp.pressed('mute')) {
      const m = this.audio.toggleMute ? this.audio.toggleMute() : false;
      this.notify(m ? 'MUTE' : 'SOUND ON');
    }
    if (inp.pressed('fullscreen')) this.toggleFullscreen();
    if (this.scene) this.scene.update();
    if (this.toast && ++this.toast.t > 110) this.toast = null;
    inp.endFrame();
  }

  draw() {
    const r = this.r;
    r.begin();
    if (this.scene) this.scene.draw(r);
    r.screen();
    if (this.toast) {
      const a = Math.min(1, this.toast.t / 8, (110 - this.toast.t) / 15);
      r.rect(W / 2 - 80, 6, 160, 13, '#000000', 0.6 * a);
      text(r, this.toast.str, W / 2, 9, { align: 'center', color: this.toast.color, alpha: a });
    }
    r.present(this.scene && this.scene.post ? this.scene.post() : undefined);
  }

  // ------------------------------------------------------------------ records

  isHighScore(diff, score) {
    const list = this.scores[diff] || [];
    return score > 0 && (list.length < 10 || score > list[list.length - 1].score);
  }

  addScore(diff, entry) {
    const list = this.scores[diff] || (this.scores[diff] = []);
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    list.length = Math.min(10, list.length);
    save(STORE.scores, this.scores);
    return list.indexOf(entry);
  }

  hiScore(diff) {
    const list = this.scores[diff] || [];
    return list.length ? list[0].score : 0;
  }

  markReached(diff, stage) {
    this.progress.reached[diff] = Math.max(this.progress.reached[diff] || 1, stage);
    save(STORE.progress, this.progress);
  }

  markCleared(diff) {
    this.progress.cleared[diff] = true;
    save(STORE.progress, this.progress);
  }
}

function defaultScores() {
  const names = ['AEG', 'LNC', 'HAL', 'CYN', 'PRZ', 'HLX', 'CRW', 'BIT', 'PLS', 'ARC'];
  const out = {};
  DIFFICULTIES.forEach((d, i) => {
    out[i] = names.map((n, k) => ({ name: n, score: (10 - k) * 10000 * (i + 1), stage: Math.max(1, 6 - Math.floor(k / 2)), date: '' }));
  });
  return out;
}
