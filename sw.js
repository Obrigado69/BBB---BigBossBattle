/* BBB network-first update strategy. No app-shell caching. */
const BBB_CACHE_VERSION='bbb-graphic-2026-10-13';
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith('bbb')||key.startsWith('mantis'))await caches.delete(key)}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).catch(()=>new Response('Sem ligação. Abre novamente o BBB quando estiveres online.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})))});
