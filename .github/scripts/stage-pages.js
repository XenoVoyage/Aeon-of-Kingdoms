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
  "concepts/feasibility/index.html",
  "concepts/feasibility/proof.css",
  "concepts/feasibility/phase1a/review/opening-entities.webp",
  "concepts/feasibility/phase1a/review/six-player-ownership.webp",
  "concepts/feasibility/phase1a/review/battlefield-desktop.webp",
  "concepts/feasibility/phase1a/review/battlefield-phone.webp",
  "concepts/feasibility/phase1a/review/entity-atlas-audit.jpg",
  "concepts/feasibility/phase1a/environment/battlefield-environment.webp",
  "concepts/feasibility/phase1a/structures/production-outpost-damage.webp",
  "concepts/feasibility/phase1a/entities/astral-guardian/idle.webp",
  "concepts/feasibility/phase1a/entities/astral-guardian/move.webp",
  "concepts/feasibility/phase1a/entities/astral-guardian/attack.webp",
  "concepts/feasibility/phase1a/entities/astral-guardian/defeat.webp",
  "concepts/feasibility/phase1a/entities/astral-guardian/player-colors.webp",
  "concepts/feasibility/phase1a/entities/starbow/idle.webp",
  "concepts/feasibility/phase1a/entities/starbow/move.webp",
  "concepts/feasibility/phase1a/entities/starbow/attack.webp",
  "concepts/feasibility/phase1a/entities/starbow/defeat.webp",
  "concepts/feasibility/phase1a/entities/starbow/player-colors.webp",
  "concepts/feasibility/phase1a/entities/aegis-titan/idle.webp",
  "concepts/feasibility/phase1a/entities/aegis-titan/move.webp",
  "concepts/feasibility/phase1a/entities/aegis-titan/attack.webp",
  "concepts/feasibility/phase1a/entities/aegis-titan/defeat.webp",
  "concepts/feasibility/phase1a/entities/aegis-titan/player-colors.webp",
  "concepts/feasibility/phase1a/entities/gravebound-reaver/idle.webp",
  "concepts/feasibility/phase1a/entities/gravebound-reaver/move.webp",
  "concepts/feasibility/phase1a/entities/gravebound-reaver/attack.webp",
  "concepts/feasibility/phase1a/entities/gravebound-reaver/defeat.webp",
  "concepts/feasibility/phase1a/entities/gravebound-reaver/player-colors.webp",
  "concepts/feasibility/phase1a/entities/hollow-string/idle.webp",
  "concepts/feasibility/phase1a/entities/hollow-string/move.webp",
  "concepts/feasibility/phase1a/entities/hollow-string/attack.webp",
  "concepts/feasibility/phase1a/entities/hollow-string/defeat.webp",
  "concepts/feasibility/phase1a/entities/hollow-string/player-colors.webp",
  "concepts/feasibility/phase1a/entities/ossuary-colossus/idle.webp",
  "concepts/feasibility/phase1a/entities/ossuary-colossus/move.webp",
  "concepts/feasibility/phase1a/entities/ossuary-colossus/attack.webp",
  "concepts/feasibility/phase1a/entities/ossuary-colossus/defeat.webp",
  "concepts/feasibility/phase1a/entities/ossuary-colossus/player-colors.webp",
  "concepts/phase1b/index.html",
  "concepts/phase1b/visual-lock.css",
  "concepts/phase1b/runtime/astral-guardian-96-base.webp",
  "concepts/phase1b/runtime/astral-guardian-96-mask.webp",
  "concepts/phase1b/runtime/astral-guardian-128-base.webp",
  "concepts/phase1b/runtime/astral-guardian-128-mask.webp",
  "phase2/index.html",
  "phase2/phase2.css",
  "phase2/map.js",
  "phase2/camera.js",
  "phase2/renderer.js",
  "phase2/input.js",
  "phase2/app.js",
  "phase3/index.html",
  "phase3/phase3.css",
  "phase3/config.js",
  "phase3/navigation.js",
  "phase3/simulation.js",
  "phase3/replay.js",
  "phase3/assets/entities/manifest.js",
  "phase3/assets.js",
  "phase3/renderer.js",
  "phase3/input.js",
  "phase3/app.js",
  "phase3/assets/entities/astral-guardian/astral-guardian-96-base.webp",
  "phase3/assets/entities/astral-guardian/astral-guardian-96-mask.webp",
  "phase3/assets/entities/astral-guardian/astral-guardian-128-base.webp",
  "phase3/assets/entities/astral-guardian/astral-guardian-128-mask.webp",
  "phase3/assets/entities/starbow/starbow-96-base.webp",
  "phase3/assets/entities/starbow/starbow-96-mask.webp",
  "phase3/assets/entities/starbow/starbow-128-base.webp",
  "phase3/assets/entities/starbow/starbow-128-mask.webp",
  "phase3/assets/entities/aegis-titan/aegis-titan-96-base.webp",
  "phase3/assets/entities/aegis-titan/aegis-titan-96-mask.webp",
  "phase3/assets/entities/aegis-titan/aegis-titan-128-base.webp",
  "phase3/assets/entities/aegis-titan/aegis-titan-128-mask.webp",
  "phase3/assets/entities/gravebound-reaver/gravebound-reaver-96-base.webp",
  "phase3/assets/entities/gravebound-reaver/gravebound-reaver-96-mask.webp",
  "phase3/assets/entities/gravebound-reaver/gravebound-reaver-128-base.webp",
  "phase3/assets/entities/gravebound-reaver/gravebound-reaver-128-mask.webp",
  "phase3/assets/entities/hollow-string/hollow-string-96-base.webp",
  "phase3/assets/entities/hollow-string/hollow-string-96-mask.webp",
  "phase3/assets/entities/hollow-string/hollow-string-128-base.webp",
  "phase3/assets/entities/hollow-string/hollow-string-128-mask.webp",
  "phase3/assets/entities/ossuary-colossus/ossuary-colossus-96-base.webp",
  "phase3/assets/entities/ossuary-colossus/ossuary-colossus-96-mask.webp",
  "phase3/assets/entities/ossuary-colossus/ossuary-colossus-128-base.webp",
  "phase3/assets/entities/ossuary-colossus/ossuary-colossus-128-mask.webp",
  "phase4/index.html",
  "phase4/phase4.css",
  "phase4/config.js",
  "phase4/map.js",
  "phase4/navigation.js",
  "phase4/simulation.js",
  "phase4/replay.js",
  "phase4/assets/structures/manifest.js",
  "phase4/assets.js",
  "phase4/renderer.js",
  "phase4/input.js",
  "phase4/app.js",
  "phase4/assets/structures/astral-headquarters/astral-headquarters-384-base.webp",
  "phase4/assets/structures/astral-headquarters/astral-headquarters-384-mask.webp",
  "phase4/assets/structures/gravebound-headquarters/gravebound-headquarters-384-base.webp",
  "phase4/assets/structures/gravebound-headquarters/gravebound-headquarters-384-mask.webp",
  "phase4/assets/structures/resource-point/resource-point-384-base.webp",
  "phase4/assets/structures/resource-point/resource-point-384-mask.webp",
  "phase4/assets/structures/production-outpost/production-outpost-384-base.webp",
  "phase4/assets/structures/production-outpost/production-outpost-384-mask.webp",
  "phase5/index.html",
  "phase5/phase5.css",
  "phase5/config.js",
  "phase5/map.js",
  "phase5/navigation.js",
  "phase5/simulation.js",
  "phase5/replay.js",
  "phase5/assets/structures/manifest.js",
  "phase5/assets.js",
  "phase5/renderer.js",
  "phase5/input.js",
  "phase5/app.js",
  "phase5/assets/structures/astral-headquarters/astral-headquarters-384-damaged-base.webp",
  "phase5/assets/structures/astral-headquarters/astral-headquarters-384-damaged-mask.webp",
  "phase5/assets/structures/astral-headquarters/astral-headquarters-384-destroyed-base.webp",
  "phase5/assets/structures/gravebound-headquarters/gravebound-headquarters-384-damaged-base.webp",
  "phase5/assets/structures/gravebound-headquarters/gravebound-headquarters-384-damaged-mask.webp",
  "phase5/assets/structures/gravebound-headquarters/gravebound-headquarters-384-destroyed-base.webp",
  "phase5/assets/structures/resource-point/resource-point-384-damaged-base.webp",
  "phase5/assets/structures/resource-point/resource-point-384-damaged-mask.webp",
  "phase5/assets/structures/resource-point/resource-point-384-destroyed-base.webp",
  "phase5/assets/structures/production-outpost/production-outpost-384-damaged-base.webp",
  "phase5/assets/structures/production-outpost/production-outpost-384-damaged-mask.webp",
  "phase5/assets/structures/production-outpost/production-outpost-384-destroyed-base.webp",
  "docs/REDESIGN.md",
  "docs/PRODUCTION_ART.md",
  "docs/PHASE1B_VISUAL_LOCK.md",
  "docs/PHASE2_FOUNDATION.md",
  "docs/PHASE3_ENTITY_MOVEMENT.md",
  "docs/PHASE4_STRUCTURES_ECONOMY.md",
  "docs/PHASE5_COMBAT_TACTICS.md",
  "docs/PHASE6_STRATEGIC_AI.md",
  "docs/STATUS.md",
  "docs/ASSETS.md"
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
  for (const match of source.matchAll(/\b(?:src|href|srcset)\s*=\s*["']([^"']+)["']/gi)) {
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
