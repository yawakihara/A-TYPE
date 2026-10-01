/** 内部解像度（幅）。画面はこの解像度で描画し、整数倍で拡大表示する。 */
export const W = 384;
/** 内部解像度（高さ）。 */
export const H = 256;
/** プレイフィールドの高さ。下の16pxはHUD領域。 */
export const PLAY_H = 240;
/** 地形1列の幅(px)。 */
export const COL_W = 8;
/** 基本スクロール速度(px/frame)。 */
export const SCROLL = 0.6;
/** 論理フレームレート。 */
export const FPS = 60;

/**
 * 難易度ごとの設定。
 * bulletSpeed: 敵弾速度倍率 / fireRate: 敵の発射間隔倍率(小さいほど頻繁) / lives: 初期残機 / hp: 敵体力倍率
 */
export const DIFFICULTY = [
  { name: 'EASY', bulletSpeed: 0.8, fireRate: 1.4, lives: 4, hp: 0.8 },
  { name: 'NORMAL', bulletSpeed: 1.0, fireRate: 1.0, lives: 3, hp: 1.0 },
  { name: 'HARD', bulletSpeed: 1.25, fireRate: 0.75, lives: 3, hp: 1.2 },
];
