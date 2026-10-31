/**
 * STAGE 4 — FOUNDRY
 * A Bloom-converted forge: the crusher gauntlet, a block maze you must cut through,
 * the ASSEMBLER, the molten assembly hall, and the press called ANVIL.
 */
import { ITEM } from '../items.js';
import { timeline } from './util.js';

export function stage4() {
  const { ev, at, place } = timeline();
  const welders = (ys) => (w) => ys.forEach((y, i) => w.after(1 + i * 12, () => w.spawnR('welder', 12, y)));
  const crusher = (x, phase, floor = false, period = 140) => place(x, (w) => w.spawn('crusher', x, 0, { phase, floor, period }), 60);

  // ---------------------------------------------------------------- loading bay
  at(60, welders([70, 120, 160]));
  place(260, (w) => w.spawn('tank', 260, 0));
  place(340, (w) => w.spawn('tank', 340, 0, { ceil: true }));
  at(300, (w) => w.spawnR('carrier', 20, 110, { fly: true, drop: ITEM.CRYSTAL }));
  place(600, (w) => w.spawn('railgun', 600, 0, { ceil: true }));
  place(760, (w) => w.spawn('railgun', 760, 0));
  at(620, welders([90, 140]));

  // ---------------------------------------------------------------- crusher gauntlet
  crusher(900, 0);
  crusher(1060, 50);
  crusher(1220, 100);
  at(980, welders([110]));
  crusher(1380, 20);
  crusher(1540, 70);
  at(1300, (w) => w.spawnR('carrier', 20, 100, { fly: true, drop: ITEM.SPEED }));
  crusher(1700, 120);
  place(1640, (w) => w.spawn('tank', 1640, 0));
  at(1600, welders([60, 100, 150]));

  // ---------------------------------------------------------------- block maze
  place(2050, (w) => w.spawn('vent', 2050, 0, { ceil: true, len: 60 }));
  place(2160, (w) => w.spawn('railgun', 2160, 0));
  place(2300, (w) => w.spawn('vent', 2300, 0, { ceil: true, len: 60 }));
  at(2000, (w) => w.spawnR('carrier', 20, 112, { fly: true, drop: ITEM.MISSILE }));
  at(2150, welders([90, 130]));
  place(2470, (w) => w.spawn('tank', 2470, 0, { ceil: true }));

  // ---------------------------------------------------------------- mid-boss: ASSEMBLER
  at(2620, (w) => {
    w.setScroll(0);
    w.spawnR('assembler', 60, 112, { onDeath: () => w.setScroll(0.5) });
  });

  // ---------------------------------------------------------------- molten assembly hall
  at(3060, welders([70, 150]));
  place(3150, (w) => w.spawn('tank', 3150, 0));
  place(3230, (w) => w.spawn('tank', 3230, 0));
  place(3300, (w) => w.spawn('vent', 3300, 0, { len: 56 }));
  crusher(3520, 0, true, 120);
  crusher(3660, 60, true, 120);
  place(3600, (w) => w.spawn('railgun', 3600, 0, { ceil: true }));
  at(3500, (w) => w.spawnR('carrier', 20, 100, { fly: true, drop: ITEM.BIT }));
  place(3900, (w) => w.spawn('tank', 3900, 0, { ceil: true }));
  place(3960, (w) => w.spawn('vent', 3960, 0, { len: 56 }));
  at(3880, welders([80, 120, 160]));
  place(4100, (w) => w.spawn('railgun', 4100, 0));
  place(4180, (w) => w.spawn('carrier', 4180, 0, { drop: ITEM.CRYSTAL }));
  crusher(4450, 0, true, 110);
  crusher(4560, 40, false, 110);
  crusher(4670, 80, true, 110);
  at(4500, welders([100]));
  place(4760, (w) => w.spawn('tank', 4760, 0));
  at(4900, welders([70, 112, 154]));
  place(5050, (w) => w.spawn('vent', 5050, 0, { ceil: true, len: 70 }));
  place(5120, (w) => w.spawn('railgun', 5120, 0));

  // ---------------------------------------------------------------- boss
  at(5300, (w) => w.startBoss('anvil', { title: 'ANVIL', music: 'boss' }));

  return {
    index: 3,
    name: { en: 'FOUNDRY', ja: '鋳造炉' },
    sub: 'ORBITAL SMELTER K-9 — CONVERTED TO A BLOOM WEAPONWORKS',
    music: 'stage4',
    bg: 'foundry',
    scroll: 0.5,
    grade: { tint: [1.06, 0.98, 0.92], sat: 1.05, contrast: 1.08 },
    terrain: {
      length: 5700,
      theme: 'foundry',
      ceil: [[0, 24], [300, 24], [320, 40], [700, 40], [720, 30], [1000, 30], [1020, 20], [1500, 20], [1520, 36], [1900, 36], [1920, 48], [2500, 48], [2520, 20], [3000, 20], [3020, 34], [3400, 34], [3420, 52], [3800, 52], [3820, 40], [4300, 40], [4320, 30], [4800, 30], [4820, 24], [5200, 24], [5240, 16], [5700, 16]],
      floor: [[0, 200], [300, 200], [320, 186], [700, 186], [720, 196], [1000, 196], [1020, 180], [1500, 180], [1520, 192], [1900, 192], [1920, 176], [2500, 176], [2520, 200], [3000, 200], [3020, 190], [3400, 190], [3420, 170], [3800, 170], [3820, 186], [4300, 186], [4320, 176], [4800, 176], [4820, 196], [5200, 196], [5240, 208], [5700, 208]],
      blocks: [
        [1980, 48, 22, 66, 16, 'crate'],
        [2100, 112, 22, 64, 16, 'crate'],
        [2220, 48, 22, 128, 36, 'crate'],
        [2340, 84, 22, 56, 18, 'crate'],
        [2420, 48, 18, 42],
        [2420, 134, 18, 42],
        [3420, 120, 30, 10],
        [4020, 96, 24, 12],
      ],
    },
    checkpoints: [0, 1300, 2600, 3200, 4900],
    events: ev,
  };
}
