/**
 * "Colossus" — boss battle. E minor, 168 BPM. Original composition.
 * Form: intro(2) A(8) B(8) C(8), loops to A.
 */
import { bass, pad, rest, rep, DR } from './gen.js';

const S = {
  intro: 'Em:2',
  A: 'Em Em C B Em Em C B',
  B: 'Am Am Em Em F F B B',
  C: 'C D Em Em C D B B',
};

const melA = `o5 l8
  e8 e8 g8 e8 a8 e8 b-8 a8
  g8 f+8 e8 d8 e4 <b4>
  e8 e8 g8 e8 >c8< b8 g8 e8
  f+4. d+8 <b4> f+4
  e8 e8 g8 e8 a8 e8 b-8 a8
  g8 a8 b8 >d8 e4 d4<
  >c8< b8 a8 g8 a8 g8 f+8 e8
  d+2 f+4 b4`;

const melB = `o5
  a2. >c4<
  b4 a4 e4 a4
  g2. b4
  a4 g4 e4 g4
  f2. a4
  >c4< a4 f4 a4
  b2. >d+4<
  f+2 d+4 <b4>`;

const melC = `o5 l8
  g8 >c8 e8 g8 e8 c8< g8 e8
  a8 >d8 f+8 a8 f+8 d8< a8 f+8
  b4. a8 g4 e4
  f+8 g8 a8 b8 >d4 e4<
  >e4. d8 c4< g4
  >d4. c8< b4 a4
  b2 >d+4 f+4<
  b2 a+4 f+4`;

const stab = (prog) => pad(prog, { hits: 'stab', center: 60 });

export default {
  name: 'boss',
  bpm: 168,
  loop: 2,
  tracks: [
    { role: 'lead', vol: 0.6, rev: 0.2, del: 0.1, mml: `${rest(2)} ${melA} ${melB} ${melC}` },
    { role: 'brass', vol: 0.42, pan: 0.2, rev: 0.3, trans: -12, mml: `${rest(2)} ${rest(8)} ${melB} ${rest(8)}` },
    { role: 'bass', vol: 0.82, mml: `${bass(S.intro, 'sixteen')} ${bass(S.A, 'sixteen')} ${bass(S.B, 'heavy')} ${bass(S.C, 'drive')}` },
    { role: 'strings', vol: 0.5, pan: -0.2, rev: 0.4, mml: `${pad(S.intro, { center: 60 })} ${stab(S.A)} ${pad(S.B, { center: 62 })} ${stab(S.C)}` },
    { role: 'pad', vol: 0.4, rev: 0.5, mml: `${rest(2)} ${pad(S.A, { center: 55 })} ${pad(S.B, { center: 55 })} ${pad(S.C, { center: 55 })}` },
    {
      role: 'drums',
      vol: 0.75,
      mml: `${DR.roll} ${DR.fillB}
        ${DR.beatC} ${rep(DR.dbl, 6)} ${DR.fillA}
        ${DR.crash} ${rep(DR.halfB, 6)} ${DR.fillB}
        ${DR.beatC} ${rep(DR.beat, 6)} ${DR.fillC}`,
    },
  ],
};
