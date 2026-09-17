const CACHE = 'loop-shift-mobile-header-help-53';
const FILES = ['./','./index.html','./style.css','./mobile.css','./arcade.woff','./avatars.js','./challenge-picker.js','./home-navigation.js','./events.css','./responsive.css','./social.js','./result-tools.js','./game.js','./leaderboard.js','./music.js','./native-bridge.js','./apple-touch-icon.png','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const ASSET_URLS = new Set(FILES.map(file=>new URL(file,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('loop-shift-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET' || !ASSET_URLS.has(event.request.url))return;
  // Versioned local assets open immediately, even while the server wakes up.
  event.respondWith(caches.match(event.request).then(async cached=>{
    if(cached)return cached;
    if(event.request.mode==='navigate'){
      const shell=await caches.match('./index.html');if(shell)return shell;
    }
    return fetch(event.request);
  }));
});
