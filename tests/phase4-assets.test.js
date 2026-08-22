"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const ASSET_ROOT = path.join(ROOT, "phase4/assets/structures");
const MANIFEST_PATH = path.join(ASSET_ROOT, "manifest.js");
const EXPORTER_PATH = path.join(ROOT, "tools/export-phase4-structures.js");
const CONVERT_COMMAND = process.env.AOK_PHASE4_CONVERT || "convert";
const convertProbe = spawnSync(CONVERT_COMMAND, ["-version"], {
  encoding: "utf8",
  windowsHide: true
});
const REPRODUCTION_SKIP = convertProbe.status === 0
  ? false
  : "recorded ImageMagick toolchain is unavailable; committed bytes and invariants remain verified";
const manifest = require(MANIFEST_PATH);
const assets = require(path.join(ROOT, "phase4/assets.js"));

const EXPECTED_STRUCTURES = Object.freeze([
  Object.freeze({
    id: "astral-headquarters",
    category: "headquarters",
    architecture: "astral-concord",
    ownerPolicy: "fixed-faction",
    dimensions: Object.freeze([384, 355]),
    sourceDimensions: Object.freeze([1024, 947]),
    sourceAnchorIds: Object.freeze(["astral-headquarters-anchor"])
  }),
  Object.freeze({
    id: "gravebound-headquarters",
    category: "headquarters",
    architecture: "gravebound-court",
    ownerPolicy: "fixed-faction",
    dimensions: Object.freeze([384, 350]),
    sourceDimensions: Object.freeze([1024, 933]),
    sourceAnchorIds: Object.freeze(["gravebound-headquarters-anchor"])
  }),
  Object.freeze({
    id: "resource-point",
    category: "resource-point",
    architecture: "shared-neutral",
    ownerPolicy: "capturable-shared",
    dimensions: Object.freeze([384, 384]),
    sourceDimensions: Object.freeze([1024, 1024]),
    sourceAnchorIds: Object.freeze(["central-resource-point-anchor"])
  }),
  Object.freeze({
    id: "production-outpost",
    category: "production-outpost",
    architecture: "shared-neutral",
    ownerPolicy: "capturable-shared",
    dimensions: Object.freeze([384, 304]),
    sourceDimensions: Object.freeze([1024, 810]),
    sourceAnchorIds: Object.freeze(["west-production-outpost-anchor", "east-production-outpost-anchor"])
  })
]);
const EXPECTED_PLAYERS = Object.freeze([
  Object.freeze({ id: 1, name: "Azure", rgb: Object.freeze([47, 169, 255]), symbol: "diamond" }),
  Object.freeze({ id: 2, name: "Violet", rgb: Object.freeze([165, 92, 255]), symbol: "cross" }),
  Object.freeze({ id: 3, name: "Coral", rgb: Object.freeze([229, 83, 74]), symbol: "triangle" }),
  Object.freeze({ id: 4, name: "Emerald", rgb: Object.freeze([38, 190, 124]), symbol: "circle" }),
  Object.freeze({ id: 5, name: "Amber", rgb: Object.freeze([236, 169, 47]), symbol: "bars" }),
  Object.freeze({ id: 6, name: "Magenta", rgb: Object.freeze([222, 78, 174]), symbol: "chevron" })
]);
const EXACT_ENCODED_BYTES = 634642;

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function recursiveFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return recursiveFiles(absolutePath);
    return [path.relative(ASSET_ROOT, absolutePath).split(path.sep).join("/")];
  }).sort();
}

function inspectWebP(bytes) {
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", "WebP must use RIFF");
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, "WebP RIFF length");
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
    } else if (type === "VP8L") {
      assert.equal(bytes[dataOffset], 0x2f, "invalid lossless WebP signature");
      const packed = bytes.readUInt32LE(dataOffset + 1);
      dimensions ||= [(packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1];
    }
    offset = dataEnd + (size % 2);
  }
  assert.ok(dimensions, "WebP dimensions are missing");
  assert.ok(chunks.includes("VP8L"), "runtime structure must use lossless VP8L encoding");
  assert.equal(
    chunks.some((chunk) => ["VP8 ", "ANIM", "ANMF", "EXIF", "XMP ", "ICCP"].includes(chunk)),
    false,
    "runtime structure has a lossy, animated, or metadata chunk"
  );
  return { chunks, dimensions };
}

test("Phase 4 manifest freezes four approved forms, three categories, eight derivatives, and six color-plus-symbol cues", () => {
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.phase, "4");
  assert.equal(manifest.kind, "structure-runtime-assets");
  assert.equal(manifest.format, "lossless-webp");
  assert.equal(manifest.source.maximumEdge, 384);
  assert.deepEqual(manifest.structures.map(({ id }) => id), EXPECTED_STRUCTURES.map(({ id }) => id));
  assert.deepEqual(manifest.players, EXPECTED_PLAYERS);
  assert.deepEqual(manifest.limits, {
    structureCategories: 3,
    runtimeStructures: 4,
    capturableOwnerSeatCap: 2,
    encodedCeiling: EXACT_ENCODED_BYTES
  });
  assert.equal(manifest.totals.files, 8);
  assert.equal(manifest.totals.encodedBytes, EXACT_ENCODED_BYTES);
  assert.equal(manifest.totals.encodedCeiling, EXACT_ENCODED_BYTES);
  assert.equal(assets.validateManifest(manifest), manifest);
});

test("exactly eight lossless WebPs match strict manifest dimensions, bytes, hashes, containment, and decoded bounds", () => {
  const expectedFiles = ["manifest.js"];
  let encodedBytes = 0;
  let decodedBytes = 0;
  for (let index = 0; index < EXPECTED_STRUCTURES.length; index += 1) {
    const expected = EXPECTED_STRUCTURES[index];
    const structure = manifest.structures[index];
    assert.equal(structure.id, expected.id);
    assert.equal(structure.category, expected.category);
    assert.equal(structure.architecture, expected.architecture);
    assert.equal(structure.ownerPolicy, expected.ownerPolicy);
    assert.deepEqual(structure.sourceAnchorIds, expected.sourceAnchorIds);
    assert.deepEqual(structure.source.base.dimensions, expected.sourceDimensions);
    assert.deepEqual(structure.source.mask.dimensions, expected.sourceDimensions);
    assert.deepEqual(structure.files.base.dimensions, expected.dimensions);
    assert.deepEqual(structure.files.mask.dimensions, expected.dimensions);
    let pairBytes = 0;
    for (const kind of ["base", "mask"]) {
      const record = structure.files[kind];
      assert.match(record.path, new RegExp(`^assets/structures/${expected.id}/${expected.id}-384-${kind}\\.webp$`));
      const relative = record.path.replace(/^assets\/structures\//, "");
      expectedFiles.push(relative);
      const bytes = fs.readFileSync(path.join(ASSET_ROOT, relative));
      assert.equal(bytes.length, record.bytes, `${expected.id} ${kind} bytes`);
      assert.equal(sha256(bytes), record.sha256, `${expected.id} ${kind} SHA-256`);
      assert.deepEqual(inspectWebP(bytes).dimensions, expected.dimensions, `${expected.id} ${kind} dimensions`);
      assert.ok(record.alpha.visiblePixels > 0 && record.alpha.strongPixels > 0);
      assert.ok(record.alpha.strongPixels <= record.alpha.visiblePixels);
      pairBytes += bytes.length;
    }
    assert.equal(structure.files.pairBytes, pairBytes);
    assert.equal(structure.files.decodedBytes, expected.dimensions[0] * expected.dimensions[1] * 4 * 2);
    for (const key of ["borderAlphaPixels", "maskEscapePixels", "losslessRoundTripDifferences"]) {
      assert.equal(structure.files.audit[key], 0, `${expected.id} ${key}`);
    }
    encodedBytes += pairBytes;
    decodedBytes += structure.files.decodedBytes;
  }
  assert.deepEqual(recursiveFiles(ASSET_ROOT), expectedFiles.sort());
  assert.equal(encodedBytes, EXACT_ENCODED_BYTES);
  assert.equal(decodedBytes, 4279296);
  assert.equal(manifest.totals.decodedSourceBytes, 4279296);
  assert.equal(manifest.totals.preparedOwnerSheetsTwoPlayer, 6);
  assert.equal(manifest.totals.retainedDecodedBytesTwoPlayer, 5336064);
});

test("provenance is exact and the flattened damage strip is recorded but excluded from runtime", () => {
  for (const record of [manifest.source.package, manifest.source.map]) {
    const bytes = fs.readFileSync(path.join(ROOT, record.path));
    assert.equal(bytes.length, record.bytes, `${record.path} bytes`);
    assert.equal(sha256(bytes), record.sha256, `${record.path} SHA-256`);
  }
  for (const structure of manifest.structures) {
    for (const record of [structure.source.base, structure.source.mask]) {
      const bytes = fs.readFileSync(path.join(ROOT, record.path));
      assert.equal(bytes.length, record.bytes, `${record.path} bytes`);
      assert.equal(sha256(bytes), record.sha256, `${record.path} SHA-256`);
    }
  }
  const damage = manifest.damageEvidence;
  assert.equal(damage.runtimeAsset, false);
  assert.equal(damage.alpha, false);
  assert.deepEqual(damage.runtimeStates, ["intact"]);
  assert.match(damage.reason, /not aligned|must not/i);
  assert.equal(fs.readFileSync(path.join(ROOT, damage.path)).length, damage.bytes);
  assert.equal(recursiveFiles(ASSET_ROOT).some((relativePath) => /damage|destroy|scorch|fire/i.test(relativePath)), false);
  assert.match(manifest.toolchain.encode, /lossless WebP/i);
  assert.match(manifest.toolchain.encode, /exact RGBA/i);
  assert.match(manifest.toolchain.encode, /round-trip verified/i);
  assert.equal(manifest.toolchain.exporterSha256, sha256(fs.readFileSync(EXPORTER_PATH)));
});

test("exporter deterministically regenerates exact-RGBA bytes and every decoded invariant", { skip: REPRODUCTION_SKIP }, () => {
  const result = spawnSync(process.execPath, [EXPORTER_PATH, "--check"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, new RegExp(`8 WebPs, ${EXACT_ENCODED_BYTES} bytes`));
});

test("loader rejects incomplete, external, dimensionally wrong, escaping, or over-budget manifests", () => {
  for (const mutate of [
    (value) => { value.schema = 2; },
    (value) => { delete value.structures[0].files.mask; },
    (value) => { value.structures[0].files.base.path = "https://example.com/structure.webp"; },
    (value) => { value.structures[2].files.mask.dimensions = [384, 383]; },
    (value) => { value.structures[3].files.audit.maskEscapePixels = 1; },
    (value) => { value.totals.encodedCeiling -= 1; }
  ]) {
    const invalid = clone(manifest);
    mutate(invalid);
    assert.throws(() => assets.validateManifest(invalid), assets.StructureAssetManifestError);
  }
  const resolved = assets.resolveAssetUrl(
    "assets/structures/resource-point/resource-point-384-base.webp",
    "https://xenovoyage.github.io/Aeon-of-Kingdoms/phase4/index.html"
  );
  assert.equal(
    resolved.href,
    "https://xenovoyage.github.io/Aeon-of-Kingdoms/phase4/assets/structures/resource-point/resource-point-384-base.webp"
  );
  assert.throws(() => assets.resolveAssetUrl("//example.com/structure.webp", resolved), assets.StructureAssetManifestError);
  assert.throws(() => assets.resolveAssetUrl("../structure.webp", resolved), assets.StructureAssetManifestError);
});

test("loader retains neutral bases and only six prepared two-player owner sheets, then disposes all decoded resources", async () => {
  const dimensionsByPath = new Map();
  for (const structure of manifest.structures) {
    dimensionsByPath.set(structure.files.base.path, structure.files.base.dimensions);
    dimensionsByPath.set(structure.files.mask.path, structure.files.mask.dimensions);
  }
  const images = [];
  const canvases = [];
  function imageFactory() {
    const image = {
      naturalWidth: 0,
      naturalHeight: 0,
      removed: false,
      set src(value) {
        this.url = value;
        const manifestPath = `assets/structures/${value.split("/assets/structures/")[1]}`;
        [this.naturalWidth, this.naturalHeight] = dimensionsByPath.get(manifestPath);
        queueMicrotask(() => this.onload());
      },
      removeAttribute(name) {
        assert.equal(name, "src");
        this.removed = true;
      }
    };
    images.push(image);
    return image;
  }
  function canvasFactory(width, height) {
    const canvas = {
      width,
      height,
      getContext() {
        return {
          clearRect() {},
          drawImage() {},
          getImageData() { return { data: new Uint8ClampedArray(width * height * 4) }; },
          createImageData() { return { data: new Uint8ClampedArray(width * height * 4) }; },
          putImageData() {}
        };
      }
    };
    canvases.push(canvas);
    return canvas;
  }
  const bundle = await assets.load({
    baseUrl: "https://example.test/Aeon-of-Kingdoms/phase4/index.html",
    ownerSeatByFaction: { "astral-concord": 1, "gravebound-court": 2 },
    capturableOwnerSeats: [1, 2],
    imageFactory,
    canvasFactory
  });
  assert.equal(bundle.retainedDecodedBytes, 5336064);
  assert.equal(bundle.damageRuntimeAvailable, false);
  assert.deepEqual(Object.keys(bundle.structures), EXPECTED_STRUCTURES.map(({ id }) => id));
  assert.deepEqual(Object.keys(bundle.structures["astral-headquarters"].ownerSheets), ["1"]);
  assert.deepEqual(Object.keys(bundle.structures["gravebound-headquarters"].ownerSheets), ["2"]);
  assert.deepEqual(Object.keys(bundle.structures["resource-point"].ownerSheets), ["1", "2"]);
  assert.deepEqual(Object.keys(bundle.structures["production-outpost"].ownerSheets), ["1", "2"]);
  assert.equal(images.length, 8);
  assert.equal(images.filter(({ url }) => url.endsWith("-mask.webp")).every(({ removed }) => removed), true);
  assert.equal(images.filter(({ url }) => url.endsWith("-base.webp")).every(({ removed }) => !removed), true);
  assert.equal(canvases.filter(({ width }) => width > 0).length, 6);
  bundle.dispose();
  assert.equal(images.every(({ removed }) => removed), true);
  assert.equal(canvases.every(({ width }) => width === 0), true);

  await assert.rejects(
    assets.load({ ownerSeatByFaction: { "astral-concord": 2, "gravebound-court": 1 } }),
    (error) => error instanceof assets.StructureAssetLoadError && /fixed Phase 4 seat/.test(error.cause.message)
  );
});

test("ownership recolor changes only masked pixels and preserves source alpha", () => {
  const base = new Uint8ClampedArray([
    32, 96, 160, 255,
    32, 96, 160, 64,
    44, 55, 66, 255,
    0, 0, 0, 0
  ]);
  const mask = new Uint8ClampedArray([
    255, 255, 255, 255,
    255, 255, 255, 32,
    0, 0, 0, 0,
    0, 0, 0, 0
  ]);
  for (const presentation of EXPECTED_PLAYERS) {
    const output = assets.recolorPixels(base, mask, presentation.rgb);
    assert.equal(output[3], 255);
    assert.equal(output[7], 64);
    assert.deepEqual([...output.subarray(8)], [...base.subarray(8)], `${presentation.name} unmasked pixels`);
    assert.notDeepEqual([...output.subarray(0, 3)], [...base.subarray(0, 3)], `${presentation.name} masked color`);
  }
  const escaping = new Uint8ClampedArray(mask);
  escaping[7] = 65;
  assert.throws(() => assets.recolorPixels(base, escaping, EXPECTED_PLAYERS[0].rgb), /mask alpha escapes base alpha/);
});

test("loader failures are stable, text-only, release partial decodes, and have no network fallback", async () => {
  const invalid = clone(manifest);
  invalid.structures[0].files.base.path = "https://example.com/fallback.webp";
  let publicMessage;
  await assert.rejects(
    assets.load({ manifest: invalid, onError(message) { publicMessage = message; } }),
    (error) => error instanceof assets.StructureAssetLoadError
      && error.code === "STRUCTURE_ASSET_PRELOAD_FAILED"
      && error.publicMessage === assets.PRELOAD_ERROR_MESSAGE
  );
  assert.equal(publicMessage, "Structure art could not be loaded. Battle start is blocked.");

  const partialImages = [];
  function partialImageFactory() {
    const index = partialImages.length;
    const record = manifest.structures[0].files[index === 0 ? "base" : "mask"];
    const image = {
      naturalWidth: record.dimensions[0],
      naturalHeight: record.dimensions[1],
      removed: false,
      set src(value) {
        this.url = value;
        queueMicrotask(() => (index === 0 ? this.onload() : this.onerror()));
      },
      removeAttribute(name) {
        assert.equal(name, "src");
        this.removed = true;
      }
    };
    partialImages.push(image);
    return image;
  }
  await assert.rejects(assets.load({
    baseUrl: "https://example.test/Aeon-of-Kingdoms/phase4/index.html",
    imageFactory: partialImageFactory,
    canvasFactory() { assert.fail("partial image failure must happen before canvases are allocated"); }
  }), assets.StructureAssetLoadError);
  assert.equal(partialImages.length, 2);
  assert.equal(partialImages.every(({ removed }) => removed), true);

  const source = fs.readFileSync(path.join(ROOT, "phase4/assets.js"), "utf8");
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.match(source, /removeAttribute\(["']src["']\)/);
});
