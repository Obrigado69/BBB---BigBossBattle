// App shell offline; dados de salas/autenticação nunca são guardados no cache.
const CACHE='bbb-online-v3-20261021-nine-bosses-1';
const SHELL=["./assets/dot.svg","./assets/black-hole.svg","./","./index.html","./config.js","./online.js","./online.css","./vendor/supabase-2.117.3.js","./manifest.webmanifest","./icons/bbb-192.png","./icons/bbb-512.png","./assets/stone-golem.webp","./assets/stone-golem-dead.webp","./assets/queen-mothra.webp","./assets/queen-mothra-dead.webp","./layout-data.js","./layout-v2.js","./layout-v2.css","./assets/v2/attack-icon.webp","./assets/v2/attack.webp","./assets/v2/back.webp","./assets/v2/boss-fight.webp","./assets/v2/bottom.webp","./assets/v2/box.webp","./assets/v2/character.webp","./assets/v2/d20.webp","./assets/v2/defense-icon.webp","./assets/v2/divider.webp","./assets/v2/fight.webp","./assets/v2/heal-icon.webp","./assets/v2/heal.webp","./assets/v2/hp.webp","./assets/v2/hp-thin.webp","./assets/v2/logo.webp","./assets/v2/multiplayer.webp","./assets/v2/nebula.webp","./assets/v2/portrait.webp","./assets/v2/ready.webp","./assets/v2/singleplayer.webp","./assets/v2/top.webp"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('bbb-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||/^\/(auth|rest|realtime)\/v1\//.test(url.pathname))return;
 // MP4 range requests must keep the browser's native streaming behavior.
 if(url.pathname.endsWith('.mp4'))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
  catch{const saved=await cache.match(event.request);if(saved)return saved;if(event.request.mode==='navigate')return cache.match('./index.html');throw Error('Sem rede');}
 })());
});
