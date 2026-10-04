/**
 * Ending: escape through a tunnel of light, epilogue over a sunrise, staff roll with a
 * parade of the Bloom bestiary, then the final score.
 */
import { W, H, PH } from '../config.js';
import { text, wrap } from '../gfx/font.js';
import { Backdrop, footer, fadeIn } from './draw.js';
import { CREDITS } from './i18n.js';
import { formatScore, clamp, easeOutCubic } from '../core/math.js';
import { frand } from '../core/rng.js';
import { hasSprite } from '../gfx/sprites.js';

const EPILOGUE = {
  en: [
    'The heart of the Bloom has fallen silent.',
    'Across the relay network, its gardens wither into ash.',
    'The HALCYON drifts home on the solar wind, AEGIS dimming at its side —',
    'a seed that chose to shield rather than to flower.',
    'And somewhere far beyond the heliopause, something remembers the light of the LANCE.',
  ],
  ja: [
    'ブルームの心臓は、沈黙した。',
    '中継網に咲いた“庭”は、灰となって散っていく。',
    'ハルシオンは太陽風に乗って帰路につく。傍らで光を落としていくイージス――',
    '花開くことより、守ることを選んだ種子。',
    'そして太陽圏の遥か彼方で、何かが〈ランス〉の光を覚えている。',
  ],
};

export const BESTIARY = [
  ['wisp', 0, 'WISP', '浮遊偵察体'],
  ['darter', 0, 'DARTER', '突撃翼'],
  ['carrier', 0, 'CARRIER', '運搬体'],
  ['hopper', 0, 'HOPPER', '跳躍甲殻'],
  ['mite', 0, 'MITE', '群体蟲'],
  ['gunpod', 0, 'GUNPOD', '盾砲台'],
  ['sporepod', 2, 'SPOREPOD', '胞子嚢'],
  ['sentinel_core', 0, 'SENTINEL', '番人'],
  ['iris_eye', 0, 'IRIS WARDEN', '虹彩の門番'],
  ['jelly', 0, 'DRIFTER', '漂流嚢'],
  ['polyp', 2, 'POLYP', '花口'],
  ['eel_head', 0, 'BURROWER', '穿孔体'],
  ['mantis', 0, 'MANTIS', '刃脚'],
  ['brood_heart', 0, 'BROODMOTHER', '孕む母胎'],
  ['bship_turret', 0, 'DECK GUN', '甲板砲'],
  ['bship_core', 0, 'LEVIATHAN CORE', '巨鯨の核'],
  ['welder', 0, 'WELDER', '溶接機'],
  ['anvil_core', 0, 'ANVIL', '鉄鎚'],
  ['leech', 0, 'LEECH', '吸着体'],
  ['wyrm_head', 0, 'COIL WYRM', '螺旋竜'],
  ['cell', 0, 'GUARDIAN CELL', '防衛細胞'],
  ['mother_core', 0, 'BLOOM MOTHER', 'ブルームの母'],
];

export class EndingScene {
  constructor(game, session, onDone) {
    this.game = game;
    this.session = session;
    this.onDone = onDone;
    this.t = 0;
    this.bd = new Backdrop('ending');
    this.streaks = [];
    for (let i = 0; i < 140; i++) this.streaks.push({ x: frand(0, W), y: frand(0, PH), z: frand(0.2, 1) });
  }

  enter() {
    this.game.music('ending', 1.5);
  }

  update() {
    this.t++;
    this.bd.update();
    for (const s of this.streaks) {
      s.x -= 6 + s.z * 14;
      if (s.x < -40) {
        s.x = W + frand(0, 40);
        s.y = frand(0, PH);
      }
    }
    const inp = this.game.input;
    if (this.t > this.rollEnd() + 120 && inp.pressed('confirm')) this.onDone();
    if (this.t > 200 && this.t < this.rollEnd() && inp.held('fire')) this.t += 2; // hold to fast-forward
  }

  rollStart() {
    return 360 + EPILOGUE.en.length * 230 + 60;
  }

  rollEnd() {
    return this.rollStart() + (CREDITS.length * 16 + BESTIARY.length * 34 + 260) * 2.2;
  }

  draw(r) {
    const g = this.game;
    const t = this.t;
    const ctx = r.ctx;
    if (t < 360) {
      // escape tunnel
      r.screen();
      r.rect(0, 0, W, H, '#020308');
      ctx.globalCompositeOperation = 'lighter';
      for (const s of this.streaks) {
        ctx.globalAlpha = 0.3 + s.z * 0.6;
        ctx.fillStyle = s.z > 0.7 ? '#ffffff' : '#7fc8ff';
        ctx.fillRect(s.x, s.y, 10 + s.z * 40, s.z > 0.6 ? 1.2 : 0.7);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const k = clamp(t / 300, 0, 1);
      r.glow(W + 20 - k * 60, PH / 2, 60 + k * 260, '#ffffff', 0.15 + k * 0.6);
      const sx = 80 + Math.sin(t * 0.05) * 6 + k * 40;
      const sy = PH / 2 + Math.sin(t * 0.031) * 10;
      r.spr('flame', sx - 21, sy, (t >> 1) % 4, 0, 1.6, 1.2, 1, true);
      r.spr('ship', sx, sy, 0);
      if (t > 300) r.rect(0, 0, W, H, '#ffffff', (t - 300) / 60);
      return;
    }
    // calm sunrise
    this.bd.draw(r);
    r.screen();
    const lt = t - 360;
    const sunK = clamp(lt / 600, 0, 1);
    r.glow(W * 0.8, PH * 0.75, 120 + sunK * 80, '#ffb070', 0.25 + sunK * 0.35);
    const sx = 120 + lt * 0.04;
    const sy = 140 + Math.sin(t * 0.02) * 4;
    if (sx < W + 40) {
      r.spr('flame', sx - 21, sy, (t >> 2) % 4, 0, 0.8, 1, 1, true);
      r.spr('ship', sx, sy, 0);
      const a = t * 0.01;
      for (let i = 0; i < 4; i++) r.spr('podshard', sx - 22 + Math.cos(a + i * 1.57) * 6, sy + Math.sin(a + i * 1.57) * 6, 1, a + i * 1.57);
      r.spr('podcore_blue', sx - 22, sy, 1);
    }
    const lines = EPILOGUE[g.lang] || EPILOGUE.en;
    const start = this.rollStart();
    if (t < start) {
      const idx = Math.min(lines.length - 1, Math.floor(lt / 230));
      const k = lt - idx * 230;
      const a = Math.min(1, k / 30, (230 - k) / 30);
      const lns = wrap(r, lines[idx], W - 80, { font: g.lang === 'ja' ? 'jp' : 'ui', size: 10 });
      lns.forEach((ln, i) => text(r, ln, W / 2, 70 + i * 15, { align: 'center', font: g.lang === 'ja' ? 'jp' : 'ui', size: 10, color: '#ffffff', alpha: Math.max(0, a), glow: '#ffb070' }));
    } else {
      this.drawRoll(r, (t - start) / 2.2);
    }
    if (t > this.rollEnd()) {
      const k = clamp((t - this.rollEnd()) / 60, 0, 1);
      r.rect(0, 0, W, H, '#000000', k * 0.6);
      text(r, 'MISSION COMPLETE', W / 2, 70, { align: 'center', font: 'ui', size: 22, weight: 800, color: '#ffffff', alpha: k, glow: '#3ff0ff', spacing: 4 });
      text(r, formatScore(this.session.score), W / 2, 104, { align: 'center', font: 'ui', size: 16, weight: 800, color: '#ffe36b', alpha: k });
      text(r, g.L('THANK YOU FOR PLAYING', 'プレイしていただき、ありがとうございました'), W / 2, 140, { align: 'center', font: g.lang === 'ja' ? 'jp' : 'ui', size: 10, color: '#a8c8ff', alpha: k });
      if (t > this.rollEnd() + 120 && Math.floor(t / 30) % 2) footer(r, g, g.L('PRESS ENTER', 'ENTERを押してください'));
    } else if (t > start) footer(r, g, g.L('HOLD Z TO FAST-FORWARD', 'Z長押しで早送り'));
    fadeIn(r, t, 30);
  }

  drawRoll(r, k) {
    const g = this.game;
    let y = PH + 10 - k;
    for (const [a, b] of CREDITS) {
      if (y > -20 && y < PH + 10) {
        if (a) text(r, a, W / 2, y, { align: 'center', font: 'ui', size: 7.5, color: '#8fa0c0' });
        if (b) text(r, b, W / 2, y + 9, { align: 'center', font: 'ui', size: 9, color: '#ffffff' });
      }
      y += a && b ? 22 : 12;
    }
    y += 30;
    if (y > -20 && y < PH + 10) text(r, g.L('THE BLOOM', 'ブルーム生態記録'), W / 2, y, { align: 'center', font: g.lang === 'ja' ? 'jp' : 'ui', size: 11, weight: 800, color: '#ff8ab0' });
    y += 30;
    for (const [spr, f, en, ja] of BESTIARY) {
      if (!hasSprite(spr)) continue;
      if (y > -30 && y < PH + 30) {
        r.spr(spr, W / 2 - 50, y, f);
        text(r, en, W / 2 - 20, y - 8, { font: 'ui', size: 9, weight: 800, color: '#ffffff' });
        text(r, ja, W / 2 - 20, y + 3, { font: 'jp', size: 8, color: '#8fa0c0' });
      }
      y += 34;
    }
  }
}

export { easeOutCubic };
