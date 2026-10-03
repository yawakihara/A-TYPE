/**
 * MML (Music Macro Language) compiler for the soundtrack.
 *
 *   c d e f g a b   notes, followed by + / # (sharp) or - (flat), then length and dots: c4  e8.  g16
 *   r               rest (same length rules)
 *   ^n              extend the previous note by length n (tie)       c4^8
 *   &               tie into the next note (same pitch)               c4&c8
 *   o4 > <          octave set / up / down
 *   l8              default length            (length N = 4/N quarter notes; 12 = eighth triplet)
 *   v12             velocity 0..15
 *   q6              gate: notes sound for 6/8 of their length (q8 = legato)
 *   k-2             transpose following notes by semitones
 *   (c e g)4        chord: notes start together; octave moves inside are local
 *   [ ... | ... ]3  repeat 3x; the part after | is skipped on the last pass
 *   $name           macro expansion (song.macros)
 *   // comment      to end of line
 *
 * Drum tracks use letters as instruments:
 *   k kick  s snare  h hat  o open hat  c crash  t/m/f toms  p clap  i ride  x rim  z reverse cymbal
 * Uppercase = accent. Chords such as (kh)8 hit several at once.
 */
export const TPQ = 48; // ticks per quarter note

const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const DRUMS = new Set(['k', 's', 'h', 'o', 'c', 't', 'm', 'f', 'p', 'i', 'x', 'z']);

function lenTicks(n, dots) {
  let t = (TPQ * 4) / n;
  let add = t / 2;
  for (let i = 0; i < dots; i++) {
    t += add;
    add /= 2;
  }
  return Math.round(t);
}

export function expandMacros(src, macros = {}, depth = 0) {
  if (depth > 8) throw new Error('macro recursion too deep');
  return src.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (m, name) => {
    if (!(name in macros)) throw new Error(`unknown macro $${name}`);
    return expandMacros(macros[name], macros, depth + 1);
  });
}

/** Expand [..|..]n repeats into a flat string. */
export function expandRepeats(src) {
  let s = src;
  for (let guard = 0; guard < 200; guard++) {
    // innermost bracket without nested brackets
    const m = /\[([^[\]]*)\](\d*)/.exec(s);
    if (!m) break;
    const body = m[1];
    const n = m[2] ? parseInt(m[2], 10) : 2;
    const [head, tail] = body.includes('|') ? [body.slice(0, body.indexOf('|')), body.slice(body.indexOf('|') + 1)] : [body, null];
    let out = '';
    for (let i = 0; i < n; i++) {
      out += ` ${head} `;
      if (tail !== null && i < n - 1) out += ` ${tail} `;
    }
    s = s.slice(0, m.index) + out + s.slice(m.index + m[0].length);
  }
  if (s.includes('[') || s.includes(']')) throw new Error('unbalanced repeat brackets');
  return s;
}

/**
 * Compile one track.
 * @returns {{events: Array<{t:number,d:number,g:number,notes:Array<number|string>,v:number}>, length:number}}
 */
export function compileTrack(src, opt = {}) {
  const drum = !!opt.drum;
  let s = src.replace(/\/\/[^\n]*/g, ' ');
  s = expandMacros(s, opt.macros);
  s = expandRepeats(s);
  s = s.toLowerCase().replace(/\s+/g, drum ? ' ' : '');
  // drums keep case for accents: re-read original case after expansion
  let raw = src.replace(/\/\/[^\n]*/g, ' ');
  raw = expandRepeats(expandMacros(raw, opt.macros)).replace(/\s+/g, '');
  const str = drum ? raw : s;
  const events = [];
  let i = 0;
  let t = 0;
  let oct = 4;
  let deflen = 8;
  let vel = 12;
  let gate = 7;
  let trans = 0;
  let last = null;
  let tieNext = false;

  const readNum = () => {
    let m = '';
    if (str[i] === '-' || str[i] === '+') m += str[i++];
    while (i < str.length && /[0-9]/.test(str[i])) m += str[i++];
    return m === '' || m === '-' || m === '+' ? null : parseInt(m, 10);
  };
  const readLen = () => {
    const n = readNum();
    let dots = 0;
    while (str[i] === '.') {
      dots++;
      i++;
    }
    return lenTicks(n ?? deflen, n === null && dots === 0 ? deflenDots : dots);
  };
  let deflenDots = 0;

  const readPitch = (ch, o) => {
    let p = PC[ch];
    while (str[i] === '+' || str[i] === '#' || str[i] === '-') {
      // a '-' followed by digits is a length? no: lengths never carry a sign, so '-' here is a flat
      p += str[i] === '-' ? -1 : 1;
      i++;
    }
    return (o + 1) * 12 + p + trans;
  };

  const push = (notes, d) => {
    if (tieNext && last && notes.length === 1 && last.notes.length === 1 && last.notes[0] === notes[0]) {
      last.d += d;
      last.g = Math.round(last.d * (gate / 8));
      tieNext = false;
      return;
    }
    tieNext = false;
    const ev = { t, d, g: Math.max(1, Math.round(d * (gate / 8))), notes, v: vel };
    events.push(ev);
    last = ev;
  };

  while (i < str.length) {
    const c0 = str[i];
    const c = c0.toLowerCase();
    i++;
    if (drum && DRUMS.has(c)) {
      const d = readLen();
      const accent = c0 !== c;
      const ev = { t, d, g: d, notes: [c], v: accent ? Math.min(15, vel + 3) : vel };
      events.push(ev);
      last = ev;
      t += d;
      continue;
    }
    if (!drum && c in PC) {
      const pitch = readPitch(c, oct);
      const d = readLen();
      push([pitch], d);
      t += d;
      continue;
    }
    switch (c) {
      case 'r': {
        const d = readLen();
        t += d;
        last = null;
        break;
      }
      case '^': {
        const d = readLen();
        if (last) {
          last.d += d;
          last.g = Math.round(last.d * (gate / 8));
        }
        t += d;
        break;
      }
      case '&':
        tieNext = true;
        break;
      case 'o':
        oct = readNum();
        break;
      case '>':
        oct++;
        break;
      case '<':
        oct--;
        break;
      case 'l': {
        deflen = readNum();
        deflenDots = 0;
        while (str[i] === '.') {
          deflenDots++;
          i++;
        }
        break;
      }
      case 'v':
        vel = readNum();
        break;
      case 'q':
        gate = readNum();
        break;
      case 'k':
        if (drum) break;
        trans = readNum();
        break;
      case '(': {
        const notes = [];
        let o = oct;
        while (i < str.length && str[i] !== ')') {
          const ch = str[i++];
          const lc = ch.toLowerCase();
          if (drum && DRUMS.has(lc)) notes.push(lc);
          else if (!drum && lc in PC) notes.push(readPitch(lc, o));
          else if (ch === '>') o++;
          else if (ch === '<') o--;
          else if (ch === 'o') o = readNum();
          else if (ch !== ' ' && ch !== ',') throw new Error(`bad char in chord: ${ch}`);
        }
        i++; // ')'
        const d = readLen();
        if (drum) {
          const ev = { t, d, g: d, notes, v: vel };
          events.push(ev);
          last = ev;
        } else push(notes, d);
        t += d;
        break;
      }
      case ' ':
      case '|':
      case ',':
        break;
      default:
        throw new Error(`MML: unexpected '${c0}' at ${i - 1}: …${str.slice(Math.max(0, i - 12), i + 8)}…`);
    }
  }
  return { events, length: t };
}

/** Compile a whole song definition. */
export function compileSong(def) {
  const tracks = def.tracks.map((tr) => {
    const c = compileTrack(tr.mml, { drum: tr.role === 'drums', macros: def.macros });
    return { ...tr, events: c.events, length: c.length };
  });
  const length = Math.max(...tracks.map((t) => t.length));
  const loop = def.loop !== undefined ? Math.round(def.loop * TPQ * 4) : 0; // loop point in bars (4/4)
  // index events by start tick for the scheduler
  for (const tr of tracks) {
    tr.byTick = new Map();
    for (const e of tr.events) {
      if (!tr.byTick.has(e.t)) tr.byTick.set(e.t, []);
      tr.byTick.get(e.t).push(e);
    }
  }
  return { name: def.name, bpm: def.bpm, tracks, length, loop: def.once ? -1 : loop, once: !!def.once };
}

/** Validate track lengths (all tracks must end on the same tick). */
export function validateSong(def) {
  const errs = [];
  let lens;
  try {
    lens = def.tracks.map((tr) => compileTrack(tr.mml, { drum: tr.role === 'drums', macros: def.macros }).length);
  } catch (e) {
    return [`${def.name}: ${e.message}`];
  }
  const L = Math.max(...lens);
  def.tracks.forEach((tr, k) => {
    if (lens[k] !== L) errs.push(`${def.name}/${tr.role}#${k}: ${lens[k] / (TPQ * 4)} bars vs ${L / (TPQ * 4)}`);
  });
  if (def.loop !== undefined && def.loop * TPQ * 4 >= L) errs.push(`${def.name}: loop point beyond end`);
  return errs;
}
