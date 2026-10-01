import { compileSong, midiToFreq, SONGS } from './music.js';

/**
 * WebAudioによる効果音・BGMエンジン。素材ファイルは使わず全て合成する。
 * ブラウザの自動再生制限のため、最初のユーザー操作で unlock() を呼ぶ。
 */
export class AudioEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.muted = false;
    /** デモ中など、全ての音を出さない状態。 */
    this.silent = false;
    this.volume = 0.8;
    this.cur = null;
    this.timer = null;
    this.charge = null;
    this.last = {};
    this.waves = {};
    this.noiseBuf = null;
    this.brownBuf = null;
    this.compiled = {};
  }

  /**
   * オーディオを初期化/再開する。ユーザー操作のイベント内で呼ぶこと。
   * @returns {void}
   */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.initContext(new AC());
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.pending) {
      const [name, opt] = this.pending;
      this.pending = null;
      this.playSong(name, opt);
    }
  }

  /**
   * 指定のAudioContext上にミキサー構成(マスター→コンプレッサー→出力)を構築する。
   * オフライン描画(検証用)でも同じ構成を使えるよう、unlock()から分離している。
   * @param {BaseAudioContext} ctx 使用するコンテキスト
   * @returns {void}
   */
  initContext(ctx) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 5;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 1.5; this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.42; this.musicBus.connect(this.master);
    // 空間系: テンポ同期ディレイ(BGMのみ)
    this.delay = ctx.createDelay(2);
    this.delayFb = ctx.createGain(); this.delayFb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    this.delay.connect(dlp); dlp.connect(this.delayFb); this.delayFb.connect(this.delay);
    this.delayOut = ctx.createGain(); this.delayOut.gain.value = 0.5;
    dlp.connect(this.delayOut); this.delayOut.connect(this.musicBus);
    this._makeNoise();
  }

  /**
   * 効果音を指定時刻に予約する(状態確認・間引きなし)。オフライン描画用。
   * @param {string} name SE名
   * @param {number} t 開始時刻(秒)
   * @param {number} [arg=0] SE固有の引数
   * @returns {boolean} 定義があれば true
   */
  sfxAt(name, t, arg = 0) {
    const fn = SFX[name];
    if (!fn) return false;
    fn(this, t, arg);
    return true;
  }

  /**
   * 曲を全ステップ分まとめて予約する。オフライン描画(検証・書き出し)用。
   * @param {string} name 曲名
   * @param {number} [loops=1] ループ回数
   * @returns {number} 曲の長さ(秒)
   */
  scheduleSong(name, loops = 1) {
    const def = SONGS[name];
    const comp = compileSong(def);
    const bus = this.ctx.createGain();
    bus.connect(this.musicBus);
    const send = this.ctx.createGain();
    send.connect(this.delay);
    this.delay.delayTime.value = Math.min(1.9, (60 / def.bpm) * 0.75);
    const stepSec = 60 / def.bpm / 4;
    const c = { name, def, comp, bus, send };
    for (let i = 0; i < def.steps * loops; i++) this._playStep(c, i % def.steps, 0.05 + i * stepSec, stepSec);
    return def.steps * loops * stepSec;
  }

  /**
   * ホワイト/ブラウンノイズのバッファを作る。
   * @returns {void}
   */
  _makeNoise() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    this.brownBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = this.noiseBuf.getChannelData(0);
    const b = this.brownBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const r = Math.random() * 2 - 1;
      w[i] = r;
      last = (last + 0.02 * r) / 1.02;
      b[i] = last * 3.5;
    }
  }

  /**
   * 音量を設定する(0〜1)。
   * @param {number} v 音量
   * @returns {void}
   */
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  /**
   * ミュートを切り替える。
   * @returns {boolean} 切替後のミュート状態
   */
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
    return this.muted;
  }

  /**
   * パルス波(デューティ指定)のPeriodicWaveを取得する。
   * @param {number} duty デューティ比(0〜1)
   * @returns {PeriodicWave} 波形
   */
  _pulse(duty) {
    const key = duty.toFixed(3);
    if (this.waves[key]) return this.waves[key];
    const n = 48;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    }
    this.waves[key] = this.ctx.createPeriodicWave(real, imag);
    return this.waves[key];
  }

  /**
   * 単音を鳴らす。
   * @param {number} t 開始時刻
   * @param {{type?:string, duty?:number, f0:number, f1?:number, dur:number, vol?:number, attack?:number, dest?:AudioNode, detune?:number}} o パラメータ
   * @returns {void}
   */
  tone(t, o) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    if (o.duty) osc.setPeriodicWave(this._pulse(o.duty)); else osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    const vol = o.vol ?? 0.2;
    const atk = o.attack ?? 0.002;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.dest || this.sfxBus);
    osc.start(t); osc.stop(t + o.dur + 0.03);
  }

  /**
   * ノイズを鳴らす。
   * @param {number} t 開始時刻
   * @param {{dur:number, vol?:number, type?:BiquadFilterType, f0?:number, f1?:number, q?:number, brown?:boolean, attack?:number, dest?:AudioNode}} o パラメータ
   * @returns {void}
   */
  noise(t, o) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = o.brown ? this.brownBuf : this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'lowpass';
    f.Q.value = o.q ?? 0.8;
    f.frequency.setValueAtTime(o.f0 || 2000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    const g = ctx.createGain();
    const atk = o.attack ?? 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol ?? 0.2, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.dest || this.sfxBus);
    src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.03);
  }

  /**
   * 効果音を鳴らす。同名SEの過密再生は間引く。
   * @param {string} name SE名
   * @param {number} [arg] SE固有の引数(レベル等)
   * @returns {void}
   */
  sfx(name, arg = 0) {
    if (!this.ctx || this.muted || this.silent || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = SFX_GAP[name] ?? 0.02;
    if (now - (this.last[name] || -1) < gap) return;
    this.last[name] = now;
    const fn = SFX[name];
    if (fn) fn(this, now + 0.005, arg);
  }

  /**
   * チャージ音のループを開始する。
   * @returns {void}
   */
  startCharge() {
    if (!this.ctx || this.charge || this.muted || this.silent) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'square';
    const lfo = ctx.createOscillator(); lfo.frequency.value = 14;
    const lfoG = ctx.createGain(); lfoG.gain.value = 18;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.05);
    lfo.connect(lfoG); lfoG.connect(o1.frequency); lfoG.connect(o2.frequency);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.sfxBus);
    o1.frequency.value = 110; o2.frequency.value = 221;
    o1.start(t); o2.start(t); lfo.start(t);
    this.charge = { o1, o2, lfo, g, lp, lfoG };
  }

  /**
   * チャージ音の高さをレベルに合わせる。
   * @param {number} level チャージレベル(0〜5)
   * @param {number} frac 現レベル内の進行度(0〜1)
   * @returns {void}
   */
  setCharge(level, frac) {
    const c = this.charge;
    if (!c) return;
    const t = this.ctx.currentTime;
    const base = 110 * Math.pow(1.19, level * 2 + frac * 2);
    c.o1.frequency.setTargetAtTime(base, t, 0.03);
    c.o2.frequency.setTargetAtTime(base * 2.005, t, 0.03);
    c.lp.frequency.setTargetAtTime(900 + level * 500, t, 0.05);
    c.lfo.frequency.setTargetAtTime(10 + level * 4, t, 0.05);
    c.lfoG.gain.setTargetAtTime(10 + level * 8, t, 0.05);
  }

  /**
   * チャージ音を止める。
   * @returns {void}
   */
  stopCharge() {
    const c = this.charge;
    if (!c) return;
    this.charge = null;
    const t = this.ctx.currentTime;
    c.g.gain.cancelScheduledValues(t);
    c.g.gain.setTargetAtTime(0.0001, t, 0.02);
    c.o1.stop(t + 0.15); c.o2.stop(t + 0.15); c.lfo.stop(t + 0.15);
  }

  /**
   * BGMを再生する。
   * @param {string} name 曲名(SONGSのキー)
   * @param {{loop?:boolean, onend?:()=>void}} [opt] ループ指定・終了コールバック
   * @returns {void}
   */
  playSong(name, opt = {}) {
    if (!this.ctx) { this.pending = [name, opt]; return; }
    if (this.silent) return;
    this.stopSong(0.15);
    const def = SONGS[name];
    if (!def) return;
    const comp = this.compiled[name] || (this.compiled[name] = compileSong(def));
    const bus = this.ctx.createGain();
    bus.gain.value = 1;
    bus.connect(this.musicBus);
    const send = this.ctx.createGain();
    send.gain.value = 1;
    send.connect(this.delay);
    this.delay.delayTime.setValueAtTime(Math.min(1.9, (60 / def.bpm) * 0.75), this.ctx.currentTime);
    this.cur = {
      name, def, comp, bus, send, step: 0,
      next: this.ctx.currentTime + 0.1,
      loop: opt.loop ?? def.loop !== false,
      onend: opt.onend,
    };
    this.pending = null;
    this._tick();
    this.timer = setInterval(() => this._tick(), 25);
  }

  /**
   * BGMを停止する。
   * @param {number} [fade=0.3] フェードアウト秒数
   * @returns {void}
   */
  stopSong(fade = 0.3) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const c = this.cur;
    this.cur = null;
    if (c && this.ctx) {
      const t = this.ctx.currentTime;
      c.bus.gain.cancelScheduledValues(t);
      c.bus.gain.setValueAtTime(c.bus.gain.value, t);
      c.bus.gain.linearRampToValueAtTime(0.0001, t + fade);
      setTimeout(() => { try { c.bus.disconnect(); c.send.disconnect(); } catch (e) { /* 既に切断済み */ } }, (fade + 0.3) * 1000);
    }
  }

  /**
   * 再生中の曲名を返す。
   * @returns {string|null} 曲名
   */
  get songName() { return this.cur ? this.cur.name : null; }

  /**
   * 先読みスケジューラ。直近の音をWebAudioに予約する。
   * @returns {void}
   */
  _tick() {
    const c = this.cur;
    if (!c || !this.ctx) return;
    const stepSec = 60 / c.def.bpm / 4;
    while (c.next < this.ctx.currentTime + 0.18) {
      this._playStep(c, c.step, c.next, stepSec);
      c.step++;
      c.next += stepSec;
      if (c.step >= c.def.steps) {
        if (c.loop) c.step = 0;
        else {
          const end = c.onend;
          const wait = Math.max(0, (c.next - this.ctx.currentTime) * 1000) + 800;
          if (this.timer) { clearInterval(this.timer); this.timer = null; }
          setTimeout(() => { if (this.cur === c) this.cur = null; if (end) end(); }, wait);
          return;
        }
      }
    }
  }

  /**
   * 1ステップ分の全チャンネルを予約する。
   * @param {object} c 再生状態
   * @param {number} step ステップ番号
   * @param {number} t 開始時刻
   * @param {number} stepSec 1ステップの秒数
   * @returns {void}
   */
  _playStep(c, step, t, stepSec) {
    for (let i = 0; i < c.comp.channels.length; i++) {
      const ch = c.comp.channels[i];
      const ev = ch.events.get(step);
      if (!ev) continue;
      const dest = ch.send > 0 ? c.send : c.bus;
      for (const m of ev.notes) {
        this._voice(ch.inst, midiToFreq(m), t, ev.len * stepSec, ch.vol, c, ch.send);
      }
      if (ch.send > 0) void dest;
    }
    const d = c.comp.drums;
    if (d.length) {
      const ch = d[step % d.length];
      if (ch !== '.' && ch !== ' ') this._drum(ch, t, c.bus, c.comp.drumVol);
    }
  }

  /**
   * 楽器音を1音予約する。
   * @param {string} inst 楽器名
   * @param {number} f 周波数
   * @param {number} t 開始時刻
   * @param {number} dur 長さ(秒)
   * @param {number} vol 音量
   * @param {object} c 再生状態(bus/send)
   * @param {number} send ディレイ送り量
   * @returns {void}
   */
  _voice(inst, f, t, dur, vol, c, send) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(c.bus);
    if (send > 0) {
      const sg = ctx.createGain(); sg.gain.value = send; out.connect(sg); sg.connect(c.send);
    }
    const end = t + dur;
    const env = (g, a, peak, sus, rel) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.linearRampToValueAtTime(peak * sus, Math.max(t + a + 0.001, end));
      g.gain.linearRampToValueAtTime(0.0001, Math.max(t + a + 0.002, end) + rel);
    };
    const stopAt = (nodes, tt) => nodes.forEach((n) => n.stop(tt));
    if (inst === 'fm' || inst === 'bell' || inst === 'epiano') {
      const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
      const mod = ctx.createOscillator(); mod.type = 'sine';
      const ratio = inst === 'bell' ? 3.5 : inst === 'epiano' ? 14 : 2;
      mod.frequency.value = f * ratio;
      const mg = ctx.createGain();
      const idx = inst === 'bell' ? 3.2 : inst === 'epiano' ? 1.2 : 2.0;
      mg.gain.setValueAtTime(f * idx, t);
      mg.gain.exponentialRampToValueAtTime(Math.max(1, f * 0.25), t + Math.max(0.1, dur));
      mod.connect(mg); mg.connect(car.frequency);
      const g = ctx.createGain();
      env(g, 0.004, vol, inst === 'bell' ? 0.3 : 0.7, inst === 'bell' ? 0.5 : 0.05);
      car.connect(g); g.connect(out);
      car.start(t); mod.start(t);
      stopAt([car, mod], end + 0.7);
    } else if (inst === 'bass') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = f / 2;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 5;
      lp.frequency.setValueAtTime(Math.min(4000, f * 9), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(120, f * 1.6), t + Math.max(0.08, dur * 0.8));
      const g = ctx.createGain();
      env(g, 0.004, vol, 0.8, 0.04);
      const g2 = ctx.createGain(); g2.gain.value = 0.6;
      o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(out);
      o.start(t); o2.start(t); stopAt([o, o2], end + 0.1);
    } else if (inst === 'pad') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = -9;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f; o2.detune.value = 9;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.7;
      const g = ctx.createGain();
      env(g, Math.min(0.5, dur * 0.4), vol, 0.85, 0.5);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out);
      o.start(t); o2.start(t); stopAt([o, o2], end + 0.6);
    } else if (inst === 'brass') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f; o2.detune.value = 8;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.5;
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.linearRampToValueAtTime(Math.min(5000, f * 5), t + 0.08);
      lp.frequency.linearRampToValueAtTime(Math.min(3000, f * 3), end);
      const g = ctx.createGain();
      env(g, 0.012, vol, 0.8, 0.07);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out);
      o.start(t); o2.start(t); stopAt([o, o2], end + 0.15);
    } else {
      // パルス系・三角波・ノコギリ波
      const o = ctx.createOscillator();
      if (inst === 'tri') o.type = 'triangle';
      else if (inst === 'saw') o.type = 'sawtooth';
      else if (inst === 'sine') o.type = 'sine';
      else {
        const duty = inst === 'pulse12' ? 0.125 : inst === 'pulse50' ? 0.5 : 0.25;
        o.setPeriodicWave(this._pulse(duty));
      }
      o.frequency.value = f;
      if (inst === 'lead') {
        // ビブラート(遅れて深くなる)
        const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
        const lg = ctx.createGain();
        lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.max(0.15, dur * 0.7));
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(end + 0.15);
        o.setPeriodicWave(this._pulse(0.25));
      }
      const g = ctx.createGain();
      const pluck = inst === 'pulse12' || inst === 'arp';
      env(g, 0.003, vol, pluck ? 0.25 : 0.85, pluck ? 0.03 : 0.06);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(end + 0.15);
    }
  }

  /**
   * ドラム音を鳴らす。k=キック s=スネア h=クローズHH H=オープンHH t=タム c=クラッシュ
   * @param {string} ch ドラム文字
   * @param {number} t 開始時刻
   * @param {AudioNode} dest 出力先
   * @param {number} vol 音量
   * @returns {void}
   */
  _drum(ch, t, dest, vol) {
    if (ch === 'k') {
      this.tone(t, { type: 'sine', f0: 170, f1: 42, dur: 0.16, vol: 0.9 * vol, dest });
      this.noise(t, { dur: 0.02, vol: 0.25 * vol, type: 'highpass', f0: 2500, dest });
    } else if (ch === 's') {
      this.noise(t, { dur: 0.16, vol: 0.55 * vol, type: 'bandpass', f0: 2300, q: 0.9, dest });
      this.tone(t, { type: 'triangle', f0: 230, f1: 150, dur: 0.1, vol: 0.45 * vol, dest });
    } else if (ch === 'h') {
      this.noise(t, { dur: 0.04, vol: 0.28 * vol, type: 'highpass', f0: 7500, dest });
    } else if (ch === 'H') {
      this.noise(t, { dur: 0.22, vol: 0.28 * vol, type: 'highpass', f0: 6500, dest });
    } else if (ch === 't') {
      this.tone(t, { type: 'sine', f0: 190, f1: 90, dur: 0.18, vol: 0.6 * vol, dest });
    } else if (ch === 'c') {
      this.noise(t, { dur: 1.0, vol: 0.4 * vol, type: 'highpass', f0: 5000, dest });
    }
  }
}

/** 同一SEの最小再生間隔(秒)。 */
const SFX_GAP = {
  shot: 0.03, shot2: 0.04, enemyShot: 0.05, hit: 0.035, deflect: 0.05,
  explodeTiny: 0.04, explodeSmall: 0.05, explodeBig: 0.1, chargeBlip: 0.05, tick: 0.03,
};

/** 効果音の定義。各関数は (engine, 開始時刻, 引数) を受け取る。 */
const SFX = {
  shot(a, t) {
    a.tone(t, { type: 'square', f0: 1250, f1: 340, dur: 0.075, vol: 0.09 });
    a.tone(t, { type: 'sine', f0: 220, f1: 110, dur: 0.06, vol: 0.12 });
  },
  shot2(a, t) {
    a.tone(t, { type: 'sawtooth', f0: 1900, f1: 700, dur: 0.07, vol: 0.1 });
  },
  enemyShot(a, t) {
    a.tone(t, { duty: 0.25, f0: 640, f1: 300, dur: 0.12, vol: 0.1 });
  },
  hit(a, t) {
    a.tone(t, { type: 'square', f0: 220, f1: 120, dur: 0.04, vol: 0.12 });
    a.noise(t, { dur: 0.03, vol: 0.1, type: 'highpass', f0: 3000 });
  },
  deflect(a, t) {
    a.tone(t, { type: 'triangle', f0: 2600, f1: 1900, dur: 0.05, vol: 0.12 });
  },
  explodeTiny(a, t) {
    a.noise(t, { dur: 0.14, vol: 0.18, f0: 3000, f1: 400 });
    a.tone(t, { type: 'sine', f0: 160, f1: 60, dur: 0.12, vol: 0.2 });
  },
  explodeSmall(a, t) {
    a.noise(t, { dur: 0.3, vol: 0.3, f0: 3600, f1: 260 });
    a.tone(t, { type: 'sine', f0: 150, f1: 38, dur: 0.28, vol: 0.34 });
  },
  explodeBig(a, t) {
    a.noise(t, { dur: 1.1, vol: 0.55, f0: 2600, f1: 90, brown: true });
    a.noise(t, { dur: 0.5, vol: 0.3, f0: 4500, f1: 400 });
    a.tone(t, { type: 'sine', f0: 100, f1: 26, dur: 0.95, vol: 0.55 });
    for (let i = 1; i <= 4; i++) a.noise(t + i * 0.09, { dur: 0.12, vol: 0.18, type: 'bandpass', f0: 1800 - i * 250, q: 1.5 });
  },
  playerDeath(a, t) {
    a.tone(t, { type: 'sawtooth', f0: 1000, f1: 40, dur: 1.0, vol: 0.2 });
    a.noise(t, { dur: 1.3, vol: 0.6, f0: 3000, f1: 70, brown: true });
    a.tone(t, { type: 'sine', f0: 110, f1: 24, dur: 1.1, vol: 0.55 });
    for (let i = 1; i <= 6; i++) a.noise(t + i * 0.11, { dur: 0.1, vol: 0.2, type: 'bandpass', f0: 2200 - i * 220, q: 2 });
  },
  powerup(a, t) {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => a.tone(t + i * 0.055, { duty: 0.25, f0: f, dur: 0.1, vol: 0.12 }));
  },
  speedUp(a, t) {
    a.tone(t, { type: 'square', f0: 330, f1: 1320, dur: 0.22, vol: 0.1 });
    a.tone(t + 0.1, { duty: 0.25, f0: 660, f1: 1760, dur: 0.18, vol: 0.08 });
  },
  extend(a, t) {
    [659.25, 783.99, 987.77, 1318.5, 1567.98, 1975.5].forEach((f, i) => a.tone(t + i * 0.07, { duty: 0.5, f0: f, dur: 0.14, vol: 0.12 }));
  },
  podAttach(a, t) {
    a.tone(t, { type: 'square', f0: 260, f1: 620, dur: 0.07, vol: 0.12 });
    a.noise(t, { dur: 0.05, vol: 0.18, type: 'bandpass', f0: 1400, q: 2 });
  },
  podLaunch(a, t) {
    a.noise(t, { dur: 0.28, vol: 0.28, type: 'bandpass', f0: 300, f1: 2800, q: 1.2 });
    a.tone(t, { type: 'sawtooth', f0: 180, f1: 900, dur: 0.22, vol: 0.12 });
  },
  podRecall(a, t) {
    a.noise(t, { dur: 0.25, vol: 0.22, type: 'bandpass', f0: 2600, f1: 300, q: 1.2 });
    a.tone(t, { type: 'sawtooth', f0: 900, f1: 180, dur: 0.2, vol: 0.1 });
  },
  missile(a, t) {
    a.noise(t, { dur: 0.3, vol: 0.2, type: 'highpass', f0: 800, f1: 3000 });
    a.tone(t, { type: 'sawtooth', f0: 320, f1: 140, dur: 0.22, vol: 0.08 });
  },
  chargeBlip(a, t, lv) {
    a.tone(t, { duty: 0.25, f0: 420 * Math.pow(1.26, lv), dur: 0.09, vol: 0.12 });
    a.tone(t + 0.05, { duty: 0.25, f0: 630 * Math.pow(1.26, lv), dur: 0.09, vol: 0.1 });
  },
  beam(a, t, lv) {
    const L = Math.max(1, lv);
    a.noise(t, { dur: 0.12 + L * 0.08, vol: 0.18 + L * 0.06, type: 'bandpass', f0: 300, f1: 3200, q: 0.9 });
    a.tone(t, { type: 'sawtooth', f0: 140 * L, f1: 2400, dur: 0.1 + L * 0.06, vol: 0.14 });
    a.tone(t, { type: 'square', f0: 80 + L * 30, f1: 40, dur: 0.2 + L * 0.1, vol: 0.2 });
    if (L >= 4) {
      a.noise(t, { dur: 0.7, vol: 0.4, f0: 2000, f1: 100, brown: true });
      a.tone(t, { type: 'sine', f0: 90, f1: 28, dur: 0.6, vol: 0.45 });
    }
  },
  warning(a, t) {
    for (let i = 0; i < 6; i++) {
      a.tone(t + i * 0.42, { type: 'square', f0: 520, f1: 420, dur: 0.36, vol: 0.1, attack: 0.02 });
      a.tone(t + i * 0.42, { type: 'sawtooth', f0: 130, f1: 100, dur: 0.36, vol: 0.12, attack: 0.02 });
    }
  },
  bossRoar(a, t) {
    a.noise(t, { dur: 1.2, vol: 0.45, type: 'lowpass', f0: 900, f1: 120, brown: true, q: 3 });
    a.tone(t, { type: 'sawtooth', f0: 70, f1: 38, dur: 1.2, vol: 0.2 });
  },
  tick(a, t) {
    a.tone(t, { type: 'square', f0: 1100, dur: 0.035, vol: 0.1 });
  },
  select(a, t) {
    a.tone(t, { duty: 0.5, f0: 660, dur: 0.07, vol: 0.12 });
    a.tone(t + 0.06, { duty: 0.5, f0: 990, dur: 0.12, vol: 0.12 });
  },
  start(a, t) {
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => a.tone(t + i * 0.06, { duty: 0.25, f0: f, dur: 0.16, vol: 0.13 }));
    a.noise(t, { dur: 0.5, vol: 0.2, type: 'bandpass', f0: 400, f1: 3000, q: 1 });
  },
  pause(a, t) {
    a.tone(t, { duty: 0.5, f0: 880, dur: 0.06, vol: 0.1 });
    a.tone(t + 0.07, { duty: 0.5, f0: 587, dur: 0.1, vol: 0.1 });
  },
  coreOpen(a, t) {
    a.tone(t, { type: 'sawtooth', f0: 90, f1: 260, dur: 0.5, vol: 0.14 });
    a.noise(t, { dur: 0.4, vol: 0.15, type: 'bandpass', f0: 400, f1: 1800, q: 2 });
  },
  laserCharge(a, t) {
    a.tone(t, { type: 'sawtooth', f0: 90, f1: 900, dur: 0.9, vol: 0.12, attack: 0.3 });
  },
  laserFire(a, t) {
    a.noise(t, { dur: 0.9, vol: 0.35, type: 'bandpass', f0: 1200, f1: 600, q: 0.6 });
    a.tone(t, { type: 'sawtooth', f0: 220, f1: 180, dur: 0.9, vol: 0.18 });
    a.tone(t, { type: 'square', f0: 110, f1: 100, dur: 0.9, vol: 0.14 });
  },
};
