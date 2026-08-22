"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const inputApi = require(path.join(ROOT, "phase5/input.js"));
const rendererApi = require(path.join(ROOT, "phase5/renderer.js"));
const simulationApi = require(path.join(ROOT, "phase5/simulation.js"));
const phase5Map = require(path.join(ROOT, "phase5/map.js"));
const phase5Representatives = require(path.join(ROOT, "phase5/config.js")).representatives;
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
      if (remaining.length) listeners.set(type, remaining);
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
        buttons: 0,
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
    closest() { return null; },
    getBoundingClientRect() { return rect; },
    setPointerCapture(pointerId) { captures.add(pointerId); },
    hasPointerCapture(pointerId) { return captures.has(pointerId); },
    releasePointerCapture(pointerId) { captures.delete(pointerId); releases.push(pointerId); }
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
    zoomAt(nextZoom, x, y) { zoom = nextZoom; zooms.push([nextZoom, x, y]); }
  };
}

function withBrowserTargets(run) {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const browserWindow = createEventTarget();
  const browserDocument = createEventTarget();
  global.window = browserWindow;
  global.document = browserDocument;
  try { return run({ browserWindow, browserDocument }); }
  finally { global.window = originalWindow; global.document = originalDocument; }
}

test("Phase 5 input and renderer expose bounded CommonJS and classic-script APIs", () => {
  assert.deepEqual(Object.keys(inputApi), ["createInput"]);
  assert.equal(typeof rendererApi.createDynamicRenderer, "function");
  assert.equal(typeof rendererApi.entityFrameIndex, "function");
  assert.equal(typeof rendererApi.structureVisualState, "function");

  const context = { console };
  context.window = context;
  vm.createContext(context);
  for (const relativePath of ["phase3/input.js", "phase5/input.js", "phase5/renderer.js"]) {
    new vm.Script(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), { filename: relativePath }).runInContext(context);
  }
  assert.equal(typeof context.AeonPhase5Input.createInput, "function");
  assert.equal(typeof context.AeonPhase5Renderer.createDynamicRenderer, "function");
});

test("desktop hover and contextual right-click stay explicit and selection-neutral", () => {
  withBrowserTargets(() => {
    const target = createEventTarget({ left: 10, top: 20, width: 640, height: 360 });
    const camera = createCamera();
    const selections = [];
    const contexts = [];
    const hovers = [];
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraConfiguration,
      onSelectPoint: (payload) => selections.push(payload),
      onContextRequest: (payload) => contexts.push(payload),
      onHoverChange: (payload) => hovers.push(payload)
    });

    target.dispatch("pointermove", { clientX: 110, clientY: 120 });
    assert.deepEqual(hovers.at(-1).worldPoint, { x: 1100, y: 2100 });
    target.dispatch("pointerdown", { pointerId: 11, clientX: 110, clientY: 120 });
    target.dispatch("pointerup", { pointerId: 11, clientX: 110, clientY: 120 });
    assert.equal(selections.length, 1);
    const menu = target.dispatch("contextmenu", { clientX: 30, clientY: 50 });
    assert.equal(menu.prevented, true);
    assert.equal(contexts[0].mode, null);
    assert.deepEqual(contexts[0].worldPoint, { x: 1020, y: 2030 });
    assert.equal(selections.length, 1, "context commands do not mutate selection inside the translator");
    target.dispatch("pointerleave");
    assert.equal(hovers.at(-1), null);
    input.destroy();
  });
});

test("all six one-shot modes are mutually exclusive and touch consumes only the armed intent", () => {
  withBrowserTargets(() => {
    const target = createEventTarget();
    const requests = [];
    const modes = [];
    const input = inputApi.createInput({
      target,
      camera: createCamera(),
      configuration: cameraConfiguration,
      onContextRequest: (payload) => requests.push(payload),
      onContextModeChange: (mode) => modes.push(mode)
    });
    for (const mode of ["move", "rally", "attack", "attack-move", "defend-point", "defend-entity"]) {
      assert.equal(input.setContextMode(mode), mode);
      assert.equal(input.snapshot().contextMode, mode);
    }
    assert.throws(() => input.setContextMode("ability"), /move.*rally.*attack.*defend/i);
    input.setContextMode("attack");
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 2, clientX: 120, clientY: 130 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 2, clientX: 120, clientY: 130 });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].mode, "attack");
    assert.equal(requests[0].source, "touch");
    assert.equal(input.snapshot().contextMode, null);
    assert.equal(modes.at(-1), null);
    const touchMenu = target.dispatch("contextmenu", { pointerType: "touch", clientX: 80, clientY: 90 });
    assert.equal(touchMenu.prevented, true);
    assert.equal(requests.length, 1, "touch never gains an implicit focus attack through a context menu");
    input.destroy();
  });
});

test("camera gestures issue no tactical command and every lifecycle cleanup clears mode and hover", () => {
  withBrowserTargets(({ browserWindow, browserDocument }) => {
    const target = createEventTarget();
    const camera = createCamera();
    const requests = [];
    const hovers = [];
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraConfiguration,
      onContextRequest: (payload) => requests.push(payload),
      onHoverChange: (payload) => hovers.push(payload)
    });
    input.setContextMode("defend-entity");
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 3, clientX: 100, clientY: 100 });
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 4, clientX: 200, clientY: 100 });
    assert.equal(input.snapshot().contextMode, null, "two-finger camera entry cancels the armed one-shot command");
    target.dispatch("pointermove", { pointerType: "touch", pointerId: 4, clientX: 240, clientY: 100 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 3, clientX: 100, clientY: 100 });
    target.dispatch("pointerup", { pointerType: "touch", pointerId: 4, clientX: 240, clientY: 100 });
    assert.equal(requests.length, 0);
    assert.ok(camera.pans.length || camera.zooms.length);

    input.setContextMode("attack-move");
    browserDocument.hidden = true;
    browserDocument.dispatch("visibilitychange");
    assert.equal(input.snapshot().contextMode, null);
    input.setContextMode("defend-point");
    browserWindow.dispatch("pagehide");
    assert.equal(input.snapshot().contextMode, null);
    input.setContextMode("attack");
    assert.equal(input.setEnabled(false), false);
    assert.equal(input.snapshot().contextMode, null);
    assert.equal(hovers.at(-1), null);
    input.destroy();
    assert.equal(target.listenerCount(), 0);
    assert.equal(browserWindow.listenerCount(), 0);
    assert.equal(browserDocument.listenerCount(), 0);
  });
});

function createAssets() {
  const ownerPresentations = {
    1: { id: 1, name: "Azure", rgb: [47, 169, 255], symbol: "diamond" },
    2: { id: 2, name: "Violet", rgb: [165, 92, 255], symbol: "cross" }
  };
  const presentation = {
    drawSizeWorld: [160, 128],
    destinationGroundRoot: [80, 120],
    anchorOffsetsFromGroundWorld: { owner: [60, -94], health: [0, -108] }
  };
  function structureAsset(name) {
    return {
      neutralImage: { name: `${name}-intact-neutral` },
      ownerSheets: { 1: { name: `${name}-intact-owner-1` }, 2: { name: `${name}-intact-owner-2` } },
      states: {
        intact: {
          neutralImage: { name: `${name}-intact-neutral` },
          ownerSheets: { 1: { name: `${name}-intact-owner-1` }, 2: { name: `${name}-intact-owner-2` } }
        },
        damaged: {
          neutralImage: { name: `${name}-damaged-neutral` },
          ownerSheets: { 1: { name: `${name}-damaged-owner-1` }, 2: { name: `${name}-damaged-owner-2` } }
        },
        destroyed: { neutralImage: { name: `${name}-destroyed-neutral` }, ownerSheets: {} }
      },
      presentation
    };
  }
  return {
    entityAssets: {
      cellSize: 128,
      renderCell: { width: 160, height: 160, rootX: 80, rootY: 147.5 },
      ownerPresentations,
      entities: {
        "astral-guardian": { ownerSheets: { 1: { name: "guardian-owner-1" } } },
        "aegis-titan": { ownerSheets: { 1: { name: "titan-owner-1" } } },
        "hollow-string": { ownerSheets: { 2: { name: "hollow-owner-2" } } },
        "gravebound-reaver": { ownerSheets: { 2: { name: "reaver-owner-2" } } },
        "ossuary-colossus": { ownerSheets: { 2: { name: "colossus-owner-2" } } },
        starbow: { ownerSheets: { 1: { name: "starbow-owner-1" } } }
      }
    },
    structureAssets: {
      ownerPresentations,
      structures: {
        "astral-headquarters": structureAsset("astral-hq"),
        "gravebound-headquarters": structureAsset("grave-hq"),
        "resource-point": structureAsset("resource"),
        "production-outpost": structureAsset("outpost")
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
  for (const property of ["strokeStyle", "fillStyle", "lineWidth", "globalAlpha", "font", "textAlign", "textBaseline"]) {
    Object.defineProperty(context, property, {
      set(value) { operations.push({ type: "property", property, value }); },
      get() { return undefined; }
    });
  }
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
    order: "IDLE",
    route: [],
    routeIndex: 0,
    health: 240,
    maxHealth: 240,
    targetId: null,
    attackStartTick: null,
    ...overrides
  };
}

function structure(id, category, y, overrides = {}) {
  return {
    id,
    category,
    faction: null,
    x: 10000,
    y,
    radius: 4600,
    ownerSeat: null,
    health: category === "headquarters" ? 1800 : category === "resource-point" ? 800 : 1200,
    maxHealth: category === "headquarters" ? 1800 : category === "resource-point" ? 800 : 1200,
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

const renderConfiguration = {
  positionScale: 100,
  captureRequiredTicks: 120,
  pendingCommandCap: 64,
  projectileCap: 96,
  presentationalEffectCap: 96
};
const representatives = {
  "astral-guardian": { attackCycleTicks: 20 },
  "gravebound-reaver": { attackCycleTicks: 20 },
  starbow: { attackCycleTicks: 24 }
};

test("action and defeat playback use exact authored cells and reduced motion never changes timing authority", () => {
  const base = combat("guardian", 10000, { attackStartTick: 10 });
  assert.equal(rendererApi.entityFrameIndex({ ...base, attackCycleTicks: 20, moving: false }, 10, 0, false), 4);
  assert.equal(rendererApi.entityFrameIndex({ ...base, attackCycleTicks: 20, moving: false }, 29, 0, false), 9);
  assert.equal(rendererApi.entityFrameIndex({ ...base, attackCycleTicks: 20, moving: false }, 10, 0, true), 6);
  assert.equal(rendererApi.entityFrameIndex({ ...base, defeatAgeTicks: 0 }, 0, 0, false), 10);
  assert.equal(rendererApi.entityFrameIndex({ ...base, defeatAgeTicks: 11 }, 0, 0, false), 15);
  assert.equal(rendererApi.entityFrameIndex({ ...base, defeatAgeTicks: 7 }, 0, 0, true), 12);
  assert.equal(rendererApi.entityFrameIndex({ ...base, attackStartTick: null, moving: true }, 0, 3, false), 3);
});

test("structure state uses exact health thresholds and destruction clears owner-art dependence", () => {
  for (const fixture of [
    { id: "astral-hq", category: "headquarters", faction: "astral-concord", maximum: 1800 },
    { id: "grave-hq", category: "headquarters", faction: "gravebound-court", maximum: 1800 },
    { id: "resource", category: "resource-point", faction: null, maximum: 800 },
    { id: "outpost", category: "production-outpost", faction: null, maximum: 1200 }
  ]) {
    const base = structure(fixture.id, fixture.category, 0, {
      faction: fixture.faction, maxHealth: fixture.maximum, health: fixture.maximum
    });
    assert.equal(rendererApi.structureVisualState(base), "intact");
    assert.equal(rendererApi.structureVisualState({ ...base, health: fixture.maximum / 2 + 1 }), "intact");
    assert.equal(rendererApi.structureVisualState({ ...base, health: fixture.maximum / 2 }), "damaged");
    assert.equal(rendererApi.structureVisualState({ ...base, health: 0, ownerSeat: null, destroyed: true }), "destroyed");
  }
  assert.throws(() => rendererApi.structureVisualState({ health: 3, maxHealth: 2 }), /health/i);
});

test("one dynamic pass uses state art, exact left mirror, health text, hostile symbols, projectiles, and bounded effects", () => {
  const camera = createCamera();
  const { entityAssets, structureAssets } = createAssets();
  const renderer = rendererApi.createDynamicRenderer({
    camera,
    configuration: renderConfiguration,
    representatives,
    entityAssets,
    structureAssets
  });
  const entities = [
    combat("astral", 10000, { facing: "left", order: "ATTACK_ENTITY", targetId: "grave", attackStartTick: 10 }),
    combat("grave", 20000, { ownerSeat: 2, kind: "gravebound-reaver", health: 120 })
  ];
  const structures = [
    structure("outpost", "production-outpost", 30000, { ownerSeat: 1, health: 600 }),
    structure("ruin", "resource-point", 40000, { ownerSeat: null, health: 0, destroyed: true })
  ];
  const context = createContext();
  renderer.draw(context, {
    tick: 15,
    entities,
    structures,
    projectiles: [{
      id: "projectile-000000000001", sourceSeat: 1, targetId: "grave", damage: 22,
      launchTick: 12, arrivalTick: 25, launchX: 10000, launchY: 10000,
      launchSourceRadius: 1400, launchTargetX: 30000, launchTargetY: 20000,
      launchTargetRadius: 1600, launchEdgeDistance: 19360
    }],
    defeatShells: [combat("fallen", 25000, { health: 0, defeatAgeTicks: 4 })],
    effects: [{ kind: "impact", x: 10000, y: 20000 }],
    hoveredTargetId: "grave",
    selectedEntityIds: new Set(["astral"]),
    selectedStructureId: "outpost",
    movementFrames: new Map(),
    destinationFeedback: []
  });
  const draws = context.operations.filter(({ type }) => type === "drawImage");
  assert.ok(draws.some(({ args }) => args[0].name === "outpost-damaged-owner-1"));
  assert.ok(draws.some(({ args }) => args[0].name === "resource-destroyed-neutral"));
  assert.equal(context.operations.filter(({ type, args }) => type === "scale" && args[0] === -1 && args[1] === 1).length, 1);
  assert.ok(context.operations.some(({ type, args }) => type === "fillText" && String(args[0]).includes("HP 120/240")));
  assert.ok(context.operations.some(({ type, args }) => type === "fillText" && args[0] === "HOSTILE ⊗"));
  assert.ok(context.operations.some(({ type, args }) => type === "fillText" && args[0] === "HIT"));
  assert.ok(context.operations.filter(({ type }) => type === "arc").length > 5, "projectile and ownership/target shapes remain visible");
  const projectileArc = context.operations.find(({ type, args }) => type === "arc" && args[2] === 4);
  assert.deepEqual(projectileArc.args.slice(0, 2).map(Math.round), [297, 253],
    "projectile presentation follows frozen launch geometry instead of the moved live target root");

  const actionDraw = draws.find(({ args }) => args[0].name === "guardian-owner-1");
  assert.deepEqual(actionDraw.args.slice(1, 3), [128, 128], "elapsed tick five selects authored action frame one");
  const defeatDraw = draws.find(({ args }) => args[0].name === "guardian-owner-1" && args[2] === 384);
  assert.ok(defeatDraw, "defeat age four selects authored defeat frame two at sheet index twelve");

  const removedTargetContext = createContext();
  renderer.draw(removedTargetContext, {
    tick: 15,
    entities: [entities[0]],
    structures,
    projectiles: [{
      id: "projectile-000000000002", sourceSeat: 1, targetId: "removed", damage: 22,
      launchTick: 12, arrivalTick: 25, launchX: 10000, launchY: 10000,
      launchSourceRadius: 1400, launchTargetX: 30000, launchTargetY: 20000,
      launchTargetRadius: 1600, launchEdgeDistance: 19360
    }],
    defeatShells: [], effects: [], hoveredTargetId: null,
    selectedEntityIds: new Set(), selectedStructureId: null,
    movementFrames: new Map(), destinationFeedback: []
  });
  assert.ok(removedTargetContext.operations.some(({ type, args }) => type === "arc" && args[2] === 4),
    "an in-flight projectile remains visible after its target leaves authoritative play");
});

test("the renderer accepts the complete real opening Phase 5 snapshot without inventing presentation state", () => {
  const camera = createCamera();
  const { entityAssets, structureAssets } = createAssets();
  const configuration = require(path.join(ROOT, "phase5/config.js")).configuration;
  const snapshot = simulationApi.createSimulation({ map: phase5Map, seed: 0x4a0e2026 }).snapshot();
  const authored = new Map(phase5Map.phase5.structures.map((value) => [value.id, value]));
  const structures = snapshot.structures.map((value) => ({
    ...value,
    faction: authored.get(value.id).faction,
    captureRadius: authored.get(value.id).captureRadius
      ? authored.get(value.id).captureRadius * configuration.positionScale
      : null,
    captureSeat: value.capture.challengerSeat,
    captureProgress: value.capture.progressTicks,
    contested: false
  }));
  const renderer = rendererApi.createDynamicRenderer({
    camera, configuration, representatives: phase5Representatives, entityAssets, structureAssets
  });
  const context = createContext();
  assert.doesNotThrow(() => renderer.draw(context, {
    tick: snapshot.tick,
    entities: snapshot.entities,
    structures,
    projectiles: snapshot.projectiles,
    defeatShells: [],
    effects: [],
    hoveredTargetId: null,
    selectedEntityIds: new Set(),
    selectedStructureId: null,
    movementFrames: new Map(),
    destinationFeedback: []
  }));
  assert.equal(context.operations.filter(({ type }) => type === "drawImage").length, 17);
  assert.ok(context.operations.some(({ type, args }) => type === "fillText" && String(args[0]).includes("HP 520/520")));
  assert.ok(context.operations.some(({ type, args }) => type === "fillText" && String(args[0]).includes("HP 1800/1800")));
});

test("draw ordering remains stable and rendering fails closed on missing damage art", () => {
  const entities = [combat("z", 20000), combat("a", 10000)];
  const structures = [structure("b", "resource-point", 10000), structure("c", "production-outpost", 30000)];
  assert.deepEqual(rendererApi.buildDrawOrder(entities, structures).map(({ type, value }) => [type, value.id]), [
    ["combat", "a"], ["structure", "b"], ["combat", "z"], ["structure", "c"]
  ]);
  const camera = createCamera();
  const { entityAssets, structureAssets } = createAssets();
  delete structureAssets.structures["production-outpost"].states.damaged.ownerSheets[1];
  const renderer = rendererApi.createDynamicRenderer({
    camera, configuration: renderConfiguration, representatives, entityAssets, structureAssets
  });
  assert.throws(() => renderer.draw(createContext(), {
    tick: 0,
    entities: [],
    structures: [structure("missing", "production-outpost", 0, { ownerSeat: 1, health: 600 })],
    projectiles: [], defeatShells: [], effects: [], selectedEntityIds: new Set(), movementFrames: new Map()
  }), /no owner-colored sheet/i);
});
