import { W } from './config.js';
import { buildTerrain } from './terrain.js';
import { spawnEnemy, formation, ring } from './enemies.js';
import { makeRng } from './util.js';

/**
 * px長を地形の列数に換算する。
 * @param {number} n ピクセル長
 * @returns {number} 列数
 */
const px = (n) => Math.round(n / 8);

/** 画面右端の外側のX。 */
const R = W + 12;

/**
 * ステージ1「軌道遺跡」: 宇宙空間 → 岩場の洞窟 → 狭路 → ボス「ウォーデン」。
 * @returns {object} ステージ定義
 */
function stage1() {
  const terrain = buildTerrain([
    { n: px(1200), c: 0, f: 0 },
    { n: px(300), f: 48, ramp: true },
    { n: px(800), f: 48, wob: 20 },
    { n: px(200), c: 56, ramp: true },
    { n: px(1000), c: 56, f: 48, wob: 20 },
    { n: px(300), c: 88, f: 72, ramp: true, wob: 8 },
    { n: px(300), c: 88, f: 72, wob: 10 },
    { n: px(300), c: 56, f: 48, ramp: true },
    { n: px(500), c: 56, f: 48, wob: 16 },
    { n: px(200), c: 24, f: 24, ramp: true },
    { n: px(900), c: 24, f: 24 },
  ], 'rock', 11);
  const E = [];
  const at = (x, fn) => E.push({ x, fn });
  const drones = (n, y, ph, amp = 26, fire = 0) => (g) => formation(g, 'drone', n, R, y, 20, (i) => ({ ph: i * 0.5 + ph, amp, fireEvery: fire && i === 2 ? fire : 0 }));
  const cargo = (y, item) => (g) => spawnEnemy(g, 'cargo', R + 8, y, { item });
  const swoop = (ys) => (g) => ys.forEach((y, i) => spawnEnemy(g, 'swooper', R + i * 26, y));
  const turret = (ceil = false, rate) => (g) => spawnEnemy(g, 'turret', R, 0, { onCeil: ceil, rate });
  const walker = (ceil = false) => (g) => spawnEnemy(g, 'walker', R, 0, { onCeil: ceil });
  const rushers = (ys, track = false) => (g) => ys.forEach((y, i) => spawnEnemy(g, 'rusher', R + i * 30, y, { track }));
  const mines = (ys) => (g) => ys.forEach((y, i) => spawnEnemy(g, 'mine', R + i * 40, y));

  // --- 宇宙空間 ---
  at(100, drones(5, 70, 0));
  at(260, drones(5, 170, 3));
  at(430, cargo(110, 'orb'));
  at(500, swoop([16, 24]));
  at(560, swoop([224, 216]));
  at(650, drones(6, 120, 0, 50, 150));
  at(780, mines([70, 170]));
  at(880, cargo(170, 'speed'));
  at(980, rushers([60, 100, 140, 180]));
  at(1100, drones(5, 100, 0, 30));
  at(1130, drones(5, 150, 3, 30));
  // --- 床あり区間 ---
  at(1250, cargo(100, 'ricochet'));
  at(1520, turret());
  at(1600, walker());
  at(1640, walker());
  at(1700, drones(5, 80, 1, 24, 140));
  at(1760, turret());
  at(1800, swoop([20, 30]));
  at(1900, walker());
  at(1930, turret());
  at(2000, rushers([70, 110, 150]));
  at(2100, cargo(110, 'speed'));
  at(2150, turret());
  at(2190, turret());
  at(2250, mines([90, 150]));
  // --- 洞窟(天井あり) ---
  at(2500, (g) => ring(g, 6, R + 20, 120));
  at(2600, turret(true));
  at(2630, turret());
  at(2680, cargo(120, 'piercer'));
  at(2760, walker());
  at(2780, walker(true));
  at(2850, swoop([40, 190]));
  at(2950, (g) => spawnEnemy(g, 'gunship', R + 30, 120, { item: 'missile' }));
  at(3150, drones(5, 110, 2, 40, 120));
  at(3250, (g) => spawnEnemy(g, 'serpent', R, 120, { n: 8, amp: 44 }));
  at(3350, turret(true));
  at(3380, turret());
  at(3420, mines([100, 150]));
  // --- 狭路 ---
  at(3560, (g) => spawnEnemy(g, 'serpent', R, 120, { n: 6, amp: 18 }));
  at(3650, mines([105, 140]));
  at(3720, cargo(120, 'bit'));
  at(3800, rushers([100, 120, 140], true));
  at(3900, (g) => ring(g, 6, R + 20, 120, { r: 20 }));
  at(4000, walker());
  at(4030, walker(true));
  at(4120, swoop([60, 180]));
  at(4250, turret(true));
  at(4260, turret());
  at(4310, turret(true));
  at(4320, turret());
  at(4380, cargo(120, 'speed'));
  at(4460, (g) => spawnEnemy(g, 'gunship', R + 30, 120, { item: 'piercer' }));
  at(4660, drones(6, 100, 0, 50, 120));
  at(4760, (g) => spawnEnemy(g, 'serpent', R, 120, { n: 8, amp: 50 }));

  return {
    id: 1, name: 'ORBITAL RUINS', theme: 'rock', bg: 'space', song: 'stage1', boss: 'boss1', bossName: 'WARDEN',
    terrain, events: E.sort((a, b) => a.x - b.x), checkpoints: [0, 1500, 2500, 3500, 4400], bossX: 5050,
  };
}

/**
 * ステージ2「生体洞」: 有機的な洞窟。蛇・胞子・触手 → ボス「ハイヴ・マザー」。
 * @returns {object} ステージ定義
 */
function stage2() {
  const terrain = buildTerrain([
    { n: px(300), c: 40, f: 40, wob: 16 },
    { n: px(1200), c: 56, f: 56, wob: 30 },
    { n: px(800), c: 72, f: 48, wob: 28 },
    { n: px(1000), c: 48, f: 72, wob: 28 },
    { n: px(800), c: 80, f: 80, wob: 24 },
    { n: px(800), c: 56, f: 56, wob: 24 },
    { n: px(300), c: 24, f: 24, ramp: true },
    { n: px(900), c: 24, f: 24 },
  ], 'flesh', 22);
  const E = [];
  const at = (x, fn) => E.push({ x, fn });
  const drones = (n, y, ph, amp = 30, fire = 0) => (g) => formation(g, 'drone', n, R, y, 18, (i) => ({ ph: i * 0.55 + ph, amp, fireEvery: fire && i % 3 === 1 ? fire : 0 }));
  const cargo = (y, item) => (g) => spawnEnemy(g, 'cargo', R + 8, y, { item });
  const swoop = (ys) => (g) => ys.forEach((y, i) => spawnEnemy(g, 'swooper', R + i * 24, y));
  const turret = (ceil = false, rate) => (g) => spawnEnemy(g, 'turret', R, 0, { onCeil: ceil, rate });
  const walker = (ceil = false) => (g) => spawnEnemy(g, 'walker', R, 0, { onCeil: ceil });
  const serp = (y, n = 8, amp = 40) => (g) => spawnEnemy(g, 'serpent', R, y, { n, amp });
  const mines = (ys) => (g) => ys.forEach((y, i) => spawnEnemy(g, 'mine', R + i * 36, y));

  at(80, drones(6, 120, 0, 40));
  at(220, serp(110, 8, 36));
  at(380, cargo(120, 'orb'));
  at(470, swoop([30, 210]));
  at(580, drones(5, 80, 0, 30, 130));
  at(600, drones(5, 160, 3, 30));
  at(760, walker());
  at(790, walker(true));
  at(900, serp(100, 8, 50));
  at(1000, cargo(110, 'seeker'));
  at(1100, (g) => ring(g, 7, R + 20, 110));
  at(1230, turret());
  at(1250, turret(true));
  at(1350, mines([80, 120, 160]));
  at(1450, swoop([40, 60, 200]));
  at(1560, cargo(120, 'speed'));
  at(1640, serp(130, 10, 55));
  at(1760, walker());
  at(1800, walker(true));
  at(1900, drones(6, 100, 0, 45, 110));
  at(2050, (g) => spawnEnemy(g, 'gunship', R + 30, 120, { item: 'ricochet' }));
  at(2250, turret());
  at(2270, turret(true));
  at(2380, serp(120, 8, 60));
  at(2500, cargo(110, 'missile'));
  at(2580, (g) => ring(g, 8, R + 20, 120, { r: 30, w: 0.09 }));
  at(2750, mines([70, 110, 150, 190]));
  at(2880, walker());
  at(2900, walker(true));
  at(3000, swoop([50, 100, 150, 200]));
  at(3150, serp(100, 8, 45));
  at(3200, serp(140, 8, 45));
  at(3380, cargo(120, 'bit'));
  at(3450, turret());
  at(3470, turret(true));
  at(3560, drones(7, 120, 0, 60, 100));
  at(3720, (g) => spawnEnemy(g, 'gunship', R + 30, 120, { item: 'speed', stay: 650 }));
  at(3920, serp(120, 10, 35));
  at(4050, mines([105, 140]));
  at(4120, cargo(120, 'piercer'));
  at(4200, walker());
  at(4220, walker(true));
  at(4300, (g) => ring(g, 6, R + 20, 120, { r: 22 }));
  at(4450, swoop([60, 180, 120]));
  at(4560, turret());
  at(4580, turret(true));
  at(4680, serp(110, 8, 50));
  at(4800, cargo(120, 'speed'));
  at(4900, drones(6, 100, 0, 50, 110));

  return {
    id: 2, name: 'BIO CAVERN', theme: 'flesh', bg: 'flesh', song: 'stage2', boss: 'boss2', bossName: 'HIVE MOTHER',
    terrain, events: E.sort((a, b) => a.x - b.x), checkpoints: [0, 1500, 2600, 3700, 4500], bossX: 5100,
  };
}

/**
 * ステージ3「鉄の城塞」: 金属の回廊 → 大型砲台 → ボス「ドレッドノート」。
 * 地形と敵配置は固定シードで手続き生成する。
 * @returns {object} ステージ定義
 */
function stage3() {
  const rng = makeRng(33);
  const segs = [{ n: px(260), c: 24, f: 24 }];
  let len = 260;
  let prevC = 24;
  let prevF = 24;
  while (len < 5700) {
    const seg = 110 + Math.floor(rng() * 150);
    const flat = rng() < 0.3;
    let c = 16 + Math.floor(rng() * 9) * 8;
    let f = 16 + Math.floor(rng() * 9) * 8;
    if (flat) { c = prevC; f = prevF; }
    segs.push({ n: px(seg), c, f });
    prevC = c; prevF = f;
    len += seg;
  }
  segs.push({ n: px(200), c: 16, f: 16, ramp: true });
  segs.push({ n: px(900), c: 16, f: 16 });
  const terrain = buildTerrain(segs, 'metal', 33, 96);
  const E = [];
  const at = (x, fn) => E.push({ x, fn });
  const cargo = (y, item) => (g) => spawnEnemy(g, 'cargo', R + 8, y, { item });
  const turret = (ceil = false, rate = 90) => (g) => spawnEnemy(g, 'turret', R, 0, { onCeil: ceil, rate });
  const walker = (ceil = false) => (g) => spawnEnemy(g, 'walker', R, 0, { onCeil: ceil });
  const rushers = (ys, track = false) => (g) => ys.forEach((y, i) => spawnEnemy(g, 'rusher', R + i * 28, y, { track }));
  const swoop = (ys) => (g) => ys.forEach((y, i) => spawnEnemy(g, 'swooper', R + i * 24, y));
  const mines = (ys) => (g) => ys.forEach((y, i) => spawnEnemy(g, 'mine', R + i * 36, y));
  const gunship = (item) => (g) => spawnEnemy(g, 'gunship', R + 30, 120, { item, stay: 600 });

  // 固定のアイテム列
  const items = ['orb', 'speed', 'piercer', 'missile', 'speed', 'ricochet', 'bit', 'speed', 'seeker', 'missile', 'bit', 'speed'];
  items.forEach((it, i) => at(300 + i * 450, cargo(100 + (i % 3) * 30, it)));
  // 手続き生成の敵(固定シード)
  const kinds = ['rushers', 'turrets', 'walkers', 'swoop', 'mines', 'ring', 'serpent'];
  for (let x = 220; x < 5000; x += 150) {
    if ((x - 300) % 450 < 60 && x > 250) continue;
    const k = kinds[Math.floor(rng() * kinds.length)];
    const y = 70 + Math.floor(rng() * 100);
    switch (k) {
      case 'rushers': at(x, rushers([y, y + 30, y + 60].map((v) => Math.min(190, v)), rng() < 0.5)); break;
      case 'turrets': at(x, turret(false)); at(x + 20, turret(true)); at(x + 90, turret(false)); break;
      case 'walkers': at(x, walker()); at(x + 24, walker(true)); break;
      case 'swoop': at(x, swoop([30, 210])); break;
      case 'mines': at(x, mines([y, y + 50])); break;
      case 'ring': at(x, (g) => ring(g, 6, R + 20, y, { r: 24 })); break;
      default: at(x, (g) => spawnEnemy(g, 'serpent', R, y, { n: 7, amp: 40 })); break;
    }
  }
  at(1500, gunship('ricochet'));
  at(2700, gunship('missile'));
  at(3900, gunship('speed'));
  at(4500, gunship('piercer'));

  return {
    id: 3, name: 'IRON CITADEL', theme: 'metal', bg: 'metal', song: 'stage3', boss: 'boss3', bossName: 'DREADNOUGHT',
    terrain, events: E.sort((a, b) => a.x - b.x), checkpoints: [0, 1500, 2700, 3900, 4800], bossX: len + 100,
  };
}

/** 全ステージの生成関数。 */
export const STAGE_BUILDERS = [stage1, stage2, stage3];
