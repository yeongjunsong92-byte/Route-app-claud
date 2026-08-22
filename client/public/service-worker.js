const CACHE_NAME = "route-pwa-v1";
const APP_SHELL = ["/", "/manifest.webmanifest"];
const OFFLINE_DOCUMENT = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Route</title><style>body{margin:0;display:grid;min-height:100vh;place-items:center;background:#fafafa;color:#2b2b2b;font-family:-apple-system,BlinkMacSystemFont,"Pretendard",sans-serif}main{max-width:280px;padding:32px;text-align:center}b{display:block;margin-bottom:10px;font-size:22px}p{margin:0;color:#757575;font-size:14px;line-height:1.6}</style></head><body><main><b>Route</b><p>인터넷 연결을 확인한 뒤 다시 열어 주세요.<br>저장한 여행은 연결되면 이어서 볼 수 있어요.</p></main></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  event.respondWith(fetch(request).then((response) => {
    if (response.ok && url.origin === self.location.origin) {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") return new Response(OFFLINE_DOCUMENT, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    return new Response("", { status: 503, statusText: "Offline" });
  }));
});
