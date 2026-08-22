/* global self, caches, fetch, URL, Request */
"use strict";

const CACHE_PREFIX = "aok-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v2026.8.22h`;
const SHELL_ASSETS = Object.freeze([
  "./",
  "index.html",
  "css/status.css",
  "js/status.js",
]);

const shellUrls = new Set(SHELL_ASSETS.map((asset) => new URL(asset, self.registration.scope).href));
const entryUrls = new Set([
  new URL("./", self.registration.scope).href,
  new URL("index.html", self.registration.scope).href,
]);

function fetchFreshShell(cache) {
  return Promise.all(SHELL_ASSETS.map((asset) => {
    const request = new Request(new URL(asset, self.registration.scope).href, {
      cache: "reload",
      credentials: "same-origin",
    });
    return fetch(request).then((response) => {
      if (!response.ok) throw new Error(`Unable to refresh status shell: ${asset}`);
      return cache.put(request, response);
    });
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(fetchFreshShell));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => {
        const retiredCaches = names.filter(
          (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
        );
        return Promise.all(retiredCaches.map((name) => caches.delete(name)))
          .then(() => self.clients.claim())
          .then(() => retiredCaches.length > 0);
      })
      .then((retiredPrototype) => {
        if (!retiredPrototype) return undefined;
        return self.clients.matchAll({ includeUncontrolled: true, type: "window" })
          .then((clients) => Promise.all(clients.map((client) => {
            const clientUrl = new URL(client.url);
            clientUrl.hash = "";
            clientUrl.search = "";
            return entryUrls.has(clientUrl.href) ? client.navigate(client.url) : undefined;
          })));
      }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  requestUrl.hash = "";
  requestUrl.search = "";
  if (!shellUrls.has(requestUrl.href)) return;

  const cacheKey = new Request(requestUrl.href, { credentials: "same-origin" });
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        return caches.open(CACHE_NAME)
          .then((cache) => cache.put(cacheKey, copy))
          .then(() => response);
      })
      .catch(() => caches.match(cacheKey)),
  );
});
