"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const inputApi = require(path.join(ROOT, "phase3/input.js"));
const rendererApi = require(path.join(ROOT, "phase3/renderer.js"));
const cameraConfiguration = require(path.join(ROOT, "phase2/camera.js")).configuration;

function createEventTarget(rect = { left: 0, top: 0, width: 640, height: 360 }) {
  const listeners = new Map();
  const captures = new Set();
  const releases = [];
  return {
    hidden: false,
    captures,
    releases,
    addEventListener(type, listener, options) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ listener, options });
    },
    removeEventListener(type, listener) {
      const remaining = (listeners.get(type) || []).filter((entry) => entry.listener !== listener);
      if (remaining.length > 0) listeners.set(type, remaining);
      else listeners.delete(type);
    },
    dispatch(type, properties = {}) {
      let prevented = false;
      const event = {
        type,
        target: this,
        pointerType: "mouse",
        pointerId: 1,
        button: 0,
        clientX: rect.left,
        clientY: rect.top,
        deltaY: 0,
        code: "",
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault() { prevented = true; },
        ...properties
      };
      for (const { listener } of [...(listeners.get(type) || [])]) listener(event);
      return { prevented, event };
    },
    listenerCount() {
      return Array.from(listeners.values()).reduce((total, entries) => total + entries.length, 0);
    },
    listenerOptions(type) {
      return (listeners.get(type) || []).map((entry) => entry.options);
    },
    closest() { return null; },
    getBoundingClientRect() { return rect; },
    setPointerCapture(pointerId) { captures.add(pointerId); },
    hasPointerCapture(pointerId) { return captures.has(pointerId); },
    releasePointerCapture(pointerId) {
      captures.delete(pointerId);
      releases.push(pointerId);
    }
  };
}

function createCamera() {
  const pans = [];
  const zooms = [];
  let zoom = 1;
  return {
    pans,
    zooms,
    snapshot() { return Object.freeze({ zoom, scale: 2 }); },
    screenToWorld(x, y) { return Object.freeze({ x: x + 1000, y: y + 2000 }); },
    worldToScreen(x, y) { return Object.freeze({ x: x * 2 + 5, y: y * 2 + 7 }); },
    panByScreen(x, y) { pans.push([x, y]); },
    zoomAt(nextZoom, x, y) {
      zoom = nextZoom;
      zooms.push([nextZoom, x, y]);
    }
  };
}

function withBrowserTargets(run) {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const browserWindow = createEventTarget();
  const browserDocument = createEventTarget();
  global.window = browserWindow;
  global.document = browserDocument;
  try {
    return run({ browserWindow, browserDocument });
  } finally {
    global.window = originalWindow;
    global.document = originalDocument;
  }
}

test("Phase 3 modules expose small CommonJS and browser APIs", () => {
  assert.deepEqual(Object.keys(inputApi), ["createInput"]);
  assert.deepEqual(Object.keys(rendererApi), ["createDynamicRenderer"]);

  for (const [relativePath, globalName, method] of [
    ["phase3/input.js", "AeonPhase3Input", "createInput"],
    ["phase3/renderer.js", "AeonPhase3Renderer", "createDynamicRenderer"]
  ]) {
    const context = vm.createContext({ window: {}, document: {} });
    new vm.Script(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), { filename: relativePath }).runInContext(context);
    assert.equal(typeof context.window[globalName][method], "function");
  }
});

test("desktop input translates click, box, additive, move, keyboard pan, drag pan, and focus zoom", () => {
  withBrowserTargets(({ browserWindow }) => {
    const target = createEventTarget({ left: 10, top: 20, width: 640, height: 360 });
    const camera = createCamera();
    const points = [];
    const boxes = [];
    const previews = [];
    const moves = [];
    const cameraChanges = [];
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraConfiguration,
      onSelectPoint: (payload) => points.push(payload),
      onSelectBox: (payload) => boxes.push(payload),
      onSelectionPreview: (rectangle) => previews.push(rectangle),
      onMoveRequest: (payload) => moves.push(payload),
      onCameraChange: (snapshot) => cameraChanges.push(snapshot)
    });

    assert.equal(target.listenerOptions("wheel")[0].passive, false);
    target.dispatch("pointerdown", {
      pointerId: 11,
      clientX: 110,
      clientY: 120,
      shiftKey: true
    });
    target.dispatch("pointerup", { pointerId: 11, clientX: 110, clientY: 120 });
    assert.equal(points.length, 1);
    assert.equal(points[0].source, "mouse");
    assert.equal(points[0].additive, true);
    assert.deepEqual(points[0].screenPoint, { x: 100, y: 100 });
    assert.deepEqual(points[0].worldPoint, { x: 1100, y: 2100 });

    target.dispatch("pointerdown", { pointerId: 12, clientX: 210, clientY: 140 });
    target.dispatch("pointermove", { pointerId: 12, clientX: 270, clientY: 210 });
    target.dispatch("pointerup", { pointerId: 12, clientX: 270, clientY: 210 });
    assert.equal(boxes.length, 1);
    assert.deepEqual(boxes[0].screenRect, {
      left: 200,
      top: 120,
      right: 260,
      bottom: 190,
      width: 60,
      height: 70
    });
    assert.deepEqual(boxes[0].worldBounds, { minX: 1200, minY: 2120, maxX: 1260, maxY: 2190 });
    assert.ok(previews.some(Boolean));
    assert.equal(previews.at(-1), null);
    assert.equal(points.length, 1, "a completed box must not also become a click");

    const contextMenu = target.dispatch("contextmenu", { clientX: 30, clientY: 50 });
    assert.equal(contextMenu.prevented, true);
    assert.deepEqual(moves[0].worldPoint, { x: 1020, y: 2030 });
    assert.equal(moves[0].source, "mouse");

    assert.equal(browserWindow.dispatch("keydown", { code: "KeyW" }).prevented, true);
    assert.deepEqual(camera.pans.at(-1), [0, cameraConfiguration.keyboardPanPixels]);
    browserWindow.dispatch("keydown", { code: "Space" });
    target.dispatch("pointerdown", { pointerId: 13, clientX: 310, clientY: 200 });
    target.dispatch("pointermove", { pointerId: 13, clientX: 325, clientY: 208 });
    target.dispatch("pointerup", { pointerId: 13, clientX: 325, clientY: 208 });
    browserWindow.dispatch("keyup", { code: "Space" });
    assert.deepEqual(camera.pans.at(-1), [15, 8]);

    const wheel = target.dispatch("wheel", { clientX: 50, clientY: 80, deltaY: -100 });
    assert.equal(wheel.prevented, true);
    assert.deepEqual(camera.zooms.at(-1).slice(1), [40, 60]);
    assert.ok(cameraChanges.length >= 3);

    input.destroy();
    assert.equal(target.listenerCount(), 0);
    assert.equal(browserWindow.listenerCount(), 0);
  });
});

test("touch input keeps taps explicit and reserves pan/pinch for two pointers", () => {
  withBrowserTargets(() => {
    const target = createEventTarget();
    const camera = createCamera();
    const selections = [];
    const moves = [];
    const modes = [];
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraConfiguration,
      onSelectPoint: (payload) => selections.push(payload),
      onMoveRequest: (payload) => moves.push(payload),
      onMoveModeChange: (enabled) => modes.push(enabled)
    });

    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 1, clientX: 80, clientY: 100 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 1, clientX: 80, clientY: 100 });
    assert.equal(selections.length, 1);
    assert.equal(selections[0].source, "touch");

    const touchContextMenu = target.dispatch("contextmenu", {
      pointerType: "touch",
      clientX: 80,
      clientY: 100
    });
    assert.equal(touchContextMenu.prevented, true);
    assert.equal(moves.length, 0, "touch context menus must not bypass explicit Move mode");

    input.setMoveMode(true);
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 2, clientX: 120, clientY: 130 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 2, clientX: 120, clientY: 130 });
    assert.equal(moves.length, 1);
    assert.equal(moves[0].source, "touch");
    assert.deepEqual(modes, [true, false], "a touch destination consumes explicit Move mode once");

    const selectionCount = selections.length;
    const moveCount = moves.length;
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 3, clientX: 100, clientY: 100 });
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 4, clientX: 200, clientY: 100 });
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 5, clientX: 300, clientY: 100 });
    target.dispatch("pointermove", { pointerType: "touch", pointerId: 4, clientX: 225, clientY: 100 });
    target.dispatch("pointermove", { pointerType: "touch", pointerId: 5, clientX: 340, clientY: 100 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 3, clientX: 100, clientY: 100 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 4, clientX: 225, clientY: 100 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 5, clientX: 340, clientY: 100 });
    assert.equal(selections.length, selectionCount);
    assert.equal(moves.length, moveCount);
    assert.ok(camera.pans.length > 0);
    assert.ok(camera.zooms.length > 0);
    assert.equal(input.snapshot().touchPointerCount, 0);

    const panCount = camera.pans.length;
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 6, clientX: 90, clientY: 100 });
    target.dispatch("pointermove", { pointerType: "touch", pointerId: 6, clientX: 120, clientY: 100 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 6, clientX: 120, clientY: 100 });
    assert.equal(camera.pans.length, panCount, "one finger must not silently become camera pan");
    assert.equal(selections.length, selectionCount, "a moved one-finger gesture must not become selection");
    assert.equal(moves.length, moveCount, "a moved one-finger gesture must not become a command");
    input.destroy();
  });
});

test("cancellation and lifecycle boundaries clear only transient interaction", () => {
  withBrowserTargets(({ browserWindow, browserDocument }) => {
    const target = createEventTarget();
    const camera = createCamera();
    const boxes = [];
    const previews = [];
    const modes = [];
    let resets = 0;
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraConfiguration,
      onSelectBox: (payload) => boxes.push(payload),
      onSelectionPreview: (rectangle) => previews.push(rectangle),
      onMoveModeChange: (enabled) => modes.push(enabled),
      onTransientReset: () => { resets += 1; }
    });

    target.dispatch("pointerdown", { pointerId: 21, clientX: 50, clientY: 60 });
    target.dispatch("pointermove", { pointerId: 21, clientX: 100, clientY: 120 });
    target.dispatch("pointercancel", { pointerId: 21, clientX: 100, clientY: 120 });
    assert.equal(boxes.length, 0);
    assert.equal(previews.at(-1), null);

    input.setMoveMode(true);
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 22, clientX: 80, clientY: 90 });
    browserDocument.hidden = true;
    browserDocument.dispatch("visibilitychange");
    assert.equal(input.snapshot().moveMode, false);
    assert.equal(input.snapshot().touchPointerCount, 0);
    assert.ok(target.releases.includes(22));
    assert.deepEqual(modes.slice(-2), [true, false]);
    assert.ok(resets >= 1);

    input.setMoveMode(true);
    browserWindow.dispatch("pagehide");
    assert.equal(input.snapshot().moveMode, false);
    input.setEnabled(false);
    assert.equal(input.snapshot().enabled, false);
    input.destroy();
    assert.equal(target.listenerCount(), 0);
    assert.equal(browserWindow.listenerCount(), 0);
    assert.equal(browserDocument.listenerCount(), 0);
  });
});

function createAssets() {
  const entityAssets = {};
  for (const [kind, ownerSeat] of [
    ["astral-guardian", 1],
    ["starbow", 1],
    ["gravebound-reaver", 2]
  ]) {
    entityAssets[kind] = {
      kind,
      baseImage: { name: `${kind}-base` },
      ownerSheets: { [ownerSeat]: { name: `${kind}-owner-${ownerSeat}` } }
    };
  }
  return {
    cellSize: 128,
    renderCell: { width: 160, height: 160, rootX: 80, rootY: 147.5 },
    entities: entityAssets,
    ownerPresentations: {
      1: { id: 1, name: "Azure", rgb: [47, 169, 255], symbol: "diamond" },
      2: { id: 2, name: "Violet", rgb: [165, 92, 255], symbol: "cross" }
    }
  };
}

function createContext() {
  const operations = [];
  const context = {
    operations,
    save() { operations.push({ type: "save" }); },
    restore() { operations.push({ type: "restore" }); },
    beginPath() { operations.push({ type: "beginPath" }); },
    closePath() { operations.push({ type: "closePath" }); },
    moveTo(...args) { operations.push({ type: "moveTo", args }); },
    lineTo(...args) { operations.push({ type: "lineTo", args }); },
    arc(...args) { operations.push({ type: "arc", args }); },
    ellipse(...args) { operations.push({ type: "ellipse", args }); },
    stroke() { operations.push({ type: "stroke" }); },
    fill() { operations.push({ type: "fill" }); },
    setLineDash(args) { operations.push({ type: "setLineDash", args }); },
    translate(...args) { operations.push({ type: "translate", args }); },
    scale(...args) { operations.push({ type: "scale", args }); },
    drawImage(...args) { operations.push({ type: "drawImage", args }); },
    fillText(...args) { operations.push({ type: "fillText", args }); }
  };
  return context;
}

function entity(id, kind, y, overrides = {}) {
  return {
    id,
    ownerSeat: 1,
    kind,
    x: 10000,
    y,
    radius: 1600,
    facing: "right",
    order: "MOVE",
    ...overrides
  };
}

test("dynamic rendering sorts by stable roots, draws prepared owner cells once, mirrors left, and preserves input state", () => {
  const camera = createCamera();
  const assets = createAssets();
  const renderer = rendererApi.createDynamicRenderer({
    camera,
    configuration: { positionScale: 100, pendingCommandCap: 64 },
    assets
  });
  const entities = [
    entity("later", "gravebound-reaver", 20000, { ownerSeat: 2 }),
    entity("first-b", "starbow", 10000, { order: "IDLE" }),
    entity("first-a", "astral-guardian", 10000, { facing: "left" })
  ];
  const before = JSON.stringify(entities);
  const context = createContext();
  renderer.draw(context, {
    entities,
    selectedEntityIds: new Set(["first-a"]),
    movementFrames: new Map([["first-a", 2], ["first-b", 3], ["later", 3]]),
    destinationFeedback: [{ x: 12000, y: 15000, status: "unreachable", label: "blocked" }]
  });

  assert.equal(JSON.stringify(entities), before, "rendering must not reorder or mutate simulation projections");
  const ownerDraws = context.operations.filter((operation) => (
    operation.type === "drawImage" && /-owner-[12]$/.test(operation.args[0].name)
  ));
  assert.deepEqual(ownerDraws.map((operation) => operation.args[0].name), [
    "astral-guardian-owner-1",
    "starbow-owner-1",
    "gravebound-reaver-owner-2"
  ]);
  assert.deepEqual(ownerDraws.map((operation) => operation.args[1]), [256, 0, 384]);
  assert.equal(context.operations.filter((operation) => operation.type === "drawImage").length, 3);
  assert.equal(
    context.operations.some((operation) => operation.type === "drawImage" && /-base$/.test(operation.args[0].name)),
    false,
    "the required diagnostic base must not be double-composited beneath a prepared owner sheet"
  );
  assert.deepEqual(ownerDraws[0].args.slice(5), [-160, -295, 320, 320], "both art tiers share the locked destination root");
  assert.equal(
    context.operations.filter((operation) => operation.type === "scale" && operation.args[0] === -1 && operation.args[1] === 1).length,
    1,
    "only canonical-left presentation may use the exact X mirror"
  );
  assert.equal(context.operations.filter((operation) => operation.type === "ellipse").length, 1);
  assert.ok(context.operations.some((operation) => operation.type === "fillText" && operation.args[0] === "BLOCKED"));

  renderer.setReducedMotion(true);
  const reducedContext = createContext();
  renderer.draw(reducedContext, {
    entities,
    selectedEntityIds: new Set(),
    movementFrames: new Map([["first-a", 2], ["later", 3]])
  });
  const reducedOwnerDraws = reducedContext.operations.filter((operation) => (
    operation.type === "drawImage" && /-owner-[12]$/.test(operation.args[0].name)
  ));
  assert.deepEqual(reducedOwnerDraws.map((operation) => operation.args[1]), [0, 0, 0]);
});

test("dynamic rendering fails before drawing when approved sprite or ownership art is unavailable", () => {
  const camera = createCamera();
  const assets = createAssets();
  assets.entities.starbow.ownerSheets = {};
  const renderer = rendererApi.createDynamicRenderer({
    camera,
    configuration: { positionScale: 100, pendingCommandCap: 64 },
    assets
  });
  const context = createContext();
  assert.throws(
    () => renderer.draw(context, {
      entities: [entity("missing-mask", "starbow", 10000)],
      selectedEntityIds: new Set()
    }),
    /no pre-tinted owner sheet/i
  );
  assert.equal(context.operations.some((operation) => operation.type === "drawImage"), false);

  const missingBaseAssets = createAssets();
  missingBaseAssets.entities.starbow.baseImage = null;
  const missingBaseRenderer = rendererApi.createDynamicRenderer({
    camera,
    configuration: { positionScale: 100, pendingCommandCap: 64 },
    assets: missingBaseAssets
  });
  assert.throws(
    () => missingBaseRenderer.draw(createContext(), {
      entities: [entity("missing-base", "starbow", 10000)],
      selectedEntityIds: new Set()
    }),
    /no loaded base atlas/i,
    "the validated source base remains mandatory even though it is not a second draw"
  );

  assert.throws(
    () => renderer.draw(createContext(), {
      entities: [],
      selectedEntityIds: [],
      movementFrames: new Map()
    }),
    /selectedEntityIds must be a Set/i
  );
});
