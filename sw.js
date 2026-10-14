// App shell offline; dados de salas/autenticação nunca são guardados no cache.
const CACHE='bbb-online-v2-20261014-2';
const SHELL=['./','./index.html','./config.js','./online.js','./online.css','./vendor/supabase-2.117.3.js','./manifest.webmanifest','./icons/bbb-192.png','./icons/bbb-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('bbb-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||/^\/(auth|rest|realtime)\/v1\//.test(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
  catch{const saved=await cache.match(event.request);if(saved)return saved;if(event.request.mode==='navigate')return cache.match('./index.html');throw Error('Sem rede');}
 })());
});
