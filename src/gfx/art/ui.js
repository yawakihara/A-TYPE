/** UI art: the AEGIS LANCE logo and small emblem. */
import { defineSprite } from '../sprites.js';
import { bakePixelText } from '../font.js';

const LOGO_FONT = '800 40px "Oxanium", "Zen Kaku Gothic New", system-ui, sans-serif';

defineSprite('logo', {
  w: 320,
  h: 64,
  pixel: false,
  draw(ctx, f, info) {
    if (info.arcade) {
      // banded period logo from the bitmap font
      const bands = [['#ffffff', -14], ['#bfe8ff', -7], ['#5aa8e0', 0], ['#2a5a9a', 7], ['#9fd8ff', 14]];
      for (let i = 0; i < bands.length; i++) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-170, bands[i][1] - 14 + 2, 340, 7);
        ctx.clip();
        bakePixelText(ctx, 'AEGIS LANCE', 2, -12, 4, '#06101e', 'center');
        bakePixelText(ctx, 'AEGIS LANCE', 0, -14, 4, bands[i][0], 'center');
        ctx.restore();
      }
      return;
    }
    ctx.font = LOGO_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    // extrusion
    for (let i = 6; i > 0; i--) {
      ctx.fillStyle = `rgba(${8 + i * 4},${18 + i * 6},${40 + i * 8},1)`;
      ctx.fillText('AEGIS LANCE', i * 0.6, i * 0.8);
    }
    // chrome face
    const g = ctx.createLinearGradient(0, -20, 0, 20);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.32, '#cfe6ff');
    g.addColorStop(0.5, '#3a5a8a');
    g.addColorStop(0.53, '#0e1a30');
    g.addColorStop(0.75, '#6aa8e8');
    g.addColorStop(1, '#e8f6ff');
    ctx.fillStyle = g;
    ctx.fillText('AEGIS LANCE', 0, 0);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.strokeText('AEGIS LANCE', 0, 0);
    // rim glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = '#3ff0ff';
    ctx.shadowBlur = 10 * info.S;
    ctx.fillStyle = 'rgba(63,240,255,0.18)';
    ctx.fillText('AEGIS LANCE', 0, 0);
    ctx.shadowBlur = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  },
});
