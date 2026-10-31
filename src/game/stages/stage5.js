/**
 * STAGE 5 — SERPENT'S COIL
 * A tunnel of bone and sinew that breathes: walls contract in peristaltic waves, spikes thrust
 * from the ribs, and somewhere ahead the great serpent waits — first its tail, then the COIL WYRM.
 */
import { ITEM } from '../items.js';
import { timeline } from './util.js';

export function stage5() {
  const { ev, at, place } = timeline();
  const leeches = (ys) => (w) => ys.forEach((y, i) => w.after(1 + i * 10, () => w.spawnR('leech', 12, y, { ph: i * 13 })));
  const cysts = (x, ys) => place(x, (w) => ys.forEach((y, i) => w.spawn('cyst', x + i * 26, y)));
  const spike = (x, ceil, phase = 0) => place(x, (w) => w.spawn('spike', x, 0, { ceil, phase }), 50);

  // ---------------------------------------------------------------- the gullet
  at(60, leeches([80, 120, 150, 100]));
  cysts(560, [100, 130]);
  at(300, (w) => w.spawnR('carrier', 20, 110, { fly: true, drop: ITEM.CRYSTAL }));
  place(620, (w) => w.spawn('spitter', 620, 0));
  place(760, (w) => w.spawn('spitter', 760, 0, { ceil: true }));
  at(800, (w) => w.spawnR('wyrmling', 20, 110));
  at(1000, leeches([70, 110, 150]));
  at(1100, (w) => w.spawnR('carrier', 20, 100, { fly: true, drop: ITEM.SPEED }));

  // ---------------------------------------------------------------- the breathing throat
  spike(1350, false, 0);
  spike(1470, true, 40);
  spike(1590, false, 80);
  spike(1710, true, 120);
  at(1300, leeches([110, 90]));
  cysts(1820, [96, 128]);
  place(1900, (w) => w.spawn('spitter', 1900, 0));
  at(1850, (w) => w.spawnR('wyrmling', 20, 90));
  at(1950, (w) => w.spawnR('carrier', 20, 110, { fly: true, drop: ITEM.MISSILE }));
  place(2100, (w) => w.spawn('spitter', 2100, 0, { ceil: true }));
  spike(2220, false, 30);
  spike(2300, true, 90);
  at(2200, leeches([80, 140, 110]));

  // ---------------------------------------------------------------- mid-boss: WYRM TAIL
  at(2560, (w) => {
    w.setScroll(0);
    w.spawnR('wyrmtail', 40, 112, { onDeath: () => w.setScroll(0.5) });
  });

  // ---------------------------------------------------------------- spiral descent
  at(3100, leeches([90, 130]));
  place(3200, (w) => w.spawn('spitter', 3200, 0));
  spike(3320, true, 0);
  cysts(3420, [100]);
  at(3350, (w) => w.spawnR('wyrmling', 20, 120));
  place(3520, (w) => w.spawn('spitter', 3520, 0, { ceil: true }));
  at(3600, (w) => w.spawnR('carrier', 20, 110, { fly: true, drop: ITEM.BIT }));
  spike(3680, false, 60);
  spike(3800, true, 100);
  at(3760, leeches([80, 120, 160]));
  cysts(3920, [110, 140]);
  at(3950, (w) => w.spawnR('wyrmling', 20, 80));
  place(4100, (w) => w.spawn('spitter', 4100, 0));
  place(4180, (w) => w.spawn('carrier', 4180, 0, { drop: ITEM.CRYSTAL }));
  spike(4300, true, 20);
  spike(4420, false, 70);
  at(4380, leeches([100, 120]));
  place(4560, (w) => w.spawn('spitter', 4560, 0, { ceil: true }));
  at(4720, leeches([60, 110, 160, 90, 140]));

  // ---------------------------------------------------------------- boss
  at(4960, (w) => w.startBoss('wyrm', { title: 'COIL WYRM', music: 'boss' }));

  return {
    index: 4,
    name: { en: "SERPENT'S COIL", ja: '大蛇の螺旋' },
    sub: 'THE BLOOM GROWS A SPINE — LIVING TUNNEL',
    music: 'stage5',
    bg: 'gut',
    scroll: 0.5,
    grade: { tint: [1.06, 0.97, 0.94], sat: 1.08, contrast: 1.06 },
    bloom: 0.8,
    terrain: {
      length: 5400,
      theme: 'bone',
      roughC: { amp: 6, scale: 30 },
      roughF: { amp: 6, scale: 30 },
      pulse: [[1200, 2400, 9, 0.05, 160], [3050, 4600, 8, 0.06, 140]],
      ceil: [[0, 30], [300, 40], [600, 30], [900, 50], [1200, 44], [1500, 60], [1800, 50], [2100, 64], [2400, 40], [2450, 14], [3000, 14], [3050, 40], [3300, 70], [3600, 40], [3900, 74], [4200, 44], [4500, 70], [4700, 36], [4900, 14], [5400, 14]],
      floor: [[0, 194], [300, 184], [600, 196], [900, 176], [1200, 186], [1500, 166], [1800, 180], [2100, 160], [2400, 184], [2450, 212], [3000, 212], [3050, 186], [3300, 160], [3600, 190], [3900, 154], [4200, 186], [4500, 160], [4700, 196], [4900, 212], [5400, 212]],
      blocks: [],
    },
    checkpoints: [0, 1200, 2500, 3100, 4700],
    events: ev,
  };
}
