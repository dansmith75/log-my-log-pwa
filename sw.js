const CACHE='log-my-log-v5.0';
const CORE=[
  './',
  './index.html',
  './styles.css?v=5.0',
  './app.js?v=5.0',
  './db.js',
  './captcha-config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const request=event.request;
  const url=new URL(request.url);

  // Never intercept Supabase, CDN, browser-extension, or other third-party traffic.
  // Auth/API responses must not enter the app cache.
  if(url.origin!==self.location.origin) return;

  const isNavigation=request.mode==='navigate';

  if(isNavigation){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
          return response;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached || network;
    })
  );
});
