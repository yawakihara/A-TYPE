/**
 * "Iron Leviathan" — Stage 3, the dreadnought. C minor, 138 BPM, military march.
 * Original composition. Form: intro(4) A(8) B(8) C(8), loops to A.
 */
import { bass, pad, arp, rest, rep, DR } from './gen.js';

const S = {
  intro: 'Cm:2 Ab:1 G:1',
  A: 'Cm Cm Ab Bb Cm Cm Ab G',
  B: 'Fm Fm Cm Cm Ab Bb Cm G',
  C: 'Ab Bb Cm Cm Ab Bb G G',
};

const melA = `o5
  c4 c8. c16 e-4 g4
  f4 e-8 d8 c2
  e-4 e-8. e-16 a-4 >c4<
  b-4 a-8 g8 f2
  c4 c8. c16 e-4 g4
  >c4 <b-8 a-8 g2
  a-4 g8 f8 e-4 c4
  d2. <b4>`;

const melB = `o5
  f2 a-4 >c4<
  >c4. <b-8 a-4 f4
  g2 >c4 e-4<
  >d2 c2<
  >c4 <b-4 a-4 e-4
  f4 g4 a-4 b-4
  >c2.< g4
  b2 >d2<`;

const melC = `o5 l8
  a-8 >c8 e-8 c8< a-8 >c8 e-4<
  b-8 >d8 f8 d8< b-8 >d8 f4<
  >c8 e-8 g8 e-8 c8 e-8 g4<
  >c4. <b-8 g4 e-4
  a-4. g8 f4 e-4
  f4. e-8 d4 <b-4>
  d4 g4 b4 >d4<
  f4 e-4 d4 <b4>`;

export default {
  name: 'stage3',
  bpm: 138,
  loop: 4,
  tracks: [
    { role: 'brass', vol: 0.6, rev: 0.3, mml: `${rest(4)} ${melA} ${rest(8)} ${melC}` },
    { role: 'lead', vol: 0.52, rev: 0.28, del: 0.12, mml: `${rest(4)} ${rest(8)} ${melB} ${melC}` },
    { role: 'brass', vol: 0.32, pan: -0.3, rev: 0.3, trans: -12, mml: `${rest(4)} ${melA} ${rest(8)} ${rest(8)}` },
    { role: 'bass', vol: 0.8, mml: `${bass(S.intro, 'march')} ${bass(S.A, 'march')} ${bass(S.B, 'drive')} ${bass(S.C, 'gallop')}` },
    { role: 'strings', vol: 0.5, pan: 0.25, rev: 0.45, mml: `${pad(S.intro, { center: 62 })} ${pad(S.A, { center: 62, hits: 'stab' })} ${pad(S.B, { center: 64 })} ${pad(S.C, { center: 64, hits: 'half' })}` },
    { role: 'arp', vol: 0.2, pan: 0.4, del: 0.3, mml: `${rest(4)} ${rest(8)} ${arp(S.B, 'up', { center: 72, step: 2 })} ${arp(S.C, 'updown', { center: 74 })}` },
    {
      role: 'drums',
      vol: 0.7,
      mml: `${rep(DR.march, 3)} ${DR.roll}
        ${DR.crash} ${rep(DR.march, 6)} ${DR.fillB}
        ${DR.beatC} ${rep(DR.beat, 6)} ${DR.fillA}
        ${DR.beatC} ${rep(DR.gallop, 6)} ${DR.fillC}`,
    },
  ],
};
