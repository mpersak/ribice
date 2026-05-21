// Bump this whenever you ship app shell changes you want to force-evict.
const CACHE_VERSION = "v5";
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
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
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
    // Network-first for forecasts, fall back to cached copy. Must always
    // return a Response — undefined would crash event.respondWith().
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
          // No cache hit either — return a synthetic 503 so the page's
          // try/catch sees a clean failure instead of a hard error.
          return new Response(
            JSON.stringify({ error: "offline_or_blocked" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        })
    );
    return;
  }

  // Network-first for the app shell too — fresh deploys propagate immediately;
  // cache only serves when the user is offline. This is the fix for the
  // dreaded "phone stuck on old version" problem with cache-first SWs.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        return cached || new Response("Offline", { status: 503 });
      })
  );
});
