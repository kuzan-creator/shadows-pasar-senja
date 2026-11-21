// Tiny static server for local play-testing of Shadows of Pasar Senja.
// Serves game/ at http://localhost:8080 — no build step, no network.
// Run: node serve.ts   (Node 22, standard library only)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const gameDir = join(here, 'game');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = url.pathname === '/' ? '/index.html' : url.pathname;
    if (path.includes('..')) {
      res.writeHead(400);
      res.end('bad path');
      return;
    }
    const file = join(gameDir, path);
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

const PORT = Number(process.env.PORT || 8080);
server.listen(PORT, () => {
  console.log(`Shadows of Pasar Senja at http://localhost:${PORT}`);
});
