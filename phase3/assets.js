"use strict";

(function exposePhase3Assets(root, factory) {
  const manifest = typeof module === "object" && module.exports
    ? require("./assets/entities/manifest.js")
    : root?.AeonPhase3AssetManifest;
  const api = factory(manifest, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AeonPhase3Assets = api;
})(typeof globalThis === "object" ? globalThis : this, function createPhase3Assets(defaultManifest, root) {
  const ENTITY_IDS = Object.freeze([
    "astral-guardian",
    "starbow",
    "aegis-titan",
    "gravebound-reaver",
    "hollow-string",
    "ossuary-colossus"
  ]);
  const PLAYER_PRESENTATIONS = Object.freeze([
    Object.freeze({ id: 1, name: "Azure", rgb: Object.freeze([47, 169, 255]), symbol: "diamond" }),
    Object.freeze({ id: 2, name: "Violet", rgb: Object.freeze([165, 92, 255]), symbol: "cross" }),
    Object.freeze({ id: 3, name: "Coral", rgb: Object.freeze([229, 83, 74]), symbol: "triangle" }),
    Object.freeze({ id: 4, name: "Emerald", rgb: Object.freeze([38, 190, 124]), symbol: "circle" }),
    Object.freeze({ id: 5, name: "Amber", rgb: Object.freeze([236, 169, 47]), symbol: "bars" }),
    Object.freeze({ id: 6, name: "Magenta", rgb: Object.freeze([222, 78, 174]), symbol: "chevron" })
  ]);
  const PHASE3_OWNER_SEAT_BY_FACTION = Object.freeze({
    "astral-concord": 1,
    "gravebound-court": 2
  });
  const TIER_PROFILE = Object.freeze({
    standard: Object.freeze({ cellSize: 128, sheetSize: 512, sourceRoot: Object.freeze([64, 118]), upperLockRows: Object.freeze([0, 97]) }),
    compact: Object.freeze({ cellSize: 96, sheetSize: 384, sourceRoot: Object.freeze([48, 88.5]), upperLockRows: Object.freeze([0, 73]) })
  });
  const FRAME_LAYOUT = Object.freeze({
    idle: Object.freeze([0]),
    move: Object.freeze([0, 1, 2, 3]),
    action: Object.freeze([4, 5, 6, 7, 8, 9]),
    defeat: Object.freeze([10, 11, 12, 13, 14, 15])
  });
  const PRELOAD_ERROR_MESSAGE = "Entity art could not be loaded. Battle start is blocked.";
  const SHA256_PATTERN = /^[a-f0-9]{64}$/;
  const SAFE_ASSET_PATH = /^assets\/entities\/([a-z0-9-]+)\/\1-(96|128)-(base|mask)\.webp$/;

  class AssetManifestError extends Error {
    constructor(message) {
      super(message);
      this.name = "AssetManifestError";
      this.code = "INVALID_ENTITY_ASSET_MANIFEST";
    }
  }

  class AssetLoadError extends Error {
    constructor(cause) {
      super(PRELOAD_ERROR_MESSAGE, { cause });
      this.name = "AssetLoadError";
      this.code = "ENTITY_ASSET_PRELOAD_FAILED";
      this.publicMessage = PRELOAD_ERROR_MESSAGE;
    }
  }

  function reject(condition, message) {
    if (!condition) throw new AssetManifestError(message);
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function sameArray(actual, expected) {
    return Array.isArray(actual)
      && actual.length === expected.length
      && actual.every((value, index) => Object.is(value, expected[index]));
  }

  function validateFileRecord(file, entityId, tierKey, kind, profile) {
    reject(isRecord(file), `${entityId} ${tierKey} ${kind} record is missing`);
    const match = typeof file.path === "string" ? file.path.match(SAFE_ASSET_PATH) : null;
    reject(Boolean(match), `${entityId} ${tierKey} ${kind} path must be a local relative WebP`);
    reject(match[1] === entityId, `${entityId} ${tierKey} ${kind} path identity mismatch`);
    reject(match[2] === String(profile.cellSize), `${entityId} ${tierKey} ${kind} path tier mismatch`);
    reject(match[3] === kind, `${entityId} ${tierKey} ${kind} path kind mismatch`);
    reject(Number.isSafeInteger(file.bytes) && file.bytes > 0, `${entityId} ${tierKey} ${kind} byte count`);
    reject(typeof file.sha256 === "string" && SHA256_PATTERN.test(file.sha256), `${entityId} ${tierKey} ${kind} SHA-256`);
    reject(sameArray(file.dimensions, [profile.sheetSize, profile.sheetSize]), `${entityId} ${tierKey} ${kind} dimensions`);
  }

  function validateAudit(audit, label) {
    reject(isRecord(audit), `${label} audit is missing`);
    for (const key of ["movementUpperDifferences", "borderAlphaPixels", "maskEscapePixels", "losslessRoundTripDifferences"]) {
      reject(audit[key] === 0, `${label} ${key} must be zero`);
    }
    reject(Number.isSafeInteger(audit.clampedMaskPixels) && audit.clampedMaskPixels >= 0, `${label} clamped mask count`);
  }

  function validateManifest(manifest = defaultManifest) {
    reject(isRecord(manifest), "entity asset manifest is missing");
    reject(manifest.schema === 1, "entity asset manifest schema");
    reject(manifest.phase === "3" && manifest.kind === "entity-runtime-assets", "entity asset manifest identity");
    reject(manifest.format === "lossless-webp", "entity asset manifest format");
    reject(isRecord(manifest.layout), "entity asset layout is missing");
    reject(sameArray(manifest.layout.grid, [4, 4]), "entity asset grid");
    reject(manifest.layout.canonicalFacing === "right" && manifest.layout.mirroredFacing === "left", "entity facing contract");
    reject(sameArray(manifest.layout.logicalRenderCell, [160, 160]), "logical render cell");
    reject(sameArray(manifest.layout.destinationRoot, [80, 147.5]), "destination root");
    reject(isRecord(manifest.layout.animations), "animation layout is missing");
    for (const [state, indices] of Object.entries(FRAME_LAYOUT)) {
      reject(sameArray(manifest.layout.animations[state]?.indices, indices), `${state} frame mapping`);
    }
    reject(manifest.layout.animations.idle.aliases === "move:0", "idle must alias movement frame zero");
    reject(Array.isArray(manifest.layout.frames) && manifest.layout.frames.length === 16, "frame source mapping");
    for (let index = 0; index < 16; index += 1) {
      reject(manifest.layout.frames[index]?.index === index, `frame index ${index}`);
    }

    reject(isRecord(manifest.tiers), "entity asset tiers are missing");
    for (const [tierKey, profile] of Object.entries(TIER_PROFILE)) {
      const tier = manifest.tiers[tierKey];
      reject(isRecord(tier), `${tierKey} tier is missing`);
      reject(tier.cellSize === profile.cellSize, `${tierKey} cell size`);
      reject(sameArray(tier.sheet, [profile.sheetSize, profile.sheetSize]), `${tierKey} sheet size`);
      reject(sameArray(tier.sourceRoot, profile.sourceRoot), `${tierKey} source root`);
      reject(sameArray(tier.upperLockRows, profile.upperLockRows), `${tierKey} upper lock rows`);
      reject(Number.isSafeInteger(tier.encodedBytes) && tier.encodedBytes > 0, `${tierKey} encoded bytes`);
      reject(Number.isSafeInteger(tier.encodedCeiling) && tier.encodedBytes <= tier.encodedCeiling, `${tierKey} encoded budget`);
      reject(tier.decodedBytes === profile.sheetSize * profile.sheetSize * 4 * ENTITY_IDS.length * 2, `${tierKey} decoded bytes`);
      validateAudit(tier.audit, `${tierKey} aggregate`);
    }

    reject(Array.isArray(manifest.players) && manifest.players.length === PLAYER_PRESENTATIONS.length, "six player presentations are required");
    for (let index = 0; index < PLAYER_PRESENTATIONS.length; index += 1) {
      const actual = manifest.players[index];
      const expected = PLAYER_PRESENTATIONS[index];
      reject(actual?.id === expected.id && actual.name === expected.name && actual.symbol === expected.symbol, `player ${expected.id} presentation`);
      reject(sameArray(actual.rgb, expected.rgb), `player ${expected.id} color`);
    }

    reject(Array.isArray(manifest.entities) && manifest.entities.length === ENTITY_IDS.length, "six entity records are required");
    let fileCount = 0;
    const encodedTotals = { standard: 0, compact: 0 };
    for (let index = 0; index < ENTITY_IDS.length; index += 1) {
      const entity = manifest.entities[index];
      reject(entity?.id === ENTITY_IDS[index], `entity order ${index}`);
      reject(typeof entity.faction === "string" && typeof entity.role === "string", `${entity.id} identity`);
      reject(isRecord(entity.files), `${entity.id} files are missing`);
      for (const [tierKey, profile] of Object.entries(TIER_PROFILE)) {
        const pair = entity.files[tierKey];
        reject(isRecord(pair), `${entity.id} ${tierKey} pair is missing`);
        validateFileRecord(pair.base, entity.id, tierKey, "base", profile);
        validateFileRecord(pair.mask, entity.id, tierKey, "mask", profile);
        reject(pair.pairBytes === pair.base.bytes + pair.mask.bytes, `${entity.id} ${tierKey} pair bytes`);
        reject(pair.decodedBytes === profile.sheetSize * profile.sheetSize * 4 * 2, `${entity.id} ${tierKey} decoded bytes`);
        validateAudit(pair.audit, `${entity.id} ${tierKey}`);
        encodedTotals[tierKey] += pair.pairBytes;
        fileCount += 2;
      }
    }
    reject(manifest.tiers.standard.encodedBytes === encodedTotals.standard, "standard encoded total");
    reject(manifest.tiers.compact.encodedBytes === encodedTotals.compact, "compact encoded total");
    reject(manifest.totals?.files === fileCount && fileCount === 24, "entity asset file total");
    reject(manifest.totals.encodedBytes === encodedTotals.standard + encodedTotals.compact, "combined encoded total");
    reject(manifest.totals.encodedBytes <= manifest.totals.encodedCeiling, "combined encoded budget");
    return manifest;
  }

  function rgbToHsl(red, green, blue) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const maximum = Math.max(r, g, b);
    const minimum = Math.min(r, g, b);
    const lightness = (maximum + minimum) / 2;
    if (maximum === minimum) return [0, 0, lightness];
    const delta = maximum - minimum;
    const saturation = lightness > 0.5
      ? delta / (2 - maximum - minimum)
      : delta / (maximum + minimum);
    let hue;
    if (maximum === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    else if (maximum === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    return [hue / 6, saturation, lightness];
  }

  function hueToRgb(p, q, hue) {
    let value = hue;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  }

  function hslToRgb(hue, saturation, lightness) {
    if (saturation === 0) {
      const channel = Math.round(lightness * 255);
      return [channel, channel, channel];
    }
    const q = lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;
    return [
      Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
      Math.round(hueToRgb(p, q, hue) * 255),
      Math.round(hueToRgb(p, q, hue - 1 / 3) * 255)
    ];
  }

  function recolorPixels(basePixels, maskPixels, targetRgb) {
    if (!(basePixels instanceof Uint8Array || basePixels instanceof Uint8ClampedArray)) throw new TypeError("basePixels must be RGBA bytes");
    if (!(maskPixels instanceof Uint8Array || maskPixels instanceof Uint8ClampedArray)) throw new TypeError("maskPixels must be RGBA bytes");
    if (basePixels.length !== maskPixels.length || basePixels.length % 4 !== 0) throw new RangeError("base and mask pixels must be aligned RGBA bytes");
    if (!Array.isArray(targetRgb)
      || targetRgb.length !== 3
      || targetRgb.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
      throw new RangeError("targetRgb must contain three byte values");
    }
    const [targetHue, targetSaturation] = rgbToHsl(...targetRgb);
    const output = new Uint8ClampedArray(basePixels);
    for (let offset = 0; offset < output.length; offset += 4) {
      const baseAlpha = basePixels[offset + 3];
      const maskAlpha = maskPixels[offset + 3];
      if (maskAlpha > baseAlpha) throw new RangeError("mask alpha escapes base alpha");
      if (baseAlpha === 0 || maskAlpha === 0) continue;
      const coverage = Math.min(1, maskAlpha / baseAlpha);
      const [, , baseLightness] = rgbToHsl(basePixels[offset], basePixels[offset + 1], basePixels[offset + 2]);
      const tinted = hslToRgb(targetHue, targetSaturation, baseLightness);
      output[offset] = Math.round(basePixels[offset] * (1 - coverage) + tinted[0] * coverage);
      output[offset + 1] = Math.round(basePixels[offset + 1] * (1 - coverage) + tinted[1] * coverage);
      output[offset + 2] = Math.round(basePixels[offset + 2] * (1 - coverage) + tinted[2] * coverage);
      output[offset + 3] = baseAlpha;
    }
    return output;
  }

  function resolveAssetUrl(relativePath, baseUrl) {
    if (typeof relativePath !== "string" || !SAFE_ASSET_PATH.test(relativePath)) {
      throw new AssetManifestError("asset path is not a same-origin relative entity path");
    }
    const base = new URL(baseUrl);
    const resolved = new URL(relativePath, base);
    if (resolved.protocol !== base.protocol || resolved.host !== base.host || resolved.username || resolved.password) {
      throw new AssetManifestError("asset path changed origin");
    }
    return resolved;
  }

  function browserImageFactory() {
    if (typeof root?.Image !== "function") throw new Error("Image decoding is unavailable");
    return new root.Image();
  }

  function browserCanvasFactory(width, height) {
    if (!root?.document?.createElement) throw new Error("Canvas decoding is unavailable");
    const canvas = root.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function loadImage(url, imageFactory, retainedImages) {
    return new Promise((resolve, rejectLoad) => {
      const image = imageFactory();
      retainedImages.push(image);
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => rejectLoad(new Error("Local image decode failed"));
      image.src = url.href;
    });
  }

  function readPixels(image, sheetSize, canvasFactory) {
    const canvas = canvasFactory(sheetSize, sheetSize);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D context is unavailable");
    context.clearRect(0, 0, sheetSize, sheetSize);
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, sheetSize, sheetSize).data;
    return { canvas, context, pixels };
  }

  function validateDecodedPixels(basePixels, maskPixels, cellSize) {
    const sheetSize = cellSize * 4;
    for (let offset = 3; offset < basePixels.length; offset += 4) {
      if (maskPixels[offset] > basePixels[offset]) throw new Error("Decoded player-color mask escapes base alpha");
    }
    const alpha = (pixels, x, y) => pixels[(y * sheetSize + x) * 4 + 3];
    for (let cell = 0; cell < 16; cell += 1) {
      const left = (cell % 4) * cellSize;
      const top = Math.floor(cell / 4) * cellSize;
      const right = left + cellSize - 1;
      const bottom = top + cellSize - 1;
      for (const pixels of [basePixels, maskPixels]) {
        for (let offset = 0; offset < cellSize; offset += 1) {
          if (alpha(pixels, left + offset, top) !== 0 || alpha(pixels, left + offset, bottom) !== 0) {
            throw new Error("Decoded entity cell has non-transparent horizontal border alpha");
          }
        }
        for (let offset = 1; offset < cellSize - 1; offset += 1) {
          if (alpha(pixels, left, top + offset) !== 0 || alpha(pixels, right, top + offset) !== 0) {
            throw new Error("Decoded entity cell has non-transparent vertical border alpha");
          }
        }
      }
    }
  }

  function createOwnerSheet(basePixels, maskPixels, presentation, sheetSize, canvasFactory) {
    const canvas = canvasFactory(sheetSize, sheetSize);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    const imageData = context.createImageData(sheetSize, sheetSize);
    imageData.data.set(recolorPixels(basePixels, maskPixels, presentation.rgb));
    context.putImageData(imageData, 0, 0);
    return canvas;
  }

  function releaseImage(image) {
    image.onload = null;
    image.onerror = null;
    if (typeof image.removeAttribute === "function") image.removeAttribute("src");
  }

  function clearCanvas(canvas) {
    if (!canvas) return;
    canvas.width = 0;
    canvas.height = 0;
  }

  function normalizeOwnerSeatByFaction(ownerSeatByFaction) {
    if (!isRecord(ownerSeatByFaction)) throw new TypeError("ownerSeatByFaction must map both Phase 3 factions");
    const expectedFactions = Object.keys(PHASE3_OWNER_SEAT_BY_FACTION);
    const actualFactions = Object.keys(ownerSeatByFaction).sort();
    if (!sameArray(actualFactions, [...expectedFactions].sort())) {
      throw new RangeError("ownerSeatByFaction must contain exactly both Phase 3 factions");
    }
    const normalized = {};
    for (const faction of expectedFactions) {
      const seat = ownerSeatByFaction[faction];
      if (seat !== PHASE3_OWNER_SEAT_BY_FACTION[faction]) {
        throw new RangeError(`ownerSeatByFaction must preserve the fixed Phase 3 seat for ${faction}`);
      }
      normalized[faction] = seat;
    }
    return Object.freeze(normalized);
  }

  async function load(options = {}) {
    const retainedImages = [];
    const retainedCanvases = [];
    try {
      const manifest = validateManifest(options.manifest ?? defaultManifest);
      const tier = options.tier ?? "standard";
      const profile = TIER_PROFILE[tier];
      if (!profile) throw new RangeError("tier must be standard or compact");
      const ownerSeatByFaction = normalizeOwnerSeatByFaction(
        options.ownerSeatByFaction ?? PHASE3_OWNER_SEAT_BY_FACTION
      );
      const imageFactory = options.imageFactory ?? browserImageFactory;
      const canvasFactory = options.canvasFactory ?? browserCanvasFactory;
      const baseUrl = options.baseUrl ?? root?.document?.baseURI;
      if (!baseUrl) throw new Error("A document base URL is required");
      const ownerPresentations = Object.freeze(Object.fromEntries(
        manifest.players.map((presentation) => [presentation.id, Object.freeze({
          id: presentation.id,
          name: presentation.name,
          rgb: Object.freeze([...presentation.rgb]),
          symbol: presentation.symbol
        })])
      ));
      const entities = {};
      for (const entity of manifest.entities) {
        const pair = entity.files[tier];
        const baseUrlRecord = resolveAssetUrl(pair.base.path, baseUrl);
        const maskUrlRecord = resolveAssetUrl(pair.mask.path, baseUrl);
        const [baseImage, maskImage] = await Promise.all([
          loadImage(baseUrlRecord, imageFactory, retainedImages),
          loadImage(maskUrlRecord, imageFactory, retainedImages)
        ]);
        if (baseImage.naturalWidth !== profile.sheetSize || baseImage.naturalHeight !== profile.sheetSize
          || maskImage.naturalWidth !== profile.sheetSize || maskImage.naturalHeight !== profile.sheetSize) {
          throw new Error("Decoded entity sheet dimensions do not match the selected tier");
        }
        const base = readPixels(baseImage, profile.sheetSize, canvasFactory);
        const mask = readPixels(maskImage, profile.sheetSize, canvasFactory);
        validateDecodedPixels(base.pixels, mask.pixels, profile.cellSize);
        const ownerSeat = ownerSeatByFaction[entity.faction];
        if (!ownerSeat) throw new Error(`No Phase 3 owner seat is assigned to ${entity.faction}`);
        const ownerSheets = {};
        const canvas = createOwnerSheet(base.pixels, mask.pixels, ownerPresentations[ownerSeat], profile.sheetSize, canvasFactory);
        retainedCanvases.push(canvas);
        ownerSheets[ownerSeat] = canvas;
        clearCanvas(base.canvas);
        clearCanvas(mask.canvas);
        releaseImage(maskImage);
        retainedImages.splice(retainedImages.indexOf(maskImage), 1);
        entities[entity.id] = Object.freeze({
          kind: entity.id,
          faction: entity.faction,
          role: entity.role,
          baseImage,
          ownerSheets: Object.freeze(ownerSheets)
        });
      }
      const bundle = {
        tier,
        ownerSeatByFaction,
        retainedDecodedBytes: manifest.tiers[tier].decodedBytes,
        cellSize: profile.cellSize,
        sheetSize: profile.sheetSize,
        sourceRoot: Object.freeze({ x: profile.sourceRoot[0], y: profile.sourceRoot[1] }),
        renderCell: Object.freeze({ width: 160, height: 160, rootX: 80, rootY: 147.5 }),
        frames: FRAME_LAYOUT,
        entities: Object.freeze(entities),
        ownerPresentations,
        dispose() {
          for (const entity of Object.values(entities)) {
            releaseImage(entity.baseImage);
            for (const canvas of Object.values(entity.ownerSheets)) clearCanvas(canvas);
          }
        }
      };
      return Object.freeze(bundle);
    } catch (cause) {
      for (const image of retainedImages) releaseImage(image);
      for (const canvas of retainedCanvases) clearCanvas(canvas);
      const failure = cause instanceof AssetLoadError ? cause : new AssetLoadError(cause);
      if (typeof options.onError === "function") options.onError(failure.publicMessage);
      throw failure;
    }
  }

  return Object.freeze({
    ENTITY_IDS,
    FRAME_LAYOUT,
    PHASE3_OWNER_SEAT_BY_FACTION,
    PLAYER_PRESENTATIONS,
    PRELOAD_ERROR_MESSAGE,
    AssetLoadError,
    AssetManifestError,
    load,
    recolorPixels,
    resolveAssetUrl,
    rgbToHsl,
    validateManifest
  });
});
