"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const ASSET_ROOT = path.join(ROOT, "phase3/assets/entities");
const MANIFEST_PATH = path.join(ASSET_ROOT, "manifest.js");
const EXPORTER_PATH = path.join(ROOT, "tools/export-phase3-assets.js");
const manifest = require(MANIFEST_PATH);
const assets = require(path.join(ROOT, "phase3/assets.js"));
const EXPECTED_ENTITIES = Object.freeze([
  "astral-guardian",
  "starbow",
  "aegis-titan",
  "gravebound-reaver",
  "hollow-string",
  "ossuary-colossus"
]);
const EXPECTED_PLAYERS = Object.freeze([
  Object.freeze({ id: 1, name: "Azure", rgb: Object.freeze([47, 169, 255]), symbol: "diamond" }),
  Object.freeze({ id: 2, name: "Violet", rgb: Object.freeze([165, 92, 255]), symbol: "cross" }),
  Object.freeze({ id: 3, name: "Coral", rgb: Object.freeze([229, 83, 74]), symbol: "triangle" }),
  Object.freeze({ id: 4, name: "Emerald", rgb: Object.freeze([38, 190, 124]), symbol: "circle" }),
  Object.freeze({ id: 5, name: "Amber", rgb: Object.freeze([236, 169, 47]), symbol: "bars" }),
  Object.freeze({ id: 6, name: "Magenta", rgb: Object.freeze([222, 78, 174]), symbol: "chevron" })
]);

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
      const packedDimensions = bytes.readUInt32LE(dataOffset + 1);
      dimensions ||= [(packedDimensions & 0x3fff) + 1, ((packedDimensions >>> 14) & 0x3fff) + 1];
    }
    offset = dataEnd + (size % 2);
  }
  assert.ok(dimensions, "WebP dimensions are missing");
  assert.ok(chunks.includes("VP8L"), "runtime atlas must use lossless VP8L encoding");
  assert.equal(chunks.some((chunk) => ["VP8 ", "ANIM", "ANMF", "EXIF", "XMP ", "ICCP"].includes(chunk)), false, "runtime atlas has a lossy, animated, or metadata chunk");
  return { chunks, dimensions };
}

test("Phase 3 manifest freezes six approved entities, both tiers, roots, frames, and all ownership cues", () => {
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.phase, "3");
  assert.equal(manifest.kind, "entity-runtime-assets");
  assert.equal(manifest.format, "lossless-webp");
  assert.deepEqual(manifest.entities.map(({ id }) => id), EXPECTED_ENTITIES);
  assert.deepEqual(manifest.players, EXPECTED_PLAYERS);
  assert.deepEqual(manifest.layout.grid, [4, 4]);
  assert.deepEqual(manifest.layout.animations, {
    idle: { indices: [0], fps: 1, loop: true, aliases: "move:0" },
    move: { indices: [0, 1, 2, 3], fps: 8, loop: true },
    action: { indices: [4, 5, 6, 7, 8, 9], fps: 12, loop: false },
    defeat: { indices: [10, 11, 12, 13, 14, 15], fps: 10, loop: false }
  });
  assert.deepEqual(manifest.layout.frames.map(({ state, frame, row, column }) => ({ state, frame, row, column })), [
    { state: "move", frame: 0, row: 1, column: 0 },
    { state: "move", frame: 1, row: 1, column: 1 },
    { state: "move", frame: 2, row: 1, column: 2 },
    { state: "move", frame: 3, row: 1, column: 3 },
    ...Array.from({ length: 6 }, (_, frame) => ({ state: "action", frame, row: 2, column: frame })),
    ...Array.from({ length: 6 }, (_, frame) => ({ state: "defeat", frame, row: 3, column: frame }))
  ]);
  assert.equal(manifest.layout.canonicalFacing, "right");
  assert.equal(manifest.layout.mirroredFacing, "left");
  assert.deepEqual(manifest.layout.logicalRenderCell, [160, 160]);
  assert.deepEqual(manifest.layout.destinationRoot, [80, 147.5]);
  assert.deepEqual(manifest.tiers.standard.sheet, [512, 512]);
  assert.equal(manifest.tiers.standard.cellSize, 128);
  assert.deepEqual(manifest.tiers.standard.sourceRoot, [64, 118]);
  assert.deepEqual(manifest.tiers.standard.upperLockRows, [0, 97]);
  assert.deepEqual(manifest.tiers.compact.sheet, [384, 384]);
  assert.equal(manifest.tiers.compact.cellSize, 96);
  assert.deepEqual(manifest.tiers.compact.sourceRoot, [48, 88.5]);
  assert.deepEqual(manifest.tiers.compact.upperLockRows, [0, 73]);
  assert.equal(assets.validateManifest(manifest), manifest);
});

test("exactly 24 generated WebPs match manifest bytes, hashes, dimensions, and corrected budgets", () => {
  const expected = ["manifest.js"];
  const tierTotals = { standard: 0, compact: 0 };
  let webpCount = 0;
  for (const entity of manifest.entities) {
    for (const tierKey of ["standard", "compact"]) {
      const pair = entity.files[tierKey];
      let pairBytes = 0;
      for (const kind of ["base", "mask"]) {
        const record = pair[kind];
        const relativeToPhase3 = record.path.replace(/^assets\/entities\//, "");
        expected.push(relativeToPhase3);
        const bytes = fs.readFileSync(path.join(ASSET_ROOT, relativeToPhase3));
        assert.equal(bytes.length, record.bytes, `${entity.id} ${tierKey} ${kind} bytes`);
        assert.equal(sha256(bytes), record.sha256, `${entity.id} ${tierKey} ${kind} hash`);
        assert.deepEqual(inspectWebP(bytes).dimensions, record.dimensions, `${entity.id} ${tierKey} ${kind} dimensions`);
        pairBytes += bytes.length;
        webpCount += 1;
      }
      assert.equal(pairBytes, pair.pairBytes, `${entity.id} ${tierKey} pair bytes`);
      assert.equal(pair.decodedBytes, manifest.tiers[tierKey].sheet[0] ** 2 * 4 * 2);
      for (const key of ["movementUpperDifferences", "borderAlphaPixels", "maskEscapePixels", "losslessRoundTripDifferences"]) {
        assert.equal(pair.audit[key], 0, `${entity.id} ${tierKey} ${key}`);
      }
      tierTotals[tierKey] += pairBytes;
    }
  }
  assert.equal(webpCount, 24);
  assert.deepEqual(recursiveFiles(ASSET_ROOT), expected.sort());
  assert.deepEqual(tierTotals, { standard: 734126, compact: 459446 });
  assert.equal(manifest.tiers.standard.encodedBytes, 734126);
  assert.equal(manifest.tiers.compact.encodedBytes, 459446);
  assert.equal(manifest.totals.encodedBytes, 1193572);
  assert.equal(manifest.totals.encodedCeiling, 1193572);
  assert.equal(manifest.totals.files, 24);
  assert.equal(manifest.tiers.standard.decodedBytes, 12 * 1024 * 1024);
  assert.equal(manifest.tiers.compact.decodedBytes, 6.75 * 1024 * 1024);
});

test("corrected full-body budget records and reproduces the unpublished missing-lower-body survey defect", () => {
  assert.deepEqual(manifest.budgetCorrection.obsoleteSurvey, {
    compact: 435142,
    standard: 694040,
    combined: 1129182
  });
  assert.deepEqual(manifest.budgetCorrection.correctedFullBody, {
    compact: 459446,
    standard: 734126,
    combined: 1193572
  });
  assert.match(manifest.budgetCorrection.reason, /blank lower bodies in movement cells 1-3/i);
  assert.deepEqual(manifest.budgetCorrection.reproduction, {
    entity: "starbow",
    tier: "standard",
    affectedMovementCells: [1, 2, 3],
    blankedRows: [98, 127],
    reproducedPairBytes: 106870,
    obsoleteRecordedPairBytes: 106870
  });
  assert.equal(manifest.entities.find(({ id }) => id === "starbow").files.standard.pairBytes, 114074);
});

test("manifest records the exact approved sources and reproducible ImageMagick/libwebp toolchain", () => {
  const sourcePackage = fs.readFileSync(path.join(ROOT, manifest.source.package.path));
  assert.equal(sourcePackage.length, manifest.source.package.bytes);
  assert.equal(sha256(sourcePackage), manifest.source.package.sha256);
  for (const entity of manifest.entities) {
    for (const record of Object.values(entity.source)) {
      const bytes = fs.readFileSync(path.join(ROOT, record.path));
      assert.equal(bytes.length, record.bytes, record.path);
      assert.equal(sha256(bytes), record.sha256, record.path);
    }
  }
  assert.match(manifest.toolchain.imageMagick, /^6\.9\.12-98 Q16/);
  assert.equal(manifest.toolchain.libwebp, "1.3.2 [020F]");
  assert.equal(manifest.toolchain.resize, "independent 384px cells; ImageMagick Lanczos");
  assert.equal(manifest.toolchain.encode, "lossless WebP; method 6; quality 100; metadata stripped");
  assert.equal(manifest.toolchain.exporter, "tools/export-phase3-assets.js");
  assert.equal(manifest.toolchain.exporterSha256, sha256(fs.readFileSync(EXPORTER_PATH)));
});

test("exporter deterministically regenerates every derived file and decoded invariant", () => {
  const result = spawnSync(process.execPath, [EXPORTER_PATH, "--check"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /24 WebPs, 1193572 bytes/);
});

test("loader rejects incomplete, external, dimensionally wrong, or unaudited manifests", () => {
  for (const mutate of [
    (value) => { value.schema = 2; },
    (value) => { delete value.entities[0].files.standard.mask; },
    (value) => { value.entities[0].files.standard.base.path = "https://example.com/entity.webp"; },
    (value) => { value.entities[0].files.compact.mask.dimensions = [512, 512]; },
    (value) => { value.entities[0].files.standard.audit.maskEscapePixels = 1; },
    (value) => { value.tiers.standard.encodedCeiling -= 1; }
  ]) {
    const invalid = clone(manifest);
    mutate(invalid);
    assert.throws(() => assets.validateManifest(invalid), assets.AssetManifestError);
  }
  const resolved = assets.resolveAssetUrl(
    "assets/entities/starbow/starbow-128-base.webp",
    "https://xenovoyage.github.io/Aeon-of-Kingdoms/phase3/index.html"
  );
  assert.equal(resolved.href, "https://xenovoyage.github.io/Aeon-of-Kingdoms/phase3/assets/entities/starbow/starbow-128-base.webp");
  assert.throws(() => assets.resolveAssetUrl("//example.com/starbow.webp", resolved), assets.AssetManifestError);
  assert.throws(() => assets.resolveAssetUrl("../starbow.webp", resolved), assets.AssetManifestError);
});

test("loader retains one fixed owner sheet plus one base sheet per entity", async () => {
  const sheetSize = manifest.tiers.compact.sheet[0];
  const images = [];
  const canvases = [];
  function imageFactory() {
    const image = {
      naturalWidth: sheetSize,
      naturalHeight: sheetSize,
      removed: false,
      set src(value) {
        this.url = value;
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
          getImageData() {
            return { data: new Uint8ClampedArray(width * height * 4) };
          },
          createImageData() {
            return { data: new Uint8ClampedArray(width * height * 4) };
          },
          putImageData() {}
        };
      }
    };
    canvases.push(canvas);
    return canvas;
  }
  const bundle = await assets.load({
    tier: "compact",
    ownerSeatByFaction: { "astral-concord": 1, "gravebound-court": 2 },
    baseUrl: "https://example.test/Aeon-of-Kingdoms/phase3/index.html",
    imageFactory,
    canvasFactory
  });
  assert.deepEqual(bundle.ownerSeatByFaction, assets.PHASE3_OWNER_SEAT_BY_FACTION);
  assert.equal(bundle.retainedDecodedBytes, 6.75 * 1024 * 1024);
  for (const entity of manifest.entities) {
    const expectedSeat = assets.PHASE3_OWNER_SEAT_BY_FACTION[entity.faction];
    assert.deepEqual(Object.keys(bundle.entities[entity.id].ownerSheets), [String(expectedSeat)]);
  }
  assert.equal(images.length, 12);
  assert.equal(images.filter(({ url }) => url.endsWith("-mask.webp")).every(({ removed }) => removed), true);
  assert.equal(images.filter(({ url }) => url.endsWith("-base.webp")).every(({ removed }) => !removed), true);
  assert.equal(canvases.filter(({ width }) => width === sheetSize).length, 6);
  assert.equal(canvases.filter(({ width }) => width === 0).length, 12);
  bundle.dispose();
  assert.equal(images.every(({ removed }) => removed), true);
  assert.equal(canvases.every(({ width }) => width === 0), true);
  await assert.rejects(
    assets.load({ ownerSeatByFaction: { "astral-concord": 2, "gravebound-court": 1 } }),
    (error) => error instanceof assets.AssetLoadError && /fixed Phase 3 seat/.test(error.cause.message)
  );
});

test("all six player colors preserve HSL lightness and base alpha with normalized edge coverage", () => {
  const baseColor = [32, 96, 160];
  const base = new Uint8ClampedArray([
    ...baseColor, 255,
    ...baseColor, 64,
    ...baseColor, 64,
    44, 55, 66, 255,
    0, 0, 0, 0
  ]);
  const mask = new Uint8ClampedArray([
    255, 255, 255, 255,
    255, 255, 255, 64,
    255, 255, 255, 32,
    0, 0, 0, 0,
    0, 0, 0, 0
  ]);
  for (const presentation of EXPECTED_PLAYERS) {
    const output = assets.recolorPixels(base, mask, presentation.rgb);
    assert.deepEqual([...output.subarray(0, 3)], [...output.subarray(4, 7)], `${presentation.name} normalized antialias coverage`);
    assert.equal(output[3], 255);
    assert.equal(output[7], 64);
    assert.equal(output[11], 64);
    const sourceLightness = assets.rgbToHsl(...baseColor)[2];
    const tintedLightness = assets.rgbToHsl(...output.subarray(0, 3))[2];
    assert.ok(Math.abs(sourceLightness - tintedLightness) <= 1 / 255, `${presentation.name} lightness`);
    for (let channel = 0; channel < 3; channel += 1) {
      assert.ok(Math.abs(output[8 + channel] - Math.round((baseColor[channel] + output[channel]) / 2)) <= 1, `${presentation.name} partial coverage`);
    }
    assert.deepEqual([...output.subarray(12, 20)], [...base.subarray(12, 20)], `${presentation.name} unmasked pixels`);
  }
  const escapingMask = new Uint8ClampedArray(mask);
  escapingMask[7] = 65;
  assert.throws(() => assets.recolorPixels(base, escapingMask, EXPECTED_PLAYERS[0].rgb), /mask alpha escapes base alpha/);
  assert.throws(() => assets.recolorPixels(base, mask, null), /targetRgb must contain three byte values/);
});

test("loader failure is stable text-only, returns no bundle, and has no network or fallback path", async () => {
  const invalid = clone(manifest);
  invalid.entities[0].files.standard.base.path = "https://example.com/fallback.webp";
  let publicMessage;
  await assert.rejects(
    assets.load({ manifest: invalid, onError(message) { publicMessage = message; } }),
    (error) => error instanceof assets.AssetLoadError
      && error.code === "ENTITY_ASSET_PRELOAD_FAILED"
      && error.publicMessage === assets.PRELOAD_ERROR_MESSAGE
  );
  assert.equal(publicMessage, "Entity art could not be loaded. Battle start is blocked.");

  const partialImages = [];
  function partialImageFactory() {
    const index = partialImages.length;
    const image = {
      naturalWidth: manifest.tiers.compact.sheet[0],
      naturalHeight: manifest.tiers.compact.sheet[1],
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
    tier: "compact",
    baseUrl: "https://example.test/Aeon-of-Kingdoms/phase3/index.html",
    imageFactory: partialImageFactory,
    canvasFactory() {
      assert.fail("partial image failure must happen before pixel canvases are allocated");
    }
  }), assets.AssetLoadError);
  assert.equal(partialImages.length, 2);
  assert.equal(partialImages.every(({ removed }) => removed), true, "every partial decode must be released");

  const source = fs.readFileSync(path.join(ROOT, "phase3/assets.js"), "utf8");
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.doesNotMatch(source, /placeholder|fallback/i);
  assert.match(source, /removeAttribute\("src"\)/);
});
