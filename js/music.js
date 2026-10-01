/**
 * BGMデータ(全てオリジナル作曲)と、パターン文字列のコンパイル処理。
 *
 * 記法: 空白区切りのトークン列。
 *   "A4:4"      = A4を4ステップ(16分音符x4)鳴らす
 *   "C4+E4+G4:8" = 和音
 *   "-:4" / "."  = 休符(4ステップ / 1ステップ)
 * ドラムは1文字=1ステップ: k=キック s=スネア h=ハイハット H=オープンHH t=タム c=クラッシュ .=休み
 */

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * 音名(例: "C#4")をMIDIノート番号に変換する。
 * @param {string} n 音名
 * @returns {number} MIDIノート番号
 */
export function noteToMidi(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`不正な音名: ${n}`);
  return PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
}

/**
 * MIDIノート番号を音名に変換する。
 * @param {number} m MIDIノート番号
 * @returns {string} 音名
 */
export function midiToNote(m) {
  return `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

/**
 * MIDIノート番号を周波数(Hz)に変換する。
 * @param {number} m MIDIノート番号
 * @returns {number} 周波数
 */
export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * パターン文字列を解析する。
 * @param {string} str パターン
 * @returns {{events: Map<number,{notes:number[],len:number}>, total:number}} ステップ→発音の対応と総ステップ数
 */
export function parsePattern(str) {
  const events = new Map();
  let step = 0;
  for (const tok of str.trim().split(/\s+/)) {
    if (!tok) continue;
    const [nm, ln] = tok.split(':');
    const len = ln ? parseInt(ln, 10) : 1;
    if (!(len > 0)) throw new Error(`不正な長さ: ${tok}`);
    if (nm !== '-' && nm !== '.') {
      events.set(step, { notes: nm.split('+').map(noteToMidi), len });
    }
    step += len;
  }
  return { events, total: step };
}

/**
 * 曲定義をコンパイルする。
 * @param {{ch:Array<{inst:string,vol?:number,send?:number,pat:string}>, drums?:string, drumVol?:number}} def 曲定義
 * @returns {{channels:Array<{inst:string,vol:number,send:number,events:Map,total:number}>, drums:string, drumVol:number}} コンパイル結果
 */
export function compileSong(def) {
  const channels = def.ch.map((c) => {
    const p = parsePattern(c.pat);
    return { inst: c.inst, vol: c.vol ?? 0.3, send: c.send ?? 0, events: p.events, total: p.total };
  });
  return { channels, drums: def.drums || '', drumVol: def.drumVol ?? 0.7 };
}

/**
 * 曲定義の整合性を検査する(各チャンネルの総ステップ数が曲長と一致するか)。
 * @param {string} name 曲名
 * @param {object} def 曲定義
 * @returns {string[]} エラーメッセージ配列(空なら正常)
 */
export function validateSong(name, def) {
  const errs = [];
  for (const [i, c] of def.ch.entries()) {
    const p = parsePattern(c.pat);
    if (p.total !== def.steps) errs.push(`${name} ch${i}(${c.inst}): ${p.total} != ${def.steps}`);
  }
  if (def.drums && def.steps % def.drums.length !== 0) errs.push(`${name} drums長 ${def.drums.length} は ${def.steps} の約数でない`);
  return errs;
}

// ---------------------------------------------------------------- 作曲用ヘルパー

/**
 * 和音のピッチクラス列から、指定オクターブ起点で上方向に積んだ音名配列を作る。
 * @param {string[]} pcs ピッチクラス名の配列(例: ['A','C','E'])
 * @param {number} oct 先頭音のオクターブ
 * @returns {string[]} 音名配列
 */
function voicing(pcs, oct) {
  const out = [];
  let prev = noteToMidi(`${pcs[0]}${oct}`);
  out.push(midiToNote(prev));
  for (let i = 1; i < pcs.length; i++) {
    let m = noteToMidi(`${pcs[i]}${oct}`);
    while (m <= prev) m += 12;
    out.push(midiToNote(m));
    prev = m;
  }
  return out;
}

/**
 * 音名を半音単位で移調する。
 * @param {string} note 音名
 * @param {number} semis 半音数
 * @returns {string} 移調後の音名
 */
const tr = (note, semis) => midiToNote(noteToMidi(note) + semis);

/** コード名→構成音(ピッチクラス)の表。 */
const CHORDS = {
  Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], E: ['E', 'G#', 'B'],
  Dm: ['D', 'F', 'A'], Em: ['E', 'G', 'B'], D: ['D', 'F#', 'A'], B: ['B', 'D#', 'F#'], Bb: ['Bb', 'D', 'F'],
  Gm: ['G', 'Bb', 'D'], A: ['A', 'C#', 'E'], Cm: ['C', 'Eb', 'G'], Ab: ['Ab', 'C', 'Eb'], Fm: ['F', 'Ab', 'C'],
};

/**
 * コード進行から1小節ごとのベースラインを展開する。
 * R=根音 O=1オクターブ上 F=5度上 をリズム文字列内で置換する。
 * @param {string[]} progs コード名の配列(1小節1コード)
 * @param {string} rhythm 1小節分のリズム(例: "R:2 R:2 O:2 ...")
 * @param {number} oct 根音のオクターブ
 * @returns {string} パターン文字列
 */
function bassline(progs, rhythm, oct) {
  return progs.map((p) => {
    const root = `${CHORDS[p][0]}${oct}`;
    return rhythm.replace(/\b([ROF]):/g, (_, k) => `${k === 'R' ? root : k === 'O' ? tr(root, 12) : tr(root, 7)}:`);
  }).join(' ');
}

/**
 * コード進行から1小節ごとのアルペジオを展開する。order内の-1は休符。
 * @param {string[]} progs コード名の配列
 * @param {number[]} order 16ステップ分の音インデックス(0..3、-1=休符)
 * @param {number} oct 起点オクターブ
 * @returns {string} パターン文字列
 */
function arpeggio(progs, order, oct) {
  return progs.map((p) => {
    const v = voicing(CHORDS[p], oct);
    v.push(tr(v[0], 12));
    return order.map((i) => (i < 0 ? '-:1' : `${v[i]}:1`)).join(' ');
  }).join(' ');
}

/**
 * コード進行から1小節ごとの和音パターンを展開する。rhythm内のCを和音に置換。
 * @param {string[]} progs コード名の配列
 * @param {string} rhythm 1小節分のリズム
 * @param {number} oct 起点オクターブ
 * @returns {string} パターン文字列
 */
function chordPattern(progs, rhythm, oct) {
  return progs.map((p) => rhythm.replace(/\bC:/g, `${voicing(CHORDS[p], oct).join('+')}:`)).join(' ');
}

/**
 * コード進行から、1コードあたりsteps分の持続和音(パッド)を展開する。
 * @param {string[]} progs コード名の配列
 * @param {number} steps 1コードの長さ(ステップ)
 * @param {number} oct 起点オクターブ
 * @returns {string} パターン文字列
 */
function pads(progs, steps, oct) {
  return progs.map((p) => `${voicing(CHORDS[p], oct).join('+')}:${steps}`).join(' ');
}

const A_ORDER = [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 3, 1, 2];
const DRIP = [0, -1, 1, -1, 2, -1, -1, 1, 0, -1, 2, -1, 3, -1, 1, -1];

// ---------------------------------------------------------------- 曲データ

const S1A = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'];
const S1B = ['Dm', 'Dm', 'F', 'G', 'Am', 'F', 'E', 'E'];
const S1 = [...S1A, ...S1B];

const S2A = ['Em', 'Em', 'F', 'F', 'Em', 'Em', 'Dm', 'B'];
const S2B = ['Am', 'Am', 'F', 'F', 'Em', 'Em', 'F', 'B'];
const S2 = [...S2A, ...S2B];

const S3A = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'D'];
const S3B = ['Am', 'Am', 'B', 'B', 'C', 'D', 'Em', 'B'];
const S3 = [...S3A, ...S3B];

const BOSS = ['Cm', 'Cm', 'Ab', 'G', 'Cm', 'Cm', 'Fm', 'G'];
const END = ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'];

/** 全曲の定義。 */
export const SONGS = {
  // タイトル: 暗く静かなシンセ
  title: {
    bpm: 92, steps: 128,
    ch: [
      { inst: 'pad', vol: 0.16, send: 0.35, pat: 'D3+A3+F4:32 Bb2+F3+D4:32 G2+D3+Bb3:32 A2+E3+C#4:32' },
      { inst: 'bass', vol: 0.3, pat: bassline(['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A'], 'R:3 R:1 R:2 R:2 R:3 R:1 R:2 R:2', 2) },
      { inst: 'pulse12', vol: 0.1, send: 0.4, pat: arpeggio(['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A'], [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 1], 4) },
      {
        inst: 'lead', vol: 0.16, send: 0.45,
        pat: '-:4 A4:4 D5:6 F5:2 E5:4 D5:4 C5:8 D5:4 F5:4 Bb5:6 A5:2 F5:8 D5:8 G5:4 F5:4 D5:4 Bb4:4 A4:8 D5:8 E5:6 C#5:2 E5:4 A5:4 G5:6 E5:2 C#5:4 E5:4',
      },
    ],
    drums: 'k.h.s.h.k.h.s.hH', drumVol: 0.5,
  },

  // ステージ1: 疾走感のある英雄的なテーマ
  stage1: {
    bpm: 142, steps: 256,
    ch: [
      { inst: 'bass', vol: 0.3, pat: bassline(S1A, 'R:2 R:2 O:2 R:2 R:2 R:2 O:2 R:2', 2) + ' ' + bassline(S1B, 'R:1 R:1 R:2 O:2 R:2 R:1 R:1 R:2 O:2 R:2', 2) },
      { inst: 'pulse25', vol: 0.09, send: 0.3, pat: arpeggio(S1, A_ORDER, 4) },
      { inst: 'pad', vol: 0.1, send: 0.3, pat: pads(S1, 16, 3) },
      {
        inst: 'brass', vol: 0.15, send: 0.25,
        pat: [
          'A4:2 C5:2 E5:4 A5:4 G5:2 E5:2', 'F5:2 E5:2 C5:4 A4:4 C5:4', 'E5:2 G5:2 C6:4 B5:4 G5:2 E5:2', 'D5:4 G5:4 B5:4 A5:2 G5:2',
          'A4:2 C5:2 E5:4 A5:4 C6:4', 'A5:4 G5:2 F5:2 E5:4 C5:4', 'D5:2 E5:2 G5:4 B5:4 D6:4', 'E5:4 G#5:4 B5:4 E6:2 D6:2',
          'D5:4 F5:4 A5:4 G5:2 F5:2', 'E5:4 D5:4 F5:8', 'C5:2 F5:2 A5:4 C6:4 A5:4', 'B5:4 A5:2 G5:2 D5:8',
          'E5:4 A5:4 C6:4 B5:2 A5:2', 'A5:4 F5:4 C5:4 A4:4', 'G#5:4 B5:4 E6:8', 'D6:2 B5:2 G#5:2 E5:2 B4:8',
        ].join(' '),
      },
    ],
    drums: ('k.h.s.h.k.hks.h. '.repeat(3) + 'k.h.s.h.ksksttss ').replace(/ /g, '').repeat(4), drumVol: 0.75,
  },

  // ステージ2: 不気味で粘つくような有機的テーマ
  stage2: {
    bpm: 108, steps: 256,
    ch: [
      { inst: 'bass', vol: 0.3, pat: bassline(S2, 'R:3 R:3 R:2 R:3 R:3 R:2', 2) },
      { inst: 'pad', vol: 0.14, send: 0.4, pat: pads(S2, 16, 3) },
      { inst: 'pulse12', vol: 0.09, send: 0.5, pat: arpeggio(S2, DRIP, 4) },
      {
        inst: 'bell', vol: 0.13, send: 0.55,
        pat: [
          'E5:6 G5:2 B5:4 -:4', 'A5:4 G5:4 E5:8', 'F5:6 A5:2 C6:4 -:4', 'B5:4 A5:4 F5:8',
          'E5:6 G5:2 B5:4 D6:4', 'C6:4 B5:4 G5:4 E5:4', 'D5:4 F5:4 A5:4 G5:4', 'F#5:4 D#5:4 B4:8',
          'A5:6 C6:2 E6:4 -:4', 'D6:4 C6:4 A5:8', 'A5:4 C6:4 F6:8', 'E6:4 C6:4 A5:8',
          'B5:4 G5:4 E5:4 G5:4', 'B5:8 E6:8', 'C6:4 A5:4 F5:4 A5:4', 'D#6:4 B5:4 F#5:8',
        ].join(' '),
      },
    ],
    drums: 'k.......h...s...k.k.....h...s.hh', drumVol: 0.6,
  },

  // ステージ3: 重く攻撃的なインダストリアル
  stage3: {
    bpm: 150, steps: 256,
    ch: [
      { inst: 'bass', vol: 0.3, pat: bassline(S3, 'R:1 R:1 O:1 R:1 R:1 O:1 R:1 R:1 R:1 R:1 O:1 R:1 R:1 O:1 R:1 O:1', 2) },
      { inst: 'brass', vol: 0.09, send: 0.2, pat: chordPattern(S3, 'C:2 -:1 C:1 -:2 C:2 -:2 C:2 -:2 C:1 -:1', 3) },
      { inst: 'pulse12', vol: 0.07, send: 0.3, pat: arpeggio(S3, A_ORDER, 5) },
      {
        inst: 'lead', vol: 0.15, send: 0.3,
        pat: [
          'E5:2 -:2 E5:2 G5:2 B5:4 A5:2 G5:2', 'E5:2 -:2 E5:2 G5:2 A5:4 G5:4', 'C5:2 -:2 C5:2 E5:2 G5:4 F5:2 E5:2', 'D5:2 -:2 D5:2 F#5:2 A5:4 B5:2 A5:2',
          'B5:2 -:2 B5:2 D6:2 E6:4 D6:2 B5:2', 'B5:2 -:2 G5:2 A5:2 B5:8', 'E6:2 -:2 E6:2 D6:2 C6:4 B5:4', 'A5:2 -:2 A5:2 F#5:2 D5:8',
          'A5:4 C6:4 E6:4 D6:2 C6:2', 'B5:4 A5:4 E5:8', 'B5:4 D#6:4 F#6:4 E6:2 D#6:2', 'C#6:4 B5:4 F#5:8',
          'G5:4 E6:4 G6:4 F6:2 E6:2', 'A5:4 D6:4 F#6:4 E6:2 D6:2', 'E6:4 B5:4 G5:4 B5:4', 'D#6:4 F#6:4 B6:8',
        ].join(' '),
      },
    ],
    drums: ('k.h.s.h.k.k.s.h. '.repeat(3) + 'k.k.s.s.ksksttss ').replace(/ /g, '').repeat(4), drumVol: 0.8,
  },

  // ボス戦: 緊迫したテンポの速い曲
  boss: {
    bpm: 168, steps: 128,
    ch: [
      { inst: 'bass', vol: 0.3, pat: bassline(BOSS, 'R:1 R:1 O:1 R:1 R:1 O:1 R:1 R:1 R:1 R:1 O:1 R:1 O:1 R:1 O:1 R:1', 2) },
      { inst: 'pulse12', vol: 0.08, send: 0.25, pat: arpeggio(BOSS, [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3], 4) },
      { inst: 'pad', vol: 0.09, send: 0.2, pat: pads(BOSS, 16, 3) },
      {
        inst: 'brass', vol: 0.15, send: 0.2,
        pat: [
          'C5:3 C5:3 Eb5:2 G5:4 F5:2 Eb5:2', 'D5:3 D5:3 F5:2 Ab5:4 G5:4', 'Ab4:3 Ab4:3 C5:2 Eb5:4 D5:2 C5:2', 'G4:3 G4:3 B4:2 D5:4 F5:4',
          'C6:4 Bb5:2 G5:2 Eb5:4 G5:4', 'C6:4 D6:2 Eb6:2 G6:8', 'F5:4 Ab5:4 C6:4 Bb5:2 Ab5:2', 'G5:4 B5:4 D6:4 F6:2 D6:2',
        ].join(' '),
      },
    ],
    drums: 'k.kks.k.k.kks.ks', drumVol: 0.85,
  },

  // ステージクリア ジングル
  clear: {
    bpm: 130, steps: 48, loop: false,
    ch: [
      { inst: 'brass', vol: 0.18, send: 0.3, pat: 'C5:2 E5:2 G5:2 C6:6 G5:2 C6:2 D5:2 F5:2 A5:2 D6:6 A5:2 D6:2 E6:2 D6:2 C6:2 G5:2 C6:8' },
      { inst: 'bass', vol: 0.3, pat: 'C2:4 C2:4 C3:4 C2:4 D2:4 D2:4 D3:4 D2:4 G1:4 G2:4 C2:8' },
      { inst: 'pad', vol: 0.12, send: 0.3, pat: 'C3+E3+G3:16 D3+F3+A3:16 C3+E3+G3+C4:16' },
    ],
    drums: 'k.h.s.h.k.h.s.hk', drumVol: 0.6,
  },

  // ゲームオーバー ジングル
  gameover: {
    bpm: 80, steps: 32, loop: false,
    ch: [
      { inst: 'lead', vol: 0.16, send: 0.5, pat: 'E5:6 D5:2 C5:6 B4:2 A4:16' },
      { inst: 'pad', vol: 0.14, send: 0.4, pat: 'A2+E3+C4:32' },
    ],
  },

  // エンディング: 穏やかで希望のあるテーマ
  ending: {
    bpm: 100, steps: 128,
    ch: [
      { inst: 'pad', vol: 0.14, send: 0.4, pat: pads(END, 16, 3) },
      { inst: 'bass', vol: 0.26, pat: bassline(END, 'R:4 R:2 R:2 R:4 O:2 R:2', 2) },
      { inst: 'pulse25', vol: 0.07, send: 0.4, pat: arpeggio(END, A_ORDER, 4) },
      {
        inst: 'epiano', vol: 0.15, send: 0.4,
        pat: [
          'E5:4 G5:4 C6:8', 'D6:4 B5:4 G5:8', 'C6:4 A5:4 E5:8', 'A5:4 C6:4 F6:8',
          'G5:6 E5:2 C5:4 E5:4', 'D5:6 G5:2 B5:8', 'E5:4 A5:4 C6:4 B5:4', 'A5:4 G5:4 C6:8',
        ].join(' '),
      },
    ],
    drums: 'k...h...s...h...', drumVol: 0.35,
  },
};
