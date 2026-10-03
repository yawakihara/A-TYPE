/**
 * STAGE 1 — DERELICT GATE
 * Approach to an orbital relay overgrown by the Bloom: open space → hull → service trench
 * (SENTINEL) → pillared hangar → gate funnel → IRIS WARDEN.
 */
import { ITEM } from '../items.js';
import { timeline } from './util.js';

export function stage1() {
  const { ev, at, place, wave } = timeline();
  const mites = (y, dir, path = 'loop', n = 5) => (w) => {
    for (let i = 0; i < n; i++) w.after(1 + i * 9, () => w.spawnR('mite', 12, y, { path, dir }));
  };

  // ---------------------------------------------------------------- open space
  at(60, (w) => wave(w, 'wisp', 5, 64, { gap: 20, amp: 22 }));
  at(200, (w) => wave(w, 'wisp', 5, 160, { gap: 20, amp: 22, ph: 3 }));
  at(330, (w) => w.spawnR('carrier', 20, 112, { fly: true, drop: ITEM.CRYSTAL }));
  at(460, mites(70, 1));
  at(560, (w) => wave(w, 'wisp', 6, 112, { gap: 18, amp: 40, fire: 2 }));
  at(680, (w) => {
    w.spawnR('darter', 10, 52);
    w.spawnR('darter', 40, 172);
  });
  at(800, (w) => w.spawnR('carrier', 20, 80, { fly: true, drop: ITEM.SPEED }));
  at(900, mites(150, -1));
  at(1000, (w) => {
    wave(w, 'wisp', 4, 56, { gap: 20, amp: 16 });
    wave(w, 'wisp', 4, 168, { gap: 20, amp: 16, ph: 2 });
  });

  // ---------------------------------------------------------------- hull
  at(1180, (w) => wave(w, 'wisp', 5, 90, { gap: 20, amp: 26, fire: 3 }));
  place(1320, (w) => w.spawn('turret', 1320, 0));
  place(1400, (w) => w.spawn('hopper', 1400, 0));
  place(1470, (w) => w.spawn('hopper', 1470, 0));
  at(1500, (w) => {
    w.spawnR('darter', 10, 60);
    w.spawnR('darter', 34, 100);
    w.spawnR('darter', 58, 140);
  });
  place(1640, (w) => w.spawn('carrier', 1640, 0, { drop: ITEM.CRYSTAL }));
  place(1720, (w) => w.spawn('turret', 1720, 0));
  place(1760, (w) => w.spawn('turret', 1760, 0, { ceil: true }));
  at(1800, (w) => w.spawnR('gunpod', 20, 100));
  place(1950, (w) => w.spawn('hatch', 1950, 0, { count: 4 }));
  place(2060, (w) => w.spawn('sporepod', 2060, 0, { ceil: true }));
  place(2160, (w) => w.spawn('sporepod', 2160, 0));
  at(2050, (w) => wave(w, 'wisp', 5, 110, { gap: 20, amp: 30 }));
  at(2200, (w) => w.spawnR('carrier', 20, 104, { fly: true, drop: ITEM.MISSILE }));
  place(2290, (w) => w.spawn('turret', 2290, 0));
  place(2330, (w) => w.spawn('turret', 2330, 0, { ceil: true }));

  // ---------------------------------------------------------------- service trench
  at(2480, (w) => wave(w, 'wisp', 5, 108, { gap: 22, amp: 14 }));
  place(2700, (w) => w.spawn('turret', 2700, 0, { ceil: true }));
  place(2760, (w) => w.spawn('hopper', 2760, 0));
  at(2650, mites(112, 1, 'sine', 6));
  place(2900, (w) => w.spawn('turret', 2900, 0));
  place(3020, (w) => w.spawn('carrier', 3020, 0, { drop: ITEM.BIT }));
  place(3140, (w) => w.spawn('turret', 3140, 0, { ceil: true }));
  at(3080, (w) => w.spawnR('gunpod', 20, 110));
  place(3300, (w) => w.spawn('hopper', 3300, 0, { ceil: true }));
  place(3360, (w) => w.spawn('hopper', 3360, 0));
  at(3350, (w) => wave(w, 'wisp', 6, 112, { gap: 18, amp: 20, fire: 2 }));
  place(3520, (w) => w.spawn('sporepod', 3520, 0));
  place(3560, (w) => w.spawn('sporepod', 3560, 0, { ceil: true }));

  // ---------------------------------------------------------------- mid-boss: SENTINEL
  at(3770, (w) => {
    w.setScroll(0);
    w.spawnR('sentinel', 60, 112, {
      onDeath: () => w.setScroll(0.5),
    });
  });

  // ---------------------------------------------------------------- hangar with pillars
  at(4000, (w) => wave(w, 'wisp', 5, 80, { gap: 20, amp: 24 }));
  place(4300, (w) => w.spawn('turret', 4312, 126, { y: 126 }));
  at(4180, (w) => {
    w.spawnR('darter', 10, 50);
    w.spawnR('darter', 40, 100);
  });
  place(4520, (w) => w.spawn('carrier', 4520, 0, { drop: ITEM.CRYSTAL }));
  at(4420, mites(150, -1, 'loop', 6));
  place(4612, (w) => w.spawn('turret', 4612, 116, { y: 116 }));
  at(4600, (w) => w.spawnR('gunpod', 20, 70));
  place(4700, (w) => w.spawn('sporepod', 4700, 0));
  at(4720, (w) => w.spawnR('carrier', 20, 60, { fly: true, drop: ITEM.SPEED }));
  place(4912, (w) => w.spawn('turret', 4912, 106, { y: 106 }));
  at(4850, (w) => {
    wave(w, 'wisp', 4, 60, { gap: 20, amp: 14 });
    wave(w, 'wisp', 4, 150, { gap: 20, amp: 14, ph: 2 });
  });
  at(5000, (w) => w.spawnR('carrier', 20, 112, { fly: true, drop: ITEM.BIT }));
  at(5100, mites(80, 1, 'dive', 5));

  // ---------------------------------------------------------------- gate funnel
  place(5380, (w) => w.spawn('hatch', 5380, 0, { count: 3 }));
  place(5420, (w) => w.spawn('hatch', 5420, 0, { ceil: true, count: 3 }));
  at(5300, (w) => wave(w, 'wisp', 5, 112, { gap: 18, amp: 12 }));
  place(5560, (w) => w.spawn('turret', 5560, 0));
  place(5580, (w) => w.spawn('turret', 5580, 0, { ceil: true }));
  at(5450, (w) => w.spawnR('darter', 10, 112));

  // ---------------------------------------------------------------- boss
  at(5660, (w) => w.startBoss('iris', { title: 'IRIS WARDEN', music: 'boss' }));

  return {
    index: 0,
    name: { en: 'DERELICT GATE', ja: '朽ちた関門' },
    sub: 'OUTER RELAY STATION — BLOOM CONTACT CONFIRMED',
    music: 'stage1',
    bg: 'station',
    scroll: 0.5,
    grade: { tint: [0.98, 1.0, 1.06], sat: 1.05, contrast: 1.05 },
    terrain: {
      length: 6400,
      theme: 'hull',
      ceil: [
        [0, null], [1500, null], [1500, 14], [1600, 26], [1800, 22], [2000, 34], [2200, 30], [2400, 34],
        [2450, 52], [2700, 52], [2720, 64], [2900, 64], [2920, 50], [3200, 50], [3220, 60], [3600, 60],
        [3650, 24], [4100, 24], [4150, 30], [5250, 30], [5300, 40], [5420, 72], [5560, 72], [5640, 16], [6400, 16],
      ],
      floor: [
        [0, null], [1100, null], [1100, 236], [1250, 198], [1500, 196], [1560, 186], [1800, 190], [2000, 182],
        [2200, 186], [2400, 184], [2450, 168], [2650, 168], [2670, 160], [2850, 160], [2870, 172], [3200, 172],
        [3220, 164], [3600, 164], [3650, 202], [4100, 202], [4150, 198], [5250, 198], [5300, 186], [5420, 152],
        [5560, 152], [5640, 208], [6400, 208],
      ],
      blocks: [
        [2580, 52, 26, 40],
        [2760, 116, 26, 44],
        [2980, 50, 24, 44, 14, 'destr'],
        [3040, 128, 24, 44, 14, 'destr'],
        [3180, 86, 22, 52, 24, 'destr'],
        [3420, 60, 26, 42],
        [3480, 124, 26, 40],
        [4300, 130, 24, 72],
        [4450, 30, 24, 72],
        [4600, 120, 24, 82],
        [4760, 30, 24, 80],
        [4900, 110, 24, 92],
        [5060, 30, 22, 66],
      ],
    },
    checkpoints: [0, 1300, 2600, 3900, 5400],
    events: ev,
  };
}
