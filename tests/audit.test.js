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
  "js/config.js",
  "js/core.js",
  "js/simulation.js",
  "js/ai.js",
  "js/render.js",
  "js/input.js",
  "js/game.js",
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
  "docs/STATUS.md",
  "docs/ASSETS.md",
  ".github/workflows/ci.yml",
  ".github/workflows/pages.yml",
  ".github/scripts/stage-pages.js"
];

test("required source and project-standard files exist", () => {
  for (const relativePath of REQUIRED_FILES) {
    assert.ok(fs.statSync(path.join(ROOT, relativePath), { throwIfNoEntry: false })?.isFile(), `missing ${relativePath}`);
  }
});

test("VERSION.txt is canonical and required public mirrors match", () => {
  const version = read("VERSION.txt").trim();
  assert.match(version, /^v\d{4}\.\d{1,2}\.\d{1,2}[a-z]?$/);
  assert.match(read("README.md"), new RegExp(`Version ${version.replaceAll(".", "\\.")}`));
  assert.ok(read("CHANGELOG.md").includes(`## [${version}]`), "changelog current heading does not match VERSION.txt");
  assert.ok(read("docs/STATUS.md").includes(`\`${version}\` in \`VERSION.txt\``), "status version does not match VERSION.txt");
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

test("HTML uses local relative runtime resources and a restrictive CSP", () => {
  const html = read("index.html");
  assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.doesNotMatch(html, /unsafe-eval/i);
  assert.doesNotMatch(html, /<(?:script|link)\b[^>]+(?:src|href)=["'](?:https?:|\/)/i);

  const expectedScripts = [
    "js/config.js",
    "js/core.js",
    "js/simulation.js",
    "js/ai.js",
    "js/render.js",
    "js/input.js",
    "js/game.js"
  ];
  const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1]);
  assert.deepEqual(scripts, expectedScripts, "runtime scripts must appear exactly once in dependency order");
  for (const script of scripts) assert.ok(fs.existsSync(path.join(ROOT, script)), `missing ${script}`);

  for (const stylesheet of ["css/tokens.css", "css/app.css"]) {
    assert.equal((html.match(new RegExp(stylesheet.replaceAll(".", "\\."), "g")) || []).length, 1, `${stylesheet} must be linked exactly once`);
  }
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

test("Pages allowlist contains runtime only and verifies cleanly", () => {
  const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));
  const files = staging.verifyRuntimeFiles();
  assert.deepEqual(files, staging.RUNTIME_FILES);
  for (const relativePath of files) {
    assert.doesNotMatch(relativePath, /^(?:docs|tests|\.github)\//);
    assert.doesNotMatch(relativePath, /(?:README|LICENSE|CHANGELOG|VERSION|package\.json)/i);
  }
});

test("public status does not present planned multiplayer as shipped", () => {
  const publicText = `${read("README.md")}\n${read("docs/STATUS.md")}`;
  assert.match(publicText, /multiplayer[^\n]*(?:not shipped|planned)/i);
  assert.match(read("docs/NETCODE.md"), /not a feature of the current vertical slice/i);
});
