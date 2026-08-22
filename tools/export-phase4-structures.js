#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_ROOT = path.join(ROOT, "concepts/feasibility/phase1a");
const SOURCE_MANIFEST_PATH = path.join(SOURCE_ROOT, "manifest.json");
const SOURCE_MAP_PATH = path.join(ROOT, "phase2/map.js");
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, "phase4/assets/structures");
const MANIFEST_NAME = "manifest.js";
const CONVERT = process.env.AOK_PHASE4_CONVERT || "convert";
const MAXIMUM_EDGE = 384;
const ENCODED_CEILING = 634642;

const PLAYER_PRESENTATIONS = Object.freeze([
  Object.freeze({ id: 1, name: "Azure", rgb: Object.freeze([47, 169, 255]), symbol: "diamond" }),
  Object.freeze({ id: 2, name: "Violet", rgb: Object.freeze([165, 92, 255]), symbol: "cross" }),
  Object.freeze({ id: 3, name: "Coral", rgb: Object.freeze([229, 83, 74]), symbol: "triangle" }),
  Object.freeze({ id: 4, name: "Emerald", rgb: Object.freeze([38, 190, 124]), symbol: "circle" }),
  Object.freeze({ id: 5, name: "Amber", rgb: Object.freeze([236, 169, 47]), symbol: "bars" }),
  Object.freeze({ id: 6, name: "Magenta", rgb: Object.freeze([222, 78, 174]), symbol: "chevron" })
]);

const STRUCTURES = Object.freeze([
  Object.freeze({
    id: "astral-headquarters",
    category: "headquarters",
    architecture: "astral-concord",
    faction: "astral-concord",
    ownerPolicy: "fixed-faction",
    sourceAnchorIds: Object.freeze(["astral-headquarters-anchor"]),
    sourceDimensions: Object.freeze([1024, 947]),
    runtimeDimensions: Object.freeze([384, 355]),
    source: Object.freeze({
      baseBytes: 1196732,
      baseSha256: "6f0e90ac8b60ff618cadc1238d67438b7b9952fbc0400c477f3621393f0e4ed3",
      maskBytes: 53486,
      maskSha256: "513828df6e9c36f5244f9a76b5ab7f6d5bc10649cf28fcbe1daca04293674f5a"
    }),
    presentation: Object.freeze({
      drawSizeWorld: Object.freeze([192, 177.5]),
      sourceGroundRoot: Object.freeze([192, 334]),
      destinationGroundRoot: Object.freeze([96, 167]),
      anchorOffsetsFromGroundWorld: Object.freeze({
        selection: Object.freeze([0, -18]),
        health: Object.freeze([0, -154]),
        owner: Object.freeze([70, -145]),
        effect: Object.freeze([0, -94])
      })
    })
  }),
  Object.freeze({
    id: "gravebound-headquarters",
    category: "headquarters",
    architecture: "gravebound-court",
    faction: "gravebound-court",
    ownerPolicy: "fixed-faction",
    sourceAnchorIds: Object.freeze(["gravebound-headquarters-anchor"]),
    sourceDimensions: Object.freeze([1024, 933]),
    runtimeDimensions: Object.freeze([384, 350]),
    source: Object.freeze({
      baseBytes: 1139685,
      baseSha256: "f45bd5d814c06cb5c5c7d49d4e600a2cf938fe8417746619e9d229a753c43c28",
      maskBytes: 61852,
      maskSha256: "01bd0630ec618648be20be6674b211d30040aba1b3f61dc0b8c0feca57cc630c"
    }),
    presentation: Object.freeze({
      drawSizeWorld: Object.freeze([192, 175]),
      sourceGroundRoot: Object.freeze([192, 330]),
      destinationGroundRoot: Object.freeze([96, 165]),
      anchorOffsetsFromGroundWorld: Object.freeze({
        selection: Object.freeze([0, -18]),
        health: Object.freeze([0, -151]),
        owner: Object.freeze([70, -141]),
        effect: Object.freeze([0, -90])
      })
    })
  }),
  Object.freeze({
    id: "resource-point",
    category: "resource-point",
    architecture: "shared-neutral",
    faction: null,
    ownerPolicy: "capturable-shared",
    sourceAnchorIds: Object.freeze(["central-resource-point-anchor"]),
    sourceDimensions: Object.freeze([1024, 1024]),
    runtimeDimensions: Object.freeze([384, 384]),
    source: Object.freeze({
      baseBytes: 951762,
      baseSha256: "b17c2d77a3c324b88c221968458295acda55b5091a4479a5fade46dc70ba5596",
      maskBytes: 56248,
      maskSha256: "5e26062554c721eafa4a5c5bb0cf53133c4a100f28faba92727c1dc1fc58dded"
    }),
    presentation: Object.freeze({
      drawSizeWorld: Object.freeze([128, 128]),
      sourceGroundRoot: Object.freeze([192, 360]),
      destinationGroundRoot: Object.freeze([64, 120]),
      anchorOffsetsFromGroundWorld: Object.freeze({
        selection: Object.freeze([0, -18]),
        health: Object.freeze([0, -108]),
        owner: Object.freeze([48, -97]),
        effect: Object.freeze([0, -56])
      })
    })
  }),
  Object.freeze({
    id: "production-outpost",
    category: "production-outpost",
    architecture: "shared-neutral",
    faction: null,
    ownerPolicy: "capturable-shared",
    sourceAnchorIds: Object.freeze([
      "west-production-outpost-anchor",
      "east-production-outpost-anchor"
    ]),
    sourceDimensions: Object.freeze([1024, 810]),
    runtimeDimensions: Object.freeze([384, 304]),
    source: Object.freeze({
      baseBytes: 977617,
      baseSha256: "c035de8218de98180bc6ab137481041df4df2e75b5c7ff4fb6dc1daffe5dcd13",
      maskBytes: 43129,
      maskSha256: "2e6595010e6f9ba428c391a3bef7eba6708fd3dac87b1c73096b0bdbabff1b06"
    }),
    presentation: Object.freeze({
      drawSizeWorld: Object.freeze([160, 126.66666666666667]),
      sourceGroundRoot: Object.freeze([192, 288]),
      destinationGroundRoot: Object.freeze([80, 120]),
      anchorOffsetsFromGroundWorld: Object.freeze({
        selection: Object.freeze([0, -18]),
        health: Object.freeze([0, -108]),
        owner: Object.freeze([60, -94]),
        effect: Object.freeze([0, -62])
      })
    })
  })
]);

const DAMAGE_EVIDENCE = Object.freeze({
  path: "concepts/feasibility/phase1a/structures/production-outpost-damage.webp",
  dimensions: Object.freeze([1800, 638]),
  bytes: 83282,
  sha256: "32d7ee61a97ba3937bc41ffe40944f9b9179ef55610b192bc703a79eb3ae3ee7",
  runtimeAsset: false,
  alpha: false,
  reason: "Flattened RGB review strip only; it is not aligned transparent runtime damage art and must not be cropped or loaded."
});

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

function sourceFileRecord(relativePath, expectedBytes, expectedSha256) {
  const absolutePath = path.join(ROOT, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  assert.equal(bytes.length, expectedBytes, `${relativePath} byte count`);
  assert.equal(sha256(bytes), expectedSha256, `${relativePath} SHA-256`);
  return Object.freeze({
    path: relativePath,
    bytes: bytes.length,
    sha256: sha256(bytes)
  });
}

function validateApprovedSources() {
  const packageBytes = fs.readFileSync(SOURCE_MANIFEST_PATH);
  assert.equal(packageBytes.length, 3720, "approved package manifest byte count");
  assert.equal(
    sha256(packageBytes),
    "03b9a3d0b9cbae6dd7d0bbf5ad8032af65d2fc7d9ff1a550950db1ccdf180d49",
    "approved package manifest SHA-256"
  );
  const sourceManifest = readJson(SOURCE_MANIFEST_PATH);
  assert.equal(sourceManifest.schema, 1);
  assert.deepEqual(sourceManifest.players, PLAYER_PRESENTATIONS);
  assert.deepEqual(sourceManifest.structures.map(({ id }) => id), STRUCTURES.map(({ id }) => id));

  const mapBytes = fs.readFileSync(SOURCE_MAP_PATH);
  assert.equal(mapBytes.length, 4591, "approved map byte count");
  assert.equal(
    sha256(mapBytes),
    "3e0a64da499411db0acce2993b0bf91fcf29a8a329d01fa834376fc5ef5be7ab",
    "approved map SHA-256"
  );
  delete require.cache[require.resolve(SOURCE_MAP_PATH)];
  const map = require(SOURCE_MAP_PATH);
  assert.equal(map.id, "moonfall-crossing-two-player");
  const mapAnchors = new Map(map.layers.anchors.structures.map((anchor) => [anchor.id, anchor]));

  const records = STRUCTURES.map((specification) => {
    const manifestRecord = sourceManifest.structures.find(({ id }) => id === specification.id);
    assert.ok(manifestRecord, `${specification.id} manifest record`);
    assert.equal(manifestRecord.category, specification.category);
    assert.equal(manifestRecord.architecture, specification.architecture);
    const expectedBase = `structures/${specification.id}.png`;
    const expectedMask = `structures/${specification.id}-player-mask.png`;
    assert.equal(manifestRecord.base, expectedBase);
    assert.equal(manifestRecord.playerMask, expectedMask);

    for (const anchorId of specification.sourceAnchorIds) {
      const anchor = mapAnchors.get(anchorId);
      assert.ok(anchor, `${specification.id} source anchor ${anchorId}`);
      assert.equal(anchor.category, specification.category);
      if (specification.faction) assert.equal(anchor.faction, specification.faction);
      else assert.equal(anchor.seat, null);
    }

    const basePath = path.join(SOURCE_ROOT, expectedBase);
    const maskPath = path.join(SOURCE_ROOT, expectedMask);
    const base = sourceFileRecord(
      path.relative(ROOT, basePath).split(path.sep).join("/"),
      specification.source.baseBytes,
      specification.source.baseSha256
    );
    const mask = sourceFileRecord(
      path.relative(ROOT, maskPath).split(path.sep).join("/"),
      specification.source.maskBytes,
      specification.source.maskSha256
    );
    for (const [kind, filePath] of [["base", basePath], ["mask", maskPath]]) {
      const rgba = decodeRgba(filePath, ...specification.sourceDimensions);
      assert.equal(rgba.length, specification.sourceDimensions[0] * specification.sourceDimensions[1] * 4, `${specification.id} ${kind} source RGBA`);
    }
    return Object.freeze({ specification, basePath, maskPath, base, mask });
  });

  const damage = sourceFileRecord(DAMAGE_EVIDENCE.path, DAMAGE_EVIDENCE.bytes, DAMAGE_EVIDENCE.sha256);
  return Object.freeze({
    sourceManifest,
    package: Object.freeze({
      path: path.relative(ROOT, SOURCE_MANIFEST_PATH).split(path.sep).join("/"),
      bytes: packageBytes.length,
      sha256: sha256(packageBytes)
    }),
    map: Object.freeze({
      path: path.relative(ROOT, SOURCE_MAP_PATH).split(path.sep).join("/"),
      bytes: mapBytes.length,
      sha256: sha256(mapBytes),
      schemaVersion: map.schemaVersion,
      id: map.id
    }),
    records,
    damage
  });
}

function decodeRgba(imagePath, width, height) {
  const decoded = runConvert([imagePath, "-alpha", "on", "-depth", "8", "rgba:-"]);
  assert.equal(decoded.length, width * height * 4, `${imagePath} decoded byte length`);
  return decoded;
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
  let escapes = 0;
  for (let offset = 3; offset < base.length; offset += 4) {
    if (mask[offset] > base[offset]) escapes += 1;
  }
  return escapes;
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

function alphaStatistics(pixels) {
  let visiblePixels = 0;
  let strongPixels = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] > 0) visiblePixels += 1;
    if (pixels[offset] > 16) strongPixels += 1;
  }
  return Object.freeze({ visiblePixels, strongPixels });
}

function countByteDifferences(left, right) {
  assert.equal(left.length, right.length);
  let differences = 0;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) differences += 1;
  return differences;
}

function countTransparentRgbPixels(pixels) {
  let count = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0
      && (pixels[offset] !== 0 || pixels[offset + 1] !== 0 || pixels[offset + 2] !== 0)) count += 1;
  }
  return count;
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

function outputAssetPath(outputRoot, structureId, kind) {
  return path.join(outputRoot, structureId, `${structureId}-384-${kind}.webp`);
}

function publicAssetPath(structureId, kind) {
  return `assets/structures/${structureId}/${structureId}-384-${kind}.webp`;
}

function buildManifestScript(manifest) {
  const json = JSON.stringify(manifest, null, 2);
  return `"use strict";\n\n(function exposePhase4StructureAssetManifest(root, factory) {\n  const manifest = factory();\n  if (typeof module === "object" && module.exports) module.exports = manifest;\n  if (root) root.AeonPhase4StructureAssetManifest = manifest;\n})(typeof globalThis === "object" ? globalThis : this, function createPhase4StructureAssetManifest() {\n  const freeze = (value) => {\n    if (value && typeof value === "object" && !Object.isFrozen(value)) {\n      for (const child of Object.values(value)) freeze(child);\n      Object.freeze(value);\n    }\n    return value;\n  };\n  return freeze(${json});\n});\n`;
}

function generate(outputRoot = DEFAULT_OUTPUT_ROOT) {
  const approved = validateApprovedSources();
  const toolchain = inspectToolchain();
  const structureRecords = [];
  let encodedBytes = 0;
  let decodedSourceBytes = 0;
  let retainedDecodedBytesTwoPlayer = 0;
  let preparedOwnerSheetsTwoPlayer = 0;
  const aggregateAudit = {
    borderAlphaPixels: 0,
    maskEscapePixels: 0,
    losslessRoundTripDifferences: 0,
    transparentRgbPixels: 0,
    clampedMaskPixels: 0,
    transparentRgbClearedPixels: 0
  };

  for (const approvedRecord of approved.records) {
    const { specification } = approvedRecord;
    const [width, height] = specification.runtimeDimensions;
    const basePixels = Buffer.from(resizeRgba(approvedRecord.basePath, width, height));
    const maskPixels = Buffer.from(resizeRgba(approvedRecord.maskPath, width, height));
    const transparentRgbClearedPixels = zeroTransparentRgb(basePixels) + zeroTransparentRgb(maskPixels);
    const clampedMaskPixels = clampMaskToBase(basePixels, maskPixels);
    // Player-color coverage is carried only by alpha. Normalizing visible mask
    // RGB removes authoring-only color noise without changing the approved
    // HSL/luminance recolor transform or its material-boundary coverage.
    normalizeMaskRgb(maskPixels);
    const basePath = outputAssetPath(outputRoot, specification.id, "base");
    const maskPath = outputAssetPath(outputRoot, specification.id, "mask");
    encodeLosslessWebP(basePixels, width, height, basePath);
    encodeLosslessWebP(maskPixels, width, height, maskPath);

    const decodedBase = decodeRgba(basePath, width, height);
    const decodedMask = decodeRgba(maskPath, width, height);
    const audit = {
      borderAlphaPixels: countBorderAlpha(decodedBase, width, height) + countBorderAlpha(decodedMask, width, height),
      maskEscapePixels: countMaskEscapes(decodedBase, decodedMask),
      losslessRoundTripDifferences: countByteDifferences(basePixels, decodedBase)
        + countByteDifferences(maskPixels, decodedMask),
      transparentRgbPixels: countTransparentRgbPixels(decodedBase) + countTransparentRgbPixels(decodedMask),
      clampedMaskPixels,
      transparentRgbClearedPixels
    };
    assert.equal(audit.borderAlphaPixels, 0, `${specification.id} transparent border`);
    assert.equal(audit.maskEscapePixels, 0, `${specification.id} mask containment`);
    assert.equal(audit.losslessRoundTripDifferences, 0, `${specification.id} lossless round trip`);
    assert.equal(audit.transparentRgbPixels, 0, `${specification.id} transparent RGB`);
    for (const key of Object.keys(aggregateAudit)) aggregateAudit[key] += audit[key];

    const baseBytes = fs.readFileSync(basePath);
    const maskBytes = fs.readFileSync(maskPath);
    const pairBytes = baseBytes.length + maskBytes.length;
    const decodedBytes = width * height * 4 * 2;
    const ownerSheetCount = specification.ownerPolicy === "fixed-faction" ? 1 : 2;
    encodedBytes += pairBytes;
    decodedSourceBytes += decodedBytes;
    retainedDecodedBytesTwoPlayer += width * height * 4 * (1 + ownerSheetCount);
    preparedOwnerSheetsTwoPlayer += ownerSheetCount;

    structureRecords.push({
      id: specification.id,
      category: specification.category,
      architecture: specification.architecture,
      faction: specification.faction,
      ownerPolicy: specification.ownerPolicy,
      sourceAnchorIds: specification.sourceAnchorIds,
      source: {
        base: { ...approvedRecord.base, dimensions: specification.sourceDimensions },
        mask: { ...approvedRecord.mask, dimensions: specification.sourceDimensions }
      },
      presentation: specification.presentation,
      files: {
        base: {
          path: publicAssetPath(specification.id, "base"),
          dimensions: specification.runtimeDimensions,
          bytes: baseBytes.length,
          sha256: sha256(baseBytes),
          alpha: alphaStatistics(decodedBase)
        },
        mask: {
          path: publicAssetPath(specification.id, "mask"),
          dimensions: specification.runtimeDimensions,
          bytes: maskBytes.length,
          sha256: sha256(maskBytes),
          alpha: alphaStatistics(decodedMask)
        },
        pairBytes,
        decodedBytes,
        audit
      }
    });
  }

  assert.ok(encodedBytes <= ENCODED_CEILING, "structure runtime encoded ceiling exceeded");
  assert.equal(decodedSourceBytes, 4279296, "structure source decoded arithmetic");
  assert.equal(retainedDecodedBytesTwoPlayer, 5336064, "default retained decoded arithmetic");
  assert.equal(preparedOwnerSheetsTwoPlayer, 6, "default prepared owner sheet count");

  const exporterPath = path.join(ROOT, "tools/export-phase4-structures.js");
  const manifest = {
    schema: 1,
    phase: "4",
    kind: "structure-runtime-assets",
    format: "lossless-webp",
    source: {
      package: approved.package,
      map: approved.map,
      maximumEdge: MAXIMUM_EDGE,
      resizeRule: "Scale each complete transparent base and aligned mask proportionally to a 384px maximum edge; never trim or reframe."
    },
    toolchain: {
      exporter: "tools/export-phase4-structures.js",
      exporterSha256: sha256(fs.readFileSync(exporterPath)),
      imageMagick: toolchain.imageMagick,
      libwebp: toolchain.libwebp,
      resize: "full transparent canvas; identical base/mask Lanczos geometry",
      encode: "lossless WebP; exact RGBA; method 6; quality 100; metadata stripped; transparent RGB zeroed and round-trip verified; visible mask RGB normalized to white"
    },
    players: approved.sourceManifest.players,
    limits: {
      structureCategories: 3,
      runtimeStructures: 4,
      capturableOwnerSeatCap: 2,
      encodedCeiling: ENCODED_CEILING
    },
    damageEvidence: {
      ...DAMAGE_EVIDENCE,
      source: approved.damage,
      runtimeStates: ["intact"]
    },
    encodingCorrection: {
      reason: "The earlier 630,706-byte survey used libwebp's default non-exact transparent-RGB cleanup. The runtime export preserves exact zero RGB under alpha=0 for deterministic decoded bytes.",
      obsoleteNonExactBytes: 630706,
      exactRgbaBytes: encodedBytes,
      deltaBytes: encodedBytes - 630706
    },
    structures: structureRecords,
    totals: {
      files: STRUCTURES.length * 2,
      encodedBytes,
      encodedCeiling: ENCODED_CEILING,
      decodedSourceBytes,
      preparedOwnerSheetsTwoPlayer,
      retainedDecodedBytesTwoPlayer,
      audit: aggregateAudit
    }
  };
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, MANIFEST_NAME), buildManifestScript(manifest));
  return manifest;
}

function expectedGeneratedFiles(manifest) {
  const files = [MANIFEST_NAME];
  for (const structure of manifest.structures) {
    files.push(path.relative(DEFAULT_OUTPUT_ROOT, outputAssetPath(DEFAULT_OUTPUT_ROOT, structure.id, "base")));
    files.push(path.relative(DEFAULT_OUTPUT_ROOT, outputAssetPath(DEFAULT_OUTPUT_ROOT, structure.id, "mask")));
  }
  return files.sort();
}

function checkGeneratedFiles() {
  const temporaryRoot = fs.mkdtempSync(path.join(path.dirname(DEFAULT_OUTPUT_ROOT), ".phase4-structures-check-"));
  try {
    const manifest = generate(temporaryRoot);
    for (const relativePath of expectedGeneratedFiles(manifest)) {
      const expectedPath = path.join(temporaryRoot, relativePath);
      const actualPath = path.join(DEFAULT_OUTPUT_ROOT, relativePath);
      assert.ok(fs.existsSync(actualPath), `generated file is missing: ${relativePath}`);
      assert.deepEqual(fs.readFileSync(actualPath), fs.readFileSync(expectedPath), `generated file drift: ${relativePath}`);
    }
    process.stdout.write(`Phase 4 structure assets are reproducible (${manifest.totals.files} WebPs, ${manifest.totals.encodedBytes} bytes).\n`);
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
  process.stdout.write(`Exported ${manifest.totals.files} lossless structure WebPs (${manifest.totals.encodedBytes} bytes) to ${options.outputRoot}.\n`);
}

if (require.main === module) main();

module.exports = Object.freeze({
  DAMAGE_EVIDENCE,
  DEFAULT_OUTPUT_ROOT,
  MAXIMUM_EDGE,
  PLAYER_PRESENTATIONS,
  STRUCTURES,
  generate
});
