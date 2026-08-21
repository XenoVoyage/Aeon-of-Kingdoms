"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));

const PAGE = "concepts/phase1b/index.html";
const STYLE = "concepts/phase1b/visual-lock.css";
const SPEC = "docs/PHASE1B_VISUAL_LOCK.md";
const SECTION_IDS = Object.freeze([
  "gate",
  "menu-hud",
  "battlefield",
  "factions",
  "interaction",
  "runtime-envelope",
  "evidence",
  "provenance"
]);
const ASTRAL_NAMES = Object.freeze([
  "Astral Guardian",
  "Starbow",
  "Aegis Titan",
  "Comet Lancer",
  "Radiant Cantor",
  "Concord Exemplar"
]);
const GRAVEBOUND_NAMES = Object.freeze([
  "Gravebound Reaver",
  "Hollow String",
  "Ossuary Colossus",
  "Barrow Warden",
  "Dirge Oracle",
  "Sepulchral Regent"
]);
const CONTRACTS = Object.freeze(["melee", "ranged", "signature", "line-control", "support", "champion"]);
const RUNTIME_SAMPLES = Object.freeze({
  "concepts/phase1b/runtime/astral-guardian-96-base.webp": Object.freeze({
    bytes: 60272,
    dimensions: Object.freeze([384, 384]),
    sha256: "80bf808947f09e1e0c3da38cb7fbb94a9f0b51dbb851fa14047dc17e0280b030"
  }),
  "concepts/phase1b/runtime/astral-guardian-96-mask.webp": Object.freeze({
    bytes: 9958,
    dimensions: Object.freeze([384, 384]),
    sha256: "314b62010a2e0c8cee27af14404882edf08dc33de46374020268869b29ffa923"
  }),
  "concepts/phase1b/runtime/astral-guardian-128-base.webp": Object.freeze({
    bytes: 98546,
    dimensions: Object.freeze([512, 512]),
    sha256: "fa298045f5e1697146e8294015c53e55abdffd236233c62e86ffd4173d1f2d7c"
  }),
  "concepts/phase1b/runtime/astral-guardian-128-mask.webp": Object.freeze({
    bytes: 14798,
    dimensions: Object.freeze([512, 512]),
    sha256: "ed8c9b03d6a3cf693ee8bcfc18a203386ea076ed7e7867bd956aec67c3044c77"
  })
});

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1];
}

function inspectWebP(bytes) {
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", "WebP must use RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", "invalid WebP signature");
  let dimensions;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.subarray(offset, offset + 4).toString("ascii");
    const size = bytes.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + size;
    assert.ok(dataEnd <= bytes.length, `${type} WebP chunk is truncated`);
    if (type === "VP8X") {
      dimensions = [bytes.readUIntLE(dataOffset + 4, 3) + 1, bytes.readUIntLE(dataOffset + 7, 3) + 1];
    } else if (type === "VP8 ") {
      dimensions ||= [bytes.readUInt16LE(dataOffset + 6) & 0x3fff, bytes.readUInt16LE(dataOffset + 8) & 0x3fff];
    } else if (type === "VP8L") {
      assert.equal(bytes[dataOffset], 0x2f, "invalid lossless WebP signature");
      const packedDimensions = bytes.readUInt32LE(dataOffset + 1);
      dimensions ||= [(packedDimensions & 0x3fff) + 1, ((packedDimensions >>> 14) & 0x3fff) + 1];
    }
    offset = dataEnd + (size % 2);
  }
  assert.ok(dimensions, "WebP has no supported dimensions");
  return dimensions;
}

test("Phase 1B page presents one non-playable owner-gated visual target", () => {
  const html = read(PAGE);
  assert.match(html, /<html\b[^>]*\blang=["']en["']/i);
  assert.match(html, /Phase 1B · Visual and interaction lock/i);
  assert.match(html, /One visual target\.\s*<br>Zero gameplay claims/i);
  assert.match(html, /explicit owner approval pending|Owner approval of this complete target/i);
  assert.match(html, /Phase 2 stays blocked/i);
  assert.match(html, /not a renderer, match,\s+balance pass, shipping atlas, tag, or release/i);
  assert.match(html, /not running gameplay/i);
  for (const id of SECTION_IDS) assert.match(html, new RegExp(`id=["']${id}["']`, "i"), `missing ${id}`);
  assert.doesNotMatch(html, /<(?:script|canvas|form|dialog|svg)\b/i);

  assert.match(html, /owner-retained minimal Aeon of Kingdoms menu/i);
  assert.match(html, /src=["']\.\.\/images\/minimal-menu\.webp["']/i);
  assert.match(html, /map-dominant/i);
  assert.match(html, /No virtual joystick/i);
  assert.match(html, /Production/i);
  assert.match(html, /rally/i);
  assert.match(html, /Focus target/i);
});

test("Phase 1B candidate defines exactly three structures, six layers, twelve identities, and four viewport states", () => {
  const html = read(PAGE);
  const structures = Array.from(html.matchAll(/\bdata-structure-category=["']([^"']+)["']/gi), (match) => match[1]);
  assert.deepEqual(structures, ["headquarters", "resource-point", "production-outpost"]);
  assert.match(html, /Exactly three structure categories/i);
  for (const layer of ["Foreground occlusion", "Dynamic entities and effects", "Structure and objective anchors", "Navigation and blocker data", "Non-blocking detail", "Environment-only ground"]) {
    assert.match(html, new RegExp(layer, "i"));
  }

  const roleTags = Array.from(html.matchAll(/<article\b[^>]*class=["'][^"']*role-card[^"']*["'][^>]*>/gi), (match) => match[0]);
  assert.equal(roleTags.length, 12);
  const factionCounts = new Map();
  const contractCounts = new Map();
  for (const tag of roleTags) {
    const faction = attribute(tag, "data-faction");
    const contract = attribute(tag, "data-contract");
    factionCounts.set(faction, (factionCounts.get(faction) || 0) + 1);
    contractCounts.set(contract, (contractCounts.get(contract) || 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(factionCounts), { astral: 6, gravebound: 6 });
  assert.deepEqual([...contractCounts.keys()].sort(), [...CONTRACTS].sort());
  for (const contract of CONTRACTS) assert.equal(contractCounts.get(contract), 2, `${contract} must pair both factions`);
  const publicNames = Array.from(html.matchAll(/<h4>([^<]+)<\/h4>/g), (match) => match[1]);
  assert.deepEqual(publicNames, [...ASTRAL_NAMES, ...GRAVEBOUND_NAMES]);
  assert.equal(new Set(publicNames).size, 12, "public role names must be unique");
  assert.equal((html.match(/· Proven<\/span>/g) || []).length, 6);
  assert.equal((html.match(/· Candidate<\/span>/g) || []).length, 6);

  const viewports = Array.from(html.matchAll(/\bdata-viewport=["']([^"']+)["']/gi), (match) => match[1]);
  assert.deepEqual(viewports, ["desktop-landscape", "tablet-landscape", "phone-landscape", "portrait-gate"]);
  assert.match(html, /Two-finger camera pan/i);
  assert.match(html, /Pinch zoom around finger focus/i);
  assert.match(html, /Rotate to landscape/i);
  assert.match(html, /Match paused · transient input cleared/i);
});

test("runtime envelope preserves the production-art contract and measured local budgets", () => {
  const combined = `${read(PAGE)}\n${read(SPEC)}`;
  for (const pattern of [
    /384\s*[×x]\s*384[^\n]*(?:192,\s*354)/i,
    /128\s*[×x]\s*128[^\n]*(?:64,\s*118)/i,
    /96\s*[×x]\s*96[^\n]*(?:48,\s*88\.5)/i,
    /4\s*[×x]\s*4[^\n]*16 unique frames/i,
    /idle aliases (?:the exact )?movement(?:-frame| frame) zero/i,
    /canonical right/i,
    /scaleX\(-1\)/i,
    /Logical 1 idle · 4 move · 6 action\/cast · 6 defeat/i,
    /lossless WebP base plus separate[^\n]*player-color mask/i,
    /688,988 bytes/i,
    /431,220 bytes/i,
    /1,377,976/i,
    /862,440/i,
    /24 MiB/i,
    /13\.5 MiB/i,
    /ImageMagick 6\.9\.12-98/i,
    /libwebp 1\.3\.2/i,
    /never intentionally retain both tiers decoded/i,
    /default to (?:the )?128/i,
    /Compact art/i,
    /text-only local preload error/i,
    /block battle start/i,
    /Simulation[^.]*owns/i
  ]) assert.match(combined, pattern);

  assert.match(read(SPEC), /zero movement upper-region differences, zero mask escape pixels, and zero lossless round-trip pixel differences/i);
  assert.match(read(SPEC), /256 KiB ordinary, 384 KiB signature, and 3\.25 MiB full-roster hard caps/i);
  assert.match(read(SPEC), /384-pixel maximum-edge/i);
  assert.match(read(SPEC), /Damage-state transparent masters are not yet complete/i);
});

test("Phase 1B review is local, responsive, safe-area aware, and exactly staged", () => {
  const html = read(PAGE);
  assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.match(html, /script-src 'none'/i);
  assert.match(html, /style-src 'self'/i);
  assert.match(html, /img-src 'self'/i);
  assert.match(html, /connect-src 'none'/i);
  assert.doesNotMatch(html, /unsafe-(?:inline|eval)/i);
  assert.doesNotMatch(html, /<(?:img|link|source)\b[^>]+(?:src|href|srcset)=["'](?:https?:|\/)/i);
  assert.match(html, /visual-lock\.css\?v=2026\.8\.21b/i);

  const imageTags = Array.from(html.matchAll(/<img\b[^>]*>/gi), (match) => match[0]);
  assert.equal(imageTags.length, 10);
  for (const tag of imageTags) {
    assert.match(tag, /\bwidth=["']\d+["']/i);
    assert.match(tag, /\bheight=["']\d+["']/i);
    assert.match(tag, /\balt=["'][^"']+["']/i);
    assert.match(tag, /\bdecoding=["']async["']/i);
  }
  assert.equal(imageTags.filter((tag) => /\bloading=["']lazy["']/i.test(tag)).length, 9);
  assert.match(imageTags[0], /\bfetchpriority=["']high["']/i);

  const css = read(STYLE);
  assert.match(css, /@media\s*\([^)]*max-width:\s*76rem/i);
  assert.match(css, /@media\s*\([^)]*max-width:\s*44rem/i);
  assert.match(css, /prefers-reduced-motion:\s*reduce/i);
  assert.match(css, /env\(safe-area-inset-(?:top|right|bottom|left)\)/i);
  assert.match(css, /object-fit:\s*contain/i);
  assert.match(css, /\.matrix-wrap:focus-visible/i);
  assert.doesNotMatch(css, /@import|url\(/i);

  const spec = read(SPEC);
  assert.match(spec, /env\(safe-area-inset-\*\)/i);
  assert.match(spec, /4:3 through 21:9/i);
  assert.match(spec, /640[×x]360 CSS pixels/i);
  assert.match(spec, /Cloud emulation is rendered evidence only; named physical-device observations remain separately pending/i);
  assert.match(html, /5\/5 focused · 77\/77 integrated/i);
  assert.match(html, /PR #14 · Pages run 32516391299/i);
  assert.match(html, /Cloud Chrome at 1348×936; exact version not exposed/i);
  const status = read("docs/STATUS.md");
  assert.match(status, /pull request `#14` squash-merged the candidate as `618d3498c302e08068be99eb7aa585a9a3d162d8`/i);
  assert.match(status, /Offline audit run `32516391298` and Pages run `32516391299` completed successfully/i);
  assert.match(status, /All ten local images completed with their recorded natural dimensions/i);
  assert.match(status, /actual compact-page reflow, 200% rendered zoom, display-cutout emulation, and physical devices remain pending/i);

  const files = staging.verifyRuntimeFiles();
  assert.ok(files.includes(PAGE));
  assert.ok(files.includes(STYLE));
  const references = new Set(staging.localReferences(html).map((reference) => staging.resolvedPublicPath(PAGE, reference)));
  for (const reference of references) assert.ok(files.includes(reference), `${reference} must be staged`);
  for (const [relativePath, expected] of Object.entries(RUNTIME_SAMPLES)) {
    assert.ok(files.includes(relativePath), `${relativePath} must be staged`);
    const bytes = fs.readFileSync(path.join(ROOT, relativePath));
    assert.equal(bytes.length, expected.bytes, `${relativePath} byte size changed`);
    assert.deepEqual(inspectWebP(bytes), expected.dimensions, `${relativePath} dimensions changed`);
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), expected.sha256, `${relativePath} hash changed`);
  }
  assert.deepEqual(staging.EXPECTED_SHELL_ASSETS, ["./", "index.html", "css/status.css", "js/status.js"]);
  assert.doesNotMatch(read("sw.js"), /concepts\/phase1b/i);
});

test("Phase 1B candidate explicitly rejects superseded and unrelated visual sources", () => {
  const combined = `${read(PAGE)}\n${read(SPEC)}`;
  for (const pattern of [
    /rejected\s+<code>v2026\.8\.15<\/code> prototype/i,
    /mixed\s+<code>v2026\.8\.20a<\/code> proof/i,
    /v5 (?:directional\/motion images|motion\/directional files)/i,
    /limb atlases/i,
    /bone rigs/i,
    /independent left\/right art/i,
    /independently redrawn idle\/move upper bodies/i,
    /color-only ownership/i,
    /fourth structure category/i,
    /Neon Voyage assets, layout, styling, structure, or gameplay/i
  ]) assert.match(combined, pattern);
  assert.doesNotMatch(read(PAGE), /concepts\/feasibility\/images\//i);
  assert.doesNotMatch(read(PAGE), /concepts\/images\/(?:battlefield|astral-concord|gravebound-court|structures|combat-readability|mobile-landscape|production-rally)\.webp/i);
});
