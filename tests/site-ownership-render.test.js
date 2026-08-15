"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadRenderer() {
  class HTMLCanvasElement {}
  const window = {
    AOK: {},
    HTMLCanvasElement,
    addEventListener() {},
    removeEventListener() {},
  };
  window.window = window;
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "js/render.js"), "utf8"),
    { window, document: {} },
    { filename: "js/render.js" },
  );
  return window.AOK.Renderer;
}

function recordingContext() {
  const labels = [];
  const context = {
    labels,
    beginPath() {},
    arc() {},
    clip() {},
    closePath() {},
    fill() {},
    fillRect() {},
    fillText(label) { labels.push(String(label)); },
    lineTo() {},
    moveTo() {},
    rect() {},
    restore() {},
    rotate() {},
    roundRect() {},
    save() {},
    stroke() {},
    strokeRect() {},
    translate() {},
  };
  return context;
}

test("captured sites keep a numbered owner badge at overview zoom", () => {
  const Renderer = loadRenderer();
  const ctx = recordingContext();
  const renderer = {
    camera: { zoom: 0.3 },
    drawOwnerBadge: Renderer.prototype.drawOwnerBadge,
    drawSiteGlyph() {},
    getPlayerColor() { return "#4de8ff"; },
    siteLabel: Renderer.prototype.siteLabel,
  };

  Renderer.prototype.drawSites.call(
    renderer,
    ctx,
    { players: [{ id: 0 }, { id: 1 }] },
    [
      { id: "owned", kind: "resource", ownerId: 1, x: 120, y: 100, radius: 32 },
      { id: "neutral", kind: "resource", ownerId: null, x: 220, y: 100, radius: 32 },
    ],
    { minX: 0, minY: 0, maxX: 400, maxY: 300 },
  );

  assert.deepEqual(ctx.labels, ["2"]);
});

test("captured sites keep numbered owner badges on the minimap", () => {
  const Renderer = loadRenderer();
  const ctx = recordingContext();
  const renderer = {
    width: 900,
    height: 600,
    world: { width: 1600, height: 1000 },
    drawMinimapOwnerBadge: Renderer.prototype.drawMinimapOwnerBadge,
    getPlayerColor() { return "#a878ff"; },
    visibleBounds() { return { minX: 0, minY: 0, maxX: 800, maxY: 500 }; },
  };

  Renderer.prototype.drawMinimap.call(renderer, ctx, {
    sites: [
      { id: "owned", ownerId: 2, x: 700, y: 500 },
      { id: "neutral", ownerId: null, x: 900, y: 500 },
    ],
    units: [],
    structures: [],
  });

  assert.deepEqual(ctx.labels, ["3"]);
});
