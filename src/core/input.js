/**
 * Unified input: keyboard + standard-mapping gamepads + touch overlay (+ an optional bot).
 * Logic reads actions once per fixed frame via update().
 */
const KEYMAP = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  fire: ['KeyZ', 'Space', 'KeyJ'],
  pod: ['KeyX', 'KeyK'],
  rapid: ['KeyC', 'KeyL'],
  speed: ['ShiftLeft', 'ShiftRight', 'KeyV'],
  pause: ['Escape', 'KeyP', 'Enter'],
  confirm: ['Enter', 'KeyZ', 'Space', 'KeyJ', 'NumpadEnter'],
  cancel: ['Escape', 'KeyX', 'Backspace', 'KeyK'],
  mode: ['Tab', 'KeyG'],
  kit: ['KeyB'],
  mute: ['KeyM'],
  fullscreen: ['KeyF'],
};

const PAD = {
  fire: [0],
  pod: [1],
  rapid: [2],
  speed: [3, 5],
  pause: [9],
  confirm: [0, 9],
  cancel: [1],
  mode: [8],
  up: [12],
  down: [13],
  left: [14],
  right: [15],
};

export const ACTIONS = Object.keys(KEYMAP);
const TEXT_KEY = /^(Key[A-Z]|Digit[0-9]|Space)$/;

export class Input {
  constructor() {
    this.keys = new Set();
    this.down = {};
    this.prevHeld = {};
    this.repeatT = {};
    for (const a of ACTIONS) {
      this.down[a] = false;
      this.prevHeld[a] = false;
      this.repeatT[a] = 0;
    }
    this.mx = 0;
    this.my = 0;
    this.pads = [];
    this.lastDevice = 'keyboard';
    this.touch = { active: false, mx: 0, my: 0, fire: false, pod: false, rapid: false, pause: false };
    this.bot = null;
    this.locked = false;
    this.anyPressed = false;
    this.typed = [];
    this.textMode = false;
    // mouse pointer (client px) for menus
    this.px = -1;
    this.py = -1;
    this.pointerMoved = false;
    this.clickX = -1;
    this.clickY = -1;
    this.onUnlock = null;
    this.clicked = false;
  }

  attach(canvas, onFirstGesture) {
    this.canvas = canvas;
    const gesture = () => {
      if (onFirstGesture) onFirstGesture();
    };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!e.repeat) {
        this.keys.add(e.code);
        if (e.key && e.key.length === 1) this.typed.push(e.key);
        else if (e.code === 'Backspace') this.typed.push('\b');
      }
      this.lastDevice = 'keyboard';
      gesture();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('pointerdown', (e) => {
      gesture();
      if (e.pointerType === 'mouse') {
        this.clicked = true;
        this.clickX = e.clientX;
        this.clickY = e.clientY;
      }
      canvas.focus();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.px = e.clientX;
      this.py = e.clientY;
      this.pointerMoved = true;
    });
    window.addEventListener('touchstart', () => {
      this.showTouch();
      gesture();
    }, { passive: true });
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window) {
      this.showTouch();
    }
    this.bindTouch();
  }

  showTouch() {
    if (this.touchShown) return;
    const el = document.getElementById('touch');
    if (!el) return;
    el.hidden = false;
    this.touchShown = true;
    this.lastDevice = 'touch';
  }

  bindTouch() {
    const stick = document.getElementById('stick');
    const knob = document.getElementById('knob');
    if (!stick) return;
    let id = null;
    let cx = 0;
    let cy = 0;
    const R = 50;
    const move = (e) => {
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      const k = len > R ? R / len : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      const nx = (dx * k) / R;
      const ny = (dy * k) / R;
      // small dead zone, then full analog
      this.touch.mx = Math.abs(nx) < 0.18 ? 0 : nx;
      this.touch.my = Math.abs(ny) < 0.18 ? 0 : ny;
    };
    stick.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      stick.setPointerCapture(id);
      this.touch.active = true;
      move(e);
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) move(e);
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = '';
      this.touch.mx = 0;
      this.touch.my = 0;
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    const btn = (elId, key) => {
      const b = document.getElementById(elId);
      if (!b) return;
      const on = (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.touch[key] = true;
        b.classList.add('on');
      };
      const off = () => {
        this.touch[key] = false;
        b.classList.remove('on');
      };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    btn('btn-fire', 'fire');
    btn('btn-pod', 'pod');
    btn('btn-rapid', 'rapid');
    btn('btn-pause', 'pause');
  }

  keyHeld(action) {
    const codes = KEYMAP[action];
    for (let i = 0; i < codes.length; i++) {
      // in text mode (name entry) letters, digits and space type instead of acting as controls
      if (this.textMode && TEXT_KEY.test(codes[i])) continue;
      if (this.keys.has(codes[i])) return true;
    }
    return false;
  }

  pollPads() {
    let list = [];
    try {
      list = navigator.getGamepads ? navigator.getGamepads() || [] : [];
    } catch (e) {
      list = []; // blocked by a permissions policy (e.g. inside a sandboxed frame)
    }
    this.pads.length = 0;
    for (const p of list) if (p && p.connected) this.pads.push(p);
  }

  padHeld(action) {
    const idx = PAD[action];
    if (!idx) return false;
    for (const p of this.pads) {
      for (const i of idx) {
        const b = p.buttons[i];
        if (b && (b.pressed || b.value > 0.5)) return true;
      }
    }
    return false;
  }

  /** Call once per logic frame. */
  update() {
    this.pollPads();
    for (const a of ACTIONS) this.prevHeld[a] = this.down[a];
    let mx = 0;
    let my = 0;
    for (const a of ACTIONS) {
      let h = this.keyHeld(a) || this.padHeld(a);
      if (!h && this.touchShown) {
        if (a === 'fire' || a === 'confirm') h = this.touch.fire;
        else if (a === 'pod' || a === 'cancel') h = this.touch.pod;
        else if (a === 'rapid') h = this.touch.rapid;
        else if (a === 'pause') h = this.touch.pause;
      }
      this.down[a] = h;
    }
    if (this.down.left) mx -= 1;
    if (this.down.right) mx += 1;
    if (this.down.up) my -= 1;
    if (this.down.down) my += 1;
    for (const p of this.pads) {
      const ax = p.axes[0] || 0;
      const ay = p.axes[1] || 0;
      const len = Math.hypot(ax, ay);
      if (len > 0.24) {
        const k = Math.min(1, (len - 0.24) / 0.66) / len;
        mx += ax * k;
        my += ay * k;
        this.lastDevice = 'pad';
      }
      if (p.buttons.some((b) => b && b.pressed)) this.lastDevice = 'pad';
    }
    if (this.touchShown) {
      mx += this.touch.mx;
      my += this.touch.my;
      // stick directions also drive menus
      if (this.touch.my < -0.5) this.down.up = true;
      if (this.touch.my > 0.5) this.down.down = true;
      if (this.touch.mx < -0.5) this.down.left = true;
      if (this.touch.mx > 0.5) this.down.right = true;
    }
    if (this.bot) {
      const b = this.bot();
      if (b) {
        mx = b.mx || 0;
        my = b.my || 0;
        this.down.fire = !!b.fire;
        this.down.pod = !!b.pod;
        this.down.rapid = !!b.rapid;
        this.down.speed = !!b.speed;
      }
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    this.mx = mx;
    this.my = my;
    this.anyPressed = false;
    for (const a of ACTIONS) {
      if (this.down[a] && !this.prevHeld[a]) {
        this.anyPressed = true;
        this.repeatT[a] = 0;
      } else if (this.down[a]) this.repeatT[a]++;
    }
    if (this.clicked) {
      this.anyPressed = true;
    }
  }

  /** Clear per-frame one-shot data (typed characters, clicks) after the game consumed it. */
  endFrame() {
    this.typed.length = 0;
    this.clicked = false;
    this.pointerMoved = false;
  }

  held(a) {
    return this.down[a];
  }

  pressed(a) {
    return this.down[a] && !this.prevHeld[a];
  }

  released(a) {
    return !this.down[a] && this.prevHeld[a];
  }

  /** Pressed with auto-repeat, for menus. */
  repeat(a) {
    if (this.pressed(a)) return true;
    const t = this.repeatT[a];
    return this.down[a] && t >= 18 && (t - 18) % 5 === 0;
  }

  /** Force-release everything (e.g. when switching scenes) so a held key does not leak. */
  flush() {
    for (const a of ACTIONS) this.prevHeld[a] = this.down[a] = this.keyHeld(a) || this.padHeld(a);
    this.typed.length = 0;
    this.clicked = false;
    this.pointerMoved = false;
  }

  rumble(strong, weak, ms) {
    for (const p of this.pads) {
      const act = p.vibrationActuator;
      if (act && act.playEffect) {
        try {
          const pr = act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
          if (pr && pr.catch) pr.catch(() => {});
        } catch (e) {
          /* rumble unsupported */
        }
      }
    }
    if (this.lastDevice === 'touch' && navigator.vibrate && strong > 0.5) {
      try {
        navigator.vibrate(Math.min(80, ms));
      } catch (e) {
        /* vibration refused */
      }
    }
  }

  /** Glyph names for on-screen prompts, per device. */
  glyph(action) {
    const pad = this.lastDevice === 'pad';
    const touch = this.lastDevice === 'touch';
    const map = pad
      ? { fire: 'A', pod: 'B', rapid: 'X', speed: 'Y/RB', pause: 'START', confirm: 'A', cancel: 'B', mode: 'BACK' }
      : touch
        ? { fire: 'FIRE', pod: 'POD', rapid: 'RAPID', speed: '-', pause: 'II', confirm: 'FIRE', cancel: 'POD', mode: '-' }
        : { fire: 'Z', pod: 'X', rapid: 'C', speed: 'SHIFT', pause: 'ESC', confirm: 'ENTER', cancel: 'ESC', mode: 'TAB' };
    return map[action] || action.toUpperCase();
  }
}
