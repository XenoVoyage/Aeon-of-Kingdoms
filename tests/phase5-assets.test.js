"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const ASSET_ROOT = path.join(ROOT, "phase5/assets/structures");
const MANIFEST_PATH = path.join(ASSET_ROOT, "manifest.js");
const INTACT_MANIFEST_PATH = path.join(ROOT, "phase4/assets/structures/manifest.js");
const EXPORTER_PATH = path.join(ROOT, "tools/export-phase5-structures.js");
const CONVERT_COMMAND = process.env.AOK_PHASE5_CONVERT || "convert";
const convertProbe = spawnSync(CONVERT_COMMAND, ["-version"], { encoding: "utf8", windowsHide: true });
const REPRODUCTION_SKIP = convertProbe.status === 0
  ? false
  : "recorded ImageMagick toolchain is unavailable; committed bytes and manifest invariants remain verified";
const manifest = require(MANIFEST_PATH);
const intactManifest = require(INTACT_MANIFEST_PATH);
const assets = require(path.join(ROOT, "phase5/assets.js"));

const EXPECTED_STRUCTURES = Object.freeze([
  Object.freeze({ id: "astral-headquarters", dimensions: Object.freeze([384, 355]), sourceDimensions: Object.freeze([1024, 947]), ownerSheets: 1 }),
  Object.freeze({ id: "gravebound-headquarters", dimensions: Object.freeze([384, 350]), sourceDimensions: Object.freeze([1024, 933]), ownerSheets: 1 }),
  Object.freeze({ id: "resource-point", dimensions: Object.freeze([384, 384]), sourceDimensions: Object.freeze([1024, 1024]), ownerSheets: 2 }),
  Object.freeze({ id: "production-outpost", dimensions: Object.freeze([384, 304]), sourceDimensions: Object.freeze([1024, 810]), ownerSheets: 2 })
]);
const EXACT_ENCODED_BYTES = 1040292;

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function recursiveFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return recursiveFiles(absolutePath).map((child) => path.join(entry.name, child));
    return [entry.name];
  }).map((value) => value.split(path.sep).join("/")).sort();
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
    if (type === "VP8X") dimensions = [bytes.readUIntLE(dataOffset + 4, 3) + 1, bytes.readUIntLE(dataOffset + 7, 3) + 1];
    else if (type === "VP8L") {
      assert.equal(bytes[dataOffset], 0x2f, "invalid lossless WebP signature");
      const packed = bytes.readUInt32LE(dataOffset + 1);
      dimensions ||= [(packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1];
    }
    offset = dataEnd + (size % 2);
  }
  assert.ok(dimensions, "WebP dimensions are missing");
  assert.ok(chunks.includes("VP8L"), "runtime structure damage must use lossless VP8L encoding");
  assert.equal(
    chunks.some((chunk) => ["VP8 ", "ANIM", "ANMF", "EXIF", "XMP ", "ICCP"].includes(chunk)),
    false,
    "runtime structure damage has a lossy, animated, or metadata chunk"
  );
  return { chunks, dimensions };
}

function decodeRgba(filePath, width, height) {
  const result = spawnSync(CONVERT_COMMAND, [filePath, "-alpha", "on", "-depth", "8", "rgba:-"], {
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true
  });
  assert.equal(result.status, 0, result.stderr?.toString("utf8") || "ImageMagick decode failed");
  assert.equal(result.stdout.length, width * height * 4);
  return result.stdout;
}

function assertTransparentBoundsAndRgb(pixels, width, height, label) {
  const alpha = (x, y) => pixels[(y * width + x) * 4 + 3];
  let borderAlphaPixels = 0;
  for (let x = 0; x < width; x += 1) {
    if (alpha(x, 0) !== 0) borderAlphaPixels += 1;
    if (alpha(x, height - 1) !== 0) borderAlphaPixels += 1;
  }
  for (let y = 1; y < height - 1; y += 1) {
    if (alpha(0, y) !== 0) borderAlphaPixels += 1;
    if (alpha(width - 1, y) !== 0) borderAlphaPixels += 1;
  }
  let transparentRgbPixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] !== 0) continue;
    if ((pixels[offset] | pixels[offset + 1] | pixels[offset + 2]) !== 0) transparentRgbPixels += 1;
  }
  assert.equal(borderAlphaPixels, 0, `${label} transparent border`);
  assert.equal(transparentRgbPixels, 0, `${label} transparent RGB`);
}

test("Phase 5 manifest freezes four forms, two damage states, twelve derivatives, and bounded residency", () => {
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.phase, "5");
  assert.equal(manifest.kind, "structure-damage-runtime-assets");
  assert.equal(manifest.format, "lossless-webp");
  assert.deepEqual(manifest.structures.map(({ id }) => id), EXPECTED_STRUCTURES.map(({ id }) => id));
  assert.deepEqual(manifest.limits, {
    structureCategories: 3,
    structureForms: 4,
    damageStates: 2,
    generatedFiles: 12,
    capturableOwnerSeatCap: 2,
    encodedCeiling: 3145728,
    decodedSourceCeiling: 13631488,
    retainedDecodedCeiling: 13631488
  });
  assert.equal(manifest.totals.files, 12);
  assert.equal(manifest.totals.encodedBytes, EXACT_ENCODED_BYTES);
  assert.equal(manifest.totals.decodedSourceBytes, 6418944);
  assert.equal(manifest.totals.stateBasesRetained, 12);
  assert.equal(manifest.totals.preparedOwnerSheetsTwoPlayer, 12);
  assert.equal(manifest.totals.preparedDamagedOwnerSheetsTwoPlayer, 6);
  assert.equal(manifest.totals.retainedDecodedBytesTwoPlayer, 12811776);
  assert.equal(assets.validateManifest(manifest), manifest);
});

test("exactly twelve local lossless WebPs match dimensions, hashes, bytes, decoded bounds, and mask containment", { skip: REPRODUCTION_SKIP }, () => {
  const expectedFiles = ["manifest.js"];
  let encodedBytes = 0;
  let decodedBytes = 0;
  for (let index = 0; index < EXPECTED_STRUCTURES.length; index += 1) {
    const expected = EXPECTED_STRUCTURES[index];
    const structure = manifest.structures[index];
    assert.deepEqual(structure.source.damaged.dimensions, expected.sourceDimensions);
    assert.deepEqual(structure.source.destroyed.dimensions, expected.sourceDimensions);
    const decoded = {};
    for (const [key, suffix] of [
      ["damagedBase", "damaged-base"],
      ["damagedMask", "damaged-mask"],
      ["destroyedBase", "destroyed-base"]
    ]) {
      const record = structure.files[key];
      assert.equal(record.path, `assets/structures/${expected.id}/${expected.id}-384-${suffix}.webp`);
      const relativePath = record.path.replace(/^assets\/structures\//, "");
      expectedFiles.push(relativePath);
      const filePath = path.join(ASSET_ROOT, relativePath);
      const bytes = fs.readFileSync(filePath);
      assert.equal(bytes.length, record.bytes, `${expected.id} ${suffix} bytes`);
      assert.equal(sha256(bytes), record.sha256, `${expected.id} ${suffix} hash`);
      assert.deepEqual(inspectWebP(bytes).dimensions, expected.dimensions, `${expected.id} ${suffix} dimensions`);
      decoded[key] = decodeRgba(filePath, ...expected.dimensions);
      assertTransparentBoundsAndRgb(decoded[key], ...expected.dimensions, `${expected.id} ${suffix}`);
      encodedBytes += bytes.length;
      decodedBytes += expected.dimensions[0] * expected.dimensions[1] * 4;
    }
    for (let offset = 3; offset < decoded.damagedBase.length; offset += 4) {
      assert.ok(decoded.damagedMask[offset] <= decoded.damagedBase[offset], `${expected.id} damaged mask alpha containment`);
    }
    for (const key of ["borderAlphaPixels", "maskEscapePixels", "losslessRoundTripDifferences", "transparentRgbPixels"]) {
      assert.equal(structure.files.audit[key], 0, `${expected.id} ${key}`);
    }
  }
  assert.deepEqual(recursiveFiles(ASSET_ROOT), expectedFiles.sort());
  assert.equal(encodedBytes, EXACT_ENCODED_BYTES);
  assert.equal(decodedBytes, 6418944);
  assert.ok(encodedBytes <= 3 * 1024 * 1024);
  assert.ok(decodedBytes <= 13 * 1024 * 1024);
});

test("damage provenance uses only exact transparent PNG sources and explicitly excludes the flattened review strip", () => {
  const intactBytes = fs.readFileSync(INTACT_MANIFEST_PATH);
  assert.equal(intactBytes.length, manifest.source.intactManifest.bytes);
  assert.equal(sha256(intactBytes), manifest.source.intactManifest.sha256);
  for (const structure of manifest.structures) {
    for (const state of ["damaged", "destroyed"]) {
      const source = structure.source[state];
      assert.equal(source.path, `concepts/feasibility/phase1a/structures/phase5/${structure.id}-${state}.png`);
      assert.doesNotMatch(source.path, /https?:|production-outpost-damage\.webp/i);
      const bytes = fs.readFileSync(path.join(ROOT, source.path));
      assert.equal(bytes.length, source.bytes);
      assert.equal(sha256(bytes), source.sha256);
    }
    assert.deepEqual(structure.source.intactMask, intactManifest.structures.find(({ id }) => id === structure.id).source.mask);
    assert.equal(Object.keys(structure.files).some((key) => /destroyedMask/i.test(key)), false);
  }
  assert.equal(manifest.source.flattenedReview.runtimeAsset, false);
  assert.match(manifest.source.flattenedReview.reason, /never cropped|never.*promoted/i);
  const flattened = fs.readFileSync(path.join(ROOT, manifest.source.flattenedReview.path));
  assert.equal(flattened.length, manifest.source.flattenedReview.bytes);
  assert.equal(sha256(flattened), manifest.source.flattenedReview.sha256);
  assert.equal(manifest.toolchain.exporterSha256, sha256(fs.readFileSync(EXPORTER_PATH)));
});

test("exporter deterministically regenerates exact-RGBA source-to-output bytes", { skip: REPRODUCTION_SKIP }, () => {
  const result = spawnSync(process.execPath, [EXPORTER_PATH, "--check"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, new RegExp(`12 WebPs, ${EXACT_ENCODED_BYTES} bytes`));
});

test("loader rejects incomplete, external, misaligned, escaping, or over-budget manifests", () => {
  for (const mutate of [
    (value) => { value.schema = 2; },
    (value) => { delete value.structures[0].files.damagedMask; },
    (value) => { value.structures[0].files.damagedBase.path = "https://example.com/damage.webp"; },
    (value) => { value.structures[2].files.destroyedBase.dimensions = [384, 383]; },
    (value) => { value.structures[3].files.audit.maskEscapePixels = 1; },
    (value) => { value.limits.encodedCeiling -= 1; },
    (value) => { value.structures[0].presentation.destinationGroundRoot[1] += 1; }
  ]) {
    const invalid = clone(manifest);
    mutate(invalid);
    assert.throws(() => assets.validateManifest(invalid), assets.StructureDamageAssetManifestError);
  }
  const resolved = assets.resolveAssetUrl(
    "assets/structures/resource-point/resource-point-384-damaged-base.webp",
    "https://xenovoyage.github.io/Aeon-of-Kingdoms/phase5/index.html"
  );
  assert.equal(
    resolved.href,
    "https://xenovoyage.github.io/Aeon-of-Kingdoms/phase5/assets/structures/resource-point/resource-point-384-damaged-base.webp"
  );
  assert.throws(() => assets.resolveAssetUrl("//example.com/damage.webp", resolved), assets.StructureDamageAssetManifestError);
  assert.throws(() => assets.resolveAssetUrl("../phase4/intact.webp", resolved), assets.StructureDamageAssetManifestError);
});

function buildDecodedHarness(failingIndex = -1) {
  const dimensionsByFragment = new Map();
  for (const structure of intactManifest.structures) {
    dimensionsByFragment.set(`/phase4/${structure.files.base.path}`, structure.files.base.dimensions);
    dimensionsByFragment.set(`/phase4/${structure.files.mask.path}`, structure.files.mask.dimensions);
  }
  for (const structure of manifest.structures) {
    for (const record of [structure.files.damagedBase, structure.files.damagedMask, structure.files.destroyedBase]) {
      dimensionsByFragment.set(`/phase5/${record.path}`, record.dimensions);
    }
  }
  const images = [];
  const canvases = [];
  function imageFactory() {
    const index = images.length;
    const image = {
      naturalWidth: 0,
      naturalHeight: 0,
      removed: false,
      set src(value) {
        this.url = value;
        const entry = [...dimensionsByFragment].find(([fragment]) => value.includes(fragment));
        assert.ok(entry, `unexpected asset URL ${value}`);
        [this.naturalWidth, this.naturalHeight] = entry[1];
        queueMicrotask(() => (index === failingIndex ? this.onerror() : this.onload()));
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
  return { images, canvases, imageFactory, canvasFactory };
}

test("loader retains twelve bases and twelve two-player owner sheets, exposes all states, then disposes every decode", async () => {
  const harness = buildDecodedHarness();
  const bundle = await assets.load({
    baseUrl: "https://example.test/Aeon-of-Kingdoms/phase5/index.html",
    ownerSeatByFaction: { "astral-concord": 1, "gravebound-court": 2 },
    capturableOwnerSeats: [1, 2],
    imageFactory: harness.imageFactory,
    canvasFactory: harness.canvasFactory
  });
  assert.equal(bundle.retainedDecodedBytes, 12811776);
  assert.equal(bundle.damageRuntimeAvailable, true);
  assert.deepEqual(Object.keys(bundle.structures), EXPECTED_STRUCTURES.map(({ id }) => id));
  for (const expected of EXPECTED_STRUCTURES) {
    const structure = bundle.structures[expected.id];
    assert.deepEqual(Object.keys(structure.states), ["intact", "damaged", "destroyed"]);
    assert.equal(structure.neutralImage, structure.states.intact.neutralImage);
    assert.equal(structure.ownerSheets, structure.states.intact.ownerSheets);
    assert.equal(Object.keys(structure.states.intact.ownerSheets).length, expected.ownerSheets);
    assert.equal(Object.keys(structure.states.damaged.ownerSheets).length, expected.ownerSheets);
    assert.deepEqual(Object.keys(structure.states.destroyed.ownerSheets), []);
    assert.equal(structure.presentation, intactManifest.structures.find(({ id }) => id === expected.id).presentation);
  }
  assert.equal(harness.images.length, 20);
  assert.equal(harness.images.filter(({ removed }) => removed).length, 8, "all intact and damaged masks release after preparation");
  assert.equal(harness.canvases.filter(({ width }) => width > 0).length, 12, "exactly twelve prepared owner sheets remain");
  bundle.dispose();
  assert.equal(harness.images.every(({ removed }) => removed), true);
  assert.equal(harness.canvases.every(({ width }) => width === 0), true);

  await assert.rejects(
    assets.load({ capturableOwnerSeats: [1], baseUrl: "https://example.test/Aeon-of-Kingdoms/phase5/index.html" }),
    (error) => error instanceof assets.StructureDamageAssetLoadError
      && /exactly the two frozen capturable owner seats/.test(error.cause.message)
  );
});

test("damage-state thresholds are exact and destroyed state is owner-independent", () => {
  assert.equal(assets.stateForHealth(1800, 1800), "intact");
  assert.equal(assets.stateForHealth(901, 1800), "intact");
  assert.equal(assets.stateForHealth(900, 1800), "damaged");
  assert.equal(assets.stateForHealth(1, 1800), "damaged");
  assert.equal(assets.stateForHealth(0, 1800), "destroyed");
  for (const pair of [[-1, 1800], [1801, 1800], [0, 0], [0.5, 1]]) {
    assert.throws(() => assets.stateForHealth(...pair), RangeError);
  }
});

test("loader failures are stable, release intact and partial damage decodes, and expose no network fallback", async () => {
  const invalid = clone(manifest);
  invalid.structures[0].files.damagedBase.path = "https://example.com/fallback.webp";
  let publicMessage;
  await assert.rejects(
    assets.load({ manifest: invalid, onError(message) { publicMessage = message; } }),
    (error) => error instanceof assets.StructureDamageAssetLoadError
      && error.code === "STRUCTURE_DAMAGE_ASSET_PRELOAD_FAILED"
      && error.publicMessage === assets.PRELOAD_ERROR_MESSAGE
  );
  assert.equal(publicMessage, "Structure damage art could not be loaded. Battle start is blocked.");

  const harness = buildDecodedHarness(9);
  await assert.rejects(assets.load({
    baseUrl: "https://example.test/Aeon-of-Kingdoms/phase5/index.html",
    imageFactory: harness.imageFactory,
    canvasFactory: harness.canvasFactory
  }), assets.StructureDamageAssetLoadError);
  assert.equal(harness.images.length, 11);
  assert.equal(harness.images.every(({ removed }) => removed), true);
  assert.equal(harness.canvases.every(({ width }) => width === 0), true);

  const source = fs.readFileSync(path.join(ROOT, "phase5/assets.js"), "utf8");
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.match(source, /removeAttribute\(["']src["']\)/);
});
