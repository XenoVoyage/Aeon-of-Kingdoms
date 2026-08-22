"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const inputApi = require(path.join(ROOT, "phase4/input.js"));
const rendererApi = require(path.join(ROOT, "phase4/renderer.js"));
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

test("Phase 4 input and renderer expose bounded CommonJS and browser APIs", () => {
  assert.deepEqual(Object.keys(inputApi), ["createInput"]);
  assert.equal(typeof rendererApi.createDynamicRenderer, "function");

  const context = { console };
  context.window = context;
  vm.createContext(context);
  for (const relativePath of [
    "phase3/input.js",
    "phase4/input.js"
  ]) new vm.Script(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), { filename: relativePath }).runInContext(context);
  assert.equal(typeof context.AeonPhase4Input.createInput, "function");
});

test("desktop contextual terrain requests remain explicit and selection-neutral", () => {
  withBrowserTargets(() => {
    const target = createEventTarget({ left: 10, top: 20, width: 640, height: 360 });
    const camera = createCamera();
    const selections = [];
    const contexts = [];
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraConfiguration,
      onSelectPoint: (payload) => selections.push(payload),
      onContextRequest: (payload) => contexts.push(payload)
    });

    target.dispatch("pointerdown", { pointerId: 11, clientX: 110, clientY: 120 });
    target.dispatch("pointerup", { pointerId: 11, clientX: 110, clientY: 120 });
    assert.equal(selections.length, 1);
    assert.deepEqual(selections[0].worldPoint, { x: 1100, y: 2100 });

    const contextMenu = target.dispatch("contextmenu", { clientX: 30, clientY: 50 });
    assert.equal(contextMenu.prevented, true);
    assert.equal(contexts.length, 1);
    assert.equal(contexts[0].mode, null, "desktop right-click stays contextual to current selection");
    assert.deepEqual(contexts[0].worldPoint, { x: 1020, y: 2030 });
    assert.equal(selections.length, 1, "a terrain command must not mutate selection itself");
    input.destroy();
  });
});

test("touch exposes mutually exclusive one-shot Move and Rally modes", () => {
  withBrowserTargets(() => {
    const target = createEventTarget();
    const camera = createCamera();
    const requests = [];
    const modes = [];
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraConfiguration,
      onContextRequest: (payload) => requests.push(payload),
      onContextModeChange: (mode) => modes.push(mode)
    });

    assert.deepEqual(input.snapshot().contextMode, null);
    assert.throws(() => input.setContextMode("attack"), /move, rally, or null/i);
    input.setContextMode("move");
    assert.equal(input.snapshot().contextMode, "move");
    input.setContextMode("rally");
    assert.equal(input.snapshot().contextMode, "rally", "one mode replaces the other instead of stacking");

    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 2, clientX: 120, clientY: 130 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 2, clientX: 120, clientY: 130 });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].mode, "rally");
    assert.equal(requests[0].source, "touch");
    assert.equal(input.snapshot().contextMode, null, "a valid destination consumes the one-shot mode");
    assert.ok(modes.includes("move"));
    assert.ok(modes.includes("rally"));
    assert.equal(modes.at(-1), null);

    const touchContextMenu = target.dispatch("contextmenu", {
      pointerType: "touch",
      clientX: 80,
      clientY: 100
    });
    assert.equal(touchContextMenu.prevented, true);
    assert.equal(requests.length, 1, "touch must not gain a hidden context-menu command");
    input.destroy();
  });
});

test("camera gestures never become production, move, or rally commands", () => {
  withBrowserTargets(() => {
    const target = createEventTarget();
    const camera = createCamera();
    const requests = [];
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraConfiguration,
      onContextRequest: (payload) => requests.push(payload)
    });
    input.setContextMode("rally");
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 3, clientX: 100, clientY: 100 });
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 4, clientX: 200, clientY: 100 });
    target.dispatch("pointermove", { pointerType: "touch", pointerId: 4, clientX: 240, clientY: 100 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 3, clientX: 100, clientY: 100 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 4, clientX: 240, clientY: 100 });
    assert.equal(requests.length, 0);
    assert.ok(camera.pans.length > 0 || camera.zooms.length > 0);
    input.destroy();
  });
});

test("lifecycle loss, disabling, reset, and destroy clear transient context modes", () => {
  withBrowserTargets(({ browserWindow, browserDocument }) => {
    const target = createEventTarget();
    const camera = createCamera();
    const modes = [];
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraConfiguration,
      onContextRequest() {},
      onContextModeChange: (mode) => modes.push(mode)
    });

    input.setContextMode("rally");
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 22, clientX: 80, clientY: 90 });
    browserDocument.hidden = true;
    browserDocument.dispatch("visibilitychange");
    assert.equal(input.snapshot().contextMode, null);
    assert.ok(target.releases.includes(22));

    input.setContextMode("move");
    browserWindow.dispatch("pagehide");
    assert.equal(input.snapshot().contextMode, null);
    input.setContextMode("rally");
    input.resetTransient();
    assert.equal(input.snapshot().contextMode, null);
    input.setContextMode("move");
    assert.equal(input.setEnabled(false), false);
    assert.equal(input.snapshot().contextMode, null);
    assert.equal(input.setContextMode("move"), null, "disabled input must not visibly re-arm a context mode");
    assert.equal(input.snapshot().contextMode, null);
    assert.equal(modes.at(-1), null);
    input.destroy();
    assert.equal(target.listenerCount(), 0);
    assert.equal(browserWindow.listenerCount(), 0);
    assert.equal(browserDocument.listenerCount(), 0);
  });
});

function createAssets() {
  const presentations = {
    1: { id: 1, name: "Azure", rgb: [47, 169, 255], symbol: "diamond" },
    2: { id: 2, name: "Violet", rgb: [165, 92, 255], symbol: "cross" }
  };
  const structurePresentation = {
    drawSizeWorld: [160, 128],
    destinationGroundRoot: [80, 120],
    anchorOffsetsFromGroundWorld: { owner: [60, -94] }
  };
  return {
    entityAssets: {
      cellSize: 128,
      renderCell: { width: 160, height: 160, rootX: 80, rootY: 147.5 },
      ownerPresentations: presentations,
      entities: {
        "astral-guardian": {
          ownerSheets: { 1: { name: "guardian-owner-1" } }
        },
        "gravebound-reaver": {
          ownerSheets: { 2: { name: "reaver-owner-2" } }
        }
      }
    },
    structureAssets: {
      ownerPresentations: presentations,
      structures: {
        "astral-headquarters": {
          neutralImage: { name: "astral-hq-neutral" },
          ownerSheets: { 1: { name: "astral-hq-owner-1" } },
          presentation: structurePresentation
        },
        "gravebound-headquarters": {
          neutralImage: { name: "grave-hq-neutral" },
          ownerSheets: { 2: { name: "grave-hq-owner-2" } },
          presentation: structurePresentation
        },
        "resource-point": {
          neutralImage: { name: "resource-neutral" },
          ownerSheets: {
            1: { name: "resource-owner-1" },
            2: { name: "resource-owner-2" }
          },
          presentation: structurePresentation
        },
        "production-outpost": {
          neutralImage: { name: "outpost-neutral" },
          ownerSheets: {
            1: { name: "outpost-owner-1" },
            2: { name: "outpost-owner-2" }
          },
          presentation: structurePresentation
        }
      }
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
    fillText(...args) { operations.push({ type: "fillText", args }); },
    fillRect(...args) { operations.push({ type: "fillRect", args }); },
    strokeRect(...args) { operations.push({ type: "strokeRect", args }); }
  };
  for (const property of [
    "strokeStyle", "fillStyle", "lineWidth", "globalAlpha", "font", "textAlign", "textBaseline"
  ]) Object.defineProperty(context, property, {
    set(value) { operations.push({ type: "property", property, value }); },
    get() { return undefined; }
  });
  return context;
}

function combat(id, y, overrides = {}) {
  return {
    id,
    ownerSeat: 1,
    kind: "astral-guardian",
    x: 10000,
    y,
    radius: 1600,
    facing: "right",
    order: "MOVE",
    ...overrides
  };
}

function structureState(id, category, y, overrides = {}) {
  return {
    id,
    category,
    faction: null,
    x: 10000,
    y,
    radius: 4600,
    ownerSeat: null,
    destroyed: false,
    captureRadius: category === "headquarters" ? null : 12400,
    captureSeat: null,
    captureProgress: 0,
    contested: false,
    queue: [],
    rally: null,
    ...overrides
  };
}

test("dynamic ordering interleaves structures and combat by stable ground root without mutation", () => {
  const entities = [combat("combat-z", 20000), combat("combat-a", 10000)];
  const structures = [
    structureState("structure-b", "resource-point", 10000),
    structureState("structure-a", "production-outpost", 30000)
  ];
  const entitiesBefore = JSON.stringify(entities);
  const structuresBefore = JSON.stringify(structures);
  const ordered = rendererApi.buildDrawOrder(entities, structures);
  assert.deepEqual(ordered.map(({ type, value }) => [type, value.id]), [
    ["combat", "combat-a"],
    ["structure", "structure-b"],
    ["combat", "combat-z"],
    ["structure", "structure-a"]
  ]);
  assert.equal(JSON.stringify(entities), entitiesBefore);
  assert.equal(JSON.stringify(structures), structuresBefore);
  assert.equal(rendererApi.assetIdForStructure(structureState("a", "headquarters", 0, { faction: "astral-concord" })), "astral-headquarters");
  assert.equal(rendererApi.assetIdForStructure(structureState("b", "headquarters", 0, { faction: "gravebound-court" })), "gravebound-headquarters");
  assert.equal(rendererApi.assetIdForStructure(structureState("c", "resource-point", 0)), "resource-point");
});

test("one dynamic pass draws prepared ownership art in ground-root order and mirrors canonical-left combat exactly", () => {
  const camera = createCamera();
  const { entityAssets, structureAssets } = createAssets();
  const renderer = rendererApi.createDynamicRenderer({
    camera,
    configuration: { positionScale: 100, captureRequiredTicks: 120, pendingCommandCap: 64 },
    entityAssets,
    structureAssets
  });
  const entities = [
    combat("later-combat", 30000, { ownerSeat: 2, kind: "gravebound-reaver" }),
    combat("first-combat", 10000, { facing: "left" })
  ];
  const structures = [
    structureState("neutral-resource", "resource-point", 20000),
    structureState("owned-outpost", "production-outpost", 40000, { ownerSeat: 1 })
  ];
  const before = JSON.stringify({ entities, structures });
  const context = createContext();
  renderer.draw(context, {
    entities,
    structures,
    selectedEntityIds: new Set(["first-combat"]),
    selectedStructureId: "owned-outpost",
    movementFrames: new Map([["first-combat", 2], ["later-combat", 3]])
  });
  assert.equal(JSON.stringify({ entities, structures }), before);
  const draws = context.operations.filter(({ type }) => type === "drawImage");
  assert.deepEqual(draws.map(({ args }) => args[0].name), [
    "guardian-owner-1",
    "resource-neutral",
    "reaver-owner-2",
    "outpost-owner-1"
  ]);
  assert.equal(draws[0].args[1], 256, "movement frame two must select the third baked cell");
  assert.equal(draws[2].args[1], 384, "movement frame three must select the fourth baked cell");
  assert.equal(
    context.operations.filter(({ type, args }) => type === "scale" && args[0] === -1 && args[1] === 1).length,
    1,
    "only left-facing combat receives exact scaleX(-1)"
  );
  assert.ok(context.operations.filter(({ type }) => type === "ellipse").length >= 2, "both selection kinds need readable rings");

  renderer.setReducedMotion(true);
  const reduced = createContext();
  renderer.draw(reduced, {
    entities,
    structures,
    selectedEntityIds: new Set(),
    selectedStructureId: null,
    movementFrames: new Map([["first-combat", 3], ["later-combat", 2]])
  });
  const reducedEntityDraws = reduced.operations.filter(({ type, args }) => (
    type === "drawImage" && /(?:guardian|reaver)-owner/.test(args[0].name)
  ));
  assert.deepEqual(reducedEntityDraws.map(({ args }) => args[1]), [0, 0]);
});

test("capture, contest, rally, blocked production, destruction, and owner state remain visible beyond hue", () => {
  const camera = createCamera();
  const { entityAssets, structureAssets } = createAssets();
  const renderer = rendererApi.createDynamicRenderer({
    camera,
    configuration: { positionScale: 100, captureRequiredTicks: 120, pendingCommandCap: 64 },
    entityAssets,
    structureAssets
  });
  const context = createContext();
  const structures = [
    structureState("outpost", "production-outpost", 20000, {
      ownerSeat: 1,
      captureSeat: 2,
      captureProgress: 60,
      contested: true,
      queue: [{ id: "queue-1", blockedComplete: true }],
      rally: { x: 50000, y: 40000 }
    }),
    structureState("ruin", "resource-point", 30000, { destroyed: true })
  ];
  renderer.draw(context, {
    entities: [],
    structures,
    selectedEntityIds: new Set(),
    selectedStructureId: "outpost",
    movementFrames: new Map()
  });
  assert.ok(context.operations.some(({ type, args }) => type === "fillText" && args[0] === "RALLY"));
  assert.ok(context.operations.some(({ type, args }) => type === "fillText" && args[0] === "SPAWN BLOCKED"));
  assert.ok(context.operations.some(({ type, args }) => type === "setLineDash" && args.join(",") === "3,5"));
  assert.ok(context.operations.some(({ type, property, value }) => (
    type === "property" && property === "globalAlpha" && value === 0.48
  )), "destroyed intact art must be visibly de-emphasized until Phase 5 damage art exists");
  assert.ok(context.operations.filter(({ type }) => type === "moveTo").length > 3, "symbols and destroyed cross provide non-color geometry");
});

test("real authoritative positions derive contested capture presentation without changing simulation state", () => {
  const structure = structureState("outpost", "production-outpost", 20000, {
    x: 20000,
    captureRadius: 12400
  });
  const entities = [
    { id: "seat-1", ownerSeat: 1, x: 19900, y: 20000 },
    { id: "seat-2", ownerSeat: 2, x: 20100, y: 20000 }
  ];
  const frozen = JSON.stringify({ structure, entities });
  assert.equal(rendererApi.captureIsContested(structure, entities), true);
  assert.equal(rendererApi.captureIsContested(structure, [entities[0]]), false);
  assert.equal(rendererApi.captureIsContested({ ...structure, destroyed: true }, entities), false);
  assert.equal(JSON.stringify({ structure, entities }), frozen, "presentation derivation must not mutate authority");
});

test("all six non-color ownership symbols draw and missing prepared art fails closed", () => {
  for (const symbol of ["diamond", "cross", "triangle", "circle", "bars", "chevron"]) {
    const context = createContext();
    assert.doesNotThrow(() => rendererApi.drawOwnerSymbol(context, symbol, 10, 10, 5));
    assert.ok(context.operations.some(({ type }) => type === "stroke"));
  }
  assert.throws(() => rendererApi.drawOwnerSymbol(createContext(), "square", 0, 0, 1), /approved symbol/i);

  const camera = createCamera();
  const { entityAssets, structureAssets } = createAssets();
  delete structureAssets.structures["production-outpost"].ownerSheets[1];
  const renderer = rendererApi.createDynamicRenderer({
    camera,
    configuration: { positionScale: 100, captureRequiredTicks: 120, pendingCommandCap: 64 },
    entityAssets,
    structureAssets
  });
  assert.throws(() => renderer.draw(createContext(), {
    entities: [],
    structures: [structureState("missing-owner", "production-outpost", 10000, { ownerSeat: 1 })],
    selectedEntityIds: new Set(),
    selectedStructureId: null,
    movementFrames: new Map()
  }), /no owner-colored sheet/i);
  assert.throws(() => renderer.draw(createContext(), {
    entities: [],
    structures: [],
    selectedEntityIds: [],
    movementFrames: new Map()
  }), /Set and Map/i);
});
