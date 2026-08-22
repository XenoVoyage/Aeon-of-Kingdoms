"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));

const PHASE4_SCRIPTS = Object.freeze([
  "../phase2/map.js",
  "../phase2/camera.js",
  "../phase2/renderer.js?v=2026.8.22c",
  "../phase3/assets/entities/manifest.js",
  "../phase3/assets.js",
  "../phase3/input.js",
  "config.js",
  "map.js",
  "navigation.js",
  "simulation.js",
  "replay.js",
  "assets/structures/manifest.js",
  "assets.js",
  "renderer.js",
  "input.js",
  "app.js"
]);

const PHASE4_LOCAL_SOURCES = Object.freeze([
  "phase4/config.js",
  "phase4/map.js",
  "phase4/navigation.js",
  "phase4/simulation.js",
  "phase4/replay.js",
  "phase4/assets/structures/manifest.js",
  "phase4/assets.js",
  "phase4/renderer.js",
  "phase4/input.js",
  "phase4/app.js"
]);

function functionBody(source, name) {
  const signature = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  assert.ok(signature, `missing function ${name}`);
  const openingBrace = signature.index + signature[0].lastIndexOf("{");
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openingBrace; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
  }
  assert.fail(`unterminated function ${name}`);
}

test("Phase 4 keeps the approved menu and one exact six-layer landscape shell", () => {
  const html = read("phase4/index.html");
  const scripts = Array.from(html.matchAll(/<script\s+src=["']([^"']+)["']/gi), (match) => match[1]);
  const layers = Array.from(html.matchAll(/<canvas\s+data-layer=["']([^"']+)["']/gi), (match) => match[1]);
  assert.deepEqual(scripts, PHASE4_SCRIPTS);
  assert.deepEqual(layers, ["ground", "detail", "navigation", "anchors", "dynamic", "foreground"]);
  assert.match(html, /data-src=["']\.\.\/concepts\/images\/minimal-menu\.webp["']/i);
  assert.match(html, /connect-src 'none'/i);
  assert.match(html, /id=["']orientation-gate["'][^>]*role=["']status["']/i);
  assert.match(html, /id=["']size-gate["'][^>]*role=["']status["']/i);
  assert.doesNotMatch(html, /https?:\/\/|<iframe|<object|<embed/i);

  const approvedMenu = read("concepts/images/minimal-menu.webp");
  assert.ok(approvedMenu.length > 0, "the unchanged approved menu art must remain local");
});

test("the economy and objective strip is semantic, concise, and not a 20 Hz live region", () => {
  const html = read("phase4/index.html");
  assert.match(html, /<dl\s+class=["']economy-strip["'][^>]*aria-label=/i);
  assert.match(html, /<dt>Resource<\/dt>\s*<dd\s+id=["']resource-value["']>240<\/dd>/i);
  assert.match(html, /<dt>Population<\/dt>\s*<dd\s+id=["']population-value["']>10 \+ 0 \/ 18<\/dd>/i);
  assert.match(html, /<dt>Objective<\/dt>\s*<dd\s+id=["']objective-value["']/i);
  assert.match(html, /id=["']debug-status["'][^>]*aria-hidden=["']true["']/i);
  assert.match(html, /id=["']event-status["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/i);
  assert.doesNotMatch(html, /Aether|gold|wood|food|mana/i);
});

test("the producer tray is compact, keyboard-operable, ordered, and exposes bounded progress", () => {
  const html = read("phase4/index.html");
  const css = read("phase4/phase4.css");
  assert.match(html, /<section\s+class=["']producer-tray["'][^>]*id=["']producer-tray["'][^>]*tabindex=["']-1["'][^>]*hidden/i);
  assert.equal(Array.from(html.matchAll(/<button\s+type=["']button["'][^>]*data-production-role=/gi)).length, 3);
  assert.match(html, /data-production-role=["']melee["']/i);
  assert.match(html, /data-production-role=["']ranged["']/i);
  assert.match(html, /data-production-role=["']signature["']/i);
  assert.match(html, /<progress\s+id=["']production-progress["'][^>]*max=["']1["'][^>]*value=["']0["']/i);
  assert.match(html, /<ol\s+class=["']production-queue["'][^>]*id=["']production-queue["']/i);

  const app = read("phase4/app.js");
  assert.match(app, /production-queue/);
  assert.match(app, /createElement\(["']button["']\)/i, "queue cancellation must remain a native keyboard-operable button");
  assert.match(app, /CANCEL_PRODUCTION/);
  assert.match(app, /blocked/i);
  assert.match(app, /Promise\.allSettled\(/, "every successful preload must remain reachable for cleanup after a sibling failure");
  assert.doesNotMatch(app, /Promise\.all\(\[\s*loadGround\(\)/, "runtime preloads must not leak fulfilled siblings on rejection");
  assert.match(app, /if \(structureSelect\.value !== structureValue\) structureSelect\.value = structureValue/, "native selection must not be rewritten every animation frame");
  assert.match(app, /reason === ["']Available["'][\s\S]{0,100}`\$\{details\} · \$\{reason\}`/, "unavailability reason must be visible in the option text");
  assert.match(css, /\.structure-jump\s*\{[^}]*pointer-events:\s*auto/i, "the structure selector must accept pointer input through the inert canvas overlay");
  assert.doesNotMatch(css, /\.structure-jump\s*\{[^}]*display:\s*none/i, "compact landscape must retain the keyboard structure selector");
});

test("combat and structure selection stay mutually exclusive and context chooses MOVE or SET_RALLY", () => {
  const app = read("phase4/app.js");
  const pointSelection = functionBody(app, "onSelectPoint");
  const selectStructure = functionBody(app, "selectStructure");
  const replaceEntitySelection = functionBody(app, "replaceEntitySelection");
  const contextRequest = functionBody(app, "onContextRequest");
  const moveToggle = functionBody(app, "onMoveModeToggle");
  const rallyToggle = functionBody(app, "onRallyModeToggle");
  assert.match(pointSelection, /selectStructure\(hit\.value\.id\)/);
  assert.match(pointSelection, /replaceEntitySelection\(\[hit\.value\.id\],\s*payload\.additive\)/);
  assert.match(selectStructure, /selectedEntityIds\.clear\(\)/);
  assert.match(selectStructure, /selectedStructureId\s*=\s*structure\.id/);
  assert.match(replaceEntitySelection, /selectedStructureId\s*=\s*null/);
  assert.match(replaceEntitySelection, /selectedEntityIds\.(?:clear|add)\(/);
  assert.match(contextRequest, /SET_RALLY/);
  assert.match(contextRequest, /MOVE/);
  assert.match(app, /rally-mode-button/);
  assert.match(app, /move-mode-button/);
  assert.match(moveToggle, /setContextMode\(/);
  assert.match(moveToggle, /["']move["']/);
  assert.match(rallyToggle, /setContextMode\(/);
  assert.match(rallyToggle, /["']rally["']/);
  assert.doesNotMatch(app, /source\s*===\s*["']touch["'][\s\S]{0,120}(?:MOVE|SET_RALLY)/i, "touch commands must go through explicit context mode");
});

test("the app advances only fixed simulation ticks and never implements later-phase authority", () => {
  const app = read("phase4/app.js");
  const loop = functionBody(app, "animationLoop");
  assert.match(app, /simulationApi\.createSimulation\(\{\s*map,\s*seed:/);
  assert.match(app, /simulation\.submitCommand\(/);
  assert.match(app, /replayApi\.canAppendAccepted\([^)]*predictedReceipt/);
  assert.match(app, /replayApi\.appendAccepted\(/);
  assert.match(loop, /configuration\.tickDurationMs/);
  assert.match(loop, /configuration\.maxCatchUpTicks/);
  assert.match(loop, /simulation\.step\(\)/);
  assert.doesNotMatch(app, /Math\.random|Date\.now|WebSocket|RTCPeerConnection|fetch\s*\(/);
  assert.doesNotMatch(app, /ATTACK_ENTITY|ATTACK_MOVE|strategic AI|campaign/i);
});

test("every classic Phase 4 source parses and excludes prototype terminology and networking", () => {
  for (const relativePath of PHASE4_LOCAL_SOURCES) {
    const source = read(relativePath);
    assert.doesNotThrow(() => new vm.Script(source, { filename: relativePath }));
    assert.doesNotMatch(source, /\bunit(?:Id|Ids|s)?\b/i, `${relativePath} revives a prototype unit alias`);
    assert.doesNotMatch(source, /WebSocket|RTCPeerConnection|signaling|TURN server/i, `${relativePath} adds networking`);
  }
});

test("Pages stages the complete bounded Phase 4 route and exactly eight structure WebPs", () => {
  const files = staging.verifyRuntimeFiles();
  const phase4Files = files.filter((relativePath) => relativePath.startsWith("phase4/"));
  const structureWebPs = phase4Files.filter((relativePath) => (
    relativePath.startsWith("phase4/assets/structures/") && relativePath.endsWith(".webp")
  ));
  assert.ok(phase4Files.includes("phase4/index.html"));
  assert.ok(phase4Files.includes("phase4/phase4.css"));
  assert.ok(phase4Files.includes("phase4/assets/structures/manifest.js"));
  assert.ok(phase4Files.includes("phase4/app.js"));
  assert.equal(structureWebPs.length, 8);
  assert.equal(phase4Files.some((relativePath) => /damage/i.test(relativePath)), false);
  assert.equal(files.some((relativePath) => relativePath.startsWith("tools/")), false);
});
