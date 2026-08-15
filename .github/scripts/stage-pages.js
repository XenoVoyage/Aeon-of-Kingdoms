#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const RUNTIME_FILES = Object.freeze([
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
const EXPECTED_SHELL_ASSETS = Object.freeze([
  "./",
  "index.html",
  "css/status.css",
  "js/status.js"
]);
const REJECTED_PROTOTYPE_PATHS = Object.freeze([
  "manifest.webmanifest",
  "icons/",
  "css/tokens.css",
  "css/app.css",
  "js/config.js",
  "js/core.js",
  "js/simulation.js",
  "js/ai.js",
  "js/render.js",
  "js/input.js",
  "js/game.js",
  "docs/assets/"
]);

function localReferences(source) {
  const references = [];
  for (const match of source.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const value = match[1].trim();
    if (!value || value.startsWith("#") || /^(?:https?:|data:|mailto:|tel:)/i.test(value)) continue;
    references.push(value.split(/[?#]/, 1)[0]);
  }
  return references;
}

function normalizedPublicPath(reference) {
  const withoutDotPrefix = reference.replace(/^\.\//, "");
  if (!withoutDotPrefix) return "index.html";
  const normalized = path.posix.normalize(withoutDotPrefix);
  if (normalized === ".." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`Pages reference escapes the public root: ${reference}`);
  }
  if (normalized === ".") return "index.html";
  return normalized.endsWith("/") ? `${normalized}index.html` : normalized;
}

function resolvedPublicPath(ownerPath, reference) {
  const joined = path.posix.join(path.posix.dirname(ownerPath), reference);
  if (reference.endsWith("/") && !joined.endsWith("/")) {
    return normalizedPublicPath(`${joined}/`);
  }
  return normalizedPublicPath(joined);
}

function isRejectedPrototypePath(relativePath) {
  return REJECTED_PROTOTYPE_PATHS.some((prototypePath) => (
    prototypePath.endsWith("/")
      ? relativePath.startsWith(prototypePath)
      : relativePath === prototypePath
  ));
}

function serviceWorkerShell(serviceWorker) {
  const shellLiteral = serviceWorker.match(/const\s+SHELL_ASSETS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  if (!shellLiteral) {
    throw new Error("sw.js must expose one explicit frozen SHELL_ASSETS allowlist");
  }
  return Array.from(shellLiteral[1].matchAll(/["']([^"']+)["']/g), (match) => match[1]);
}

function verifyRuntimeFiles() {
  const allowed = new Set(RUNTIME_FILES);
  for (const relativePath of RUNTIME_FILES) {
    if (isRejectedPrototypePath(relativePath)) {
      throw new Error(`Rejected prototype source must not be staged: ${relativePath}`);
    }
    const sourcePath = path.join(PROJECT_ROOT, relativePath);
    const stat = fs.lstatSync(sourcePath, { throwIfNoEntry: false });
    if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Missing or unsafe Pages source: ${relativePath}`);
    }
  }

  for (const relativePath of RUNTIME_FILES.filter((entry) => entry.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
    for (const reference of localReferences(html)) {
      const normalized = resolvedPublicPath(relativePath, reference);
      if (!allowed.has(normalized)) {
        throw new Error(`${relativePath} references a file outside the Pages allowlist: ${reference}`);
      }
    }
  }

  for (const relativePath of RUNTIME_FILES.filter((entry) => entry.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      const value = match[1].trim();
      if (!value || /^(?:data:|https?:|#)/i.test(value)) continue;
      const normalized = normalizedPublicPath(path.posix.join(path.posix.dirname(relativePath), value.split(/[?#]/, 1)[0]));
      if (!allowed.has(normalized)) {
        throw new Error(`${relativePath} references a file outside the Pages allowlist: ${value}`);
      }
    }
  }

  const serviceWorker = fs.readFileSync(path.join(PROJECT_ROOT, "sw.js"), "utf8");
  if (/https?:\/\//i.test(serviceWorker)) {
    throw new Error("sw.js must not reference an external origin");
  }
  const cachedAssets = serviceWorkerShell(serviceWorker);
  if (cachedAssets.length !== EXPECTED_SHELL_ASSETS.length || cachedAssets.some((asset, index) => asset !== EXPECTED_SHELL_ASSETS[index])) {
    throw new Error("sw.js must cache only the minimal redesign status shell");
  }
  for (const asset of cachedAssets) {
    const normalized = normalizedPublicPath(asset);
    if (!allowed.has(normalized) || normalized.startsWith("docs/") || normalized === "sw.js") {
      throw new Error(`sw.js caches a non-shell file: ${asset}`);
    }
  }

  return RUNTIME_FILES.slice();
}

function safeOutputPath(outputArgument) {
  const outputPath = path.resolve(PROJECT_ROOT, outputArgument || "_site");
  const relative = path.relative(PROJECT_ROOT, outputPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Pages output must be a dedicated directory inside the repository");
  }
  if (relative !== "_site") {
    throw new Error("Pages output must be the repository-local _site directory");
  }
  return outputPath;
}

function stage(outputArgument) {
  const files = verifyRuntimeFiles();
  const outputPath = safeOutputPath(outputArgument);
  fs.rmSync(outputPath, { recursive: true, force: true });
  fs.mkdirSync(outputPath, { recursive: true });

  for (const relativePath of files) {
    const destination = path.join(outputPath, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(PROJECT_ROOT, relativePath), destination);
  }
  fs.writeFileSync(path.join(outputPath, ".nojekyll"), "", { flag: "wx" });
  return files;
}

if (require.main === module) {
  try {
    const files = stage(process.argv[2]);
    process.stdout.write(`Staged ${files.length} verified public files in _site\n`);
  } catch (error) {
    process.stderr.write(`${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  EXPECTED_SHELL_ASSETS,
  RUNTIME_FILES,
  localReferences,
  resolvedPublicPath,
  stage,
  verifyRuntimeFiles
};
