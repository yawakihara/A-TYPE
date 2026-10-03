/** Song registry (all original compositions). */
import title from './title.js';
import stage1 from './stage1.js';
import stage2 from './stage2.js';
import stage3 from './stage3.js';
import stage4 from './stage4.js';
import stage5 from './stage5.js';
import stage6 from './stage6.js';
import boss from './boss.js';
import finalboss from './finalboss.js';
import { clear, gameover, prologue, records, ending } from './jingles.js';

export const SONGS = { title, prologue, stage1, stage2, stage3, stage4, stage5, stage6, boss, finalboss, clear, gameover, records, ending };

/** Sound-test listing with display names. */
export const SONG_LIST = [
  ['title', 'AEGIS LANCE (Main Theme)'],
  ['prologue', 'Prologue — The Bloom'],
  ['stage1', 'Derelict Gate'],
  ['stage2', 'Verdant Abyss'],
  ['stage3', 'Iron Leviathan'],
  ['stage4', 'Foundry'],
  ['stage5', "Serpent's Coil"],
  ['stage6', 'The Heart'],
  ['boss', 'Colossus'],
  ['finalboss', 'Mother of the Bloom'],
  ['clear', 'Stage Clear'],
  ['gameover', 'Game Over'],
  ['records', 'Hangar (Records)'],
  ['ending', 'Dawn (Staff Roll)'],
];
