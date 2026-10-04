/**
 * Web Audio engine: mixer (music/SFX buses, convolution reverb, ping-pong delay, limiter),
 * look-ahead song sequencer, synthesised SFX and the continuous charge tone.
 * Two kits can be swapped live: 'remastered' and 'arcade' (FM).
 */
import { compileSong, TPQ } from './mml.js';
import { playNote, playDrum } from './synth.js';
import { SFX, minGap } from './sfx.js';
import { SONGS } from './songs/index.js';

const LOOKAHEAD = 0.18;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.kit = 'remastered';
    this.musicVol = 0.7;
    this.sfxVol = 0.8;
    this.muted = false;
    this.song = null;
    this.compiled = new Map();
    this.lastSfx = new Map();
    this.pending = null;
    this.timer = null;
    this.chargeNode = null;
    this.paused = false;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.init(new AC({ latencyHint: 'interactive' }));
      } catch (e) {
        return;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.pending) {
      const [name, opt] = this.pending;
      this.pending = null;
      this.playMusic(name, opt);
    }
  }

  /** Build the mixer graph on any (Offline)AudioContext. */
  init(ctx) {
    this.ctx = ctx;
    const sr = ctx.sampleRate;
    // noise buffers
    const len = sr * 2;
    this.noise = ctx.createBuffer(1, len, sr);
    this.brown = ctx.createBuffer(1, len, sr);
    const w = this.noise.getChannelData(0);
    const b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const r = Math.random() * 2 - 1;
      w[i] = r;
      last = (last + 0.02 * r) / 1.02;
      b[i] = last * 3.5;
    }
    // waves
    const pulseRe = new Float32Array(32);
    const pulseIm = new Float32Array(32);
    for (let n = 1; n < 32; n++) pulseIm[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25);
    const orgRe = new Float32Array(10);
    const orgIm = new Float32Array(10);
    [0, 1, 0.8, 0.6, 0.5, 0, 0.3, 0, 0.25, 0.2].forEach((v, i) => (orgIm[i] = v));
    this.waves = {
      pulse: ctx.createPeriodicWave(pulseRe, pulseIm),
      organ: ctx.createPeriodicWave(orgRe, orgIm),
    };
    const soft = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      soft[i] = Math.tanh(x * 1.6) / Math.tanh(1.6);
    }
    const crush = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      crush[i] = Math.round(x * 7) / 7;
    }
    this.curves = { soft, crush };
    // master chain
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 8;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.18;
    this.master.connect(limiter);
    limiter.connect(ctx.destination);
    if (ctx.createAnalyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;
      limiter.connect(this.analyser);
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    }
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVol;
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.musicBus.connect(this.musicFilter);
    this.musicFilter.connect(this.master);
    this.sfxIn = ctx.createGain();
    this.sfxIn.gain.value = this.sfxVol;
    this.sfxIn.connect(this.master);
    // reverb
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.6, 2.2);
    this.revIn = ctx.createGain();
    this.revIn.gain.value = 1;
    this.revIn.connect(this.reverb);
    this.revOut = ctx.createGain();
    this.revOut.gain.value = this.kit === 'remastered' ? 0.55 : 0.12;
    this.reverb.connect(this.revOut);
    this.revOut.connect(this.master);
    // ping-pong delay
    this.delIn = ctx.createGain();
    const dl = ctx.createDelay(2);
    const dr = ctx.createDelay(2);
    const fb = ctx.createGain();
    fb.gain.value = 0.36;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 3200;
    const merger = ctx.createChannelMerger(2);
    this.delIn.connect(dl);
    dl.connect(dlp);
    dlp.connect(dr);
    dr.connect(fb);
    fb.connect(dl);
    dl.connect(merger, 0, 0);
    dr.connect(merger, 0, 1);
    this.delOut = ctx.createGain();
    this.delOut.gain.value = this.kit === 'remastered' ? 0.35 : 0.08;
    merger.connect(this.delOut);
    this.delOut.connect(this.musicBus);
    this.delayL = dl;
    this.delayR = dr;
    // arcade PCM crusher for drums
    const ci = ctx.createGain();
    const ws = ctx.createWaveShaper();
    ws.curve = crush;
    const co = ctx.createGain();
    co.gain.value = 0.9;
    ci.connect(ws);
    ws.connect(co);
    this.crush = { input: ci, output: co, connected: new Set() };
  }

  impulse(sec, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // early reflections then a smooth tail
        const er = i < ctx.sampleRate * 0.08 && Math.random() < 0.004 ? 1.5 : 0;
        d[i] = ((Math.random() * 2 - 1) + er) * (1 - t) ** decay * 0.5;
      }
    }
    return buf;
  }

  /** Byte spectrum of the master output (music room visualiser). */
  spectrum() {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this.freq);
    return this.freq;
  }

  get time() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setKit(k) {
    this.kit = k;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.revOut.gain.setTargetAtTime(k === 'remastered' ? 0.55 : 0.12, t, 0.1);
      this.delOut.gain.setTargetAtTime(k === 'remastered' ? 0.35 : 0.08, t, 0.1);
    }
  }

  setVolumes(m, s) {
    this.musicVol = m;
    this.sfxVol = s;
    if (this.ctx) {
      this.musicBus.gain.setTargetAtTime(m, this.ctx.currentTime, 0.05);
      this.sfxIn.gain.setTargetAtTime(s, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.03);
    return this.muted;
  }

  setPause(on) {
    this.paused = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.setTargetAtTime(on ? 700 : 20000, t, 0.12);
    this.musicBus.gain.setTargetAtTime(on ? this.musicVol * 0.55 : this.musicVol, t, 0.12);
  }

  // ------------------------------------------------------------------ SFX

  sfx(name, arg) {
    if (!this.ctx || this.ctx.state !== 'running' || this.demoMute) return;
    const fn = SFX[name];
    if (!fn) return;
    const t = this.ctx.currentTime;
    const last = this.lastSfx.get(name) || 0;
    if (t - last < minGap(name)) return;
    this.lastSfx.set(name, t);
    fn(this, t + 0.005, arg);
  }

  /** Schedule an SFX at an explicit time (offline rendering / tests). */
  sfxAt(name, t, arg) {
    const fn = SFX[name];
    if (!fn) return false;
    fn(this, t, arg);
    return true;
  }

  /** Continuous charge tone; k in [0,1]. */
  charge(k) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.demoMute) k = 0;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (k <= 0) {
      if (this.chargeNode) {
        const n = this.chargeNode;
        n.g.gain.setTargetAtTime(0, t, 0.03);
        n.o1.stop(t + 0.2);
        n.o2.stop(t + 0.2);
        n.lfo.stop(t + 0.2);
        this.chargeNode = null;
      }
      return;
    }
    if (!this.chargeNode) {
      const g = ctx.createGain();
      g.gain.value = 0;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1500;
      f.Q.value = 6;
      const o1 = ctx.createOscillator();
      o1.type = this.kit === 'arcade' ? 'square' : 'sawtooth';
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0;
      const lg = ctx.createGain();
      lg.gain.value = 0;
      lfo.connect(lg);
      lg.connect(g.gain);
      o1.connect(f);
      o2.connect(f);
      f.connect(g);
      g.connect(this.sfxIn);
      o1.start(t);
      o2.start(t);
      lfo.start(t);
      this.chargeNode = { g, f, o1, o2, lfo, lg };
    }
    const n = this.chargeNode;
    const full = k >= 1;
    const f0 = 140 + k * 620;
    n.o1.frequency.setTargetAtTime(f0, t, 0.03);
    n.o2.frequency.setTargetAtTime(f0 * 2.005, t, 0.03);
    n.f.frequency.setTargetAtTime(400 + k * 3000, t, 0.05);
    n.g.gain.setTargetAtTime(0.02 + k * 0.05, t, 0.05);
    n.lfo.frequency.setTargetAtTime(full ? 14 : 0, t, 0.05);
    n.lg.gain.setTargetAtTime(full ? 0.03 : 0, t, 0.05);
  }

  // ------------------------------------------------------------------ music

  getSong(name) {
    let c = this.compiled.get(name);
    if (!c) {
      const def = SONGS[name];
      if (!def) return null;
      c = compileSong(def);
      this.compiled.set(name, c);
    }
    return c;
  }

  playMusic(name, opt = {}) {
    if (!this.ctx || this.ctx.state !== 'running') {
      this.pending = [name, opt];
      return;
    }
    if (this.song && this.song.name === name && !this.song.stopping) return;
    const song = this.getSong(name);
    if (!song) return;
    this.stopMusic(opt.fade ?? 0.4);
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.musicBus);
    const chans = song.tracks.map((tr) => {
      const input = ctx.createGain();
      input.gain.value = tr.vol ?? 0.7;
      let node = input;
      if (tr.pan) {
        const p = ctx.createStereoPanner();
        p.pan.value = tr.pan;
        input.connect(p);
        node = p;
      }
      node.connect(out);
      if (tr.rev) {
        const s = ctx.createGain();
        s.gain.value = tr.rev;
        node.connect(s);
        s.connect(this.revIn);
      }
      if (tr.del) {
        const s = ctx.createGain();
        s.gain.value = tr.del;
        node.connect(s);
        s.connect(this.delIn);
      }
      return { input, lastFreq: 0 };
    });
    const tick = 60 / song.bpm / TPQ;
    const beat = 60 / song.bpm;
    this.delayL.delayTime.setValueAtTime(beat * 0.75, ctx.currentTime);
    this.delayR.delayTime.setValueAtTime(beat * 0.75, ctx.currentTime);
    const start = ctx.currentTime + 0.08;
    this.song = { name, song, out, chans, tick, start, next: 0, offset: 0, loop: opt.loop !== false && !song.once, stopping: false };
    this.schedule();
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic(fade = 0.4) {
    const s = this.song;
    if (!s) return;
    s.stopping = true;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      s.out.gain.cancelScheduledValues(t);
      s.out.gain.setValueAtTime(s.out.gain.value, t);
      s.out.gain.linearRampToValueAtTime(0, t + Math.max(0.02, fade));
      const out = s.out;
      setTimeout(() => out.disconnect(), (fade + 2.5) * 1000);
    }
    this.song = null;
  }

  /** Called by the timer (and by update hooks). Schedules notes inside the look-ahead window. */
  schedule() {
    const s = this.song;
    if (!s || !this.ctx) return;
    const now = this.ctx.currentTime;
    const horizon = now + LOOKAHEAD;
    const song = s.song;
    let guard = 0;
    while (guard++ < 4000) {
      const tTick = s.start + (s.offset + s.next) * s.tick;
      if (tTick > horizon) break;
      if (s.next >= song.length) {
        if (!s.loop || song.loop < 0) {
          this.song = null;
          return;
        }
        s.offset += song.length - song.loop;
        s.next = song.loop;
        continue;
      }
      if (tTick >= now - 0.05) this.playTick(s, s.next, tTick);
      s.next++;
    }
  }

  playTick(s, tk, time) {
    const song = s.song;
    for (let i = 0; i < song.tracks.length; i++) {
      const tr = song.tracks[i];
      const evs = tr.byTick.get(tk);
      if (!evs) continue;
      const ch = s.chans[i];
      for (const e of evs) {
        const vel = e.v / 15;
        if (tr.role === 'drums') {
          for (const d of e.notes) playDrum(this, this.kit, d, ch.input, time, vel);
        } else {
          const dur = e.g * s.tick;
          for (const m of e.notes) playNote(this, this.kit, tr.role, ch, time, m + (tr.trans || 0), dur, vel);
        }
      }
    }
  }

  /** Offline: schedule an entire song from t=0 into the current context. */
  renderSong(name, loops = 1) {
    const song = this.getSong(name);
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.connect(this.musicBus);
    const chans = song.tracks.map((tr) => {
      const input = ctx.createGain();
      input.gain.value = tr.vol ?? 0.7;
      input.connect(out);
      if (tr.rev) {
        const sg = ctx.createGain();
        sg.gain.value = tr.rev;
        input.connect(sg);
        sg.connect(this.revIn);
      }
      return { input, lastFreq: 0 };
    });
    const tick = 60 / song.bpm / TPQ;
    const s = { song, chans, tick };
    const total = song.length * loops;
    for (let k = 0; k < total; k++) this.playTick(s, k % song.length, 0.05 + k * tick);
    return total * tick + 0.5;
  }
}
