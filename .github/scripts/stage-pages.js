#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const RUNTIME_FILES = Object.freeze([
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
  "js/game.js"
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

function verifyRuntimeFiles() {
  const allowed = new Set(RUNTIME_FILES);
  for (const relativePath of RUNTIME_FILES) {
    const sourcePath = path.join(PROJECT_ROOT, relativePath);
    const stat = fs.lstatSync(sourcePath, { throwIfNoEntry: false });
    if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Missing or unsafe Pages source: ${relativePath}`);
    }
  }

  const html = fs.readFileSync(path.join(PROJECT_ROOT, "index.html"), "utf8");
  for (const reference of localReferences(html)) {
    const normalized = path.posix.normalize(reference.replace(/^\.\//, ""));
    if (!allowed.has(normalized)) {
      throw new Error(`index.html references a file outside the Pages allowlist: ${reference}`);
    }
  }

  for (const relativePath of RUNTIME_FILES.filter((entry) => entry.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      const value = match[1].trim();
      if (!value || /^(?:data:|https?:|#)/i.test(value)) continue;
      const normalized = path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), value.split(/[?#]/, 1)[0]));
      if (!allowed.has(normalized)) {
        throw new Error(`${relativePath} references a file outside the Pages allowlist: ${value}`);
      }
    }
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "manifest.webmanifest"), "utf8"));
  if (manifest.start_url !== "./" && manifest.start_url !== "./index.html") {
    throw new Error("manifest.webmanifest must use a repository-relative start_url");
  }
  if (manifest.scope !== "./") {
    throw new Error("manifest.webmanifest must use the repository-relative ./ scope");
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    throw new Error("manifest.webmanifest must declare local icons");
  }
  for (const icon of manifest.icons) {
    const normalized = path.posix.normalize(String(icon.src || "").replace(/^\.\//, ""));
    if (!allowed.has(normalized)) {
      throw new Error(`manifest.webmanifest references a file outside the Pages allowlist: ${icon.src || "(missing)"}`);
    }
  }

  const serviceWorker = fs.readFileSync(path.join(PROJECT_ROOT, "sw.js"), "utf8");
  if (/https?:\/\//i.test(serviceWorker)) {
    throw new Error("sw.js must not reference an external origin");
  }
  for (const match of serviceWorker.matchAll(/["']\.\/([^"'?#]*)[?#]?[^"']*["']/g)) {
    const value = match[1];
    const normalized = value ? path.posix.normalize(value) : "index.html";
    if (!allowed.has(normalized)) {
      throw new Error(`sw.js references a file outside the Pages allowlist: ./${value}`);
    }
  }
  const shellLiteral = serviceWorker.match(/const\s+SHELL_ASSETS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  if (!shellLiteral) {
    throw new Error("sw.js must expose one explicit frozen SHELL_ASSETS allowlist");
  }
  const cachedFiles = new Set();
  for (const match of shellLiteral[1].matchAll(/["']([^"']+)["']/g)) {
    const value = match[1];
    const normalized = value === "./" ? "index.html" : path.posix.normalize(value.replace(/^\.\//, ""));
    if (!allowed.has(normalized)) {
      throw new Error(`sw.js caches a file outside the Pages allowlist: ${value}`);
    }
    cachedFiles.add(normalized);
  }
  const expectedCache = RUNTIME_FILES.filter((relativePath) => relativePath !== "sw.js");
  for (const relativePath of expectedCache) {
    if (!cachedFiles.has(relativePath)) {
      throw new Error(`sw.js does not cache an allowlisted shell file: ${relativePath}`);
    }
  }
  if (cachedFiles.size !== expectedCache.length) {
    throw new Error("sw.js shell cache and the Pages allowlist are out of sync");
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
    process.stdout.write(`Staged ${files.length} verified runtime files in _site\n`);
  } catch (error) {
    process.stderr.write(`${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  }
}

module.exports = { RUNTIME_FILES, localReferences, stage, verifyRuntimeFiles };
