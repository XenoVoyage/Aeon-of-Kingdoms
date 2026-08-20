"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const REQUIRED_FILES = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "icons/icon.svg",
  "icons/icon-maskable.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "css/tokens.css",
  "css/app.css",
  "css/status.css",
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
  "js/config.js",
  "js/core.js",
  "js/simulation.js",
  "js/ai.js",
  "js/render.js",
  "js/input.js",
  "js/game.js",
  "js/status.js",
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "LICENSE",
  "CHANGELOG.md",
  "VERSION.txt",
  "docs/GAME_DESIGN.md",
  "docs/ARCHITECTURE.md",
  "docs/NETCODE.md",
  "docs/REDESIGN.md",
  "docs/STATUS.md",
  "docs/ASSETS.md",
  "tests/fixtures/visual-capture.html",
  "tests/fixtures/visual-capture.js",
  ".github/workflows/ci.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/visual.yml",
  ".github/scripts/stage-pages.js"
];

test("required source and project-standard files exist", () => {
  for (const relativePath of REQUIRED_FILES) {
    assert.ok(fs.statSync(path.join(ROOT, relativePath), { throwIfNoEntry: false })?.isFile(), `missing ${relativePath}`);
  }
});

test("public documentation identifies the rejected prototype and active redesign", () => {
  const readme = read("README.md");
  assert.match(readme, /rejected the `v2026\.8\.15` prototype/);
  assert.match(readme, /docs\/REDESIGN\.md/);
  assert.match(readme, /neither surface is redesigned gameplay/i);
  assert.match(readme, /historical release `v2026\.8\.15`/);
  assert.doesNotMatch(readme, /Historical prototype controls/);
  assert.doesNotMatch(readme, /docs\/assets\/gameplay\.webp/);
  assert.match(read("AGENTS.md"), /Active redesign override/);
  assert.match(read("AGENTS.md"), /Phase 0 and the roadmap baseline were approved/);
  assert.match(read("CONTRIBUTING.md"), /docs\/REDESIGN\.md/);
  assert.match(read("docs/ASSETS.md"), /Reviewed redesign mood references/);
  assert.match(read("docs/ASSETS.md"), /Rejected prototype archive/);
  assert.match(read("docs/ASSETS.md"), /1,253,726 bytes/);
  assert.match(read("tests/README.md"), /deployed non-playable redesign status page plus a reviewed Phase 1 mood-reference gallery/i);
  assert.match(read("docs/STATUS.md"), /Redesign gameplay implementation \| Not started/);
  assert.match(read("docs/STATUS.md"), /owner-supplied capture establishes only the visible portrait mobile state/);
  assert.match(read("docs/STATUS.md"), /product owner approved Phase 0/);
  assert.match(read("docs/STATUS.md"), /63\/63 integrated checks passed/);
  assert.match(read("docs/STATUS.md"), /16-file allowlist is preserved/);
  assert.match(read("docs/STATUS.md"), /919cc933a4def3a6688208f3e5a2180cc4d4687e/);
  assert.match(read("docs/STATUS.md"), /main audit run `32347611623` and Pages run `32347611618` completed successfully/);
  assert.match(read("docs/STATUS.md"), /all eight local WebP references at their recorded natural dimensions/);
  assert.match(read("docs/REDESIGN.md"), /Phase 0 and this roadmap baseline/);
  assert.match(read("docs/REDESIGN.md"), /Phase 1A — Production-feasibility proof/);
  assert.match(read("docs/REDESIGN.md"), /faction headquarters, Resource Point, and Production Outpost/);
  assert.match(read("docs/REDESIGN.md"), /four core animation families: idle, move, attack or cast, and defeat/i);
  assert.match(read("docs/REDESIGN.md"), /visual pixels never decide walkability/i);
  assert.match(read("SECURITY.md"), /static non-playable redesign status site/);
  assert.doesNotMatch(read("SECURITY.md"), /current release is a static local browser game/i);
});

test("VERSION.txt is canonical and required public mirrors match", () => {
  const version = read("VERSION.txt").trim();
  assert.match(version, /^v\d{4}\.\d{1,2}\.\d{1,2}[a-z]?$/);
  assert.match(read("README.md"), new RegExp(`Status build ${version.replaceAll(".", "\\.")}`));
  assert.ok(read("CHANGELOG.md").includes(`## [${version}]`), "changelog current heading does not match VERSION.txt");
  assert.ok(read("docs/STATUS.md").includes(`\`${version}\` in \`VERSION.txt\``), "status version does not match VERSION.txt");
  assert.ok(read("index.html").includes(version), "visible transition page version does not match VERSION.txt");
  assert.ok(read("sw.js").includes(`\${CACHE_PREFIX}${version}`), "service-worker cache version does not match VERSION.txt");
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(Object.hasOwn(packageJson, "version"), false, "package.json must not become a second version owner");
});

test("verification metadata has no install-time or runtime dependencies", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.private, true);
  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "devDependencies"), false);
  assert.equal(packageJson.scripts.test, "node tests/run.js");
  assert.match(packageJson.engines.node, /20/);
  assert.equal(fs.existsSync(path.join(ROOT, "package-lock.json")), false, "a lockfile is unnecessary for a zero-package harness");
});

test("status HTML uses only its local relative shell and a restrictive CSP", () => {
  const html = read("index.html");
  assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.doesNotMatch(html, /unsafe-eval/i);
  assert.doesNotMatch(html, /<(?:script|link)\b[^>]+(?:src|href)=["'](?:https?:|\/)/i);
  assert.doesNotMatch(html, /<canvas\b/i);
  assert.doesNotMatch(html, /manifest\.webmanifest/i);

  const expectedScripts = ["js/status.js"];
  const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1]);
  assert.deepEqual(scripts, expectedScripts, "runtime scripts must appear exactly once in dependency order");
  for (const script of scripts) assert.ok(fs.existsSync(path.join(ROOT, script)), `missing ${script}`);

  for (const stylesheet of ["css/status.css"]) {
    assert.equal((html.match(new RegExp(stylesheet.replaceAll(".", "\\."), "g")) || []).length, 1, `${stylesheet} must be linked exactly once`);
  }
  assert.doesNotMatch(html, /css\/(?:tokens|app)\.css/);
  assert.match(html, /docs\/REDESIGN\.md/);
  assert.match(html, /docs\/STATUS\.md/);
});

test("local Markdown links resolve", () => {
  const markdownFiles = REQUIRED_FILES.filter((entry) => entry.endsWith(".md"));
  for (const relativePath of markdownFiles) {
    const source = read(relativePath);
    for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim().replace(/^<|>$/g, "");
      if (!rawTarget || /^(?:https?:|mailto:|#)/i.test(rawTarget)) continue;
      const target = decodeURIComponent(rawTarget.split("#", 1)[0]);
      assert.ok(fs.existsSync(path.resolve(ROOT, path.dirname(relativePath), target)), `${relativePath} has broken link ${rawTarget}`);
    }
  }
});

test("workflows are bounded, least-privilege, and deploy the staged allowlist", () => {
  const ci = read(".github/workflows/ci.yml");
  const pages = read(".github/workflows/pages.yml");
  assert.match(ci, /permissions:\s*\n\s+contents: read/);
  assert.match(ci, /timeout-minutes: 10/);
  assert.match(ci, /node tests\/run\.js/);
  assert.match(ci, /persist-credentials: false/);
  assert.match(pages, /permissions:\s*\n\s+contents: read/);
  assert.match(pages, /pages: write/);
  assert.match(pages, /id-token: write/);
  assert.match(pages, /node tests\/run\.js/);
  assert.match(pages, /stage-pages\.js _site/);
  assert.match(pages, /path: _site/);
  assert.doesNotMatch(pages, /path: \.\s*$/m, "Pages must not upload the repository root");
  for (const workflow of [ci, pages]) {
    assert.doesNotMatch(workflow, /uses:\s+[^\s@]+@v\d+/i, "actions must be pinned to immutable commit SHAs");
    for (const action of workflow.matchAll(/uses:\s+([^\s@]+)@([^\s#]+)/g)) {
      assert.match(action[2], /^[a-f0-9]{40}$/, `${action[1]} must use a full commit SHA`);
    }
  }
});

test("Pages allowlist contains only the transition shell, mood references, and public status documents", () => {
  const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));
  const files = staging.verifyRuntimeFiles();
  assert.deepEqual(files, staging.RUNTIME_FILES);
  assert.deepEqual(files, [
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
  const staged = files.join("\n");
  assert.doesNotMatch(staged, /(?:manifest|icon|gameplay|visual-capture|README|LICENSE|CHANGELOG|VERSION|package\.json)/i);
  assert.doesNotMatch(staged, /(?:css\/(?:tokens|app)\.css|js\/(?:config|core|simulation|ai|render|input|game)\.js)/);
  assert.doesNotMatch(staged, /^(?:tests|\.github)\//m);

  for (const relativePath of files.filter((entry) => entry.endsWith(".md"))) {
    for (const match of read(relativePath).matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim().replace(/^<|>$/g, "");
      if (!rawTarget || /^(?:https?:|mailto:|#)/i.test(rawTarget)) continue;
      const target = decodeURIComponent(rawTarget.split("#", 1)[0]);
      const stagedTarget = staging.resolvedPublicPath(relativePath, target);
      assert.ok(files.includes(stagedTarget), `${relativePath} links to unstaged ${rawTarget}`);
    }
  }
});

test("public status does not present planned multiplayer as shipped", () => {
  const publicText = `${read("README.md")}\n${read("docs/STATUS.md")}`;
  assert.match(publicText, /multiplayer[^\n]*(?:not shipped|planned)/i);
  assert.match(read("docs/NETCODE.md"), /not a feature of the published rejected prototype/i);
});
