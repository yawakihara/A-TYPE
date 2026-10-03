// 単一HTMLファイルへのビルド。使い方: node tools/build.mjs
//  - dist/index.html    : 完全なHTML。ダブルクリック(file://)でもGitHub Pagesでもそのまま遊べる
//  - dist/artifact.html : <html>/<head>/<body>を持たない断片版(ホスティング先がスケルトンを付ける場合用)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const between = (src, a, b) => {
  const i = src.indexOf(a);
  const j = src.indexOf(b);
  if (i < 0 || j < 0) throw new Error(`marker not found: ${a} / ${b}`);
  return src.slice(i + a.length, j);
};

const t0 = Date.now();
const js = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  write: false,
  legalComments: 'none',
  define: { __BUILD__: JSON.stringify({ version: pkg.version, date: new Date().toISOString().slice(0, 10) }) },
});
const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const cssSrc = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
const css = (await esbuild.transform(cssSrc, { loader: 'css', minify: true })).code.trim();

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let head = between(html, '<!--BUILD:HEAD-START-->', '<!--BUILD:HEAD-END-->');
head = head.replace(/<link rel="stylesheet" href="src\/style\.css">/, `<style>${css}</style>`);
const body = between(html, '<!--BUILD:BODY-START-->', '<!--BUILD:BODY-END-->');
const script = `<script>${code}</script>`;

const full = html
  .replace(/<!--BUILD:HEAD-START-->[\s\S]*<!--BUILD:HEAD-END-->/, head.trim())
  .replace(/<!--BUILD:BODY-START-->[\s\S]*<!--BUILD:BODY-END-->/, body.trim())
  .replace(/<!--BUILD:SCRIPT-->[\s\S]*<!--BUILD:SCRIPT-END-->/, script);

const fragment = `${head.trim()}\n${body.trim()}\n${script}\n`;

fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), full);
fs.writeFileSync(path.join(dist, 'artifact.html'), fragment);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`built in ${Date.now() - t0} ms  js=${kb(code.length)}  index.html=${kb(full.length)}`);
