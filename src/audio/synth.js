/**
 * Instruments for both sound kits.
 *  REMASTERED: detuned saw stacks, analog-style filtered bass, lush pads, formant choir,
 *              layered drums, sent to convolution reverb and stereo delay.
 *  ARCADE FM : 2-operator FM voices, PSG-style pulse arps and crunchy 4-bit PCM-ish drums,
 *              mostly dry — the sound of a late-80s arcade board.
 * Every voice: (eng, ch, t, freq, dur, vel) where ch.input is the channel's input node.
 */

const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
export { midiHz };

function env(param, t, a, d, s, peak, dur, rel) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + a);
  if (d > 0) param.setTargetAtTime(peak * s, t + a, d / 3);
  const end = t + Math.max(dur, a + 0.005);
  param.setTargetAtTime(0.0001, end, rel / 4);
  return end + rel * 1.2;
}

function osc(ctx, type, freq, t) {
  const o = ctx.createOscillator();
  if (typeof type === 'string') o.type = type;
  else o.setPeriodicWave(type);
  o.frequency.setValueAtTime(freq, t);
  return o;
}

/** Generic subtractive voice from a patch description. */
function sub(eng, ch, t, freq, dur, vel, P) {
  const ctx = eng.ctx;
  const amp = ctx.createGain();
  let dest = amp;
  let filt = null;
  if (P.f) {
    filt = ctx.createBiquadFilter();
    filt.type = P.f.type || 'lowpass';
    filt.Q.value = P.f.q ?? 1;
    const kt = (freq / 261.6) ** (P.f.kt ?? 0.5);
    const base = Math.min(18000, P.f.freq * kt);
    const peak = Math.min(18000, base + (P.f.env || 0) * (0.5 + vel * 0.5));
    filt.frequency.setValueAtTime(peak, t);
    filt.frequency.setTargetAtTime(base, t + (P.f.a || 0.002), (P.f.d || 0.2) / 3);
    if (P.f.sweepTo) filt.frequency.linearRampToValueAtTime(P.f.sweepTo, t + dur);
    filt.connect(amp);
    dest = filt;
  }
  const A = P.amp;
  const peak = (P.gain ?? 0.2) * (0.25 + 0.75 * vel * vel);
  const end = env(amp.gain, t, A[0], A[1], A[2], peak, dur, A[3]);
  let lfo = null;
  if (P.vib) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = P.vib[0];
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(P.vib[1], t + (P.vib[2] ?? 0.25) + 0.15);
    lfo.connect(lg);
    lfo.start(t);
    lfo.stop(end);
    lfo._g = lg;
  }
  for (const o of P.osc) {
    const det = o.det || [0];
    const g = ctx.createGain();
    g.gain.value = (o.g ?? 1) / Math.sqrt(det.length);
    g.connect(dest);
    for (const c of det) {
      const node = osc(ctx, o.wave === 'pulse' ? eng.waves.pulse : o.wave === 'organ' ? eng.waves.organ : o.wave || 'sawtooth', freq * 2 ** (o.oct || 0), t);
      node.detune.value = c + (o.cents || 0);
      if (P.glide && ch.lastFreq) {
        node.frequency.setValueAtTime(ch.lastFreq * 2 ** (o.oct || 0), t);
        node.frequency.exponentialRampToValueAtTime(freq * 2 ** (o.oct || 0), t + P.glide);
      }
      if (lfo) lfo._g.connect(node.detune);
      node.connect(g);
      node.start(t);
      node.stop(end);
    }
  }
  if (P.drive) {
    // gentle saturation for bass weight
    const ws = ctx.createWaveShaper();
    ws.curve = eng.curves.soft;
    amp.connect(ws);
    ws.connect(ch.input);
  } else amp.connect(ch.input);
  ch.lastFreq = freq;
  return end;
}

/** 2-operator FM voice (optionally a second modulator in parallel). */
function fm(eng, ch, t, freq, dur, vel, P) {
  const ctx = eng.ctx;
  const amp = ctx.createGain();
  const A = P.amp;
  const peak = (P.gain ?? 0.2) * (0.25 + 0.75 * vel * vel);
  const end = env(amp.gain, t, A[0], A[1], A[2], peak, dur, A[3]);
  const car = osc(ctx, P.car || 'sine', freq, t);
  const mods = P.mods || [{ r: P.r ?? 1, i: P.i ?? [2, 0.6], d: P.d ?? 0.3 }];
  for (const m of mods) {
    const mod = osc(ctx, 'sine', freq * m.r, t);
    const mg = ctx.createGain();
    const i0 = m.i[0] * freq * m.r * (0.5 + vel * 0.5);
    const i1 = m.i[1] * freq * m.r;
    mg.gain.setValueAtTime(m.a ? 0 : i0, t);
    if (m.a) mg.gain.linearRampToValueAtTime(i0, t + m.a);
    mg.gain.setTargetAtTime(i1, t + (m.a || 0), m.d / 3);
    mod.connect(mg);
    mg.connect(car.frequency);
    mod.start(t);
    mod.stop(end);
  }
  if (P.vib) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = P.vib[0];
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(P.vib[1], t + (P.vib[2] ?? 0.3) + 0.1);
    lfo.connect(lg);
    lg.connect(car.detune);
    lfo.start(t);
    lfo.stop(end);
  }
  if (P.glide && ch.lastFreq) {
    car.frequency.setValueAtTime(ch.lastFreq, t);
    car.frequency.exponentialRampToValueAtTime(freq, t + P.glide);
  }
  car.connect(amp);
  if (P.lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = P.lp;
    amp.connect(f);
    f.connect(ch.input);
  } else amp.connect(ch.input);
  car.start(t);
  car.stop(end);
  ch.lastFreq = freq;
  return end;
}

/** Formant choir: saw through three band-passes ("ah"). */
function choir(eng, ch, t, freq, dur, vel, P) {
  const ctx = eng.ctx;
  const amp = ctx.createGain();
  const peak = (P.gain ?? 0.2) * (0.3 + 0.7 * vel);
  const end = env(amp.gain, t, P.amp[0], P.amp[1], P.amp[2], peak, dur, P.amp[3]);
  const mix = ctx.createGain();
  mix.gain.value = 1;
  const forms = P.formants || [[730, 1], [1090, 0.5], [2440, 0.25]];
  for (const [f, g] of forms) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 7;
    const gg = ctx.createGain();
    gg.gain.value = g * 3;
    mix.connect(bp);
    bp.connect(gg);
    gg.connect(amp);
  }
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const lg = ctx.createGain();
  lg.gain.value = 9;
  lfo.connect(lg);
  for (const d of [-9, 0, 8]) {
    const o = osc(ctx, 'sawtooth', freq, t);
    o.detune.value = d;
    lg.connect(o.detune);
    o.connect(mix);
    o.start(t);
    o.stop(end);
  }
  lfo.start(t);
  lfo.stop(end);
  amp.connect(ch.input);
  return end;
}

// ------------------------------------------------------------------ patches

const R = {
  lead: { type: sub, P: { osc: [{ wave: 'sawtooth', det: [-14, -6, 0, 6, 14], g: 0.9 }, { wave: 'square', oct: -1, g: 0.25 }], f: { freq: 1600, env: 3200, d: 0.35, q: 2, kt: 0.6 }, amp: [0.008, 0.3, 0.75, 0.22], vib: [5.6, 14, 0.25], gain: 0.15, glide: 0.035 } },
  lead2: { type: sub, P: { osc: [{ wave: 'pulse', det: [-6, 6] }, { wave: 'triangle', g: 0.5 }], f: { freq: 2400, env: 1800, d: 0.25, q: 1.2 }, amp: [0.006, 0.25, 0.6, 0.18], vib: [5.2, 10, 0.3], gain: 0.12 } },
  bass: { type: sub, P: { osc: [{ wave: 'sawtooth', det: [-5, 5] }, { wave: 'square', oct: -1, g: 0.6 }], f: { freq: 260, env: 1500, d: 0.16, q: 5, kt: 0.8 }, amp: [0.004, 0.18, 0.62, 0.08], gain: 0.24, drive: true } },
  pad: { type: sub, P: { osc: [{ wave: 'sawtooth', det: [-18, -7, 7, 18] }, { wave: 'triangle', oct: -1, g: 0.4 }], f: { freq: 900, env: 700, a: 0.6, d: 1.2, q: 0.8, kt: 0.3 }, amp: [0.45, 0.8, 0.85, 0.9], vib: [0.35, 6, 0], gain: 0.06 } },
  strings: { type: sub, P: { osc: [{ wave: 'sawtooth', det: [-12, -4, 4, 12] }], f: { freq: 2600, env: 600, a: 0.2, d: 0.5, q: 0.7, kt: 0.4 }, amp: [0.16, 0.4, 0.85, 0.45], vib: [5.4, 9, 0.35], gain: 0.07 } },
  brass: { type: sub, P: { osc: [{ wave: 'sawtooth', det: [-8, 0, 8] }, { wave: 'square', g: 0.3 }], f: { freq: 700, env: 2600, a: 0.07, d: 0.4, q: 1.6, kt: 0.7 }, amp: [0.03, 0.3, 0.8, 0.2], vib: [5, 8, 0.4], gain: 0.12 } },
  arp: { type: sub, P: { osc: [{ wave: 'square', det: [-4, 4] }, { wave: 'sawtooth', g: 0.5 }], f: { freq: 900, env: 4200, d: 0.12, q: 4, kt: 0.5 }, amp: [0.002, 0.14, 0.15, 0.12], gain: 0.09 } },
  bell: { type: fm, P: { mods: [{ r: 3.5, i: [3, 0.2], d: 1.2 }, { r: 1, i: [0.6, 0], d: 0.4 }], amp: [0.002, 1.4, 0.25, 0.9], gain: 0.1 } },
  piano: { type: fm, P: { mods: [{ r: 1, i: [1.8, 0.25], d: 0.9 }, { r: 14, i: [0.18, 0], d: 0.06 }], amp: [0.002, 1.6, 0.3, 0.5], gain: 0.14 } },
  organ: { type: sub, P: { osc: [{ wave: 'organ', det: [-3, 3] }], amp: [0.01, 0.1, 0.95, 0.12], vib: [6.2, 6, 0.1], gain: 0.07 } },
  choir: { type: choir, P: { amp: [0.35, 0.6, 0.9, 0.8], gain: 0.07 } },
  sub: { type: sub, P: { osc: [{ wave: 'sine' }, { wave: 'triangle', g: 0.3 }], amp: [0.005, 0.3, 0.8, 0.15], gain: 0.28 } },
};

const A = {
  lead: { type: fm, P: { car: 'sine', mods: [{ r: 1, i: [2.4, 1.1], d: 0.25 }, { r: 2, i: [0.6, 0.3], d: 0.4 }], amp: [0.006, 0.4, 0.78, 0.12], vib: [5.8, 16, 0.22], gain: 0.16, glide: 0.03 } },
  lead2: { type: fm, P: { car: 'sine', mods: [{ r: 2, i: [1.4, 0.7], d: 0.3 }], amp: [0.006, 0.3, 0.65, 0.1], vib: [5.4, 12, 0.3], gain: 0.13 } },
  bass: { type: fm, P: { car: 'sine', mods: [{ r: 1, i: [3.6, 0.9], d: 0.14 }, { r: 0.5, i: [0.8, 0.4], d: 0.3 }], amp: [0.003, 0.2, 0.55, 0.06], gain: 0.27 } },
  pad: { type: fm, P: { car: 'sine', mods: [{ r: 1, i: [0.9, 0.7], d: 0.8, a: 0.3 }], amp: [0.3, 0.8, 0.85, 0.5], vib: [5, 7, 0.4], gain: 0.07 } },
  strings: { type: fm, P: { car: 'sine', mods: [{ r: 1, i: [1.2, 0.9], d: 0.6, a: 0.12 }], amp: [0.12, 0.5, 0.85, 0.3], vib: [5.4, 10, 0.3], gain: 0.08 } },
  brass: { type: fm, P: { car: 'sine', mods: [{ r: 1, i: [3, 2], d: 0.4, a: 0.05 }], amp: [0.03, 0.3, 0.8, 0.12], vib: [5, 9, 0.35], gain: 0.13 } },
  arp: { type: sub, P: { osc: [{ wave: 'pulse' }], amp: [0.001, 0.1, 0.2, 0.05], gain: 0.07 } },
  bell: { type: fm, P: { mods: [{ r: 3.5, i: [2.5, 0.1], d: 0.9 }], amp: [0.002, 1, 0.2, 0.4], gain: 0.1 } },
  piano: { type: fm, P: { mods: [{ r: 1, i: [2.2, 0.3], d: 0.7 }], amp: [0.002, 1.2, 0.25, 0.3], gain: 0.13 } },
  organ: { type: sub, P: { osc: [{ wave: 'square', g: 0.5 }, { wave: 'sine', oct: 1, g: 0.6 }], amp: [0.005, 0.1, 0.9, 0.08], gain: 0.07 } },
  choir: { type: fm, P: { car: 'sine', mods: [{ r: 2, i: [0.5, 0.35], d: 1, a: 0.3 }], amp: [0.35, 0.6, 0.9, 0.5], vib: [5.2, 12, 0.2], gain: 0.08 } },
  sub: { type: fm, P: { mods: [{ r: 1, i: [0.5, 0.2], d: 0.2 }], amp: [0.004, 0.3, 0.8, 0.1], gain: 0.28 } },
};

export const KITS = { remastered: R, arcade: A };

export function playNote(eng, kit, role, ch, t, midi, dur, vel) {
  const k = KITS[kit] || R;
  const inst = k[role] || k.lead;
  return inst.type(eng, ch, t, midiHz(midi), dur, vel, inst.P);
}

// ------------------------------------------------------------------ drums

function noiseSrc(eng, t, dur, buf = eng.noise) {
  const s = eng.ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.loopStart = Math.random() * 1.5;
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur);
  return s;
}

function egain(eng, t, peak, decay, attack = 0.001) {
  const g = eng.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

function filt(eng, type, f, q = 1) {
  const b = eng.ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}

/** 808-style metallic source: six detuned squares. */
function metal(eng, t, dur, base = 1) {
  const ctx = eng.ctx;
  const sum = ctx.createGain();
  sum.gain.value = 0.18;
  for (const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 205 * r * base;
    o.connect(sum);
    o.start(t);
    o.stop(t + dur);
  }
  return sum;
}

export function playDrum(eng, kit, name, out, t, vel) {
  const ctx = eng.ctx;
  const v = 0.35 + 0.65 * vel;
  const arc = kit === 'arcade';
  const dest = arc ? eng.crush.input : out;
  if (arc && !eng.crush.connected.has(out)) {
    eng.crush.output.connect(out);
    eng.crush.connected.add(out);
  }
  switch (name) {
    case 'k': {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(arc ? 180 : 160, t);
      o.frequency.exponentialRampToValueAtTime(arc ? 50 : 42, t + (arc ? 0.08 : 0.11));
      const g = egain(eng, t, 0.9 * v, arc ? 0.22 : 0.42);
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + 0.5);
      // click
      const n = noiseSrc(eng, t, 0.02);
      const hp = filt(eng, 'highpass', 2500);
      const ng = egain(eng, t, 0.25 * v, 0.012);
      n.connect(hp);
      hp.connect(ng);
      ng.connect(dest);
      if (!arc) {
        const s2 = ctx.createOscillator();
        s2.frequency.setValueAtTime(55, t);
        const sg = egain(eng, t, 0.35 * v, 0.35, 0.01);
        s2.connect(sg);
        sg.connect(dest);
        s2.start(t);
        s2.stop(t + 0.45);
      }
      break;
    }
    case 's':
    case 'x': {
      const rim = name === 'x';
      const n = noiseSrc(eng, t, 0.3);
      const bp = filt(eng, rim ? 'highpass' : 'bandpass', rim ? 3000 : arc ? 2200 : 1700, rim ? 0.7 : 0.7);
      const ng = egain(eng, t, (rim ? 0.25 : 0.55) * v, rim ? 0.04 : arc ? 0.13 : 0.2);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(dest);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(rim ? 820 : 200, t);
      o.frequency.exponentialRampToValueAtTime(rim ? 700 : 160, t + 0.08);
      const og = egain(eng, t, (rim ? 0.3 : 0.45) * v, rim ? 0.03 : 0.09);
      o.connect(og);
      og.connect(dest);
      o.start(t);
      o.stop(t + 0.2);
      if (!arc && !rim && eng.revIn) {
        const sg = ctx.createGain();
        sg.gain.value = 0.25;
        ng.connect(sg);
        sg.connect(eng.revIn);
      }
      break;
    }
    case 'p': {
      for (let i = 0; i < 3; i++) {
        const n = noiseSrc(eng, t + i * 0.011, 0.05);
        const bp = filt(eng, 'bandpass', 1250, 1.2);
        const g = egain(eng, t + i * 0.011, 0.5 * v, i === 2 ? 0.16 : 0.012);
        n.connect(bp);
        bp.connect(g);
        g.connect(dest);
      }
      break;
    }
    case 'h':
    case 'o': {
      const open = name === 'o';
      const dur = open ? 0.32 : 0.045;
      const n = noiseSrc(eng, t, dur + 0.05);
      const hp = filt(eng, 'highpass', arc ? 6000 : 7500);
      const g = egain(eng, t, (open ? 0.22 : 0.2) * v, dur);
      n.connect(hp);
      hp.connect(g);
      g.connect(dest);
      if (!arc) {
        const m = metal(eng, t, dur + 0.05);
        const bp = filt(eng, 'bandpass', 10000, 1);
        const mg = egain(eng, t, 0.16 * v, dur);
        m.connect(bp);
        bp.connect(mg);
        mg.connect(out);
      }
      break;
    }
    case 'c':
    case 'i':
    case 'z': {
      const ride = name === 'i';
      const rev = name === 'z';
      const dur = ride ? 0.7 : rev ? 0.9 : 1.6;
      const n = noiseSrc(eng, t, dur + 0.1);
      const hp = filt(eng, 'highpass', ride ? 6000 : 3500);
      const g = ctx.createGain();
      if (rev) {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35 * v, t + dur);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
      } else {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime((ride ? 0.1 : 0.3) * v, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      }
      n.connect(hp);
      hp.connect(g);
      g.connect(dest);
      if (!arc) {
        const m = metal(eng, t, dur, ride ? 1.3 : 0.9);
        const bp = filt(eng, 'highpass', 5000);
        const mg = egain(eng, t, (ride ? 0.18 : 0.12) * v, dur * 0.8);
        m.connect(bp);
        bp.connect(mg);
        mg.connect(out);
        if (eng.revIn) {
          const sg = ctx.createGain();
          sg.gain.value = 0.2;
          g.connect(sg);
          sg.connect(eng.revIn);
        }
      }
      break;
    }
    case 't':
    case 'm':
    case 'f': {
      const f0 = name === 't' ? 240 : name === 'm' ? 170 : 115;
      const o = ctx.createOscillator();
      o.type = arc ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.25);
      const g = egain(eng, t, 0.6 * v, 0.32);
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + 0.4);
      const n = noiseSrc(eng, t, 0.05);
      const lp = filt(eng, 'lowpass', 1800);
      const ng = egain(eng, t, 0.12 * v, 0.03);
      n.connect(lp);
      lp.connect(ng);
      ng.connect(dest);
      break;
    }
    default:
      break;
  }
}
