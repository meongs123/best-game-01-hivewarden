// HIVEWARDEN — a tiny static server for game/ (Node 22, standard library only),
// so the entry can be played locally without a build step: `node serve.mjs`
// serves game/ on http://localhost:8901. It sends the MIME types a browser game
// needs, refuses any path outside game/, and otherwise does nothing clever.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8901 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8901;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    const file = resolve(join(root, normalize(path).replace(/^(\.\.(\/|\\|$))+/, '')));
    if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); res.end('forbidden'); return; }
    const stat = statSync(file);
    if (!stat.isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'content-length': stat.size });
    createReadStream(file).pipe(res);
  } catch (_) {
    res.writeHead(404); res.end('not found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`HIVEWARDEN serving game/ on http://127.0.0.1:${port}/`));
