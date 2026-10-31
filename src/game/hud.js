/**
 * Bottom HUD strip in the classic single-row arcade layout:
 * lives · speed gear · pod laser · BEAM meter · 1P score · HI score.
 */
import { W, H, PH, CHARGE_FULL, CHARGE_MIN } from '../config.js';
import { text } from '../gfx/font.js';
import { formatScore } from '../core/math.js';

const LASER = { red: '#ff6a7e', blue: '#6ab8ff', yellow: '#ffd84f' };

export function drawHUD(r, w, hi) {
  r.screen();
  const ctx = r.ctx;
  const y0 = PH;
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, '#0d1220');
  g.addColorStop(1, '#03050a');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, H - y0);
  ctx.fillStyle = '#2a3852';
  ctx.fillRect(0, y0, W, 1);
  const s = w.session;
  const p = w.player;
  const font = r.arcade ? 'pixel' : 'ui';
  const fs = r.arcade ? 1 : 7.5;
  const ty = r.arcade ? y0 + 5 : y0 + 4.2;
  const T = (str, x, col, align = 'left', glow = null) => text(r, str, x, ty, { font, size: fs, color: col, align, glow, weight: 600 });
  // lives
  if (s.infinite) T('FREE', 5, '#7a88a8');
  else {
    const lives = Math.max(0, s.lives);
    const icons = Math.min(3, lives);
    for (let i = 0; i < icons; i++) r.spr('ship', 12 + i * 13, y0 + 8.5, 0, 0, 0.36, 0.36);
    if (lives > 3) T(`×${lives}`, 44, '#cfd8ea', 'right');
  }
  // speed gear
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i > p.maxGear ? '#121925' : i <= p.gear ? '#7cffb0' : '#2c4a40';
    ctx.fillRect(49 + i * 4, y0 + 5, 3, 6);
  }
  // pod
  if (w.pod) {
    const c = LASER[w.pod.color];
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(72, y0 + 4);
    ctx.lineTo(75, y0 + 8);
    ctx.lineTo(72, y0 + 12);
    ctx.lineTo(69, y0 + 8);
    ctx.fill();
    T(String(w.pod.level), 78, c);
  }
  if (p.missiles) T(`M${p.missiles}`, 86, '#ffb070');
  // BEAM meter
  const bx = 124;
  const bw = 96;
  const by = y0 + 5;
  T('BEAM', bx - 4, '#9fb4d8', 'right');
  ctx.fillStyle = '#04070d';
  ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
  ctx.fillStyle = '#34486a';
  ctx.fillRect(bx - 1, by - 1, bw + 2, 1);
  ctx.fillRect(bx - 1, by + 6, bw + 2, 1);
  ctx.fillRect(bx - 1, by - 1, 1, 8);
  ctx.fillRect(bx + bw, by - 1, 1, 8);
  const k = p.charge / CHARGE_FULL;
  const full = k >= 1;
  if (k > 0) {
    const fw = Math.max(1, Math.round(bw * k));
    const fg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    fg.addColorStop(0, '#1468b8');
    fg.addColorStop(0.65, '#3ff0ff');
    fg.addColorStop(1, '#f0ffff');
    ctx.fillStyle = full && w.t % 8 < 4 ? '#ffffff' : fg;
    ctx.fillRect(bx, by, fw, 6);
    if (!r.arcade) r.glow(bx + fw, by + 3, full ? 14 : 7, '#7ff4ff', full ? 0.8 : 0.45);
  }
  ctx.fillStyle = 'rgba(120,150,190,0.5)';
  for (let i = 1; i < 4; i++) ctx.fillRect(bx + Math.round((bw * i) / 4), by, 1, 6);
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(bx + Math.round((bw * CHARGE_MIN) / CHARGE_FULL), by + 5, 1, 1);
  // scores
  T('1P', 230, '#ffb347');
  T(formatScore(s.score), 244, '#ffffff');
  T('HI', 300, '#7fc4ff');
  T(formatScore(Math.max(hi, s.score)), W - 4, '#d8e4f8', 'right');
}
