/**
 * STAGE 6 — THE HEART
 * The core of the Bloom: valves that beat shut, cells that divide, a VALVE GUARDIAN, the
 * artery rush, and at the end the BLOOM MOTHER, which only AEGIS can wound.
 */
import { ITEM } from '../items.js';
import { timeline } from './util.js';

export function stage6() {
  const { ev, at, place, scroll } = timeline();
  const cells = (ys) => (w) => ys.forEach((y, i) => w.after(1 + i * 14, () => w.spawnR('cell', 14, y, { gen: 0 })));
  const leeches = (ys) => (w) => ys.forEach((y, i) => w.after(1 + i * 10, () => w.spawnR('leech', 12, y, { ph: i * 11 })));
  const valve = (x, phase) => place(x, (w) => w.spawn('valve', x, 0, { phase }), 60);

  // ---------------------------------------------------------------- into the heart
  at(60, cells([90, 140]));
  at(300, (w) => w.spawnR('carrier', 20, 112, { fly: true, drop: ITEM.CRYSTAL }));
  place(480, (w) => w.spawn('eyewall', 480, 0));
  place(620, (w) => w.spawn('tendril', 620, 0, { ceil: true }));
  at(560, leeches([100, 130]));
  at(700, (w) => w.spawnR('carrier', 20, 90, { fly: true, drop: ITEM.SPEED }));
  place(860, (w) => w.spawn('spawner', 860, 0));
  place(980, (w) => w.spawn('eyewall', 980, 0, { ceil: true }));
  at(1000, cells([70, 150, 110]));
  place(1180, (w) => w.spawn('tendril', 1180, 0));
  at(1250, (w) => w.spawnR('carrier', 20, 110, { fly: true, drop: ITEM.MISSILE }));

  // ---------------------------------------------------------------- the valves
  valve(1460, 0);
  valve(1660, 60);
  at(1500, leeches([112]));
  place(1760, (w) => w.spawn('eyewall', 1760, 0));
  valve(1860, 120);
  at(1880, cells([100]));
  valve(2060, 30);
  place(2160, (w) => w.spawn('tendril', 2160, 0, { ceil: true }));
  valve(2260, 90);
  at(2280, leeches([90, 130]));

  // ---------------------------------------------------------------- mid-boss: VALVE GUARDIAN
  at(2540, (w) => {
    w.setScroll(0);
    w.spawnR('valveguardian', 60, 112, { onDeath: () => w.setScroll(0.5) });
  });

  // ---------------------------------------------------------------- the artery rush
  scroll(3050, 0.75);
  at(3080, cells([80, 140]));
  place(3240, (w) => w.spawn('spawner', 3240, 0, { ceil: true }));
  at(3200, (w) => w.spawnR('carrier', 20, 112, { fly: true, drop: ITEM.BIT }));
  place(3380, (w) => w.spawn('eyewall', 3380, 0));
  at(3400, (w) => w.spawnR('jelly', 20, 100));
  place(3560, (w) => w.spawn('tendril', 3560, 0));
  at(3600, (w) => w.spawnR('carrier', 20, 80, { fly: true, drop: ITEM.CRYSTAL }));
  at(3640, leeches([70, 110, 150]));
  place(3800, (w) => w.spawn('eyewall', 3800, 0, { ceil: true }));
  place(3900, (w) => w.spawn('spawner', 3900, 0));
  at(3950, cells([60, 120, 170]));
  place(4140, (w) => w.spawn('tendril', 4140, 0, { ceil: true }));
  place(4260, (w) => w.spawn('eyewall', 4260, 0));
  at(4300, leeches([90, 130]));
  scroll(4500, 0.45);
  at(4600, (w) => w.spawnR('carrier', 20, 112, { fly: true, drop: ITEM.CRYSTAL }));
  at(4720, cells([80, 150]));

  // ---------------------------------------------------------------- the mother
  at(4980, (w) => w.startBoss('mother', { title: 'BLOOM MOTHER — THE HEART OF THE BLOOM', music: 'finalboss', warn: 230 }));

  return {
    index: 5,
    name: { en: 'THE HEART', ja: '心臓' },
    sub: 'CORE OF THE BLOOM — END OF THE LINE',
    music: 'stage6',
    bg: 'heart',
    scroll: 0.5,
    grade: { tint: [1.08, 0.95, 0.96], sat: 1.1, contrast: 1.08 },
    bloom: 0.85,
    terrain: {
      length: 5420,
      theme: 'core',
      roughC: { amp: 5, scale: 34 },
      roughF: { amp: 5, scale: 34 },
      pulse: [[3000, 4600, 7, 0.07, 150]],
      ceil: [[0, 20], [400, 36], [800, 24], [1100, 50], [1300, 40], [2400, 40], [2450, 12], [2950, 12], [3000, 40], [3300, 60], [3600, 30], [3900, 64], [4200, 36], [4500, 60], [4700, 30], [4900, 12], [5420, 12]],
      floor: [[0, 204], [400, 190], [800, 200], [1100, 176], [1300, 184], [2400, 184], [2450, 212], [2950, 212], [3000, 184], [3300, 164], [3600, 194], [3900, 160], [4200, 190], [4500, 164], [4700, 196], [4900, 212], [5420, 212]],
      blocks: [],
    },
    checkpoints: [0, 1300, 2500, 3050, 4800],
    events: ev,
  };
}
