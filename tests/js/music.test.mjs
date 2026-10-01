import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, validateSong, parsePattern, noteToMidi, midiToFreq } from '../../js/music.js';

test('全曲のチャンネル長が曲長と一致する', () => {
  const errs = Object.entries(SONGS).flatMap(([name, def]) => validateSong(name, def));
  assert.deepEqual(errs, []);
});

test('音名→MIDI→周波数の変換', () => {
  assert.equal(noteToMidi('A4'), 69);
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('C#4'), 61);
  assert.equal(noteToMidi('Bb3'), 58);
  assert.ok(Math.abs(midiToFreq(69) - 440) < 1e-9);
});

test('パターン解析: 和音・休符・長さ', () => {
  const p = parsePattern('C4+E4+G4:4 -:2 A4 .');
  assert.equal(p.total, 8);
  assert.deepEqual(p.events.get(0).notes, [60, 64, 67]);
  assert.equal(p.events.get(0).len, 4);
  assert.equal(p.events.get(6).notes[0], 69);
  assert.equal(p.events.has(4), false);
});

test('不正な音名は例外', () => {
  assert.throws(() => parsePattern('H4:4'));
});
