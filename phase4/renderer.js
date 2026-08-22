/* global window */
"use strict";

(function exposePhase4Renderer() {
  const MOVEMENT_FRAME_COUNT = 4;
  const OWNER_SYMBOLS = new Set(["diamond", "cross", "triangle", "circle", "bars", "chevron"]);
  const FEEDBACK_STATES = new Set(["accepted", "unreachable", "stopped", "rejected"]);

  function compareIdentifiers(first, second) {
    return first < second ? -1 : first > second ? 1 : 0;
  }

  function colorFor(presentation) {
    const rgb = presentation?.rgb;
    if (!Array.isArray(rgb) || rgb.length !== 3
      || rgb.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
      throw new TypeError("Owner presentation requires one valid RGB triplet");
    }
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  function drawOwnerSymbol(context, symbol, x, y, size) {
    if (!OWNER_SYMBOLS.has(symbol)) throw new TypeError("Owner presentation requires one approved symbol");
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

  function buildDrawOrder(entities, structures) {
    if (!Array.isArray(entities) || !Array.isArray(structures)) {
      throw new TypeError("Dynamic draw order requires combat and structure arrays");
    }
    return [
      ...structures.map((value) => ({ type: "structure", value })),
      ...entities.map((value) => ({ type: "combat", value }))
    ].sort((first, second) => (
      first.value.y - second.value.y
      || compareIdentifiers(first.value.id, second.value.id)
      || compareIdentifiers(first.type, second.type)
    ));
  }

  function assetIdForStructure(structure) {
    if (structure.category === "headquarters") {
      return structure.faction === "astral-concord" ? "astral-headquarters" : "gravebound-headquarters";
    }
    return structure.category;
  }

  function captureIsContested(structure, entities) {
    if (!structure || structure.destroyed || !Number.isInteger(structure.x)
      || !Number.isInteger(structure.y) || !Number.isInteger(structure.captureRadius)
      || structure.captureRadius <= 0 || !Array.isArray(entities)) return false;
    let presentSeat = null;
    const radiusSquared = structure.captureRadius * structure.captureRadius;
    for (const entity of entities) {
      if (!entity || !Number.isInteger(entity.x) || !Number.isInteger(entity.y)
        || !Number.isInteger(entity.ownerSeat)) continue;
      const deltaX = entity.x - structure.x;
      const deltaY = entity.y - structure.y;
      if (deltaX * deltaX + deltaY * deltaY > radiusSquared) continue;
      if (presentSeat === null) presentSeat = entity.ownerSeat;
      else if (presentSeat !== entity.ownerSeat) return true;
    }
    return false;
  }

  function createDynamicRenderer(options) {
    if (!options?.camera || !options.configuration || !options.entityAssets || !options.structureAssets) {
      throw new TypeError("Phase 4 dynamic rendering requires camera, configuration, and both local asset bundles");
    }
    const { camera, configuration, entityAssets, structureAssets } = options;
    if (typeof camera.worldToScreen !== "function" || typeof camera.snapshot !== "function") {
      throw new TypeError("Phase 4 dynamic rendering requires the approved camera API");
    }
    if (!Number.isInteger(configuration.positionScale) || configuration.positionScale <= 0) {
      throw new TypeError("Phase 4 rendering requires a positive fixed-point scale");
    }
    if (entityAssets.renderCell?.width !== 160 || entityAssets.renderCell?.height !== 160
      || entityAssets.renderCell?.rootX !== 80 || entityAssets.renderCell?.rootY !== 147.5) {
      throw new TypeError("Phase 4 requires the approved Phase 3 entity render cell");
    }
    if (!structureAssets.structures || !structureAssets.ownerPresentations) {
      throw new TypeError("Phase 4 requires the validated structure asset bundle");
    }

    let reducedMotion = Boolean(options.reducedMotion);

    function presentationForSeat(seat) {
      const presentation = entityAssets.ownerPresentations?.[seat] || structureAssets.ownerPresentations?.[seat];
      if (!presentation || !OWNER_SYMBOLS.has(presentation.symbol)) {
        throw new TypeError(`Seat ${seat} has no color-plus-symbol presentation`);
      }
      colorFor(presentation);
      return presentation;
    }

    function worldRoot(value) {
      return camera.worldToScreen(
        value.x / configuration.positionScale,
        value.y / configuration.positionScale
      );
    }

    function validateCombat(entity) {
      if (!entity || typeof entity.id !== "string" || !Number.isInteger(entity.x)
        || !Number.isInteger(entity.y) || !Number.isInteger(entity.radius)) {
        throw new TypeError("Rendered combat entities require stable identifiers and fixed-point geometry");
      }
      if (!entityAssets.entities?.[entity.kind]?.ownerSheets?.[entity.ownerSeat]) {
        throw new TypeError(`Combat entity ${entity.id} has no owner-colored atlas`);
      }
      if (entity.facing !== "left" && entity.facing !== "right") throw new TypeError("Combat facing is invalid");
      if (entity.order !== "IDLE" && entity.order !== "MOVE") throw new TypeError("Phase 4 combat order is invalid");
      presentationForSeat(entity.ownerSeat);
    }

    function validateStructure(structure) {
      if (!structure || typeof structure.id !== "string" || !Number.isInteger(structure.x)
        || !Number.isInteger(structure.y) || !Number.isInteger(structure.radius)) {
        throw new TypeError("Rendered structures require stable identifiers and fixed-point geometry");
      }
      const asset = structureAssets.structures[assetIdForStructure(structure)];
      if (!asset?.presentation || !asset.neutralImage) throw new TypeError(`Structure ${structure.id} has no runtime art`);
      if (structure.ownerSeat !== null && !asset.ownerSheets?.[structure.ownerSeat]) {
        throw new TypeError(`Structure ${structure.id} has no owner-colored sheet for seat ${structure.ownerSeat}`);
      }
      if (structure.ownerSeat !== null) presentationForSeat(structure.ownerSeat);
      return asset;
    }

    function drawEllipse(context, root, radius, color, selected) {
      context.save();
      context.beginPath();
      context.ellipse(root.x, root.y - 2, radius * 1.24, Math.max(4, radius * 0.46), 0, 0, Math.PI * 2);
      context.strokeStyle = color;
      context.lineWidth = selected ? 2.75 : 1.4;
      context.setLineDash(selected ? [] : [4, 4]);
      context.stroke();
      context.restore();
    }

    function drawCombat(context, entity, selected, movementFrames, scale) {
      validateCombat(entity);
      const root = worldRoot(entity);
      const asset = entityAssets.entities[entity.kind];
      const presentation = presentationForSeat(entity.ownerSeat);
      const radius = Math.max(8, entity.radius / configuration.positionScale * scale);
      if (selected) drawEllipse(context, root, radius, colorFor(presentation), true);
      const requested = movementFrames?.get(entity.id) || 0;
      const frame = reducedMotion || entity.order !== "MOVE"
        ? 0
        : ((requested % MOVEMENT_FRAME_COUNT) + MOVEMENT_FRAME_COUNT) % MOVEMENT_FRAME_COUNT;
      context.save();
      context.translate(root.x, root.y);
      if (entity.facing === "left") context.scale(-1, 1);
      context.drawImage(
        asset.ownerSheets[entity.ownerSeat],
        frame * entityAssets.cellSize,
        0,
        entityAssets.cellSize,
        entityAssets.cellSize,
        -entityAssets.renderCell.rootX * scale,
        -entityAssets.renderCell.rootY * scale,
        entityAssets.renderCell.width * scale,
        entityAssets.renderCell.height * scale
      );
      context.restore();
      const badgeY = root.y - entityAssets.renderCell.rootY * scale + Math.max(9, 10 * scale);
      context.save();
      context.strokeStyle = colorFor(presentation);
      context.lineWidth = 1.75;
      context.fillStyle = "rgba(5, 9, 18, 0.78)";
      context.beginPath();
      context.arc(root.x, badgeY, 9, 0, Math.PI * 2);
      context.fill();
      drawOwnerSymbol(context, presentation.symbol, root.x, badgeY, 5);
      context.restore();
    }

  function drawCapture(context, structure, root, scale) {
      if (structure.destroyed || !Number.isInteger(structure.captureRadius) || structure.captureRadius <= 0) return;
      const radius = structure.captureRadius / configuration.positionScale * scale;
      const contender = structure.captureSeat === null ? null : presentationForSeat(structure.captureSeat);
      const color = contender ? colorFor(contender) : "rgba(242, 212, 134, 0.76)";
      context.save();
      context.strokeStyle = color;
      context.lineWidth = 1.5;
      context.setLineDash(structure.contested ? [3, 5] : [8, 5]);
      context.beginPath();
      context.arc(root.x, root.y, radius, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      if (structure.captureProgress > 0) {
        const fraction = Math.min(1, structure.captureProgress / configuration.captureRequiredTicks);
        context.lineWidth = 3;
        context.beginPath();
        context.arc(root.x, root.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction);
        context.stroke();
      }
      context.restore();
    }

    function drawStructure(context, structure, selected, scale) {
      const asset = validateStructure(structure);
      const root = worldRoot(structure);
      drawCapture(context, structure, root, scale);
      const neutralColor = "rgba(242, 212, 134, 0.92)";
      const owner = structure.ownerSeat === null ? null : presentationForSeat(structure.ownerSeat);
      if (selected) {
        drawEllipse(
          context,
          root,
          Math.max(13, structure.radius / configuration.positionScale * scale),
          owner ? colorFor(owner) : neutralColor,
          true
        );
      }
      const presentation = asset.presentation;
      const [drawWidth, drawHeight] = presentation.drawSizeWorld;
      const [rootX, rootY] = presentation.destinationGroundRoot;
      const sheet = structure.ownerSeat === null ? asset.neutralImage : asset.ownerSheets[structure.ownerSeat];
      context.save();
      if (structure.destroyed) context.globalAlpha = 0.48;
      context.drawImage(
        sheet,
        root.x - rootX * scale,
        root.y - rootY * scale,
        drawWidth * scale,
        drawHeight * scale
      );
      context.restore();

      const ownerOffset = presentation.anchorOffsetsFromGroundWorld.owner;
      const cueX = root.x + ownerOffset[0] * scale;
      const cueY = root.y + ownerOffset[1] * scale;
      context.save();
      context.fillStyle = "rgba(5, 9, 18, 0.82)";
      context.beginPath();
      context.arc(cueX, cueY, 10, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = owner ? colorFor(owner) : neutralColor;
      context.lineWidth = 2;
      if (owner) drawOwnerSymbol(context, owner.symbol, cueX, cueY, 5);
      else {
        context.beginPath();
        context.arc(cueX, cueY, 4.5, 0, Math.PI * 2);
        context.stroke();
      }
      if (structure.destroyed) {
        context.strokeStyle = "rgba(255, 190, 122, 0.95)";
        context.beginPath();
        context.moveTo(cueX - 5, cueY - 5);
        context.lineTo(cueX + 5, cueY + 5);
        context.moveTo(cueX + 5, cueY - 5);
        context.lineTo(cueX - 5, cueY + 5);
        context.stroke();
      }
      context.restore();

      if (Array.isArray(structure.queue) && structure.queue[0]?.blockedComplete) {
        context.save();
        context.fillStyle = "rgba(5, 9, 18, 0.86)";
        context.strokeStyle = "rgba(255, 190, 122, 0.96)";
        context.lineWidth = 1.5;
        context.font = "700 10px ui-sans-serif, system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillRect(root.x - 34, root.y + 8, 68, 20);
        context.strokeRect(root.x - 34, root.y + 8, 68, 20);
        context.fillStyle = "rgba(255, 226, 184, 0.98)";
        context.fillText("SPAWN BLOCKED", root.x, root.y + 18);
        context.restore();
      }
    }

    function drawRallies(context, structures, selectedStructureId, scale) {
      for (const structure of structures) {
        if (!structure.rally || structure.destroyed || structure.ownerSeat === null) continue;
        const root = worldRoot(structure);
        const rally = camera.worldToScreen(
          structure.rally.x / configuration.positionScale,
          structure.rally.y / configuration.positionScale
        );
        const owner = presentationForSeat(structure.ownerSeat);
        const selected = structure.id === selectedStructureId;
        context.save();
        context.strokeStyle = colorFor(owner);
        context.fillStyle = colorFor(owner);
        context.globalAlpha = selected ? 0.94 : 0.58;
        context.lineWidth = selected ? 2 : 1.25;
        context.setLineDash([7, 7]);
        context.beginPath();
        context.moveTo(root.x, root.y);
        context.lineTo(rally.x, rally.y);
        context.stroke();
        context.setLineDash([]);
        const size = Math.max(7, Math.min(13, 9 * scale));
        context.beginPath();
        context.moveTo(rally.x, rally.y - size);
        context.lineTo(rally.x + size, rally.y);
        context.lineTo(rally.x, rally.y + size);
        context.lineTo(rally.x - size, rally.y);
        context.closePath();
        context.stroke();
        context.font = "700 9px ui-sans-serif, system-ui, sans-serif";
        context.textAlign = "center";
        context.fillText("RALLY", rally.x, rally.y + size + 11);
        context.restore();
      }
    }

    function drawFeedback(context, feedback, scale) {
      if (!feedback || !Number.isInteger(feedback.x) || !Number.isInteger(feedback.y)
        || !FEEDBACK_STATES.has(feedback.status)) return;
      const point = camera.worldToScreen(
        feedback.x / configuration.positionScale,
        feedback.y / configuration.positionScale
      );
      const size = Math.max(8, Math.min(16, 10 * scale));
      const accepted = feedback.status === "accepted";
      context.save();
      context.strokeStyle = accepted ? "rgba(110, 231, 242, 0.96)" : "rgba(255, 190, 122, 0.96)";
      context.fillStyle = context.strokeStyle;
      context.lineWidth = 2;
      context.setLineDash(accepted ? [] : [4, 4]);
      context.beginPath();
      context.arc(point.x, point.y, size, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.font = "700 9px ui-sans-serif, system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(String(feedback.label || feedback.status).slice(0, 32).toUpperCase(), point.x, point.y + size + 11);
      context.restore();
    }

    function draw(context, renderState) {
      if (!context || typeof context.drawImage !== "function" || !renderState) {
        throw new TypeError("Phase 4 dynamic rendering requires a Canvas context and render state");
      }
      const entities = renderState.entities || [];
      const structures = renderState.structures || [];
      const selectedEntityIds = renderState.selectedEntityIds || new Set();
      const selectedStructureId = renderState.selectedStructureId || null;
      const movementFrames = renderState.movementFrames || new Map();
      const feedback = renderState.destinationFeedback || [];
      if (!(selectedEntityIds instanceof Set) || !(movementFrames instanceof Map)) {
        throw new TypeError("Phase 4 selection and animation state require Set and Map containers");
      }
      const scale = camera.snapshot().scale;
      if (!Number.isFinite(scale) || scale <= 0) throw new TypeError("Camera scale is invalid");
      drawRallies(context, structures, selectedStructureId, scale);
      for (const marker of feedback.slice(0, configuration.pendingCommandCap)) drawFeedback(context, marker, scale);
      for (const entry of buildDrawOrder(entities, structures)) {
        if (entry.type === "combat") {
          drawCombat(context, entry.value, selectedEntityIds.has(entry.value.id), movementFrames, scale);
        } else {
          drawStructure(context, entry.value, entry.value.id === selectedStructureId, scale);
        }
      }
    }

    function setReducedMotion(value) {
      reducedMotion = Boolean(value);
      return reducedMotion;
    }

    return Object.freeze({ draw, setReducedMotion });
  }

  const api = Object.freeze({
    assetIdForStructure,
    buildDrawOrder,
    captureIsContested,
    createDynamicRenderer,
    drawOwnerSymbol
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.AeonPhase4Renderer = api;
}());
