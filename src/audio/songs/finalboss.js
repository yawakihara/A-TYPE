/**
 * "Mother of the Bloom" — final battle. D minor/phrygian, 150 BPM, organ + choir + drive.
 * Original composition. Form: intro(2) A(8) B(8) C(8), loops to A.
 */
import { bass, pad, rest, rep, DR } from './gen.js';

const S = {
  intro: 'Dm:2',
  A: 'Dm Eb Dm Eb Dm Eb Dm Eb',
  B: 'Gm Gm Dm Dm Bb C Dm Dm',
  C: 'Bb C Am Dm Bb C A A',
};

const melA = `o5 l8
  d8 f8 a8 d8 f8 a8 >d4<
  e-8 g8 b-8 e-8 g8 b-8 >e-4<
  >d4. c8< a4 f4
  g4. f8 e-4 <b-4>
  d8 f8 a8 d8 f8 a8 >d4<
  e-8 g8 b-8 e-8 g8 b-8 >e-4<
  >f4. e-8 d4< a4
  b-2 a2`;

const melB = `o5
  g2 b-4 >d4<
  >d4. c8 <b-4 g4
  a2 f4 d4
  a2. r4
  b-2 >d4 f4<
  e2 g2
  f4 e4 d4 c+4
  d1`;

const melC = `o5
  >d4 f4 d4 <b-4
  >e4 g4 e4 c4<
  >c4 e4 <a4 >c4<
  >d2. f4<
  >f4. e8 d4 <b-4
  >e4. d8 c4 <g4
  a4 >c+4 e4< a4
  >c+2 e2<`;

export default {
  name: 'finalboss',
  bpm: 150,
  loop: 2,
  tracks: [
    { role: 'organ', vol: 0.5, rev: 0.35, mml: `${rest(2)} ${melA} ${rest(8)} ${melC}` },
    { role: 'lead', vol: 0.55, rev: 0.25, del: 0.12, mml: `${rest(2)} ${rest(8)} ${melB} ${melC}` },
    { role: 'choir', vol: 0.55, rev: 0.6, mml: `${pad(S.intro, { center: 57 })} ${pad(S.A, { center: 57 })} ${pad(S.B, { center: 60 })} ${pad(S.C, { center: 60 })}` },
    { role: 'bass', vol: 0.82, mml: `${bass(S.intro, 'sixteen')} ${bass(S.A, 'sixteen')} ${bass(S.B, 'drive')} ${bass(S.C, 'gallop')}` },
    { role: 'brass', vol: 0.38, pan: 0.25, rev: 0.3, mml: `${rest(2)} ${pad(S.A, { hits: 'stab', center: 62 })} ${pad(S.B, { hits: 'half', center: 62 })} ${pad(S.C, { hits: 'stab', center: 64 })}` },
    {
      role: 'drums',
      vol: 0.75,
      mml: `${DR.toms} ${DR.roll}
        ${DR.beatC} ${rep(DR.dbl, 6)} ${DR.fillB}
        ${DR.crash} ${rep(DR.beatB, 6)} ${DR.fillA}
        ${DR.beatC} ${rep(DR.dbl, 6)} ${DR.fillC}`,
    },
  ],
};
