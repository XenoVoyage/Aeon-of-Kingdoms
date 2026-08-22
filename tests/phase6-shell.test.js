"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const bytes = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath));
const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));

const PHASE6_SCRIPTS = Object.freeze([
  "../phase2/map.js",
  "../phase2/camera.js",
  "../phase2/renderer.js?v=2026.8.22e",
  "../phase3/assets/entities/manifest.js",
  "../phase3/assets.js",
  "../phase3/input.js",
  "../phase4/config.js",
  "../phase4/map.js",
  "../phase4/assets/structures/manifest.js",
  "../phase4/assets.js",
  "../phase5/config.js",
  "../phase5/map.js",
  "../phase5/navigation.js",
  "../phase5/simulation.js",
  "../phase5/replay.js",
  "../phase5/assets/structures/manifest.js",
  "../phase5/assets.js",
  "../phase5/renderer.js",
  "../phase5/input.js",
  "config.js",
  "ai.js",
  "skirmish.js",
  "app.js?v=2026.8.22g"
]);

const PHASE6_STYLES = Object.freeze([
  "../phase2/phase2.css?v=2026.8.22e",
  "../phase5/phase5.css?v=2026.8.22e",
  "phase6.css?v=2026.8.22g"
]);

const PHASE6_PAGES_FILES = Object.freeze([
  "phase6/ai.js",
  "phase6/app.js",
  "phase6/config.js",
  "phase6/index.html",
  "phase6/phase6.css",
  "phase6/skirmish.js"
]);

const PHASE5_CLOSURE_HASHES = Object.freeze({
  "phase5/app.js": "5315e6a816464433e12078991c6e88627460217f3f904e6dcb9d8f32f50cd73b",
  "phase5/index.html": "da201715b3751401a8e9b812cd1ff37376688676b78923568d7196ebac0e0685",
  "phase5/phase5.css": "2754a65a7261cb269ad69c32f1516004b484643e09f4b8fdc36230a1dbbb0595"
});

const CONTROL_IDS = Object.freeze([
  "zoom-out-button",
  "zoom-in-button",
  "reset-camera-button",
  "move-mode-button",
  "attack-mode-button",
  "attack-move-mode-button",
  "defend-point-mode-button",
  "defend-entity-mode-button",
  "stop-button",
  "rally-mode-button",
  "clear-rally-button",
  "clear-selection-button",
  "navigation-button",
  "pause-button",
  "battlefield-fullscreen-button",
  "menu-button"
]);

test("Phase 6 adds one local route over the exact approved dependency stack", () => {
  const html = read("phase6/index.html");
  const scripts = Array.from(html.matchAll(/<script\s+src=["']([^"']+)["']/gi), (match) => match[1]);
  const styles = Array.from(html.matchAll(/<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']/gi), (match) => match[1]);
  const layers = Array.from(html.matchAll(/<canvas\s+data-layer=["']([^"']+)["']/gi), (match) => match[1]);

  assert.deepEqual(scripts, PHASE6_SCRIPTS);
  assert.deepEqual(styles, PHASE6_STYLES);
  assert.deepEqual(layers, ["ground", "detail", "navigation", "anchors", "dynamic", "foreground"]);
  assert.equal(new Set(scripts).size, scripts.length, "every runtime script appears exactly once");
  assert.match(html, /data-src=["']\.\.\/concepts\/images\/minimal-menu\.webp["']/i);
  assert.match(html, /connect-src 'none'/i);
  assert.doesNotMatch(html, /https?:\/\/<|https?:\/\/|<iframe|<object|<embed/i);
  assert.equal(scripts.includes("../phase5/app.js"), false, "the closed Phase 5 app is evidence, not the Phase 6 orchestrator");
  assert.equal(scripts.some((source) => /phase6\/(?:renderer|input)\.js/.test(source)), false,
    "Phase 6 reuses the approved Phase 5 renderer and input translator");
});

test("You and the Standard computer opponent are visibly identified on menu and battlefield", () => {
  const html = read("phase6/index.html");
  const menuStart = html.indexOf('<section class="menu-screen"');
  const menuEnd = html.indexOf('<section class="battlefield-screen"');
  const battlefieldEnd = html.indexOf('<section class="viewport-gate"', menuEnd);
  assert.ok(menuStart >= 0 && menuEnd > menuStart && battlefieldEnd > menuEnd);

  const menu = html.slice(menuStart, menuEnd);
  const battlefield = html.slice(menuEnd, battlefieldEnd);
  for (const fragment of [menu, battlefield]) {
    assert.match(fragment, /You/i);
    assert.match(fragment, /Astral Concord\s*·\s*◇ Azure/i);
    assert.match(fragment, /Computer/i);
    assert.match(fragment, /Gravebound Court\s*·\s*✕ Violet/i);
  }
  assert.match(menu, /<dl\s+class=["']menu-skirmish-identity["'][^>]*aria-label=/i);
  assert.doesNotMatch(menu.match(/<dl\s+class=["']menu-skirmish-identity["'][^>]*/i)[0], /hidden/i);
  assert.match(battlefield, /id=["']skirmish-identity["']/i);
  assert.match(battlefield, /id=["']match-status["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/i);
  assert.match(battlefield, /Match active · You versus Computer · both headquarters intact/i);
  assert.doesNotMatch(html, /nextDecisionTick|urgentEligibleTick|route probes?|task-force slots?|force memory|current need|AI state/i,
    "internal planner state never becomes player-facing shell copy");
});

test("Phase 6 retains every tactical control, gate, local art tier, and non-color cue", () => {
  const html = read("phase6/index.html");
  for (const id of CONTROL_IDS) {
    assert.match(html, new RegExp(`<button\\s+id=["']${id}["'][^>]*type=["']button["']`, "i"));
  }
  assert.match(html, /id=["']orientation-gate["'][^>]*role=["']status["']/i);
  assert.match(html, /id=["']size-gate["'][^>]*role=["']status["']/i);
  assert.match(html, /id=["']attack-move-mode-button["'][^>]*aria-keyshortcuts=["']X["']/i);
  assert.match(html, /id=["']defend-point-mode-button["'][^>]*>Defend Point</i);
  assert.match(html, /id=["']defend-entity-mode-button["'][^>]*>Defend Ally</i);
  assert.match(html, /hostile hover shows ⊗/i);
  assert.match(html, /<option value=["']standard["'] selected>Standard · 128 px<\/option>/i);
  assert.match(html, /<option value=["']compact["']>Compact · 96 px<\/option>/i);
  assert.doesNotMatch(html, /aria-live=["']assertive["']/i);

  const inheritedCss = read("phase5/phase5.css");
  const localCss = read("phase6/phase6.css");
  assert.match(inheritedCss, /\.command-controls button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/i);
  assert.match(inheritedCss, /button\[aria-pressed=["']true["']\]::before\s*\{[^}]*◆/i);
  assert.match(localCss, /#phase6-experience\s*\{[^}]*position:\s*fixed;/i);
  assert.match(localCss, /\.menu-skirmish-identity[\s\S]*pointer-events:\s*none;/i);
  assert.doesNotMatch(localCss, /\.command-controls|\.economy-strip|\.producer-tray|canvas/i,
    "the local stylesheet does not fork approved battlefield presentation");
});

test("the closed Phase 5 shell remains byte-identical evidence", () => {
  for (const [relativePath, expected] of Object.entries(PHASE5_CLOSURE_HASHES)) {
    const actual = crypto.createHash("sha256").update(bytes(relativePath)).digest("hex");
    assert.equal(actual, expected, relativePath);
  }
});

test("Pages exposes exactly the bounded six-file Phase 6 route", () => {
  const files = staging.verifyRuntimeFiles();
  const phase6Files = files.filter((relativePath) => relativePath.startsWith("phase6/")).sort();
  assert.deepEqual(phase6Files, [...PHASE6_PAGES_FILES].sort());
  assert.equal(files.includes("js/ai.js"), false, "the rejected prototype AI stays outside Pages");
  assert.equal(phase6Files.some((relativePath) => /assets\//.test(relativePath)), false,
    "Phase 6 reuses approved assets instead of shipping copies");
});
