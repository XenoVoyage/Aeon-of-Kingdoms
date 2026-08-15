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

test("browser shell exposes stable game, HUD, and mode controls", () => {
  const html = read("index.html");
  for (const pattern of [
    /<html\b[^>]*\blang=["']en["']/i,
    /name=["']viewport["']/i,
    /id=["']game-canvas["']/i,
    /id=["']start-screen["']/i,
    /id=["']start-skirmish["']/i,
    /id=["']start-campaign["']/i,
    /id=["']game-hud["']/i,
    /id=["']resource-aether["']/i,
    /id=["']population["']/i,
    /id=["']objective-status["']/i,
    /id=["']pause-button["']/i
  ]) assert.match(html, pattern);
  assert.match(html, /aria-live=["']polite["']/i);
  assert.match(html, /value=["']total-domination["']/i);
  assert.match(html, /id=["']select-army["']/i);
  assert.match(read("js/game.js"), /ROLE_LABELS/);
  assert.match(read("js/render.js"), /gravebound/);
  assert.match(read("js/render.js"), /maximumBackingPixels/);
  assert.match(read("js/render.js"), /prefers-reduced-motion/);
});

test("all runtime JavaScript parses as classic scripts", () => {
  for (const relativePath of staging.RUNTIME_FILES.filter((entry) => entry.endsWith(".js"))) {
    assert.doesNotThrow(() => new vm.Script(read(relativePath), { filename: relativePath }), `${relativePath} has invalid syntax`);
  }
});

test("responsive styles include compact layout, focus, and reduced motion", () => {
  const css = `${read("css/tokens.css")}\n${read("css/app.css")}`;
  assert.match(css, /@media\s*\([^)]*(?:max-width|pointer|hover)/i);
  assert.match(css, /prefers-reduced-motion/i);
  assert.match(css, /:focus-visible/i);
  assert.match(css, /touch-action\s*:/i);
});

test("Pages-subpath delivery serves every allowlisted resource", async (context) => {
  const allowed = new Set(staging.verifyRuntimeFiles());
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://local.test").pathname);
    if (!pathname.startsWith("/Aeon-of-Kingdoms/")) {
      response.writeHead(404).end();
      return;
    }
    let relativePath = pathname.slice("/Aeon-of-Kingdoms/".length) || "index.html";
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
    assert.ok(Number(response.headers.get("content-length") || 1) > 0);
  }
});
