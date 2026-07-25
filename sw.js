// MoneyNC Service Worker v12 — Force update
const CACHE = 'money-nc-v12';
const STATIC = [
  './',
  './index.html',
  './manifest.json',
];

// ── Install — ข้ามรอทันที ─────────────────────
self.addEventListener('install', e => {
  self.skipWaiting(); // ✅ บังคับใช้งานทันที ไม่รอ tab เก่าปิด
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
});

// ── Activate — ลบ cache เก่าทั้งหมด ───────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // ✅ ควบคุม client ทันที
  );
});

// ── Message — รับคำสั่งล้าง cache จากแอป ──────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'CLEAR_CACHE') {
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    );
  }
});

// ── Fetch Strategy ────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase API & CDN → Network only
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

// ── Push Notifications ────────────────────────
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
