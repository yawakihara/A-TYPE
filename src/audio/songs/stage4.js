/**
 * "Foundry" — Stage 4, the converted factory. F# minor, 126 BPM, industrial funk.
 * Original composition. Form: intro(2) A(8) A(8) B(8), loops to the first A.
 */
import { bass, pad, arp, rest, rep, DR } from './gen.js';

const S = {
  intro: 'F#m:2',
  A: 'F#m:2 E:2 D:2 C#7:2',
  B: 'Bm E A F#m Bm E C#7 C#7',
};

const melA = `o5 l8
  f+8 r8 a8 f+8 r8 c+8 e8 f+8
  a8 b8 a8 f+8 e8 c+8 e4
  e8 r8 g+8 e8 r8 b8 >d8 e8<
  o5 d8 c+8 o4 b8 o5 c+8 o4 b8 g+8 e4 o5
  a8 r8 >d8 <a8 r8 f+8 a8 >d8<
  >c+8 d8 c+8< a8 f+8 a8 d4
  g+8 r8 >c+8 <g+8 r8 e+8 g+8 b8
  >c+4 <b4 g+4 e+4`;

const melB = `o5
  d2 f+4 b4
  g+2. e4
  a2 >c+4 e4<
  >c+2.< a4
  b4 a4 f+4 d4
  e4 f+4 g+4 b4
  g+2 b2
  >c+1<`;

const groove = '(kh)8 x16 h16 (kph)8 h8 (kh)8 x16 k16 (kph)8 o8';

export default {
  name: 'stage4',
  bpm: 126,
  loop: 2,
  tracks: [
    { role: 'lead2', vol: 0.5, pan: -0.15, del: 0.2, rev: 0.2, mml: `${rest(2)} ${melA} ${rest(8)} ${rest(8)}` },
    { role: 'lead', vol: 0.5, rev: 0.25, del: 0.15, mml: `${rest(2)} ${rest(8)} ${melA} ${melB}` },
    { role: 'bass', vol: 0.8, mml: `${bass(S.intro, 'sixteen')} ${bass(S.A, 'synco')} ${bass(S.A, 'sixteen')} ${bass(S.B, 'synco')}` },
    { role: 'brass', vol: 0.35, pan: 0.25, rev: 0.25, mml: `${rest(2)} ${pad(S.A, { hits: 'stab', center: 62 })} ${pad(S.A, { hits: 'stab', center: 62 })} ${pad(S.B, { center: 64 })}` },
    { role: 'arp', vol: 0.24, pan: 0.35, del: 0.35, mml: `${arp(S.intro, 'pedal', { center: 66 })} ${rest(8)} ${arp(S.A, 'pedal', { center: 66 })} ${arp(S.B, 'up', { center: 70 })}` },
    {
      role: 'drums',
      vol: 0.72,
      mml: `${groove} ${DR.fillB}
        ${rep(groove, 7)} ${DR.fillA}
        ${DR.fourS} ${rep(groove, 6)} ${DR.fillB}
        ${DR.beatC} ${rep(DR.fourS, 6)} ${DR.fillC}`,
    },
  ],
};
