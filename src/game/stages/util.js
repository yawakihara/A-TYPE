/** Helpers for writing stage timelines. */
import { W } from '../../config.js';

export function timeline() {
  const ev = [];
  /** Trigger when the camera reaches x. */
  const at = (x, fn) => ev.push({ at: x, fn });
  /** Object placed at world x: trigger just before it scrolls into view. */
  const place = (wx, fn, lead = 40) => ev.push({ at: wx - W - lead, wx, fn });
  /** Change scroll speed at x. */
  const scroll = (x, v) => ev.push({ at: x, scroll: v });
  /** A line of formation enemies entering from the right edge. */
  const wave = (w, kind, n, y, o = {}) => {
    const gap = o.gap ?? 20;
    for (let i = 0; i < n; i++) {
      w.spawnR(kind, 16 + i * gap, y + (o.dy || 0) * i, {
        amp: o.amp,
        freq: o.freq,
        ph: (o.ph || 0) + i * (o.phStep ?? 0.55),
        speed: o.speed,
        fireAt: o.fire && i % o.fire === 0 ? 60 + i * 10 : -1,
        ...(o.opt || {}),
      });
    }
  };
  return { ev, at, place, scroll, wave };
}
