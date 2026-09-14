import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve, extname, sep } from 'node:path';
import { openDatabase } from './sqlite-adapter.mjs';
import { api } from '../server/api.js';
const root = fileURLToPath(new URL('../www/', import.meta.url));
const dataDirectory = fileURLToPath(new URL('../data/', import.meta.url));
await mkdir(dataDirectory, {recursive:true});
const DB = openDatabase(join(dataDirectory, 'leaderboard.sqlite'), fileURLToPath(new URL('../drizzle/', import.meta.url)));
const port = Number(process.env.PORT || 8080), host = process.env.LOOPSHIFT_HOST || '127.0.0.1';
const types = {'.woff':'font/woff','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.zip':'application/zip'};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
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
server.listen(port, host, () => console.log(`Loop Shift: http://${host}:${port}\nShared scores are saved in data/leaderboard.sqlite.\nPress Ctrl+C to stop.`));
