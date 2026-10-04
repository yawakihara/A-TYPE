import test from 'node:test';
import assert from 'node:assert/strict';
import { compileTrack, compileSong, validateSong, TPQ } from '../../src/audio/mml.js';
import { SONGS } from '../../src/audio/songs/index.js';
import { parseChord, bass, pad, arp } from '../../src/audio/songs/gen.js';

test('MML basics: lengths, dots, octaves, accidentals, ties, chords', () => {
  const c = compileTrack('o4 l8 c d e4. f16 r16 (c e g)2 a4^8 b-8 c+4&c+4');
  const ev = c.events;
  assert.equal(ev[0].notes[0], 60);
  assert.equal(ev[0].d, TPQ / 2);
  assert.equal(ev[2].d, TPQ * 1.5);
  assert.deepEqual(ev[4].notes, [60, 64, 67]);
  assert.equal(ev[5].d, TPQ * 1.5); // a4^8
  assert.equal(ev[6].notes[0], 70); // b-
  assert.equal(ev[7].notes[0], 61);
  assert.equal(ev[7].d, TPQ * 2); // tie merged
});

test('MML repeats with alternate ending', () => {
  const a = compileTrack('[c4 d4 | e4]3');
  assert.equal(a.length, TPQ * 8); // c d e c d e c d
  assert.equal(a.events.length, 8);
});

test('drum tracks keep accents', () => {
  const d = compileTrack('k8 K8 (kh)4 s2', { drum: true });
  assert.equal(d.length, TPQ * 4);
  assert.ok(d.events[1].v > d.events[0].v);
  assert.deepEqual(d.events[2].notes, ['k', 'h']);
});

test('chord parser and generators are length-exact', () => {
  assert.deepEqual(parseChord('Bbmaj7').ints, [0, 4, 7, 11]);
  assert.equal(parseChord('C/E').bass, 4);
  for (const g of [bass('Dm Bb:0.5 C:1.5', 'gallop'), pad('Dm Bb:0.5 C:1.5'), arp('Dm Bb:0.5 C:1.5', 'updown')]) {
    assert.equal(compileTrack(g).length, TPQ * 4 * 3);
  }
});

test('every song: all tracks end together and the loop point is valid', () => {
  const errs = Object.values(SONGS).flatMap((s) => validateSong(s));
  assert.deepEqual(errs, []);
  for (const s of Object.values(SONGS)) {
    const c = compileSong(s);
    assert.ok(c.length > 0, s.name);
    assert.ok(s.bpm >= 60 && s.bpm <= 200, `${s.name} bpm`);
  }
});
