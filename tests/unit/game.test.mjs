import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../../src/game/stages/index.js';
import { REGISTRY } from '../../src/game/enemy.js';
import { SONGS, SONG_LIST } from '../../src/audio/songs/index.js';
import { STR, HOWTO, CREDITS, PROLOGUE } from '../../src/ui/i18n.js';
import { BESTIARY } from '../../src/ui/ending.js';
import { missingPixelGlyphs } from '../../src/gfx/font.js';
import { fbm, voronoi } from '../../src/gfx/noise.js';
import { Rng, hash2 } from '../../src/core/rng.js';
import '../../src/game/enemies/common.js';
import '../../src/game/enemies/stage1.js';
import '../../src/game/enemies/stage2.js';
import '../../src/game/enemies/stage3.js';
import '../../src/game/enemies/stage4.js';
import '../../src/game/enemies/stage5.js';
import '../../src/game/enemies/stage6.js';
import '../../src/game/bosses/iris.js';
import '../../src/game/bosses/brood.js';
import '../../src/game/bosses/leviathan.js';
import '../../src/game/bosses/anvil.js';
import '../../src/game/bosses/wyrm.js';
import '../../src/game/bosses/mother.js';

/** A stand-in world that accepts any call and records what the timeline spawns. */
function recordingWorld() {
  const spawned = [];
  const any = new Proxy(function () {}, {
    get: (t, p) => (p === Symbol.toPrimitive ? () => 0 : any),
    apply: () => any,
  });
  const w = new Proxy({}, {
    get(t, p) {
      if (p === 'spawn' || p === 'spawnR') return (name) => (spawned.push(name), any);
      if (p === 'startBoss') return (name) => spawned.push(name);
      if (p === 'after') return (n, fn) => fn();
      if (p === 'camX' || p === 't') return 0;
      return any;
    },
  });
  return { w, spawned };
}

test('six stages with sane checkpoints, names and music', () => {
  assert.equal(STAGES.length, 6);
  STAGES.forEach((make, i) => {
    const st = make();
    assert.equal(st.index, i);
    assert.ok(st.name.en && st.name.ja, `stage ${i + 1} names`);
    assert.ok(SONGS[st.music], `stage ${i + 1} music ${st.music}`);
    assert.equal(st.checkpoints[0], 0);
    for (let k = 1; k < st.checkpoints.length; k++) assert.ok(st.checkpoints[k] > st.checkpoints[k - 1], `stage ${i + 1} checkpoints ascend`);
    assert.ok(st.checkpoints.at(-1) < st.terrain.length, `stage ${i + 1} last checkpoint inside the stage`);
    for (const e of st.events) {
      assert.ok(Number.isFinite(e.at), `stage ${i + 1} event position`);
      assert.ok(typeof e.fn === 'function' || e.scroll !== undefined, `stage ${i + 1} event kind`);
    }
  });
});

test('every enemy and boss a stage timeline spawns is registered, and each stage has a boss', () => {
  const bosses = ['iris', 'brood', 'leviathan', 'anvil', 'wyrm', 'mother'];
  STAGES.forEach((make, i) => {
    const st = make();
    const { w, spawned } = recordingWorld();
    for (const e of st.events) if (e.fn) e.fn(w);
    const unknown = [...new Set(spawned)].filter((n) => !REGISTRY.has(n));
    assert.deepEqual(unknown, [], `stage ${i + 1} unknown spawns`);
    assert.ok(spawned.includes(bosses[i]), `stage ${i + 1} boss ${bosses[i]}`);
  });
});

test('the bitmap font can draw every string it is used for', () => {
  const strings = [];
  const add = (v) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(add);
    else if (v && typeof v === 'object') Object.values(v).forEach(add);
  };
  add(STR);
  add(HOWTO);
  add(CREDITS);
  add(PROLOGUE);
  add(SONG_LIST.map((s) => s[1]));
  add(BESTIARY.map((b) => b[2]));
  add(STAGES.map((m) => m().name));
  const missing = strings.flatMap((s) => missingPixelGlyphs(s).map((ch) => `${JSON.stringify(ch)} in ${JSON.stringify(s)}`));
  assert.deepEqual(missing, []);
});

test('noise tiles seamlessly over integer periods', () => {
  for (const [x, y] of [[0.3, 0.7], [2.5, 5.25], [7.9, 0.1]]) {
    assert.ok(Math.abs(fbm(x, y, 4, 8, 3) - fbm(x + 8, y, 4, 8, 3)) < 1e-9);
    assert.ok(Math.abs(fbm(x, y, 4, 8, 3) - fbm(x, y + 8, 4, 8, 3)) < 1e-9);
    const a = voronoi(x, y, 6, 2);
    const b = voronoi(x + 6, y + 6, 6, 2);
    assert.ok(Math.abs(a[0] - b[0]) < 1e-9 && a[2] === b[2]);
  }
});

test('seeded randomness is reproducible', () => {
  const a = new Rng(42);
  const b = new Rng(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
  for (let i = 0; i < 1000; i++) {
    const h = hash2(i, i * 7 + 3);
    assert.ok(h >= 0 && h < 1);
  }
});
