"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const PROOF_DIRECTORY = path.join(ROOT, "concepts/feasibility/images");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const RASTER_ASSETS = Object.freeze({
  "battlefield-scale.webp": { dimensions: [1672, 941], bytes: 195564, alpha: false },
  "astral-roles.webp": { dimensions: [1672, 941], bytes: 226066, alpha: true },
  "gravebound-roles.webp": { dimensions: [1536, 1024], bytes: 195050, alpha: true }
});
const VECTOR_ASSETS = Object.freeze({
  "structure-states.svg": { dimensions: [1600, 1020], bytes: 7901 },
  "map-layers.svg": { dimensions: [1600, 1040], bytes: 6958 },
  "animation-proof.svg": { dimensions: [1600, 980], bytes: 7681 }
});
const EXPECTED_ASSETS = Object.freeze([
  ...Object.keys(RASTER_ASSETS),
  ...Object.keys(VECTOR_ASSETS)
]);

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
      assert.deepEqual([...bytes.subarray(dataOffset + 3, dataOffset + 6)], [0x9d, 0x01, 0x2a], "invalid VP8 key-frame signature");
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

test("Phase 1A proof states the exact owner decision without presenting gameplay", () => {
  const html = read("concepts/feasibility/index.html");
  assert.match(html, /<html\b[^>]*\blang=["']en["']/i);
  assert.match(html, /id=["']feasibility-proof["']/i);
  assert.match(html, /Phase 1A · Production feasibility/i);
  assert.match(html, /Draft · Owner review needed/i);
  assert.match(html, /Approve the method, not final assets/i);
  assert.match(html, /not sprite-level\s+surface detail/i);
  assert.match(html, /Neither is implemented\s+gameplay or a shipping sprite atlas/i);
  assert.match(html, /Approval closes Phase 1A only/i);
  assert.match(html, /does not authorize gameplay implementation/i);

  for (const section of ["scale", "entities", "structures", "map-layers", "animation", "owner-decision"]) {
    assert.match(html, new RegExp(`id=["']${section}["']`, "i"), `missing ${section} review section`);
  }
  for (const roleName of ["Dawn Guard", "Starbow", "Aegis Titan", "Grave Reaver", "Hollow String", "Ossuary Colossus"]) {
    assert.match(html, new RegExp(roleName, "i"), `missing representative entity ${roleName}`);
  }
  assert.match(html, /Exactly three categories · no disguised fourth structure/i);
  assert.match(html, /Resource Points and Production Outposts keep one shared world silhouette/i);
  assert.match(html, /Idle, move, attack or cast, and defeat/i);
  assert.match(html, /State cues do not rely on hue/i);
  assert.match(html, /96 frames per entity across four directions/i);
  assert.match(html, /≤3\.25 MiB encoded and ≤26 MiB decoded/i);
  assert.match(html, /provisional until one representative Phase 1B atlas is measured/i);
  assert.doesNotMatch(html, /<(?:canvas|script|form|dialog)\b/i);
});

test("Phase 1A proof is local, semantic, responsive, and explicit about practical scale", () => {
  const html = read("concepts/feasibility/index.html");
  assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.match(html, /script-src 'none'/i);
  assert.match(html, /style-src 'self'/i);
  assert.match(html, /img-src 'self'/i);
  assert.match(html, /connect-src 'none'/i);
  assert.doesNotMatch(html, /unsafe-(?:inline|eval)/i);
  assert.doesNotMatch(html, /<(?:img|link)\b[^>]+(?:src|href)=["'](?:https?:|\/)/i);

  const imageTags = Array.from(html.matchAll(/<img\b[^>]*>/gi), (match) => match[0]);
  assert.equal(imageTags.length, 12);
  for (const tag of imageTags) {
    assert.match(tag, /\bwidth=["']\d+["']/i);
    assert.match(tag, /\bheight=["']\d+["']/i);
    assert.match(tag, /\balt=["'][^"']+["']/i);
    assert.match(tag, /\bdecoding=["']async["']/i);
  }
  assert.equal(imageTags.filter((tag) => /\bloading=["']lazy["']/i.test(tag)).length, 11);
  assert.match(imageTags[0], /\bfetchpriority=["']high["']/i);
  const uniqueSources = [...new Set(imageTags.map((tag) => tag.match(/\bsrc=["']images\/([^"']+)["']/i)?.[1]))].sort();
  assert.deepEqual(uniqueSources, [...EXPECTED_ASSETS].sort());

  assert.match(html, /1280×720 CSS pixels/i);
  assert.match(html, /932×430 CSS pixels/i);
  const css = read("concepts/feasibility/proof.css");
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/i);
  assert.match(css, /aspect-ratio:\s*932\s*\/\s*430/i);
  assert.match(css, /@media\s*\([^)]*max-width:\s*64rem/i);
  assert.match(css, /@media\s*\([^)]*max-width:\s*36rem/i);
  assert.match(css, /prefers-reduced-motion/i);
  assert.doesNotMatch(css, /@import|url\(/i);
});

test("Phase 1A raster targets retain exact dimensions, alpha intent, and bounded bytes", () => {
  let totalBytes = 0;
  for (const [name, expected] of Object.entries(RASTER_ASSETS)) {
    const bytes = fs.readFileSync(path.join(PROOF_DIRECTORY, name));
    const inspected = inspectWebP(bytes);
    totalBytes += bytes.length;
    assert.equal(bytes.length, expected.bytes, `${name} encoded bytes changed`);
    assert.deepEqual(inspected.dimensions, expected.dimensions, `${name} dimensions changed`);
    assert.equal(inspected.chunks.includes("ALPH"), expected.alpha, `${name} alpha intent changed`);
    assert.ok(bytes.length <= 300 * 1024, `${name} exceeds the 300 KiB review-image budget`);
  }
  assert.equal(totalBytes, 616680);
});

test("Phase 1A SVG diagrams are bounded, self-contained, accessible, and contract-complete", () => {
  const expectedTerms = {
    "structure-states.svg": ["FACTION-UNIQUE HEADQUARTERS", "SHARED RESOURCE POINT", "SHARED PRODUCTION OUTPOST", "Neutral", "diamond", "crossed"],
    "map-layers.svg": ["Ground", "Detail", "Navigation", "Anchors", "Dynamic order", "Foreground", "No 3D physics or height engine"],
    "animation-proof.svg": ["Idle", "Move", "Attack", "Defeat", "wind-up", "contact at simulation tick", "recover"]
  };

  let totalBytes = 0;
  for (const [name, expected] of Object.entries(VECTOR_ASSETS)) {
    const bytes = fs.readFileSync(path.join(PROOF_DIRECTORY, name));
    const svg = bytes.toString("utf8");
    totalBytes += bytes.length;
    assert.equal(bytes.length, expected.bytes, `${name} encoded bytes changed`);
    assert.match(svg, new RegExp(`<svg[^>]*width=["']${expected.dimensions[0]}["'][^>]*height=["']${expected.dimensions[1]}["']`, "i"));
    assert.match(svg, new RegExp(`viewBox=["']0 0 ${expected.dimensions[0]} ${expected.dimensions[1]}["']`, "i"));
    assert.match(svg, /role=["']img["'][^>]*aria-labelledby=["']title description["']/i);
    assert.match(svg, /<title\b[^>]*>[^<]+<\/title>/i);
    assert.match(svg, /<desc\b[^>]*>[^<]+<\/desc>/i);
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image)\b/i);
    assert.doesNotMatch(svg, /\b(?:href|xlink:href)=["'](?!#)/i);
    for (const term of expectedTerms[name]) assert.match(svg, new RegExp(term, "i"), `${name} omits ${term}`);
  }

  assert.equal(totalBytes, 22540);
  assert.equal(totalBytes + 616680, 639220);
  assert.ok(totalBytes + 616680 <= 700 * 1024, "proof-image set exceeds the 700 KiB review budget");
  assert.deepEqual(fs.readdirSync(PROOF_DIRECTORY).sort(), [...EXPECTED_ASSETS].sort());
  assert.match(read("docs/ASSETS.md"), /Total Phase 1A proof-image payload: \*\*639,220 bytes\*\*/);
});

test("Phase 1A proof is staged but excluded from the offline status shell", () => {
  const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));
  const files = staging.verifyRuntimeFiles();
  assert.ok(files.includes("concepts/feasibility/index.html"));
  assert.ok(files.includes("concepts/feasibility/proof.css"));
  for (const asset of EXPECTED_ASSETS) assert.ok(files.includes(`concepts/feasibility/images/${asset}`));
  assert.equal(files.length, 24);
  assert.deepEqual(staging.EXPECTED_SHELL_ASSETS, ["./", "index.html", "css/status.css", "js/status.js"]);
  assert.doesNotMatch(read("sw.js"), /concepts\//i);
});
