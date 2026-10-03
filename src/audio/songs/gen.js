/**
 * Composition helpers: turn chord progressions into MML for bass, pads and arpeggios
 * (with smooth voice leading), so hand-written melodies sit on exact harmony and timing.
 *
 * Progression syntax: "Dm Bb F C" (1 bar each) or "Dm:2 Bb:0.5 C:0.5" (bars).
 * Chord names: root [b|#] + quality: '', m, 7, m7, maj7, dim, aug, sus2, sus4, add9, m9, 5, 6, m6
 *              optional slash bass: C/E
 */
const PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUAL = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  7: [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  m9: [0, 3, 7, 10, 14],
  madd9: [0, 3, 7, 14],
  5: [0, 7],
  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  m7b5: [0, 3, 6, 10],
};
const NAMES = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];

export function parseChord(name) {
  const [main, slash] = name.split('/');
  const m = /^([A-G])([b#]?)(.*)$/.exec(main);
  if (!m) throw new Error(`bad chord ${name}`);
  let root = PCS[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0);
  root = (root + 12) % 12;
  const q = QUAL[m[3]];
  if (!q) throw new Error(`bad chord quality ${name}`);
  let bass = root;
  if (slash) {
    const s = /^([A-G])([b#]?)$/.exec(slash);
    bass = (PCS[s[1]] + (s[2] === 'b' ? -1 : s[2] === '#' ? 1 : 0) + 12) % 12;
  }
  return { root, ints: q, bass };
}

export function parseProg(str) {
  return str
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [c, b] = tok.split(':');
      return { ...parseChord(c), bars: b ? parseFloat(b) : 1, name: c };
    });
}

/** MML token for a MIDI note with explicit octave. */
export function tok(midi, len) {
  const o = Math.floor(midi / 12) - 1;
  return `o${o}${NAMES[midi % 12]}${len}`;
}

/** Length tokens for a duration in sixteenth notes (split into tied values). */
function lenParts(sixteenths) {
  const out = [];
  let s = sixteenths;
  for (const [v, n] of [[16, 1], [12, '2.'], [8, 2], [6, '4.'], [4, 4], [3, '8.'], [2, 8], [1, 16]]) {
    while (s >= v) {
      out.push(n);
      s -= v;
    }
  }
  return out;
}

export function rest(bars) {
  return lenParts(Math.round(bars * 16))
    .map((l) => `r${l}`)
    .join(' ');
}

function held(midis, bars) {
  const parts = lenParts(Math.round(bars * 16));
  const chordTok = (l) => (midis.length === 1 ? tok(midis[0], l) : `(${midis.map((m) => tok(m, '')).join(' ')})${l}`);
  return parts.map((l, i) => (i === 0 ? chordTok(l) : `^${l}`)).join(' ');
}

/** Voice a chord near a target centre, smoothing from the previous voicing. */
function voice(ch, center, prev, n = 3) {
  const pcs = ch.ints.map((i) => (ch.root + i) % 12);
  const uniq = [...new Set(pcs)].slice(0, Math.max(n, 3));
  let best = null;
  let bestCost = Infinity;
  for (let inv = 0; inv < uniq.length; inv++) {
    const order = uniq.slice(inv).concat(uniq.slice(0, inv));
    for (let base = center - 12; base <= center + 12; base++) {
      if (base % 12 !== order[0]) continue;
      const notes = [base];
      for (let k = 1; k < order.length; k++) {
        let m = notes[k - 1] + 1;
        while (m % 12 !== order[k]) m++;
        notes.push(m);
      }
      const mid = (notes[0] + notes[notes.length - 1]) / 2;
      let cost = Math.abs(mid - center) * 0.6;
      if (prev) for (let k = 0; k < Math.min(prev.length, notes.length); k++) cost += Math.abs(prev[k] - notes[k]) * 0.5;
      if (cost < bestCost) {
        bestCost = cost;
        best = notes;
      }
    }
  }
  return best;
}

/** Sustained pad chords. opt.center = MIDI centre (default 64), opt.hits = 'whole' | 'half' | 'push' */
export function pad(prog, opt = {}) {
  const P = typeof prog === 'string' ? parseProg(prog) : prog;
  const center = opt.center ?? 64;
  let prev = null;
  const out = [];
  for (const ch of P) {
    const v = voice(ch, center, prev, opt.notes || 3);
    prev = v;
    if (opt.hits === 'half') {
      const halves = Math.round(ch.bars * 2);
      for (let i = 0; i < halves; i++) out.push(held(v, 0.5));
    } else if (opt.hits === 'stab') {
      // rhythmic stabs: 8th on 1, 8th on the "and" of 2, rest
      const bars = Math.round(ch.bars * 4) / 4;
      for (let b = 0; b < bars; b += 1) out.push(`${held(v, 1 / 8)} r8 r8 ${held(v, 1 / 8)} r4 ${held(v, 1 / 8)} r8`);
    } else out.push(held(v, ch.bars));
  }
  return out.join(' ');
}

/**
 * Bass lines. pattern is an array of [interval, sixteenths] steps repeated through each bar.
 * Intervals are semitones above the chord bass; 'r' rests; 'f'/'t' = fifth / octave of the chord.
 */
export const BASS = {
  drive: [[0, 2], [0, 2], [12, 2], [0, 2], [0, 2], [0, 2], [12, 2], [0, 2]],
  pulse: [[0, 2], [0, 2], [0, 2], [0, 2], [0, 2], [0, 2], [0, 2], [0, 2]],
  gallop: [[0, 2], [0, 1], [0, 1], [12, 2], [0, 1], [0, 1], [0, 2], [0, 1], [0, 1], [7, 2], [0, 1], [0, 1]],
  synco: [[0, 3], [0, 3], [12, 2], [0, 3], [7, 3], [0, 2]],
  walk: [[0, 4], [7, 4], [12, 4], [7, 4]],
  root: [[0, 16]],
  halves: [[0, 8], [7, 8]],
  octs: [[0, 2], [12, 2], [0, 2], [12, 2], [0, 2], [12, 2], [0, 2], [12, 2]],
  march: [[0, 3], [0, 1], [0, 4], [0, 3], [0, 1], [7, 4]],
  heavy: [[0, 4], ['r', 2], [0, 2], [0, 2], [0, 2], [12, 2], [10, 2]],
  sixteen: [[0, 1], [0, 1], [12, 1], [0, 1], [0, 1], [0, 1], [12, 1], [0, 1], [0, 1], [0, 1], [12, 1], [0, 1], [0, 1], [10, 1], [12, 1], [7, 1]],
};

export function bass(prog, pattern = 'drive', opt = {}) {
  const P = typeof prog === 'string' ? parseProg(prog) : prog;
  const pat = typeof pattern === 'string' ? BASS[pattern] : pattern;
  const lo = opt.oct ?? 2;
  const out = [];
  for (const ch of P) {
    const root = (lo + 1) * 12 + ch.bass;
    const total = Math.round(ch.bars * 16);
    let pos = 0;
    let k = 0;
    while (pos < total) {
      const [iv, len] = pat[k % pat.length];
      const l = Math.min(len, total - pos);
      const parts = lenParts(l);
      if (iv === 'r') out.push(parts.map((p) => `r${p}`).join(' '));
      else out.push(parts.map((p, i) => (i === 0 ? tok(root + iv, p) : `^${p}`)).join(' '));
      pos += l;
      k++;
    }
  }
  return out.join(' ');
}

/** Arpeggios over chord tones. style: 'up' | 'down' | 'updown' | 'broken' | 'pedal'; step in sixteenths */
export function arp(prog, style = 'up', opt = {}) {
  const P = typeof prog === 'string' ? parseProg(prog) : prog;
  const center = opt.center ?? 72;
  const step = opt.step ?? 1;
  const span = opt.span ?? 2; // octaves of chord tones
  const out = [];
  let prev = null;
  for (const ch of P) {
    const v = voice(ch, center, prev, 3);
    prev = v;
    let tones = [];
    for (let o = 0; o < span; o++) for (const m of v) tones.push(m + o * 12);
    tones = tones.slice(0, Math.max(3, Math.round(span * v.length)));
    let seq;
    if (style === 'down') seq = [...tones].reverse();
    else if (style === 'updown') seq = tones.concat(tones.slice(1, -1).reverse());
    else if (style === 'broken') seq = tones.flatMap((m, i) => (i + 1 < tones.length ? [m, tones[i + 1]] : [m]));
    else if (style === 'pedal') seq = tones.slice(1).flatMap((m) => [tones[0], m]);
    else seq = tones;
    const total = Math.round((ch.bars * 16) / step);
    const l = { 1: 16, 2: 8, 4: 4 }[step] || 16;
    for (let i = 0; i < total; i++) out.push(tok(seq[i % seq.length], l));
  }
  return out.join(' ');
}

/** Repeat an MML fragment n times. */
export const rep = (s, n) => Array(n).fill(s).join(' ');

/** Drum grooves (one bar each, 16th grid unless noted). */
export const DR = {
  beat: '(kh)8 h8 (sh)8 h8 (kh)8 (kh)8 (sh)8 h16 h16',
  beatB: '(kh)8 h8 (sh)8 (kh)8 r8 (kh)8 (sh)8 (ho)8',
  beatC: '(kc)8 h8 (sh)8 h8 (kh)8 (kh)8 (sh)8 h16 h16',
  four: '(kh)8 h8 (kh)8 h8 (kh)8 h8 (kh)8 o8',
  fourS: '(kh)8 h8 (ksh)8 h8 (kh)8 h8 (ksh)8 o8',
  half: '(kh)4 h8 h8 (sh)4 h8 h8',
  halfB: '(kh)4 h8 (kh)8 (sh)4 h8 o8',
  march: 's16 s16 (ks)8 s8 s16 s16 (ks)8 s16 s16 s8 (ks)8',
  gallop: '(kh)8 h16 k16 (sh)8 h16 k16 (kh)8 h16 k16 (sh)8 h16 h16',
  dbl: '(kh)16 k16 h16 k16 (sh)16 h16 k16 h16 (kh)16 k16 h16 k16 (sh)16 h16 (ks)16 s16',
  shuffle: '(kh)8. h16 (sh)8. h16 (kh)8. k16 (sh)8. h16',
  tribal: '(kf)8 f16 f16 (sm)8 m16 f16 (kf)8 f16 m16 (sm)8 t16 t16',
  heart: 'K8 k8 r4 r2',
  heart2: 'K8 k8 r4 K8 k8 r4',
  ride: '(ki)8 i8 (si)8 i8 (ki)8 (ki)8 (si)8 i8',
  sparse: '(kh)4 r4 (sh)4 r4',
  fillA: 's16 s16 s16 s16 (st)8 t8 (sm)8 m8 (sf)8 f8',
  fillB: '(ks)8 s16 s16 s8 s16 s16 S16 S16 S16 S16 (kS)8 S8',
  fillC: 't16 t16 m16 m16 f16 f16 k16 k16 (sm)8 (sf)8 (kc)4',
  roll: 's16 s16 s16 s16 s16 s16 s16 s16 S16 S16 S16 S16 S16 S16 S16 S16',
  crash: '(kc)2 r2',
  silent: 'r1',
  toms: '(kf)4 (kf)4 (km)4 (kt)4',
};
