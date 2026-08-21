"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const PROOF_DIRECTORY = path.join(ROOT, "concepts/feasibility/images");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const RASTER_ASSETS = Object.freeze({
  "production-battlefield-environment-v4.webp": { dimensions: [1672, 941], bytes: 166944, alpha: false, animated: false },
  "structure-atlas-v2.webp": { dimensions: [1536, 1024], bytes: 190180, alpha: false, animated: false },
  "entity-team-color-v4.webp": { dimensions: [1800, 900], bytes: 200218, alpha: false, animated: false },
  "structure-damage-v3.webp": { dimensions: [1800, 638], bytes: 83282, alpha: false, animated: false },
  "entity-directional-method-v5.webp": { dimensions: [1800, 1080], bytes: 173004, alpha: false, animated: false },
  "astral-baked-motion-v5.webp": { dimensions: [1800, 1000], bytes: 466512, alpha: false, animated: true },
  "gravebound-baked-motion-v5.webp": { dimensions: [1800, 1000], bytes: 300370, alpha: false, animated: true },
  "astral-baked-motion-static-v5.webp": { dimensions: [1800, 1000], bytes: 153342, alpha: false, animated: false },
  "gravebound-baked-motion-static-v5.webp": { dimensions: [1800, 1000], bytes: 105906, alpha: false, animated: false },
  "astral-baked-motion-audit-v5.webp": { dimensions: [1800, 1440], bytes: 253152, alpha: false, animated: false },
  "gravebound-baked-motion-audit-v5.webp": { dimensions: [1800, 1440], bytes: 170352, alpha: false, animated: false }
});
const EXPECTED_ASSETS = Object.freeze(Object.keys(RASTER_ASSETS));

function inspectWebP(bytes) {
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", "WebP must use a RIFF container");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", "invalid WebP signature");

  const chunks = [];
  let dimensions;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.subarray(offset, offset + 4).toString("ascii");
    const size = bytes.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + size;
    assert.ok(dataEnd <= bytes.length, `truncated ${type} chunk`);
    chunks.push(type);

    if (type === "VP8X") {
      assert.ok(size >= 10, "VP8X canvas header is truncated");
      dimensions = [
        bytes.readUIntLE(dataOffset + 4, 3) + 1,
        bytes.readUIntLE(dataOffset + 7, 3) + 1
      ];
    } else if (type === "VP8 ") {
      assert.ok(size >= 10, "VP8 frame header is truncated");
      assert.deepEqual(
        [...bytes.subarray(dataOffset + 3, dataOffset + 6)],
        [0x9d, 0x01, 0x2a],
        "invalid VP8 key-frame signature"
      );
      dimensions ||= [
        bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
        bytes.readUInt16LE(dataOffset + 8) & 0x3fff
      ];
    }

    offset = dataEnd + (size % 2);
  }

  assert.ok(dimensions, "WebP has no supported canvas or frame dimensions");
  return { chunks, dimensions };
}

test("superseded Phase 1A v5 proof records its outcome without presenting gameplay", () => {
  const html = read("concepts/feasibility/index.html");
  assert.match(html, /<html\b[^>]*\blang=["']en["']/i);
  assert.match(html, /id=["']production-proof["']/i);
  assert.match(html, /Phase 1A · Historical review record/i);
  assert.match(html, /Phase 1A · Superseded v5 proof/i);
  assert.match(html, /Useful direction\. Superseded motion/i);
  assert.match(html, /Do not approve this motion/i);
  assert.match(html, /right-facing canonical source, exact mirrored left facing/i);
  assert.match(html, /environment, structures, damage, and player-color boundaries informed the approved\s+direction/i);

  for (const section of ["battlefield", "assets", "direction", "motion", "decision"]) {
    assert.match(html, new RegExp(`id=["']${section}["']`, "i"), `missing ${section} review section`);
  }
  for (const entityName of ["Astral Guardian", "Gravebound Reaver"]) {
    assert.match(html, new RegExp(entityName, "i"), `missing representative entity ${entityName}`);
  }
  assert.equal((html.match(/idle · move · attack · defeat/gi) || []).length, 2);

  assert.match(html, /Exactly three structure categories/i);
  assert.match(html, /Two HQ forms · one Resource Point · one Production Outpost/i);
  assert.match(html, /No limb rig—but the facing rule changed/i);
  assert.match(html, /right-facing sequence is\s+its exact horizontal mirror/i);
  assert.match(html, /complete, visually audited body with its large weapon and\s+shield already attached/i);
  assert.match(html, /intact → scorched and burning → collapsed ruin/i);
  assert.match(html, /Simulation ticks—not\s+animation\s+frames—remain authoritative/i);
  assert.match(html, /idle 1, move 4, action 6, defeat 6/i);
  assert.match(html, /Superseded: v5 facing, equal frame counts, roots, and motion/i);
  assert.doesNotMatch(html, /<(?:canvas|script|form|dialog)\b/i);
  assert.doesNotMatch(html, /structure-states\.svg|map-layers\.svg|animation-proof\.svg/i);
});

test("superseded Phase 1A v5 proof remains local, semantic, responsive, animated, and reduced-motion safe", () => {
  const html = read("concepts/feasibility/index.html");
  assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.match(html, /script-src 'none'/i);
  assert.match(html, /style-src 'self'/i);
  assert.match(html, /img-src 'self'/i);
  assert.match(html, /connect-src 'none'/i);
  assert.doesNotMatch(html, /unsafe-(?:inline|eval)/i);
  assert.doesNotMatch(html, /<(?:img|link)\b[^>]+(?:src|href)=["'](?:https?:|\/)/i);

  const imageTags = Array.from(html.matchAll(/<img\b[^>]*>/gi), (match) => match[0]);
  assert.equal(imageTags.length, 9);
  for (const tag of imageTags) {
    assert.match(tag, /\bwidth=["']\d+["']/i);
    assert.match(tag, /\bheight=["']\d+["']/i);
    assert.match(tag, /\balt=["'][^"']+["']/i);
    assert.match(tag, /\bdecoding=["']async["']/i);
  }
  assert.equal(imageTags.filter((tag) => /\bloading=["']lazy["']/i.test(tag)).length, 8);
  assert.match(imageTags[0], /\bfetchpriority=["']high["']/i);

  const htmlSources = [...new Set(imageTags.map((tag) => tag.match(/\bsrc=["']images\/([^"']+)["']/i)?.[1]))].sort();
  assert.deepEqual(htmlSources, [
    "astral-baked-motion-v5.webp",
    "entity-directional-method-v5.webp",
    "entity-team-color-v4.webp",
    "gravebound-baked-motion-v5.webp",
    "production-battlefield-environment-v4.webp",
    "structure-atlas-v2.webp",
    "structure-damage-v3.webp"
  ]);
  assert.match(html, /<source\b[^>]*prefers-reduced-motion:\s*reduce[^>]*astral-baked-motion-static-v5\.webp/is);
  assert.match(html, /<source\b[^>]*prefers-reduced-motion:\s*reduce[^>]*gravebound-baked-motion-static-v5\.webp/is);

  assert.match(html, /Animated six-frame Astral Guardian baked-sprite proof/i);
  assert.match(html, /Animated six-frame Gravebound Reaver baked-sprite proof/i);
  assert.equal((html.match(/class=["'][^"']*motion-sprite/gi) || []).length, 0);
  assert.equal((html.match(/class=["'][^"']*rig-stage/gi) || []).length, 0);
  assert.doesNotMatch(html, /<svg\b/i);

  const css = read("concepts/feasibility/proof.css");
  assert.match(css, /@media\s*\([^)]*max-width:\s*70rem/i);
  assert.match(css, /@media\s*\([^)]*max-width:\s*48rem/i);
  assert.match(css, /prefers-reduced-motion:\s*reduce/i);
  assert.doesNotMatch(css, /@import|url\(\s*["']?(?:https?:|\/)/i);
});

test("Phase 1A production-look rasters retain exact dimensions and a bounded local payload", () => {
  assert.deepEqual(
    fs.readdirSync(PROOF_DIRECTORY).sort(),
    [...EXPECTED_ASSETS].sort(),
    "superseded proof directory contains untracked residue or is missing a recorded asset"
  );
  let totalBytes = 0;
  for (const [name, expected] of Object.entries(RASTER_ASSETS)) {
    const bytes = fs.readFileSync(path.join(PROOF_DIRECTORY, name));
    const inspected = inspectWebP(bytes);
    totalBytes += bytes.length;
    assert.equal(bytes.length, expected.bytes, `${name} encoded bytes changed`);
    assert.deepEqual(inspected.dimensions, expected.dimensions, `${name} dimensions changed`);
    assert.equal(inspected.chunks.includes("ALPH"), expected.alpha, `${name} alpha boundary changed`);
    assert.equal(inspected.chunks.includes("ANIM"), expected.animated, `${name} animation boundary changed`);
    const budget = expected.animated ? 500 * 1024 : 400 * 1024;
    assert.ok(bytes.length <= budget, `${name} exceeds its encoded asset budget`);
  }
  assert.equal(totalBytes, 2263262);
  assert.ok(totalBytes <= 2.25 * 1024 * 1024, "Phase 1A visual set exceeds the 2.25 MiB review budget");
});

test("Phase 1A proof stages only the active production-look assets and excludes them from the offline shell", () => {
  const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));
  const files = staging.verifyRuntimeFiles();
  assert.ok(files.includes("concepts/feasibility/index.html"));
  assert.ok(files.includes("concepts/feasibility/proof.css"));
  for (const asset of EXPECTED_ASSETS) assert.ok(files.includes(`concepts/feasibility/images/${asset}`));
  for (const obsolete of [
    "entity-masters-v2.webp",
    "astral-rig-parts-v2.webp",
    "astral-cutout-rig-v2.webp",
    "astral-cutout-rig-static-v2.webp",
    "astral-motion-v2.webp",
    "gravebound-motion-v2.webp",
    "entity-rig-masters-v4.webp",
    "entity-rig-overlay-v4.webp",
    "astral-cutout-motion-v4.webp",
    "gravebound-cutout-motion-v4.webp",
    "astral-cutout-motion-static-v4.webp",
    "gravebound-cutout-motion-static-v4.webp",
    "astral-motion-audit-v4.webp",
    "gravebound-motion-audit-v4.webp"
  ]) {
    assert.ok(!files.includes(`concepts/feasibility/images/${obsolete}`), `obsolete proof asset is public: ${obsolete}`);
  }
  assert.equal(files.length, 31);
  assert.deepEqual(staging.EXPECTED_SHELL_ASSETS, ["./", "index.html", "css/status.css", "js/status.js"]);
  assert.doesNotMatch(read("sw.js"), /concepts\//i);
});
