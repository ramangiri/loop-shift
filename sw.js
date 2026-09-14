const CACHE = 'loop-shift-website-mobile-2';
const FILES = ['./','./index.html','./style.css','./game.js','./apple-touch-icon.png','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const ASSET_URLS = new Set(FILES.map(file=>new URL(file,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('loop-shift-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET' || !ASSET_URLS.has(event.request.url))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok && response.type==='basic' && !response.redirected){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached || (event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
