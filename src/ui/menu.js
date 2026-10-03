/**
 * Minimal list menu used by title/options/pause screens.
 * item: { label: string|fn, value?: fn -> string, select?: fn, left?: fn, right?: fn, disabled?: fn, hint?: string|fn }
 */
import { text, measure } from '../gfx/font.js';
import { W } from '../config.js';

export class Menu {
  constructor(game, items, opt = {}) {
    this.game = game;
    this.items = items;
    this.i = 0;
    this.opt = opt;
    this.t = 0;
    this.flash = 0;
  }

  current() {
    return this.items[this.i];
  }

  update() {
    const inp = this.game.input;
    const audio = this.game.audio;
    this.t++;
    if (this.flash > 0) this.flash--;
    const n = this.items.length;
    const enabled = (k) => !(this.items[k].disabled && this.items[k].disabled());
    if (inp.repeat('down')) {
      let k = this.i;
      do k = (k + 1) % n;
      while (!enabled(k) && k !== this.i);
      this.i = k;
      audio.sfx('menuMove');
    }
    if (inp.repeat('up')) {
      let k = this.i;
      do k = (k - 1 + n) % n;
      while (!enabled(k) && k !== this.i);
      this.i = k;
      audio.sfx('menuMove');
    }
    const it = this.items[this.i];
    if (inp.repeat('left') && it.left) {
      it.left();
      audio.sfx('menuMove');
    }
    if (inp.repeat('right') && it.right) {
      it.right();
      audio.sfx('menuMove');
    }
    if (inp.pressed('confirm') && it.select && enabled(this.i)) {
      this.flash = 10;
      audio.sfx('menuSelect');
      it.select();
      return 'select';
    }
    if (inp.pressed('confirm') && !it.select && it.right) {
      it.right();
      audio.sfx('menuMove');
    }
    if (inp.pressed('cancel') && this.opt.back) {
      audio.sfx('menuBack');
      this.opt.back();
      return 'back';
    }
    return null;
  }

  /** Draw centred list. */
  draw(r, cx, y, opt = {}) {
    const lh = opt.lh || 13;
    const size = opt.size || 10;
    const g = this.game;
    const labelOf = (it) => (typeof it.label === 'function' ? it.label() : it.label);
    let maxW = 0;
    for (const it of this.items) {
      const s = labelOf(it) + (it.value ? `   ${it.value()}` : '');
      maxW = Math.max(maxW, measure(r, s, { font: 'ui', size }));
    }
    const wBox = Math.min(W - 24, Math.max(opt.minW || 0, maxW + 40));
    this.items.forEach((it, k) => {
      const yy = y + k * lh;
      const sel = k === this.i;
      const dis = it.disabled && it.disabled();
      if (sel) {
        const ctx = r.ctx;
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.15);
        ctx.fillStyle = `rgba(63,240,255,${0.08 + pulse * 0.06 + (this.flash > 0 ? 0.25 : 0)})`;
        ctx.fillRect(cx - wBox / 2, yy - 2, wBox, lh - 1);
        ctx.fillStyle = '#3ff0ff';
        ctx.fillRect(cx - wBox / 2, yy - 2, 2, lh - 1);
        ctx.fillRect(cx + wBox / 2 - 2, yy - 2, 2, lh - 1);
      }
      const col = dis ? '#4a5468' : sel ? '#ffffff' : '#9aa8c4';
      if (it.value) {
        text(r, labelOf(it), cx - wBox / 2 + 10, yy, { font: 'ui', size, color: col });
        const v = it.value();
        const vx = cx + wBox / 2 - 10;
        text(r, v, vx, yy, { font: 'ui', size, color: sel ? '#ffe36b' : '#c8b46a', align: 'right' });
        if (sel && (it.left || it.right)) {
          const vw = measure(r, v, { font: 'ui', size });
          text(r, '◀', vx - vw - 9, yy + 1, { color: '#3ff0ff' });
          text(r, '▶', vx + 3, yy + 1, { color: '#3ff0ff' });
        }
      } else {
        text(r, labelOf(it), cx, yy, { font: 'ui', size, color: col, align: 'center', glow: sel ? '#3ff0ff' : null });
      }
    });
    const cur = this.items[this.i];
    if (cur && cur.hint && opt.hintY) {
      const h = typeof cur.hint === 'function' ? cur.hint() : cur.hint;
      text(r, h, cx, opt.hintY, { font: g.lang === 'ja' ? 'jp' : 'ui', size: 9, color: '#7f8ca8', align: 'center' });
    }
  }
}
