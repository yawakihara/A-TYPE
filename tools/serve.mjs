// ローカル確認用の静的ファイルサーバー。使い方: node tools/serve.mjs [port]
// 検証ページから結果を受け取るため、POST /report/<名前> を一時フォルダーへ保存する。
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8123);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (req.method === 'POST' && url.startsWith('/report/')) {
    const name = url.slice('/report/'.length).replace(/[^a-zA-Z0-9_-]/g, '');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      fs.writeFileSync(path.join(os.tmpdir(), `voidlance-report-${name}.json`), Buffer.concat(chunks));
      res.writeHead(204);
      res.end();
    });
    return;
  }
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log(`http://localhost:${port}/`));
