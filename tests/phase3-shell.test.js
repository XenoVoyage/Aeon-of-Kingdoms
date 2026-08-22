"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));
const configApi = require(path.join(ROOT, "phase3/config.js"));

const PHASE3_SCRIPTS = Object.freeze([
  "../phase2/map.js",
  "../phase2/camera.js",
  "../phase2/renderer.js",
  "config.js",
  "navigation.js",
  "simulation.js",
  "replay.js",
  "assets/entities/manifest.js",
  "assets.js",
  "renderer.js",
  "input.js",
  "app.js"
]);

const PHASE3_LOCAL_SOURCES = Object.freeze([
  "phase3/config.js",
  "phase3/navigation.js",
  "phase3/simulation.js",
  "phase3/replay.js",
  "phase3/assets/entities/manifest.js",
  "phase3/assets.js",
  "phase3/renderer.js",
  "phase3/input.js",
  "phase3/app.js"
]);

function functionBody(source, name) {
  const signature = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  assert.ok(signature, `missing function ${name}`);
  const openingBrace = signature.index + signature[0].lastIndexOf("{");
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
  }
  assert.fail(`unterminated function ${name}`);
}

test("Phase 3 shell preserves the approved menu and exact six-layer landscape boundary", () => {
  const html = read("phase3/index.html");
  const scripts = Array.from(html.matchAll(/<script\s+src=["']([^"']+)["']/gi), (match) => match[1]);
  const layers = Array.from(html.matchAll(/<canvas\s+data-layer=["']([^"']+)["']/gi), (match) => match[1]);
  assert.deepEqual(scripts, PHASE3_SCRIPTS);
  assert.deepEqual(layers, ["ground", "detail", "navigation", "anchors", "dynamic", "foreground"]);
  assert.match(html, /data-src=["']\.\.\/concepts\/images\/minimal-menu\.webp["']/i);
  assert.match(html, /connect-src 'none'/i);
  assert.match(html, /id=["']orientation-gate["']/i);
  assert.match(html, /id=["']size-gate["']/i);
  assert.match(html, /id=["']move-mode-button["'][^>]*aria-pressed=["']false["']/i);
  assert.match(html, /id=["']art-tier["'][\s\S]*value=["']standard["'][\s\S]*value=["']compact["']/i);
  assert.match(html, /id=["']world-status["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/i);
  assert.doesNotMatch(html, /https?:\/\/|<iframe|<object|<embed/i);
});

test("Phase 3 app uses only the fixed-step command boundary and exact local loader API", () => {
  const app = read("phase3/app.js");
  const selection = functionBody(app, "onSelectPoint");
  const loop = functionBody(app, "animationLoop");
  assert.match(app, /simulationApi\.createSimulation\(\{\s*map,\s*seed:/);
  assert.match(app, /simulation\.submitMove\(request\)/);
  assert.match(app, /replayApi\.appendAccepted\(replay, receipt\)/);
  assert.match(app, /setFeedback\([^;]+["']accepted["'],\s*["']Arrived["']\)/);
  assert.doesNotMatch(app, /setFeedback\([^;]+["']stopped["'],\s*["']Arrived["']\)/);
  assert.match(app, /assetsApi\.load\(\{/);
  assert.match(app, /Promise\.allSettled\(\[/);
  assert.match(app, /ownerSeatByFaction:\s*\{\s*["']astral-concord["']:\s*1,\s*["']gravebound-court["']:\s*2\s*\}/);
  assert.match(app, /assets\.dispose\(\)/);
  assert.doesNotMatch(app, /loadAssets|assets\.destroy|ownerSeats/);
  assert.match(loop, /configuration\.tickDurationMs/);
  assert.match(loop, /configuration\.maxCatchUpTicks/);
  assert.match(loop, /simulation\.step\(\)/);
  assert.match(selection, /if \(!payload\.additive\) clearSelection\(\)/);
  assert.match(selection, /replaceSelection\(\[entity\.id\], payload\.additive\)/);
  assert.doesNotMatch(selection, /source\s*===\s*["']touch["']|selectedEntityIds\.delete/);
  assert.doesNotMatch(app, /Math\.random|Date\.now|WebSocket|RTCPeerConnection|fetch\s*\(/);
});

test("Phase 3 configuration and shell expose every bounded candidate control", () => {
  const { configuration } = configApi;
  assert.equal(configuration.tickRate, 20);
  assert.equal(configuration.tickDurationMs, 50);
  assert.equal(configuration.positionScale, 100);
  assert.equal(configuration.maxCatchUpTicks, 4);
  assert.equal(configuration.entityCap, 24);
  assert.equal(configuration.selectionCap, 12);
  assert.equal(configuration.pendingCommandCap, 64);
  assert.equal(configuration.navigationNodeCap, 2048);
  assert.equal(configuration.routeWaypointCap, 96);
  assert.equal(configuration.checksumIntervalTicks, 20);
  assert.equal(configuration.commandLeadMinTicks, 1);
  assert.equal(configuration.commandLeadMaxTicks, 8);
});

test("every staged Phase 3 classic script parses and no networking or prototype alias enters it", () => {
  for (const relativePath of PHASE3_LOCAL_SOURCES) {
    const source = read(relativePath);
    assert.doesNotThrow(() => new vm.Script(source, { filename: relativePath }));
    assert.doesNotMatch(source, /\bunit(?:Id|Ids|s)?\b/i, `${relativePath} revives a prototype unit alias`);
    assert.doesNotMatch(source, /WebSocket|RTCPeerConnection|signaling|TURN server/i, `${relativePath} adds networking`);
  }
});

test("Pages stages the complete bounded Phase 3 route and exactly 24 runtime WebPs", () => {
  const files = staging.verifyRuntimeFiles();
  const phase3Files = files.filter((relativePath) => relativePath.startsWith("phase3/"));
  const webps = phase3Files.filter((relativePath) => relativePath.endsWith(".webp"));
  assert.equal(files.length, 108);
  assert.equal(phase3Files.length, 35);
  assert.equal(webps.length, 24);
  assert.ok(phase3Files.includes("phase3/index.html"));
  assert.ok(phase3Files.includes("phase3/assets/entities/manifest.js"));
  assert.ok(phase3Files.includes("phase3/app.js"));
  assert.equal(files.some((relativePath) => relativePath.startsWith("tools/")), false);
  assert.equal(files.some((relativePath) => relativePath.includes("atlas.png")), false);
});
