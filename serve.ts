// Local static development server for Sunstone Gambit (Node 22 standard library only).
// Serves game/ on http://127.0.0.1:8080 (or --port <num>) with strict path confinement.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_ROOT = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};

function parsePort(argv: string[]): number {
  const idx = argv.indexOf('--port');
  if (idx === -1) return 8080;
  const parsed = Number(argv[idx + 1]);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 8080;
}

const port = parsePort(process.argv.slice(2));

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = resolve(join(GAME_ROOT, normalize(pathname)));
  if (target !== GAME_ROOT && !target.startsWith(GAME_ROOT + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, {
      'content-type': MIME_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': 'no-store',
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Sunstone Gambit running at http://127.0.0.1:${port}`);
});
