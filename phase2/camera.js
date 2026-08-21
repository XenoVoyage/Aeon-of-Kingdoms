/* global window */
"use strict";

(function exposePhase2Camera() {
  const configuration = Object.freeze({
    minimumAspect: 4 / 3,
    maximumAspect: 21 / 9,
    minimumViewportWidth: 640,
    minimumViewportHeight: 360,
    minimumZoom: 1,
    maximumZoom: 2.75,
    keyboardPanPixels: 36,
    buttonZoomFactor: 1.18,
    wheelZoomSensitivity: 0.0015,
    renderScaleCap: 1.5,
    minimumControlPixels: 44
  });

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function computePlayRect(widthValue, heightValue) {
    const width = Math.max(0, finite(widthValue, 0));
    const height = Math.max(0, finite(heightValue, 0));
    if (width === 0 || height === 0) {
      return Object.freeze({ left: 0, top: 0, width: 0, height: 0, letterboxed: true });
    }

    const aspect = width / height;
    if (aspect < configuration.minimumAspect) {
      const playHeight = width / configuration.minimumAspect;
      return Object.freeze({
        left: 0,
        top: (height - playHeight) / 2,
        width,
        height: playHeight,
        letterboxed: true
      });
    }
    if (aspect > configuration.maximumAspect) {
      const playWidth = height * configuration.maximumAspect;
      return Object.freeze({
        left: (width - playWidth) / 2,
        top: 0,
        width: playWidth,
        height,
        letterboxed: true
      });
    }
    return Object.freeze({ left: 0, top: 0, width, height, letterboxed: false });
  }

  function inspectViewport(width, height) {
    const playRect = computePlayRect(width, height);
    const portrait = height >= width;
    const tooSmall = (
      playRect.width < configuration.minimumViewportWidth
      || playRect.height < configuration.minimumViewportHeight
    );
    return Object.freeze({
      portrait,
      tooSmall,
      playable: !portrait && !tooSmall,
      playRect
    });
  }

  function createCamera(worldWidthValue, worldHeightValue, homeValue) {
    const worldWidth = Math.max(1, finite(worldWidthValue, 1));
    const worldHeight = Math.max(1, finite(worldHeightValue, 1));
    const home = Object.freeze({
      x: clamp(finite(homeValue && homeValue.x, worldWidth / 2), 0, worldWidth),
      y: clamp(finite(homeValue && homeValue.y, worldHeight / 2), 0, worldHeight),
      zoom: clamp(
        finite(homeValue && homeValue.zoom, configuration.minimumZoom),
        configuration.minimumZoom,
        configuration.maximumZoom
      )
    });
    let viewportWidth = 1;
    let viewportHeight = 1;
    let centerX = home.x;
    let centerY = home.y;
    let zoom = home.zoom;
    let baseScale = 1;

    function scale() {
      return baseScale * zoom;
    }

    function clampCentre() {
      const currentScale = scale();
      const halfWorldWidth = viewportWidth / (2 * currentScale);
      const halfWorldHeight = viewportHeight / (2 * currentScale);
      centerX = halfWorldWidth * 2 >= worldWidth
        ? worldWidth / 2
        : clamp(centerX, halfWorldWidth, worldWidth - halfWorldWidth);
      centerY = halfWorldHeight * 2 >= worldHeight
        ? worldHeight / 2
        : clamp(centerY, halfWorldHeight, worldHeight - halfWorldHeight);
    }

    function resize(widthValue, heightValue) {
      viewportWidth = Math.max(1, finite(widthValue, 1));
      viewportHeight = Math.max(1, finite(heightValue, 1));
      baseScale = Math.max(viewportWidth / worldWidth, viewportHeight / worldHeight);
      clampCentre();
      return snapshot();
    }

    function screenToWorld(screenXValue, screenYValue) {
      const screenX = finite(screenXValue, viewportWidth / 2);
      const screenY = finite(screenYValue, viewportHeight / 2);
      const currentScale = scale();
      return Object.freeze({
        x: centerX + (screenX - viewportWidth / 2) / currentScale,
        y: centerY + (screenY - viewportHeight / 2) / currentScale
      });
    }

    function worldToScreen(worldXValue, worldYValue) {
      const worldX = finite(worldXValue, centerX);
      const worldY = finite(worldYValue, centerY);
      const currentScale = scale();
      return Object.freeze({
        x: viewportWidth / 2 + (worldX - centerX) * currentScale,
        y: viewportHeight / 2 + (worldY - centerY) * currentScale
      });
    }

    function panByScreen(deltaXValue, deltaYValue) {
      const currentScale = scale();
      centerX -= finite(deltaXValue, 0) / currentScale;
      centerY -= finite(deltaYValue, 0) / currentScale;
      clampCentre();
      return snapshot();
    }

    function zoomAt(nextZoomValue, screenXValue, screenYValue) {
      const focus = screenToWorld(screenXValue, screenYValue);
      zoom = clamp(
        finite(nextZoomValue, zoom),
        configuration.minimumZoom,
        configuration.maximumZoom
      );
      const currentScale = scale();
      const screenX = finite(screenXValue, viewportWidth / 2);
      const screenY = finite(screenYValue, viewportHeight / 2);
      centerX = focus.x - (screenX - viewportWidth / 2) / currentScale;
      centerY = focus.y - (screenY - viewportHeight / 2) / currentScale;
      clampCentre();
      return snapshot();
    }

    function focus(worldXValue, worldYValue, nextZoomValue) {
      centerX = clamp(finite(worldXValue, centerX), 0, worldWidth);
      centerY = clamp(finite(worldYValue, centerY), 0, worldHeight);
      zoom = clamp(
        finite(nextZoomValue, zoom),
        configuration.minimumZoom,
        configuration.maximumZoom
      );
      clampCentre();
      return snapshot();
    }

    function reset() {
      centerX = home.x;
      centerY = home.y;
      zoom = home.zoom;
      clampCentre();
      return snapshot();
    }

    function snapshot() {
      return Object.freeze({
        worldWidth,
        worldHeight,
        viewportWidth,
        viewportHeight,
        centerX,
        centerY,
        zoom,
        scale: scale()
      });
    }

    return Object.freeze({
      resize,
      screenToWorld,
      worldToScreen,
      panByScreen,
      zoomAt,
      focus,
      reset,
      snapshot
    });
  }

  const api = Object.freeze({ configuration, clamp, computePlayRect, inspectViewport, createCamera });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.AeonPhase2Camera = api;
}());
