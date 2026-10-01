import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_BUILDERS } from '../../js/stages.js';
import { buildTerrain } from '../../js/terrain.js';
import { SHIP_ROWS } from '../../js/spritedata.js';
import { makeRng, clamp, overlap, approach, hash2, pad } from '../../js/util.js';
import { chargeLevel, CHARGE_AT, BEAMS, SPEEDS } from '../../js/entities.js';
import { GLYPHS } from '../../js/font.js';
import { COL_W, PLAY_H, DIFFICULTY } from '../../js/config.js';

test('3ステージが定義され、イベントはX昇順・ボス手前に収まる', () => {
  assert.equal(STAGE_BUILDERS.length, 3);
  for (const build of STAGE_BUILDERS) {
    const st = build();
    assert.ok(st.events.length > 20, `${st.name}: イベント数`);
    for (let i = 1; i < st.events.length; i++) assert.ok(st.events[i - 1].x <= st.events[i].x, `${st.name}: 昇順`);
    assert.ok(st.events.at(-1).x < st.bossX, `${st.name}: 最後のイベントはボスより手前`);
    for (let i = 1; i < st.checkpoints.length; i++) assert.ok(st.checkpoints[i - 1] < st.checkpoints[i], `${st.name}: チェックポイント昇順`);
    assert.equal(st.checkpoints[0], 0);
    assert.ok(st.checkpoints.at(-1) < st.bossX);
    assert.ok(['rock', 'flesh', 'metal'].includes(st.theme));
    assert.match(st.boss, /^boss[123]$/);
  }
});

test('地形: 高さは8の倍数で、天井と床の隙間が確保される', () => {
  for (const build of STAGE_BUILDERS) {
    const { terrain, name } = build();
    for (let i = 0; i < terrain.cols; i++) {
      const c = terrain.ceil[i];
      const f = terrain.floor[i];
      assert.equal(c % COL_W, 0, `${name}[${i}] 天井が8の倍数`);
      assert.equal(f % COL_W, 0, `${name}[${i}] 床が8の倍数`);
      assert.ok(c >= 0 && f <= PLAY_H, `${name}[${i}] 範囲`);
      assert.ok(f - c >= 88, `${name}[${i}] 隙間 ${f - c} >= 88`);
    }
  }
});

test('地形: ボス部屋は最後まで平坦で、範囲外アクセスは端の列に丸められる', () => {
  for (const build of STAGE_BUILDERS) {
    const { terrain } = build();
    const last = terrain.cols - 1;
    for (let i = last - 40; i <= last; i++) {
      assert.equal(terrain.ceil[i], terrain.ceil[last]);
      assert.equal(terrain.floor[i], terrain.floor[last]);
    }
    assert.equal(terrain.ceilAt(1e9), terrain.ceil[last]);
    assert.equal(terrain.floorAt(-50), terrain.floor[0]);
  }
});

test('地形: 衝突判定', () => {
  const t = buildTerrain([{ n: 20, c: 24, f: 32 }], 'rock', 1);
  assert.ok(t.hits(0, 0, 10, 10), '天井にめり込む');
  assert.ok(t.hits(0, PLAY_H - 10, 10, PLAY_H), '床にめり込む');
  assert.ok(!t.hits(0, 60, 10, 80), '空間は当たらない');
  assert.ok(t.solidAt(5, 10));
  assert.ok(!t.solidAt(5, 100));
});

test('地形: 区間のramp指定で高さが連続的に変化する', () => {
  const t = buildTerrain([{ n: 10, c: 0, f: 0 }, { n: 20, c: 80, f: 0, ramp: true }], 'rock', 1);
  assert.equal(t.ceil[9], 0);
  assert.ok(t.ceil[15] > 0 && t.ceil[15] < 80);
  assert.equal(t.ceil[29], 80);
});

test('自機スプライトの行幅が揃っている', () => {
  const w = Math.max(...SHIP_ROWS.map((r) => r.length));
  assert.equal(w, 32);
  assert.ok(SHIP_ROWS.every((r) => r.length <= w));
  assert.ok(SHIP_ROWS.length === 14);
});

test('フォント: 全グリフが5x7', () => {
  for (const [ch, g] of Object.entries(GLYPHS)) {
    const rows = g.split('/');
    assert.equal(rows.length, 7, `${ch}: 行数`);
    assert.ok(rows.every((r) => r.length === 5), `${ch}: 桁数`);
  }
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') assert.ok(GLYPHS[ch], `${ch} が定義されている`);
});

test('ユーティリティ', () => {
  const a = makeRng(7);
  const b = makeRng(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.ok(a() >= 0 && a() < 1);
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(approach(0, 10, 3), 3);
  assert.equal(approach(9, 10, 3), 10);
  assert.ok(overlap({ x: 0, y: 0, hw: 5, hh: 5 }, { x: 8, y: 0, hw: 5, hh: 5 }));
  assert.ok(!overlap({ x: 0, y: 0, hw: 5, hh: 5 }, { x: 11, y: 0, hw: 5, hh: 5 }));
  assert.equal(pad(42, 7), '0000042');
  assert.ok(hash2(1, 2, 3) === hash2(1, 2, 3));
});

test('チャージレベルとビーム性能は単調増加', () => {
  assert.equal(chargeLevel(0), 0);
  assert.equal(chargeLevel(CHARGE_AT[0]), 1);
  assert.equal(chargeLevel(CHARGE_AT[4]), 5);
  assert.equal(chargeLevel(9999), 5);
  for (let lv = 2; lv <= 5; lv++) {
    assert.ok(BEAMS[lv].dmg > BEAMS[lv - 1].dmg);
    assert.ok(BEAMS[lv].hh > BEAMS[lv - 1].hh);
  }
  for (let i = 1; i < SPEEDS.length; i++) assert.ok(SPEEDS[i] > SPEEDS[i - 1]);
});

test('難易度設定', () => {
  assert.equal(DIFFICULTY.length, 3);
  assert.ok(DIFFICULTY[0].bulletSpeed < DIFFICULTY[1].bulletSpeed && DIFFICULTY[1].bulletSpeed < DIFFICULTY[2].bulletSpeed);
});
