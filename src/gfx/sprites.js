/**
 * Procedural sprite registry + per-scale cache.
 * Every sprite is drawn with vector calls in logical units around its anchor.
 * HD mode renders it at the device render scale; ARCADE mode renders at 1x and
 * "pixelizes" it (hard alpha, 12-bit colour, optional dark outline) so the same art
 * reads as hand-placed pixels on a period-correct board.
 */
const DEFS = new Map();

/**
 * @param {string} name
 * @param {{w:number,h:number,ox?:number,oy?:number,frames?:number,outline?:boolean|string,pixel?:boolean,draw:Function}} def
 *   w/h: logical box; ox/oy: anchor inside the box (default centre); draw(ctx, frame, info) draws around (0,0).
 */
export function defineSprite(name, def) {
  DEFS.set(name, { frames: 1, ox: def.w / 2, oy: def.h / 2, ...def });
}

export function hasSprite(name) {
  return DEFS.has(name);
}

export function spriteDef(name) {
  return DEFS.get(name);
}

export function spriteNames() {
  return [...DEFS.keys()];
}

/** Quantise to 4 bits/channel, harden alpha and optionally outline. */
export function pixelize(canvas, outline) {
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const a = d[i + 3];
    if (a < 100) {
      d[i + 3] = 0;
      continue;
    }
    // un-premultiply AA edges so they don't darken, then quantise
    const k = a < 255 ? 255 / a : 1;
    d[i] = Math.min(15, Math.round((Math.min(255, d[i] * k) / 255) * 15)) * 17;
    d[i + 1] = Math.min(15, Math.round((Math.min(255, d[i + 1] * k) / 255) * 15)) * 17;
    d[i + 2] = Math.min(15, Math.round((Math.min(255, d[i + 2] * k) / 255) * 15)) * 17;
    d[i + 3] = 255;
    solid[p] = 1;
  }
  if (outline) {
    const oc = typeof outline === 'string' ? outline : '#0a0c14';
    const n = parseInt(oc.slice(1), 16);
    const r = (n >> 16) & 255;
    const gg = (n >> 8) & 255;
    const b = n & 255;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (solid[p]) continue;
        if ((x > 0 && solid[p - 1]) || (x < w - 1 && solid[p + 1]) || (y > 0 && solid[p - w]) || (y < h - 1 && solid[p + w])) {
          const i = p * 4;
          d[i] = r;
          d[i + 1] = gg;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
}

const PAD = 3;

export class SpriteCache {
  constructor() {
    this.map = new Map();
    this.S = 1;
    this.arcade = false;
    this.glows = new Map();
    this.builds = 0;
  }

  reset(S, arcade) {
    this.map.clear();
    this.glows.clear();
    this.S = S;
    this.arcade = arcade;
  }

  get(name, frame = 0) {
    const key = frame ? `${name}#${frame}` : name;
    let e = this.map.get(key);
    if (!e) {
      e = this.build(name, frame);
      this.map.set(key, e);
    }
    return e;
  }

  build(name, frame) {
    const def = DEFS.get(name);
    if (!def) throw new Error(`unknown sprite ${name}`);
    const S = this.arcade ? 1 : this.S;
    const pad = def.pad ?? PAD;
    const cw = Math.max(1, Math.ceil((def.w + pad * 2) * S));
    const ch = Math.max(1, Math.ceil((def.h + pad * 2) * S));
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d');
    g.setTransform(S, 0, 0, S, (def.ox + pad) * S, (def.oy + pad) * S);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    def.draw(g, frame % def.frames, { S, arcade: this.arcade, name });
    if (this.arcade && def.pixel !== false) pixelize(c, def.outline);
    this.builds++;
    return { c, ox: def.ox + pad, oy: def.oy + pad, dw: cw / S, dh: ch / S };
  }

  /** White silhouette of a sprite (hit flash). */
  getWhite(name, frame = 0) {
    const key = `${name}#${frame}!w`;
    let e = this.map.get(key);
    if (!e) {
      const src = this.get(name, frame);
      const c = document.createElement('canvas');
      c.width = src.c.width;
      c.height = src.c.height;
      const g = c.getContext('2d');
      g.drawImage(src.c, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, c.width, c.height);
      e = { ...src, c };
      this.map.set(key, e);
    }
    return e;
  }

  /** Radial glow, white core fading to the colour. Arcade glows are banded. */
  glow(color, size) {
    const bucket = this.arcade ? Math.max(2, Math.round(size)) : 64;
    const key = `${color}|${bucket}`;
    let e = this.glows.get(key);
    if (e) return e;
    const S = this.arcade ? 1 : Math.min(this.S, 3);
    const R = bucket;
    const px = Math.ceil(R * 2 * S);
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    const g = c.getContext('2d');
    if (this.arcade) {
      // concentric bands for a chunky period look
      const bands = [
        [1.0, 0.18],
        [0.7, 0.35],
        [0.42, 0.7],
        [0.2, 1],
      ];
      for (const [rr, a] of bands) {
        g.globalAlpha = a;
        g.fillStyle = rr < 0.25 ? '#ffffff' : color;
        g.beginPath();
        g.arc(px / 2, px / 2, Math.max(0.5, rr * R), 0, Math.PI * 2);
        g.fill();
      }
    } else {
      const grd = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.12, color);
      grd.addColorStop(0.4, `${color}66`);
      grd.addColorStop(1, `${color}00`);
      g.fillStyle = grd;
      g.fillRect(0, 0, px, px);
    }
    e = { c, R };
    this.glows.set(key, e);
    return e;
  }
}
