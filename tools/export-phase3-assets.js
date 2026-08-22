#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_ROOT = path.join(ROOT, "concepts/feasibility/phase1a");
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, "phase3/assets/entities");
const MANIFEST_NAME = "manifest.js";
const CONVERT = process.env.AOK_PHASE3_CONVERT || "convert";
const MASTER_CELL = 384;
const MASTER_SHEET = Object.freeze([2304, 1536]);
const MASTER_ROOT = Object.freeze([192, 354]);
const FRAME_SOURCES = Object.freeze([
  Object.freeze({ index: 0, state: "move", frame: 0, row: 1, column: 0 }),
  Object.freeze({ index: 1, state: "move", frame: 1, row: 1, column: 1 }),
  Object.freeze({ index: 2, state: "move", frame: 2, row: 1, column: 2 }),
  Object.freeze({ index: 3, state: "move", frame: 3, row: 1, column: 3 }),
  ...Array.from({ length: 6 }, (_, frame) => Object.freeze({
    index: 4 + frame,
    state: "action",
    frame,
    row: 2,
    column: frame
  })),
  ...Array.from({ length: 6 }, (_, frame) => Object.freeze({
    index: 10 + frame,
    state: "defeat",
    frame,
    row: 3,
    column: frame
  }))
]);
const TIERS = Object.freeze({
  standard: Object.freeze({
    key: "standard",
    label: "Standard",
    suffix: "128",
    cellSize: 128,
    sheetSize: 512,
    sourceRoot: Object.freeze([64, 118]),
    upperLockRows: Object.freeze([0, 97]),
    encodedCeiling: 734126,
    decodedBytes: 12 * 1024 * 1024
  }),
  compact: Object.freeze({
    key: "compact",
    label: "Compact",
    suffix: "96",
    cellSize: 96,
    sheetSize: 384,
    sourceRoot: Object.freeze([48, 88.5]),
    upperLockRows: Object.freeze([0, 73]),
    encodedCeiling: 459446,
    decodedBytes: 6.75 * 1024 * 1024
  })
});
const ENTITY_IDS = Object.freeze([
  "astral-guardian",
  "starbow",
  "aegis-titan",
  "gravebound-reaver",
  "hollow-string",
  "ossuary-colossus"
]);

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function validateApprovedSources() {
  const sourceManifestPath = path.join(SOURCE_ROOT, "manifest.json");
  const sourceManifest = readJson(sourceManifestPath);
  assert.equal(sourceManifest.schema, 1);
  assert.deepEqual(sourceManifest.entityProfile.cell, [MASTER_CELL, MASTER_CELL]);
  assert.deepEqual(sourceManifest.entityProfile.groundAnchor, MASTER_ROOT);
  assert.equal(sourceManifest.entityProfile.canonicalFacing, "right");
  assert.equal(sourceManifest.entityProfile.mirrorFacing, "left");
  assert.deepEqual(sourceManifest.entities.map(({ id }) => id), ENTITY_IDS);

  const entities = sourceManifest.entities.map((identity) => {
    const directory = path.join(SOURCE_ROOT, "entities", identity.id);
    const atlasPath = path.join(directory, "atlas.png");
    const maskPath = path.join(directory, "player-mask.png");
    const metadataPath = path.join(directory, "atlas.json");
    const metadata = readJson(metadataPath);
    assert.equal(metadata.entity, identity.id);
    assert.deepEqual(metadata.cell, [MASTER_CELL, MASTER_CELL]);
    assert.deepEqual(metadata.groundAnchor, MASTER_ROOT);
    assert.equal(metadata.canonicalFacing, "right");
    assert.equal(metadata.mirrorFacing, "left");
    assert.equal(metadata.animations.idle.row, 0);
    assert.equal(metadata.animations.idle.frames, 1);
    assert.equal(metadata.animations.move.row, 1);
    assert.equal(metadata.animations.move.frames, 4);
    assert.equal(metadata.animations.attack.row, 2);
    assert.equal(metadata.animations.attack.frames, 6);
    assert.equal(metadata.animations.defeat.row, 3);
    assert.equal(metadata.animations.defeat.frames, 6);
    for (const sourcePath of [atlasPath, maskPath, metadataPath]) {
      if (!fs.statSync(sourcePath).isFile()) fail(`Approved source is missing: ${sourcePath}`);
    }
    return Object.freeze({
      ...identity,
      atlasPath,
      maskPath,
      metadataPath,
      source: Object.freeze({
        atlas: Object.freeze({
          path: path.relative(ROOT, atlasPath).split(path.sep).join("/"),
          bytes: fs.statSync(atlasPath).size,
          sha256: sha256(fs.readFileSync(atlasPath))
        }),
        mask: Object.freeze({
          path: path.relative(ROOT, maskPath).split(path.sep).join("/"),
          bytes: fs.statSync(maskPath).size,
          sha256: sha256(fs.readFileSync(maskPath))
        }),
        metadata: Object.freeze({
          path: path.relative(ROOT, metadataPath).split(path.sep).join("/"),
          bytes: fs.statSync(metadataPath).size,
          sha256: sha256(fs.readFileSync(metadataPath))
        })
      })
    });
  });
  return Object.freeze({
    sourceManifest,
    sourceManifestRecord: Object.freeze({
      path: path.relative(ROOT, sourceManifestPath).split(path.sep).join("/"),
      bytes: fs.statSync(sourceManifestPath).size,
      sha256: sha256(fs.readFileSync(sourceManifestPath))
    }),
    entities
  });
}

function independentlyResizeFrames(sourcePath, cellSize) {
  const args = [sourcePath, "-alpha", "on"];
  for (const source of FRAME_SOURCES) {
    const geometry = `${MASTER_CELL}x${MASTER_CELL}+${source.column * MASTER_CELL}+${source.row * MASTER_CELL}`;
    args.push(
      "(",
      "-clone", "0",
      "-crop", geometry,
      "+repage",
      "-filter", "Lanczos",
      "-resize", `${cellSize}x${cellSize}!`,
      ")"
    );
  }
  args.push("-delete", "0", "-alpha", "on", "-depth", "8", "rgba:-");
  const bytes = runConvert(args);
  const frameBytes = cellSize * cellSize * 4;
  assert.equal(bytes.length, frameBytes * FRAME_SOURCES.length, `${sourcePath} resized byte length`);
  return FRAME_SOURCES.map((_, index) => Buffer.from(bytes.subarray(index * frameBytes, (index + 1) * frameBytes)));
}

function relockMovementUpperRows(frames, cellSize, upperLockRows) {
  const rowBytes = cellSize * 4;
  const lockHeight = upperLockRows[1] - upperLockRows[0] + 1;
  for (let frame = 1; frame < 4; frame += 1) {
    for (let y = 0; y < lockHeight; y += 1) {
      frames[0].copy(frames[frame], y * rowBytes, y * rowBytes, (y + 1) * rowBytes);
    }
  }
}

function clearCellBorder(frame, cellSize) {
  const clearPixel = (x, y) => frame.fill(0, (y * cellSize + x) * 4, (y * cellSize + x + 1) * 4);
  for (let x = 0; x < cellSize; x += 1) {
    clearPixel(x, 0);
    clearPixel(x, cellSize - 1);
  }
  for (let y = 1; y < cellSize - 1; y += 1) {
    clearPixel(0, y);
    clearPixel(cellSize - 1, y);
  }
}

function normalizeTransparentRgb(frame) {
  for (let offset = 0; offset < frame.length; offset += 4) {
    if (frame[offset + 3] === 0) frame.fill(0, offset, offset + 4);
  }
}

function clampMaskToBase(baseFrames, maskFrames) {
  let clampedPixels = 0;
  for (let frame = 0; frame < baseFrames.length; frame += 1) {
    const base = baseFrames[frame];
    const mask = maskFrames[frame];
    for (let offset = 0; offset < base.length; offset += 4) {
      const baseAlpha = base[offset + 3];
      if (mask[offset + 3] > baseAlpha) {
        mask[offset + 3] = baseAlpha;
        clampedPixels += 1;
      }
      if (mask[offset + 3] === 0) mask.fill(0, offset, offset + 4);
    }
  }
  return clampedPixels;
}

function packFrames(frames, cellSize) {
  const sheetSize = cellSize * 4;
  const sheet = Buffer.alloc(sheetSize * sheetSize * 4);
  const rowBytes = cellSize * 4;
  for (let index = 0; index < frames.length; index += 1) {
    const cellX = (index % 4) * cellSize;
    const cellY = Math.floor(index / 4) * cellSize;
    for (let y = 0; y < cellSize; y += 1) {
      const sourceStart = y * rowBytes;
      const targetStart = ((cellY + y) * sheetSize + cellX) * 4;
      frames[index].copy(sheet, targetStart, sourceStart, sourceStart + rowBytes);
    }
  }
  return sheet;
}

function countMovementUpperDifferences(frames, cellSize, upperLockRows) {
  const lockBytes = (upperLockRows[1] - upperLockRows[0] + 1) * cellSize * 4;
  let differences = 0;
  for (let frame = 1; frame < 4; frame += 1) {
    for (let offset = 0; offset < lockBytes; offset += 1) {
      if (frames[0][offset] !== frames[frame][offset]) differences += 1;
    }
  }
  return differences;
}

function countBorderAlpha(sheet, cellSize) {
  const sheetSize = cellSize * 4;
  let nonTransparent = 0;
  const alpha = (x, y) => sheet[(y * sheetSize + x) * 4 + 3];
  for (let cell = 0; cell < 16; cell += 1) {
    const left = (cell % 4) * cellSize;
    const top = Math.floor(cell / 4) * cellSize;
    const right = left + cellSize - 1;
    const bottom = top + cellSize - 1;
    for (let offset = 0; offset < cellSize; offset += 1) {
      if (alpha(left + offset, top) !== 0) nonTransparent += 1;
      if (alpha(left + offset, bottom) !== 0) nonTransparent += 1;
    }
    for (let offset = 1; offset < cellSize - 1; offset += 1) {
      if (alpha(left, top + offset) !== 0) nonTransparent += 1;
      if (alpha(right, top + offset) !== 0) nonTransparent += 1;
    }
  }
  return nonTransparent;
}

function countMaskEscapes(base, mask) {
  let escapes = 0;
  for (let offset = 3; offset < base.length; offset += 4) {
    if (mask[offset] > base[offset]) escapes += 1;
  }
  return escapes;
}

function encodeLosslessWebP(rgba, sheetSize, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const encoded = runConvert([
    "-size", `${sheetSize}x${sheetSize}`,
    "-depth", "8",
    "rgba:-",
    "-alpha", "on",
    "-strip",
    "-define", "webp:lossless=true",
    "-define", "webp:method=6",
    "-quality", "100",
    "webp:-"
  ], { input: rgba });
  fs.writeFileSync(outputPath, encoded);
}

function encodeLosslessWebPBytes(rgba, sheetSize) {
  return runConvert([
    "-size", `${sheetSize}x${sheetSize}`,
    "-depth", "8",
    "rgba:-",
    "-alpha", "on",
    "-strip",
    "-define", "webp:lossless=true",
    "-define", "webp:method=6",
    "-quality", "100",
    "webp:-"
  ], { input: rgba });
}

function reproduceMissingLowerBodyDefect(sheet, cellSize, upperLockRows) {
  const defective = Buffer.from(sheet);
  const sheetSize = cellSize * 4;
  const firstLowerRow = upperLockRows[1] + 1;
  for (let cell = 1; cell < 4; cell += 1) {
    const cellX = cell * cellSize;
    for (let y = firstLowerRow; y < cellSize; y += 1) {
      defective.fill(0, (y * sheetSize + cellX) * 4, (y * sheetSize + cellX + cellSize) * 4);
    }
  }
  return defective;
}

function decodeRgba(imagePath, sheetSize) {
  const decoded = runConvert([imagePath, "-alpha", "on", "-depth", "8", "rgba:-"]);
  assert.equal(decoded.length, sheetSize * sheetSize * 4, `${imagePath} decoded byte length`);
  return decoded;
}

function countByteDifferences(left, right) {
  assert.equal(left.length, right.length);
  let differences = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) differences += 1;
  }
  return differences;
}

function publicAssetPath(entityId, tier, kind) {
  return `assets/entities/${entityId}/${entityId}-${tier.suffix}-${kind}.webp`;
}

function outputAssetPath(outputRoot, entityId, tier, kind) {
  return path.join(outputRoot, entityId, `${entityId}-${tier.suffix}-${kind}.webp`);
}

function buildManifestScript(manifest) {
  const json = JSON.stringify(manifest, null, 2);
  return `"use strict";\n\n(function exposePhase3AssetManifest(root, factory) {\n  const manifest = factory();\n  if (typeof module === "object" && module.exports) module.exports = manifest;\n  if (root) root.AeonPhase3AssetManifest = manifest;\n})(typeof globalThis === "object" ? globalThis : this, function createPhase3AssetManifest() {\n  const freeze = (value) => {\n    if (value && typeof value === "object" && !Object.isFrozen(value)) {\n      for (const child of Object.values(value)) freeze(child);\n      Object.freeze(value);\n    }\n    return value;\n  };\n  return freeze(${json});\n});\n`;
}

function generate(outputRoot) {
  const toolchain = inspectToolchain();
  const approved = validateApprovedSources();
  const entityRecords = [];
  const tierTotals = Object.fromEntries(Object.keys(TIERS).map((key) => [key, 0]));
  const tierAudits = Object.fromEntries(Object.keys(TIERS).map((key) => [key, {
    movementUpperDifferences: 0,
    borderAlphaPixels: 0,
    maskEscapePixels: 0,
    losslessRoundTripDifferences: 0,
    clampedMaskPixels: 0
  }]));
  let legacyDefectProof;

  for (const identity of approved.entities) {
    const files = {};
    for (const tier of Object.values(TIERS)) {
      const baseFrames = independentlyResizeFrames(identity.atlasPath, tier.cellSize);
      const maskFrames = independentlyResizeFrames(identity.maskPath, tier.cellSize);
      relockMovementUpperRows(baseFrames, tier.cellSize, tier.upperLockRows);
      relockMovementUpperRows(maskFrames, tier.cellSize, tier.upperLockRows);
      for (const frame of [...baseFrames, ...maskFrames]) {
        clearCellBorder(frame, tier.cellSize);
        normalizeTransparentRgb(frame);
      }
      const clampedMaskPixels = clampMaskToBase(baseFrames, maskFrames);
      const baseSheet = packFrames(baseFrames, tier.cellSize);
      const maskSheet = packFrames(maskFrames, tier.cellSize);
      if (identity.id === "starbow" && tier.key === "standard") {
        const defectiveBase = reproduceMissingLowerBodyDefect(baseSheet, tier.cellSize, tier.upperLockRows);
        const defectiveMask = reproduceMissingLowerBodyDefect(maskSheet, tier.cellSize, tier.upperLockRows);
        legacyDefectProof = {
          entity: identity.id,
          tier: tier.key,
          affectedMovementCells: [1, 2, 3],
          blankedRows: [tier.upperLockRows[1] + 1, tier.cellSize - 1],
          reproducedPairBytes: encodeLosslessWebPBytes(defectiveBase, tier.sheetSize).length
            + encodeLosslessWebPBytes(defectiveMask, tier.sheetSize).length,
          obsoleteRecordedPairBytes: 106870
        };
        assert.equal(legacyDefectProof.reproducedPairBytes, legacyDefectProof.obsoleteRecordedPairBytes);
      }
      const basePath = outputAssetPath(outputRoot, identity.id, tier, "base");
      const maskPath = outputAssetPath(outputRoot, identity.id, tier, "mask");
      encodeLosslessWebP(baseSheet, tier.sheetSize, basePath);
      encodeLosslessWebP(maskSheet, tier.sheetSize, maskPath);

      const decodedBase = decodeRgba(basePath, tier.sheetSize);
      const decodedMask = decodeRgba(maskPath, tier.sheetSize);
      const audit = {
        movementUpperDifferences: countMovementUpperDifferences(baseFrames, tier.cellSize, tier.upperLockRows)
          + countMovementUpperDifferences(maskFrames, tier.cellSize, tier.upperLockRows),
        borderAlphaPixels: countBorderAlpha(decodedBase, tier.cellSize) + countBorderAlpha(decodedMask, tier.cellSize),
        maskEscapePixels: countMaskEscapes(decodedBase, decodedMask),
        losslessRoundTripDifferences: countByteDifferences(baseSheet, decodedBase)
          + countByteDifferences(maskSheet, decodedMask),
        clampedMaskPixels
      };
      assert.equal(audit.movementUpperDifferences, 0, `${identity.id} ${tier.key} upper lock`);
      assert.equal(audit.borderAlphaPixels, 0, `${identity.id} ${tier.key} cell border`);
      assert.equal(audit.maskEscapePixels, 0, `${identity.id} ${tier.key} mask containment`);
      assert.equal(audit.losslessRoundTripDifferences, 0, `${identity.id} ${tier.key} lossless round trip`);
      for (const key of Object.keys(tierAudits[tier.key])) tierAudits[tier.key][key] += audit[key];

      const baseBytes = fs.readFileSync(basePath);
      const maskBytes = fs.readFileSync(maskPath);
      const pairBytes = baseBytes.length + maskBytes.length;
      tierTotals[tier.key] += pairBytes;
      files[tier.key] = {
        base: {
          path: publicAssetPath(identity.id, tier, "base"),
          bytes: baseBytes.length,
          sha256: sha256(baseBytes),
          dimensions: [tier.sheetSize, tier.sheetSize]
        },
        mask: {
          path: publicAssetPath(identity.id, tier, "mask"),
          bytes: maskBytes.length,
          sha256: sha256(maskBytes),
          dimensions: [tier.sheetSize, tier.sheetSize]
        },
        pairBytes,
        decodedBytes: tier.sheetSize * tier.sheetSize * 4 * 2,
        audit
      };
    }
    entityRecords.push({
      id: identity.id,
      faction: identity.faction,
      role: identity.role,
      source: identity.source,
      files
    });
  }

  for (const tier of Object.values(TIERS)) {
    assert.ok(tierTotals[tier.key] <= tier.encodedCeiling, `${tier.label} encoded ceiling exceeded`);
    assert.equal(tier.sheetSize * tier.sheetSize * 4 * ENTITY_IDS.length * 2, tier.decodedBytes);
  }
  assert.ok(legacyDefectProof, "legacy missing-lower-body proof was not measured");

  const exporterPath = path.join(ROOT, "tools/export-phase3-assets.js");
  const manifest = {
    schema: 1,
    phase: "3",
    kind: "entity-runtime-assets",
    format: "lossless-webp",
    source: {
      package: approved.sourceManifestRecord,
      profile: {
        sheet: MASTER_SHEET,
        cell: [MASTER_CELL, MASTER_CELL],
        root: MASTER_ROOT,
        canonicalFacing: "right",
        mirroredFacing: "left"
      }
    },
    toolchain: {
      exporter: "tools/export-phase3-assets.js",
      exporterSha256: sha256(fs.readFileSync(exporterPath)),
      imageMagick: toolchain.imageMagick,
      libwebp: toolchain.libwebp,
      resize: "independent 384px cells; ImageMagick Lanczos",
      encode: "lossless WebP; method 6; quality 100; metadata stripped"
    },
    layout: {
      grid: [4, 4],
      frames: FRAME_SOURCES,
      animations: {
        idle: { indices: [0], fps: 1, loop: true, aliases: "move:0" },
        move: { indices: [0, 1, 2, 3], fps: 8, loop: true },
        action: { indices: [4, 5, 6, 7, 8, 9], fps: 12, loop: false },
        defeat: { indices: [10, 11, 12, 13, 14, 15], fps: 10, loop: false }
      },
      canonicalFacing: "right",
      mirroredFacing: "left",
      logicalRenderCell: [160, 160],
      destinationRoot: [80, 147.5]
    },
    tiers: Object.fromEntries(Object.values(TIERS).map((tier) => [tier.key, {
      label: tier.label,
      cellSize: tier.cellSize,
      sheet: [tier.sheetSize, tier.sheetSize],
      sourceRoot: tier.sourceRoot,
      upperLockRows: tier.upperLockRows,
      encodedBytes: tierTotals[tier.key],
      encodedCeiling: tier.encodedCeiling,
      decodedBytes: tier.decodedBytes,
      audit: tierAudits[tier.key]
    }])),
    players: approved.sourceManifest.players,
    entities: entityRecords,
    budgetCorrection: {
      reason: "The unpublished survey totals retained blank lower bodies in movement cells 1-3; Phase 3 freezes complete full-body exports instead.",
      obsoleteSurvey: {
        compact: 435142,
        standard: 694040,
        combined: 1129182
      },
      correctedFullBody: {
        compact: tierTotals.compact,
        standard: tierTotals.standard,
        combined: tierTotals.compact + tierTotals.standard
      },
      reproduction: legacyDefectProof
    },
    totals: {
      files: ENTITY_IDS.length * Object.keys(TIERS).length * 2,
      encodedBytes: tierTotals.standard + tierTotals.compact,
      encodedCeiling: TIERS.standard.encodedCeiling + TIERS.compact.encodedCeiling,
      selectedTierDecodedBytes: {
        standard: TIERS.standard.decodedBytes,
        compact: TIERS.compact.decodedBytes
      }
    }
  };
  const manifestPath = path.join(outputRoot, MANIFEST_NAME);
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(manifestPath, buildManifestScript(manifest));
  return manifest;
}

function expectedGeneratedFiles(manifest) {
  const files = [MANIFEST_NAME];
  for (const entity of manifest.entities) {
    for (const tier of Object.keys(TIERS)) {
      files.push(path.relative(DEFAULT_OUTPUT_ROOT, outputAssetPath(DEFAULT_OUTPUT_ROOT, entity.id, TIERS[tier], "base")));
      files.push(path.relative(DEFAULT_OUTPUT_ROOT, outputAssetPath(DEFAULT_OUTPUT_ROOT, entity.id, TIERS[tier], "mask")));
    }
  }
  return files.sort();
}

function checkGeneratedFiles() {
  const temporaryRoot = fs.mkdtempSync(path.join(path.dirname(DEFAULT_OUTPUT_ROOT), ".phase3-assets-check-"));
  try {
    const manifest = generate(temporaryRoot);
    for (const relativePath of expectedGeneratedFiles(manifest)) {
      const expectedPath = path.join(temporaryRoot, relativePath);
      const actualPath = path.join(DEFAULT_OUTPUT_ROOT, relativePath);
      assert.ok(fs.existsSync(actualPath), `generated file is missing: ${relativePath}`);
      assert.deepEqual(fs.readFileSync(actualPath), fs.readFileSync(expectedPath), `generated file drift: ${relativePath}`);
    }
    process.stdout.write(`Phase 3 entity assets are reproducible (${manifest.totals.files} WebPs, ${manifest.totals.encodedBytes} bytes).\n`);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  const options = { check: false, outputRoot: DEFAULT_OUTPUT_ROOT };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") {
      options.check = true;
    } else if (argument === "--output") {
      const value = argv[index + 1];
      if (!value) fail("--output requires a directory");
      options.outputRoot = path.resolve(value);
      index += 1;
    } else {
      fail(`Unknown argument: ${argument}`);
    }
  }
  if (options.check && options.outputRoot !== DEFAULT_OUTPUT_ROOT) fail("--check cannot be combined with --output");
  return options;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.check) {
    checkGeneratedFiles();
    return;
  }
  const manifest = generate(options.outputRoot);
  process.stdout.write(`Exported ${manifest.totals.files} lossless WebPs (${manifest.totals.encodedBytes} bytes) to ${options.outputRoot}.\n`);
}

if (require.main === module) main();

module.exports = Object.freeze({
  ENTITY_IDS,
  FRAME_SOURCES,
  TIERS,
  generate
});
