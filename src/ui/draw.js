/** Shared UI drawing: menu backdrop, panels, headers, footers. */
import { W, H, PH } from '../config.js';
import { text } from '../gfx/font.js';
import { makeBackground } from '../game/backgrounds.js';

/** Animated space backdrop shared by menus (owns a fake camera). */
export class Backdrop {
  constructor(kind = 'title') {
    this.bg = makeBackground(kind);
    this.fake = { camX: 0, t: 0, dx: 0.4 };
  }

  update() {
    this.fake.t++;
    this.fake.camX += 0.4;
  }

  draw(r) {
    r.camX = this.fake.camX;
    this.bg.draw(r, this.fake);
    r.screen();
  }
}

export function panel(r, x, y, w, h, alpha = 0.72) {
  const ctx = r.ctx;
  ctx.fillStyle = `rgba(4,8,18,${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(63,240,255,0.35)';
  ctx.lineWidth = r.arcade ? 1 : 0.6;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#3ff0ff';
  const c = 6;
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.fillRect(cx - (sx < 0 ? 1 : 0), cy - (sy < 0 ? 1 : 0), c * sx, 1 * sy);
    ctx.fillRect(cx - (sx < 0 ? 1 : 0), cy - (sy < 0 ? 1 : 0), 1 * sx, c * sy);
  }
}

export function header(r, game, title, sub) {
  text(r, title, W / 2, 14, { align: 'center', font: 'ui', size: 16, weight: 800, color: '#ffffff', glow: '#3ff0ff', spacing: 3 });
  r.rect(W / 2 - 80, 34, 160, 1, '#3ff0ff', 0.6);
  if (sub) text(r, sub, W / 2, 38, { align: 'center', font: game.lang === 'ja' ? 'jp' : 'ui', size: 8, color: '#8fa0c0' });
}

export function footer(r, game, str) {
  r.rect(0, H - 14, W, 14, '#02040a', 0.75);
  text(r, str, W / 2, H - 11, { align: 'center', font: game.lang === 'ja' ? 'jp' : 'ui', size: 7.5, color: '#6f7d9c' });
}

export function fadeIn(r, t, len = 20) {
  if (t < len) r.rect(0, 0, W, H, '#000000', 1 - t / len);
}

export { W, H, PH };
