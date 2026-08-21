/* global window */
"use strict";

(function exposePhase2Renderer() {
  const anchorPresentation = Object.freeze({
    "headquarters:1": Object.freeze({ color: "#6ee7f2", symbol: "diamond", label: "HQ · ◇" }),
    "headquarters:2": Object.freeze({ color: "#c7a6ff", symbol: "cross", label: "HQ · ×" }),
    "resource-point:neutral": Object.freeze({ color: "#f2d486", symbol: "ring", label: "RESOURCE · ○" }),
    "production-outpost:neutral": Object.freeze({ color: "#f2d486", symbol: "bars", label: "OUTPOST · Ⅲ" })
  });

  function canvasContext(canvas) {
    const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!context) throw new Error("Canvas 2D rendering is unavailable.");
    return context;
  }

  function polygonPath(context, camera, polygon) {
    polygon.forEach(([worldX, worldY], index) => {
      const point = camera.worldToScreen(worldX, worldY);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
  }

  function drawRoute(context, camera, points) {
    context.beginPath();
    points.forEach(([worldX, worldY], index) => {
      const point = camera.worldToScreen(worldX, worldY);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
  }

  function drawSymbol(context, symbol, x, y, size) {
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
    } else if (symbol === "bars") {
      context.moveTo(x - size, y - size);
      context.lineTo(x - size, y + size);
      context.moveTo(x, y - size);
      context.lineTo(x, y + size);
      context.moveTo(x + size, y - size);
      context.lineTo(x + size, y + size);
    } else {
      context.arc(x, y, size, 0, Math.PI * 2);
    }
    context.stroke();
  }

  function createRenderer(options) {
    const { canvases, map, camera, groundImage, renderScaleCap } = options;
    const contexts = Object.fromEntries(
      Object.entries(canvases).map(([name, canvas]) => [name, canvasContext(canvas)])
    );
    let cssWidth = 1;
    let cssHeight = 1;
    let renderScale = 1;
    let navigationVisible = false;
    let disposed = false;

    function prepare(context) {
      context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.lineCap = "round";
      context.lineJoin = "round";
    }

    function resize(width, height, deviceScale) {
      cssWidth = Math.max(1, Math.round(width));
      cssHeight = Math.max(1, Math.round(height));
      renderScale = Math.min(Math.max(1, deviceScale || 1), renderScaleCap);
      for (const canvas of Object.values(canvases)) {
        canvas.width = Math.max(1, Math.round(cssWidth * renderScale));
        canvas.height = Math.max(1, Math.round(cssHeight * renderScale));
      }
      camera.resize(cssWidth, cssHeight);
      render();
    }

    function drawGround() {
      const context = contexts.ground;
      prepare(context);
      const origin = camera.worldToScreen(0, 0);
      const opposite = camera.worldToScreen(map.world.width, map.world.height);
      context.drawImage(groundImage, origin.x, origin.y, opposite.x - origin.x, opposite.y - origin.y);
    }

    function drawDetail() {
      const context = contexts.detail;
      prepare(context);
      context.save();
      context.strokeStyle = "rgba(199, 232, 217, 0.18)";
      context.lineWidth = 1.25;
      context.setLineDash([2, 12]);
      for (const route of map.layers.detail.routeHints) drawRoute(context, camera, route.points);
      context.restore();
    }

    function drawNavigation() {
      const context = contexts.navigation;
      prepare(context);
      if (!navigationVisible) return;

      const navigation = map.layers.navigation;
      context.save();
      context.strokeStyle = "rgba(160, 231, 194, 0.24)";
      context.lineWidth = 1;
      context.setLineDash([3, 7]);
      for (const route of map.layers.detail.routeHints) drawRoute(context, camera, route.points);
      for (let worldX = 0; worldX <= map.world.width; worldX += navigation.cellSize) {
        const top = camera.worldToScreen(worldX, 0);
        const bottom = camera.worldToScreen(worldX, map.world.height);
        context.beginPath();
        context.moveTo(top.x, top.y);
        context.lineTo(bottom.x, bottom.y);
        context.stroke();
      }
      for (let worldY = 0; worldY <= map.world.height; worldY += navigation.cellSize) {
        const left = camera.worldToScreen(0, worldY);
        const right = camera.worldToScreen(map.world.width, worldY);
        context.beginPath();
        context.moveTo(left.x, left.y);
        context.lineTo(right.x, right.y);
        context.stroke();
      }

      for (const blocker of navigation.blockers) {
        context.save();
        context.beginPath();
        polygonPath(context, camera, blocker.polygon);
        context.fillStyle = "rgba(173, 70, 82, 0.25)";
        context.fill();
        context.clip();
        context.strokeStyle = "rgba(255, 218, 178, 0.62)";
        context.lineWidth = 1.5;
        context.setLineDash([]);
        for (let x = -cssHeight; x < cssWidth + cssHeight; x += 18) {
          context.beginPath();
          context.moveTo(x, 0);
          context.lineTo(x + cssHeight, cssHeight);
          context.stroke();
        }
        context.restore();

        const labelPoint = camera.worldToScreen(blocker.polygon[0][0], blocker.polygon[0][1]);
        context.fillStyle = "rgba(255, 244, 226, 0.92)";
        context.font = "600 11px ui-sans-serif, system-ui, sans-serif";
        context.fillText("BLOCKER", labelPoint.x + 8, labelPoint.y + 16);
      }
      context.restore();
    }

    function drawAnchors() {
      const context = contexts.anchors;
      prepare(context);
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "650 11px ui-sans-serif, system-ui, sans-serif";
      for (const anchor of map.layers.anchors.structures) {
        const presentationKey = `${anchor.category}:${anchor.seat || "neutral"}`;
        const presentation = anchorPresentation[presentationKey];
        const point = camera.worldToScreen(anchor.x, anchor.y);
        const radius = Math.max(22, Math.min(54, anchor.radius * camera.snapshot().scale));
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(5, 9, 18, 0.58)";
        context.fill();
        context.setLineDash(anchor.seat ? [] : [5, 5]);
        context.strokeStyle = presentation.color;
        context.lineWidth = 2;
        context.stroke();
        context.setLineDash([]);
        context.strokeStyle = "rgba(255, 255, 255, 0.92)";
        drawSymbol(context, presentation.symbol, point.x, point.y - 5, 7);
        context.fillStyle = "rgba(255, 255, 255, 0.96)";
        context.fillText(presentation.label, point.x, point.y + 15);
      }
      context.restore();
    }

    function drawDynamic() {
      prepare(contexts.dynamic);
    }

    function drawForeground() {
      const context = contexts.foreground;
      prepare(context);
      const origin = camera.worldToScreen(0, 0);
      const opposite = camera.worldToScreen(map.world.width, map.world.height);
      context.save();
      for (const occluder of map.layers.foreground.occluders) {
        context.save();
        context.beginPath();
        polygonPath(context, camera, occluder.polygon);
        context.clip();
        context.drawImage(groundImage, origin.x, origin.y, opposite.x - origin.x, opposite.y - origin.y);
        context.restore();
      }
      context.restore();
    }

    function render() {
      if (disposed || !groundImage.complete || groundImage.naturalWidth === 0) return;
      drawGround();
      drawDetail();
      drawNavigation();
      drawAnchors();
      drawDynamic();
      drawForeground();
    }

    function setNavigationVisible(visible) {
      navigationVisible = Boolean(visible);
      render();
    }

    function snapshot() {
      return Object.freeze({ cssWidth, cssHeight, renderScale, navigationVisible });
    }

    function destroy() {
      disposed = true;
      for (const canvas of Object.values(canvases)) {
        canvas.width = 1;
        canvas.height = 1;
      }
    }

    return Object.freeze({ resize, render, setNavigationVisible, snapshot, destroy });
  }

  const api = Object.freeze({ createRenderer });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.AeonPhase2Renderer = api;
}());
