/* 伊娜小金庫 Service Worker
 * 策略：導航請求「網絡優先」，失敗則回 index.html 緩存，再失敗回 offline.html
 * 靜態資源：cache-first
 * 僅處理 /yina-treasury/ 作用域內的同源請求
 */
const CACHE = 'yina-treasury-v1';
const PRECACHE = [
  '/yina-treasury/',
  '/yina-treasury/index.html',
  '/yina-treasury/offline.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/yina-treasury/') !== 0) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          if (cached) return cached;
          return caches.match('/yina-treasury/index.html').then(function (idx) {
            if (idx) return idx;
            return caches.match('/yina-treasury/offline.html');
          });
        });
      })
    );
  } else {
    e.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return cached; });
      })
    );
  }
});
