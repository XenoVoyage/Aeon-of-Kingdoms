/* global window, document, screen, Image, ResizeObserver */
"use strict";

(function startPhase7HardenedSkirmish() {
  const map = window.AeonPhase5Map;
  const cameraApi = window.AeonPhase2Camera;
  const baseRendererApi = window.AeonPhase2Renderer;
  const configApi = window.AeonPhase5Config;
  const skirmishApi = window.AeonPhase6Skirmish;
  const hardeningApi = window.AeonPhase7Hardening;
  const entityAssetsApi = window.AeonPhase3Assets;
  const structureAssetsApi = window.AeonPhase5Assets;
  const dynamicRendererApi = window.AeonPhase5Renderer;
  const inputApi = window.AeonPhase5Input;
  if (!map || !cameraApi || !baseRendererApi || !configApi || !skirmishApi || !hardeningApi
    || !entityAssetsApi || !structureAssetsApi || !dynamicRendererApi || !inputApi) return;

  const { configuration, representatives, productionRosters, compareIdentifiers } = configApi;
  const byId = (id) => document.getElementById(id);
  const shell = byId("app-shell");
  const menuScreen = byId("menu-screen");
  const menuArt = byId("menu-art");
  const menuFallback = byId("menu-fallback");
  const battlefieldScreen = byId("battlefield-screen");
  const playFrame = byId("play-frame");
  const orientationGate = byId("orientation-gate");
  const sizeGate = byId("size-gate");
  const loadError = byId("load-error");
  const loadErrorDetail = byId("load-error-detail");
  const debugStatus = byId("debug-status");
  const eventStatus = byId("event-status");
  const targetStatus = byId("target-status");
  const commandAvailability = byId("command-availability");
  const rallyAvailability = byId("rally-availability");
  const selectionClearAvailability = byId("selection-clear-availability");
  const browserFeatureStatus = byId("browser-feature-status");
  const resourceValue = byId("resource-value");
  const populationValue = byId("population-value");
  const objectiveValue = byId("objective-value");
  const selectionSummary = byId("selection-summary");
  const selectionDetail = byId("selection-detail");
  const selectionMarquee = byId("selection-marquee");
  const structureSelect = byId("structure-select");
  const producerTray = byId("producer-tray");
  const producerTitle = byId("producer-title");
  const producerQueueCount = byId("producer-queue-count");
  const productionOptions = byId("production-options");
  const productionState = byId("production-state");
  const productionProgress = byId("production-progress");
  const productionQueue = byId("production-queue");
  const beginButton = byId("begin-button");
  const settingsButton = byId("settings-button");
  const settingsDialog = byId("settings-dialog");
  const fullscreenOnBegin = byId("fullscreen-on-begin");
  const artTier = byId("art-tier");
  const menuFullscreenButton = byId("menu-fullscreen-button");
  const battlefieldFullscreenButton = byId("battlefield-fullscreen-button");
  const navigationButton = byId("navigation-button");
  const pauseButton = byId("pause-button");
  const resetCameraButton = byId("reset-camera-button");
  const zoomOutButton = byId("zoom-out-button");
  const zoomInButton = byId("zoom-in-button");
  const moveModeButton = byId("move-mode-button");
  const attackModeButton = byId("attack-mode-button");
  const attackMoveModeButton = byId("attack-move-mode-button");
  const defendPointModeButton = byId("defend-point-mode-button");
  const defendEntityModeButton = byId("defend-entity-mode-button");
  const stopButton = byId("stop-button");
  const rallyModeButton = byId("rally-mode-button");
  const clearRallyButton = byId("clear-rally-button");
  const clearSelectionButton = byId("clear-selection-button");
  const matchStatus = byId("match-status");
  const menuButton = byId("menu-button");
  const errorMenuButton = byId("error-menu-button");
  const canvases = Object.fromEntries(
    Array.from(playFrame.querySelectorAll("canvas[data-layer]"), (canvas) => [canvas.dataset.layer, canvas])
  );

  const home = map.layers.anchors.cameraStarts[0];
  const camera = cameraApi.createCamera(map.world.width, map.world.height, home);
  const query = new URLSearchParams(window.location.search);
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const suspension = hardeningApi.createSuspensionController({
    viewport: true,
    hidden: document.visibilityState !== "visible",
    blur: typeof document.hasFocus === "function" ? !document.hasFocus() : false
  });
  const browserFeatures = hardeningApi.createBrowserFeatureController({
    document,
    screen,
    onResult(result) {
      browserFeatureStatus.textContent = result.message;
      updateFullscreenUi();
    }
  });
  const selectedEntityIds = new Set();
  const movementFrames = new Map();
  const destinationFeedback = [];
  const defeatShells = [];
  const presentationalEffects = [];
  const pendingCommands = new Map();
  const mapStructures = new Map(map.phase5.structures.map((structure) => [structure.id, structure]));
  let selectedStructureId = null;
  let stage = "menu";
  let renderer = null;
  let dynamicRenderer = null;
  let input = null;
  let skirmish = null;
  let currentSnapshot = null;
  let entityAssets = null;
  let structureAssets = null;
  let groundImage = null;
  let playableViewport = false;
  let navigationVisible = query.get("debug") === "1";
  let destroyed = false;
  let resizeObserver = null;
  let animationFrame = 0;
  let reviewFrame = 0;
  let previousFrameTime = 0;
  let accumulatedTime = 0;
  let loadGeneration = 0;
  let lastChecksum = "pending";
  let notice = "";
  let lastAnnouncement = "";
  let queueSignature = "";
  let hoveredTargetId = null;
  let presentationTick = 0;
  let matchSignature = "active";
  let settingsInvoker = null;
  let lastGate = null;
  let browserReleasePromise = Promise.resolve(null);
  const browserFeatureRequests = new Set();
  let browserFeatureActionPending = false;
  let browserFeatureReleasePending = false;
  let completedRuntimeRetired = false;

  function setRect(element, rect) {
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
  }

  function normalizeRenderedRect(rect) {
    const left = Math.round(rect.left);
    const top = Math.round(rect.top);
    const right = Math.round(rect.left + rect.width);
    const bottom = Math.round(rect.top + rect.height);
    return Object.freeze({ left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) });
  }

  function containRect(rect, aspect) {
    if (rect.width / rect.height > aspect) {
      const width = rect.height * aspect;
      return Object.freeze({ left: rect.left + (rect.width - width) / 2, top: rect.top, width, height: rect.height });
    }
    const height = rect.width / aspect;
    return Object.freeze({ left: rect.left, top: rect.top + (rect.height - height) / 2, width: rect.width, height });
  }

  function effectivePaused() {
    return suspension.snapshot().effective;
  }

  function manualPaused() {
    return suspension.snapshot().active.manual;
  }

  function pauseReasonLabel() {
    const reasons = suspension.snapshot().reasons;
    if (reasons.includes("manual")) return "manually paused";
    if (reasons.includes("bfcache")) return "suspended for page restoration";
    if (reasons.includes("hidden")) return "paused while the page is hidden";
    if (reasons.includes("blur")) return "paused while the window is unfocused";
    if (reasons.includes("viewport")) return "paused by the landscape viewport gate";
    return "active";
  }

  function titleWords(value) {
    return String(value || "").split("-").filter(Boolean)
      .map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  }

  function publicStructureName(structure) {
    if (!structure) return "Unknown structure";
    if (structure.category === "headquarters") {
      const faction = structure.faction || mapStructures.get(structure.id)?.faction;
      return faction === "astral-concord" ? "Astral headquarters" : "Gravebound headquarters";
    }
    if (structure.category === "resource-point") return "Resource Point";
    return structure.id.startsWith("west-") ? "West Production Outpost" : "East Production Outpost";
  }

  function ownerLabel(ownerSeat) {
    if (ownerSeat === 1) return "You · Astral Concord · ◇ Azure";
    if (ownerSeat === 2) return "Computer · Gravebound Court · ✕ Violet";
    return "Neutral · ○";
  }

  function seatLabel(ownerSeat) {
    if (ownerSeat === 1) return "You";
    if (ownerSeat === 2) return "Computer";
    return "Neutral";
  }

  function playerOne() {
    return currentSnapshot?.players.find((player) => player.seat === 1) || null;
  }

  function selectedEntities() {
    if (!currentSnapshot) return [];
    return currentSnapshot.entities.filter((entity) => selectedEntityIds.has(entity.id));
  }

  function selectedStructure() {
    return currentSnapshot?.structures.find((structure) => structure.id === selectedStructureId) || null;
  }

  function producingStructure(structure) {
    return Boolean(structure && !structure.destroyed && structure.ownerSeat === 1
      && (structure.category === "headquarters" || structure.category === "production-outpost"));
  }

  function announce(message) {
    const bounded = String(message || "").slice(0, 180);
    notice = bounded;
    if (!bounded || bounded === lastAnnouncement) return;
    lastAnnouncement = bounded;
    eventStatus.textContent = bounded;
  }

  function updateDebugStatus() {
    if (!currentSnapshot) {
      debugStatus.textContent = notice || "Preparing local battlefield assets…";
      return;
    }
    const view = camera.snapshot();
    const pauseLabel = effectivePaused() ? " · Paused" : "";
    const noticeLabel = notice ? ` · ${notice}` : "";
    debugStatus.textContent = `Tick ${currentSnapshot.tick} · Hash ${lastChecksum} · Zoom ${view.zoom.toFixed(2)}×${pauseLabel}${noticeLabel}`;
  }

  function updateEconomy() {
    const player = playerOne();
    if (!player) return;
    resourceValue.textContent = String(player.resources);
    populationValue.textContent = `${player.populationUsed} + ${player.populationReserved} / ${player.populationCap}`;
    const hostileHeadquarters = currentSnapshot.structures.find((structure) => (
      structure.category === "headquarters" && structure.ownerSeat === 2
    ));
    if (currentSnapshot.match?.status === "complete") {
      objectiveValue.textContent = currentSnapshot.match.winnerSeat === null
        ? `Draw at tick ${currentSnapshot.match.completedTick}`
        : currentSnapshot.match.winnerSeat === 1
          ? `You win at tick ${currentSnapshot.match.completedTick}`
          : `Computer wins at tick ${currentSnapshot.match.completedTick}`;
    } else {
      objectiveValue.textContent = hostileHeadquarters
        ? `Hostile HQ ${hostileHeadquarters.health} / ${hostileHeadquarters.maxHealth}`
        : "Destroy the hostile headquarters";
    }
  }

  function updateMatchStatus() {
    const match = currentSnapshot?.match;
    if (!match || match.status !== "complete") {
      shell.dataset.match = "active";
      pauseButton.disabled = false;
      if (matchSignature !== "active") {
        matchStatus.textContent = "Match active · You versus Computer · destroy the hostile headquarters";
      }
      matchSignature = "active";
      return;
    }
    shell.dataset.match = "complete";
    pauseButton.disabled = true;
    const signature = `${match.status}:${match.winnerSeat}:${match.completedTick}`;
    const label = match.winnerSeat === null
      ? `Match complete · draw · tick ${match.completedTick}`
      : match.winnerSeat === 1
        ? `Match complete · You · ◇ Azure win · tick ${match.completedTick}`
        : `Match complete · Computer · ✕ Violet wins · tick ${match.completedTick}`;
    if (matchSignature !== signature) {
      matchStatus.textContent = label;
      skirmish?.setSuspended(true);
      input?.setEnabled(false);
      updateContextModeUi(null);
      hoveredTargetId = null;
      playFrame.style.cursor = "";
      announce(label);
    }
    matchSignature = signature;
  }

  function setContextMode(mode) {
    const activeMode = input ? input.setContextMode(mode) : null;
    updateContextModeUi(activeMode);
  }

  function updateContextModeUi(activeMode) {
    const controls = [
      [moveModeButton, "move", "Choose terrain", "Move"],
      [attackModeButton, "attack", "Choose hostile", "Attack"],
      [attackMoveModeButton, "attack-move", "Choose route", "Attack Move"],
      [defendPointModeButton, "defend-point", "Choose point", "Defend Point"],
      [defendEntityModeButton, "defend-entity", "Choose ally", "Defend Ally"],
      [rallyModeButton, "rally", "Choose terrain", "Rally"]
    ];
    for (const [button, mode, activeLabel, idleLabel] of controls) {
      button.setAttribute("aria-pressed", String(activeMode === mode));
      button.textContent = activeMode === mode ? activeLabel : idleLabel;
    }
  }

  function optionAvailability(definition, producer, player) {
    if (!definition || !producer || !player) return "Unavailable";
    if (effectivePaused()) return "Paused";
    if (currentSnapshot?.match?.status === "complete") return "Match complete";
    if (producer.queue.length >= configuration.productionQueueCap) return "Queue full";
    if (player.resources < definition.cost) return "Not enough Resource";
    if (player.populationUsed + player.populationReserved + definition.population > player.populationCap) return "Population cap";
    return "Available";
  }

  function updateProductionOptions(producer) {
    const player = playerOne();
    const roster = player ? productionRosters[player.faction] : [];
    const buttons = Array.from(productionOptions.querySelectorAll("button[data-production-role]"));
    for (const button of buttons) {
      const role = button.dataset.productionRole;
      const kind = roster.find((candidate) => representatives[candidate].role === role);
      const definition = representatives[kind];
      button.dataset.entityKind = kind || "";
      button.querySelector("[data-option-name]").textContent = kind ? titleWords(kind) : titleWords(role);
      const reason = optionAvailability(definition, producer, player);
      const details = definition
        ? `${definition.cost} · ${definition.population} pop · ${definition.productionTicks / configuration.tickRate}s`
        : "Unavailable";
      button.querySelector("[data-option-cost]").textContent = reason === "Available"
        ? details
        : `${details} · ${reason}`;
      button.disabled = reason !== "Available";
      button.title = reason;
      button.setAttribute("aria-label", `${button.querySelector("[data-option-name]").textContent}: ${button.querySelector("[data-option-cost]").textContent}. ${reason}`);
    }
  }

  function renderQueue(producer) {
    const cancelReason = currentSnapshot?.match?.status === "complete"
      ? "match complete"
      : effectivePaused()
        ? pauseReasonLabel()
        : null;
    const signature = producer
      ? `${cancelReason || "available"}:${producer.queue.map((item) => `${item.id}:${item.blockedComplete}`).join("|")}`
      : "";
    if (signature === queueSignature) return;
    queueSignature = signature;
    const oldButtons = Array.from(productionQueue.querySelectorAll("button[data-queue-item-id]"));
    const focusedItem = document.activeElement?.dataset?.queueItemId || null;
    const focusedIndex = focusedItem
      ? oldButtons.findIndex((button) => button.dataset.queueItemId === focusedItem)
      : -1;
    const fragment = document.createDocumentFragment();
    for (const item of producer?.queue || []) {
      const entry = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `${titleWords(item.entityKind)}${item.blockedComplete ? " · blocked" : ""}`;
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.dataset.queueItemId = item.id;
      cancel.textContent = cancelReason ? `Cancel · ${titleWords(cancelReason)}` : "Cancel";
      cancel.disabled = Boolean(cancelReason);
      cancel.title = cancelReason ? `Unavailable: ${cancelReason}` : "Cancel and refund all Resource";
      cancel.setAttribute("aria-label", cancelReason
        ? `Cancel ${titleWords(item.entityKind)} unavailable: ${cancelReason}`
        : `Cancel ${titleWords(item.entityKind)} and refund all Resource`);
      entry.append(label, cancel);
      fragment.append(entry);
    }
    productionQueue.replaceChildren(fragment);
    if (focusedItem) {
      const queueButtons = Array.from(productionQueue.querySelectorAll("button[data-queue-item-id]:not(:disabled)"));
      const sameButton = productionQueue.querySelector(`[data-queue-item-id="${focusedItem}"]`);
      const focusTarget = (sameButton && !sameButton.disabled ? sameButton : null)
        || queueButtons[Math.min(Math.max(focusedIndex, 0), queueButtons.length - 1)]
        || productionOptions.querySelector("button:not(:disabled)")
        || producerTray;
      focusTarget.focus({ preventScroll: true });
    }
  }

  function updateProducerTray() {
    const producer = selectedStructure();
    const visible = producingStructure(producer);
    if (!visible) {
      if (!producerTray.hidden && producerTray.contains(document.activeElement)) playFrame.focus({ preventScroll: true });
      producerTray.hidden = true;
      queueSignature = "";
      return;
    }
    producerTray.hidden = false;
    producerTitle.textContent = publicStructureName(producer);
    producerQueueCount.textContent = `${producer.queue.length} / ${configuration.productionQueueCap}`;
    const head = producer.queue[0] || null;
    if (!head) {
      productionState.textContent = "Queue empty";
      productionProgress.max = 1;
      productionProgress.value = 0;
      productionProgress.setAttribute("aria-valuetext", "Queue empty");
    } else {
      const definition = representatives[head.entityKind];
      productionProgress.max = definition.productionTicks;
      productionProgress.value = Math.min(head.progressTicks, definition.productionTicks);
      productionState.textContent = head.blockedComplete
        ? `${titleWords(head.entityKind)} complete · spawn blocked`
        : `${titleWords(head.entityKind)} · ${Math.floor(head.progressTicks * 100 / definition.productionTicks)}%`;
      productionProgress.setAttribute("aria-valuetext", productionState.textContent);
    }
    updateProductionOptions(producer);
    renderQueue(producer);
  }

  function updateSelectionUi() {
    const entities = selectedEntities();
    const structure = selectedStructure();
    if (structure) {
      selectionSummary.textContent = publicStructureName(structure);
      const capture = structure.capture;
      const presented = renderStructure(structure);
      const captureLabel = presented.contested
        ? ` · Contested · capture frozen at ${capture.progressTicks}/${configuration.captureRequiredTicks}`
        : capture?.challengerSeat
          ? ` · ${seatLabel(capture.challengerSeat)} capture ${capture.progressTicks}/${configuration.captureRequiredTicks}`
          : "";
      const structureState = structure.health === 0 || structure.destroyed
        ? "DESTROYED"
        : structure.health * 2 <= structure.maxHealth ? "DAMAGED" : "Intact";
      selectionDetail.textContent = `${ownerLabel(structure.ownerSeat)} · HP ${structure.health}/${structure.maxHealth} · ${structureState}${captureLabel}`;
    } else if (entities.length === 1) {
      selectionSummary.textContent = titleWords(entities[0].kind);
      const entity = entities[0];
      const target = entity.targetId ? ` · Target ${titleWords(entity.targetId)}` : " · No target";
      const anchor = entity.defendAnchor?.kind === "entity"
        ? ` · Defends ${titleWords(entity.defendAnchor.entityId)}`
        : entity.defendAnchor?.kind === "point"
          ? ` · Defends point ${Math.round(entity.defendAnchor.destination.x / configuration.positionScale)}, ${Math.round(entity.defendAnchor.destination.y / configuration.positionScale)}`
          : "";
      selectionDetail.textContent = `${ownerLabel(entity.ownerSeat)} · HP ${entity.health}/${entity.maxHealth} · ${titleWords(entity.order)}${target}${anchor}`;
    } else if (entities.length > 1) {
      selectionSummary.textContent = `${entities.length} Astral entities`;
      const totalHealth = entities.reduce((sum, entity) => sum + entity.health, 0);
      const totalMaximum = entities.reduce((sum, entity) => sum + entity.maxHealth, 0);
      const orders = Array.from(new Set(entities.map((entity) => entity.order))).sort(compareIdentifiers).map(titleWords).join(", ");
      const targets = Array.from(new Set(entities.map((entity) => entity.targetId).filter(Boolean))).sort(compareIdentifiers);
      const targetLabel = targets.length === 0 ? "No targets" : targets.length === 1 ? `Target ${titleWords(targets[0])}` : `${targets.length} targets`;
      const anchors = entities.map((entity) => entity.defendAnchor).filter(Boolean);
      const anchorLabel = anchors.length === 0
        ? ""
        : anchors.every((anchor) => anchor.kind === "entity" && anchor.entityId === anchors[0].entityId)
          ? ` · Defends ${titleWords(anchors[0].entityId)}`
          : ` · ${anchors.length} defend anchors`;
      selectionDetail.textContent = `You · ◇ Azure · HP ${totalHealth}/${totalMaximum} · ${orders} · ${targetLabel}${anchorLabel}`;
    } else {
      selectionSummary.textContent = "None";
      selectionDetail.textContent = "Choose combat entities or a structure to inspect health.";
    }
    const structureValue = structure?.id || "";
    if (structureSelect.value !== structureValue) structureSelect.value = structureValue;
    const producer = producingStructure(structure);
    const matchComplete = currentSnapshot?.match?.status === "complete";
    const paused = effectivePaused();
    const combatDisabled = entities.length === 0 || paused || matchComplete;
    moveModeButton.disabled = combatDisabled;
    attackModeButton.disabled = combatDisabled;
    attackMoveModeButton.disabled = combatDisabled;
    defendPointModeButton.disabled = combatDisabled;
    defendEntityModeButton.disabled = combatDisabled;
    stopButton.disabled = combatDisabled;
    const settlementDisabled = paused || matchComplete;
    rallyModeButton.disabled = !producer || settlementDisabled;
    clearRallyButton.disabled = !producer || structure.rally === null || settlementDisabled;
    clearSelectionButton.disabled = entities.length === 0 && !structure;
    commandAvailability.textContent = matchComplete
      ? "Tactical commands unavailable: the match is complete."
      : paused
        ? `Tactical commands unavailable: ${pauseReasonLabel()}.`
        : entities.length === 0
          ? "Tactical commands unavailable: select one or more owned combat entities."
          : "Tactical commands available for the selected owned combat entities.";
    rallyAvailability.textContent = matchComplete
      ? "Rally commands unavailable: the match is complete."
      : paused
        ? `Rally commands unavailable: ${pauseReasonLabel()}.`
        : !producer
          ? "Rally commands unavailable: inspect an owned headquarters or Production Outpost."
          : structure.rally === null
            ? "Set rally is available. Clear rally is unavailable because this producer has no rally destination."
            : "Set rally and Clear rally are available for the inspected owned producer.";
    selectionClearAvailability.textContent = entities.length === 0 && !structure
      ? "Clear selection is unavailable: select a combat entity or structure first."
      : "Clear selection is available.";
    updateProducerTray();
    const active = document.activeElement;
    if (active && battlefieldScreen.contains(active)
      && !hardeningApi.canReceiveProgrammaticFocus(active)) {
      hardeningApi.focusFirstAvailable([
        ...productionOptions.querySelectorAll("button:not(:disabled)"),
        structureSelect,
        playFrame
      ]);
    }
  }

  function updateTargetStatus() {
    const targetEntity = hoveredTargetId && currentSnapshot
      ? currentSnapshot.entities.find((value) => value.id === hoveredTargetId) || null
      : null;
    const targetStructure = hoveredTargetId && currentSnapshot
      ? currentSnapshot.structures.find((value) => value.id === hoveredTargetId) || null
      : null;
    const target = targetEntity || targetStructure;
    targetStatus.textContent = target
      ? `Target: ${targetEntity ? titleWords(target.kind) : publicStructureName(target)} · ${ownerLabel(target.ownerSeat)} · HP ${target.health}/${target.maxHealth} · hostile marker ⊗.`
      : "Target: none. Hostile focus targets use a labelled ⊗ marker as well as ownership text.";
  }

  function updateAllUi() {
    updateEconomy();
    updateMatchStatus();
    updateSelectionUi();
    updateTargetStatus();
    updateDebugStatus();
  }

  function clearSelection(message = "Selection cleared") {
    selectedEntityIds.clear();
    selectedStructureId = null;
    queueSignature = "";
    setContextMode(null);
    announce(message);
    updateSelectionUi();
    renderDynamic();
  }

  function replaceEntitySelection(entityIds, additive) {
    selectedStructureId = null;
    if (!additive) selectedEntityIds.clear();
    for (const entityId of entityIds.slice().sort(compareIdentifiers)) {
      if (selectedEntityIds.size >= configuration.selectionCap) break;
      selectedEntityIds.add(entityId);
    }
    setContextMode(null);
    announce(selectedEntityIds.size ? "Combat selection ready" : "No owned combat entity selected");
    updateSelectionUi();
    renderDynamic();
  }

  function selectStructure(structureId, announceSelection = true) {
    const structure = currentSnapshot?.structures.find((candidate) => candidate.id === structureId) || null;
    if (!structure) {
      clearSelection("No structure selected");
      return;
    }
    selectedEntityIds.clear();
    selectedStructureId = structure.id;
    queueSignature = "";
    setContextMode(null);
    if (announceSelection) announce(`${publicStructureName(structure)} selected. ${ownerLabel(structure.ownerSeat)}.`);
    updateSelectionUi();
    renderDynamic();
  }

  function hitAtWorldPoint(point, accepts = (type, value) => type === "structure" || value.ownerSeat === 1) {
    if (!currentSnapshot) return null;
    const cameraScale = camera.snapshot().scale;
    const tolerance = 22 / Math.max(cameraScale, 0.001);
    const candidates = [];
    for (const structure of currentSnapshot.structures) {
      if (!accepts("structure", structure)) continue;
      const radius = Math.max(structure.radius / configuration.positionScale, tolerance);
      const x = structure.x / configuration.positionScale;
      const y = structure.y / configuration.positionScale;
      const distanceSquared = (x - point.x) ** 2 + (y - point.y) ** 2;
      if (distanceSquared <= radius * radius) candidates.push({ type: "structure", value: structure, distanceSquared });
    }
    for (const entity of currentSnapshot.entities) {
      if (!accepts("combat", entity)) continue;
      const radius = Math.max(entity.radius / configuration.positionScale, tolerance);
      const x = entity.x / configuration.positionScale;
      const y = entity.y / configuration.positionScale;
      const distanceSquared = (x - point.x) ** 2 + (y - point.y) ** 2;
      if (distanceSquared <= radius * radius) candidates.push({ type: "combat", value: entity, distanceSquared });
    }
    candidates.sort((first, second) => (
      second.value.y - first.value.y
      || first.distanceSquared - second.distanceSquared
      || compareIdentifiers(first.value.id, second.value.id)
    ));
    return candidates[0] || null;
  }

  function hostileTargetAt(point) {
    return hitAtWorldPoint(point, (_type, value) => (
      value.ownerSeat === 2 && value.health > 0 && !value.destroyed
    ));
  }

  function friendlyAnchorAt(point) {
    return hitAtWorldPoint(point, (_type, value) => (
      value.ownerSeat === 1 && value.health > 0 && !value.destroyed
    ));
  }

  function onSelectPoint(payload) {
    const mode = input?.snapshot().contextMode || null;
    if (mode) {
      onContextRequest({ ...payload, mode });
      setContextMode(null);
      return;
    }
    const hit = hitAtWorldPoint(payload.worldPoint);
    if (!hit) {
      if (!payload.additive) clearSelection();
      return;
    }
    if (hit.type === "structure") selectStructure(hit.value.id);
    else replaceEntitySelection([hit.value.id], payload.additive);
  }

  function onHoverChange(payload) {
    const next = payload ? hostileTargetAt(payload.worldPoint)?.value?.id || null : null;
    if (next === hoveredTargetId) return;
    hoveredTargetId = next;
    playFrame.dataset.hostileHover = next ? "true" : "false";
    playFrame.style.cursor = next ? "crosshair" : "";
    updateTargetStatus();
    renderDynamic();
  }

  function onSelectBox(payload) {
    if (!currentSnapshot) return;
    const ids = currentSnapshot.entities.filter((entity) => {
      if (entity.ownerSeat !== 1) return false;
      const x = entity.x / configuration.positionScale;
      const y = entity.y / configuration.positionScale;
      return x >= payload.worldBounds.minX && x <= payload.worldBounds.maxX
        && y >= payload.worldBounds.minY && y <= payload.worldBounds.maxY;
    }).map((entity) => entity.id);
    replaceEntitySelection(ids, payload.additive);
  }

  function onSelectionPreview(rect) {
    selectionMarquee.hidden = !rect;
    if (!rect) return;
    selectionMarquee.style.left = `${rect.left}px`;
    selectionMarquee.style.top = `${rect.top}px`;
    selectionMarquee.style.width = `${rect.width}px`;
    selectionMarquee.style.height = `${rect.height}px`;
  }

  function fixedDestination(worldPoint) {
    return Object.freeze({
      x: Math.max(0, Math.min(map.world.width * configuration.positionScale, Math.round(worldPoint.x * configuration.positionScale))),
      y: Math.max(0, Math.min(map.world.height * configuration.positionScale, Math.round(worldPoint.y * configuration.positionScale)))
    });
  }

  function rejectionLabel(code) {
    const labels = {
      "blocked-destination": "That terrain is blocked",
      "unreachable": "That destination is unreachable",
      "command-cap": "The command queue is full",
      "queue-cap": "That production queue is full",
      "resources": "Not enough Resource",
      "population-cap": "Population cap reached",
      "ownership": "That producer is not owned",
      "not-producer": "That structure cannot produce",
      "missing-queue-item": "That queue item no longer exists",
      "invalid-target": "Choose one living hostile target",
      "invalid-anchor": "Choose a living friendly entity or structure",
      "not-hostile": "That target is not a living hostile entity or owned structure",
      "focus-leash": "The target is outside the 1,200-world-unit focus leash",
      "anchor": "That defend anchor is no longer living and friendly",
      "focus-unreachable": "The full focus group cannot reach valid reservations",
      "defend-return-unreachable": "Defender holds at the nearest reachable root",
      "projectile-limit": "Projectile limit reached; attack cycle consumed",
      "projectile-id-limit": "Projectile identifier limit reached; attack cycle consumed",
      "match-complete": "The match is complete",
      "replay-cap": "The bounded command record is full",
      "replay-invalid": "The command record rejected this request",
      "human-seat": "Only your Astral forces accept these controls",
      "inactive": "The skirmish is not active",
      "paused": "Simulation is paused"
    };
    return labels[code] || `Command rejected (${code})`;
  }

  function submit(kind, payload, feedback = null) {
    if (!skirmish) return null;
    if (effectivePaused()) {
      announce("Simulation is paused; command not accepted");
      return Object.freeze({ ok: false, code: "paused" });
    }
    const request = Object.freeze({
      protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId,
      kind,
      issuingPlayer: 1,
      targetTick: skirmish.tick + configuration.commandLeadMinTicks,
      ...payload
    });
    const receipt = skirmish.submitHumanCommand(request);
    if (!receipt.ok) {
      if (feedback) destinationFeedback.splice(0, destinationFeedback.length, { ...feedback, status: "rejected", label: "Rejected" });
      announce(rejectionLabel(receipt.code));
      renderDynamic();
      return receipt;
    }
    const entityIds = Array.isArray(payload.entityIds) ? Object.freeze([...payload.entityIds]) : null;
    pendingCommands.set(receipt.command.sequence, Object.freeze({ kind, feedback, entityIds }));
    if (feedback) destinationFeedback.splice(0, destinationFeedback.length, {
      ...feedback,
      entityIds,
      status: "accepted",
      label: "Queued"
    });
    announce(`${titleWords(kind)} queued for tick ${receipt.command.targetTick}`);
    renderDynamic();
    return receipt;
  }

  function onContextRequest(payload) {
    if (payload.mode !== null) setContextMode(null);
    const destination = fixedDestination(payload.worldPoint);
    const selected = selectedStructure();
    const selectedIds = Array.from(selectedEntityIds).sort(compareIdentifiers);
    const wantsRally = payload.mode === "rally" || (selectedEntityIds.size === 0 && producingStructure(selected));
    if (wantsRally) {
      if (!producingStructure(selected)) {
        announce("Select an owned producer first");
        return;
      }
      submit("SET_RALLY", { structureId: selected.id, destination }, { ...destination, label: "Rally" });
      return;
    }
    if (selectedEntityIds.size === 0) {
      announce("Select one or more Astral entities first");
      return;
    }
    const hostile = hostileTargetAt(payload.worldPoint)?.value || null;
    if (payload.mode === "attack" || (payload.mode === null && hostile)) {
      if (!hostile) {
        announce("Attack requires one living hostile target marked ⊗");
        return;
      }
      submit("ATTACK_ENTITY", { entityIds: selectedIds, targetId: hostile.id }, {
        x: hostile.x, y: hostile.y, label: "Focus"
      });
      return;
    }
    if (payload.mode === "attack-move") {
      submit("ATTACK_MOVE", { entityIds: selectedIds, destination }, { ...destination, label: "Attack Move" });
      return;
    }
    if (payload.mode === "defend-point") {
      submit("DEFEND", {
        entityIds: selectedIds,
        anchor: { kind: "point", destination }
      }, { ...destination, label: "Defend Point" });
      return;
    }
    if (payload.mode === "defend-entity") {
      const anchor = friendlyAnchorAt(payload.worldPoint)?.value || null;
      if (!anchor) {
        announce("Defend Ally requires a living friendly entity or structure");
        return;
      }
      submit("DEFEND", {
        entityIds: selectedIds,
        anchor: { kind: "entity", entityId: anchor.id }
      }, { x: anchor.x, y: anchor.y, label: "Defend Ally" });
      return;
    }
    submit("MOVE", { entityIds: selectedIds, destination }, destination);
  }

  function stopSelection() {
    if (selectedEntityIds.size === 0) return;
    setContextMode(null);
    submit("STOP", { entityIds: Array.from(selectedEntityIds).sort(compareIdentifiers) });
  }

  function onProductionClick(event) {
    const button = event.target.closest("button[data-production-role]");
    if (!button || button.disabled) return;
    const producer = selectedStructure();
    if (!producingStructure(producer) || !button.dataset.entityKind) return;
    submit("QUEUE_PRODUCTION", { structureId: producer.id, entityKind: button.dataset.entityKind });
  }

  function onQueueClick(event) {
    const button = event.target.closest("button[data-queue-item-id]");
    if (!button) return;
    const producer = selectedStructure();
    if (!producingStructure(producer)) return;
    submit("CANCEL_PRODUCTION", { structureId: producer.id, queueItemId: button.dataset.queueItemId });
  }

  function clearRally() {
    const producer = selectedStructure();
    if (!producingStructure(producer) || producer.rally === null) return;
    submit("CLEAR_RALLY", { structureId: producer.id });
  }

  function presentationCap() {
    return configuration.presentationalEffectCap;
  }

  function pointForIdentifier(identifier, primarySnapshot = currentSnapshot) {
    if (!identifier) return null;
    return primarySnapshot?.entities.find((value) => value.id === identifier)
      || primarySnapshot?.structures.find((value) => value.id === identifier)
      || defeatShells.find((value) => value.id === identifier)
      || null;
  }

  function addEffect(kind, identifier, fallback = null) {
    const target = pointForIdentifier(identifier) || fallback;
    if (!target || !Number.isInteger(target.x) || !Number.isInteger(target.y)) return;
    while (presentationalEffects.length + defeatShells.length >= presentationCap()) {
      if (presentationalEffects.length > 0) presentationalEffects.shift();
      else return;
    }
    presentationalEffects.push(Object.freeze({
      kind,
      x: target.x,
      y: target.y,
      startTick: presentationTick,
      expiresTick: presentationTick + (reducedMotionQuery.matches ? 4 : 8)
    }));
  }

  function captureDefeatShells(before, after) {
    const survivors = new Set(after.entities.map((entity) => entity.id));
    for (const entity of before.entities) {
      if (survivors.has(entity.id)) continue;
      while (presentationalEffects.length + defeatShells.length >= presentationCap()) {
        if (presentationalEffects.length > 0) presentationalEffects.shift();
        else defeatShells.shift();
      }
      defeatShells.push({ ...entity, health: 0, defeatStartTick: presentationTick, defeatAgeTicks: 0 });
      addEffect("defeat", entity.id, entity);
    }
  }

  function advancePresentation() {
    for (const shell of defeatShells) shell.defeatAgeTicks = presentationTick - shell.defeatStartTick;
    for (let index = defeatShells.length - 1; index >= 0; index -= 1) {
      if (defeatShells[index].defeatAgeTicks >= configuration.defeatPresentationTicks) defeatShells.splice(index, 1);
    }
    for (let index = presentationalEffects.length - 1; index >= 0; index -= 1) {
      if (presentationalEffects[index].expiresTick <= presentationTick) presentationalEffects.splice(index, 1);
    }
  }

  function processSimulationEvents(events) {
    let selectedReleaseAnnounced = false;
    for (const event of events) {
      if (event.type === "command") {
        const pending = pendingCommands.get(event.sequence);
        pendingCommands.delete(event.sequence);
        if (!pending) continue;
        if (event.status === "rejected") {
          const rejectionCode = pending?.kind === "ATTACK_ENTITY" && event.code === "unreachable"
            ? "focus-unreachable"
            : event.code;
          if (pending?.feedback) destinationFeedback.splice(0, destinationFeedback.length, {
            ...pending.feedback, status: "unreachable", label: "Unreachable"
          });
          announce(rejectionLabel(rejectionCode));
        } else if (pending?.kind === "CLEAR_RALLY") {
          destinationFeedback.length = 0;
          announce("Rally point cleared");
        } else if (pending?.feedback) {
          const appliedLabel = {
            SET_RALLY: "Rally set",
            MOVE: "Moving",
            ATTACK_ENTITY: "Focus target",
            ATTACK_MOVE: "Attack move",
            DEFEND: "Defending"
          }[pending.kind] || "Applied";
          destinationFeedback.splice(0, destinationFeedback.length, {
            ...pending.feedback,
            entityIds: pending.entityIds,
            status: "accepted",
            label: appliedLabel
          });
          announce(`${titleWords(pending.kind)} applied`);
        } else {
          announce(`${titleWords(pending?.kind || "command")} applied`);
        }
      } else if (event.type === "production") {
        if (event.status === "blocked") announce("Production complete, but every spawn slot is blocked");
        else if (event.status === "completed") announce(`${titleWords(event.entityId || "reinforcement")} spawned`);
      } else if (event.type === "structure" && event.status === "captured") {
        announce(event.ownerSeat === null
          ? "Shared structure returned to neutral"
          : `${seatLabel(event.ownerSeat)} captured ${publicStructureName(currentSnapshot?.structures.find((value) => value.id === event.structureId))}`);
      } else if (event.type === "entity") {
        const marker = destinationFeedback[0];
        if (marker?.entityIds?.includes(event.entityId)) {
          if (event.status === "stopped") {
            destinationFeedback.splice(0, destinationFeedback.length, { ...marker, status: "stopped", label: "Stopped" });
          } else if (event.status === "completed" && marker.entityIds.every((entityId) => (
            currentSnapshot.entities.find((entity) => entity.id === entityId)?.order !== "MOVE"
          ))) {
            destinationFeedback.splice(0, destinationFeedback.length, { ...marker, status: "accepted", label: "Arrived" });
          }
        }
        if (selectedEntityIds.has(event.entityId)) {
          if (event.status === "completed") announce("Selected formation arrived");
          else if (event.status === "stopped") announce(event.code === "defend-return-unreachable"
            ? rejectionLabel(event.code)
            : "An entity stopped after bounded congestion recovery");
        }
      } else if (event.type === "rally") {
        if (event.status === "applied") announce("New reinforcement is moving toward its rally");
        else announce("A spawned reinforcement could not begin its rally route");
      } else if (event.type === "combat") {
        if (event.status === "target-released") {
          const marker = destinationFeedback[0];
          if (marker?.entityIds?.includes(event.entityId)) {
            destinationFeedback.splice(0, destinationFeedback.length, {
              ...marker,
              status: "stopped",
              label: event.code === "congestion" ? "Target released · congestion" : "Target released"
            });
          }
          if (selectedEntityIds.has(event.entityId) && !selectedReleaseAnnounced) {
            selectedReleaseAnnounced = true;
            announce(event.code === "congestion"
              ? "Selected entity released its target after bounded congestion recovery"
              : event.code === "unreachable"
                ? "Selected entity released an unreachable target"
                : "Selected entity released an invalid or out-of-leash target");
          }
        } else if (event.status === "attack-started") addEffect("attack", event.attackerId || event.entityId);
        else if (event.status === "contact" || event.status === "damage") addEffect("impact", event.targetId);
        else if (event.status === "miss") addEffect("miss", event.targetId || event.attackerId || event.entityId);
      } else if (event.type === "projectile") {
        if (event.status === "withheld" && (event.code === "projectile-limit" || event.code === "projectile-id-limit")) {
          addEffect("limit", event.attackerId || event.entityId);
          announce(rejectionLabel(event.code));
        } else if (event.status === "arrived") addEffect("impact", event.targetId);
        else if (event.status === "dissipated") addEffect("miss", event.targetId);
      } else if (event.type === "defeat") {
        announce(`${titleWords(event.entityId || "combat entity")} defeated`);
      } else if (event.type === "structure" && event.status === "destroyed") {
        addEffect("impact", event.structureId);
        const refund = event.refundedItems > 0 ? ` · ${event.refundedItems} queued item${event.refundedItems === 1 ? "" : "s"} fully refunded` : "";
        announce(`${publicStructureName(currentSnapshot?.structures.find((value) => value.id === event.structureId) || mapStructures.get(event.structureId))} destroyed${refund}`);
      } else if (event.type === "match" && event.status === "completed") {
        updateMatchStatus();
      }
    }
  }

  function updateMovementFrames() {
    movementFrames.clear();
    if (!currentSnapshot || reducedMotionQuery.matches) return;
    const frame = Math.floor(currentSnapshot.tick * 8 / configuration.tickRate) % 4;
    for (const entity of currentSnapshot.entities) {
      const routeActive = Array.isArray(entity.route) && entity.routeIndex < entity.route.length;
      if (routeActive && entity.order !== "STOP") movementFrames.set(entity.id, frame);
    }
  }

  function renderStructure(structure) {
    const authored = mapStructures.get(structure.id);
    const presented = {
      ...structure,
      faction: authored?.faction || null,
      captureRadius: authored?.captureRadius
        ? authored.captureRadius * configuration.positionScale
        : null,
      captureSeat: structure.capture?.challengerSeat ?? null,
      captureProgress: structure.capture?.progressTicks ?? 0
    };
    presented.contested = dynamicRendererApi.captureIsContested(
      presented,
      currentSnapshot?.entities || []
    );
    return Object.freeze(presented);
  }

  function renderStructures() {
    if (!currentSnapshot) return [];
    return currentSnapshot.structures.map(renderStructure);
  }

  function renderState() {
    const projectiles = currentSnapshot?.match?.status === "complete"
      ? currentSnapshot.projectiles.filter((projectile) => projectile.arrivalTick > presentationTick)
      : currentSnapshot?.projectiles || [];
    return Object.freeze({
      tick: presentationTick,
      entities: currentSnapshot?.entities || [],
      structures: renderStructures(),
      projectiles,
      defeatShells,
      effects: presentationalEffects,
      hoveredTargetId,
      selectedEntityIds,
      selectedStructureId,
      movementFrames,
      destinationFeedback
    });
  }

  function renderDynamic() {
    if (renderer) renderer.renderDynamic();
  }

  function renderCamera() {
    if (renderer) renderer.render();
    updateDebugStatus();
  }

  function completedPresentationActive() {
    if (currentSnapshot?.match?.status !== "complete") return true;
    return defeatShells.length > 0 || presentationalEffects.length > 0
      || currentSnapshot.projectiles.some((projectile) => projectile.arrivalTick > presentationTick);
  }

  function cancelAnimationLoop() {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    previousFrameTime = 0;
    accumulatedTime = 0;
  }

  function ensureAnimationLoop() {
    if (animationFrame || destroyed || stage !== "battlefield" || !skirmish || !renderer
      || effectivePaused() || !completedPresentationActive()) return false;
    animationFrame = window.requestAnimationFrame(animationLoop);
    return true;
  }

  function retireCompletedRuntime() {
    if (currentSnapshot?.match?.status !== "complete" || completedRuntimeRetired) return false;
    completedRuntimeRetired = true;
    cancelAnimationLoop();
    input?.destroy();
    renderer?.destroy();
    skirmish?.destroy();
    entityAssets?.dispose();
    structureAssets?.dispose();
    input = null;
    renderer = null;
    dynamicRenderer = null;
    skirmish = null;
    entityAssets = null;
    structureAssets = null;
    selectedEntityIds.clear();
    selectedStructureId = null;
    movementFrames.clear();
    destinationFeedback.length = 0;
    defeatShells.length = 0;
    presentationalEffects.length = 0;
    pendingCommands.clear();
    hoveredTargetId = null;
    playFrame.removeAttribute("data-hostile-hover");
    playFrame.style.cursor = "";
    selectionMarquee.hidden = true;
    selectionMarquee.removeAttribute("style");
    releaseImage(groundImage);
    groundImage = null;
    for (const canvas of Object.values(canvases)) {
      canvas.width = 0;
      canvas.height = 0;
    }
    battlefieldFullscreenButton.disabled = true;
    releaseBrowserFeatures("One or more app-owned browser features could not be released after match completion.")
      .catch(() => null);
    updateTargetStatus();
    updateSelectionUi();
    return true;
  }

  function animationLoop(timestamp) {
    animationFrame = 0;
    if (destroyed || stage !== "battlefield" || !skirmish || !renderer || effectivePaused()) return;
    if (previousFrameTime === 0) previousFrameTime = timestamp;
    const elapsed = Math.min(Math.max(0, timestamp - previousFrameTime), configuration.tickDurationMs * configuration.maxCatchUpTicks);
    previousFrameTime = timestamp;
    accumulatedTime += elapsed;
    let steps = 0;
    while (accumulatedTime >= configuration.tickDurationMs && steps < configuration.maxCatchUpTicks) {
      accumulatedTime -= configuration.tickDurationMs;
      steps += 1;
      if (currentSnapshot.match?.status === "complete") {
        if (completedPresentationActive()) {
          presentationTick += 1;
          advancePresentation();
        }
        continue;
      }
      const before = currentSnapshot;
      const result = skirmish.step();
      currentSnapshot = skirmish.battleSnapshot();
      presentationTick = currentSnapshot.tick;
      captureDefeatShells(before, currentSnapshot);
      advancePresentation();
      processSimulationEvents(result.events);
      for (const entityId of Array.from(selectedEntityIds)) {
        if (!currentSnapshot.entities.some((entity) => entity.id === entityId)) selectedEntityIds.delete(entityId);
      }
      const hovered = hoveredTargetId && (currentSnapshot.entities.find((value) => value.id === hoveredTargetId)
        || currentSnapshot.structures.find((value) => value.id === hoveredTargetId));
      if (hoveredTargetId && (!hovered || hovered.ownerSeat !== 2 || hovered.health <= 0 || hovered.destroyed)) {
        hoveredTargetId = null;
        playFrame.removeAttribute("data-hostile-hover");
        playFrame.style.cursor = "";
      }
      if (currentSnapshot.tick % configuration.checksumIntervalTicks === 0) {
        lastChecksum = skirmish.compositeChecksum().slice(-8);
      }
    }
    if (selectedStructureId && !currentSnapshot.structures.some((value) => value.id === selectedStructureId)) {
      clearSelection("Selected structure is no longer available");
    }
    updateMovementFrames();
    updateAllUi();
    renderDynamic();
    if (currentSnapshot.match?.status === "complete" && !completedPresentationActive()) {
      retireCompletedRuntime();
      return;
    }
    ensureAnimationLoop();
  }

  function syncInputState() {
    const suspended = stage !== "battlefield" || effectivePaused();
    const matchComplete = currentSnapshot?.match?.status === "complete";
    const inputInactive = suspended || matchComplete;
    skirmish?.setSuspended(inputInactive);
    if (input) input.setEnabled(!inputInactive);
    pauseButton.setAttribute("aria-pressed", String(manualPaused()));
    pauseButton.textContent = manualPaused() ? "Resume" : "Pause";
    updateSelectionUi();
    if (matchComplete && (suspended || !completedPresentationActive())) {
      retireCompletedRuntime();
    } else if (suspended) {
      cancelAnimationLoop();
    } else {
      ensureAnimationLoop();
    }
  }

  function updateViewport() {
    if (destroyed) return;
    const inspection = cameraApi.inspectViewport(shell.clientWidth, shell.clientHeight);
    playableViewport = inspection.playable;
    const nextGate = inspection.portrait ? "orientation" : inspection.tooSmall ? "size" : null;
    suspension.set("viewport", !playableViewport);
    orientationGate.hidden = !inspection.portrait;
    sizeGate.hidden = inspection.portrait || !inspection.tooSmall;
    loadError.hidden = stage !== "error" || !playableViewport;
    menuScreen.hidden = stage !== "menu" || !playableViewport;
    battlefieldScreen.hidden = stage !== "battlefield" || !playableViewport;
    menuScreen.inert = stage !== "menu" || !playableViewport;
    battlefieldScreen.inert = stage !== "battlefield" || !playableViewport;
    settingsDialog.inert = !playableViewport;
    if (!playableViewport && settingsDialog.open) {
      if (typeof settingsDialog.close === "function") settingsDialog.close();
      else settingsDialog.removeAttribute("open");
    }
    if (playableViewport) {
      const renderedRect = hardeningApi.roundedPlayRect(inspection.playRect, cameraApi.configuration);
      setRect(menuScreen, normalizeRenderedRect(containRect(renderedRect, map.world.width / map.world.height)));
      setRect(battlefieldScreen, renderedRect);
      if (renderer) renderer.resize(renderedRect.width, renderedRect.height, window.devicePixelRatio || 1);
    } else if (input) input.resetTransient();
    shell.dataset.orientation = inspection.portrait ? "portrait" : "landscape";
    shell.dataset.viewport = playableViewport ? "supported" : "gated";
    syncInputState();
    updateDebugStatus();
    if (nextGate !== lastGate) {
      if (nextGate === "orientation") hardeningApi.focusFirstAvailable([orientationGate]);
      else if (nextGate === "size") hardeningApi.focusFirstAvailable([sizeGate]);
      else if (stage === "error") hardeningApi.focusFirstAvailable([errorMenuButton, loadError]);
      else if (stage === "battlefield") hardeningApi.focusFirstAvailable([playFrame]);
      else hardeningApi.focusFirstAvailable([beginButton]);
      lastGate = nextGate;
    }
  }

  function loadMenuArt() {
    menuArt.onload = () => { menuFallback.hidden = true; };
    menuArt.onerror = () => { menuFallback.hidden = false; };
    menuArt.src = menuArt.dataset.src;
  }

  function unloadMenuArt() {
    menuArt.onload = null;
    menuArt.onerror = null;
    menuArt.removeAttribute("src");
  }

  function releaseImage(image, removeSource = true) {
    if (!image) return;
    image.onload = null;
    image.onerror = null;
    if (removeSource && typeof image.removeAttribute === "function") image.removeAttribute("src");
  }

  function loadGround() {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        if (image.naturalWidth !== map.layers.ground.width || image.naturalHeight !== map.layers.ground.height) {
          releaseImage(image);
          reject(new Error("terrain-dimensions"));
        } else {
          releaseImage(image, false);
          resolve(image);
        }
      };
      image.onerror = () => {
        releaseImage(image);
        reject(new Error("terrain-load"));
      };
      image.src = map.layers.ground.image;
    });
  }

  function unloadRuntime() {
    completedRuntimeRetired = false;
    loadGeneration += 1;
    cancelAnimationLoop();
    if (input) input.destroy();
    if (renderer) renderer.destroy();
    if (skirmish) skirmish.destroy();
    if (entityAssets?.dispose) entityAssets.dispose();
    if (structureAssets?.dispose) structureAssets.dispose();
    input = null;
    renderer = null;
    dynamicRenderer = null;
    entityAssets = null;
    structureAssets = null;
    skirmish = null;
    currentSnapshot = null;
    selectedEntityIds.clear();
    selectedStructureId = null;
    movementFrames.clear();
    destinationFeedback.length = 0;
    defeatShells.length = 0;
    presentationalEffects.length = 0;
    pendingCommands.clear();
    hoveredTargetId = null;
    presentationTick = 0;
    matchSignature = "active";
    shell.dataset.match = "active";
    matchStatus.textContent = "Match active · You versus Computer · both headquarters intact";
    playFrame.style.cursor = "";
    playFrame.removeAttribute("data-hostile-hover");
    selectionMarquee.hidden = true;
    selectionMarquee.removeAttribute("style");
    producerTray.hidden = true;
    productionQueue.replaceChildren();
    productionProgress.max = 1;
    productionProgress.value = 0;
    productionProgress.setAttribute("aria-valuetext", "Queue empty");
    productionState.textContent = "Queue empty";
    producerQueueCount.textContent = `0 / ${configuration.productionQueueCap}`;
    queueSignature = "";
    releaseImage(groundImage);
    groundImage = null;
    for (const canvas of Object.values(canvases)) {
      canvas.width = 0;
      canvas.height = 0;
    }
    lastChecksum = "pending";
    updateTargetStatus();
    updateSelectionUi();
  }

  function updateFullscreenUi() {
    const active = Boolean(document.fullscreenElement);
    for (const button of [menuFullscreenButton, battlefieldFullscreenButton]) {
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", active ? "Exit fullscreen" : "Request fullscreen");
    }
    battlefieldFullscreenButton.textContent = active ? "Exit fullscreen" : "Fullscreen";
  }

  function trackBrowserFeatureRequest(request) {
    const pending = Promise.resolve(request);
    browserFeatureRequests.add(pending);
    const clear = () => browserFeatureRequests.delete(pending);
    pending.then(clear, clear);
    return pending;
  }

  function waitForBrowserFeatureRequests() {
    return Promise.allSettled(Array.from(browserFeatureRequests));
  }

  function releaseBrowserFeatures(failureMessage) {
    if (browserFeatureReleasePending) {
      return browserReleasePromise.catch((error) => {
        browserFeatureStatus.textContent = failureMessage;
        throw error;
      });
    }
    browserFeatureReleasePending = true;
    browserFeatureActionPending = true;
    browserFeatures.cancel();
    const release = Promise.all([
      browserReleasePromise.catch(() => null),
      waitForBrowserFeatureRequests()
    ])
      .then(() => browserFeatures.release());
    browserReleasePromise = release.then(
      (result) => {
        browserFeatureReleasePending = false;
        browserFeatureActionPending = false;
        return result;
      },
      (error) => {
        browserFeatureReleasePending = false;
        browserFeatureActionPending = false;
        throw error;
      }
    );
    return browserReleasePromise.catch((error) => {
      browserFeatureStatus.textContent = failureMessage;
      throw error;
    });
  }

  async function onFullscreenRequest() {
    if (browserFeatureActionPending || browserFeatureReleasePending) return;
    browserFeatureActionPending = true;
    const menuWasAvailable = stage === "menu";
    if (menuWasAvailable) beginButton.disabled = true;
    if (document.fullscreenElement) {
      await releaseBrowserFeatures("Fullscreen could not be exited; the match state was not changed.")
        .catch(() => null);
    } else {
      const request = trackBrowserFeatureRequest(browserFeatures.requestFullscreen());
      await request.catch(() => {
        browserFeatureStatus.textContent = "Fullscreen could not be requested; supported landscape play can continue.";
      });
    }
    if (browserFeatureReleasePending) return;
    browserFeatureActionPending = false;
    if (destroyed) return;
    if (menuWasAvailable && stage === "menu") beginButton.disabled = false;
  }

  function onFullscreenChange() {
    browserFeatures.synchronizeFullscreen();
    updateFullscreenUi();
    browserFeatureStatus.textContent = document.fullscreenElement
      ? "Fullscreen is active."
      : "Fullscreen is not active.";
  }

  function onFullscreenError() {
    browserFeatures.synchronizeFullscreen();
    updateFullscreenUi();
    browserFeatureStatus.textContent = "Fullscreen was denied or failed; supported landscape play can continue.";
  }

  function createRuntime(loadedGround, loadedEntityAssets, loadedStructureAssets) {
    completedRuntimeRetired = false;
    groundImage = loadedGround;
    entityAssets = loadedEntityAssets;
    structureAssets = loadedStructureAssets;
    skirmish = skirmishApi.createSkirmish({ map, seed: 0x4a0e2026 });
    currentSnapshot = skirmish.battleSnapshot();
    presentationTick = currentSnapshot.tick;
    lastChecksum = skirmish.compositeChecksum().slice(-8);
    dynamicRenderer = dynamicRendererApi.createDynamicRenderer({
      camera,
      configuration,
      entityAssets,
      structureAssets,
      representatives,
      reducedMotion: reducedMotionQuery.matches
    });
    renderer = baseRendererApi.createRenderer({
      canvases,
      map,
      camera,
      groundImage,
      renderScaleCap: cameraApi.configuration.renderScaleCap,
      drawAnchorPreviews: false,
      onDynamicDraw(context) { dynamicRenderer.draw(context, renderState()); }
    });
    input = inputApi.createInput({
      target: playFrame,
      camera,
      configuration: cameraApi.configuration,
      onCameraChange: renderCamera,
      onSelectPoint,
      onSelectBox,
      onSelectionPreview,
      onContextRequest,
      onHoverChange,
      onContextModeChange(mode) {
        updateContextModeUi(mode);
      },
      onTransientReset() {
        selectionMarquee.hidden = true;
        hoveredTargetId = null;
        playFrame.removeAttribute("data-hostile-hover");
        playFrame.style.cursor = "";
        updateTargetStatus();
      }
    });
    renderer.setNavigationVisible(navigationVisible);
    navigationButton.setAttribute("aria-pressed", String(navigationVisible));
    camera.reset();
    announce(`Standard computer and local ${entityAssets.cellSize}px entity art ready`);
    updateAllUi();
    updateViewport();
    syncInputState();
    playFrame.focus({ preventScroll: true });
    ensureAnimationLoop();
  }

  function showLoadError(error) {
    releaseBrowserFeatures("One or more app-owned browser features could not be released after the load failure.")
      .catch(() => null);
    unloadRuntime();
    stage = "error";
    shell.dataset.stage = stage;
    const code = error?.code || error?.message || "local-preload-failed";
    loadErrorDetail.textContent = `No skirmish was started (${String(code).slice(0, 80)}). Reload the page or return to the menu.`;
    updateViewport();
    hardeningApi.focusFirstAvailable([errorMenuButton, loadError]);
  }

  async function startBattlefield(options) {
    if (stage !== "menu" || browserFeatureActionPending || browserFeatureReleasePending) return;
    const generation = loadGeneration + 1;
    loadGeneration = generation;
    beginButton.disabled = true;
    if (!options || options.requestBrowserFeatures !== false) {
      browserFeatureActionPending = true;
      const request = trackBrowserFeatureRequest(
        browserFeatures.requestForBegin({ fullscreen: fullscreenOnBegin.checked })
      );
      request.catch(() => {
        browserFeatureStatus.textContent = "Browser feature requests failed safely; the viewport gates remain authoritative.";
      });
      request.then(
        () => { if (!browserFeatureReleasePending) browserFeatureActionPending = false; },
        () => { if (!browserFeatureReleasePending) browserFeatureActionPending = false; }
      );
    }
    unloadMenuArt();
    stage = "battlefield";
    shell.dataset.stage = stage;
    notice = "Loading local terrain, full-body entity art, and structure damage art";
    updateViewport();
    hardeningApi.focusFirstAvailable([playFrame]);
    let candidateGround = null;
    let candidateEntityAssets = null;
    let candidateStructureAssets = null;
    try {
      const results = await Promise.allSettled([
        loadGround(),
        entityAssetsApi.load({
          tier: artTier.value,
          ownerSeatByFaction: { "astral-concord": 1, "gravebound-court": 2 },
          baseUrl: new URL("../phase3/", document.baseURI)
        }),
        structureAssetsApi.load({
          ownerSeatByFaction: { "astral-concord": 1, "gravebound-court": 2 },
          capturableOwnerSeats: [1, 2],
          baseUrl: new URL("../phase5/", document.baseURI)
        })
      ]);
      if (results[0].status === "fulfilled") candidateGround = results[0].value;
      if (results[1].status === "fulfilled") candidateEntityAssets = results[1].value;
      if (results[2].status === "fulfilled") candidateStructureAssets = results[2].value;
      const failed = results.find((result) => result.status === "rejected");
      if (failed) throw failed.reason;
      if (generation !== loadGeneration || stage !== "battlefield") {
        releaseImage(candidateGround);
        candidateEntityAssets.dispose();
        candidateStructureAssets.dispose();
        return;
      }
      createRuntime(candidateGround, candidateEntityAssets, candidateStructureAssets);
      candidateGround = null;
      candidateEntityAssets = null;
      candidateStructureAssets = null;
    } catch (error) {
      if (candidateGround && candidateGround !== groundImage) releaseImage(candidateGround);
      if (candidateEntityAssets && candidateEntityAssets !== entityAssets) candidateEntityAssets.dispose();
      if (candidateStructureAssets && candidateStructureAssets !== structureAssets) candidateStructureAssets.dispose();
      if (generation === loadGeneration) showLoadError(error);
    }
  }

  async function returnToMenu() {
    beginButton.disabled = true;
    menuFullscreenButton.disabled = true;
    battlefieldFullscreenButton.disabled = true;
    const release = releaseBrowserFeatures("One or more app-owned browser features could not be released.")
      .catch(() => null);
    unloadRuntime();
    suspension.setMany({ manual: false, bfcache: false });
    stage = "menu";
    shell.dataset.stage = stage;
    notice = "";
    if (settingsDialog.open) settingsDialog.close();
    loadMenuArt();
    updateViewport();
    hardeningApi.focusFirstAvailable([settingsButton]);
    await release;
    if (destroyed || stage !== "menu") return;
    beginButton.disabled = false;
    menuFullscreenButton.disabled = false;
    battlefieldFullscreenButton.disabled = false;
    hardeningApi.focusFirstAvailable([beginButton]);
  }

  function onNavigationToggle() {
    navigationVisible = !navigationVisible;
    navigationButton.setAttribute("aria-pressed", String(navigationVisible));
    renderer?.setNavigationVisible(navigationVisible);
    announce(navigationVisible ? "Navigation blockers visible" : "Navigation blockers hidden");
    updateDebugStatus();
  }

  function onPauseToggle() {
    const next = !manualPaused();
    suspension.set("manual", next);
    previousFrameTime = 0;
    accumulatedTime = 0;
    if (next) input?.resetTransient();
    syncInputState();
    announce(next ? "Authoritative simulation paused" : "Authoritative simulation resumed");
    updateDebugStatus();
    renderDynamic();
  }

  function onResetCamera() { camera.reset(); renderCamera(); }
  function zoomBy(factor) {
    const view = camera.snapshot();
    camera.zoomAt(view.zoom * factor, view.viewportWidth / 2, view.viewportHeight / 2);
    renderCamera();
  }
  function toggleContextMode(mode) {
    setContextMode(input?.snapshot().contextMode === mode ? null : mode);
  }
  function onMoveModeToggle() { toggleContextMode("move"); }
  function onAttackModeToggle() { toggleContextMode("attack"); }
  function onAttackMoveModeToggle() { toggleContextMode("attack-move"); }
  function onDefendPointModeToggle() { toggleContextMode("defend-point"); }
  function onDefendEntityModeToggle() { toggleContextMode("defend-entity"); }
  function onRallyModeToggle() { toggleContextMode("rally"); }

  function onTacticalKeyDown(event) {
    const interactiveTarget = event.target.closest?.("button, a, input, select, textarea, dialog, [contenteditable='true']");
    if (event.code === "Escape" && input) {
      const hadContextMode = input.snapshot().contextMode !== null;
      input.resetTransient();
      if (hadContextMode) announce("Tactical mode cleared");
      if (!interactiveTarget) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (interactiveTarget) return;
    const action = {
      KeyM: onMoveModeToggle,
      KeyF: onAttackModeToggle,
      KeyX: onAttackMoveModeToggle,
      KeyD: onDefendPointModeToggle,
      KeyG: onDefendEntityModeToggle,
      KeyS: stopSelection
    }[event.code];
    if (!action || selectedEntityIds.size === 0 || effectivePaused()
      || currentSnapshot?.match?.status === "complete") return;
    action();
    event.preventDefault();
    event.stopPropagation();
  }

  function onVisibilityChange() {
    const hidden = document.visibilityState !== "visible";
    suspension.set("hidden", hidden);
    previousFrameTime = 0;
    accumulatedTime = 0;
    if (hidden) input?.resetTransient();
    syncInputState();
    announce(effectivePaused() ? `Simulation ${pauseReasonLabel()}` : "Simulation resumed");
    if (!effectivePaused()) renderCamera();
  }

  function onWindowBlur() {
    suspension.set("blur", true);
    input?.resetTransient();
    syncInputState();
    announce("Simulation paused while the window is unfocused");
  }

  function onWindowFocus() {
    suspension.set("blur", false);
    syncInputState();
    announce(effectivePaused() ? `Simulation ${pauseReasonLabel()}` : "Simulation resumed");
    if (!effectivePaused()) renderCamera();
  }

  function onPlayFramePointerDown(event) {
    const interactive = event.target.closest?.("button, a, input, select, textarea, dialog, [contenteditable='true']");
    if (!interactive && event.pointerType !== "touch") playFrame.focus({ preventScroll: true });
  }

  function onPageHide(event) {
    if (event.persisted) {
      suspension.set("bfcache", true);
      input?.resetTransient();
      syncInputState();
    } else destroy();
  }

  function onPageShow(event) {
    if (destroyed || !event.persisted) return;
    const focusPatch = typeof document.hasFocus === "function"
      ? { blur: !document.hasFocus() }
      : {};
    suspension.setMany({
      bfcache: false,
      hidden: document.visibilityState !== "visible",
      ...focusPatch
    });
    previousFrameTime = 0;
    accumulatedTime = 0;
    updateViewport();
    if (!effectivePaused()) renderCamera();
  }

  function onReducedMotionChange() {
    dynamicRenderer?.setReducedMotion(reducedMotionQuery.matches);
    updateMovementFrames();
    renderDynamic();
  }

  function onSettingsOpen() {
    settingsInvoker = settingsButton;
    if (typeof settingsDialog.showModal === "function") settingsDialog.showModal();
    else settingsDialog.setAttribute("open", "");
    hardeningApi.focusFirstAvailable([fullscreenOnBegin, artTier, settingsDialog.querySelector("button[value='close']")]);
  }

  function onSettingsClose() {
    const target = settingsInvoker;
    settingsInvoker = null;
    hardeningApi.focusFirstAvailable([target, stage === "battlefield" ? playFrame : beginButton]);
  }

  function onZoomOut() { zoomBy(1 / cameraApi.configuration.buttonZoomFactor); }
  function onZoomIn() { zoomBy(cameraApi.configuration.buttonZoomFactor); }
  function onClearSelectionClick() { clearSelection(); }
  function onStructureSelectChange() {
    if (structureSelect.value) selectStructure(structureSelect.value);
    else clearSelection();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unloadRuntime();
    unloadMenuArt();
    if (settingsDialog.open) settingsDialog.close();
    if (reviewFrame) window.cancelAnimationFrame(reviewFrame);
    resizeObserver?.disconnect();
    window.removeEventListener("resize", updateViewport);
    window.removeEventListener("orientationchange", updateViewport);
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("focus", onWindowFocus);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    document.removeEventListener("fullscreenerror", onFullscreenError);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    beginButton.removeEventListener("click", startBattlefield);
    settingsButton.removeEventListener("click", onSettingsOpen);
    settingsDialog.removeEventListener("close", onSettingsClose);
    menuFullscreenButton.removeEventListener("click", onFullscreenRequest);
    battlefieldFullscreenButton.removeEventListener("click", onFullscreenRequest);
    navigationButton.removeEventListener("click", onNavigationToggle);
    pauseButton.removeEventListener("click", onPauseToggle);
    resetCameraButton.removeEventListener("click", onResetCamera);
    zoomOutButton.removeEventListener("click", onZoomOut);
    zoomInButton.removeEventListener("click", onZoomIn);
    moveModeButton.removeEventListener("click", onMoveModeToggle);
    attackModeButton.removeEventListener("click", onAttackModeToggle);
    attackMoveModeButton.removeEventListener("click", onAttackMoveModeToggle);
    defendPointModeButton.removeEventListener("click", onDefendPointModeToggle);
    defendEntityModeButton.removeEventListener("click", onDefendEntityModeToggle);
    stopButton.removeEventListener("click", stopSelection);
    rallyModeButton.removeEventListener("click", onRallyModeToggle);
    clearRallyButton.removeEventListener("click", clearRally);
    clearSelectionButton.removeEventListener("click", onClearSelectionClick);
    structureSelect.removeEventListener("change", onStructureSelectChange);
    productionOptions.removeEventListener("click", onProductionClick);
    productionQueue.removeEventListener("click", onQueueClick);
    menuButton.removeEventListener("click", returnToMenu);
    errorMenuButton.removeEventListener("click", returnToMenu);
    playFrame.removeEventListener("pointerdown", onPlayFramePointerDown);
    playFrame.removeEventListener("keydown", onTacticalKeyDown);
    if (typeof reducedMotionQuery.removeEventListener === "function") {
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
    } else if (typeof reducedMotionQuery.removeListener === "function") {
      reducedMotionQuery.removeListener(onReducedMotionChange);
    }
    suspension.destroy();
    browserFeatures.cancel();
    Promise.all([
      browserReleasePromise.catch(() => null),
      waitForBrowserFeatureRequests()
    ]).then(() => browserFeatures.destroy()).catch(() => {});
  }

  beginButton.addEventListener("click", startBattlefield);
  settingsButton.addEventListener("click", onSettingsOpen);
  settingsDialog.addEventListener("close", onSettingsClose);
  menuFullscreenButton.addEventListener("click", onFullscreenRequest);
  battlefieldFullscreenButton.addEventListener("click", onFullscreenRequest);
  navigationButton.addEventListener("click", onNavigationToggle);
  pauseButton.addEventListener("click", onPauseToggle);
  resetCameraButton.addEventListener("click", onResetCamera);
  zoomOutButton.addEventListener("click", onZoomOut);
  zoomInButton.addEventListener("click", onZoomIn);
  moveModeButton.addEventListener("click", onMoveModeToggle);
  attackModeButton.addEventListener("click", onAttackModeToggle);
  attackMoveModeButton.addEventListener("click", onAttackMoveModeToggle);
  defendPointModeButton.addEventListener("click", onDefendPointModeToggle);
  defendEntityModeButton.addEventListener("click", onDefendEntityModeToggle);
  stopButton.addEventListener("click", stopSelection);
  rallyModeButton.addEventListener("click", onRallyModeToggle);
  clearRallyButton.addEventListener("click", clearRally);
  clearSelectionButton.addEventListener("click", onClearSelectionClick);
  structureSelect.addEventListener("change", onStructureSelectChange);
  productionOptions.addEventListener("click", onProductionClick);
  productionQueue.addEventListener("click", onQueueClick);
  menuButton.addEventListener("click", returnToMenu);
  errorMenuButton.addEventListener("click", returnToMenu);
  playFrame.addEventListener("pointerdown", onPlayFramePointerDown);
  playFrame.addEventListener("keydown", onTacticalKeyDown);
  window.addEventListener("resize", updateViewport);
  window.addEventListener("orientationchange", updateViewport);
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("focus", onWindowFocus);
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("fullscreenerror", onFullscreenError);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  if (typeof reducedMotionQuery.addEventListener === "function") reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  else if (typeof reducedMotionQuery.addListener === "function") reducedMotionQuery.addListener(onReducedMotionChange);

  if (query.get("art") === "compact") artTier.value = "compact";
  resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(updateViewport) : { observe() {}, disconnect() {} };
  resizeObserver.observe(shell);
  productionProgress.setAttribute("aria-valuetext", "Queue empty");
  updateFullscreenUi();
  loadMenuArt();
  updateViewport();
  if (query.get("view") === "battlefield") {
    reviewFrame = window.requestAnimationFrame(() => {
      reviewFrame = 0;
      startBattlefield({ requestBrowserFeatures: false });
    });
  }
}());
