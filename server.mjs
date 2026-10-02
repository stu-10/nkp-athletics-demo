import { rankings, submit, InvalidEntry } from './leaderboard.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('./app/', import.meta.url);
const files = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/style.css', 'style.css'], ['/game.js', 'game.js'], ['/race.js', 'race.js'], ['/long-jump.js', 'long-jump.js'], ['/nutanix-logo.svg', 'nutanix-logo.svg']]);
const mime = {html:'text/html', css:'text/css', js:'text/javascript', svg:'image/svg+xml'};
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'");
  if (path === '/api/leaderboard') {
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    try {
      if(req.method==='GET') {
        const mode=new URL(req.url,'http://localhost').searchParams.get('mode');
        if(!['solo','versus','longjump'].includes(mode)) {res.writeHead(400);return res.end(JSON.stringify({error:'Choose a valid event.'}));}
        return res.end(JSON.stringify(rankings(mode)));
      }
      if(req.method==='POST') {
        if(!req.headers['content-type']?.startsWith('application/json')) {res.writeHead(415);return res.end(JSON.stringify({error:'JSON required.'}));}
        let body='',size=0;
        for await(const chunk of req) {size+=chunk.length;if(size>4096){res.writeHead(413);res.end(JSON.stringify({error:'Submission too large.'}));return;}body+=chunk;}
        let entry;try {entry=JSON.parse(body);if(!entry || typeof entry!=='object')throw new Error();}catch {res.writeHead(400);return res.end(JSON.stringify({error:'Invalid JSON.'}));}
        try {return res.end(JSON.stringify(submit(entry)));}catch(error){if(!(error instanceof InvalidEntry))throw error;res.writeHead(400);return res.end(JSON.stringify({error:error.message}));}
      }
      res.writeHead(405);return res.end(JSON.stringify({error:'Method not allowed.'}));
    }catch {res.writeHead(503);return res.end(JSON.stringify({error:'Leaderboard unavailable. Try again.'}));}
  }
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
