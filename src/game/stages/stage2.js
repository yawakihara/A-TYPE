/**
 * STAGE 2 — VERDANT ABYSS
 * The Bloom's hive caverns: a winding throat of living tissue, membrane walls that must be
 * cut open, a vaulted chamber (MANTIS), a descending zig-zag, and the BROODMOTHER's nest.
 */
import { ITEM } from '../items.js';
import { timeline } from './util.js';

export function stage2() {
  const { ev, at, place } = timeline();
  const jellies = (ys) => (w) => ys.forEach((y, i) => w.spawnR('jelly', 16 + i * 26, y, { ph: i * 1.3 }));
  const larvae = (y, n = 6) => (w) => {
    for (let i = 0; i < n; i++) w.after(1 + i * 7, () => w.spawnR('larva', 10, y + ((i % 3) - 1) * 10, { sp: 1.5 }));
  };
  const eel = (wx, ceil, span = 170) => at(wx - 300, (w) => w.spawn('eel', wx, 0, { ceil, span }));

  // ---------------------------------------------------------------- the throat
  at(60, jellies([70, 140, 104]));
  at(200, larvae(110));
  at(300, (w) => w.spawnR('carrier', 20, 112, { fly: true, drop: ITEM.CRYSTAL }));
  place(520, (w) => w.spawn('polyp', 520, 0));
  place(660, (w) => w.spawn('polyp', 660, 0, { ceil: true }));
  at(600, jellies([90, 130]));
  place(820, (w) => w.spawn('polyp', 820, 0));
  eel(1080, false);
  at(980, larvae(80, 5));
  place(1220, (w) => w.spawn('carrier', 1220, 0, { drop: ITEM.SPEED }));
  at(1300, jellies([60, 100, 140, 120]));
  place(1450, (w) => w.spawn('sporepod', 1450, 0, { ceil: true }));
  place(1520, (w) => w.spawn('polyp', 1520, 0));
  at(1500, larvae(140, 6));
  at(1650, (w) => w.spawnR('carrier', 20, 100, { fly: true, drop: ITEM.MISSILE }));

  // ---------------------------------------------------------------- membrane narrows
  place(1880, (w) => w.spawn('polyp', 1880, 0, { ceil: true, n: 3 }));
  place(1960, (w) => w.spawn('polyp', 1960, 0, { n: 3 }));
  at(1900, larvae(110, 5));
  place(2200, (w) => w.spawn('polyp', 2200, 0, { ceil: true, n: 3 }));
  place(2380, (w) => w.spawn('sporepod', 2380, 0));
  at(2250, jellies([100, 120]));

  // ---------------------------------------------------------------- the vault
  at(2700, jellies([40, 90, 140, 190]));
  eel(3000, false, 200);
  eel(3080, true, 200);
  at(2900, (w) => w.spawnR('carrier', 20, 60, { fly: true, drop: ITEM.CRYSTAL }));
  at(3120, larvae(60, 6));
  at(3160, larvae(170, 6));
  eel(3300, false, 220);

  // ---------------------------------------------------------------- mid-boss: MANTIS
  at(3420, (w) => {
    w.setScroll(0);
    w.spawnR('mantis', 40, 0, { onDeath: () => w.setScroll(0.5) });
  });

  // ---------------------------------------------------------------- descending zig-zag
  at(3820, jellies([110, 80]));
  place(3980, (w) => w.spawn('polyp', 3980, 0));
  eel(4150, true, 160);
  place(4260, (w) => w.spawn('polyp', 4260, 0, { ceil: true }));
  at(4200, larvae(120, 6));
  place(4420, (w) => w.spawn('sporepod', 4420, 0));
  at(4500, (w) => w.spawnR('carrier', 20, 112, { fly: true, drop: ITEM.BIT }));
  place(4640, (w) => w.spawn('polyp', 4640, 0));
  eel(4800, false, 180);
  at(4760, jellies([70, 120, 160]));
  place(5000, (w) => w.spawn('carrier', 5000, 0, { drop: ITEM.CRYSTAL }));
  at(5100, larvae(100, 8));
  place(5180, (w) => w.spawn('polyp', 5180, 0, { ceil: true }));

  // ---------------------------------------------------------------- boss
  at(5660, (w) => w.startBoss('brood', { title: 'BROODMOTHER', music: 'boss' }));

  return {
    index: 1,
    name: { en: 'VERDANT ABYSS', ja: '翠の深淵' },
    sub: 'HIVE CAVERNS — THE BLOOM BREATHES HERE',
    music: 'stage2',
    bg: 'cave',
    scroll: 0.5,
    grade: { tint: [1.04, 0.97, 1.04], sat: 1.12, contrast: 1.06 },
    bloom: 0.75,
    terrain: {
      length: 6300,
      theme: 'flesh',
      roughC: { amp: 7, scale: 40 },
      roughF: { amp: 7, scale: 40 },
      ceil: [[0, 18], [400, 26], [700, 50], [1000, 30], [1300, 64], [1600, 40], [1800, 58], [2000, 70], [2600, 70], [2650, 12], [3350, 12], [3400, 22], [3700, 22], [3750, 40], [4000, 70], [4300, 30], [4600, 80], [4900, 40], [5200, 60], [5300, 14], [6300, 14]],
      floor: [[0, 206], [400, 196], [700, 176], [1000, 200], [1300, 170], [1600, 194], [1800, 160], [2000, 156], [2600, 156], [2650, 212], [3350, 212], [3400, 198], [3700, 198], [3750, 186], [4000, 150], [4300, 190], [4600, 150], [4900, 196], [5200, 166], [5300, 210], [6300, 210]],
      blocks: [
        [2080, 66, 18, 48, 14, 'membrane'],
        [2290, 108, 18, 52, 14, 'membrane'],
        [2470, 64, 18, 96, 30, 'membrane'],
      ],
    },
    checkpoints: [0, 1300, 2700, 3800, 5300],
    events: ev,
  };
}
