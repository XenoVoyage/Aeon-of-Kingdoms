"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));

const ENTITIES = Object.freeze([
  "astral-guardian",
  "starbow",
  "aegis-titan",
  "gravebound-reaver",
  "hollow-string",
  "ossuary-colossus"
]);
const ENTITY_NAMES = Object.freeze([
  "Astral Guardian",
  "Starbow",
  "Aegis Titan",
  "Gravebound Reaver",
  "Hollow String",
  "Ossuary Colossus"
]);
const STATES = Object.freeze(["idle", "move", "attack", "defeat"]);
const STAGED_REVIEW_ASSETS = Object.freeze([
  "concepts/feasibility/phase1a/review/opening-entities.webp",
  "concepts/feasibility/phase1a/review/six-player-ownership.webp",
  "concepts/feasibility/phase1a/review/battlefield-desktop.webp",
  "concepts/feasibility/phase1a/review/battlefield-phone.webp",
  "concepts/feasibility/phase1a/review/entity-atlas-audit.jpg",
  "concepts/feasibility/phase1a/environment/battlefield-environment.webp",
  "concepts/feasibility/phase1a/structures/production-outpost-damage.webp",
  ...ENTITIES.flatMap((entity) => [
    ...STATES.map((state) => `concepts/feasibility/phase1a/entities/${entity}/${state}.webp`),
    `concepts/feasibility/phase1a/entities/${entity}/player-colors.webp`
  ])
]);

function inspectWebP(bytes) {
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", "WebP must use RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", "invalid WebP signature");
  const chunks = [];
  let dimensions;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.subarray(offset, offset + 4).toString("ascii");
    const size = bytes.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + size;
    assert.ok(dataEnd <= bytes.length, `${type} WebP chunk is truncated`);
    chunks.push(type);
    if (type === "VP8X") {
      dimensions = [bytes.readUIntLE(dataOffset + 4, 3) + 1, bytes.readUIntLE(dataOffset + 7, 3) + 1];
    } else if (type === "VP8 ") {
      dimensions ||= [bytes.readUInt16LE(dataOffset + 6) & 0x3fff, bytes.readUInt16LE(dataOffset + 8) & 0x3fff];
    }
    offset = dataEnd + (size % 2);
  }
  assert.ok(dimensions, "WebP has no supported dimensions");
  return { chunks, dimensions };
}

test("published Phase 1A review presents the approved package without claiming gameplay", () => {
  const html = read("concepts/feasibility/index.html");
  assert.match(html, /<html\b[^>]*\blang=["']en["']/i);
  assert.match(html, /id=["']production-proof["']/i);
  assert.match(html, /Phase 1A · Approved and closed/i);
  assert.match(html, /Owner-approved production direction · Non-playable/i);
  assert.match(html, /One coherent world\. Six proven entities/i);
  assert.match(html, /Phase 1A is approved and closed/i);

  for (const section of ["battlefield", "ownership", "motion", "contract"]) {
    assert.match(html, new RegExp(`id=["']${section}["']`, "i"), `missing ${section} review section`);
  }
  for (const entityName of ENTITY_NAMES) {
    assert.match(html, new RegExp(entityName, "i"), `missing representative entity ${entityName}`);
  }
  for (const entity of ENTITIES) {
    for (const state of STATES) {
      assert.match(
        html,
        new RegExp(`href=["']phase1a/entities/${entity}/${state}\\.webp["']`, "i"),
        `missing authored-scale link for ${entity}/${state}`
      );
    }
  }

  assert.equal((html.match(/Idle · 1/g) || []).length, 6);
  assert.equal((html.match(/Move · 4/g) || []).length, 6);
  assert.equal((html.match(/Action · 6/g) || []).length, 6);
  assert.equal((html.match(/Defeat · 6/g) || []).length, 6);
  assert.equal((html.match(/<details\b[^>]*class=["']motion-details["'][^>]*>/gi) || []).length, 6);
  assert.equal((html.match(/<details\b[^>]*\bopen\b/gi) || []).length, 0, "looping playback must start hidden");
  assert.equal((html.match(/<nav\b[^>]*class=["']motion-links["'][^>]*>/gi) || []).length, 6);
  assert.match(html, /Playback is hidden until it is explicitly opened and can be hidden again at any time/i);
  assert.match(html, /Final corrected export:[^<]*head, torso, hips, feet, gait, and punch all agree on screen-right/i);
  assert.match(html, /Canonical art faces screen-right; screen-left is\s+the exact horizontal mirror/i);
  assert.match(html, /Exactly three categories/i);
  assert.match(html, /Faction headquarters\. Shared Resource Point\. Shared Production Outpost/i);
  assert.match(html, /environment-only source/i);
  assert.match(html, /Simulation—not animation—owns outcomes and timing/i);
  assert.match(html, /color-plus-symbol ownership/i);
  assert.match(html, /not a\s+gameplay screenshot, implemented renderer, final roster, balance pass, AI proof, or release/i);
  assert.doesNotMatch(html, /Superseded v5 proof|Do not approve this motion|baked-motion-v5|entity-directional-method-v5/i);
  assert.doesNotMatch(html, /<(?:canvas|script|form|dialog|svg)\b/i);
});

test("approved review remains local, semantic, responsive, and reduced-motion safe", () => {
  const html = read("concepts/feasibility/index.html");
  assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.match(html, /script-src 'none'/i);
  assert.match(html, /style-src 'self'/i);
  assert.match(html, /img-src 'self'/i);
  assert.match(html, /connect-src 'none'/i);
  assert.match(html, /href=["']proof\.css\?v=2026\.8\.21a["']/i, "changed proof CSS must bypass the superseded cached stylesheet");
  assert.doesNotMatch(html, /unsafe-(?:inline|eval)/i);
  assert.doesNotMatch(html, /<(?:img|link|source)\b[^>]+(?:src|href|srcset)=["'](?:https?:|\/)/i);

  const imageTags = Array.from(html.matchAll(/<img\b[^>]*>/gi), (match) => match[0]);
  assert.equal(imageTags.length, 31);
  for (const tag of imageTags) {
    assert.match(tag, /\bwidth=["']\d+["']/i);
    assert.match(tag, /\bheight=["']\d+["']/i);
    assert.match(tag, /\balt=["'][^"']+["']/i);
    assert.match(tag, /\bdecoding=["']async["']/i);
  }
  assert.equal(imageTags.filter((tag) => /\bloading=["']lazy["']/i.test(tag)).length, 30);
  assert.match(imageTags[0], /\bfetchpriority=["']high["']/i);

  const reducedSources = Array.from(html.matchAll(/<source\b[^>]*>/gi), (match) => match[0]);
  assert.equal(reducedSources.length, 18);
  for (const tag of reducedSources) {
    assert.match(tag, /prefers-reduced-motion:\s*reduce/i);
    assert.match(tag, /\/idle\.webp/i);
  }

  const referenced = new Set(staging.localReferences(html).map((reference) => (
    staging.resolvedPublicPath("concepts/feasibility/index.html", reference)
  )));
  for (const asset of STAGED_REVIEW_ASSETS) assert.ok(referenced.has(asset), `approved page does not reference ${asset}`);

  const css = read("concepts/feasibility/proof.css");
  assert.match(css, /@media\s*\([^)]*max-width:\s*78rem/i);
  assert.match(css, /@media\s*\([^)]*max-width:\s*42rem/i);
  assert.match(css, /prefers-reduced-motion:\s*reduce/i);
  assert.match(css, /:focus-visible/i);
  assert.match(css, /\.motion-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/is);
  assert.match(css, /\.motion-details\s*>\s*summary/i);
  assert.doesNotMatch(css, /@import|url\(\s*["']?(?:https?:|\/)/i);
});

test("staged Phase 1A review assets are the exact optimized current set", () => {
  assert.equal(STAGED_REVIEW_ASSETS.length, 37);
  let totalBytes = 0;
  for (const relativePath of STAGED_REVIEW_ASSETS) {
    const bytes = fs.readFileSync(path.join(ROOT, relativePath));
    totalBytes += bytes.length;
    if (relativePath.endsWith(".jpg")) {
      assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8], `${relativePath} is not JPEG`);
      continue;
    }

    const inspected = inspectWebP(bytes);
    if (/\/entities\//.test(relativePath)) {
      const playerColors = relativePath.endsWith("/player-colors.webp");
      assert.deepEqual(inspected.dimensions, playerColors ? [1024, 330] : [760, 240], `${relativePath} dimensions`);
      const animated = /\/(?:move|attack|defeat)\.webp$/.test(relativePath);
      assert.equal(inspected.chunks.includes("ANIM"), animated, `${relativePath} animation boundary`);
    } else {
      assert.equal(inspected.chunks.includes("ANIM"), false, `${relativePath} must be static`);
    }
  }
  assert.equal(totalBytes, 2503564);
  assert.ok(totalBytes <= 2.5 * 1024 * 1024, "approved published review exceeds 2.5 MiB");
});

test("Pages stages only the approved published review subset and excludes the v5 proof", () => {
  const files = staging.verifyRuntimeFiles();
  assert.equal(files.length, 57);
  assert.ok(files.includes("concepts/feasibility/index.html"));
  assert.ok(files.includes("concepts/feasibility/proof.css"));
  for (const asset of STAGED_REVIEW_ASSETS) assert.ok(files.includes(asset), `approved review asset is not staged: ${asset}`);

  const publicPaths = files.join("\n");
  assert.doesNotMatch(publicPaths, /concepts\/feasibility\/images\//i);
  assert.doesNotMatch(publicPaths, /\/phase1a\/(?:entities\/[^/]+\/(?:atlas\.png|atlas\.json|player-mask\.png)|structures\/[^/]+\.png|README\.md|manifest\.json)$/im);
  assert.deepEqual(staging.EXPECTED_SHELL_ASSETS, ["./", "index.html", "css/status.css", "js/status.js"]);
  assert.doesNotMatch(read("sw.js"), /concepts\//i);
});
