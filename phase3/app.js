/* global window, document, screen, Image, ResizeObserver */
"use strict";

(function startPhase3Movement() {
  const map = window.AeonPhase2Map;
  const cameraApi = window.AeonPhase2Camera;
  const baseRendererApi = window.AeonPhase2Renderer;
  const configApi = window.AeonPhase3Config;
  const simulationApi = window.AeonPhase3Simulation;
  const replayApi = window.AeonPhase3Replay;
  const assetManifest = window.AeonPhase3AssetManifest;
  const assetsApi = window.AeonPhase3Assets;
  const dynamicRendererApi = window.AeonPhase3Renderer;
  const inputApi = window.AeonPhase3Input;
  if (
    !map
    || !cameraApi
    || !baseRendererApi
    || !configApi
    || !simulationApi
    || !replayApi
    || !assetManifest
    || !assetsApi
    || !dynamicRendererApi
    || !inputApi
  ) return;

  const { configuration } = configApi;
  const shell = document.getElementById("app-shell");
  const menuScreen = document.getElementById("menu-screen");
  const menuArt = document.getElementById("menu-art");
  const menuFallback = document.getElementById("menu-fallback");
  const battlefieldScreen = document.getElementById("battlefield-screen");
  const playFrame = document.getElementById("play-frame");
  const orientationGate = document.getElementById("orientation-gate");
  const sizeGate = document.getElementById("size-gate");
  const loadError = document.getElementById("load-error");
  const loadErrorDetail = document.getElementById("load-error-detail");
  const worldStatus = document.getElementById("world-status");
  const selectionSummary = document.getElementById("selection-summary");
  const selectionMarquee = document.getElementById("selection-marquee");
  const beginButton = document.getElementById("begin-button");
  const settingsButton = document.getElementById("settings-button");
  const settingsDialog = document.getElementById("settings-dialog");
  const fullscreenOnBegin = document.getElementById("fullscreen-on-begin");
  const artTier = document.getElementById("art-tier");
  const menuFullscreenButton = document.getElementById("menu-fullscreen-button");
  const battlefieldFullscreenButton = document.getElementById("battlefield-fullscreen-button");
  const navigationButton = document.getElementById("navigation-button");
  const pauseButton = document.getElementById("pause-button");
  const resetCameraButton = document.getElementById("reset-camera-button");
  const zoomOutButton = document.getElementById("zoom-out-button");
  const zoomInButton = document.getElementById("zoom-in-button");
  const moveModeButton = document.getElementById("move-mode-button");
  const clearSelectionButton = document.getElementById("clear-selection-button");
  const menuButton = document.getElementById("menu-button");
  const errorMenuButton = document.getElementById("error-menu-button");
  const canvases = Object.fromEntries(
    Array.from(playFrame.querySelectorAll("canvas[data-layer]"), (canvas) => [canvas.dataset.layer, canvas])
  );

  const home = map.layers.anchors.cameraStarts[0];
  const camera = cameraApi.createCamera(map.world.width, map.world.height, home);
  const query = new URLSearchParams(window.location.search);
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const selectedEntityIds = new Set();
  const movementFrames = new Map();
  const destinationFeedback = [];
  const pendingDestinations = new Map();
  let stage = "menu";
  let renderer = null;
  let dynamicRenderer = null;
  let input = null;
  let simulation = null;
  let replay = null;
  let currentSnapshot = null;
  let assets = null;
  let groundImage = null;
  let playableViewport = false;
  let manualPaused = false;
  let lifecyclePaused = false;
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

  function compareIdentifiers(first, second) {
    return first < second ? -1 : first > second ? 1 : 0;
  }

  function setRect(element, rect) {
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
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
    return manualPaused || lifecyclePaused || !playableViewport;
  }

  function selectedEntities() {
    if (!currentSnapshot) return [];
    return currentSnapshot.entities.filter((entity) => selectedEntityIds.has(entity.id));
  }

  function readableKind(kind) {
    return kind.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  }

  function updateSelectionSummary() {
    const entities = selectedEntities();
    if (entities.length === 0) selectionSummary.textContent = "None";
    else if (entities.length === 1) selectionSummary.textContent = readableKind(entities[0].kind);
    else selectionSummary.textContent = `${entities.length} Astral entities`;
    clearSelectionButton.disabled = entities.length === 0;
  }

  function updateWorldStatus(message) {
    if (message) notice = message;
    if (!currentSnapshot) {
      worldStatus.textContent = notice || "Preparing local movement art…";
      return;
    }
    const view = camera.snapshot();
    const pauseLabel = effectivePaused() ? " · Paused" : "";
    const noticeLabel = notice ? ` · ${notice}` : "";
    worldStatus.textContent = `Tick ${currentSnapshot.tick} · ${selectedEntityIds.size} selected · Hash ${lastChecksum} · Zoom ${view.zoom.toFixed(2)}×${pauseLabel}${noticeLabel}`;
  }

  function setFeedback(x, y, status, label) {
    destinationFeedback.length = 0;
    destinationFeedback.push(Object.freeze({ x, y, status, label }));
  }

  function clearSelection() {
    selectedEntityIds.clear();
    if (input) input.setMoveMode(false);
    updateSelectionSummary();
    updateWorldStatus("Selection cleared");
    renderDynamic();
  }

  function replaceSelection(entityIds, additive) {
    if (!additive) selectedEntityIds.clear();
    for (const entityId of entityIds.slice().sort(compareIdentifiers)) {
      if (selectedEntityIds.size >= configuration.selectionCap) break;
      selectedEntityIds.add(entityId);
    }
    updateSelectionSummary();
    updateWorldStatus(selectedEntityIds.size ? "Selection ready" : "No owned entity selected");
    renderDynamic();
  }

  function entityAtWorldPoint(point) {
    if (!currentSnapshot) return null;
    const cameraScale = camera.snapshot().scale;
    const pointerTolerance = 18 / Math.max(cameraScale, 0.001);
    let nearest = null;
    let nearestDistance = Infinity;
    for (const entity of currentSnapshot.entities) {
      if (entity.ownerSeat !== 1) continue;
      const entityX = entity.x / configuration.positionScale;
      const entityY = entity.y / configuration.positionScale;
      const radius = Math.max(entity.radius / configuration.positionScale, pointerTolerance);
      const distanceSquared = (entityX - point.x) ** 2 + (entityY - point.y) ** 2;
      if (distanceSquared > radius * radius) continue;
      if (
        distanceSquared < nearestDistance
        || (distanceSquared === nearestDistance && nearest && compareIdentifiers(entity.id, nearest.id) < 0)
      ) {
        nearest = entity;
        nearestDistance = distanceSquared;
      }
    }
    return nearest;
  }

  function onSelectPoint(payload) {
    const entity = entityAtWorldPoint(payload.worldPoint);
    if (!entity) {
      if (!payload.additive) clearSelection();
      return;
    }
    replaceSelection([entity.id], payload.additive);
  }

  function onSelectBox(payload) {
    if (!currentSnapshot) return;
    const selected = currentSnapshot.entities
      .filter((entity) => {
        if (entity.ownerSeat !== 1) return false;
        const x = entity.x / configuration.positionScale;
        const y = entity.y / configuration.positionScale;
        return (
          x >= payload.worldBounds.minX
          && x <= payload.worldBounds.maxX
          && y >= payload.worldBounds.minY
          && y <= payload.worldBounds.maxY
        );
      })
      .map((entity) => entity.id);
    replaceSelection(selected, payload.additive);
  }

  function onSelectionPreview(rect) {
    selectionMarquee.hidden = !rect;
    if (!rect) return;
    selectionMarquee.style.left = `${rect.left}px`;
    selectionMarquee.style.top = `${rect.top}px`;
    selectionMarquee.style.width = `${rect.width}px`;
    selectionMarquee.style.height = `${rect.height}px`;
  }

  function rejectionLabel(code) {
    const labels = {
      "selection-cap": "Select one or more Astral entities first",
      "blocked-destination": "That destination is blocked",
      "target-tick": "That movement order arrived too late",
      "command-cap": "The command queue is full"
    };
    return labels[code] || "Movement order rejected";
  }

  function onMoveRequest(payload) {
    if (!simulation || selectedEntityIds.size === 0) {
      updateWorldStatus("Select one or more Astral entities first");
      return;
    }
    const scale = configuration.positionScale;
    const destination = Object.freeze({
      x: Math.max(0, Math.min(map.world.width * scale, Math.round(payload.worldPoint.x * scale))),
      y: Math.max(0, Math.min(map.world.height * scale, Math.round(payload.worldPoint.y * scale)))
    });
    const request = Object.freeze({
      protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId,
      kind: "MOVE",
      issuingPlayer: 1,
      targetTick: simulation.tick + configuration.commandLeadMinTicks,
      entityIds: Array.from(selectedEntityIds).sort(compareIdentifiers),
      destination
    });
    const receipt = simulation.submitMove(request);
    if (!receipt.ok) {
      setFeedback(destination.x, destination.y, "rejected", "Rejected");
      updateWorldStatus(rejectionLabel(receipt.code));
      renderDynamic();
      return;
    }
    replayApi.appendAccepted(replay, receipt);
    pendingDestinations.set(receipt.command.sequence, destination);
    setFeedback(destination.x, destination.y, "accepted", "Queued");
    updateWorldStatus(`Move queued for tick ${receipt.command.targetTick}`);
    renderDynamic();
  }

  function processSimulationEvents(events) {
    for (const event of events) {
      if (event.type === "command") {
        const destination = pendingDestinations.get(event.sequence);
        pendingDestinations.delete(event.sequence);
        if (event.status === "rejected" && destination) {
          setFeedback(destination.x, destination.y, "unreachable", "Unreachable");
          notice = "Formation route is unreachable; earlier orders were preserved";
        } else if (event.status === "applied" && destination) {
          setFeedback(destination.x, destination.y, "accepted", "Moving");
          notice = "Formation movement started";
        }
      } else if (event.type === "entity" && selectedEntityIds.has(event.entityId)) {
        if (event.status === "stopped") {
          if (destinationFeedback[0]) {
            setFeedback(destinationFeedback[0].x, destinationFeedback[0].y, "stopped", "Blocked");
          }
          notice = "An entity stopped after bounded congestion recovery";
        } else if (event.status === "completed") {
          const allIdle = selectedEntities().every((entity) => entity.order === "IDLE");
          if (allIdle && destinationFeedback[0]) {
            setFeedback(destinationFeedback[0].x, destinationFeedback[0].y, "accepted", "Arrived");
            notice = "Selected formation arrived";
          }
        }
      }
    }
  }

  function updateMovementFrames() {
    movementFrames.clear();
    if (!currentSnapshot || reducedMotionQuery.matches) return;
    const frame = Math.floor(currentSnapshot.tick * 8 / configuration.tickRate) % 4;
    for (const entity of currentSnapshot.entities) {
      if (entity.order === "MOVE") movementFrames.set(entity.id, frame);
    }
  }

  function renderState() {
    return Object.freeze({
      entities: currentSnapshot ? currentSnapshot.entities : [],
      selectedEntityIds,
      movementFrames,
      destinationFeedback
    });
  }

  function renderDynamic() {
    if (renderer) renderer.renderDynamic();
  }

  function renderCamera() {
    if (renderer) renderer.render();
    updateWorldStatus();
  }

  function animationLoop(timestamp) {
    animationFrame = 0;
    if (destroyed || stage !== "battlefield" || !simulation || !renderer) return;
    if (!effectivePaused()) {
      if (previousFrameTime === 0) previousFrameTime = timestamp;
      const elapsed = Math.min(
        Math.max(0, timestamp - previousFrameTime),
        configuration.tickDurationMs * configuration.maxCatchUpTicks
      );
      previousFrameTime = timestamp;
      accumulatedTime += elapsed;
      let steps = 0;
      while (accumulatedTime >= configuration.tickDurationMs && steps < configuration.maxCatchUpTicks) {
        const result = simulation.step();
        accumulatedTime -= configuration.tickDurationMs;
        steps += 1;
        currentSnapshot = simulation.snapshot();
        processSimulationEvents(result.events);
        if (currentSnapshot.tick % configuration.checksumIntervalTicks === 0) {
          lastChecksum = replayApi.checksum(currentSnapshot).slice(-8);
        }
      }
    } else {
      previousFrameTime = timestamp;
      accumulatedTime = 0;
    }
    updateMovementFrames();
    updateSelectionSummary();
    renderDynamic();
    updateWorldStatus();
    animationFrame = window.requestAnimationFrame(animationLoop);
  }

  function syncInputState() {
    if (input) input.setEnabled(stage === "battlefield" && playableViewport && !effectivePaused());
    pauseButton.setAttribute("aria-pressed", String(manualPaused));
    pauseButton.textContent = manualPaused ? "Resume" : "Pause";
  }

  function updateViewport() {
    if (destroyed) return;
    const width = shell.clientWidth;
    const height = shell.clientHeight;
    const inspection = cameraApi.inspectViewport(width, height);
    playableViewport = inspection.playable;
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
      const menuRect = containRect(inspection.playRect, map.world.width / map.world.height);
      setRect(menuScreen, menuRect);
      setRect(battlefieldScreen, inspection.playRect);
      if (renderer) {
        renderer.resize(
          inspection.playRect.width,
          inspection.playRect.height,
          window.devicePixelRatio || 1
        );
      }
    } else if (input) {
      input.resetTransient();
    }
    shell.dataset.orientation = inspection.portrait ? "portrait" : "landscape";
    shell.dataset.viewport = playableViewport ? "supported" : "gated";
    syncInputState();
    updateWorldStatus();
  }

  function onMenuArtLoad() {
    menuFallback.hidden = true;
  }

  function onMenuArtError() {
    menuFallback.hidden = false;
  }

  function loadMenuArt() {
    menuArt.addEventListener("load", onMenuArtLoad, { once: true });
    menuArt.addEventListener("error", onMenuArtError, { once: true });
    menuArt.src = menuArt.dataset.src;
  }

  function unloadMenuArt() {
    menuArt.removeEventListener("load", onMenuArtLoad);
    menuArt.removeEventListener("error", onMenuArtError);
    menuArt.removeAttribute("src");
  }

  function loadGround() {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = function onGroundLoad() {
        if (
          image.naturalWidth !== map.layers.ground.width
          || image.naturalHeight !== map.layers.ground.height
        ) {
          image.onload = null;
          image.onerror = null;
          image.removeAttribute("src");
          reject(new Error("terrain-dimensions"));
          return;
        }
        resolve(image);
      };
      image.onerror = function onGroundError() {
        image.onload = null;
        image.onerror = null;
        image.removeAttribute("src");
        reject(new Error("terrain-load"));
      };
      image.src = map.layers.ground.image;
    });
  }

  function unloadRuntime() {
    loadGeneration += 1;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    previousFrameTime = 0;
    accumulatedTime = 0;
    if (input) input.destroy();
    if (renderer) renderer.destroy();
    if (assets && typeof assets.dispose === "function") assets.dispose();
    input = null;
    renderer = null;
    dynamicRenderer = null;
    assets = null;
    simulation = null;
    replay = null;
    currentSnapshot = null;
    selectedEntityIds.clear();
    movementFrames.clear();
    destinationFeedback.length = 0;
    pendingDestinations.clear();
    selectionMarquee.hidden = true;
    if (groundImage) {
      groundImage.onload = null;
      groundImage.onerror = null;
      groundImage.removeAttribute("src");
    }
    groundImage = null;
    lastChecksum = "pending";
    updateSelectionSummary();
  }

  function requestFullscreen() {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        return Promise.resolve(document.documentElement.requestFullscreen({ navigationUI: "hide" })).catch(() => {});
      } catch {
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }

  function requestLandscapeLock() {
    if (screen.orientation && typeof screen.orientation.lock === "function") {
      try {
        return Promise.resolve(screen.orientation.lock("landscape")).catch(() => {});
      } catch {
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }

  function createRuntime(loadedGround, loadedAssets) {
    groundImage = loadedGround;
    assets = loadedAssets;
    simulation = simulationApi.createSimulation({ map, seed: 0x3a0e2026 });
    currentSnapshot = simulation.snapshot();
    replay = replayApi.createReplay(currentSnapshot, { map });
    lastChecksum = replayApi.checksum(currentSnapshot).slice(-8);
    dynamicRenderer = dynamicRendererApi.createDynamicRenderer({
      camera,
      configuration,
      assets,
      reducedMotion: reducedMotionQuery.matches
    });
    renderer = baseRendererApi.createRenderer({
      canvases,
      map,
      camera,
      groundImage,
      renderScaleCap: cameraApi.configuration.renderScaleCap,
      onDynamicDraw(context) {
        dynamicRenderer.draw(context, renderState());
      }
    });
    input = inputApi.createInput({
      target: playFrame,
      camera,
      configuration: cameraApi.configuration,
      onCameraChange: renderCamera,
      onSelectPoint,
      onSelectBox,
      onSelectionPreview,
      onMoveRequest,
      onMoveModeChange(enabled) {
        moveModeButton.setAttribute("aria-pressed", String(enabled));
        moveModeButton.textContent = enabled ? "Choose terrain" : "Move";
      },
      onTransientReset() {
        selectionMarquee.hidden = true;
      }
    });
    renderer.setNavigationVisible(navigationVisible);
    navigationButton.setAttribute("aria-pressed", String(navigationVisible));
    camera.reset();
    notice = `Local ${assets.cellSize}px entity art ready`;
    updateViewport();
    syncInputState();
    playFrame.focus({ preventScroll: true });
    animationFrame = window.requestAnimationFrame(animationLoop);
  }

  function showLoadError(error) {
    unloadRuntime();
    stage = "error";
    shell.dataset.stage = stage;
    const code = error && typeof error.code === "string" ? error.code : "local-preload-failed";
    loadErrorDetail.textContent = `No entity or simulation was started (${code}). Reload the page or return to the menu.`;
    updateViewport();
  }

  async function startBattlefield(options) {
    if (stage !== "menu") return;
    const requestBrowserFeatures = !options || options.requestBrowserFeatures !== false;
    const generation = loadGeneration + 1;
    loadGeneration = generation;
    beginButton.disabled = true;
    if (requestBrowserFeatures) {
      if (fullscreenOnBegin.checked) requestFullscreen().then(requestLandscapeLock);
      else requestLandscapeLock();
    }
    unloadMenuArt();
    stage = "battlefield";
    shell.dataset.stage = stage;
    notice = "Loading approved local terrain and entity art";
    updateViewport();
    let candidateGround = null;
    let candidateAssets = null;
    try {
      const results = await Promise.allSettled([
        loadGround(),
        assetsApi.load({
          tier: artTier.value,
          ownerSeatByFaction: {
            "astral-concord": 1,
            "gravebound-court": 2
          },
          onError(message) {
            notice = message;
            updateWorldStatus();
          }
        })
      ]);
      if (results[0].status === "fulfilled") candidateGround = results[0].value;
      if (results[1].status === "fulfilled") candidateAssets = results[1].value;
      const failed = results.find((result) => result.status === "rejected");
      if (failed) throw failed.reason;
      const loadedGround = candidateGround;
      const loadedAssets = candidateAssets;
      if (generation !== loadGeneration || stage !== "battlefield") {
        loadedGround.removeAttribute("src");
        if (loadedAssets && typeof loadedAssets.dispose === "function") loadedAssets.dispose();
        return;
      }
      createRuntime(loadedGround, loadedAssets);
      candidateGround = null;
      candidateAssets = null;
    } catch (error) {
      if (candidateGround && candidateGround !== groundImage) candidateGround.removeAttribute("src");
      if (candidateAssets && candidateAssets !== assets && typeof candidateAssets.dispose === "function") {
        candidateAssets.dispose();
      }
      if (generation === loadGeneration) showLoadError(error);
    }
  }

  function returnToMenu() {
    unloadRuntime();
    manualPaused = false;
    lifecyclePaused = false;
    stage = "menu";
    shell.dataset.stage = stage;
    beginButton.disabled = false;
    notice = "";
    loadMenuArt();
    if (screen.orientation && typeof screen.orientation.unlock === "function") screen.orientation.unlock();
    updateViewport();
    beginButton.focus({ preventScroll: true });
  }

  function onNavigationToggle() {
    navigationVisible = !navigationVisible;
    navigationButton.setAttribute("aria-pressed", String(navigationVisible));
    if (renderer) renderer.setNavigationVisible(navigationVisible);
    updateWorldStatus(navigationVisible ? "Navigation blockers visible" : "Navigation blockers hidden");
  }

  function onPauseToggle() {
    manualPaused = !manualPaused;
    previousFrameTime = 0;
    accumulatedTime = 0;
    if (input && manualPaused) input.resetTransient();
    syncInputState();
    updateWorldStatus(manualPaused ? "Authoritative movement paused" : "Authoritative movement resumed");
  }

  function onResetCamera() {
    camera.reset();
    renderCamera();
  }

  function zoomBy(factor) {
    const view = camera.snapshot();
    camera.zoomAt(view.zoom * factor, view.viewportWidth / 2, view.viewportHeight / 2);
    renderCamera();
  }

  function onMoveModeToggle() {
    if (input) input.setMoveMode(input.snapshot().moveMode === false);
    else updateWorldStatus("Movement controls are still loading");
  }

  function onVisibilityChange() {
    lifecyclePaused = document.visibilityState !== "visible";
    previousFrameTime = 0;
    accumulatedTime = 0;
    if (lifecyclePaused && input) input.resetTransient();
    syncInputState();
    updateWorldStatus(lifecyclePaused ? "Movement paused while the page is hidden" : "Movement resumed");
  }

  function onPlayFramePointerDown(event) {
    const interactive = event.target.closest && event.target.closest("button, a, input, select, textarea, dialog, [contenteditable='true']");
    if (!interactive && event.pointerType !== "touch") playFrame.focus({ preventScroll: true });
  }

  function onPageHide(event) {
    if (event.persisted) {
      lifecyclePaused = true;
      if (input) input.resetTransient();
      syncInputState();
      return;
    }
    destroy();
  }

  function onPageShow(event) {
    if (destroyed || !event.persisted) return;
    lifecyclePaused = document.visibilityState !== "visible";
    previousFrameTime = 0;
    accumulatedTime = 0;
    updateViewport();
    renderCamera();
  }

  function onReducedMotionChange() {
    if (dynamicRenderer) dynamicRenderer.setReducedMotion(reducedMotionQuery.matches);
    updateMovementFrames();
    renderDynamic();
  }

  function onSettingsOpen() {
    if (typeof settingsDialog.showModal === "function") settingsDialog.showModal();
    else settingsDialog.setAttribute("open", "");
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unloadRuntime();
    unloadMenuArt();
    if (reviewFrame) window.cancelAnimationFrame(reviewFrame);
    if (resizeObserver) resizeObserver.disconnect();
    window.removeEventListener("resize", updateViewport);
    window.removeEventListener("orientationchange", updateViewport);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    beginButton.removeEventListener("click", startBattlefield);
    settingsButton.removeEventListener("click", onSettingsOpen);
    menuFullscreenButton.removeEventListener("click", requestFullscreen);
    battlefieldFullscreenButton.removeEventListener("click", requestFullscreen);
    navigationButton.removeEventListener("click", onNavigationToggle);
    pauseButton.removeEventListener("click", onPauseToggle);
    resetCameraButton.removeEventListener("click", onResetCamera);
    zoomOutButton.removeEventListener("click", onZoomOut);
    zoomInButton.removeEventListener("click", onZoomIn);
    moveModeButton.removeEventListener("click", onMoveModeToggle);
    clearSelectionButton.removeEventListener("click", clearSelection);
    menuButton.removeEventListener("click", returnToMenu);
    errorMenuButton.removeEventListener("click", returnToMenu);
    playFrame.removeEventListener("pointerdown", onPlayFramePointerDown);
    if (typeof reducedMotionQuery.removeEventListener === "function") {
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
    } else if (typeof reducedMotionQuery.removeListener === "function") {
      reducedMotionQuery.removeListener(onReducedMotionChange);
    }
  }

  function onZoomOut() {
    zoomBy(1 / cameraApi.configuration.buttonZoomFactor);
  }

  function onZoomIn() {
    zoomBy(cameraApi.configuration.buttonZoomFactor);
  }

  beginButton.addEventListener("click", startBattlefield);
  settingsButton.addEventListener("click", onSettingsOpen);
  menuFullscreenButton.addEventListener("click", requestFullscreen);
  battlefieldFullscreenButton.addEventListener("click", requestFullscreen);
  navigationButton.addEventListener("click", onNavigationToggle);
  pauseButton.addEventListener("click", onPauseToggle);
  resetCameraButton.addEventListener("click", onResetCamera);
  zoomOutButton.addEventListener("click", onZoomOut);
  zoomInButton.addEventListener("click", onZoomIn);
  moveModeButton.addEventListener("click", onMoveModeToggle);
  clearSelectionButton.addEventListener("click", clearSelection);
  menuButton.addEventListener("click", returnToMenu);
  errorMenuButton.addEventListener("click", returnToMenu);
  playFrame.addEventListener("pointerdown", onPlayFramePointerDown);
  window.addEventListener("resize", updateViewport);
  window.addEventListener("orientationchange", updateViewport);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(onReducedMotionChange);
  }

  if (query.get("art") === "compact") artTier.value = "compact";
  resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(updateViewport)
    : Object.freeze({ observe() {}, disconnect() {} });
  resizeObserver.observe(shell);
  loadMenuArt();
  updateViewport();

  if (query.get("view") === "battlefield") {
    reviewFrame = window.requestAnimationFrame(() => {
      reviewFrame = 0;
      startBattlefield({ requestBrowserFeatures: false });
    });
  }
}());
