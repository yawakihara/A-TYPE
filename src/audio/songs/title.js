/**
 * "AEGIS LANCE — Main Theme". G minor, 128 BPM, heroic. Original composition.
 * Form: intro(4) A(8) B(8), loops to A.
 */
import { bass, pad, arp, rest, rep, DR } from './gen.js';

const S = {
  intro: 'Gm:2 Eb:2',
  A: 'Gm Eb Bb F Gm Eb Cm D',
  B: 'Eb F Gm Gm Eb F D D',
};

const melA = `o5
  d2 g4. a8
  b-2 g4 e-4
  f2 b-4. >c8<
  >d2. c4<
  b-4. a8 g4 d4
  e-4. f8 g4 b-4
  >c4. d8 e-4 c4<
  d2 f+2`;

const melB = `o5
  g2 b-4 >e-4<
  >d2 c4 <a4
  b-2. a4
  g1
  >e-4. d8 c4 <b-4
  >c4. <b-8 a4 f4
  f+2 a2
  >d1<`;

export default {
  name: 'title',
  bpm: 128,
  loop: 4,
  tracks: [
    { role: 'lead', vol: 0.6, rev: 0.32, del: 0.18, mml: `${rest(4)} ${melA} ${melB}` },
    { role: 'brass', vol: 0.4, pan: -0.2, rev: 0.35, trans: -12, mml: `${rest(4)} ${rest(8)} ${melB}` },
    { role: 'strings', vol: 0.5, pan: 0.2, rev: 0.5, mml: `${pad(S.intro, { center: 62 })} ${pad(S.A, { center: 62 })} ${pad(S.B, { center: 64, hits: 'half' })}` },
    { role: 'pad', vol: 0.4, rev: 0.6, mml: `${pad(S.intro, { center: 55 })} ${pad(S.A, { center: 55 })} ${pad(S.B, { center: 55 })}` },
    { role: 'bass', vol: 0.75, mml: `${bass(S.intro, 'halves')} ${bass(S.A, 'drive')} ${bass(S.B, 'gallop')}` },
    { role: 'arp', vol: 0.22, pan: 0.35, del: 0.35, mml: `${arp(S.intro, 'up', { center: 74, step: 2 })} ${arp(S.A, 'updown', { center: 76 })} ${arp(S.B, 'updown', { center: 76 })}` },
    {
      role: 'drums',
      vol: 0.7,
      mml: `${DR.silent} ${DR.toms} ${DR.toms} ${DR.roll}
        ${DR.beatC} ${rep(DR.beat, 6)} ${DR.fillA}
        ${DR.beatC} ${rep(DR.gallop, 6)} ${DR.fillC}`,
    },
  ],
};
