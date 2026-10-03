/** Title scene (placeholder; replaced by the full attract/title later). */
import { W, H } from '../config.js';
import { text } from '../gfx/font.js';
import { Menu } from './menu.js';

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.menu = new Menu(game, [
      { label: 'START', select: () => game.startRun(game.cfg.diff) },
    ]);
  }

  update() {
    this.t++;
    this.menu.update();
  }

  draw(r) {
    r.screen();
    r.rect(0, 0, W, H, '#03050c');
    text(r, 'AEGIS LANCE', W / 2, 70, { align: 'center', font: 'ui', size: 30, weight: 800, color: '#ffffff', glow: '#3ff0ff', spacing: 3 });
    this.menu.draw(r, W / 2, 140);
  }
}
