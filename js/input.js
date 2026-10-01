const ACTIONS = ['up', 'down', 'left', 'right', 'fire', 'pod', 'rapid', 'start', 'pause'];

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'fire', Space: 'fire', KeyJ: 'fire', KeyX: 'pod', KeyK: 'pod', KeyC: 'rapid', KeyL: 'rapid',
  Enter: 'start', KeyP: 'pause', Escape: 'pause',
};

/** 単発キー(押した瞬間だけ処理するもの)。 */
const HOTKEYS = { KeyM: 'mute', KeyF: 'full', KeyV: 'crt' };

/**
 * キーボード・ゲームパッド・タッチを統合した入力管理。
 * 毎論理フレーム先頭で update() を呼び、down/pressed/released で参照する。
 */
export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = { up: false, down: false, left: false, right: false, fire: false, pod: false, pause: false };
    this.cur = {};
    this.prev = {};
    this.hotkeys = [];
    /** @type {null|(()=>Record<string,boolean>)} ボット入力(デモ/自動テスト用) */
    this.bot = null;
    this.gotInput = false;
    for (const a of ACTIONS) { this.cur[a] = false; this.prev[a] = false; }
  }

  /**
   * DOMイベントを登録する。
   * @param {HTMLElement} canvas 画面キャンバス
   * @param {()=>void} onFirstInput 初回操作時のコールバック(オーディオ解除用)
   * @returns {void}
   */
  attach(canvas, onFirstInput) {
    const first = () => { this.gotInput = true; onFirstInput(); };
    window.addEventListener('keydown', (e) => {
      if (KEYMAP[e.code] || HOTKEYS[e.code]) e.preventDefault();
      if (e.repeat) return;
      first();
      if (HOTKEYS[e.code]) this.hotkeys.push(HOTKEYS[e.code]);
      if (KEYMAP[e.code]) this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this._resetTouch(); });
    window.addEventListener('pointerdown', first);

    const touchRoot = document.getElementById('touch');
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (touchRoot && (coarse || 'ontouchstart' in window)) {
      touchRoot.hidden = false;
      this._bindTouch(canvas);
    }
  }

  /**
   * タッチUI(仮想スティックとボタン)を結び付ける。
   * @param {HTMLElement} canvas 画面キャンバス
   * @returns {void}
   */
  _bindTouch(canvas) {
    const stick = document.getElementById('stick');
    const knob = document.getElementById('knob');
    let sid = null;
    const setStick = (e) => {
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = r.width / 2;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const th = max * 0.28;
      this.touch.left = dx < -th; this.touch.right = dx > th;
      this.touch.up = dy < -th; this.touch.down = dy > th;
    };
    stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); setStick(e); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === sid) setStick(e); });
    const endStick = (e) => {
      if (e.pointerId !== sid) return;
      sid = null;
      knob.style.transform = '';
      this.touch.left = this.touch.right = this.touch.up = this.touch.down = false;
    };
    stick.addEventListener('pointerup', endStick);
    stick.addEventListener('pointercancel', endStick);
    const bindBtn = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); this.touch[key] = true; });
      const up = () => { this.touch[key] = false; };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    };
    bindBtn('btn-fire', 'fire');
    bindBtn('btn-pod', 'pod');
    bindBtn('btn-pause', 'pause');
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * タッチ状態をリセットする。
   * @returns {void}
   */
  _resetTouch() {
    for (const k of Object.keys(this.touch)) this.touch[k] = false;
  }

  /**
   * ゲームパッドの現在状態を読む。
   * @returns {Record<string,boolean>} 各アクションの押下状態
   */
  _pad() {
    const out = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0;
      const ay = p.axes[1] || 0;
      const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
      out.left = out.left || ax < -0.4 || b(14);
      out.right = out.right || ax > 0.4 || b(15);
      out.up = out.up || ay < -0.4 || b(12);
      out.down = out.down || ay > 0.4 || b(13);
      out.fire = out.fire || b(0) || b(5);
      out.pod = out.pod || b(2) || b(1);
      out.rapid = out.rapid || b(3) || b(4);
      out.start = out.start || b(9);
      out.pause = out.pause || b(9);
      if (out.fire || out.start) this.gotInput = true;
    }
    return out;
  }

  /**
   * 論理フレームの先頭で入力状態を確定する。
   * @returns {void}
   */
  update() {
    this.prev = this.cur;
    const next = {};
    const pad = this._pad();
    const botState = this.bot ? this.bot() : null;
    for (const a of ACTIONS) {
      let v = !!(pad[a] || this.touch[a]);
      if (botState) v = !!botState[a];
      next[a] = v;
    }
    for (const code of this.keys) {
      const a = KEYMAP[code];
      if (a && !botState) next[a] = true;
    }
    this.cur = next;
  }

  /**
   * アクションが押されているか。
   * @param {string} a アクション名
   * @returns {boolean} 押下中なら true
   */
  down(a) { return !!this.cur[a]; }

  /**
   * このフレームで押された瞬間か。
   * @param {string} a アクション名
   * @returns {boolean} 立ち上がりなら true
   */
  pressed(a) { return !!this.cur[a] && !this.prev[a]; }

  /**
   * このフレームで離された瞬間か。
   * @param {string} a アクション名
   * @returns {boolean} 立ち下がりなら true
   */
  released(a) { return !this.cur[a] && !!this.prev[a]; }

  /**
   * 溜まった単発キー(ミュート等)を取り出す。
   * @returns {string[]} ホットキー名の配列
   */
  takeHotkeys() {
    const h = this.hotkeys;
    this.hotkeys = [];
    return h;
  }

  /**
   * 方向入力を-1/0/1で返す。
   * @returns {{x:number,y:number}} 方向ベクトル
   */
  dir() {
    return {
      x: (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0),
      y: (this.down('down') ? 1 : 0) - (this.down('up') ? 1 : 0),
    };
  }
}
