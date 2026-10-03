/**
 * "Verdant Abyss" — Stage 2, the hive caverns. E phrygian / minor, 108 BPM, shuffle groove.
 * Original composition. Form: intro(4) A(8) B(8) A'(8), loops to A.
 */
import { bass, pad, arp, rest, rep, DR } from './gen.js';

const S = {
  intro: 'Em:2 F:2',
  A: 'Em F Em F Am G F E',
  B: 'Cmaj7 Bm7 Am7 G6 Cmaj7 Bm7 Am7 B7',
};

const melA = `o4 l8
  r4 e4 b4. a8
  g4 f4 e2
  r4 e4 b4. >c8<
  b4 a4 f2
  a4. b8 >c4 e4<
  >d4. c8< b4 g4
  a4 f4 >c4< a4
  g+2. r4`;

const melB = `o5
  e2 g4 b4
  a2. f+4
  g2 e4 c4
  d1
  e2 g4 >c4<
  b2. a4
  g4 a4 b4 >c4<
  d+2 f+2`;

export default {
  name: 'stage2',
  bpm: 108,
  loop: 4,
  tracks: [
    { role: 'lead2', vol: 0.55, rev: 0.35, del: 0.35, mml: `${rest(4)} ${melA} ${rest(8)} ${melA}` },
    { role: 'lead', vol: 0.42, rev: 0.4, del: 0.25, mml: `${rest(4)} ${rest(8)} ${melB} ${rest(8)}` },
    { role: 'bell', vol: 0.3, pan: 0.35, rev: 0.4, del: 0.3, trans: 12, mml: `${rest(4)} ${rest(8)} ${rest(8)} ${melA}` },
    { role: 'bass', vol: 0.75, mml: `${bass(S.intro, 'root')} ${bass(S.A, 'synco')} ${bass(S.B, 'walk')} ${bass(S.A, 'synco')}` },
    { role: 'pad', vol: 0.55, rev: 0.55, mml: `${pad(S.intro, { center: 60 })} ${pad(S.A, { center: 60 })} ${pad(S.B, { center: 62, notes: 4 })} ${pad(S.A, { center: 60, hits: 'half' })}` },
    { role: 'arp', vol: 0.22, pan: -0.35, del: 0.4, rev: 0.3, mml: `${arp(S.intro, 'updown', { center: 76, step: 1 })} ${arp(S.A, 'updown', { center: 76 })} ${arp(S.B, 'up', { center: 79, step: 2 })} ${arp(S.A, 'broken', { center: 76 })}` },
    {
      role: 'drums',
      vol: 0.6,
      mml: `${DR.silent} ${DR.silent} ${DR.sparse} ${DR.fillA}
        ${rep(DR.shuffle, 7)} ${DR.fillB}
        ${DR.crash} ${rep(DR.ride, 6)} ${DR.fillA}
        ${rep(DR.shuffle, 7)} ${DR.fillC}`,
    },
  ],
};
