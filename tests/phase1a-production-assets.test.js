"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");

const ROOT = path.resolve(__dirname, "..");
const ASSET_ROOT = path.join(ROOT, "concepts/feasibility/phase1a");
const CELL = 384;
const MOVE_UPPER_BODY_CUTOFF = 295;

const ENTITIES = Object.freeze([
  "astral-guardian",
  "starbow",
  "aegis-titan",
  "gravebound-reaver",
  "hollow-string",
  "ossuary-colossus"
]);

const STRUCTURES = Object.freeze({
  "astral-headquarters": [1024, 947],
  "gravebound-headquarters": [1024, 933],
  "resource-point": [1024, 1024],
  "production-outpost": [1024, 810]
});

function read(relativePath) {
  return fs.readFileSync(path.join(ASSET_ROOT, relativePath));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const diagonalDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= diagonalDistance) return left;
  return aboveDistance <= diagonalDistance ? above : upperLeft;
}

function decodePng(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "invalid PNG signature");
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let interlace;
  const compressed = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    assert.ok(offset + 12 + length <= bytes.length, `${type} PNG chunk is truncated`);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      compressed.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }

  assert.equal(bitDepth, 8, "production PNG must be 8-bit");
  assert.equal(colorType, 6, "production PNG must use RGBA truecolor");
  assert.equal(interlace, 0, "production PNG must be non-interlaced for deterministic inspection");
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(compressed));
  assert.equal(inflated.length, (stride + 1) * height, "unexpected PNG scanline payload");
  const output = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const sourceRow = y * (stride + 1);
    const filter = inflated[sourceRow];
    const targetRow = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const encoded = inflated[sourceRow + 1 + x];
      const left = x >= bytesPerPixel ? output[targetRow + x - bytesPerPixel] : 0;
      const above = y > 0 ? output[targetRow + x - stride] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? output[targetRow + x - stride - bytesPerPixel] : 0;
      let value;
      if (filter === 0) value = encoded;
      else if (filter === 1) value = encoded + left;
      else if (filter === 2) value = encoded + above;
      else if (filter === 3) value = encoded + Math.floor((left + above) / 2);
      else if (filter === 4) value = encoded + paeth(left, above, upperLeft);
      else assert.fail(`unsupported PNG filter ${filter}`);
      output[targetRow + x] = value & 0xff;
    }
  }
  return { width, height, data: output };
}

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

function extractCell(image, column, row) {
  const output = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < CELL; y += 1) {
    const sourceStart = ((row * CELL + y) * image.width + column * CELL) * 4;
    image.data.copy(output, y * CELL * 4, sourceStart, sourceStart + CELL * 4);
  }
  return output;
}

function assertTransparentCellBoundary(frame, message) {
  for (let index = 0; index < CELL; index += 1) {
    assert.equal(frame[(index * CELL) * 4 + 3], 0, `${message}: left boundary`);
    assert.equal(frame[(index * CELL + CELL - 1) * 4 + 3], 0, `${message}: right boundary`);
    assert.equal(frame[index * 4 + 3], 0, `${message}: top boundary`);
    assert.equal(frame[((CELL - 1) * CELL + index) * 4 + 3], 0, `${message}: bottom boundary`);
  }
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(resolved) : [path.relative(ASSET_ROOT, resolved).replaceAll(path.sep, "/")];
  });
}

test("Phase 1A approved inventory is direct-file, explicit, and bounded", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.phase, "1A");
  assert.equal(manifest.status, "phase1a-approved-unpublished");
  assert.equal(manifest.published, false);
  assert.equal(manifest.gameplay, false);
  assert.equal(manifest.candidateBranch, "agent/phase1a-unified-production-proof");
  assert.deepEqual(manifest.ownerReview, {
    productionMethod: "approved-2026-08-20",
    integratedSet: "approved-2026-08-21",
    aegisDirectionCorrection: "approved-2026-08-21"
  });
  assert.deepEqual(manifest.entityProfile.cell, [384, 384]);
  assert.deepEqual(manifest.entityProfile.groundAnchor, [192, 354]);
  assert.deepEqual(manifest.entities.map(({ id }) => id), ENTITIES);
  assert.deepEqual(manifest.players.map(({ symbol }) => symbol), ["diamond", "cross", "triangle", "circle", "bars", "chevron"]);

  const files = listFiles(ASSET_ROOT).sort();
  assert.equal(files.length, 65);
  assert.equal(files.filter((name) => name.endsWith("/atlas.png")).length, 6);
  assert.equal(files.filter((name) => name.endsWith("/player-mask.png")).length, 6);
  assert.equal(files.filter((name) => /\/(?:idle|move|attack|defeat)\.webp$/.test(name)).length, 24);
  assert.equal(files.filter((name) => /\.(?:html|css|js)$/.test(name)).length, 0, "direct review must not ship an app shell");
  const totalBytes = files.reduce((total, name) => total + fs.statSync(path.join(ASSET_ROOT, name)).size, 0);
  assert.ok(totalBytes <= 14 * 1024 * 1024, `Phase 1A approved payload exceeds 14 MiB: ${totalBytes}`);

  const correctedAegisHashes = {
    "entities/aegis-titan/atlas.png": "634a43b6282c238acfae1f6df8d797e3c3c6abc1aeb51eef10894f05f14ba6ad",
    "entities/aegis-titan/move.webp": "dc14e498cbbbb54a3fdb2c1b7993c2ad8a5b2c258840a5c35a131dae0b6da6ca",
    "entities/aegis-titan/attack.webp": "f0ecaa980b31c1a21f8c3eea0105b306259979394a2d8bfd8719df472b6ed0ee",
    "entities/aegis-titan/player-mask.png": "1916738ea9cc13a241d55eb92cd16b5d39afbf1153b47def1c042c55ccd8e562"
  };
  for (const [name, expectedHash] of Object.entries(correctedAegisHashes)) {
    assert.equal(sha256(read(name)), expectedHash, `${name} no longer matches the reviewed direction correction`);
  }
});

test("all six entity packages obey the approved sprite, root, motion, and mask contract", () => {
  for (const entity of ENTITIES) {
    const directory = path.join(ASSET_ROOT, "entities", entity);
    const atlasBytes = fs.readFileSync(path.join(directory, "atlas.png"));
    const maskBytes = fs.readFileSync(path.join(directory, "player-mask.png"));
    const atlas = decodePng(atlasBytes);
    const mask = decodePng(maskBytes);
    const metadata = JSON.parse(fs.readFileSync(path.join(directory, "atlas.json"), "utf8"));

    assert.deepEqual([atlas.width, atlas.height], [2304, 1536], `${entity} atlas dimensions`);
    assert.deepEqual([mask.width, mask.height], [atlas.width, atlas.height], `${entity} mask dimensions`);
    assert.deepEqual(metadata.cell, [384, 384]);
    assert.deepEqual(metadata.groundAnchor, [192, 354]);
    assert.equal(metadata.canonicalFacing, "right");
    assert.equal(metadata.mirrorFacing, "left");
    assert.deepEqual(
      Object.fromEntries(Object.entries(metadata.animations).map(([name, state]) => [name, [state.row, state.frames, state.fps, state.loop]])),
      { idle: [0, 1, 1, true], move: [1, 4, 8, true], attack: [2, 6, 12, false], defeat: [3, 6, 10, false] }
    );

    const idle = extractCell(atlas, 0, 0);
    const moveFirst = extractCell(atlas, 0, 1);
    assert.ok(idle.equals(moveFirst), `${entity} idle must equal movement frame zero exactly`);
    assertTransparentCellBoundary(idle, `${entity} idle`);
    const upperBodyBytes = MOVE_UPPER_BODY_CUTOFF * CELL * 4;
    for (let frameIndex = 0; frameIndex < 4; frameIndex += 1) {
      const move = extractCell(atlas, frameIndex, 1);
      assert.ok(idle.subarray(0, upperBodyBytes).equals(move.subarray(0, upperBodyBytes)), `${entity} movement upper body drifted in frame ${frameIndex}`);
      assertTransparentCellBoundary(move, `${entity} movement frame ${frameIndex}`);
    }

    for (const [row, frames] of [[0, 1], [1, 4], [2, 6], [3, 6]]) {
      for (let frameIndex = 0; frameIndex < frames; frameIndex += 1) {
        assertTransparentCellBoundary(extractCell(atlas, frameIndex, row), `${entity} row ${row} frame ${frameIndex}`);
      }
      for (let frameIndex = frames; frameIndex < 6; frameIndex += 1) {
        const unused = extractCell(atlas, frameIndex, row);
        assert.ok(unused.every((value) => value === 0), `${entity} unused atlas cell ${row}:${frameIndex} is not empty`);
      }
    }

    let visibleMaskPixels = 0;
    for (let pixel = 0; pixel < atlas.width * atlas.height; pixel += 1) {
      const sourceAlpha = atlas.data[pixel * 4 + 3];
      const maskAlpha = mask.data[pixel * 4 + 3];
      assert.ok(maskAlpha <= sourceAlpha + 2, `${entity} player mask escapes visible alpha at pixel ${pixel}`);
      if (maskAlpha > 16) visibleMaskPixels += 1;
    }
    assert.ok(visibleMaskPixels >= 1000, `${entity} player mask is unexpectedly empty`);
    assert.ok(atlasBytes.length <= 1.5 * 1024 * 1024, `${entity} master atlas exceeds 1.5 MiB`);
    assert.ok(maskBytes.length <= 128 * 1024, `${entity} player mask exceeds 128 KiB`);

    for (const [state, animated] of [["idle", false], ["move", true], ["attack", true], ["defeat", true]]) {
      const preview = inspectWebP(fs.readFileSync(path.join(directory, `${state}.webp`)));
      assert.deepEqual(preview.dimensions, [760, 240], `${entity} ${state} actual-scale preview dimensions`);
      assert.equal(preview.chunks.includes("ANIM"), animated, `${entity} ${state} animation boundary`);
    }
    const colors = inspectWebP(fs.readFileSync(path.join(directory, "player-colors.webp")));
    assert.deepEqual(colors.dimensions, [1024, 330], `${entity} player-color proof dimensions`);
    assert.equal(colors.chunks.includes("ANIM"), false);
    assert.deepEqual(fs.readdirSync(directory).filter((name) => /left/i.test(name)), [], `${entity} must not author a second left-facing set`);
  }
});

test("structure bases are transparent, mask-aligned, recolorable, and category-stable", () => {
  for (const [structure, expectedDimensions] of Object.entries(STRUCTURES)) {
    const baseBytes = read(`structures/${structure}.png`);
    const maskBytes = read(`structures/${structure}-player-mask.png`);
    const base = decodePng(baseBytes);
    const mask = decodePng(maskBytes);
    assert.deepEqual([base.width, base.height], expectedDimensions, `${structure} dimensions`);
    assert.deepEqual([mask.width, mask.height], expectedDimensions, `${structure} mask dimensions`);
    assert.equal(base.data[3], 0, `${structure} upper-left corner must be transparent`);
    assert.equal(base.data[(base.width - 1) * 4 + 3], 0, `${structure} upper-right corner must be transparent`);
    assert.equal(base.data[((base.height - 1) * base.width) * 4 + 3], 0, `${structure} lower-left corner must be transparent`);
    assert.equal(base.data[(base.width * base.height - 1) * 4 + 3], 0, `${structure} lower-right corner must be transparent`);
    let maskPixels = 0;
    let visiblePixels = 0;
    for (let pixel = 0; pixel < base.width * base.height; pixel += 1) {
      const sourceAlpha = base.data[pixel * 4 + 3];
      const maskAlpha = mask.data[pixel * 4 + 3];
      assert.ok(maskAlpha <= sourceAlpha + 2, `${structure} player mask escapes visible alpha at pixel ${pixel}`);
      if (sourceAlpha > 16) visiblePixels += 1;
      if (maskAlpha > 16) maskPixels += 1;
    }
    assert.ok(visiblePixels >= 50000, `${structure} base is unexpectedly empty`);
    assert.ok(maskPixels >= 500, `${structure} ownership mask is unexpectedly empty`);
    assert.ok(maskPixels < visiblePixels * 0.45, `${structure} ownership mask recolors too much of the category silhouette`);
    assert.ok(baseBytes.length <= 1.25 * 1024 * 1024, `${structure} base exceeds 1.25 MiB`);
    assert.ok(maskBytes.length <= 160 * 1024, `${structure} mask exceeds 160 KiB`);
  }
});

test("Phase 1A overview, environment, damage, and viewport proofs retain their measured boundaries", () => {
  const webpFiles = {
    "review/opening-entities.webp": [1800, 1080, false, 300 * 1024],
    "review/six-player-ownership.webp": [2400, 1580, false, 600 * 1024],
    "review/battlefield-desktop.webp": [1536, 1024, false, 500 * 1024],
    "review/battlefield-phone.webp": [844, 390, false, 160 * 1024],
    "environment/battlefield-environment.webp": [1672, 941, false, 220 * 1024],
    "structures/production-outpost-damage.webp": [1800, 638, false, 120 * 1024]
  };
  for (const [name, [width, height, animated, budget]] of Object.entries(webpFiles)) {
    const bytes = read(name);
    const inspected = inspectWebP(bytes);
    assert.deepEqual(inspected.dimensions, [width, height], `${name} dimensions`);
    assert.equal(inspected.chunks.includes("ANIM"), animated, `${name} animation boundary`);
    assert.ok(bytes.length <= budget, `${name} exceeds its review budget`);
  }
  const audit = read("review/entity-atlas-audit.jpg");
  assert.equal(audit[0], 0xff);
  assert.equal(audit[1], 0xd8);
  assert.ok(audit.length <= 700 * 1024, "entity atlas audit exceeds 700 KiB");
});
