/* global window */
"use strict";

(function exposePhase5Renderer() {
  const MOVEMENT_FRAME_COUNT = 4;
  const ACTION_FRAME_OFFSET = 4;
  const DEFEAT_FRAME_OFFSET = 10;
  const VALID_ORDERS = new Set(["IDLE", "MOVE", "ATTACK_ENTITY", "ATTACK_MOVE", "DEFEND", "STOP"]);
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

  function structureVisualState(structure) {
    if (!structure || !Number.isSafeInteger(structure.health) || !Number.isSafeInteger(structure.maxHealth)
      || structure.health < 0 || structure.maxHealth <= 0 || structure.health > structure.maxHealth) {
      throw new TypeError("Structure visual state requires bounded current and maximum health");
    }
    if (Boolean(structure.destroyed) !== (structure.health === 0)) {
      throw new TypeError("Structure destroyed state must agree with zero health");
    }
    if (structure.health === 0) return "destroyed";
    return structure.health * 2 <= structure.maxHealth ? "damaged" : "intact";
  }

  function entityFrameIndex(entity, tick, movementFrame, reducedMotion) {
    if (Number.isInteger(entity.defeatAgeTicks)) {
      return DEFEAT_FRAME_OFFSET + (reducedMotion ? 2 : Math.min(5, Math.floor(entity.defeatAgeTicks / 2)));
    }
    const cycle = entity.attackCycleTicks;
    if (Number.isSafeInteger(entity.attackStartTick) && Number.isInteger(cycle) && cycle > 0) {
      const elapsed = tick - entity.attackStartTick;
      if (elapsed >= 0 && elapsed < cycle) {
        return ACTION_FRAME_OFFSET + (reducedMotion ? 2 : Math.min(5, Math.floor(elapsed * 6 / cycle)));
      }
    }
    if (reducedMotion || !entity.moving) return 0;
    return ((movementFrame % MOVEMENT_FRAME_COUNT) + MOVEMENT_FRAME_COUNT) % MOVEMENT_FRAME_COUNT;
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
      throw new TypeError("Phase 5 dynamic rendering requires camera, configuration, and both local asset bundles");
    }
    const { camera, configuration, entityAssets, structureAssets, representatives = {} } = options;
    if (typeof camera.worldToScreen !== "function" || typeof camera.snapshot !== "function") {
      throw new TypeError("Phase 5 dynamic rendering requires the approved camera API");
    }
    if (!Number.isInteger(configuration.positionScale) || configuration.positionScale <= 0) {
      throw new TypeError("Phase 5 rendering requires a positive fixed-point scale");
    }
    if (entityAssets.renderCell?.width !== 160 || entityAssets.renderCell?.height !== 160
      || entityAssets.renderCell?.rootX !== 80 || entityAssets.renderCell?.rootY !== 147.5) {
      throw new TypeError("Phase 5 requires the approved Phase 3 entity render cell");
    }
    if (!structureAssets.structures || !structureAssets.ownerPresentations) {
      throw new TypeError("Phase 5 requires the validated structure asset bundle");
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
      if (!Number.isInteger(entity.defeatAgeTicks) && !VALID_ORDERS.has(entity.order)) throw new TypeError("Phase 5 combat order is invalid");
      if (!Number.isSafeInteger(entity.health) || !Number.isSafeInteger(entity.maxHealth)
        || entity.health < 0 || entity.maxHealth <= 0 || entity.health > entity.maxHealth) {
        throw new TypeError("Phase 5 combat health is invalid");
      }
      presentationForSeat(entity.ownerSeat);
    }

    function validateStructure(structure) {
      if (!structure || typeof structure.id !== "string" || !Number.isInteger(structure.x)
        || !Number.isInteger(structure.y) || !Number.isInteger(structure.radius)) {
        throw new TypeError("Rendered structures require stable identifiers and fixed-point geometry");
      }
      const asset = structureAssets.structures[assetIdForStructure(structure)];
      const state = structureVisualState(structure);
      const stateAsset = asset?.states?.[state];
      if (!asset?.presentation || !stateAsset?.neutralImage) throw new TypeError(`Structure ${structure.id} has no ${state} runtime art`);
      if (state !== "destroyed" && structure.ownerSeat !== null && !stateAsset.ownerSheets?.[structure.ownerSeat]) {
        throw new TypeError(`Structure ${structure.id} has no owner-colored sheet for seat ${structure.ownerSeat}`);
      }
      if (structure.ownerSeat !== null) presentationForSeat(structure.ownerSeat);
      return Object.freeze({ asset, state, stateAsset });
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

    function drawHealth(context, root, current, maximum, width, yOffset, label) {
      const fraction = maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;
      context.save();
      context.fillStyle = "rgba(3, 6, 13, 0.9)";
      context.strokeStyle = "rgba(244, 247, 255, 0.82)";
      context.lineWidth = 1;
      context.fillRect(root.x - width / 2, root.y + yOffset, width, 8);
      context.fillStyle = current === 0 ? "rgba(255, 183, 123, 0.95)" : "rgba(104, 224, 192, 0.95)";
      context.fillRect(root.x - width / 2 + 1, root.y + yOffset + 1, Math.max(0, (width - 2) * fraction), 6);
      context.strokeRect(root.x - width / 2, root.y + yOffset, width, 8);
      context.fillStyle = "rgba(250, 251, 255, 0.98)";
      context.font = "700 9px ui-sans-serif, system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillText(`${label} ${current}/${maximum}`, root.x, root.y + yOffset - 2);
      context.restore();
    }

    function drawTargetCue(context, root, radius, label) {
      const size = Math.max(12, radius * 1.25);
      context.save();
      context.strokeStyle = "rgba(255, 188, 119, 0.98)";
      context.fillStyle = "rgba(255, 222, 179, 0.98)";
      context.lineWidth = 2;
      context.setLineDash([3, 3]);
      context.beginPath();
      context.arc(root.x, root.y - 4, size, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.beginPath();
      context.moveTo(root.x - 5, root.y - 9);
      context.lineTo(root.x + 5, root.y + 1);
      context.moveTo(root.x + 5, root.y - 9);
      context.lineTo(root.x - 5, root.y + 1);
      context.stroke();
      context.font = "800 9px ui-sans-serif, system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(label, root.x, root.y + size + 10);
      context.restore();
    }

    function drawCombat(context, entity, selected, movementFrames, scale, renderState) {
      const representative = representatives[entity.kind] || {};
      const presentationEntity = {
        ...entity,
        attackCycleTicks: entity.attackCycleTicks ?? representative.attackCycleTicks ?? representative.cycleTicks ?? 0,
        moving: movementFrames?.has(entity.id) || false
      };
      validateCombat(presentationEntity);
      const root = worldRoot(entity);
      const asset = entityAssets.entities[entity.kind];
      const presentation = presentationForSeat(entity.ownerSeat);
      const radius = Math.max(8, entity.radius / configuration.positionScale * scale);
      if (selected) drawEllipse(context, root, radius, colorFor(presentation), true);
      const requested = movementFrames?.get(entity.id) || 0;
      const frame = entityFrameIndex(presentationEntity, renderState.tick || 0, requested, reducedMotion);
      const sourceX = (frame % 4) * entityAssets.cellSize;
      const sourceY = Math.floor(frame / 4) * entityAssets.cellSize;
      context.save();
      context.translate(root.x, root.y);
      if (entity.facing === "left") context.scale(-1, 1);
      context.drawImage(
        asset.ownerSheets[entity.ownerSeat],
        sourceX,
        sourceY,
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
      if (!Number.isInteger(entity.defeatAgeTicks)) {
        drawHealth(
          context,
          root,
          entity.health,
          entity.maxHealth,
          Math.max(38, radius * 2.3),
          -Math.max(45, entityAssets.renderCell.rootY * scale + 8),
          "HP"
        );
      }
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

    function drawStructure(context, structure, selected, scale, renderState) {
      const { asset, state, stateAsset } = validateStructure(structure);
      const root = worldRoot(structure);
      drawCapture(context, structure, root, scale);
      const neutralColor = "rgba(242, 212, 134, 0.92)";
      const owner = state === "destroyed" || structure.ownerSeat === null
        ? null
        : presentationForSeat(structure.ownerSeat);
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
      const sheet = owner ? stateAsset.ownerSheets[structure.ownerSeat] : stateAsset.neutralImage;
      context.save();
      context.drawImage(
        sheet,
        root.x - rootX * scale,
        root.y - rootY * scale,
        drawWidth * scale,
        drawHeight * scale
      );
      context.restore();

      const healthOffset = presentation.anchorOffsetsFromGroundWorld.health;
      drawHealth(
        context,
        { x: root.x + healthOffset[0] * scale, y: root.y + healthOffset[1] * scale },
        structure.health,
        structure.maxHealth,
        Math.max(52, 82 * scale),
        0,
        state === "destroyed" ? "DESTROYED · HP" : state === "damaged" ? "DAMAGED · HP" : "HP"
      );

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
      if (state === "destroyed") {
        context.strokeStyle = "rgba(255, 190, 122, 0.95)";
        context.beginPath();
        context.moveTo(cueX - 5, cueY - 5);
        context.lineTo(cueX + 5, cueY + 5);
        context.moveTo(cueX + 5, cueY - 5);
        context.lineTo(cueX - 5, cueY + 5);
        context.stroke();
      }
      context.restore();

      if (state !== "intact") {
        context.save();
        context.fillStyle = "rgba(5, 9, 18, 0.9)";
        context.strokeStyle = "rgba(255, 190, 122, 0.98)";
        context.lineWidth = 1.5;
        context.font = "800 10px ui-sans-serif, system-ui, sans-serif";
        context.textAlign = "center";
        const label = state === "destroyed" ? "DESTROYED" : "DAMAGED";
        context.fillRect(root.x - 34, root.y + 7, 68, 20);
        context.strokeRect(root.x - 34, root.y + 7, 68, 20);
        context.fillStyle = "rgba(255, 226, 184, 0.98)";
        context.fillText(label, root.x, root.y + 20);
        context.restore();
      }

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

    function drawProjectiles(context, projectiles, tick) {
      const cap = configuration.projectileCap;
      for (const projectile of projectiles.slice(0, cap)) {
        if (!Number.isInteger(projectile.launchX) || !Number.isInteger(projectile.launchY)
          || !Number.isInteger(projectile.launchTargetX) || !Number.isInteger(projectile.launchTargetY)
          || !Number.isSafeInteger(projectile.launchTick) || !Number.isSafeInteger(projectile.arrivalTick)
          || tick >= projectile.arrivalTick) continue;
        const start = camera.worldToScreen(
          projectile.launchX / configuration.positionScale,
          projectile.launchY / configuration.positionScale
        );
        const end = camera.worldToScreen(
          projectile.launchTargetX / configuration.positionScale,
          projectile.launchTargetY / configuration.positionScale
        );
        const duration = Math.max(1, projectile.arrivalTick - projectile.launchTick);
        const progress = Math.max(0, Math.min(1, (tick - projectile.launchTick) / duration));
        const x = start.x + (end.x - start.x) * progress;
        const y = start.y + (end.y - start.y) * progress;
        context.save();
        context.strokeStyle = "rgba(152, 229, 255, 0.72)";
        context.fillStyle = "rgba(236, 250, 255, 0.98)";
        context.lineWidth = 1.5;
        if (!reducedMotion) {
          context.beginPath();
          context.moveTo(start.x + (x - start.x) * Math.max(0, progress - 0.18), start.y + (y - start.y) * Math.max(0, progress - 0.18));
          context.lineTo(x, y);
          context.stroke();
        }
        context.beginPath();
        context.arc(x, y, 4, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
      }
    }

    function drawEffects(context, effects) {
      const cap = configuration.presentationalEffectCap;
      for (const effect of effects.slice(-cap)) {
        if (!Number.isInteger(effect.x) || !Number.isInteger(effect.y)) continue;
        const point = camera.worldToScreen(effect.x / configuration.positionScale, effect.y / configuration.positionScale);
        const label = ({ attack: "ATTACK", impact: "HIT", miss: "MISS", defeat: "DEFEATED", limit: "PROJECTILE LIMIT" })[effect.kind] || "CONTACT";
        context.save();
        context.strokeStyle = effect.kind === "miss" || effect.kind === "limit"
          ? "rgba(255, 201, 137, 0.98)"
          : "rgba(151, 234, 244, 0.98)";
        context.fillStyle = context.strokeStyle;
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(point.x - 5, point.y - 5);
        context.lineTo(point.x + 5, point.y + 5);
        context.moveTo(point.x + 5, point.y - 5);
        context.lineTo(point.x - 5, point.y + 5);
        context.stroke();
        context.font = "800 9px ui-sans-serif, system-ui, sans-serif";
        context.textAlign = "center";
        context.fillText(label, point.x, point.y - 9);
        context.restore();
      }
    }

    function draw(context, renderState) {
      if (!context || typeof context.drawImage !== "function" || !renderState) {
        throw new TypeError("Phase 5 dynamic rendering requires a Canvas context and render state");
      }
      const entities = renderState.entities || [];
      const defeatShells = renderState.defeatShells || [];
      const structures = renderState.structures || [];
      const selectedEntityIds = renderState.selectedEntityIds || new Set();
      const selectedStructureId = renderState.selectedStructureId || null;
      const movementFrames = renderState.movementFrames || new Map();
      const feedback = renderState.destinationFeedback || [];
      const focusTargetIds = new Set(entities.map((entity) => entity.targetId).filter(Boolean));
      const preparedState = { ...renderState, focusTargetIds };
      if (!(selectedEntityIds instanceof Set) || !(movementFrames instanceof Map)
        || !Array.isArray(defeatShells) || !Array.isArray(renderState.projectiles || [])
        || !Array.isArray(renderState.effects || [])) {
        throw new TypeError("Phase 5 selection and animation state require Set and Map containers");
      }
      const scale = camera.snapshot().scale;
      if (!Number.isFinite(scale) || scale <= 0) throw new TypeError("Camera scale is invalid");
      drawRallies(context, structures, selectedStructureId, scale);
      for (const marker of feedback.slice(0, configuration.pendingCommandCap)) drawFeedback(context, marker, scale);
      const targets = new Map([...entities, ...structures].map((value) => [value.id, value]));
      drawProjectiles(context, renderState.projectiles || [], renderState.tick || 0);
      for (const entry of buildDrawOrder([...entities, ...defeatShells], structures)) {
        if (entry.type === "combat") {
          drawCombat(context, entry.value, selectedEntityIds.has(entry.value.id), movementFrames, scale, preparedState);
        } else {
          drawStructure(context, entry.value, entry.value.id === selectedStructureId, scale, preparedState);
        }
      }
      for (const [targetId, target] of targets) {
        if (targetId !== preparedState.hoveredTargetId && !focusTargetIds.has(targetId)) continue;
        const radius = Math.max(10, target.radius / configuration.positionScale * scale);
        drawTargetCue(
          context,
          worldRoot(target),
          radius,
          targetId === preparedState.hoveredTargetId ? "HOSTILE ⊗" : "TARGET ⊗"
        );
      }
      drawEffects(context, renderState.effects || []);
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
    drawOwnerSymbol,
    entityFrameIndex,
    structureVisualState
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.AeonPhase5Renderer = api;
}());
