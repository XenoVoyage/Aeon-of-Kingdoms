/* global window, document, screen, Image, ResizeObserver */
"use strict";

(function startPhase2Foundation() {
  const map = window.AeonPhase2Map;
  const cameraApi = window.AeonPhase2Camera;
  const rendererApi = window.AeonPhase2Renderer;
  const inputApi = window.AeonPhase2Input;
  if (!map || !cameraApi || !rendererApi || !inputApi) return;

  const shell = document.getElementById("app-shell");
  const menuScreen = document.getElementById("menu-screen");
  const menuArt = document.getElementById("menu-art");
  const menuFallback = document.getElementById("menu-fallback");
  const battlefieldScreen = document.getElementById("battlefield-screen");
  const playFrame = document.getElementById("play-frame");
  const orientationGate = document.getElementById("orientation-gate");
  const sizeGate = document.getElementById("size-gate");
  const loadError = document.getElementById("load-error");
  const worldStatus = document.getElementById("world-status");
  const beginButton = document.getElementById("begin-button");
  const settingsButton = document.getElementById("settings-button");
  const settingsDialog = document.getElementById("settings-dialog");
  const fullscreenOnBegin = document.getElementById("fullscreen-on-begin");
  const menuFullscreenButton = document.getElementById("menu-fullscreen-button");
  const battlefieldFullscreenButton = document.getElementById("battlefield-fullscreen-button");
  const navigationButton = document.getElementById("navigation-button");
  const pauseButton = document.getElementById("pause-button");
  const resetCameraButton = document.getElementById("reset-camera-button");
  const zoomOutButton = document.getElementById("zoom-out-button");
  const zoomInButton = document.getElementById("zoom-in-button");
  const menuButton = document.getElementById("menu-button");
  const errorMenuButton = document.getElementById("error-menu-button");
  const canvases = Object.fromEntries(
    Array.from(playFrame.querySelectorAll("canvas[data-layer]"), (canvas) => [canvas.dataset.layer, canvas])
  );

  const home = map.layers.anchors.cameraStarts[0];
  const camera = cameraApi.createCamera(map.world.width, map.world.height, home);
  const query = new URLSearchParams(window.location.search);
  let stage = "menu";
  let renderer = null;
  let input = null;
  let groundImage = null;
  let playableViewport = false;
  let manualPaused = false;
  let lifecyclePaused = false;
  let navigationVisible = query.get("debug") === "1";
  let destroyed = false;
  let reviewFrame = 0;
  let resizeObserver = null;

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

  function updateWorldStatus(message) {
    if (message) {
      worldStatus.textContent = message;
      return;
    }
    const view = camera.snapshot();
    const pauseLabel = effectivePaused() ? " · Paused" : "";
    worldStatus.textContent = `Terrain ready · Camera ${Math.round(view.centerX)}, ${Math.round(view.centerY)} · Zoom ${view.zoom.toFixed(2)}×${pauseLabel}`;
  }

  function syncInputState() {
    if (input) input.setEnabled(stage === "battlefield" && playableViewport && !effectivePaused());
    pauseButton.setAttribute("aria-pressed", String(manualPaused));
    pauseButton.textContent = manualPaused ? "Resume" : "Pause";
  }

  function renderCamera() {
    if (renderer) renderer.render();
    updateWorldStatus();
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
    }

    shell.dataset.orientation = inspection.portrait ? "portrait" : "landscape";
    shell.dataset.viewport = playableViewport ? "supported" : "gated";
    if (!playableViewport && input) input.resetTransient();
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

  function unloadGround() {
    if (input) input.destroy();
    if (renderer) renderer.destroy();
    input = null;
    renderer = null;
    if (groundImage) {
      groundImage.onload = null;
      groundImage.onerror = null;
      groundImage.removeAttribute("src");
    }
    groundImage = null;
  }

  function requestFullscreen() {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        return Promise.resolve(document.documentElement.requestFullscreen({ navigationUI: "hide" }))
          .catch(() => {});
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

  function createRuntime(image) {
    renderer = rendererApi.createRenderer({
      canvases,
      map,
      camera,
      groundImage: image,
      renderScaleCap: cameraApi.configuration.renderScaleCap
    });
    input = inputApi.createInput({
      target: playFrame,
      camera,
      configuration: cameraApi.configuration,
      onChange: renderCamera,
      onTransientReset: updateWorldStatus
    });
    renderer.setNavigationVisible(navigationVisible);
    navigationButton.setAttribute("aria-pressed", String(navigationVisible));
    camera.reset();
    updateViewport();
    syncInputState();
    playFrame.focus({ preventScroll: true });
  }

  function showLoadError() {
    unloadGround();
    stage = "error";
    shell.dataset.stage = stage;
    updateViewport();
  }

  function startBattlefield(options) {
    if (stage === "battlefield") return;
    const requestBrowserFeatures = !options || options.requestBrowserFeatures !== false;
    beginButton.disabled = true;
    if (requestBrowserFeatures) {
      if (fullscreenOnBegin.checked) requestFullscreen().then(requestLandscapeLock);
      else requestLandscapeLock();
    }
    unloadMenuArt();
    stage = "battlefield";
    shell.dataset.stage = stage;
    updateViewport();
    updateWorldStatus("Loading approved local terrain…");

    groundImage = new Image();
    groundImage.decoding = "async";
    groundImage.onload = function onGroundLoad() {
      if (
        groundImage.naturalWidth !== map.layers.ground.width
        || groundImage.naturalHeight !== map.layers.ground.height
      ) {
        showLoadError();
        return;
      }
      createRuntime(groundImage);
    };
    groundImage.onerror = showLoadError;
    groundImage.src = map.layers.ground.image;
  }

  function returnToMenu() {
    unloadGround();
    manualPaused = false;
    lifecyclePaused = false;
    stage = "menu";
    shell.dataset.stage = stage;
    beginButton.disabled = false;
    loadMenuArt();
    if (screen.orientation && typeof screen.orientation.unlock === "function") screen.orientation.unlock();
    updateViewport();
    beginButton.focus({ preventScroll: true });
  }

  function onNavigationToggle() {
    navigationVisible = !navigationVisible;
    navigationButton.setAttribute("aria-pressed", String(navigationVisible));
    if (renderer) renderer.setNavigationVisible(navigationVisible);
    updateWorldStatus(navigationVisible ? "Navigation debug visible · Blockers are authored data, not sampled pixels" : null);
  }

  function onPauseToggle() {
    manualPaused = !manualPaused;
    syncInputState();
    updateWorldStatus();
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

  function onVisibilityChange() {
    lifecyclePaused = document.visibilityState !== "visible";
    if (lifecyclePaused && input) input.resetTransient();
    syncInputState();
    updateWorldStatus();
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
    updateViewport();
    renderCamera();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unloadGround();
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
    menuButton.removeEventListener("click", returnToMenu);
    errorMenuButton.removeEventListener("click", returnToMenu);
    playFrame.removeEventListener("pointerdown", onPlayFramePointerDown);
  }

  function onSettingsOpen() {
    if (typeof settingsDialog.showModal === "function") settingsDialog.showModal();
    else settingsDialog.setAttribute("open", "");
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
  menuButton.addEventListener("click", returnToMenu);
  errorMenuButton.addEventListener("click", returnToMenu);
  playFrame.addEventListener("pointerdown", onPlayFramePointerDown);
  window.addEventListener("resize", updateViewport);
  window.addEventListener("orientationchange", updateViewport);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);

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
