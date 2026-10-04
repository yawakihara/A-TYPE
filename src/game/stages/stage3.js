/**
 * STAGE 3 — IRON LEVIATHAN
 * The whole stage is one Bloom-infested dreadnought: chase it into its engine wash, run the
 * length of the deck, bring down the COMMAND TOWER, thread the hangar bay, and face the
 * forward bulwark, the LEVIATHAN CORE.
 */
import { ITEM } from '../items.js';
import { timeline } from './util.js';

export function stage3() {
  const { ev, at, place, wave } = timeline();
  const mites = (y, dir, path = 'loop', n = 5) => (w) => {
    for (let i = 0; i < n; i++) w.after(1 + i * 9, () => w.spawnR('mite', 12, y, { path, dir }));
  };
  const darters = (ys) => (w) => ys.forEach((y, i) => w.spawnR('darter', 10 + i * 24, y));

  // ---------------------------------------------------------------- the chase
  at(60, darters([60, 160]));
  at(160, mites(80, 1));
  at(280, (w) => w.spawnR('carrier', 20, 100, { fly: true, drop: ITEM.CRYSTAL }));
  at(400, darters([50, 110, 170]));
  at(520, mites(150, -1, 'dive'));
  at(600, (w) => w.spawnR('carrier', 20, 70, { fly: true, drop: ITEM.SPEED }));
  place(750, (w) => {
    w.spawn('engine', 750, 182);
    w.spawn('engine', 738, 207);
  }, 60);

  // ---------------------------------------------------------------- the deck
  place(850, (w) => w.spawn('deckgun', 850, 0));
  place(970, (w) => w.spawn('deckgun', 970, 0, { twin: true }));
  at(860, (w) => wave(w, 'wisp', 5, 70, { gap: 20, amp: 20 }));
  place(1140, (w) => w.spawn('flak', 1140, 0));
  at(1100, darters([50, 90]));
  place(1250, (w) => w.spawn('silo', 1250, 0));
  place(1330, (w) => w.spawn('carrier', 1330, 0, { drop: ITEM.CRYSTAL }));
  place(1440, (w) => w.spawn('laserfin', 1440, 0));
  place(1520, (w) => w.spawn('vent', 1520, 0));
  place(1580, (w) => w.spawn('vent', 1580, 0));
  at(1450, mites(70, 1, 'loop', 6));
  at(1600, (w) => w.spawnR('carrier', 20, 60, { fly: true, drop: ITEM.MISSILE }));
  place(1680, (w) => w.spawn('deckgun', 1680, 0, { twin: true }));
  place(1780, (w) => w.spawn('deckgun', 1780, 0));
  at(1800, darters([40, 80, 120]));
  place(1890, (w) => w.spawn('silo', 1890, 0));
  place(1970, (w) => w.spawn('flak', 1970, 0));
  at(2050, (w) => w.spawnR('carrier', 20, 80, { fly: true, drop: ITEM.BIT }));
  place(2150, (w) => w.spawn('laserfin', 2150, 0));
  place(2240, (w) => w.spawn('deckgun', 2240, 0));

  // ---------------------------------------------------------------- mid-boss: COMMAND TOWER
  at(2170, (w) => {
    w.setScroll(0);
    w.spawn('tower', 2470, 0, { onDeath: () => w.setScroll(0.5) });
  });

  // ---------------------------------------------------------------- hangar bay
  place(2905, (w) => w.spawn('dropper', 2905, 0));
  place(3000, (w) => w.spawn('deckgun', 3000, 0, { ceil: true }));
  at(2900, mites(110, 1, 'sine', 6));
  place(3060, (w) => w.spawn('dropper', 3060, 0));
  at(3080, (w) => w.spawnR('carrier', 20, 104, { fly: true, drop: ITEM.CRYSTAL }));
  place(3150, (w) => w.spawn('deckgun', 3150, 0, { twin: true }));
  place(3210, (w) => w.spawn('vent', 3210, 0));
  place(3310, (w) => w.spawn('dropper', 3310, 0));
  place(3360, (w) => w.spawn('laserfin', 3360, 0));
  at(3380, darters([80, 110]));
  place(3460, (w) => w.spawn('deckgun', 3460, 0, { ceil: true, twin: true }));
  at(3500, (w) => w.spawnR('carrier', 20, 100, { fly: true, drop: ITEM.SPEED }));
  place(3560, (w) => w.spawn('vent', 3560, 0));
  place(3570, (w) => w.spawn('dropper', 3570, 0));
  place(3660, (w) => w.spawn('deckgun', 3660, 0));
  at(3700, mites(100, -1, 'loop', 6));
  place(3760, (w) => w.spawn('dropper', 3760, 0));
  place(3810, (w) => w.spawn('laserfin', 3810, 0, { ceil: true }));
  place(3960, (w) => w.spawn('dropper', 3960, 0));
  place(4020, (w) => w.spawn('flak', 4020, 0));

  // ---------------------------------------------------------------- open space, then the bulwark
  at(4120, darters([60, 112, 164]));
  at(4200, mites(112, 1, 'dive', 6));
  at(4310, (w) => w.startBoss('leviathan', { title: 'LEVIATHAN CORE', music: 'boss' }));

  return {
    index: 2,
    name: { en: 'IRON LEVIATHAN', ja: '鉄の巨鯨' },
    sub: 'BLOOM-HELD DREADNOUGHT "ARGENT VOW" — 4.2 KM',
    music: 'stage3',
    bg: 'fleet',
    scroll: 0.5,
    grade: { tint: [1.04, 1.0, 0.96], sat: 1.0, contrast: 1.07 },
    terrain: {
      length: 4920,
      theme: 'warship',
      ceil: [[0, null], [2700, null], [2700, -20], [2800, 50], [3100, 50], [3120, 40], [3500, 40], [3520, 58], [3900, 58], [3920, 46], [4100, 46], [4150, -30], [4152, null], [4920, null]],
      floor: [[0, null], [720, null], [720, 232], [740, 168], [760, 156], [1000, 156], [1020, 144], [1300, 144], [1320, 162], [1600, 162], [1620, 148], [1900, 148], [1920, 170], [2300, 170], [2320, 186], [2700, 186], [2720, 178], [2900, 170], [3100, 170], [3120, 158], [3500, 158], [3520, 174], [3900, 174], [3920, 162], [4100, 162], [4150, 250], [4152, null], [4920, null]],
      blocks: [
        [1080, 120, 28, 24],
        [1400, 130, 36, 32],
        [1700, 118, 24, 30],
        [2000, 142, 34, 28],
        [2950, 140, 18, 30, 10, 'crate'],
        [3260, 40, 20, 48],
        [3400, 122, 20, 36],
        [3600, 144, 16, 30, 10, 'crate'],
        [3700, 58, 20, 44],
        [3830, 132, 20, 42],
      ],
    },
    checkpoints: [0, 900, 2100, 2900, 4100],
    events: ev,
  };
}
