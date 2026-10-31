/** Logical screen width (px). The arcade playfield proportion of the genre's classic boards. */
export const W = 384;
/** Logical screen height including the HUD strip. */
export const H = 240;
/** Playfield height; the HUD occupies [PH, H). */
export const PH = 224;
/** HUD strip height. */
export const HUD_H = H - PH;
/** Logic rate. */
export const FPS = 60;

/** Difficulty presets. */
export const DIFFICULTIES = [
  {
    id: 'casual',
    lives: 5,
    bullet: 0.78, // enemy bullet speed multiplier
    fire: 1.45, // enemy fire interval multiplier (bigger = less fire)
    hp: 0.85,
    keepPod: true, // keep a level-1 pod after a miss
    revenge: false,
    rollback: true,
  },
  {
    id: 'arcade',
    lives: 3,
    bullet: 1.0,
    fire: 1.0,
    hp: 1.0,
    keepPod: false,
    revenge: false,
    rollback: true,
  },
  {
    id: 'veteran',
    lives: 3,
    bullet: 1.22,
    fire: 0.78,
    hp: 1.15,
    keepPod: false,
    revenge: true, // enemies leave a parting shot
    rollback: true,
  },
];

/** Score thresholds for extra lives (after the list: every EXTEND_EVERY). */
export const EXTENDS = [50000, 150000];
export const EXTEND_EVERY = 150000;

/** Ship speed per gear (px/frame). */
export const SHIP_SPEEDS = [1.3, 1.8, 2.3, 2.8];

/** Beam charge frames for a full meter. */
export const CHARGE_FULL = 96;
/** Minimum charge (frames) for the release to fire a beam. */
export const CHARGE_MIN = 18;

/** Storage keys. */
export const STORE = {
  cfg: 'aegislance.cfg.v1',
  scores: 'aegislance.scores.v1',
  progress: 'aegislance.progress.v1',
  medals: 'aegislance.medals.v1',
};

/* global __BUILD__ */
export const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : { version: 'dev', date: '' };
