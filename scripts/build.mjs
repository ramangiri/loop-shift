import { readFile, readdir, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { extname } from 'node:path';
const types = {'.woff':'font/woff', '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.webmanifest':'application/manifest+json', '.zip':'application/zip' };
const assets = {};
for (const name of await readdir('www')) {
  if (!types[extname(name)]) throw new Error('Unexpected website asset: ' + name);
  assets['/' + name] = [types[extname(name)], (await readFile('www/' + name)).toString('base64')];
}
await rm('dist', {recursive:true, force:true});
await mkdir('dist/server', {recursive:true});
await cp('server', 'dist/server', {recursive:true});
await mkdir('dist/.openai', {recursive:true});
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/.openai/drizzle', {recursive:true});
await writeFile('dist/server/index.js', `import { api } from './api.js';
const assets = ${JSON.stringify(assets)};
export default { async fetch(request, env) {
  const path = new URL(request.url).pathname;
  if (path.startsWith('/api/')) return api(request, env);
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
  const asset = assets[path === '/' ? '/index.html' : path];
  if (!asset) return new Response('Not found', {status:404});
  const headers = {'Content-Type':asset[0], 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'};
  if (path.endsWith('.zip')) headers['Content-Disposition'] = 'attachment; filename="LoopShift-Website-Full-Code.zip"';
  return new Response(request.method === 'HEAD' ? null : Uint8Array.from(atob(asset[1]), c => c.charCodeAt(0)), {headers});
}};
`);
console.log('Built Loop Shift website and shared leaderboard Worker.');
