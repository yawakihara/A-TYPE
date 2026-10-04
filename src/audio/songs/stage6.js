/**
 * "The Heart" — Stage 6, the core of the Bloom. C# minor, 104 BPM, choir and heartbeat.
 * Original composition. Form: intro(4) A(8) B(8) C(8), loops to A.
 */
import { bass, pad, arp, rest, rep, DR } from './gen.js';

const S = {
  intro: 'C#m:4',
  A: 'C#m C#m A A F#m F#m G# G#',
  B: 'A B C#m C#m A B G# G#',
  C: 'F#m G#7 C#m C#m F#m G#7 A G#',
};

const melA = `o5
  g+2. e4
  d+4 e4 c+2
  a2. g+4
  e2 c+2
  f+2. a4
  g+4 a4 b4 >c+4<
  d+2. b+4
  g+1`;

const melB = `o5
  e4 a4 >c+4 e4<
  >d+4. c+8 <b4 f+4
  g+2 e4 g+4
  >c+1<
  >c+4. <b8 a4 e4
  f+4 g+4 a4 b4
  >c2 d+2<
  g+2. r4`;

const melC = `o5
  a4. g+8 f+4 >c+4<
  >c4. <a+8 g+4 f+4
  e4 g+4 >c+4 e4<
  >d+4 e4 c+2<
  >c+4. <b8 a4 f+4
  g+4 a+4 b+4 >d+4<
  >e2 c+2<
  b+2 g+2`;

export default {
  name: 'stage6',
  bpm: 104,
  loop: 4,
  tracks: [
    { role: 'lead', vol: 0.5, rev: 0.4, del: 0.2, mml: `${rest(4)} ${melA} ${melB} ${melC}` },
    { role: 'choir', vol: 0.55, rev: 0.6, mml: `${pad(S.intro, { center: 60 })} ${pad(S.A, { center: 60 })} ${pad(S.B, { center: 62 })} ${pad(S.C, { center: 62 })}` },
    { role: 'organ', vol: 0.35, pan: 0.2, rev: 0.4, mml: `${rest(4)} ${rest(8)} ${pad(S.B, { center: 55, hits: 'half' })} ${pad(S.C, { center: 55, hits: 'half' })}` },
    { role: 'bass', vol: 0.8, mml: `${bass(S.intro, 'root')} ${bass(S.A, 'halves')} ${bass(S.B, 'heavy')} ${bass(S.C, 'drive')}` },
    { role: 'bell', vol: 0.22, pan: -0.35, del: 0.4, rev: 0.5, mml: `${arp(S.intro, 'updown', { center: 76, step: 2 })} ${arp(S.A, 'updown', { center: 76, step: 2 })} ${rest(8)} ${arp(S.C, 'up', { center: 79, step: 2 })}` },
    {
      role: 'drums',
      vol: 0.7,
      mml: `${rep(DR.heart, 2)} ${rep(DR.heart2, 2)}
        ${rep(DR.heart2, 3)} ${DR.tribal} ${rep(DR.tribal, 3)} ${DR.fillA}
        ${DR.crash} ${rep(DR.halfB, 6)} ${DR.fillB}
        ${DR.beatC} ${rep(DR.beat, 6)} ${DR.fillC}`,
    },
  ],
};
