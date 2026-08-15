"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const INPUT_SOURCE = fs.readFileSync(path.resolve(__dirname, "../js/input.js"), "utf8");

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter((candidate) => candidate !== listener));
  }

  dispatch(type, properties = {}) {
    const event = {
      type,
      target: this,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...properties,
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }
}

class FakeHTMLElement extends FakeEventTarget {
  closest() {
    return null;
  }
}

class FakeCanvas extends FakeHTMLElement {
  constructor() {
    super();
    this.capturedPointers = new Set();
  }

  setPointerCapture(pointerId) {
    this.capturedPointers.add(pointerId);
  }

  releasePointerCapture(pointerId) {
    this.capturedPointers.delete(pointerId);
  }
}

function createHarness(callbacks = {}) {
  const canvas = new FakeCanvas();
  const browserWindow = new FakeEventTarget();
  const document = { body: { dataset: {} } };
  const renderer = {
    width: 1024,
    height: 640,
    camera: { x: 0, y: 0, zoom: 1 },
    pans: [],
    zooms: [],
    clientToScreen(clientX, clientY) {
      return { x: clientX, y: clientY };
    },
    screenToWorld(screenX, screenY) {
      return { x: screenX + 100, y: screenY + 200 };
    },
    pan(x, y) {
      this.pans.push({ x, y });
    },
    zoomAt(x, y, factor) {
      this.zooms.push({ x, y, factor });
    },
  };

  browserWindow.window = browserWindow;
  browserWindow.document = document;
  browserWindow.HTMLElement = FakeHTMLElement;
  browserWindow.performance = { now: () => 1000 };
  browserWindow.AOK = {};

  const context = vm.createContext({
    console,
    document,
    window: browserWindow,
  });
  new vm.Script(INPUT_SOURCE, { filename: "js/input.js" }).runInContext(context);
  const controller = new browserWindow.AOK.InputController(canvas, renderer, callbacks);
  controller.setEnabled(true);

  return {
    browserWindow,
    canvas,
    controller,
    document,
    renderer,
  };
}

function pointer(canvas, type, properties) {
  return canvas.dispatch(type, {
    pointerId: 1,
    pointerType: "touch",
    button: 0,
    clientX: 100,
    clientY: 100,
    shiftKey: false,
    ...properties,
  });
}

function key(browserWindow, type, code, properties = {}) {
  return browserWindow.dispatch(type, {
    code,
    repeat: false,
    target: browserWindow,
    ...properties,
  });
}

test("a touch wobble below the 14 CSS pixel slop remains a primary tap", () => {
  const primaryEvents = [];
  const harness = createHarness({ onPrimary: (event) => primaryEvents.push(event) });

  pointer(harness.canvas, "pointerdown", { clientX: 80, clientY: 120 });
  pointer(harness.canvas, "pointermove", { clientX: 93, clientY: 120 });
  pointer(harness.canvas, "pointerup", { clientX: 93, clientY: 120 });

  assert.equal(primaryEvents.length, 1);
  assert.equal(primaryEvents[0].source, "touch");
  assert.equal(primaryEvents[0].screen.x, 93);
  assert.equal(primaryEvents[0].screen.y, 120);
  assert.equal(primaryEvents[0].world.x, 193);
  assert.equal(primaryEvents[0].world.y, 320);
  assert.equal(harness.renderer.pans.length, 0);
});

test("touch movement beyond drag slop pans without issuing a tap", () => {
  let primaryCount = 0;
  const harness = createHarness({ onPrimary: () => { primaryCount += 1; } });

  pointer(harness.canvas, "pointerdown", { clientX: 80, clientY: 120 });
  pointer(harness.canvas, "pointermove", { clientX: 95, clientY: 120 });
  pointer(harness.canvas, "pointerup", { clientX: 95, clientY: 120 });

  assert.equal(primaryCount, 0);
  assert.equal(harness.renderer.pans.length, 1);
  assert.equal(harness.renderer.pans[0].x, 15);
  assert.equal(harness.renderer.pans[0].y, 0);
});

test("two touch pointers pinch without issuing accidental commands", () => {
  let primaryCount = 0;
  let commandCount = 0;
  const harness = createHarness({
    onPrimary: () => { primaryCount += 1; },
    onCommand: () => { commandCount += 1; },
  });

  pointer(harness.canvas, "pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
  pointer(harness.canvas, "pointerdown", { pointerId: 2, clientX: 200, clientY: 100 });
  pointer(harness.canvas, "pointermove", { pointerId: 2, clientX: 225, clientY: 100 });
  pointer(harness.canvas, "pointerup", { pointerId: 1, clientX: 100, clientY: 100 });
  pointer(harness.canvas, "pointerup", { pointerId: 2, clientX: 225, clientY: 100 });

  assert.equal(primaryCount, 0);
  assert.equal(commandCount, 0);
  assert.equal(harness.renderer.zooms.length, 1);
  assert.equal(harness.renderer.zooms[0].factor, 1.25);
  assert.equal(harness.controller.pointers.size, 0);
});

test("pointer cancellation clears a transient box without committing selection", () => {
  const selectionBoxes = [];
  let boxSelectCount = 0;
  const harness = createHarness({
    onBoxSelect: () => { boxSelectCount += 1; },
    onSelectionBox: (rectangle) => selectionBoxes.push(rectangle),
  });

  pointer(harness.canvas, "pointerdown", {
    pointerId: 7,
    pointerType: "mouse",
    clientX: 40,
    clientY: 40,
  });
  pointer(harness.canvas, "pointermove", {
    pointerId: 7,
    pointerType: "mouse",
    clientX: 70,
    clientY: 70,
  });
  assert.notEqual(harness.controller.selectionBox, null, "the fixture must establish a transient box");
  pointer(harness.canvas, "pointercancel", {
    pointerId: 7,
    pointerType: "mouse",
    clientX: 70,
    clientY: 70,
  });

  assert.equal(boxSelectCount, 0);
  assert.equal(harness.controller.pointers.size, 0);
  assert.equal(harness.controller.selectionBox, null);
  assert.equal(selectionBoxes.at(-1), null);
  assert.equal(harness.document.body.dataset.inputMode, "command");
});

test("Q selects the army and Enter commands at the view centre", () => {
  let selectArmyCount = 0;
  let commandAtFocusCount = 0;
  const harness = createHarness({
    onSelectArmy: () => { selectArmyCount += 1; },
    onCommandAtFocus: () => { commandAtFocusCount += 1; },
  });

  const selectEvent = key(harness.browserWindow, "keydown", "KeyQ");
  const commandEvent = key(harness.browserWindow, "keydown", "Enter");

  assert.equal(selectArmyCount, 1);
  assert.equal(commandAtFocusCount, 1);
  assert.equal(selectEvent.defaultPrevented, true);
  assert.equal(commandEvent.defaultPrevented, true);
});

test("blur and disabling input clear held keys, Space, and active pointers", () => {
  const harness = createHarness();

  key(harness.browserWindow, "keydown", "KeyW");
  key(harness.browserWindow, "keydown", "Space");
  pointer(harness.canvas, "pointerdown", { pointerId: 3 });
  harness.browserWindow.dispatch("blur");

  assert.equal(harness.controller.keys.size, 0);
  assert.equal(harness.controller.spaceHeld, false);
  assert.equal(harness.controller.pointers.size, 0);

  key(harness.browserWindow, "keydown", "KeyD");
  key(harness.browserWindow, "keydown", "Space");
  pointer(harness.canvas, "pointerdown", { pointerId: 4 });
  harness.controller.setEnabled(false);

  assert.equal(harness.controller.keys.size, 0);
  assert.equal(harness.controller.spaceHeld, false);
  assert.equal(harness.controller.pointers.size, 0);

  harness.controller.setEnabled(true);
  harness.controller.update(0.25);
  assert.equal(harness.renderer.pans.length, 0, "re-enabling must not replay stale held movement");
});
