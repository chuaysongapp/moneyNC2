// MoneyNC Service Worker v11 — Supabase Edition
const CACHE = 'money-nc-v11';
const STATIC = [
  './',
  './index.html',
  './manifest.json',
];

// ── Install ────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch Strategy ────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase API & esm.sh → Network only (อย่า cache)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname === 'esm.sh' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response('Offline', { status: 503 })
    ));
    return;
  }

  // HTML → Network First (ได้ version ใหม่เสมอ)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets → Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});

// ── Push Notifications (เผื่อใช้ภายหลัง) ────────
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'MoneyNC', body: 'มีการแจ้งเตือนใหม่' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
    })
  );
});
