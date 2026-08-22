"use strict";

(function exposePhase5Assets(root, factory) {
  const commonJS = typeof module === "object" && module.exports;
  const manifest = commonJS
    ? require("./assets/structures/manifest.js")
    : root?.AeonPhase5StructureAssetManifest;
  const intactManifest = commonJS
    ? require("../phase4/assets/structures/manifest.js")
    : root?.AeonPhase4StructureAssetManifest;
  const phase4Assets = commonJS
    ? require("../phase4/assets.js")
    : root?.AeonPhase4Assets;
  const api = factory(manifest, intactManifest, phase4Assets, root);
  if (commonJS) module.exports = api;
  if (root) root.AeonPhase5Assets = api;
})(typeof globalThis === "object" ? globalThis : this, function createPhase5Assets(
  defaultManifest,
  defaultIntactManifest,
  phase4Assets,
  root
) {
  const STRUCTURE_IDS = Object.freeze([
    "astral-headquarters",
    "gravebound-headquarters",
    "resource-point",
    "production-outpost"
  ]);
  const DIMENSIONS = Object.freeze({
    "astral-headquarters": Object.freeze([384, 355]),
    "gravebound-headquarters": Object.freeze([384, 350]),
    "resource-point": Object.freeze([384, 384]),
    "production-outpost": Object.freeze([384, 304])
  });
  const ENCODED_CEILING = 3 * 1024 * 1024;
  const DECODED_CEILING = 13 * 1024 * 1024;
  const EXPECTED_DECODED_SOURCE_BYTES = 6418944;
  const EXPECTED_RETAINED_DECODED_BYTES = 12811776;
  const PRELOAD_ERROR_MESSAGE = "Structure damage art could not be loaded. Battle start is blocked.";
  const SHA256_PATTERN = /^[a-f0-9]{64}$/;
  const SAFE_ASSET_PATH = /^assets\/structures\/([a-z0-9-]+)\/\1-384-(damaged-(base|mask)|destroyed-base)\.webp$/;

  class StructureDamageAssetManifestError extends Error {
    constructor(message) {
      super(message);
      this.name = "StructureDamageAssetManifestError";
      this.code = "INVALID_STRUCTURE_DAMAGE_ASSET_MANIFEST";
    }
  }

  class StructureDamageAssetLoadError extends Error {
    constructor(cause) {
      super(PRELOAD_ERROR_MESSAGE, { cause });
      this.name = "StructureDamageAssetLoadError";
      this.code = "STRUCTURE_DAMAGE_ASSET_PRELOAD_FAILED";
      this.publicMessage = PRELOAD_ERROR_MESSAGE;
    }
  }

  function reject(condition, message) {
    if (!condition) throw new StructureDamageAssetManifestError(message);
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function sameArray(actual, expected) {
    return Array.isArray(actual)
      && actual.length === expected.length
      && actual.every((value, index) => Object.is(value, expected[index]));
  }

  function sameJson(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  function validateSourceFile(file, expectedPath, dimensions, label) {
    reject(isRecord(file), `${label} source record is missing`);
    reject(file.path === expectedPath, `${label} source path`);
    reject(sameArray(file.dimensions, dimensions), `${label} source dimensions`);
    reject(Number.isSafeInteger(file.bytes) && file.bytes > 0, `${label} source byte count`);
    reject(typeof file.sha256 === "string" && SHA256_PATTERN.test(file.sha256), `${label} source SHA-256`);
  }

  function validateRuntimeFile(file, structureId, state, kind, dimensions) {
    reject(isRecord(file), `${structureId} ${state} ${kind} file record is missing`);
    const match = typeof file.path === "string" ? file.path.match(SAFE_ASSET_PATH) : null;
    reject(Boolean(match), `${structureId} ${state} ${kind} path must be a local relative WebP`);
    reject(match[1] === structureId && match[2] === `${state}-${kind}`, `${structureId} ${state} ${kind} path identity`);
    reject(Number.isSafeInteger(file.bytes) && file.bytes > 0, `${structureId} ${state} ${kind} byte count`);
    reject(typeof file.sha256 === "string" && SHA256_PATTERN.test(file.sha256), `${structureId} ${state} ${kind} SHA-256`);
    reject(sameArray(file.dimensions, dimensions), `${structureId} ${state} ${kind} dimensions`);
    reject(isRecord(file.alpha), `${structureId} ${state} ${kind} alpha audit`);
    reject(Number.isSafeInteger(file.alpha.visiblePixels) && file.alpha.visiblePixels > 0, `${structureId} ${state} ${kind} visible alpha`);
    reject(Number.isSafeInteger(file.alpha.strongPixels) && file.alpha.strongPixels > 0, `${structureId} ${state} ${kind} strong alpha`);
    reject(file.alpha.strongPixels <= file.alpha.visiblePixels, `${structureId} ${state} ${kind} alpha ordering`);
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

  function validateManifest(manifest = defaultManifest, intactManifest = defaultIntactManifest) {
    reject(isRecord(manifest), "structure damage asset manifest is missing");
    reject(manifest.schema === 1, "structure damage manifest schema");
    reject(manifest.phase === "5" && manifest.kind === "structure-damage-runtime-assets", "structure damage manifest identity");
    reject(manifest.format === "lossless-webp", "structure damage manifest format");
    reject(phase4Assets && typeof phase4Assets.validateManifest === "function", "approved intact structure validator is unavailable");
    phase4Assets.validateManifest(intactManifest);

    reject(isRecord(manifest.source), "structure damage source provenance is missing");
    reject(manifest.source.intactManifest?.path === "phase4/assets/structures/manifest.js", "intact manifest source path");
    reject(Number.isSafeInteger(manifest.source.intactManifest?.bytes) && manifest.source.intactManifest.bytes > 0, "intact manifest source bytes");
    reject(typeof manifest.source.intactManifest?.sha256 === "string" && SHA256_PATTERN.test(manifest.source.intactManifest.sha256), "intact manifest source SHA-256");
    reject(manifest.source.damageDirectory === "concepts/feasibility/phase1a/structures/phase5", "damage source directory");
    reject(manifest.source.maximumEdge === 384, "damage maximum edge");
    reject(isRecord(manifest.source.flattenedReview), "flattened review exclusion is missing");
    reject(manifest.source.flattenedReview.path === "concepts/feasibility/phase1a/structures/production-outpost-damage.webp", "flattened review path");
    reject(manifest.source.flattenedReview.runtimeAsset === false, "flattened review must not be runtime art");
    reject(typeof manifest.source.flattenedReview.reason === "string" && /never cropped|never.*promoted/i.test(manifest.source.flattenedReview.reason), "flattened review exclusion reason");
    reject(isRecord(manifest.toolchain), "structure damage toolchain is missing");
    reject(manifest.toolchain.exporter === "tools/export-phase5-structures.js", "structure damage exporter path");
    reject(typeof manifest.toolchain.exporterSha256 === "string" && SHA256_PATTERN.test(manifest.toolchain.exporterSha256), "structure damage exporter SHA-256");
    reject(typeof manifest.toolchain.imageMagick === "string" && manifest.toolchain.imageMagick.length > 0, "structure damage ImageMagick version");
    reject(typeof manifest.toolchain.libwebp === "string" && manifest.toolchain.libwebp.length > 0, "structure damage libwebp version");
    reject(/exact RGBA/i.test(manifest.toolchain.encode) && /round-trip verified/i.test(manifest.toolchain.encode), "structure damage exact RGBA method");
    reject(/intact ownership mask/i.test(manifest.toolchain.damagedMask) && /clamp/i.test(manifest.toolchain.damagedMask), "damaged mask derivation method");

    reject(isRecord(manifest.limits), "structure damage limits are missing");
    reject(manifest.limits.structureCategories === 3, "structure damage category count");
    reject(manifest.limits.structureForms === 4 && manifest.limits.damageStates === 2, "structure damage form/state count");
    reject(manifest.limits.generatedFiles === 12, "structure damage generated file count");
    reject(manifest.limits.capturableOwnerSeatCap === 2, "structure damage owner-seat cap");
    reject(manifest.limits.encodedCeiling === ENCODED_CEILING, "structure damage encoded ceiling");
    reject(manifest.limits.decodedSourceCeiling === DECODED_CEILING, "structure damage decoded source ceiling");
    reject(manifest.limits.retainedDecodedCeiling === DECODED_CEILING, "structure retained decoded ceiling");
    reject(Array.isArray(manifest.structures) && manifest.structures.length === STRUCTURE_IDS.length, "four structure damage records are required");

    let encodedBytes = 0;
    let decodedSourceBytes = 0;
    let retainedDecodedBytes = 0;
    let damagedSheets = 0;
    for (let index = 0; index < STRUCTURE_IDS.length; index += 1) {
      const id = STRUCTURE_IDS[index];
      const structure = manifest.structures[index];
      const intact = intactManifest.structures[index];
      const dimensions = DIMENSIONS[id];
      reject(structure?.id === id, `structure damage order ${index}`);
      for (const key of ["category", "architecture", "faction", "ownerPolicy"]) {
        reject(structure[key] === intact[key], `${id} ${key} must match intact form`);
      }
      reject(sameArray(structure.sourceAnchorIds, intact.sourceAnchorIds), `${id} source anchors must match intact form`);
      reject(sameJson(structure.presentation, intact.presentation), `${id} presentation must match intact form`);
      validateSourceFile(
        structure.source?.damaged,
        `concepts/feasibility/phase1a/structures/phase5/${id}-damaged.png`,
        intact.source.base.dimensions,
        `${id} damaged`
      );
      validateSourceFile(
        structure.source?.destroyed,
        `concepts/feasibility/phase1a/structures/phase5/${id}-destroyed.png`,
        intact.source.base.dimensions,
        `${id} destroyed`
      );
      reject(sameJson(structure.source?.intactMask, intact.source.mask), `${id} intact mask provenance`);
      reject(isRecord(structure.files), `${id} damage files are missing`);
      validateRuntimeFile(structure.files.damagedBase, id, "damaged", "base", dimensions);
      validateRuntimeFile(structure.files.damagedMask, id, "damaged", "mask", dimensions);
      validateRuntimeFile(structure.files.destroyedBase, id, "destroyed", "base", dimensions);
      const expectedEncoded = structure.files.damagedBase.bytes
        + structure.files.damagedMask.bytes
        + structure.files.destroyedBase.bytes;
      reject(structure.files.encodedBytes === expectedEncoded, `${id} encoded byte subtotal`);
      const expectedDecoded = dimensions[0] * dimensions[1] * 4 * 3;
      reject(structure.files.decodedBytes === expectedDecoded, `${id} decoded byte subtotal`);
      validateAudit(structure.files.audit, id);
      const ownerSheets = intact.ownerPolicy === "fixed-faction" ? 1 : 2;
      encodedBytes += expectedEncoded;
      decodedSourceBytes += expectedDecoded;
      damagedSheets += ownerSheets;
      retainedDecodedBytes += dimensions[0] * dimensions[1] * 4 * (3 + ownerSheets * 2);
    }

    reject(isRecord(manifest.totals), "structure damage totals are missing");
    reject(manifest.totals.files === 12, "structure damage total file count");
    reject(manifest.totals.encodedBytes === encodedBytes && encodedBytes <= ENCODED_CEILING, "structure damage encoded total");
    reject(manifest.totals.decodedSourceBytes === decodedSourceBytes
      && decodedSourceBytes === EXPECTED_DECODED_SOURCE_BYTES
      && decodedSourceBytes <= DECODED_CEILING, "structure damage decoded source total");
    reject(manifest.totals.stateBasesRetained === 12, "twelve retained state bases required");
    reject(manifest.totals.preparedOwnerSheetsTwoPlayer === 12, "twelve retained prepared owner sheets required");
    reject(manifest.totals.preparedDamagedOwnerSheetsTwoPlayer === damagedSheets && damagedSheets === 6, "six damaged owner sheets required");
    reject(manifest.totals.retainedDecodedBytesTwoPlayer === retainedDecodedBytes
      && retainedDecodedBytes === EXPECTED_RETAINED_DECODED_BYTES
      && retainedDecodedBytes <= DECODED_CEILING, "retained structure decoded total");
    validateAudit(manifest.totals.audit, "aggregate structure damage");
    return manifest;
  }

  function resolveAssetUrl(relativePath, baseUrl) {
    if (typeof relativePath !== "string" || !SAFE_ASSET_PATH.test(relativePath)) {
      throw new StructureDamageAssetManifestError("asset path is not a same-origin relative structure damage path");
    }
    const base = new URL(baseUrl);
    const resolved = new URL(relativePath, base);
    if (resolved.protocol !== base.protocol || resolved.host !== base.host || resolved.username || resolved.password) {
      throw new StructureDamageAssetManifestError("asset path changed origin");
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
      image.onerror = () => rejectLoad(new Error("Local structure damage image decode failed"));
      image.src = url.href;
    });
  }

  function readPixels(image, width, height, canvasFactory) {
    const canvas = canvasFactory(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D context is unavailable");
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    return { canvas, pixels: context.getImageData(0, 0, width, height).data };
  }

  function validateBorder(pixels, width, height) {
    const alpha = (x, y) => pixels[(y * width + x) * 4 + 3];
    for (let x = 0; x < width; x += 1) {
      if (alpha(x, 0) !== 0 || alpha(x, height - 1) !== 0) throw new Error("Decoded structure damage has non-transparent horizontal border alpha");
    }
    for (let y = 1; y < height - 1; y += 1) {
      if (alpha(0, y) !== 0 || alpha(width - 1, y) !== 0) throw new Error("Decoded structure damage has non-transparent vertical border alpha");
    }
  }

  function validateDecodedPixels(basePixels, maskPixels, destroyedPixels, width, height) {
    for (let offset = 3; offset < basePixels.length; offset += 4) {
      if (maskPixels[offset] > basePixels[offset]) throw new Error("Decoded damaged player-color mask escapes damaged base alpha");
    }
    validateBorder(basePixels, width, height);
    validateBorder(maskPixels, width, height);
    validateBorder(destroyedPixels, width, height);
  }

  function createOwnerSheet(basePixels, maskPixels, presentation, width, height, canvasFactory) {
    const canvas = canvasFactory(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    const imageData = context.createImageData(width, height);
    imageData.data.set(phase4Assets.recolorPixels(basePixels, maskPixels, presentation.rgb));
    context.putImageData(imageData, 0, 0);
    return canvas;
  }

  function releaseImage(image) {
    if (!image) return;
    image.onload = null;
    image.onerror = null;
    if (typeof image.removeAttribute === "function") image.removeAttribute("src");
  }

  function clearCanvas(canvas) {
    if (!canvas) return;
    canvas.width = 0;
    canvas.height = 0;
  }

  function stateForHealth(health, maximumHealth) {
    if (!Number.isSafeInteger(health) || !Number.isSafeInteger(maximumHealth)
      || maximumHealth <= 0 || health < 0 || health > maximumHealth) {
      throw new RangeError("structure health must be a bounded non-negative safe integer");
    }
    if (health === 0) return "destroyed";
    if (health <= Math.floor(maximumHealth / 2)) return "damaged";
    return "intact";
  }

  async function load(options = {}) {
    const retainedImages = [];
    const retainedCanvases = [];
    let intactBundle = null;
    try {
      const manifest = validateManifest(options.manifest ?? defaultManifest, options.intactManifest ?? defaultIntactManifest);
      const imageFactory = options.imageFactory ?? browserImageFactory;
      const canvasFactory = options.canvasFactory ?? browserCanvasFactory;
      const baseUrl = options.baseUrl ?? root?.document?.baseURI;
      if (!baseUrl) throw new Error("A document base URL is required");
      const capturableOwnerSeats = options.capturableOwnerSeats ?? [1, 2];
      if (!sameArray(capturableOwnerSeats, [1, 2])) {
        throw new RangeError("Phase 5 requires exactly the two frozen capturable owner seats");
      }
      const intactBaseUrl = new URL("../phase4/", baseUrl);
      intactBundle = await phase4Assets.load({
        manifest: options.intactManifest ?? defaultIntactManifest,
        ownerSeatByFaction: options.ownerSeatByFaction,
        capturableOwnerSeats,
        baseUrl: intactBaseUrl,
        imageFactory,
        canvasFactory
      });
      const structures = {};
      let retainedDecodedBytes = intactBundle.retainedDecodedBytes;
      for (const structure of manifest.structures) {
        const [width, height] = structure.files.damagedBase.dimensions;
        const [damagedImage, maskImage, destroyedImage] = await Promise.all([
          loadImage(resolveAssetUrl(structure.files.damagedBase.path, baseUrl), imageFactory, retainedImages),
          loadImage(resolveAssetUrl(structure.files.damagedMask.path, baseUrl), imageFactory, retainedImages),
          loadImage(resolveAssetUrl(structure.files.destroyedBase.path, baseUrl), imageFactory, retainedImages)
        ]);
        for (const image of [damagedImage, maskImage, destroyedImage]) {
          if (image.naturalWidth !== width || image.naturalHeight !== height) {
            throw new Error("Decoded structure damage dimensions do not match the manifest");
          }
        }
        const damaged = readPixels(damagedImage, width, height, canvasFactory);
        const mask = readPixels(maskImage, width, height, canvasFactory);
        const destroyed = readPixels(destroyedImage, width, height, canvasFactory);
        validateDecodedPixels(damaged.pixels, mask.pixels, destroyed.pixels, width, height);
        const intact = intactBundle.structures[structure.id];
        const ownerSheets = {};
        for (const ownerSeat of Object.keys(intact.ownerSheets).map(Number)) {
          const canvas = createOwnerSheet(
            damaged.pixels,
            mask.pixels,
            intactBundle.ownerPresentations[ownerSeat],
            width,
            height,
            canvasFactory
          );
          retainedCanvases.push(canvas);
          ownerSheets[ownerSeat] = canvas;
        }
        clearCanvas(damaged.canvas);
        clearCanvas(mask.canvas);
        clearCanvas(destroyed.canvas);
        releaseImage(maskImage);
        retainedImages.splice(retainedImages.indexOf(maskImage), 1);
        retainedDecodedBytes += width * height * 4 * (2 + Object.keys(ownerSheets).length);
        const states = Object.freeze({
          intact: Object.freeze({ neutralImage: intact.neutralImage, ownerSheets: intact.ownerSheets }),
          damaged: Object.freeze({ neutralImage: damagedImage, ownerSheets: Object.freeze(ownerSheets) }),
          destroyed: Object.freeze({ neutralImage: destroyedImage, ownerSheets: Object.freeze({}) })
        });
        structures[structure.id] = Object.freeze({
          id: intact.id,
          category: intact.category,
          architecture: intact.architecture,
          faction: intact.faction,
          ownerPolicy: intact.ownerPolicy,
          sourceAnchorIds: intact.sourceAnchorIds,
          neutralImage: intact.neutralImage,
          ownerSheets: intact.ownerSheets,
          states,
          presentation: intact.presentation
        });
      }
      if (retainedDecodedBytes !== manifest.totals.retainedDecodedBytesTwoPlayer
        || retainedDecodedBytes > manifest.limits.retainedDecodedCeiling) {
        throw new Error("Prepared structure state sheets exceed the bounded Phase 5 decoded ceiling");
      }
      const bundle = {
        structures: Object.freeze(structures),
        ownerPresentations: intactBundle.ownerPresentations,
        ownerSeatByFaction: intactBundle.ownerSeatByFaction,
        capturableOwnerSeats: intactBundle.capturableOwnerSeats,
        retainedDecodedBytes,
        damageRuntimeAvailable: true,
        stateForHealth,
        dispose() {
          for (const structure of Object.values(structures)) {
            releaseImage(structure.states.damaged.neutralImage);
            releaseImage(structure.states.destroyed.neutralImage);
            for (const canvas of Object.values(structure.states.damaged.ownerSheets)) clearCanvas(canvas);
          }
          intactBundle.dispose();
        }
      };
      return Object.freeze(bundle);
    } catch (cause) {
      for (const image of retainedImages) releaseImage(image);
      for (const canvas of retainedCanvases) clearCanvas(canvas);
      if (intactBundle) intactBundle.dispose();
      const failure = cause instanceof StructureDamageAssetLoadError
        ? cause
        : new StructureDamageAssetLoadError(cause);
      if (typeof options.onError === "function") options.onError(failure.publicMessage);
      throw failure;
    }
  }

  return Object.freeze({
    PRELOAD_ERROR_MESSAGE,
    STRUCTURE_IDS,
    StructureDamageAssetLoadError,
    StructureDamageAssetManifestError,
    load,
    resolveAssetUrl,
    stateForHealth,
    validateManifest
  });
});
