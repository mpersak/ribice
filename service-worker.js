// Bump this whenever you ship app shell changes you want to force-evict.
const CACHE_VERSION = "v33";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const DATA_CACHE = `data-${CACHE_VERSION}`;

// Listen for explicit "skip waiting" requests from the page (Force update flow).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const SHELL_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Cache each file individually. cache.addAll() rejects the WHOLE install
      // if any single file 404s or errors — which silently prevents the app
      // from ever updating. Per-file .catch() keeps a flaky asset from
      // bricking the update.
      Promise.all(
        SHELL_FILES.map((f) =>
          cache.add(f).catch((err) => console.warn("[SW] skip caching", f, err))
        )
      )
    )
  );
  // NOTE: deliberately NOT calling self.skipWaiting() here. We want the new
  // SW to sit in the "waiting" state so the page can detect it (reg.waiting),
  // show the "New version available" toast, and let the user (or the toast's
  // 1.5s fallback) trigger activation via the SKIP_WAITING message above.
  // Calling skipWaiting() on install emptied reg.waiting and broke that flow.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isApi =
    url.hostname.endsWith("open-meteo.com") ||
    url.hostname.endsWith("solunar.org");

  if (isApi) {
    // Network-first for forecasts so the user gets the freshest data when
    // online. Falls back to the cached copy when offline. Synthetic 503 on
    // a full miss so the page's try/catch sees a clean failure.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(DATA_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: "offline_or_blocked" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        })
    );
    return;
  }

  // App shell: stale-while-revalidate. We serve from cache immediately for
  // instant launch (cold-load was ~200-500ms slower with the old network-
  // first), and kick off a background fetch to refresh the cached copy.
  // On the NEXT visit the user gets the new version. The in-app "New
  // version available" toast covers the case where they want it sooner.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => null);
      // If we have a cached copy, serve it immediately and update in
      // background. Otherwise wait for network (first-load case).
      return cached || networkFetch.then((res) => res || new Response("Offline", { status: 503 }));
    })
  );
});
