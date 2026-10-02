import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('./app/', import.meta.url);
const files = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/style.css', 'style.css'], ['/game.js', 'game.js'], ['/race.js', 'race.js'], ['/nutanix-logo.svg', 'nutanix-logo.svg']]);
const mime = {html:'text/html', css:'text/css', js:'text/javascript', svg:'image/svg+xml'};
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'");
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  if (path === '/healthz') { res.writeHead(200); return res.end(req.method === 'HEAD' ? undefined : 'ok'); }
  if (path === '/version.json') {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
    return res.end(req.method === 'HEAD' ? undefined : JSON.stringify({version:process.env.APP_VERSION || '0.1.0', commit:process.env.APP_COMMIT || 'local', banner:process.env.DEMO_BANNER || 'Built to run anywhere. Powered by NKP.'}));
  }
  const file = files.get(path);
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  try {
    const body = await readFile(fileURLToPath(new URL(file, root)));
    res.setHeader('Content-Type', mime[file.split('.').pop()]);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Unable to load application'); }
});
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
process.on('SIGTERM', () => server.close(() => process.exit(0)));
