/** Short cues: stage clear, game over, prologue, name entry, ending. All original compositions. */
import { bass, pad, arp, rest, rep, DR } from './gen.js';

export const clear = {
  name: 'clear',
  bpm: 140,
  once: true,
  tracks: [
    { role: 'lead', vol: 0.65, rev: 0.3, mml: 'o5 a8 a16 a16 >d8 <a8 >f+4 d4< >g4. f+8 e4 c+4< >d2.< r4' },
    { role: 'brass', vol: 0.4, rev: 0.3, trans: -12, mml: 'o5 a8 a16 a16 >d8 <a8 >f+4 d4< >g4. f+8 e4 c+4< >d2.< r4' },
    { role: 'strings', vol: 0.5, rev: 0.4, mml: pad('D G:0.5 A:0.5 D', { center: 64 }) },
    { role: 'bass', vol: 0.7, mml: bass('D G:0.5 A:0.5 D', 'drive') },
    { role: 'drums', vol: 0.7, mml: '(kc)8 s16 s16 s8 s8 (ks)4 (ks)4 (ks)8 s8 (ks)8 s8 (ks)8 s16 s16 s8 s8 (kc)2 r2' },
  ],
};

export const gameover = {
  name: 'gameover',
  bpm: 80,
  once: true,
  tracks: [
    { role: 'piano', vol: 0.7, rev: 0.5, mml: 'o5 e4. d8 c4 <a4> f4 e4 d4 c4 <b2 g+2 a1>' },
    { role: 'strings', vol: 0.45, rev: 0.5, mml: pad('Am F E Am', { center: 60 }) },
    { role: 'bass', vol: 0.55, mml: bass('Am F E Am', 'root') },
  ],
};

// prologue: slow, ominous, 92 BPM
const P = 'Cm:2 Ab:2 Fm:2 G:2 Cm:2 Ab:2 Bb:2 G:2';
export const prologue = {
  name: 'prologue',
  bpm: 92,
  loop: 0,
  tracks: [
    { role: 'bell', vol: 0.35, rev: 0.6, del: 0.4, mml: 'o5 g2. e-4 c1 a-2. g4 e-1 f2. g4 a-2 g2 d1 o4 b1 o5 c2. e-4 g1 a-2. g4 e-1 f2. g4 d1 d2 o4 b2 g1 o5' },
    { role: 'choir', vol: 0.5, rev: 0.6, mml: pad(P, { center: 60 }) },
    { role: 'pad', vol: 0.4, rev: 0.6, mml: pad(P, { center: 50 }) },
    { role: 'bass', vol: 0.6, mml: bass(P, 'root', { oct: 1 }) },
    { role: 'drums', vol: 0.5, mml: rep('K4 r4 r2 r1', 8) },
  ],
};

// name entry / records: relaxed groove, 112 BPM
const N = 'Am7 Dm7 G Cmaj7 Fmaj7 Bm7b5 E7 E7';
const melN = 'o5 a4. g8 e4 c4 d4. e8 f4 a4 g4. f8 d4 <b4> >c2 e4 g4 a4. g8 f4 c4 d4. c8 <b4> d4 e4 g+4 b4 >d4 c4 <b4 g+4 e4';
export const records = {
  name: 'records',
  bpm: 112,
  loop: 0,
  tracks: [
    { role: 'lead2', vol: 0.45, rev: 0.3, del: 0.3, mml: `${melN} ${rest(8)}` },
    { role: 'bell', vol: 0.3, rev: 0.4, del: 0.3, mml: `${rest(8)} ${melN}` },
    { role: 'pad', vol: 0.45, rev: 0.5, mml: `${pad(N, { center: 62, notes: 4 })} ${pad(N, { center: 62, notes: 4, hits: 'half' })}` },
    { role: 'bass', vol: 0.7, mml: `${bass(N, 'walk')} ${bass(N, 'synco')}` },
    { role: 'arp', vol: 0.18, pan: 0.3, del: 0.4, mml: `${arp(N, 'up', { center: 76, step: 2 })} ${arp(N, 'updown', { center: 76 })}` },
    { role: 'drums', vol: 0.55, mml: `${rep(DR.shuffle, 7)} ${DR.fillA} ${rep(DR.ride, 7)} ${DR.fillB}` },
  ],
};

// ending / staff roll: F major, 96 BPM, A(8) B(8) C(8) A'(8)
const E = { A: 'F C Dm Bb F C Bb C', B: 'Dm Bb F C Dm Bb Gm C', C: 'Bb C Am Dm Bb C Dm C', A2: 'F C Dm Bb F C Bb:0.5 C:0.5 F' };
const eA = 'o5 a4. g8 f4 c4 e4. f8 g4 c4 f4. e8 d4 a4 b-2 a4 g4 a4. g8 f4 >c4< >d4. c8< g4 e4 f4 g4 a4 b-4 g2. r4';
const eA2 = 'o5 a4. g8 f4 c4 e4. f8 g4 c4 f4. e8 d4 a4 b-2 a4 g4 a4. g8 f4 >c4< >d4. c8< g4 e4 f4 g4 a4 b-4 f2. r4';
const eB = 'o5 a2 >d4 c4< b-2 a4 f4 f2 a4 >c4< >e2 d4 c4< d2 f4 a4 b-2. a4 g4 a4 b-4 >d4< >c1<';
const eC = 'o5 >d4. c8< b-4 f4 g4. a8 g4 e4 e4. f8 e4 c4 d2. a4 b-4. >c8 d4 f4< >e4. d8 c4 <g4 a4 b-4 >c4 d4< >e2 c2<';
export const ending = {
  name: 'ending',
  bpm: 96,
  loop: 0,
  tracks: [
    { role: 'piano', vol: 0.6, rev: 0.45, mml: `${eA} ${rest(8)} ${eC} ${rest(8)}` },
    { role: 'lead', vol: 0.5, rev: 0.4, del: 0.2, mml: `${rest(8)} ${eB} ${rest(8)} ${eA2}` },
    { role: 'strings', vol: 0.5, rev: 0.5, mml: `${pad(E.A, { center: 62 })} ${pad(E.B, { center: 64 })} ${pad(E.C, { center: 64 })} ${pad(E.A2, { center: 64 })}` },
    { role: 'bass', vol: 0.6, mml: `${bass(E.A, 'root')} ${bass(E.B, 'halves')} ${bass(E.C, 'walk')} ${bass(E.A2, 'drive')}` },
    { role: 'arp', vol: 0.18, pan: 0.3, del: 0.4, mml: `${arp(E.A, 'up', { center: 76, step: 2 })} ${arp(E.B, 'updown', { center: 76, step: 2 })} ${arp(E.C, 'updown', { center: 76 })} ${arp(E.A2, 'updown', { center: 79 })}` },
    { role: 'drums', vol: 0.55, mml: `${rep(DR.silent, 8)} ${rep(DR.half, 7)} ${DR.fillA} ${DR.crash} ${rep(DR.ride, 6)} ${DR.fillB} ${DR.beatC} ${rep(DR.beat, 6)} ${DR.fillC}` },
  ],
};
