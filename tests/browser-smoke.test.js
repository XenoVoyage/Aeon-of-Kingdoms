"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));

test("public shell truthfully presents the phased redesign", () => {
  const html = read("index.html");
  for (const pattern of [
    /<html\b[^>]*\blang=["']en["']/i,
    /name=["']viewport["']/i,
    /id=["']main-content["']/i,
    /id=["']page-title["']/i,
    /Phase 0 · Truth and cleanup/i,
    /Redesign in progress/i,
    /historical work/i,
    /not the game[\s\S]*we\s+are\s+moving\s+forward\s+with/i,
    /Design before implementation/i,
    /aria-current=["']step["']/i,
    /Status build v2026\.8\.16/i
  ]) assert.match(html, pattern);

  assert.match(html, /href=["']https:\/\/github\.com\/XenoVoyage\/Aeon-of-Kingdoms["']/i);
  assert.match(html, /href=["']concepts\/["']/i);
  assert.match(html, /href=["']docs\/REDESIGN\.md["']/i);
  assert.match(html, /href=["']docs\/STATUS\.md["']/i);
  assert.match(html, /<script\b[^>]*src=["']js\/status\.js["']/i);
  assert.match(html, /<link\b[^>]*href=["']css\/status\.css["']/i);

  assert.doesNotMatch(html, /<(?:canvas|dialog)\b/i);
  assert.doesNotMatch(html, /(?:manifest\.webmanifest|css\/(?:tokens|app)\.css|js\/(?:config|core|simulation|ai|render|input|game)\.js)/i);
  assert.doesNotMatch(html, /\b(?:play|start) (?:game|skirmish|campaign)\b/i);
});

test("status shell keeps a restrictive local-resource policy", () => {
  const html = read("index.html");
  assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.match(html, /connect-src 'none'/i);
  assert.match(html, /object-src 'none'/i);
  assert.match(html, /manifest-src 'none'/i);
  assert.doesNotMatch(html, /unsafe-(?:inline|eval)/i);
  assert.doesNotMatch(html, /<(?:script|link)\b[^>]+(?:src|href)=["'](?:https?:|\/)/i);
});

test("every staged JavaScript file parses as a classic script", () => {
  for (const relativePath of staging.RUNTIME_FILES.filter((entry) => entry.endsWith(".js"))) {
    assert.doesNotThrow(() => new vm.Script(read(relativePath), { filename: relativePath }), `${relativePath} has invalid syntax`);
  }
});

test("status styles include compact layouts, visible focus, and reduced motion", () => {
  const css = read("css/status.css");
  assert.match(css, /@media\s*\([^)]*max-width/i);
  assert.match(css, /prefers-reduced-motion/i);
  assert.match(css, /:focus-visible/i);
  assert.match(css, /env\(safe-area-inset-top\)/i);
  assert.match(css, /env\(safe-area-inset-left\)/i);
  assert.match(css, /env\(safe-area-inset-right\)/i);
  assert.match(css, /env\(safe-area-inset-bottom\)/i);
  assert.match(css, /\.project-links a\s*\{[\s\S]*?min-height:\s*2\.75rem/i);
  assert.doesNotMatch(css, /@import/i);
  assert.doesNotMatch(css, /url\(/i);
});

test("service worker replaces old game caches with only the status shell", () => {
  const worker = read("sw.js");
  const registration = read("js/status.js");
  assert.match(worker, /\$\{CACHE_PREFIX\}v2026\.8\.16/);
  assert.match(worker, /cache: "reload"/, "install requests must bypass a fresh HTTP-cached prototype shell");
  assert.match(worker, /cache\.put\(request, response\)/);
  assert.doesNotMatch(worker, /cache\.addAll\(/);
  assert.match(worker, /name\.startsWith\(CACHE_PREFIX\) && name !== CACHE_NAME/);
  assert.match(worker, /caches\.delete\(name\)/);
  assert.match(worker, /retiredCaches\.length > 0/);
  assert.match(worker, /clients\.matchAll\(\{ includeUncontrolled: true, type: "window" \}\)/);
  assert.match(worker, /entryUrls\.has\(clientUrl\.href\) \? client\.navigate\(client\.url\)/);
  assert.match(registration, /updateViaCache: "none"/, "status registration must bypass an old cached worker script");
  assert.deepEqual(staging.EXPECTED_SHELL_ASSETS, ["./", "index.html", "css/status.css", "js/status.js"]);
  assert.doesNotMatch(worker, /(?:manifest\.webmanifest|icons\/|css\/(?:tokens|app)\.css|js\/(?:config|core|simulation|ai|render|input|game)\.js)/);
});

test("service-worker upgrade bypasses stale HTTP cache and refreshes only the retired entry page", async () => {
  const scope = "https://xenovoyage.github.io/Aeon-of-Kingdoms/";
  const listeners = new Map();
  const fetchRequests = [];
  const cachePuts = [];
  const deletedCaches = [];
  const navigatedClients = [];
  let claimed = 0;
  let skipped = 0;

  const cache = {
    put(request) {
      cachePuts.push(request);
      return Promise.resolve();
    }
  };
  const caches = {
    open(name) {
      assert.equal(name, "aok-shell-v2026.8.16");
      return Promise.resolve(cache);
    },
    keys() {
      return Promise.resolve(["aok-shell-v2026.8.15a", "unrelated-origin-cache"]);
    },
    delete(name) {
      deletedCaches.push(name);
      return Promise.resolve(true);
    },
    match() {
      return Promise.resolve(undefined);
    }
  };
  const clients = [
    {
      url: `${scope}?old-prototype=1#battle`,
      navigate(url) {
        navigatedClients.push(url);
        return Promise.resolve(this);
      }
    },
    {
      url: `${scope}docs/STATUS.md`,
      navigate() {
        throw new Error("documentation clients must not be forced to navigate");
      }
    }
  ];
  const self = {
    registration: { scope },
    location: { origin: new URL(scope).origin },
    clients: {
      claim() {
        claimed += 1;
        return Promise.resolve();
      },
      matchAll(options) {
        assert.equal(options.includeUncontrolled, true);
        assert.equal(options.type, "window");
        return Promise.resolve(clients);
      }
    },
    skipWaiting() {
      skipped += 1;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  };
  const context = vm.createContext({
    caches,
    console,
    fetch(request) {
      fetchRequests.push(request);
      return Promise.resolve(new Response("fresh", { status: 200 }));
    },
    Request,
    Response,
    self,
    URL
  });
  new vm.Script(read("sw.js"), { filename: "sw.js" }).runInContext(context);

  let installWork;
  listeners.get("install")({ waitUntil(promise) { installWork = promise; } });
  await installWork;
  assert.equal(skipped, 1);
  assert.deepEqual(fetchRequests.map((request) => request.url), [
    scope,
    `${scope}index.html`,
    `${scope}css/status.css`,
    `${scope}js/status.js`
  ]);
  assert.ok(fetchRequests.every((request) => request.cache === "reload"));
  assert.ok(fetchRequests.every((request) => request.credentials === "same-origin"));
  assert.deepEqual(cachePuts.map((request) => request.url), fetchRequests.map((request) => request.url));

  let activateWork;
  listeners.get("activate")({ waitUntil(promise) { activateWork = promise; } });
  await activateWork;
  assert.deepEqual(deletedCaches, ["aok-shell-v2026.8.15a"]);
  assert.equal(claimed, 1);
  assert.deepEqual(navigatedClients, [`${scope}?old-prototype=1#battle`]);
});

test("Pages staging contains status and source-of-truth links but no rejected game runtime", () => {
  assert.deepEqual(staging.verifyRuntimeFiles(), [
    "index.html",
    "sw.js",
    "css/status.css",
    "js/status.js",
    "concepts/index.html",
    "concepts/gallery.css",
    "concepts/images/battlefield.webp",
    "concepts/images/astral-concord.webp",
    "concepts/images/gravebound-court.webp",
    "concepts/images/structures.webp",
    "concepts/images/combat-readability.webp",
    "concepts/images/minimal-menu.webp",
    "concepts/images/mobile-landscape.webp",
    "concepts/images/production-rally.webp",
    "docs/REDESIGN.md",
    "docs/STATUS.md"
  ]);
  for (const relativePath of staging.RUNTIME_FILES) {
    assert.doesNotMatch(relativePath, /^(?:manifest\.webmanifest|icons\/|css\/(?:tokens|app)\.css|js\/(?:config|core|simulation|ai|render|input|game)\.js|docs\/assets\/)/);
  }
});

test("Pages-subpath delivery serves every linked local status resource", async (context) => {
  const allowed = new Set(staging.verifyRuntimeFiles());
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://local.test").pathname);
    if (!pathname.startsWith("/Aeon-of-Kingdoms/")) {
      response.writeHead(404).end();
      return;
    }
    let relativePath = pathname.slice("/Aeon-of-Kingdoms/".length) || "index.html";
    if (relativePath.endsWith("/")) relativePath += "index.html";
    relativePath = path.posix.normalize(relativePath);
    if (!allowed.has(relativePath)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": relativePath.endsWith(".html") ? "text/html" : "text/plain" });
    response.end(fs.readFileSync(path.join(ROOT, relativePath)));
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}/Aeon-of-Kingdoms/`;

  const page = await fetch(base);
  assert.equal(page.status, 200);
  const html = await page.text();
  for (const reference of staging.localReferences(html)) {
    const response = await fetch(new URL(reference, base));
    assert.equal(response.status, 200, `failed to load ${reference} from the Pages subpath`);
  }

  const galleryUrl = new URL("concepts/", base);
  const galleryPage = await fetch(galleryUrl);
  assert.equal(galleryPage.status, 200);
  const galleryHtml = await galleryPage.text();
  for (const reference of staging.localReferences(galleryHtml)) {
    const response = await fetch(new URL(reference, galleryUrl));
    assert.equal(response.status, 200, `failed to load gallery resource ${reference} from the Pages subpath`);
  }
});
