/**
 * Text rendering.
 *  - 'pixel': original 5x7 bitmap font (cell 6x8) — HUD numbers and arcade-mode text
 *  - 'ui'   : Oxanium (HD) with Japanese fallback; in ARCADE mode ASCII falls back to the bitmap font
 *  - 'jp'   : Japanese body text (Zen Kaku Gothic New in HD, DotGothic16 in ARCADE)
 */
const GLYPHS = `
0 .###. #...# #..## #.#.# ##..# #...# .###.
1 ..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.
2 .###. #...# ....# ..##. .#... #.... #####
3 ####. ....# ....# .###. ....# ....# ####.
4 ...#. ..##. .#.#. #..#. ##### ...#. ...#.
5 ##### #.... ####. ....# ....# #...# .###.
6 .###. #.... #.... ####. #...# #...# .###.
7 ##### ....# ...#. ..#.. .#... .#... .#...
8 .###. #...# #...# .###. #...# #...# .###.
9 .###. #...# #...# .#### ....# ....# .###.
A .###. #...# #...# ##### #...# #...# #...#
B ####. #...# #...# ####. #...# #...# ####.
C .###. #...# #.... #.... #.... #...# .###.
D ####. #...# #...# #...# #...# #...# ####.
E ##### #.... #.... ####. #.... #.... #####
F ##### #.... #.... ####. #.... #.... #....
G .###. #...# #.... #.### #...# #...# .####
H #...# #...# #...# ##### #...# #...# #...#
I .###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.
J ..### ...#. ...#. ...#. #..#. #..#. .##..
K #...# #..#. #.#.. ##... #.#.. #..#. #...#
L #.... #.... #.... #.... #.... #.... #####
M #...# ##.## #.#.# #.#.# #...# #...# #...#
N #...# ##..# #.#.# #..## #...# #...# #...#
O .###. #...# #...# #...# #...# #...# .###.
P ####. #...# #...# ####. #.... #.... #....
Q .###. #...# #...# #...# #.#.# #..#. .##.#
R ####. #...# #...# ####. #.#.. #..#. #...#
S .#### #.... #.... .###. ....# ....# ####.
T ##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..
U #...# #...# #...# #...# #...# #...# .###.
V #...# #...# #...# #...# #...# .#.#. ..#..
W #...# #...# #...# #.#.# #.#.# #.#.# .#.#.
X #...# #...# .#.#. ..#.. .#.#. #...# #...#
Y #...# #...# .#.#. ..#.. ..#.. ..#.. ..#..
Z ##### ....# ...#. ..#.. .#... #.... #####
! ..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..
" .#.#. .#.#. ..... ..... ..... ..... .....
# .#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.
$ ..#.. .#### #.#.. .###. ..#.# ####. ..#..
% ##..# ##..# ...#. ..#.. .#... #..## #..##
& .##.. #..#. #.#.. .#... #.#.# #..#. .##.#
' ..#.. ..#.. ..... ..... ..... ..... .....
( ...#. ..#.. .#... .#... .#... ..#.. ...#.
) .#... ..#.. ...#. ...#. ...#. ..#.. .#...
* ..... ..#.. #.#.# .###. #.#.# ..#.. .....
+ ..... ..#.. ..#.. ##### ..#.. ..#.. .....
, ..... ..... ..... ..... ..##. ..#.. .#...
- ..... ..... ..... ##### ..... ..... .....
. ..... ..... ..... ..... ..... .##.. .##..
/ ....# ....# ...#. ..#.. .#... #.... #....
: ..... .##.. .##.. ..... .##.. .##.. .....
; ..... .##.. .##.. ..... .##.. ..#.. .#...
< ...#. ..#.. .#... #.... .#... ..#.. ...#.
= ..... ..... ##### ..... ##### ..... .....
> .#... ..#.. ...#. ....# ...#. ..#.. .#...
? .###. #...# ....# ...#. ..#.. ..... ..#..
@ .###. #...# #.### #.#.# #.### #.... .###.
[ .###. .#... .#... .#... .#... .#... .###.
] .###. ...#. ...#. ...#. ...#. ...#. .###.
^ ..#.. .#.#. #...# ..... ..... ..... .....
_ ..... ..... ..... ..... ..... ..... #####
| ..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#..
~ ..... ..... .#... #.#.# ...#. ..... .....
→ ..... ..#.. ...#. ##### ...#. ..#.. .....
← ..... ..#.. .#... ##### .#... ..#.. .....
↑ ..#.. .###. #.#.# ..#.. ..#.. ..#.. .....
↓ ..... ..#.. ..#.. ..#.. #.#.# .###. ..#..
× ..... #...# .#.#. ..#.. .#.#. #...# .....
★ ..#.. ..#.. ##### .###. .###. ##.## #...#
♪ ..##. ..#.# ..#.. ..#.. .##.. ###.. .#...
■ ..... .###. .###. .###. .###. .###. .....
▶ .#... .##.. .###. .####. .###. .##.. .#...
◀ ...#. ..##. .###. ####. .###. ..##. ...#.
© .###. #...# #.#.# ##..# #.#.# #...# .###.
· ..... ..... ..... ..#.. ..... ..... .....
— ..... ..... ..... ##### ..... ..... .....
– ..... ..... ..... .###. ..... ..... .....
⇄ ...#. ##### ...#. ..... .#... ##### .#...
… ..... ..... ..... ..... ..... ..... #.#.#
’ ..#.. ..#.. .#... ..... ..... ..... .....
`;

const MAP = new Map();
for (const line of GLYPHS.trim().split('\n')) {
  const ch = line[0];
  const rows = line.slice(2).trim().split(/\s+/);
  const bits = rows.map((r) => {
    let v = 0;
    for (let i = 0; i < 5; i++) if (r[i] === '#') v |= 1 << (4 - i);
    return v;
  });
  MAP.set(ch, bits);
}
MAP.set(' ', [0, 0, 0, 0, 0, 0, 0]);

export const CELL_W = 6;
export const CELL_H = 8;

const atlasCache = new Map();

function glyphAtlas(color, S, arcade) {
  const key = `${color}|${S}|${arcade}`;
  let a = atlasCache.get(key);
  if (a) return a;
  const chars = [...MAP.keys()];
  const scale = arcade ? 1 : S;
  const c = document.createElement('canvas');
  c.width = Math.ceil(chars.length * CELL_W * scale);
  c.height = Math.ceil(CELL_H * scale);
  const g = c.getContext('2d');
  g.fillStyle = color;
  const index = new Map();
  chars.forEach((ch, i) => {
    index.set(ch, i);
    const bits = MAP.get(ch);
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 5; x++) {
        if (bits[y] & (1 << (4 - x))) {
          const px0 = Math.round((i * CELL_W + x) * scale);
          const py0 = Math.round(y * scale);
          const px1 = Math.round((i * CELL_W + x + 1) * scale);
          const py1 = Math.round((y + 1) * scale);
          g.fillRect(px0, py0, px1 - px0, py1 - py0);
        }
      }
    }
  });
  a = { c, index, scale };
  atlasCache.set(key, a);
  return a;
}

export function clearFontCache() {
  atlasCache.clear();
}

const isAscii = (s) => /^[\x20-\x7e→←↑↓×★♪■▶◀©·—–⇄…’]*$/.test(s);

/** Characters of `str` the bitmap font cannot draw, when `str` would be rendered with it. */
export function missingPixelGlyphs(str) {
  if (!isAscii(str)) return [];
  return [...new Set([...str.toUpperCase()].filter((ch) => !MAP.has(ch)))];
}

export function pixelWidth(str, size = 1) {
  return str.length * CELL_W * size - size;
}

const UI_FONT = '"Oxanium", "Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif';
const JP_FONT_HD = '"Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif';
const JP_FONT_ARCADE = '"DotGothic16", "MS Gothic", "Osaka-Mono", monospace';

function cssFont(r, font, size, weight) {
  if (font === 'jp') return `${weight || 500} ${size}px ${r.arcade ? JP_FONT_ARCADE : JP_FONT_HD}`;
  return `${weight || 600} ${size}px ${r.arcade ? JP_FONT_ARCADE : UI_FONT}`;
}

/** Measure text in logical px. */
export function measure(r, str, opt = {}) {
  const font = opt.font || 'pixel';
  const size = opt.size || (font === 'pixel' ? 1 : 10);
  if (font === 'pixel' || (r.arcade && font === 'ui' && isAscii(str))) {
    const k = font === 'pixel' ? size : Math.max(1, Math.round(size / 8));
    return pixelWidth(str.toUpperCase(), k) + (opt.spacing || 0) * Math.max(0, str.length - 1);
  }
  const ctx = r.ctx;
  ctx.font = cssFont(r, font, size, opt.weight);
  const sp = opt.spacing || 0;
  return ctx.measureText(str).width + sp * Math.max(0, str.length - 1);
}

/**
 * Draw text.
 * opt: { font:'pixel'|'ui'|'jp', size, color, align:'left'|'center'|'right', alpha, glow, shadow, weight, spacing, baseline, maxW }
 * For the pixel font size is an integer multiplier; for others it's px height.
 * y is the top of the text line.
 */
export function text(r, str, x, y, opt = {}) {
  str = String(str);
  const font = opt.font || 'pixel';
  const color = opt.color || '#ffffff';
  const align = opt.align || 'left';
  const alpha = opt.alpha ?? 1;
  const ctx = r.ctx;
  const usePixel = font === 'pixel' || (r.arcade && font === 'ui' && isAscii(str));
  if (usePixel) {
    const k = font === 'pixel' ? opt.size || 1 : Math.max(1, Math.round((opt.size || 10) / 8));
    const s = str.toUpperCase();
    const sp = opt.spacing || 0;
    const w = pixelWidth(s, k) + sp * Math.max(0, s.length - 1);
    // squeeze horizontally if a maximum width is given and exceeded
    const sq = opt.maxW && w > opt.maxW ? opt.maxW / w : 1;
    if (sq < 1) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(sq, 1);
      ctx.translate(-x, 0);
    }
    let x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    if (r.arcade && sq === 1) x0 = Math.round(x0);
    const yy = r.arcade ? Math.round(y) : y;
    if (opt.shadow) drawPixelRun(r, s, x0 + k, yy + k, k, sp, opt.shadow === true ? '#000000' : opt.shadow, alpha * 0.8);
    if (opt.glow && !r.arcade) {
      const cx = x0 + w / 2;
      r.glow(cx, yy + 3.5 * k, Math.max(8, w * 0.6), opt.glow, 0.18 * alpha);
    }
    drawPixelRun(r, s, x0, yy, k, sp, color, alpha);
    if (sq < 1) ctx.restore();
    return w * sq;
  }
  const size = opt.size || 10;
  ctx.font = cssFont(r, font, size, opt.weight);
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  const sp = opt.spacing || 0;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${sp}px`;
  ctx.globalAlpha = alpha;
  const mw = opt.maxW || undefined;
  if (opt.shadow) {
    ctx.fillStyle = opt.shadow === true ? 'rgba(0,0,0,0.85)' : opt.shadow;
    ctx.fillText(str, x + 1, y + 1, mw);
  }
  if (opt.glow && !r.arcade) {
    ctx.shadowColor = opt.glow;
    ctx.shadowBlur = 8 * r.S;
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y, mw);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1;
  const w = ctx.measureText(str).width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  return mw ? Math.min(w, mw) : w;
}

function drawPixelRun(r, s, x, y, k, sp, color, alpha) {
  const a = glyphAtlas(color, r.S, r.arcade);
  const ctx = r.ctx;
  ctx.globalAlpha = alpha;
  const sw = CELL_W * a.scale;
  const sh = CELL_H * a.scale;
  let cx = x;
  for (let i = 0; i < s.length; i++) {
    const idx = a.index.get(s[i]);
    if (idx !== undefined && s[i] !== ' ') {
      ctx.drawImage(a.c, idx * sw, 0, sw, sh, cx, y, CELL_W * k, CELL_H * k);
    }
    cx += CELL_W * k + sp;
  }
  ctx.globalAlpha = 1;
}

/** Word-wrap for both Latin (spaces) and Japanese (per character) text. */
export function wrap(r, str, maxW, opt = {}) {
  const out = [];
  for (const para of String(str).split('\n')) {
    if (!para) {
      out.push('');
      continue;
    }
    const cjk = /[　-鿿＀-￯]/.test(para);
    const tokens = cjk ? [...para] : para.split(/(\s+)/);
    let line = '';
    for (const t of tokens) {
      const test = line + t;
      if (measure(r, test, opt) > maxW && line.trim()) {
        out.push(line.trimEnd());
        line = cjk ? t : t.trimStart();
        // keep Japanese closing punctuation on the previous line
        if (cjk && /^[、。」』）！？]$/.test(t) && out.length) {
          out[out.length - 1] += t;
          line = '';
        }
      } else {
        line = test;
      }
    }
    if (line) out.push(line.trimEnd());
  }
  return out;
}

/** Bake bitmap-font text straight into a 2D context (used inside sprite builders). */
export function bakePixelText(ctx, str, x, y, k, color, align = 'left') {
  const s = String(str).toUpperCase();
  const w = pixelWidth(s, k);
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.fillStyle = color;
  for (const ch of s) {
    const bits = MAP.get(ch);
    if (bits) {
      for (let yy = 0; yy < 7; yy++) {
        for (let xx = 0; xx < 5; xx++) {
          if (bits[yy] & (1 << (4 - xx))) ctx.fillRect(cx + xx * k, y + yy * k, k, k);
        }
      }
    }
    cx += CELL_W * k;
  }
  return w;
}
