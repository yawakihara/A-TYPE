/**
 * WebGL post-processing for the final image.
 *  - two-level bloom (bright pass -> separable gaussian at 1/4 and 1/8 res)
 *  - shockwave refraction rings, chromatic aberration, flash, colour grade, vignette, grain
 *  - ARCADE mode: sharp-bilinear upscale + CRT (scanlines, aperture mask, curvature)
 *  - letterbox sides filled with a dimmed, heavily blurred continuation of the picture
 */
const VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
`;

const FS_BRIGHT = `${HEADER}
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThreshold;
void main() {
  vec3 c = texture2D(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = smoothstep(uThreshold, uThreshold + 0.3, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const FS_DOWN = `${HEADER}
uniform sampler2D uTex;
uniform vec2 uTexel;
void main() {
  vec3 c = texture2D(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c * 0.25, 1.0);
}`;

const FS_BLUR = `${HEADER}
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 0.2270270270;
  c += texture2D(uTex, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(uTex, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(uTex, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  c += texture2D(uTex, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const FS_FINAL = `${HEADER}
uniform sampler2D uScene;
uniform sampler2D uBloomA;
uniform sampler2D uBloomB;
uniform sampler2D uAmbTex;
uniform vec4 uView;      // game rect in framebuffer px (x, y from bottom, w, h)
uniform vec2 uScreen;    // framebuffer size
uniform vec2 uSceneRes;  // scene texture size in px
uniform vec2 uGameRes;   // logical resolution
uniform float uArcade;
uniform float uCrt;
uniform float uBloom;
uniform float uAberr;
uniform float uFlash;
uniform vec3 uFlashCol;
uniform float uTime;
uniform vec3 uTint;
uniform float uSat;
uniform float uContrast;
uniform float uVignette;
uniform float uGrain;
uniform float uAmbient;
uniform vec4 uWaves[4];

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 sampleScene(vec2 uv) {
  if (uArcade > 0.5) {
    vec2 texel = uv * uSceneRes;
    vec2 scale = max(uView.zw / uSceneRes, vec2(1.0));
    vec2 tf = floor(texel);
    vec2 s = fract(texel);
    vec2 range = 0.5 - 0.5 / scale;
    vec2 cd = s - 0.5;
    vec2 f = (cd - clamp(cd, -range, range)) * scale + 0.5;
    return texture2D(uScene, (tf + f) / uSceneRes).rgb;
  }
  return texture2D(uScene, uv).rgb;
}

void main() {
  vec2 p = vUv * uScreen;
  vec2 g = (p - uView.xy) / uView.zw;
  float crt = uCrt;
  if (crt > 0.0) {
    vec2 c = g * 2.0 - 1.0;
    float k = 0.045 * crt;
    c *= 1.0 + k * vec2(c.y * c.y, c.x * c.x);
    g = c * 0.5 + 0.5;
  }
  float aspect = uGameRes.x / uGameRes.y;
  // shockwave refraction
  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    if (w.w != 0.0) {
      vec2 d = g - w.xy;
      d.x *= aspect;
      float r = length(d);
      float diff = r - w.z;
      float ring = exp(-diff * diff * 900.0);
      if (r > 0.0001) {
        vec2 n = d / r;
        n.x /= aspect;
        g -= n * ring * w.w * 0.025;
      }
    }
  }
  bool inside = g.x >= 0.0 && g.x <= 1.0 && g.y >= 0.0 && g.y <= 1.0;
  vec3 col;
  if (inside) {
    vec2 uv = vec2(g.x, 1.0 - g.y);
    if (uAberr > 0.001) {
      vec2 dir = (g - 0.5) * uAberr * 0.012;
      dir.y = -dir.y;
      col.r = sampleScene(uv + dir).r;
      col.g = sampleScene(uv).g;
      col.b = sampleScene(uv - dir).b;
    } else {
      col = sampleScene(uv);
    }
    vec3 bA = texture2D(uBloomA, uv).rgb;
    vec3 bB = texture2D(uBloomB, uv).rgb;
    col += (bA * 0.9 + bB * 1.1) * uBloom;
    // grade
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(l), col, uSat);
    col = (col - 0.5) * uContrast + 0.5;
    col *= uTint;
    if (crt > 0.0) {
      float line = 0.5 + 0.5 * cos(g.y * uGameRes.y * 6.2831853);
      col *= mix(1.0, 0.62 + 0.38 * line, 0.55 * crt);
      float m = mod(gl_FragCoord.x, 3.0);
      vec3 mask = vec3(m < 1.0 ? 1.0 : 0.82, (m >= 1.0 && m < 2.0) ? 1.0 : 0.82, m >= 2.0 ? 1.0 : 0.82);
      col *= mix(vec3(1.0), mask, 0.45 * crt);
      col *= 1.0 + 0.18 * crt;
      vec2 e = abs(g - 0.5) * 2.0;
      float edge = smoothstep(1.0, 0.96, max(e.x, e.y));
      col *= edge;
    }
    vec2 vg = g - 0.5;
    col *= 1.0 - uVignette * dot(vg, vg) * 1.6;
  } else {
    // ambient side fill: blurred continuation of the picture, heavily dimmed
    vec2 cg = clamp(g, vec2(0.0), vec2(1.0));
    vec3 a = texture2D(uAmbTex, vec2(cg.x, 1.0 - cg.y)).rgb;
    vec3 a2 = texture2D(uBloomA, vec2(clamp(cg.x, 0.02, 0.98), 1.0 - cg.y)).rgb;
    float dx = g.x < 0.0 ? -g.x : g.x - 1.0;
    float dy = g.y < 0.0 ? -g.y : (g.y > 1.0 ? g.y - 1.0 : 0.0);
    float fade = exp(-max(dx, dy) * 7.0);
    col = (a * 1.2 + a2 * 0.4) * uAmbient * fade;
  }
  col = mix(col, uFlashCol, uFlash);
  col += (hash(p + fract(uTime) * 91.7) - 0.5) * uGrain;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`shader: ${log}`);
  }
  return s;
}

function program(gl, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(p)}`);
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const name = info.name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

export class PostFX {
  constructor(canvas) {
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    this.canvas = canvas;
    this.progBright = program(gl, FS_BRIGHT);
    this.progDown = program(gl, FS_DOWN);
    this.progBlur = program(gl, FS_BLUR);
    this.progFinal = program(gl, FS_FINAL);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.scene = this.makeTex();
    this.targets = null;
    this.sceneW = 0;
    this.sceneH = 0;
    this.lost = false;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
  }

  makeTex() {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  makeTarget(w, h) {
    const gl = this.gl;
    const tex = this.makeTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, w, h };
  }

  ensureTargets(sw, sh) {
    if (this.targets && this.sceneW === sw && this.sceneH === sh) return;
    const gl = this.gl;
    if (this.targets) {
      for (const t of Object.values(this.targets)) {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fb);
      }
    }
    this.sceneW = sw;
    this.sceneH = sh;
    // bloom buffers are sized from the logical-ish resolution so cost is stable across modes
    const qw = Math.max(48, Math.round(sw / Math.max(1, Math.round(sw / 432))));
    const qh = Math.max(30, Math.round((qw * sh) / sw));
    const ew = Math.max(24, Math.round(qw / 2));
    const eh = Math.max(15, Math.round(qh / 2));
    this.targets = {
      a: this.makeTarget(qw, qh),
      b: this.makeTarget(qw, qh),
      c: this.makeTarget(ew, eh),
      d: this.makeTarget(ew, eh),
      e: this.makeTarget(ew, eh),
    };
  }

  pass(prog, target, setup) {
    const gl = this.gl;
    gl.useProgram(prog.p);
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
      gl.viewport(0, 0, target.w, target.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    setup(prog.u);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  bind(unit, tex, loc) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  }

  /**
   * @param {HTMLCanvasElement} src scene canvas
   * @param {object} p parameters (view rect, flags, effect intensities)
   */
  render(src, p) {
    if (this.lost) return;
    const gl = this.gl;
    const sw = src.width;
    const sh = src.height;
    this.ensureTargets(sw, sh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.scene);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const T = this.targets;
    const bloomOn = p.bloom > 0.001;
    if (bloomOn || p.ambient > 0) {
      this.pass(this.progBright, T.a, (u) => {
        this.bind(0, this.scene, u.uTex);
        gl.uniform2f(u.uTexel, 0.5 / T.a.w, 0.5 / T.a.h);
        gl.uniform1f(u.uThreshold, p.threshold);
      });
      this.pass(this.progBlur, T.b, (u) => {
        this.bind(0, T.a.tex, u.uTex);
        gl.uniform2f(u.uDir, 1 / T.a.w, 0);
      });
      this.pass(this.progBlur, T.a, (u) => {
        this.bind(0, T.b.tex, u.uTex);
        gl.uniform2f(u.uDir, 0, 1 / T.a.h);
      });
      // wide bloom level: downsample the thresholded quarter-res buffer
      this.pass(this.progDown, T.c, (u) => {
        this.bind(0, T.a.tex, u.uTex);
        gl.uniform2f(u.uTexel, 0.5 / T.c.w, 0.5 / T.c.h);
      });
      for (let i = 0; i < 2; i++) {
        this.pass(this.progBlur, T.d, (u) => {
          this.bind(0, T.c.tex, u.uTex);
          gl.uniform2f(u.uDir, (1.5 + i) / T.c.w, 0);
        });
        this.pass(this.progBlur, T.c, (u) => {
          this.bind(0, T.d.tex, u.uTex);
          gl.uniform2f(u.uDir, 0, (1.5 + i) / T.c.h);
        });
      }
    }
    // letterbox ambience: a heavily blurred copy of the *whole* picture (only when bars exist)
    if (p.ambient > 0 && (p.viewX > 2 || p.viewY > 2)) {
      this.pass(this.progDown, T.e, (u) => {
        this.bind(0, this.scene, u.uTex);
        gl.uniform2f(u.uTexel, 0.5 / T.e.w, 0.5 / T.e.h);
      });
      for (let i = 0; i < 2; i++) {
        this.pass(this.progBlur, T.d, (u) => {
          this.bind(0, T.e.tex, u.uTex);
          gl.uniform2f(u.uDir, (2 + i) / T.e.w, 0);
        });
        this.pass(this.progBlur, T.e, (u) => {
          this.bind(0, T.d.tex, u.uTex);
          gl.uniform2f(u.uDir, 0, (2 + i) / T.e.h);
        });
      }
    }
    this.pass(this.progFinal, null, (u) => {
      this.bind(0, this.scene, u.uScene);
      this.bind(1, T.a.tex, u.uBloomA);
      this.bind(2, T.c.tex, u.uBloomB);
      this.bind(3, T.e.tex, u.uAmbTex);
      const H = this.canvas.height;
      gl.uniform4f(u.uView, p.viewX, H - p.viewY - p.viewH, p.viewW, p.viewH);
      gl.uniform2f(u.uScreen, this.canvas.width, H);
      gl.uniform2f(u.uSceneRes, sw, sh);
      gl.uniform2f(u.uGameRes, p.gameW, p.gameH);
      gl.uniform1f(u.uArcade, p.arcade ? 1 : 0);
      gl.uniform1f(u.uCrt, p.crt);
      gl.uniform1f(u.uBloom, bloomOn ? p.bloom : 0);
      gl.uniform1f(u.uAberr, p.aberr);
      gl.uniform1f(u.uFlash, p.flash);
      gl.uniform3f(u.uFlashCol, p.flashCol[0], p.flashCol[1], p.flashCol[2]);
      gl.uniform1f(u.uTime, p.time);
      gl.uniform3f(u.uTint, p.tint[0], p.tint[1], p.tint[2]);
      gl.uniform1f(u.uSat, p.sat);
      gl.uniform1f(u.uContrast, p.contrast);
      gl.uniform1f(u.uVignette, p.vignette);
      gl.uniform1f(u.uGrain, p.grain);
      gl.uniform1f(u.uAmbient, p.ambient);
      const w = new Float32Array(16);
      for (let i = 0; i < 4; i++) {
        const s = p.waves[i];
        if (s) {
          w[i * 4] = s.x;
          w[i * 4 + 1] = s.y;
          w[i * 4 + 2] = s.r;
          w[i * 4 + 3] = s.s;
        }
      }
      gl.uniform4fv(u.uWaves, w);
    });
  }
}
