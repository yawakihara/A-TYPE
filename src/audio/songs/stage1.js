/**
 * "Derelict Gate" — Stage 1. D minor, 152 BPM. Original composition.
 * Form: intro(2) A(8) A'(8) B(8) C(8), loops to A.
 */
import { bass, pad, arp, rest, rep, DR } from './gen.js';

const S = {
  intro: 'Dm:2',
  A: 'Dm Bb F C Gm Bb C A',
  B: 'Bb C Dm Dm Bb C A A',
  C: 'Gm Am Bb C Gm Am Bb A',
};

const melA = `o5 l8
  d8 f8 a4 g8 a8 >c4<
  b-4. a8 g8 f8 d4
  f4. g8 a4 >c4<
  g4. f8 e8 f8 g4
  b-4. a8 g4 d4
  f4. e8 d8 e8 f4
  g8 a8 b-8 >c8 d4 e4<
  a2 ^8 g+8 a4`;

const melA2 = `o5 l8
  d8 f8 a4 g8 a8 >c4<
  >d4. c8 <b-8 a8 f4
  a4. b-8 >c4 <a4
  g4. e8 c8 d8 e4
  d4. g8 b-4 >d4<
  f4. g8 a8 b-8 >c4<
  >d8 e8 d8 c8< b-8 a8 g8 e8
  c+4 e4 a4 >c+4<`;

const melB = `o5
  d2 f4 d4
  e2. g4
  a2 f4 a4
  >d1<
  >d4 c4< b-4 a4
  g4 a4 b-4 >c4<
  a2 >c+4 e4<
  >e2.< r4`;

const melC = `o5 l8
  g8 b-8 >d8< b-8 g8 b-8 >d4<
  a8 >c8 e8 c8< a8 >c8 e4<
  b-8 >d8 f8 d8< b-8 >d8 f4<
  >c8 e8 g8 e8 c8 e8 g4<
  >d4. c8< b-4 g4
  >c4.< b8 a4 e4
  f4 g4 a4 b-4
  a2 g+4 e4`;

export default {
  name: 'stage1',
  bpm: 152,
  loop: 2,
  tracks: [
    { role: 'lead', vol: 0.62, rev: 0.22, del: 0.12, mml: `${rest(2)} ${melA} ${melA2} ${melB} ${melC}` },
    { role: 'lead2', vol: 0.32, pan: -0.25, rev: 0.25, trans: -12, mml: `${rest(2)} ${rest(8)} ${melA2} ${rest(8)} ${melC}` },
    { role: 'bass', vol: 0.8, mml: `${bass(S.intro, 'root')} ${bass(S.A, 'drive')} ${bass(S.A, 'drive')} ${bass(S.B, 'gallop')} ${bass(S.C, 'synco')}` },
    { role: 'pad', vol: 0.55, rev: 0.45, mml: `${pad(S.intro)} ${pad(S.A)} ${pad(S.A, { hits: 'half' })} ${pad(S.B)} ${pad(S.C, { hits: 'half' })}` },
    { role: 'arp', vol: 0.32, pan: 0.3, del: 0.3, mml: `${rest(2)} ${rest(8)} ${arp(S.A, 'updown', { center: 74 })} ${arp(S.B, 'up', { center: 72, step: 2 })} ${arp(S.C, 'broken', { center: 76 })}` },
    {
      role: 'drums',
      vol: 0.72,
      mml: `${DR.toms} ${DR.roll}
        ${DR.beatC} ${rep(DR.beat, 6)} ${DR.fillA}
        ${DR.beatC} ${rep(DR.beat, 6)} ${DR.fillB}
        ${DR.crash} ${rep(DR.half, 6)} ${DR.fillA}
        ${DR.beatC} ${rep(DR.dbl, 6)} ${DR.fillC}`,
    },
  ],
};
