"use strict";

(function exposePhase4Assets(root, factory) {
  const commonJS = typeof module === "object" && module.exports;
  const manifest = commonJS
    ? require("./assets/structures/manifest.js")
    : root?.AeonPhase4StructureAssetManifest;
  const entityAssets = commonJS
    ? require("../phase3/assets.js")
    : root?.AeonPhase3Assets;
  const api = factory(manifest, entityAssets, root);
  if (commonJS) module.exports = api;
  if (root) root.AeonPhase4Assets = api;
})(typeof globalThis === "object" ? globalThis : this, function createPhase4Assets(defaultManifest, entityAssets, root) {
  const STRUCTURE_IDS = Object.freeze([
    "astral-headquarters",
    "gravebound-headquarters",
    "resource-point",
    "production-outpost"
  ]);
  const PLAYER_PRESENTATIONS = Object.freeze([
    Object.freeze({ id: 1, name: "Azure", rgb: Object.freeze([47, 169, 255]), symbol: "diamond" }),
    Object.freeze({ id: 2, name: "Violet", rgb: Object.freeze([165, 92, 255]), symbol: "cross" }),
    Object.freeze({ id: 3, name: "Coral", rgb: Object.freeze([229, 83, 74]), symbol: "triangle" }),
    Object.freeze({ id: 4, name: "Emerald", rgb: Object.freeze([38, 190, 124]), symbol: "circle" }),
    Object.freeze({ id: 5, name: "Amber", rgb: Object.freeze([236, 169, 47]), symbol: "bars" }),
    Object.freeze({ id: 6, name: "Magenta", rgb: Object.freeze([222, 78, 174]), symbol: "chevron" })
  ]);
  const OWNER_SEAT_BY_FACTION = Object.freeze({
    "astral-concord": 1,
    "gravebound-court": 2
  });
  const DEFAULT_CAPTURABLE_OWNER_SEATS = Object.freeze([1, 2]);
  const STRUCTURE_PROFILE = Object.freeze({
    "astral-headquarters": Object.freeze({
      category: "headquarters",
      architecture: "astral-concord",
      faction: "astral-concord",
      ownerPolicy: "fixed-faction",
      dimensions: Object.freeze([384, 355]),
      sourceDimensions: Object.freeze([1024, 947]),
      sourceAnchorIds: Object.freeze(["astral-headquarters-anchor"]),
      drawSizeWorld: Object.freeze([192, 177.5]),
      sourceGroundRoot: Object.freeze([192, 334]),
      destinationGroundRoot: Object.freeze([96, 167]),
      anchorOffsets: Object.freeze({
        selection: Object.freeze([0, -18]),
        health: Object.freeze([0, -154]),
        owner: Object.freeze([70, -145]),
        effect: Object.freeze([0, -94])
      })
    }),
    "gravebound-headquarters": Object.freeze({
      category: "headquarters",
      architecture: "gravebound-court",
      faction: "gravebound-court",
      ownerPolicy: "fixed-faction",
      dimensions: Object.freeze([384, 350]),
      sourceDimensions: Object.freeze([1024, 933]),
      sourceAnchorIds: Object.freeze(["gravebound-headquarters-anchor"]),
      drawSizeWorld: Object.freeze([192, 175]),
      sourceGroundRoot: Object.freeze([192, 330]),
      destinationGroundRoot: Object.freeze([96, 165]),
      anchorOffsets: Object.freeze({
        selection: Object.freeze([0, -18]),
        health: Object.freeze([0, -151]),
        owner: Object.freeze([70, -141]),
        effect: Object.freeze([0, -90])
      })
    }),
    "resource-point": Object.freeze({
      category: "resource-point",
      architecture: "shared-neutral",
      faction: null,
      ownerPolicy: "capturable-shared",
      dimensions: Object.freeze([384, 384]),
      sourceDimensions: Object.freeze([1024, 1024]),
      sourceAnchorIds: Object.freeze(["central-resource-point-anchor"]),
      drawSizeWorld: Object.freeze([128, 128]),
      sourceGroundRoot: Object.freeze([192, 360]),
      destinationGroundRoot: Object.freeze([64, 120]),
      anchorOffsets: Object.freeze({
        selection: Object.freeze([0, -18]),
        health: Object.freeze([0, -108]),
        owner: Object.freeze([48, -97]),
        effect: Object.freeze([0, -56])
      })
    }),
    "production-outpost": Object.freeze({
      category: "production-outpost",
      architecture: "shared-neutral",
      faction: null,
      ownerPolicy: "capturable-shared",
      dimensions: Object.freeze([384, 304]),
      sourceDimensions: Object.freeze([1024, 810]),
      sourceAnchorIds: Object.freeze([
        "west-production-outpost-anchor",
        "east-production-outpost-anchor"
      ]),
      drawSizeWorld: Object.freeze([160, 126.66666666666667]),
      sourceGroundRoot: Object.freeze([192, 288]),
      destinationGroundRoot: Object.freeze([80, 120]),
      anchorOffsets: Object.freeze({
        selection: Object.freeze([0, -18]),
        health: Object.freeze([0, -108]),
        owner: Object.freeze([60, -94]),
        effect: Object.freeze([0, -62])
      })
    })
  });
  const PRELOAD_ERROR_MESSAGE = "Structure art could not be loaded. Battle start is blocked.";
  const SHA256_PATTERN = /^[a-f0-9]{64}$/;
  const SAFE_ASSET_PATH = /^assets\/structures\/([a-z0-9-]+)\/\1-384-(base|mask)\.webp$/;

  class StructureAssetManifestError extends Error {
    constructor(message) {
      super(message);
      this.name = "StructureAssetManifestError";
      this.code = "INVALID_STRUCTURE_ASSET_MANIFEST";
    }
  }

  class StructureAssetLoadError extends Error {
    constructor(cause) {
      super(PRELOAD_ERROR_MESSAGE, { cause });
      this.name = "StructureAssetLoadError";
      this.code = "STRUCTURE_ASSET_PRELOAD_FAILED";
      this.publicMessage = PRELOAD_ERROR_MESSAGE;
    }
  }

  function reject(condition, message) {
    if (!condition) throw new StructureAssetManifestError(message);
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function sameArray(actual, expected) {
    return Array.isArray(actual)
      && actual.length === expected.length
      && actual.every((value, index) => Object.is(value, expected[index]));
  }

  function validateSourceFile(file, expectedPath, expectedDimensions, label) {
    reject(isRecord(file), `${label} source record is missing`);
    reject(file.path === expectedPath, `${label} source path`);
    reject(Number.isSafeInteger(file.bytes) && file.bytes > 0, `${label} source byte count`);
    reject(typeof file.sha256 === "string" && SHA256_PATTERN.test(file.sha256), `${label} source SHA-256`);
    reject(sameArray(file.dimensions, expectedDimensions), `${label} source dimensions`);
  }

  function validateRuntimeFile(file, structureId, kind, dimensions) {
    reject(isRecord(file), `${structureId} ${kind} file record is missing`);
    const match = typeof file.path === "string" ? file.path.match(SAFE_ASSET_PATH) : null;
    reject(Boolean(match), `${structureId} ${kind} path must be a local relative WebP`);
    reject(match[1] === structureId && match[2] === kind, `${structureId} ${kind} path identity`);
    reject(Number.isSafeInteger(file.bytes) && file.bytes > 0, `${structureId} ${kind} byte count`);
    reject(typeof file.sha256 === "string" && SHA256_PATTERN.test(file.sha256), `${structureId} ${kind} SHA-256`);
    reject(sameArray(file.dimensions, dimensions), `${structureId} ${kind} dimensions`);
    reject(isRecord(file.alpha), `${structureId} ${kind} alpha evidence`);
    reject(Number.isSafeInteger(file.alpha.visiblePixels) && file.alpha.visiblePixels > 0, `${structureId} ${kind} visible alpha`);
    reject(Number.isSafeInteger(file.alpha.strongPixels) && file.alpha.strongPixels > 0, `${structureId} ${kind} strong alpha`);
    reject(file.alpha.strongPixels <= file.alpha.visiblePixels, `${structureId} ${kind} alpha ordering`);
  }

  function validatePresentation(presentation, profile, structureId) {
    reject(isRecord(presentation), `${structureId} presentation is missing`);
    reject(sameArray(presentation.drawSizeWorld, profile.drawSizeWorld), `${structureId} draw size`);
    reject(sameArray(presentation.sourceGroundRoot, profile.sourceGroundRoot), `${structureId} source ground root`);
    reject(sameArray(presentation.destinationGroundRoot, profile.destinationGroundRoot), `${structureId} destination ground root`);
    reject(isRecord(presentation.anchorOffsetsFromGroundWorld), `${structureId} presentation anchors`);
    reject(
      sameArray(Object.keys(presentation.anchorOffsetsFromGroundWorld), ["selection", "health", "owner", "effect"]),
      `${structureId} presentation anchor names`
    );
    for (const key of ["selection", "health", "owner", "effect"]) {
      reject(
        sameArray(presentation.anchorOffsetsFromGroundWorld[key], profile.anchorOffsets[key]),
        `${structureId} ${key} anchor`
      );
    }
  }

  function validateAudit(audit, label) {
    reject(isRecord(audit), `${label} audit is missing`);
    for (const key of ["borderAlphaPixels", "maskEscapePixels", "losslessRoundTripDifferences", "transparentRgbPixels"]) {
      reject(audit[key] === 0, `${label} ${key} must be zero`);
    }
    for (const key of ["clampedMaskPixels", "transparentRgbClearedPixels"]) {
      reject(Number.isSafeInteger(audit[key]) && audit[key] >= 0, `${label} ${key}`);
    }
  }

  function validateManifest(manifest = defaultManifest) {
    reject(isRecord(manifest), "structure asset manifest is missing");
    reject(manifest.schema === 1, "structure asset manifest schema");
    reject(manifest.phase === "4" && manifest.kind === "structure-runtime-assets", "structure asset manifest identity");
    reject(manifest.format === "lossless-webp", "structure asset manifest format");
    reject(isRecord(manifest.source), "structure source provenance is missing");
    reject(manifest.source.maximumEdge === 384, "structure maximum edge");
    reject(manifest.source.package?.path === "concepts/feasibility/phase1a/manifest.json", "structure package source path");
    reject(manifest.source.package?.bytes === 3720, "structure package source bytes");
    reject(manifest.source.package?.sha256 === "03b9a3d0b9cbae6dd7d0bbf5ad8032af65d2fc7d9ff1a550950db1ccdf180d49", "structure package source SHA-256");
    reject(manifest.source.map?.path === "phase2/map.js", "structure map source path");
    reject(manifest.source.map?.id === "moonfall-crossing-two-player" && manifest.source.map?.schemaVersion === 1, "structure map source identity");
    reject(Number.isSafeInteger(manifest.source.map?.bytes) && manifest.source.map.bytes > 0, "structure map source bytes");
    reject(typeof manifest.source.map?.sha256 === "string" && SHA256_PATTERN.test(manifest.source.map.sha256), "structure map source SHA-256");
    reject(isRecord(manifest.toolchain), "structure toolchain is missing");
    reject(manifest.toolchain.exporter === "tools/export-phase4-structures.js", "structure exporter path");
    reject(typeof manifest.toolchain.exporterSha256 === "string" && SHA256_PATTERN.test(manifest.toolchain.exporterSha256), "structure exporter SHA-256");
    reject(typeof manifest.toolchain.imageMagick === "string" && manifest.toolchain.imageMagick.length > 0, "structure ImageMagick record");
    reject(typeof manifest.toolchain.libwebp === "string" && manifest.toolchain.libwebp.length > 0, "structure libwebp record");

    reject(Array.isArray(manifest.players) && manifest.players.length === PLAYER_PRESENTATIONS.length, "six player presentations are required");
    for (let index = 0; index < PLAYER_PRESENTATIONS.length; index += 1) {
      const actual = manifest.players[index];
      const expected = PLAYER_PRESENTATIONS[index];
      reject(actual?.id === expected.id && actual.name === expected.name && actual.symbol === expected.symbol, `player ${expected.id} presentation`);
      reject(sameArray(actual.rgb, expected.rgb), `player ${expected.id} color`);
    }

    reject(isRecord(manifest.limits), "structure limits are missing");
    reject(manifest.limits.structureCategories === 3, "structure category count");
    reject(manifest.limits.runtimeStructures === STRUCTURE_IDS.length, "runtime structure-art count");
    reject(manifest.limits.capturableOwnerSeatCap === 2, "capturable owner-seat cap");
    reject(manifest.limits.encodedCeiling === 634642, "structure encoded ceiling");
    reject(isRecord(manifest.encodingCorrection), "structure exact-RGBA correction is missing");
    reject(manifest.encodingCorrection.obsoleteNonExactBytes === 630706, "structure obsolete non-exact byte record");
    reject(manifest.encodingCorrection.exactRgbaBytes === 634642, "structure exact-RGBA byte record");
    reject(manifest.encodingCorrection.deltaBytes === 3936, "structure exact-RGBA byte delta");
    reject(
      typeof manifest.encodingCorrection.reason === "string" && /non-exact/i.test(manifest.encodingCorrection.reason) && /alpha=0/i.test(manifest.encodingCorrection.reason),
      "structure exact-RGBA correction reason"
    );
    reject(isRecord(manifest.damageEvidence), "structure damage evidence is missing");
    reject(manifest.damageEvidence.runtimeAsset === false && manifest.damageEvidence.alpha === false, "damage proof must remain non-runtime RGB evidence");
    reject(manifest.damageEvidence.path === "concepts/feasibility/phase1a/structures/production-outpost-damage.webp", "damage proof path");
    reject(sameArray(manifest.damageEvidence.runtimeStates, ["intact"]), "only intact runtime structure art exists");
    reject(typeof manifest.damageEvidence.reason === "string" && /not aligned|must not/i.test(manifest.damageEvidence.reason), "damage proof exclusion reason");

    reject(Array.isArray(manifest.structures) && manifest.structures.length === STRUCTURE_IDS.length, "four runtime structure-art records are required");
    let encodedBytes = 0;
    let decodedSourceBytes = 0;
    let preparedOwnerSheetsTwoPlayer = 0;
    let retainedDecodedBytesTwoPlayer = 0;
    const sourceAnchors = new Set();
    for (let index = 0; index < STRUCTURE_IDS.length; index += 1) {
      const structure = manifest.structures[index];
      const structureId = STRUCTURE_IDS[index];
      const profile = STRUCTURE_PROFILE[structureId];
      reject(structure?.id === structureId, `structure order ${index}`);
      reject(structure.category === profile.category, `${structureId} category`);
      reject(structure.architecture === profile.architecture, `${structureId} architecture`);
      reject(structure.faction === profile.faction, `${structureId} faction`);
      reject(structure.ownerPolicy === profile.ownerPolicy, `${structureId} owner policy`);
      reject(sameArray(structure.sourceAnchorIds, profile.sourceAnchorIds), `${structureId} source anchor ids`);
      for (const anchorId of structure.sourceAnchorIds) {
        reject(typeof anchorId === "string" && /^[a-z0-9-]+$/.test(anchorId) && !sourceAnchors.has(anchorId), `${structureId} source anchor identity`);
        sourceAnchors.add(anchorId);
      }
      validateSourceFile(
        structure.source?.base,
        `concepts/feasibility/phase1a/structures/${structureId}.png`,
        profile.sourceDimensions,
        `${structureId} base`
      );
      validateSourceFile(
        structure.source?.mask,
        `concepts/feasibility/phase1a/structures/${structureId}-player-mask.png`,
        profile.sourceDimensions,
        `${structureId} mask`
      );
      validatePresentation(structure.presentation, profile, structureId);
      reject(isRecord(structure.files), `${structureId} runtime files are missing`);
      validateRuntimeFile(structure.files.base, structureId, "base", profile.dimensions);
      validateRuntimeFile(structure.files.mask, structureId, "mask", profile.dimensions);
      reject(structure.files.pairBytes === structure.files.base.bytes + structure.files.mask.bytes, `${structureId} pair bytes`);
      const decodedBytes = profile.dimensions[0] * profile.dimensions[1] * 4 * 2;
      reject(structure.files.decodedBytes === decodedBytes, `${structureId} decoded bytes`);
      validateAudit(structure.files.audit, structureId);
      const ownerSheetCount = profile.ownerPolicy === "fixed-faction" ? 1 : 2;
      encodedBytes += structure.files.pairBytes;
      decodedSourceBytes += decodedBytes;
      preparedOwnerSheetsTwoPlayer += ownerSheetCount;
      retainedDecodedBytesTwoPlayer += profile.dimensions[0] * profile.dimensions[1] * 4 * (1 + ownerSheetCount);
    }

    reject(isRecord(manifest.totals), "structure totals are missing");
    reject(manifest.totals.files === STRUCTURE_IDS.length * 2, "structure file total");
    reject(manifest.totals.encodedBytes === encodedBytes, "structure encoded total");
    reject(manifest.totals.encodedCeiling === manifest.limits.encodedCeiling, "structure encoded ceiling mirror");
    reject(encodedBytes <= manifest.totals.encodedCeiling, "structure encoded budget");
    reject(manifest.totals.decodedSourceBytes === decodedSourceBytes && decodedSourceBytes === 4279296, "structure decoded source total");
    reject(manifest.totals.preparedOwnerSheetsTwoPlayer === preparedOwnerSheetsTwoPlayer && preparedOwnerSheetsTwoPlayer === 6, "prepared owner sheet total");
    reject(manifest.totals.retainedDecodedBytesTwoPlayer === retainedDecodedBytesTwoPlayer && retainedDecodedBytesTwoPlayer === 5336064, "retained decoded total");
    validateAudit(manifest.totals.audit, "aggregate structure");
    return manifest;
  }

  function resolveAssetUrl(relativePath, baseUrl) {
    if (typeof relativePath !== "string" || !SAFE_ASSET_PATH.test(relativePath)) {
      throw new StructureAssetManifestError("asset path is not a same-origin relative structure path");
    }
    const base = new URL(baseUrl);
    const resolved = new URL(relativePath, base);
    if (resolved.protocol !== base.protocol || resolved.host !== base.host || resolved.username || resolved.password) {
      throw new StructureAssetManifestError("asset path changed origin");
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
      image.onerror = () => rejectLoad(new Error("Local structure image decode failed"));
      image.src = url.href;
    });
  }

  function readPixels(image, width, height, canvasFactory) {
    const canvas = canvasFactory(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D context is unavailable");
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, width, height).data;
    return { canvas, pixels };
  }

  function validateDecodedPixels(basePixels, maskPixels, width, height) {
    for (let offset = 3; offset < basePixels.length; offset += 4) {
      if (maskPixels[offset] > basePixels[offset]) throw new Error("Decoded structure player-color mask escapes base alpha");
    }
    const alpha = (pixels, x, y) => pixels[(y * width + x) * 4 + 3];
    for (const pixels of [basePixels, maskPixels]) {
      for (let x = 0; x < width; x += 1) {
        if (alpha(pixels, x, 0) !== 0 || alpha(pixels, x, height - 1) !== 0) {
          throw new Error("Decoded structure has non-transparent horizontal border alpha");
        }
      }
      for (let y = 1; y < height - 1; y += 1) {
        if (alpha(pixels, 0, y) !== 0 || alpha(pixels, width - 1, y) !== 0) {
          throw new Error("Decoded structure has non-transparent vertical border alpha");
        }
      }
    }
  }

  function recolorPixels(basePixels, maskPixels, targetRgb) {
    if (!entityAssets || typeof entityAssets.recolorPixels !== "function") {
      throw new Error("The approved Phase 3 player-color transform is unavailable");
    }
    return entityAssets.recolorPixels(basePixels, maskPixels, targetRgb);
  }

  function createOwnerSheet(basePixels, maskPixels, presentation, width, height, canvasFactory) {
    const canvas = canvasFactory(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    const imageData = context.createImageData(width, height);
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
    if (!isRecord(ownerSeatByFaction)) throw new TypeError("ownerSeatByFaction must map both Phase 4 factions");
    const expectedFactions = Object.keys(OWNER_SEAT_BY_FACTION).sort();
    if (!sameArray(Object.keys(ownerSeatByFaction).sort(), expectedFactions)) {
      throw new RangeError("ownerSeatByFaction must contain exactly both Phase 4 factions");
    }
    const normalized = {};
    for (const faction of expectedFactions) {
      if (ownerSeatByFaction[faction] !== OWNER_SEAT_BY_FACTION[faction]) {
        throw new RangeError(`ownerSeatByFaction must preserve the fixed Phase 4 seat for ${faction}`);
      }
      normalized[faction] = ownerSeatByFaction[faction];
    }
    return Object.freeze(normalized);
  }

  function normalizeCapturableOwnerSeats(ownerSeats, manifest) {
    if (!Array.isArray(ownerSeats) || ownerSeats.length < 1 || ownerSeats.length > manifest.limits.capturableOwnerSeatCap) {
      throw new RangeError("capturableOwnerSeats must contain one or two player seats");
    }
    const normalized = [...ownerSeats];
    for (let index = 0; index < normalized.length; index += 1) {
      const seat = normalized[index];
      if (!Number.isInteger(seat) || !manifest.players.some(({ id }) => id === seat)) {
        throw new RangeError("capturableOwnerSeats contains an unknown player seat");
      }
      if (index > 0 && normalized[index - 1] >= seat) {
        throw new RangeError("capturableOwnerSeats must be unique and sorted");
      }
    }
    return Object.freeze(normalized);
  }

  async function load(options = {}) {
    const retainedImages = [];
    const retainedCanvases = [];
    try {
      const manifest = validateManifest(options.manifest ?? defaultManifest);
      if (!entityAssets || typeof entityAssets.recolorPixels !== "function") {
        throw new Error("The approved Phase 3 player-color transform is unavailable");
      }
      const ownerSeatByFaction = normalizeOwnerSeatByFaction(options.ownerSeatByFaction ?? OWNER_SEAT_BY_FACTION);
      const capturableOwnerSeats = normalizeCapturableOwnerSeats(
        options.capturableOwnerSeats ?? DEFAULT_CAPTURABLE_OWNER_SEATS,
        manifest
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
      const structures = {};
      let retainedDecodedBytes = 0;
      for (const structure of manifest.structures) {
        const [width, height] = structure.files.base.dimensions;
        const [baseImage, maskImage] = await Promise.all([
          loadImage(resolveAssetUrl(structure.files.base.path, baseUrl), imageFactory, retainedImages),
          loadImage(resolveAssetUrl(structure.files.mask.path, baseUrl), imageFactory, retainedImages)
        ]);
        if (baseImage.naturalWidth !== width || baseImage.naturalHeight !== height
          || maskImage.naturalWidth !== width || maskImage.naturalHeight !== height) {
          throw new Error("Decoded structure dimensions do not match the manifest");
        }
        const base = readPixels(baseImage, width, height, canvasFactory);
        const mask = readPixels(maskImage, width, height, canvasFactory);
        validateDecodedPixels(base.pixels, mask.pixels, width, height);
        const ownerSeats = structure.ownerPolicy === "fixed-faction"
          ? [ownerSeatByFaction[structure.faction]]
          : capturableOwnerSeats;
        const ownerSheets = {};
        for (const ownerSeat of ownerSeats) {
          const canvas = createOwnerSheet(
            base.pixels,
            mask.pixels,
            ownerPresentations[ownerSeat],
            width,
            height,
            canvasFactory
          );
          retainedCanvases.push(canvas);
          ownerSheets[ownerSeat] = canvas;
        }
        clearCanvas(base.canvas);
        clearCanvas(mask.canvas);
        releaseImage(maskImage);
        retainedImages.splice(retainedImages.indexOf(maskImage), 1);
        retainedDecodedBytes += width * height * 4 * (1 + ownerSeats.length);
        structures[structure.id] = Object.freeze({
          id: structure.id,
          category: structure.category,
          architecture: structure.architecture,
          faction: structure.faction,
          ownerPolicy: structure.ownerPolicy,
          sourceAnchorIds: Object.freeze([...structure.sourceAnchorIds]),
          neutralImage: baseImage,
          ownerSheets: Object.freeze(ownerSheets),
          presentation: structure.presentation
        });
      }
      if (retainedDecodedBytes > manifest.totals.retainedDecodedBytesTwoPlayer) {
        throw new Error("Prepared structure sheets exceed the bounded Phase 4 decoded ceiling");
      }
      const bundle = {
        structures: Object.freeze(structures),
        ownerPresentations,
        ownerSeatByFaction,
        capturableOwnerSeats,
        retainedDecodedBytes,
        damageRuntimeAvailable: false,
        dispose() {
          for (const structure of Object.values(structures)) {
            releaseImage(structure.neutralImage);
            for (const canvas of Object.values(structure.ownerSheets)) clearCanvas(canvas);
          }
        }
      };
      return Object.freeze(bundle);
    } catch (cause) {
      for (const image of retainedImages) releaseImage(image);
      for (const canvas of retainedCanvases) clearCanvas(canvas);
      const failure = cause instanceof StructureAssetLoadError ? cause : new StructureAssetLoadError(cause);
      if (typeof options.onError === "function") options.onError(failure.publicMessage);
      throw failure;
    }
  }

  return Object.freeze({
    DEFAULT_CAPTURABLE_OWNER_SEATS,
    OWNER_SEAT_BY_FACTION,
    PLAYER_PRESENTATIONS,
    PRELOAD_ERROR_MESSAGE,
    STRUCTURE_IDS,
    StructureAssetLoadError,
    StructureAssetManifestError,
    load,
    recolorPixels,
    resolveAssetUrl,
    validateManifest
  });
});
