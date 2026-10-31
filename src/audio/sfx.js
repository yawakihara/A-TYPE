/**
 * Synthesised sound effects. Each entry: (eng, t, arg) -> void, routed to eng.sfxIn.
 * REMASTERED adds reverb sends and extra layers; ARCADE keeps them short and dry.
 */
const MIN_GAP = {
  shot: 0.035,
  enemyShot: 0.06,
  hit: 0.03,
  gem: 0.025,
  explodeS: 0.04,
  explodeM: 0.06,
  clink: 0.05,
  helix: 0.06,
  prism: 0.06,
  crawler: 0.07,
  menuMove: 0.03,
  blockBreak: 0.05,
};

export function minGap(name) {
  return MIN_GAP[name] ?? 0.02;
}

function g(eng, t, peak, a, d, out) {
  const n = eng.ctx.createGain();
  n.gain.setValueAtTime(0.0001, t);
  n.gain.linearRampToValueAtTime(peak, t + a);
  n.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  n.connect(out || eng.sfxIn);
  return n;
}

function o(eng, type, f0, f1, t, dur, dest, curve = 'exp') {
  const n = eng.ctx.createOscillator();
  if (type === 'pulse') n.setPeriodicWave(eng.waves.pulse);
  else n.type = type;
  n.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) {
    if (curve === 'exp') n.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    else n.frequency.linearRampToValueAtTime(f1, t + dur);
  }
  n.connect(dest);
  n.start(t);
  n.stop(t + dur + 0.05);
  return n;
}

function nz(eng, t, dur, dest, type = 'lowpass', f0 = 2000, f1 = f0, q = 1, buf) {
  const s = eng.ctx.createBufferSource();
  s.buffer = buf || eng.noise;
  s.loop = true;
  const f = eng.ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  s.connect(f);
  f.connect(dest);
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
  return f;
}

function rev(eng, node, amt) {
  if (eng.kit !== 'remastered' || !eng.revIn) return;
  const s = eng.ctx.createGain();
  s.gain.value = amt;
  node.connect(s);
  s.connect(eng.revIn);
}

const arc = (eng) => eng.kit === 'arcade';

export const SFX = {
  shot(eng, t) {
    const a = g(eng, t, 0.09, 0.002, 0.07);
    o(eng, arc(eng) ? 'pulse' : 'square', 1400, 520, t, 0.07, a);
    if (!arc(eng)) {
      const b = g(eng, t, 0.05, 0.001, 0.03);
      nz(eng, t, 0.03, b, 'highpass', 5000);
    }
  },
  helix(eng, t) {
    const a = g(eng, t, 0.07, 0.003, 0.16);
    o(eng, 'sawtooth', 1800, 260, t, 0.16, a);
    const b = g(eng, t, 0.04, 0.003, 0.12);
    o(eng, 'square', 900, 1300, t, 0.12, b);
    rev(eng, a, 0.2);
  },
  prism(eng, t) {
    const a = g(eng, t, 0.07, 0.002, 0.14);
    o(eng, 'sine', 2600, 3800, t, 0.1, a);
    const b = g(eng, t, 0.05, 0.002, 0.18);
    o(eng, 'triangle', 1300, 1900, t, 0.18, b);
    rev(eng, a, 0.3);
  },
  crawler(eng, t) {
    const a = g(eng, t, 0.06, 0.004, 0.18);
    const s = o(eng, 'square', 180, 260, t, 0.18, a, 'lin');
    const lfo = eng.ctx.createOscillator();
    lfo.frequency.value = 40;
    const lg = eng.ctx.createGain();
    lg.gain.value = 60;
    lfo.connect(lg);
    lg.connect(s.frequency);
    lfo.start(t);
    lfo.stop(t + 0.2);
  },
  beam(eng, t, lv = 1) {
    const k = lv / 5;
    const dur = 0.35 + k * 0.8;
    const a = g(eng, t, 0.22 + k * 0.18, 0.004, dur);
    nz(eng, t, dur, a, 'bandpass', 1200 + k * 2000, 200, 0.8);
    const b = g(eng, t, 0.25 + k * 0.15, 0.004, dur * 0.8);
    o(eng, arc(eng) ? 'square' : 'sawtooth', 700 + k * 300, 70, t, dur * 0.8, b);
    if (lv >= 3) {
      const c = g(eng, t, 0.35 * k, 0.005, 0.5 + k * 0.4);
      o(eng, 'sine', 140, 38, t, 0.6 + k * 0.4, c);
    }
    if (lv >= 5) {
      const d = g(eng, t + 0.02, 0.12, 0.01, 1.1);
      o(eng, 'sawtooth', 1800, 400, t + 0.02, 1.1, d);
      rev(eng, d, 0.5);
    }
    rev(eng, a, 0.35);
  },
  chargeFull(eng, t) {
    for (const [i, f] of [[0, 1760], [1, 2637]].map((x) => x)) {
      const a = g(eng, t + i * 0.05, 0.07, 0.002, 0.25);
      o(eng, 'sine', f, f, t + i * 0.05, 0.25, a);
      rev(eng, a, 0.4);
    }
  },
  podLaunch(eng, t) {
    const a = g(eng, t, 0.2, 0.01, 0.35);
    nz(eng, t, 0.35, a, 'bandpass', 400, 3000, 2);
    const b = g(eng, t, 0.12, 0.002, 0.12);
    o(eng, 'triangle', 300, 90, t, 0.12, b);
    rev(eng, a, 0.2);
  },
  podRecall(eng, t) {
    const a = g(eng, t, 0.15, 0.08, 0.25);
    nz(eng, t, 0.33, a, 'bandpass', 3000, 500, 2);
    const b = g(eng, t, 0.06, 0.05, 0.25);
    o(eng, 'sine', 600, 1200, t, 0.3, b);
  },
  podAttach(eng, t) {
    const a = g(eng, t, 0.2, 0.001, 0.25);
    o(eng, 'square', 220, 110, t, 0.08, a);
    const b = g(eng, t, 0.1, 0.002, 0.5);
    const c = o(eng, 'sine', 1320, 1320, t, 0.5, b);
    const m = eng.ctx.createOscillator();
    m.frequency.value = 1320 * 2.76;
    const mg = eng.ctx.createGain();
    mg.gain.value = 900;
    m.connect(mg);
    mg.connect(c.frequency);
    m.start(t);
    m.stop(t + 0.5);
    rev(eng, b, 0.4);
  },
  podSummon(eng, t) {
    [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => {
      const a = g(eng, t + i * 0.045, 0.06, 0.003, 0.4);
      o(eng, arc(eng) ? 'pulse' : 'triangle', 523 * 2 ** (s / 12), 523 * 2 ** (s / 12), t + i * 0.045, 0.4, a);
      rev(eng, a, 0.45);
    });
  },
  powerup(eng, t) {
    [0, 4, 7, 12].forEach((s, i) => {
      const a = g(eng, t + i * 0.055, 0.09, 0.003, 0.16);
      o(eng, arc(eng) ? 'pulse' : 'square', 660 * 2 ** (s / 12), 660 * 2 ** (s / 12), t + i * 0.055, 0.16, a);
      rev(eng, a, 0.3);
    });
  },
  speedup(eng, t) {
    [0, 7, 12].forEach((s, i) => {
      const a = g(eng, t + i * 0.07, 0.08, 0.003, 0.12);
      o(eng, 'square', 440 * 2 ** (s / 12), 880 * 2 ** (s / 12), t + i * 0.07, 0.12, a);
    });
  },
  gear(eng, t, n = 0) {
    const a = g(eng, t, 0.07, 0.002, 0.06);
    o(eng, 'square', 600 + n * 200, 600 + n * 200, t, 0.06, a);
  },
  extend(eng, t) {
    [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => {
      const a = g(eng, t + i * 0.08, 0.1, 0.003, 0.18);
      o(eng, arc(eng) ? 'pulse' : 'square', 784 * 2 ** (s / 12), 784 * 2 ** (s / 12), t + i * 0.08, 0.18, a);
      rev(eng, a, 0.3);
    });
  },
  extendSmall(eng, t) {
    [0, 12].forEach((s, i) => {
      const a = g(eng, t + i * 0.07, 0.08, 0.002, 0.2);
      o(eng, 'square', 988 * 2 ** (s / 12), 988 * 2 ** (s / 12), t + i * 0.07, 0.2, a);
    });
  },
  missile(eng, t) {
    const a = g(eng, t, 0.08, 0.01, 0.3);
    nz(eng, t, 0.3, a, 'bandpass', 1500, 4000, 1.2);
  },
  gem(eng, t) {
    const a = g(eng, t, 0.04, 0.001, 0.05);
    o(eng, 'sine', 2400 + Math.random() * 400, 3000, t, 0.05, a);
  },
  enemyShot(eng, t) {
    const a = g(eng, t, 0.035, 0.002, 0.07);
    o(eng, 'sine', 700, 360, t, 0.07, a);
  },
  hit(eng, t) {
    const a = g(eng, t, 0.06, 0.001, 0.035);
    nz(eng, t, 0.035, a, 'highpass', 3000);
  },
  clink(eng, t) {
    const a = g(eng, t, 0.07, 0.001, 0.12);
    const c = o(eng, 'sine', 2100, 2100, t, 0.12, a);
    const m = eng.ctx.createOscillator();
    m.frequency.value = 2100 * 1.41;
    const mg = eng.ctx.createGain();
    mg.gain.value = 1500;
    m.connect(mg);
    mg.connect(c.frequency);
    m.start(t);
    m.stop(t + 0.15);
  },
  explodeS(eng, t) {
    const a = g(eng, t, 0.28, 0.002, 0.32);
    nz(eng, t, 0.32, a, 'lowpass', 3500, 250, 0.7);
    const b = g(eng, t, 0.22, 0.002, 0.18);
    o(eng, 'sine', 160, 50, t, 0.18, b);
    rev(eng, a, 0.15);
  },
  explodeM(eng, t) {
    const a = g(eng, t, 0.38, 0.002, 0.6);
    nz(eng, t, 0.6, a, 'lowpass', 3000, 140, 0.8, eng.brown);
    const a2 = g(eng, t, 0.18, 0.002, 0.3);
    nz(eng, t, 0.3, a2, 'lowpass', 5000, 600, 0.8);
    const b = g(eng, t, 0.35, 0.002, 0.35);
    o(eng, 'sine', 120, 38, t, 0.35, b);
    rev(eng, a, 0.25);
  },
  explodeL(eng, t) {
    const a = g(eng, t, 0.5, 0.003, 1.2);
    nz(eng, t, 1.2, a, 'lowpass', 2500, 80, 0.8, eng.brown);
    const a2 = g(eng, t, 0.25, 0.002, 0.5);
    nz(eng, t, 0.5, a2, 'lowpass', 6000, 400, 0.7);
    const b = g(eng, t, 0.5, 0.003, 0.7);
    o(eng, 'sine', 100, 28, t, 0.7, b);
    for (let i = 0; i < 4; i++) {
      const c = g(eng, t + 0.1 + i * 0.09, 0.12, 0.002, 0.08);
      nz(eng, t + 0.1 + i * 0.09, 0.08, c, 'bandpass', 2000 + i * 800, 1000, 2);
    }
    rev(eng, a, 0.35);
  },
  bossExplode(eng, t) {
    for (let i = 0; i < 6; i++) SFX.explodeL(eng, t + i * 0.32);
    const a = g(eng, t, 0.5, 0.05, 3.5);
    nz(eng, t, 3.5, a, 'lowpass', 900, 40, 0.6, eng.brown);
    const b = g(eng, t, 0.4, 0.05, 2.5);
    o(eng, 'sine', 80, 20, t, 2.5, b);
    rev(eng, a, 0.5);
  },
  playerDeath(eng, t) {
    const a = g(eng, t, 0.3, 0.002, 1.1);
    o(eng, arc(eng) ? 'square' : 'sawtooth', 900, 60, t, 1.1, a);
    SFX.explodeL(eng, t);
    rev(eng, a, 0.4);
  },
  warning(eng, t) {
    for (let i = 0; i < 6; i++) {
      const a = g(eng, t + i * 0.42, 0.13, 0.02, 0.36);
      o(eng, 'square', i % 2 ? 660 : 880, i % 2 ? 660 : 880, t + i * 0.42, 0.36, a);
      const b = g(eng, t + i * 0.42, 0.07, 0.02, 0.36);
      o(eng, 'sawtooth', i % 2 ? 330 : 440, i % 2 ? 330 : 440, t + i * 0.42, 0.36, b);
      rev(eng, a, 0.3);
    }
  },
  blockBreak(eng, t) {
    const a = g(eng, t, 0.25, 0.002, 0.3);
    nz(eng, t, 0.3, a, 'bandpass', 900, 300, 1.5);
    const b = g(eng, t, 0.15, 0.002, 0.15);
    o(eng, 'square', 300, 80, t, 0.15, b);
  },
  menuMove(eng, t) {
    const a = g(eng, t, 0.05, 0.002, 0.05);
    o(eng, arc(eng) ? 'pulse' : 'triangle', 1200, 1200, t, 0.05, a);
  },
  menuSelect(eng, t) {
    [0, 7, 12].forEach((s, i) => {
      const a = g(eng, t + i * 0.04, 0.07, 0.002, 0.2);
      o(eng, arc(eng) ? 'pulse' : 'triangle', 880 * 2 ** (s / 12), 880 * 2 ** (s / 12), t + i * 0.04, 0.2, a);
      rev(eng, a, 0.3);
    });
  },
  menuBack(eng, t) {
    const a = g(eng, t, 0.06, 0.002, 0.1);
    o(eng, 'triangle', 700, 350, t, 0.1, a);
  },
  pause(eng, t) {
    [0, 5].forEach((s, i) => {
      const a = g(eng, t + i * 0.07, 0.07, 0.002, 0.15);
      o(eng, 'square', 660 * 2 ** (s / 12), 660 * 2 ** (s / 12), t + i * 0.07, 0.15, a);
    });
  },
  bossRoar(eng, t) {
    const a = g(eng, t, 0.3, 0.1, 1.4);
    const c = o(eng, 'sawtooth', 70, 45, t, 1.5, a, 'lin');
    const m = eng.ctx.createOscillator();
    m.frequency.value = 31;
    const mg = eng.ctx.createGain();
    mg.gain.value = 40;
    m.connect(mg);
    mg.connect(c.frequency);
    m.start(t);
    m.stop(t + 1.6);
    const b = g(eng, t, 0.18, 0.1, 1.2);
    nz(eng, t, 1.3, b, 'bandpass', 400, 200, 3, eng.brown);
    rev(eng, a, 0.5);
  },
  laserCharge(eng, t, dur = 1) {
    const a = g(eng, t, 0.1, dur * 0.9, 0.1);
    o(eng, 'sawtooth', 200, 2400, t, dur, a);
    rev(eng, a, 0.3);
  },
  laserFire(eng, t, dur = 0.9) {
    const a = g(eng, t, 0.22, 0.01, dur);
    nz(eng, t, dur, a, 'bandpass', 1800, 900, 0.9);
    const b = g(eng, t, 0.14, 0.01, dur);
    o(eng, 'sawtooth', 110, 90, t, dur, b);
    rev(eng, a, 0.3);
  },
  crush(eng, t) {
    const a = g(eng, t, 0.45, 0.002, 0.5);
    nz(eng, t, 0.5, a, 'lowpass', 1200, 90, 1, eng.brown);
    const b = g(eng, t, 0.45, 0.002, 0.4);
    o(eng, 'sine', 90, 35, t, 0.4, b);
    const c = g(eng, t, 0.12, 0.001, 0.3);
    o(eng, 'square', 160, 140, t, 0.3, c);
  },
  squish(eng, t) {
    const a = g(eng, t, 0.18, 0.01, 0.3);
    nz(eng, t, 0.3, a, 'bandpass', 600, 200, 4, eng.brown);
  },
  coreOpen(eng, t) {
    const a = g(eng, t, 0.14, 0.05, 0.6);
    nz(eng, t, 0.65, a, 'highpass', 2000, 6000, 0.7);
    const b = g(eng, t + 0.5, 0.25, 0.002, 0.2);
    o(eng, 'square', 120, 60, t + 0.5, 0.2, b);
  },
  spawn(eng, t) {
    const a = g(eng, t, 0.1, 0.05, 0.4);
    o(eng, 'triangle', 200, 600, t, 0.45, a);
  },
};
