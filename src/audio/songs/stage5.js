/**
 * "Serpent's Coil" — Stage 5, the living tunnel. B minor, 168 BPM, urgent.
 * Original composition. Form: intro(2) A(8) A'(8) B(8), loops to A.
 */
import { bass, pad, arp, rest, rep, DR } from './gen.js';

const S = {
  intro: 'Bm:2',
  A: 'Bm G A F#m Bm G A F#',
  B: 'Em F#m G A Em F#m G F#',
};

const melA = `o5 l8
  b8 f+8 d8 f+8 b8 >c+8 d4<
  >d8 c+8< b8 a8 b8 g8 d4
  a8 e8 c+8 e8 a8 b8 >c+4<
  >c+8< b8 a8 g+8 a8 f+8 c+4
  b8 f+8 d8 f+8 b8 >c+8 d8 e8<
  >f+4 e8 d8< b4 g4
  a8 b8 >c+8 d8 e8 f+8 e8 c+8<
  a+2 f+2`;

const melA2 = `o5 l8
  b8 f+8 d8 f+8 b8 >c+8 d4<
  >d8 c+8< b8 a8 b8 g8 d4
  a8 e8 c+8 e8 a8 b8 >c+4<
  >c+8< b8 a8 g+8 a8 f+8 c+4
  b8 f+8 d8 f+8 b8 >c+8 d8 e8<
  >f+4 e8 d8< b4 g4
  >e4 d4 c+4< a4
  f+2. r4`;

const melB = `o5
  g4. f+8 e4 b4
  a4. g+8 f+4 >c+4<
  b4. a8 g4 >d4<
  >c+2 e2<
  >e4. d8 <b4 g4
  a4. b8 >c+4 <a4
  g4 b4 >d4 c+4<
  a+2 >c+2<`;

export default {
  name: 'stage5',
  bpm: 168,
  loop: 2,
  tracks: [
    { role: 'lead', vol: 0.58, rev: 0.2, del: 0.12, mml: `${rest(2)} ${melA} ${melA2} ${melB}` },
    { role: 'lead2', vol: 0.3, pan: 0.3, rev: 0.2, trans: -12, mml: `${rest(2)} ${rest(8)} ${melA2} ${melB}` },
    { role: 'bass', vol: 0.8, mml: `${bass(S.intro, 'sixteen')} ${bass(S.A, 'gallop')} ${bass(S.A, 'gallop')} ${bass(S.B, 'drive')}` },
    { role: 'strings', vol: 0.45, pan: -0.25, rev: 0.4, mml: `${pad(S.intro, { center: 62 })} ${pad(S.A, { center: 62 })} ${pad(S.A, { center: 64, hits: 'half' })} ${pad(S.B, { center: 64 })}` },
    { role: 'arp', vol: 0.26, pan: 0.35, del: 0.25, mml: `${arp(S.intro, 'up', { center: 74 })} ${arp(S.A, 'updown', { center: 76 })} ${arp(S.A, 'broken', { center: 76 })} ${arp(S.B, 'updown', { center: 78 })}` },
    {
      role: 'drums',
      vol: 0.72,
      mml: `${DR.roll} ${DR.fillB}
        ${DR.beatC} ${rep(DR.gallop, 6)} ${DR.fillA}
        ${DR.beatC} ${rep(DR.gallop, 6)} ${DR.fillB}
        ${DR.beatC} ${rep(DR.dbl, 6)} ${DR.fillC}`,
    },
  ],
};
