"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));

const PHASE5_SCRIPTS = Object.freeze([
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
  "config.js",
  "map.js",
  "navigation.js",
  "simulation.js",
  "replay.js",
  "assets/structures/manifest.js",
  "assets.js",
  "renderer.js",
  "input.js",
  "app.js?v=2026.8.22e"
]);

const PHASE5_LOCAL_SOURCES = Object.freeze([
  "phase5/config.js",
  "phase5/map.js",
  "phase5/navigation.js",
  "phase5/simulation.js",
  "phase5/replay.js",
  "phase5/assets/structures/manifest.js",
  "phase5/assets.js",
  "phase5/renderer.js",
  "phase5/input.js",
  "phase5/app.js"
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
    if (lineComment) { if (character === "\n") lineComment = false; continue; }
    if (blockComment) {
      if (character === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (character === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (character === "\"" || character === "'" || character === "`") { quote = character; continue; }
    if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return source.slice(openingBrace + 1, index);
  }
  assert.fail(`unterminated function ${name}`);
}

test("Phase 5 keeps the approved menu and one exact six-layer landscape shell", () => {
  const html = read("phase5/index.html");
  const scripts = Array.from(html.matchAll(/<script\s+src=["']([^"']+)["']/gi), (match) => match[1]);
  const layers = Array.from(html.matchAll(/<canvas\s+data-layer=["']([^"']+)["']/gi), (match) => match[1]);
  assert.deepEqual(scripts, PHASE5_SCRIPTS);
  assert.deepEqual(layers, ["ground", "detail", "navigation", "anchors", "dynamic", "foreground"]);
  assert.match(html, /data-src=["']\.\.\/concepts\/images\/minimal-menu\.webp["']/i);
  assert.match(html, /connect-src 'none'/i);
  assert.match(html, /id=["']orientation-gate["'][^>]*role=["']status["']/i);
  assert.match(html, /id=["']size-gate["'][^>]*role=["']status["']/i);
  assert.doesNotMatch(html, /https?:\/\/|<iframe|<object|<embed/i);
  assert.ok(read("concepts/images/minimal-menu.webp").length > 0);
});

test("visible tactical controls expose touch and keyboard focus without color-only state", () => {
  const html = read("phase5/index.html");
  for (const id of [
    "move-mode-button", "attack-mode-button", "attack-move-mode-button", "defend-point-mode-button",
    "defend-entity-mode-button", "stop-button", "rally-mode-button", "clear-rally-button"
  ]) assert.match(html, new RegExp(`<button\\s+id=["']${id}["'][^>]*type=["']button["']`, "i"));
  assert.match(html, /id=["']attack-mode-button["'][^>]*aria-pressed=/i);
  assert.match(html, /id=["']attack-move-mode-button["'][^>]*aria-keyshortcuts=["']X["']/i);
  assert.match(html, /id=["']defend-point-mode-button["'][^>]*>Defend Point</i);
  assert.match(html, /id=["']defend-entity-mode-button["'][^>]*>Defend Ally</i);
  assert.match(html, /id=["']match-status["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/i);
  assert.match(html, /hostile hover shows ⊗/i);
  assert.match(read("phase5/phase5.css"), /button\[aria-pressed=["']true["']\]::before\s*\{[^}]*◆/i);
});

test("compact landscape exposes contextual Rally and Clear rally without shrinking touch targets", () => {
  const css = read("phase5/phase5.css");
  const start = css.indexOf("@media (max-width: 760px)");
  const end = css.indexOf("@media (prefers-reduced-motion: reduce)", start);
  assert.ok(start >= 0 && end > start, "missing bounded compact-landscape rules");
  const compact = css.slice(start, end);
  assert.match(css, /\.command-controls button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/i);
  assert.match(compact,
    /\.command-controls:has\(#rally-mode-button:enabled\)[\s\S]*#rally-mode-button,[\s\S]*#clear-rally-button\s*\{[^}]*display:\s*inline-flex;/i);
  assert.match(compact,
    /\.command-controls:has\(#rally-mode-button:enabled\)[\s\S]*button:not\(#rally-mode-button\):not\(#clear-rally-button\)\s*\{[^}]*display:\s*none;/i);
  assert.doesNotMatch(compact, /#clear-rally-button:not\(:enabled\)\s*\{[^}]*display:\s*none;/i,
    "Clear rally remains an explicit disabled control until a rally exists");
});

test("selection detail and announcements expose health, order, targets, structure state, limits, and outcomes", () => {
  const app = read("phase5/app.js");
  const selection = functionBody(app, "updateSelectionUi");
  const events = functionBody(app, "processSimulationEvents");
  assert.match(selection, /HP \$\{structure\.health\}\/\$\{structure\.maxHealth\}/);
  assert.match(selection, /HP \$\{entity\.health\}\/\$\{entity\.maxHealth\}/);
  assert.match(selection, /entity\.order/);
  assert.match(selection, /entity\.targetId/);
  assert.match(selection, /defendAnchor/);
  assert.match(app, /DAMAGED/);
  assert.match(app, /DESTROYED/);
  assert.match(events, /projectile-limit/);
  assert.match(events, /event\.type === ["']match["']/);
  assert.match(events, /event\.status === ["']target-released["']/);
  assert.match(events, /Target released · congestion/);
  assert.match(events, /selectedReleaseAnnounced/,
    "a same-tick group release produces at most one selected-target live announcement");
  assert.match(app, /winnerSeat === null/);
  assert.match(functionBody(app, "announce"), /slice\(0, 180\)/, "live announcements remain transition-based and bounded");
  assert.match(functionBody(app, "updateMatchStatus"), /if \(matchSignature !== signature\)/);
  assert.doesNotMatch(read("phase5/index.html"), /aria-live=["']assertive["']/i);
});

test("context routes exact focus, attack-move, point/entity defend, stop, move, and rally commands", () => {
  const app = read("phase5/app.js");
  const contextRequest = functionBody(app, "onContextRequest");
  const selectPoint = functionBody(app, "onSelectPoint");
  const stop = functionBody(app, "stopSelection");
  assert.match(contextRequest, /payload\.mode === ["']attack["']/);
  assert.match(contextRequest, /payload\.mode === null && hostile/);
  assert.match(contextRequest, /ATTACK_ENTITY/);
  assert.match(contextRequest, /targetId:\s*hostile\.id/);
  assert.match(contextRequest, /ATTACK_MOVE/);
  assert.match(contextRequest, /anchor:\s*\{ kind: ["']point["'], destination \}/);
  assert.match(contextRequest, /anchor:\s*\{ kind: ["']entity["'], entityId: anchor\.id \}/);
  assert.match(contextRequest, /SET_RALLY/);
  assert.match(contextRequest, /MOVE/);
  assert.match(stop, /STOP/);
  assert.match(selectPoint, /input\?\.snapshot\(\)\.contextMode/);
  const keys = functionBody(app, "onTacticalKeyDown");
  for (const code of ["KeyM", "KeyF", "KeyX", "KeyD", "KeyG", "KeyS"]) assert.match(keys, new RegExp(code));
  assert.match(keys, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(app, /source\s*===\s*["']touch["'][\s\S]{0,140}(?:ATTACK_ENTITY|ATTACK_MOVE|DEFEND|STOP)/i);
});

test("transient tactical modes are exclusive and clear across pause, gates, lifecycle, menu, and teardown", () => {
  const input = read("phase5/input.js");
  const app = read("phase5/app.js");
  assert.match(input, /new Set\(\[\s*["']move["'], ["']rally["'], ["']attack["'], ["']attack-move["'], ["']defend-point["'], ["']defend-entity["']/);
  assert.match(functionBody(input, "setContextMode"), /contextMode = mode/);
  assert.match(functionBody(input, "resetTransient"), /contextMode = null/);
  assert.match(functionBody(input, "setEnabled"), /contextMode = null/);
  assert.match(functionBody(input, "destroy"), /contextMode = null/);
  assert.match(functionBody(app, "onPauseToggle"), /input\?\.resetTransient\(\)/);
  assert.match(functionBody(app, "onVisibilityChange"), /input\?\.resetTransient\(\)/);
  assert.match(functionBody(app, "updateViewport"), /input\.resetTransient\(\)/);
  assert.match(functionBody(app, "unloadRuntime"), /input\.destroy\(\)/);
  assert.match(functionBody(app, "returnToMenu"), /unloadRuntime\(\)/);
});

test("renderer binds authored action/defeat timing, exact mirror, damage art, and bounded cues to presentation only", () => {
  const renderer = read("phase5/renderer.js");
  const frame = functionBody(renderer, "entityFrameIndex");
  const structureState = functionBody(renderer, "structureVisualState");
  assert.match(frame, /Math\.min\(5, Math\.floor\(elapsed \* 6 \/ cycle\)\)/);
  assert.match(frame, /Math\.floor\(entity\.defeatAgeTicks \/ 2\)/);
  assert.match(renderer, /if \(entity\.facing === ["']left["']\) context\.scale\(-1, 1\)/);
  assert.match(structureState, /health \* 2 <= structure\.maxHealth/);
  assert.match(renderer, /states\?\.\[state\]/);
  assert.match(renderer, /state === ["']destroyed["].*owner/i);
  assert.match(renderer, /HOSTILE ⊗/);
  assert.match(renderer, /const cap = configuration\.projectileCap/);
  assert.match(renderer, /const cap = configuration\.presentationalEffectCap/);
  assert.doesNotMatch(renderer, /projectileCap\s*\?\?|presentationalEffectCap\s*\?\?|effectCap|DEFEAT_TICKS/);
  assert.doesNotMatch(renderer, /requestAnimationFrame|submitCommand|applyDamage|Math\.random/);
});

test("the app advances fixed authoritative ticks and uses a separate bounded post-match presentation clock", () => {
  const app = read("phase5/app.js");
  const loop = functionBody(app, "animationLoop");
  const submit = functionBody(app, "submit");
  assert.match(app, /simulationApi\.createSimulation\(\{\s*map,\s*seed:/);
  assert.match(app, /simulation\.submitCommand\(/);
  assert.match(app, /replayApi\.appendAccepted\(/);
  assert.match(submit, /if \(effectivePaused\(\)\)/);
  assert.match(loop, /configuration\.tickDurationMs/);
  assert.match(loop, /simulation\.step\(\)/);
  assert.match(loop, /currentSnapshot\.match\?\.status === ["']complete["'][\s\S]*presentationTick \+= 1[\s\S]*continue/);
  assert.match(app, /defeatAgeTicks >= configuration\.defeatPresentationTicks/);
  assert.match(app, /return configuration\.presentationalEffectCap/);
  assert.doesNotMatch(app, /presentationalEffectCap\s*\?\?|effectCap|defeatAgeTicks >= 12/);
  assert.match(app, /presentationalEffects\.length \+ defeatShells\.length >= presentationCap\(\)/);
  assert.doesNotMatch(app, /Math\.random|Date\.now|WebSocket|RTCPeerConnection|fetch\s*\(/);
  assert.doesNotMatch(app, /strategic AI|campaign|support ability/i);
});

test("every classic Phase 5 source parses, remains local-only, and Pages stages exactly twelve damage WebPs", () => {
  for (const relativePath of PHASE5_LOCAL_SOURCES) {
    const source = read(relativePath);
    assert.doesNotThrow(() => new vm.Script(source, { filename: relativePath }));
    assert.doesNotMatch(source, /WebSocket|RTCPeerConnection|signaling|TURN server/i, `${relativePath} adds networking`);
  }
  const files = staging.verifyRuntimeFiles();
  const phase5Files = files.filter((relativePath) => relativePath.startsWith("phase5/"));
  const damageWebPs = phase5Files.filter((relativePath) => relativePath.endsWith(".webp"));
  assert.ok(phase5Files.includes("phase5/index.html"));
  assert.ok(phase5Files.includes("phase5/phase5.css"));
  assert.ok(phase5Files.includes("phase5/assets/structures/manifest.js"));
  assert.ok(phase5Files.includes("phase5/app.js"));
  assert.equal(damageWebPs.length, 12);
  assert.equal(damageWebPs.filter((relativePath) => /destroyed-mask/i.test(relativePath)).length, 0);
  assert.equal(files.some((relativePath) => relativePath.startsWith("tools/")), false);
});
