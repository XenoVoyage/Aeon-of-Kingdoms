/* global window */
"use strict";

(function exposePhase3Renderer() {
  const MOVEMENT_FRAME_COUNT = 4;
  const VALID_FACING = Object.freeze(new Set(["right", "left"]));
  const VALID_ORDERS = Object.freeze(new Set(["IDLE", "MOVE"]));
  const VALID_FEEDBACK = Object.freeze(new Set(["accepted", "unreachable", "stopped", "rejected"]));
  const VALID_OWNER_SYMBOLS = Object.freeze(new Set([
    "diamond",
    "cross",
    "triangle",
    "circle",
    "bars",
    "chevron"
  ]));

  function compareAscii(first, second) {
    if (first === second) return 0;
    return first < second ? -1 : 1;
  }

  function colorFor(presentation) {
    const rgb = presentation && presentation.rgb;
    if (
      !Array.isArray(rgb)
      || rgb.length !== 3
      || rgb.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)
    ) {
      throw new TypeError("Owner presentation requires one valid RGB triplet.");
    }
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  function drawOwnerSymbol(context, symbol, x, y, size) {
    context.beginPath();
    if (symbol === "diamond") {
      context.moveTo(x, y - size);
      context.lineTo(x + size, y);
      context.lineTo(x, y + size);
      context.lineTo(x - size, y);
      context.closePath();
    } else if (symbol === "cross") {
      context.moveTo(x - size, y - size);
      context.lineTo(x + size, y + size);
      context.moveTo(x + size, y - size);
      context.lineTo(x - size, y + size);
    } else if (symbol === "triangle") {
      context.moveTo(x, y - size);
      context.lineTo(x + size, y + size);
      context.lineTo(x - size, y + size);
      context.closePath();
    } else if (symbol === "bars") {
      context.moveTo(x - size, y - size);
      context.lineTo(x - size, y + size);
      context.moveTo(x, y - size);
      context.lineTo(x, y + size);
      context.moveTo(x + size, y - size);
      context.lineTo(x + size, y + size);
    } else if (symbol === "chevron") {
      context.moveTo(x - size, y - size / 2);
      context.lineTo(x, y + size / 2);
      context.lineTo(x + size, y - size / 2);
    } else {
      context.arc(x, y, size, 0, Math.PI * 2);
    }
    context.stroke();
  }

  function createDynamicRenderer(options) {
    if (!options || !options.camera || !options.configuration || !options.assets) {
      throw new TypeError("Phase 3 dynamic rendering requires camera, configuration, and loaded assets.");
    }
    const { camera, configuration, assets } = options;
    if (typeof camera.worldToScreen !== "function" || typeof camera.snapshot !== "function") {
      throw new TypeError("Phase 3 dynamic rendering requires the approved Phase 2 camera API.");
    }
    if (!Number.isInteger(configuration.positionScale) || configuration.positionScale <= 0) {
      throw new TypeError("Phase 3 dynamic rendering requires a positive integer positionScale.");
    }
    if (!Number.isInteger(configuration.pendingCommandCap) || configuration.pendingCommandCap <= 0) {
      throw new TypeError("Phase 3 dynamic rendering requires a positive pendingCommandCap.");
    }
    if (!Number.isInteger(assets.cellSize) || assets.cellSize <= 0) {
      throw new TypeError("Loaded Phase 3 assets require one positive cellSize.");
    }
    if (
      !assets.renderCell
      || assets.renderCell.width !== 160
      || assets.renderCell.height !== 160
      || assets.renderCell.rootX !== 80
      || assets.renderCell.rootY !== 147.5
    ) {
      throw new TypeError("Loaded Phase 3 assets must preserve the locked 160×160 render cell and (80,147.5) root.");
    }
    if (!assets.entities || !assets.ownerPresentations) {
      throw new TypeError("Loaded Phase 3 assets require entity sheets and owner presentations.");
    }

    let reducedMotion = Boolean(options.reducedMotion);

    function presentationFor(entity) {
      const presentation = assets.ownerPresentations[entity.ownerSeat];
      if (!presentation || !VALID_OWNER_SYMBOLS.has(presentation.symbol)) {
        throw new TypeError(`Entity ${entity.id} has no valid color-plus-symbol owner presentation.`);
      }
      colorFor(presentation);
      return presentation;
    }

    function assetFor(entity) {
      const entityAsset = assets.entities[entity.kind];
      if (!entityAsset || !entityAsset.baseImage) {
        throw new TypeError(`Entity ${entity.id} has no loaded base atlas for ${entity.kind}.`);
      }
      if (!entityAsset.ownerSheets || !entityAsset.ownerSheets[entity.ownerSeat]) {
        throw new TypeError(`Entity ${entity.id} has no pre-tinted owner sheet for seat ${entity.ownerSeat}.`);
      }
      return entityAsset;
    }

    function validateEntity(entity) {
      if (!entity || typeof entity.id !== "string" || !/^[\x21-\x7e]+$/.test(entity.id)) {
        throw new TypeError("Every rendered entity requires one stable printable ASCII id.");
      }
      if (!Number.isInteger(entity.x) || !Number.isInteger(entity.y) || !Number.isInteger(entity.radius)) {
        throw new TypeError(`Entity ${entity.id} requires integer fixed-point position and radius.`);
      }
      if (entity.radius <= 0 || !VALID_FACING.has(entity.facing) || !VALID_ORDERS.has(entity.order)) {
        throw new TypeError(`Entity ${entity.id} has invalid radius, facing, or order state.`);
      }
      assetFor(entity);
      presentationFor(entity);
    }

    function frameFor(entity, movementFrames) {
      if (reducedMotion || entity.order !== "MOVE") return 0;
      const requested = movementFrames ? movementFrames.get(entity.id) : 0;
      if (!Number.isInteger(requested)) return 0;
      return ((requested % MOVEMENT_FRAME_COUNT) + MOVEMENT_FRAME_COUNT) % MOVEMENT_FRAME_COUNT;
    }

    function screenRoot(entity) {
      return camera.worldToScreen(
        entity.x / configuration.positionScale,
        entity.y / configuration.positionScale
      );
    }

    function drawSelectionRing(context, entity, root, presentation, cameraScale) {
      const radius = Math.max(8, (entity.radius / configuration.positionScale) * cameraScale);
      context.save();
      context.beginPath();
      context.ellipse(root.x, root.y - 2, radius * 1.25, Math.max(4, radius * 0.48), 0, 0, Math.PI * 2);
      context.strokeStyle = colorFor(presentation);
      context.lineWidth = 2.5;
      context.setLineDash([]);
      context.stroke();
      context.restore();
    }

    function drawSprite(context, entity, root, entityAsset, frameIndex, cameraScale) {
      const sourceX = frameIndex * assets.cellSize;
      const destinationX = -assets.renderCell.rootX * cameraScale;
      const destinationY = -assets.renderCell.rootY * cameraScale;
      const destinationWidth = assets.renderCell.width * cameraScale;
      const destinationHeight = assets.renderCell.height * cameraScale;
      const ownerSheet = entityAsset.ownerSheets[entity.ownerSeat];

      context.save();
      context.translate(root.x, root.y);
      if (entity.facing === "left") context.scale(-1, 1);
      // The loader prepares one complete owner-colored sheet with the approved
      // HSL/coverage mix and original base alpha. Drawing the diagnostic base
      // underneath would double-composite translucent edges and create halos.
      context.drawImage(
        ownerSheet,
        sourceX,
        0,
        assets.cellSize,
        assets.cellSize,
        destinationX,
        destinationY,
        destinationWidth,
        destinationHeight
      );
      context.restore();
    }

    function drawOwnershipCue(context, root, presentation, cameraScale) {
      const size = Math.max(4, Math.min(7, 5 * cameraScale));
      const badgeY = root.y - assets.renderCell.rootY * cameraScale + Math.max(9, 10 * cameraScale);
      context.save();
      context.beginPath();
      context.arc(root.x, badgeY, size + 4, 0, Math.PI * 2);
      context.fillStyle = "rgba(5, 9, 18, 0.76)";
      context.fill();
      context.strokeStyle = colorFor(presentation);
      context.lineWidth = 1.75;
      context.setLineDash([]);
      drawOwnerSymbol(context, presentation.symbol, root.x, badgeY, size);
      context.restore();
    }

    function drawDestinationFeedback(context, feedback, cameraScale) {
      if (!feedback || !Number.isInteger(feedback.x) || !Number.isInteger(feedback.y)) {
        throw new TypeError("Destination feedback requires integer fixed-point x and y.");
      }
      if (!VALID_FEEDBACK.has(feedback.status)) {
        throw new TypeError("Destination feedback has an unsupported status.");
      }
      const worldX = feedback.x / configuration.positionScale;
      const worldY = feedback.y / configuration.positionScale;
      const point = camera.worldToScreen(worldX, worldY);
      const size = Math.max(9, Math.min(18, 11 * cameraScale));
      const failed = feedback.status !== "accepted";
      const color = feedback.status === "accepted"
        ? "rgba(110, 231, 242, 0.94)"
        : "rgba(255, 190, 122, 0.96)";

      context.save();
      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = 2;
      context.setLineDash(failed ? [4, 4] : []);
      context.beginPath();
      context.arc(point.x, point.y, size, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.beginPath();
      if (failed) {
        context.moveTo(point.x - size * 0.5, point.y - size * 0.5);
        context.lineTo(point.x + size * 0.5, point.y + size * 0.5);
        context.moveTo(point.x + size * 0.5, point.y - size * 0.5);
        context.lineTo(point.x - size * 0.5, point.y + size * 0.5);
      } else {
        context.moveTo(point.x, point.y - size * 0.6);
        context.lineTo(point.x + size * 0.6, point.y);
        context.lineTo(point.x, point.y + size * 0.6);
        context.lineTo(point.x - size * 0.6, point.y);
        context.closePath();
      }
      context.stroke();
      context.font = "650 10px ui-sans-serif, system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "top";
      const label = String(feedback.label || feedback.status).slice(0, 32).toUpperCase();
      context.fillText(label, point.x, point.y + size + 4);
      context.restore();
    }

    function draw(context, renderState) {
      if (
        !context
        || typeof context.drawImage !== "function"
        || typeof context.save !== "function"
        || typeof context.restore !== "function"
        || typeof context.translate !== "function"
        || typeof context.scale !== "function"
      ) {
        throw new TypeError("Phase 3 dynamic rendering requires one prepared Canvas 2D context.");
      }
      if (!renderState || !Array.isArray(renderState.entities)) {
        throw new TypeError("Phase 3 dynamic rendering requires an entity render-state array.");
      }
      const selectedEntityIds = renderState.selectedEntityIds || new Set();
      const movementFrames = renderState.movementFrames || null;
      const destinationFeedback = renderState.destinationFeedback || [];
      if (!(selectedEntityIds instanceof Set)) {
        throw new TypeError("selectedEntityIds must be a Set of entity ids.");
      }
      if (movementFrames !== null && !(movementFrames instanceof Map)) {
        throw new TypeError("movementFrames must be a Map keyed by entity id.");
      }
      if (!Array.isArray(destinationFeedback)) {
        throw new TypeError("destinationFeedback must be an array.");
      }

      const cameraScale = camera.snapshot().scale;
      if (!Number.isFinite(cameraScale) || cameraScale <= 0) {
        throw new TypeError("Camera snapshot requires one positive finite scale.");
      }
      const orderedEntities = renderState.entities.slice().sort((first, second) => (
        first.y - second.y || compareAscii(first.id, second.id)
      ));
      for (const entity of orderedEntities) validateEntity(entity);
      const feedbackCount = Math.min(destinationFeedback.length, configuration.pendingCommandCap);
      for (let index = 0; index < feedbackCount; index += 1) {
        drawDestinationFeedback(context, destinationFeedback[index], cameraScale);
      }

      for (const entity of orderedEntities) {
        const root = screenRoot(entity);
        const entityAsset = assetFor(entity);
        const presentation = presentationFor(entity);
        if (selectedEntityIds.has(entity.id)) {
          drawSelectionRing(context, entity, root, presentation, cameraScale);
        }
        drawSprite(context, entity, root, entityAsset, frameFor(entity, movementFrames), cameraScale);
        drawOwnershipCue(context, root, presentation, cameraScale);
      }
    }

    function setReducedMotion(nextReducedMotion) {
      reducedMotion = Boolean(nextReducedMotion);
      return reducedMotion;
    }

    return Object.freeze({ draw, setReducedMotion });
  }

  const api = Object.freeze({ createDynamicRenderer });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.AeonPhase3Renderer = api;
}());
