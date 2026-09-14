import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve, extname, sep } from 'node:path';
import { openStorage, storageHealth } from './storage.mjs';
import { api } from '../server/api.js';
const root = fileURLToPath(new URL('../www/', import.meta.url));
let storage;
try { storage = await openStorage(); }
catch (error) { console.error('Storage setup failed: ' + error.message);process.exit(1); }
const { DB } = storage;
const port = Number(process.env.PORT || 8080), host = process.env.LOOPSHIFT_HOST || '127.0.0.1';
// Use the public origin behind an HTTPS proxy; never trust caller-supplied forwarding headers.
const publicOriginValue = process.env.LOOPSHIFT_PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL;
const publicOrigin = publicOriginValue ? new URL(publicOriginValue) : null;
if (publicOrigin && !['http:', 'https:'].includes(publicOrigin.protocol)) throw new Error('Public origin must use HTTP or HTTPS');
const types = {'.woff':'font/woff','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.zip':'application/zip'};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (publicOrigin) { url.protocol = publicOrigin.protocol; url.host = publicOrigin.host; url.port = publicOrigin.port; }
    if (url.pathname === '/api/health' && ['GET','HEAD'].includes(req.method)) {
      const response = await storageHealth(storage);
      res.writeHead(response.status, Object.fromEntries(response.headers));res.end(req.method === 'HEAD' ? undefined : await response.text());return;
    }
    if (url.pathname.startsWith('/api/')) {
      const headers = new Headers();
      for (const [key,value] of Object.entries(req.headers)) if (!key.startsWith('oai-authenticated-user-') && value !== undefined) headers.set(key, Array.isArray(value) ? value.join(',') : value);
      const chunks = [];let size = 0;
      for await (const chunk of req) { size += chunk.length;if (size > 2048) {res.writeHead(413);res.end('Request too large');return;} chunks.push(chunk); }
      const request = new Request(url, {method:req.method, headers, ...(!['GET','HEAD'].includes(req.method) ? {body:Buffer.concat(chunks)} : {})});
      const response = await api(request, {DB});
      res.writeHead(response.status, Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== resolve(root) && !file.startsWith(resolve(root) + sep)) {res.writeHead(403);res.end();return;}
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {res.writeHead(404);res.end('File not found.');}
});
server.on('error', error => {console.error(error.message);process.exit(1);});
server.listen(port, host, () => console.log(`Loop Shift: http://${host}:${server.address().port}\n${storage.description}\nPress Ctrl+C to stop.`));
