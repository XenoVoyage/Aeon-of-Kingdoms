#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_ROOT = path.join(ROOT, "concepts/feasibility/phase1a/structures/phase5");
const INTACT_MANIFEST_PATH = path.join(ROOT, "phase4/assets/structures/manifest.js");
const FLATTENED_REVIEW_PATH = path.join(
  ROOT,
  "concepts/feasibility/phase1a/structures/production-outpost-damage.webp"
);
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, "phase5/assets/structures");
const MANIFEST_NAME = "manifest.js";
const CONVERT = process.env.AOK_PHASE5_CONVERT || "convert";
const ENCODED_CEILING = 3 * 1024 * 1024;
const DECODED_SOURCE_CEILING = 13 * 1024 * 1024;
const RETAINED_DECODED_CEILING = 13 * 1024 * 1024;
const EXPECTED_DECODED_SOURCE_BYTES = 6418944;
const EXPECTED_RETAINED_DECODED_BYTES = 12811776;

const STRUCTURES = Object.freeze([
  Object.freeze({ id: "astral-headquarters", dimensions: Object.freeze([384, 355]), sourceDimensions: Object.freeze([1024, 947]) }),
  Object.freeze({ id: "gravebound-headquarters", dimensions: Object.freeze([384, 350]), sourceDimensions: Object.freeze([1024, 933]) }),
  Object.freeze({ id: "resource-point", dimensions: Object.freeze([384, 384]), sourceDimensions: Object.freeze([1024, 1024]) }),
  Object.freeze({ id: "production-outpost", dimensions: Object.freeze([384, 304]), sourceDimensions: Object.freeze([1024, 810]) })
]);

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function runConvert(args, options = {}) {
  const result = spawnSync(CONVERT, args, {
    input: options.input,
    encoding: options.encoding ?? null,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true
  });
  if (result.error) fail(`ImageMagick could not run: ${result.error.message}`);
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8") : result.stderr;
    fail(`ImageMagick failed (${result.status}): ${String(stderr || "").trim()}`);
  }
  return result.stdout;
}

function inspectToolchain() {
  const versionOutput = runConvert(["-version"], { encoding: "utf8" });
  const formatOutput = runConvert(["-list", "format"], { encoding: "utf8" });
  const imageMagick = versionOutput.match(/^Version:\s+ImageMagick\s+([^\r\n]+)/m)?.[1]?.trim();
  const libwebp = formatOutput.match(/^\s*WEBP\*?\s+WEBP\s+rw\+\s+WebP Image Format \(libwebp ([^)]+)\)/m)?.[1]?.trim();
  if (!imageMagick || !libwebp) fail("ImageMagick must expose a writable lossless WebP delegate");
  return Object.freeze({ imageMagick, libwebp });
}

function fileRecord(absolutePath, dimensions) {
  const bytes = fs.readFileSync(absolutePath);
  return Object.freeze({
    path: path.relative(ROOT, absolutePath).split(path.sep).join("/"),
    dimensions,
    bytes: bytes.length,
    sha256: sha256(bytes)
  });
}

function decodeRgba(imagePath, width, height) {
  const decoded = runConvert([imagePath, "-alpha", "on", "-depth", "8", "rgba:-"]);
  assert.equal(decoded.length, width * height * 4, `${imagePath} decoded byte length`);
  return decoded;
}

function identifyDimensions(imagePath) {
  const output = runConvert([imagePath, "-format", "%w %h", "info:"], { encoding: "utf8" }).trim();
  const match = output.match(/^(\d+) (\d+)$/);
  if (!match) fail(`${imagePath} dimensions could not be identified`);
  return [Number(match[1]), Number(match[2])];
}

function resizeRgba(imagePath, width, height) {
  const resized = runConvert([
    imagePath,
    "-alpha", "on",
    "-filter", "Lanczos",
    "-resize", `${width}x${height}!`,
    "-depth", "8",
    "rgba:-"
  ]);
  assert.equal(resized.length, width * height * 4, `${imagePath} resized RGBA byte length`);
  return resized;
}

function zeroTransparentRgb(pixels) {
  let clearedPixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] !== 0) continue;
    if (pixels[offset] !== 0 || pixels[offset + 1] !== 0 || pixels[offset + 2] !== 0) clearedPixels += 1;
    pixels.fill(0, offset, offset + 4);
  }
  return clearedPixels;
}

function clampMaskToBase(base, mask) {
  let clampedPixels = 0;
  for (let offset = 0; offset < base.length; offset += 4) {
    if (mask[offset + 3] > base[offset + 3]) {
      mask[offset + 3] = base[offset + 3];
      clampedPixels += 1;
    }
    if (mask[offset + 3] === 0) mask.fill(0, offset, offset + 4);
  }
  return clampedPixels;
}

function normalizeMaskRgb(mask) {
  for (let offset = 0; offset < mask.length; offset += 4) {
    if (mask[offset + 3] === 0) continue;
    mask[offset] = 255;
    mask[offset + 1] = 255;
    mask[offset + 2] = 255;
  }
}

function countMaskEscapes(base, mask) {
  let count = 0;
  for (let offset = 3; offset < base.length; offset += 4) if (mask[offset] > base[offset]) count += 1;
  return count;
}

function countBorderAlpha(pixels, width, height) {
  const alpha = (x, y) => pixels[(y * width + x) * 4 + 3];
  let count = 0;
  for (let x = 0; x < width; x += 1) {
    if (alpha(x, 0) !== 0) count += 1;
    if (alpha(x, height - 1) !== 0) count += 1;
  }
  for (let y = 1; y < height - 1; y += 1) {
    if (alpha(0, y) !== 0) count += 1;
    if (alpha(width - 1, y) !== 0) count += 1;
  }
  return count;
}

function countTransparentRgbPixels(pixels) {
  let count = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0
      && (pixels[offset] !== 0 || pixels[offset + 1] !== 0 || pixels[offset + 2] !== 0)) count += 1;
  }
  return count;
}

function countByteDifferences(left, right) {
  assert.equal(left.length, right.length);
  let count = 0;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) count += 1;
  return count;
}

function alphaStatistics(pixels) {
  let visiblePixels = 0;
  let strongPixels = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] > 0) visiblePixels += 1;
    if (pixels[offset] > 16) strongPixels += 1;
  }
  return Object.freeze({ visiblePixels, strongPixels });
}

function encodeLosslessWebP(rgba, width, height, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const encoded = runConvert([
    "-size", `${width}x${height}`,
    "-depth", "8",
    "rgba:-",
    "-alpha", "on",
    "-strip",
    "-define", "webp:lossless=true",
    "-define", "webp:exact=true",
    "-define", "webp:method=6",
    "-quality", "100",
    "webp:-"
  ], { input: rgba });
  fs.writeFileSync(outputPath, encoded);
}

function sourcePath(structureId, state) {
  return path.join(SOURCE_ROOT, `${structureId}-${state}.png`);
}

function outputAssetPath(outputRoot, structureId, state, kind = "base") {
  return path.join(outputRoot, structureId, `${structureId}-384-${state}-${kind}.webp`);
}

function publicAssetPath(structureId, state, kind = "base") {
  return `assets/structures/${structureId}/${structureId}-384-${state}-${kind}.webp`;
}

function validateSources() {
  const intactManifestBytes = fs.readFileSync(INTACT_MANIFEST_PATH);
  delete require.cache[require.resolve(INTACT_MANIFEST_PATH)];
  const intactManifest = require(INTACT_MANIFEST_PATH);
  assert.equal(intactManifest.schema, 1, "Phase 4 intact manifest schema");
  assert.equal(intactManifest.phase, "4", "Phase 4 intact manifest phase");
  assert.deepEqual(intactManifest.structures.map(({ id }) => id), STRUCTURES.map(({ id }) => id));

  const flattenedBytes = fs.readFileSync(FLATTENED_REVIEW_PATH);
  const flattenedRelative = path.relative(ROOT, FLATTENED_REVIEW_PATH).split(path.sep).join("/");
  assert.equal(flattenedRelative.includes("/phase5/"), false, "flattened proof must not be a Phase 5 source");

  const records = STRUCTURES.map((specification, index) => {
    const intact = intactManifest.structures[index];
    assert.deepEqual(intact.files.base.dimensions, specification.dimensions);
    assert.deepEqual(intact.files.mask.dimensions, specification.dimensions);
    const damagedPath = sourcePath(specification.id, "damaged");
    const destroyedPath = sourcePath(specification.id, "destroyed");
    for (const candidate of [damagedPath, destroyedPath]) {
      assert.equal(path.extname(candidate), ".png", `${specification.id} source must be PNG`);
      assert.equal(path.dirname(fs.realpathSync(candidate)), fs.realpathSync(SOURCE_ROOT), `${specification.id} source containment`);
      assert.deepEqual(
        fs.readFileSync(candidate).subarray(0, 8),
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        `${specification.id} source PNG signature`
      );
      assert.deepEqual(identifyDimensions(candidate), specification.sourceDimensions, `${candidate} source dimensions`);
      const sourcePixels = decodeRgba(candidate, ...specification.sourceDimensions);
      assert.ok(alphaStatistics(sourcePixels).visiblePixels > 0, `${candidate} must contain visible alpha`);
      assert.equal(countBorderAlpha(sourcePixels, ...specification.sourceDimensions), 0, `${candidate} transparent source border`);
    }
    return Object.freeze({
      specification,
      intact,
      damagedPath,
      destroyedPath,
      damaged: fileRecord(damagedPath, specification.sourceDimensions),
      destroyed: fileRecord(destroyedPath, specification.sourceDimensions)
    });
  });
  return Object.freeze({
    intactManifest,
    intactManifestRecord: Object.freeze({
      path: path.relative(ROOT, INTACT_MANIFEST_PATH).split(path.sep).join("/"),
      bytes: intactManifestBytes.length,
      sha256: sha256(intactManifestBytes)
    }),
    flattenedReview: Object.freeze({
      path: flattenedRelative,
      bytes: flattenedBytes.length,
      sha256: sha256(flattenedBytes),
      runtimeAsset: false,
      reason: "Flattened RGB review strip only; never cropped, traced, or promoted into Phase 5 runtime art."
    }),
    records
  });
}

function buildManifestScript(manifest) {
  const json = JSON.stringify(manifest, null, 2);
  return `"use strict";\n\n(function exposePhase5StructureAssetManifest(root, factory) {\n  const manifest = factory();\n  if (typeof module === "object" && module.exports) module.exports = manifest;\n  if (root) root.AeonPhase5StructureAssetManifest = manifest;\n})(typeof globalThis === "object" ? globalThis : this, function createPhase5StructureAssetManifest() {\n  const freeze = (value) => {\n    if (value && typeof value === "object" && !Object.isFrozen(value)) {\n      for (const child of Object.values(value)) freeze(child);\n      Object.freeze(value);\n    }\n    return value;\n  };\n  return freeze(${json});\n});\n`;
}

function generate(outputRoot = DEFAULT_OUTPUT_ROOT) {
  const approved = validateSources();
  const toolchain = inspectToolchain();
  const structures = [];
  let encodedBytes = 0;
  let decodedSourceBytes = 0;
  let retainedDecodedBytesTwoPlayer = 0;
  let preparedDamagedOwnerSheetsTwoPlayer = 0;
  const aggregateAudit = {
    borderAlphaPixels: 0,
    maskEscapePixels: 0,
    losslessRoundTripDifferences: 0,
    transparentRgbPixels: 0,
    clampedMaskPixels: 0,
    transparentRgbClearedPixels: 0
  };

  for (const approvedRecord of approved.records) {
    const { specification, intact } = approvedRecord;
    const [width, height] = specification.dimensions;
    const damagedPixels = Buffer.from(resizeRgba(approvedRecord.damagedPath, width, height));
    const destroyedPixels = Buffer.from(resizeRgba(approvedRecord.destroyedPath, width, height));
    const intactMaskPath = path.join(ROOT, intact.source.mask.path);
    const damagedMaskPixels = Buffer.from(resizeRgba(intactMaskPath, width, height));
    const transparentRgbClearedPixels = zeroTransparentRgb(damagedPixels)
      + zeroTransparentRgb(destroyedPixels)
      + zeroTransparentRgb(damagedMaskPixels);
    const clampedMaskPixels = clampMaskToBase(damagedPixels, damagedMaskPixels);
    normalizeMaskRgb(damagedMaskPixels);

    const outputPaths = {
      damagedBase: outputAssetPath(outputRoot, specification.id, "damaged"),
      damagedMask: outputAssetPath(outputRoot, specification.id, "damaged", "mask"),
      destroyedBase: outputAssetPath(outputRoot, specification.id, "destroyed")
    };
    encodeLosslessWebP(damagedPixels, width, height, outputPaths.damagedBase);
    encodeLosslessWebP(damagedMaskPixels, width, height, outputPaths.damagedMask);
    encodeLosslessWebP(destroyedPixels, width, height, outputPaths.destroyedBase);

    const decoded = {
      damagedBase: decodeRgba(outputPaths.damagedBase, width, height),
      damagedMask: decodeRgba(outputPaths.damagedMask, width, height),
      destroyedBase: decodeRgba(outputPaths.destroyedBase, width, height)
    };
    const audit = {
      borderAlphaPixels: Object.values(decoded).reduce((sum, pixels) => sum + countBorderAlpha(pixels, width, height), 0),
      maskEscapePixels: countMaskEscapes(decoded.damagedBase, decoded.damagedMask),
      losslessRoundTripDifferences: countByteDifferences(damagedPixels, decoded.damagedBase)
        + countByteDifferences(damagedMaskPixels, decoded.damagedMask)
        + countByteDifferences(destroyedPixels, decoded.destroyedBase),
      transparentRgbPixels: Object.values(decoded).reduce((sum, pixels) => sum + countTransparentRgbPixels(pixels), 0),
      clampedMaskPixels,
      transparentRgbClearedPixels
    };
    for (const key of ["borderAlphaPixels", "maskEscapePixels", "losslessRoundTripDifferences", "transparentRgbPixels"]) {
      assert.equal(audit[key], 0, `${specification.id} ${key}`);
    }
    for (const key of Object.keys(aggregateAudit)) aggregateAudit[key] += audit[key];

    const fileRecordFor = (filePath, state, kind) => {
      const bytes = fs.readFileSync(filePath);
      const pixels = decoded[`${state}${kind[0].toUpperCase()}${kind.slice(1)}`];
      return {
        path: publicAssetPath(specification.id, state.toLowerCase(), kind.toLowerCase()),
        dimensions: specification.dimensions,
        bytes: bytes.length,
        sha256: sha256(bytes),
        alpha: alphaStatistics(pixels)
      };
    };
    const files = {
      damagedBase: fileRecordFor(outputPaths.damagedBase, "damaged", "base"),
      damagedMask: fileRecordFor(outputPaths.damagedMask, "damaged", "mask"),
      destroyedBase: fileRecordFor(outputPaths.destroyedBase, "destroyed", "base")
    };
    files.encodedBytes = files.damagedBase.bytes + files.damagedMask.bytes + files.destroyedBase.bytes;
    files.decodedBytes = width * height * 4 * 3;
    files.audit = audit;
    const ownerSheetCount = intact.ownerPolicy === "fixed-faction" ? 1 : 2;
    preparedDamagedOwnerSheetsTwoPlayer += ownerSheetCount;
    encodedBytes += files.encodedBytes;
    decodedSourceBytes += files.decodedBytes;
    retainedDecodedBytesTwoPlayer += width * height * 4 * (3 + ownerSheetCount * 2);
    structures.push({
      id: specification.id,
      category: intact.category,
      architecture: intact.architecture,
      faction: intact.faction,
      ownerPolicy: intact.ownerPolicy,
      sourceAnchorIds: intact.sourceAnchorIds,
      source: {
        damaged: approvedRecord.damaged,
        destroyed: approvedRecord.destroyed,
        intactMask: intact.source.mask
      },
      presentation: intact.presentation,
      files
    });
  }

  assert.ok(encodedBytes <= ENCODED_CEILING, "Phase 5 encoded damage ceiling exceeded");
  assert.equal(decodedSourceBytes, EXPECTED_DECODED_SOURCE_BYTES, "Phase 5 decoded source arithmetic");
  assert.ok(decodedSourceBytes <= DECODED_SOURCE_CEILING, "Phase 5 decoded source ceiling exceeded");
  assert.equal(preparedDamagedOwnerSheetsTwoPlayer, 6, "Phase 5 damaged prepared-sheet count");
  assert.equal(retainedDecodedBytesTwoPlayer, EXPECTED_RETAINED_DECODED_BYTES, "Phase 5 retained decoded arithmetic");
  assert.ok(retainedDecodedBytesTwoPlayer <= RETAINED_DECODED_CEILING, "Phase 5 retained decoded ceiling exceeded");

  const exporterPath = path.join(ROOT, "tools/export-phase5-structures.js");
  const manifest = {
    schema: 1,
    phase: "5",
    kind: "structure-damage-runtime-assets",
    format: "lossless-webp",
    source: {
      intactManifest: approved.intactManifestRecord,
      damageDirectory: path.relative(ROOT, SOURCE_ROOT).split(path.sep).join("/"),
      flattenedReview: approved.flattenedReview,
      maximumEdge: 384,
      resizeRule: "Preserve each Phase 4 full transparent canvas and resize to its exact intact runtime dimensions; never trim, crop, trace, or reframe."
    },
    toolchain: {
      exporter: "tools/export-phase5-structures.js",
      exporterSha256: sha256(fs.readFileSync(exporterPath)),
      imageMagick: toolchain.imageMagick,
      libwebp: toolchain.libwebp,
      resize: "full transparent canvas; identical Phase 4 Lanczos geometry",
      damagedMask: "derive only from the intact ownership mask, then clamp alpha to the damaged base and normalize visible RGB to white",
      encode: "lossless WebP; exact RGBA; method 6; quality 100; metadata stripped; transparent RGB zeroed and round-trip verified"
    },
    limits: {
      structureCategories: 3,
      structureForms: 4,
      damageStates: 2,
      generatedFiles: 12,
      capturableOwnerSeatCap: 2,
      encodedCeiling: ENCODED_CEILING,
      decodedSourceCeiling: DECODED_SOURCE_CEILING,
      retainedDecodedCeiling: RETAINED_DECODED_CEILING
    },
    structures,
    totals: {
      files: 12,
      encodedBytes,
      decodedSourceBytes,
      stateBasesRetained: 12,
      preparedOwnerSheetsTwoPlayer: 12,
      preparedDamagedOwnerSheetsTwoPlayer,
      retainedDecodedBytesTwoPlayer,
      audit: aggregateAudit
    }
  };
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, MANIFEST_NAME), buildManifestScript(manifest));
  return manifest;
}

function expectedGeneratedFiles(manifest, outputRoot = DEFAULT_OUTPUT_ROOT) {
  const files = [MANIFEST_NAME];
  for (const structure of manifest.structures) {
    files.push(path.relative(outputRoot, outputAssetPath(outputRoot, structure.id, "damaged")));
    files.push(path.relative(outputRoot, outputAssetPath(outputRoot, structure.id, "damaged", "mask")));
    files.push(path.relative(outputRoot, outputAssetPath(outputRoot, structure.id, "destroyed")));
  }
  return files.sort();
}

function checkGeneratedFiles() {
  const temporaryRoot = fs.mkdtempSync(path.join(path.dirname(ROOT), ".aok-phase5-structures-check-"));
  try {
    const manifest = generate(temporaryRoot);
    for (const relativePath of expectedGeneratedFiles(manifest, temporaryRoot)) {
      const expectedPath = path.join(temporaryRoot, relativePath);
      const actualPath = path.join(DEFAULT_OUTPUT_ROOT, relativePath);
      assert.ok(fs.existsSync(actualPath), `generated file is missing: ${relativePath}`);
      assert.deepEqual(fs.readFileSync(actualPath), fs.readFileSync(expectedPath), `generated file drift: ${relativePath}`);
    }
    const actualFiles = fs.readdirSync(DEFAULT_OUTPUT_ROOT, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(DEFAULT_OUTPUT_ROOT, path.join(entry.parentPath ?? entry.path, entry.name)))
      .sort();
    assert.deepEqual(actualFiles, expectedGeneratedFiles(manifest), "Phase 5 output contains untracked derivatives");
    process.stdout.write(`Phase 5 structure damage assets are reproducible (${manifest.totals.files} WebPs, ${manifest.totals.encodedBytes} bytes).\n`);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  const options = { check: false, outputRoot: DEFAULT_OUTPUT_ROOT };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") options.check = true;
    else if (argument === "--output") {
      const value = argv[index + 1];
      if (!value) fail("--output requires a directory");
      options.outputRoot = path.resolve(value);
      index += 1;
    } else fail(`Unknown argument: ${argument}`);
  }
  if (options.check && options.outputRoot !== DEFAULT_OUTPUT_ROOT) fail("--check cannot be combined with --output");
  return options;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.check) return checkGeneratedFiles();
  const manifest = generate(options.outputRoot);
  process.stdout.write(`Exported ${manifest.totals.files} lossless Phase 5 structure WebPs (${manifest.totals.encodedBytes} bytes) to ${options.outputRoot}.\n`);
}

if (require.main === module) main();

module.exports = Object.freeze({
  DEFAULT_OUTPUT_ROOT,
  ENCODED_CEILING,
  DECODED_SOURCE_CEILING,
  RETAINED_DECODED_CEILING,
  STRUCTURES,
  generate
});
