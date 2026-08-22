"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const bytes = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath));
const clone = (value) => JSON.parse(JSON.stringify(value));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const cameraApi = require(path.join(ROOT, "phase2/camera.js"));
const baseRendererApi = require(path.join(ROOT, "phase2/renderer.js"));
const entityManifest = require(path.join(ROOT, "phase3/assets/entities/manifest.js"));
const phase5Config = require(path.join(ROOT, "phase5/config.js"));
const map = require(path.join(ROOT, "phase5/map.js"));
const navigationApi = require(path.join(ROOT, "phase5/navigation.js"));
const simulationApi = require(path.join(ROOT, "phase5/simulation.js"));
const replayApi = require(path.join(ROOT, "phase5/replay.js"));
const phase5RendererApi = require(path.join(ROOT, "phase5/renderer.js"));
const structureManifest = require(path.join(ROOT, "phase5/assets/structures/manifest.js"));
const phase6Config = require(path.join(ROOT, "phase6/config.js"));
const aiApi = require(path.join(ROOT, "phase6/ai.js"));
const skirmishApi = require(path.join(ROOT, "phase6/skirmish.js"));
const hardening = require(path.join(ROOT, "phase7/hardening.js"));

const { configuration, representatives, compareIdentifiers } = phase5Config;
const { limits } = phase6Config;

const CLOSED_SOURCE_HASHES = Object.freeze({
  "phase2/app.js": "be813f97057cc241ba3f9a61fed2cd5d7d927438d3e86b6e2e062cae56b35427",
  "phase2/camera.js": "881c3909f415e6a2763bd7931436ad506b6a8313459fc2e20b27c4bc2c6477a1",
  "phase2/index.html": "f40727002e991b2bea670182d00c6fdc0168a676cc27a6b5df3978a9f1f9f0fc",
  "phase2/input.js": "e10be18e27373caf1558c028510f9da2587426dd47269b54a81316a859d6d9eb",
  "phase2/map.js": "3e0a64da499411db0acce2993b0bf91fcf29a8a329d01fa834376fc5ef5be7ab",
  "phase2/phase2.css": "974c507da96013db3d182440a6f1f03a54c12f18c3e97ed9d3ed908c6579cc4e",
  "phase2/renderer.js": "961ea950650ac23cd31d9a53ae3fc0492a7672f8ae0dc6e3302380e8ccc1f97b",
  "phase3/app.js": "5adf0961eb435b00452848a81582ef04ccb99df78b4801a601c28db1b503dc31",
  "phase3/assets.js": "187572929c486c0bce881649c85125ccea20a624986cd675bceaf2641cb4f355",
  "phase3/assets/entities/manifest.js": "c29f5d0aa2b6ed82c6c28e5979f005bb9524c88c29d7357c7a046585bdcd4173",
  "phase3/config.js": "af950a9e72a0ad56074f635ff16fa613c727cc896d55b5cc8aad3841666c58e8",
  "phase3/index.html": "e9bcf8a6fb57bcd48ffcad1504038ba50a6ea09ee7ec5316eee5c514168d09cc",
  "phase3/input.js": "81831c4c821df32983ca81597495f96b8bdf05388349950e8ecf7af2d43d4b5e",
  "phase3/navigation.js": "bb44b00ae5c5ae49c054bbd1ee691cd9d5a593b29fe0d124e8a51ad4f97e1819",
  "phase3/phase3.css": "303aa687e9dc528326389cb46db9eccbd468dce74a84b4ba05d1f2a435854dea",
  "phase3/renderer.js": "dd73a608e027588119dc08a48b39130b1b34d780edc61358d9974a5cf6a79939",
  "phase3/replay.js": "4fc11dbe817958b118b89263a3f76aa18415f4d5dd13d41e1be5b10e979968dc",
  "phase3/simulation.js": "a82c7142fa5c098b4f40a551ee3e1c1eb3c17d04475cae0c41db373a375c6c5b",
  "phase4/app.js": "49a4c6d843e71c4a5ee4090134ff1659c6903406ab1771769787fa3b645aea80",
  "phase4/assets.js": "5398a02c93ae9b98a9bb5255c110bad7adeab1b6e2bb4507f33cfad78dbacf1d",
  "phase4/assets/structures/manifest.js": "34732c8026975589e2c93ec5a849b7e9e0accc29d3ee09679b7d10589aa77831",
  "phase4/config.js": "e20dfa43702c74c9842a72776da06cbe433cdc1f648ed86b518f6297e9aaac4d",
  "phase4/index.html": "06a713505c49924436895eab64c1d788f647b709a85055b790fedbb16acb625c",
  "phase4/input.js": "be15bbaa892996492663b45ffef4a68642d1d5848fb4b93735366a0fb910f508",
  "phase4/map.js": "68498e0db841b2960d125212b48fd50417efd7d4cc9923b14c1bf49661eae6c7",
  "phase4/navigation.js": "1b959b80f459fbe7cfbd5092093dce34bca839d5b1e316ff721e3156a78c12df",
  "phase4/phase4.css": "1cc1308102b7c34b51449d3b0b533b1851644e07ba852e8e2a9c53e96835b8a2",
  "phase4/renderer.js": "dcca5b272afb0536485b05b2a73aa696a14a916c61ff6cb68078724612b8dde2",
  "phase4/replay.js": "a02a14d548575be58cc385535e2708b8f86bcd124fdae7d07236763421cef305",
  "phase4/simulation.js": "35b586fea7dc91152ac8a94ae8eea96246b17679c7fa21e1f2d90255e2a60111",
  "phase5/app.js": "5315e6a816464433e12078991c6e88627460217f3f904e6dcb9d8f32f50cd73b",
  "phase5/assets.js": "d5962644328b6b9417bc7954f1e42d668e810475dee7704a418dda68bc3c034d",
  "phase5/assets/structures/manifest.js": "2a4462da672f69e9c6dd919a4ed76d5d3fb32cc6d30164177000933ec7d52906",
  "phase5/config.js": "90b3513def68024d20abb3c9df274f44dc7ee7b4c042b77d52bae1007da4ec3b",
  "phase5/index.html": "da201715b3751401a8e9b812cd1ff37376688676b78923568d7196ebac0e0685",
  "phase5/input.js": "b6c586c9804ef1b649ad5cc1ea7ec48d80215f6cf3a9ebce21bf1847c8a4cd5b",
  "phase5/map.js": "21290fdc68398f2d5f970c71179b1a2743ad2160fff272f286a81322bb05c56d",
  "phase5/navigation.js": "f0a9065e12d81099d740f0b9b5d039d55ea862aeec5367a0528ba45252867cb4",
  "phase5/phase5.css": "2754a65a7261cb269ad69c32f1516004b484643e09f4b8fdc36230a1dbbb0595",
  "phase5/renderer.js": "9d18da587b17b46e38ec59ab5c3c481be8e8bd52deb0eb56a44b3cba9ff5e69a",
  "phase5/replay.js": "2b9a014de5f407778ebc4765e6a1976f669d22b43c4960da4634faf8f23f89a5",
  "phase5/simulation.js": "0d0a6881fd4b6236249506da32154e4c46c5aea3d425ffe048a5384e565dea2e",
  "phase6/ai.js": "9718149bc3917e6cce4ded1a0d15d2499d40cb9357d119a5426b6665b98fa656",
  "phase6/app.js": "76538cd66f59462cf497ef0f80af6b99eb7d813147eb332057199bd0a9a72732",
  "phase6/config.js": "5e3bef505312d973d0489ea2924cccb3cd6b8e68989aa7f9b7bce3c80e1ac4ec",
  "phase6/index.html": "5fe1ad6b29f63894101ad1680188616326ee5fedae7d4fabd98958a3748d0ef3",
  "phase6/phase6.css": "44925d03a675da9dfed9ac00c2ba2567b01125b015abffaf7dcb8f3476852b0a",
  "phase6/skirmish.js": "af235e7fcead1d48ef66ddb4c77663cbb3d803d63f9062126b04b1915e591213",
  "tests/phase6-ai.test.js": "4d6a99ba0e1d9fbb46bb5ac9ded2a5fcdce7928c97b9aabad9fc1f038f92dbdb",
  "tests/phase6-config.test.js": "6e7da9566e72d647168381f9f787cc98e4377fd9287b7f28151f1d09bcccc06e",
  "tests/phase6-shell.test.js": "2c4c102508faa193ac1b63b97e6357fc6fb3522370d115054e98ead5e4c16cd4",
  "tests/phase6-skirmish.test.js": "e6594160cfae9867d0d49cf3762dfa781cc77d3bf30d71b32a12d95add0a160b"
});

const PHASE7_SCRIPTS = Object.freeze([
  "../phase2/map.js",
  "../phase2/camera.js",
  "../phase2/renderer.js?v=2026.8.22e",
  "../phase3/assets/entities/manifest.js",
  "../phase3/assets.js",
  "../phase3/input.js",
  "../phase4/config.js",
  "../phase4/map.js",
  "../phase4/assets/structures/manifest.js",
  "../phase4/assets.js",
  "../phase5/config.js",
  "../phase5/map.js",
  "../phase5/navigation.js",
  "../phase5/simulation.js",
  "../phase5/replay.js",
  "../phase5/assets/structures/manifest.js",
  "../phase5/assets.js",
  "../phase5/renderer.js",
  "../phase5/input.js",
  "../phase6/config.js",
  "../phase6/ai.js",
  "../phase6/skirmish.js",
  "hardening.js",
  "app.js?v=2026.8.22i"
]);

const PHASE7_STYLES = Object.freeze([
  "../phase2/phase2.css?v=2026.8.22e",
  "../phase5/phase5.css?v=2026.8.22e",
  "../phase6/phase6.css?v=2026.8.22g",
  "phase7.css?v=2026.8.22i"
]);

function command(simulation, kind, payload, overrides = {}) {
  return {
    protocolVersion: configuration.protocolVersion,
    configurationId: configuration.configurationId,
    kind,
    issuingPlayer: 1,
    targetTick: simulation.tick + 1,
    ...payload,
    ...overrides
  };
}

function exactIds(html) {
  return Array.from(html.matchAll(/\bid=["']([^"']+)["']/gi), (match) => match[1]);
}

function localReference(reference) {
  if (/^(?:data:|#)/.test(reference)) return true;
  if (/^(?:https?:)?\/\//i.test(reference) || reference.includes("\\")) return false;
  const resolved = new URL(reference, "https://example.invalid/phase7/index.html");
  return resolved.origin === "https://example.invalid" && !resolved.pathname.includes("/../");
}

function approximate(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, received ${actual}`);
}

function webpDimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const kind = buffer.subarray(offset, offset + 4).toString("ascii");
    const length = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (kind === "VP8 ") {
      assert.equal(buffer.subarray(payload + 3, payload + 6).toString("hex"), "9d012a");
      return { width: buffer.readUInt16LE(payload + 6) & 0x3fff, height: buffer.readUInt16LE(payload + 8) & 0x3fff };
    }
    if (kind === "VP8X") {
      return {
        width: 1 + buffer.readUIntLE(payload + 4, 3),
        height: 1 + buffer.readUIntLE(payload + 7, 3)
      };
    }
    if (kind === "VP8L") {
      const bits = buffer.readUInt32LE(payload + 1);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    offset = payload + length + (length & 1);
  }
  throw new Error("WebP has no supported image chunk");
}

function noOpContext() {
  return new Proxy({}, {
    get(target, key) {
      if (!Object.hasOwn(target, key)) target[key] = () => {};
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; }
  });
}

function canvasRecord() {
  return Object.fromEntries(hardening.CANVAS_LAYERS.map((layer) => [layer, {
    width: 0,
    height: 0,
    getContext() { return noOpContext(); }
  }]));
}

function createPhase7AppVmHarness({
  completeAfterSteps = null,
  failEntityLoad = false,
  initiallyFocused = true,
  search = "?art=compact"
} = {}) {
  const counters = {
    animationRequested: 0,
    animationCancelled: 0,
    cameraResets: 0,
    cameraZooms: [],
    dynamicDraws: 0,
    entityDisposals: 0,
    entityLoads: 0,
    entityTier: null,
    entityBaseUrl: null,
    groundReleases: 0,
    fullscreenExits: 0,
    fullscreenRequests: 0,
    humanCommands: [],
    inputCreated: 0,
    inputDestroyed: 0,
    inputEnabled: [],
    inputTransientResets: 0,
    orientationLocks: 0,
    orientationUnlocks: 0,
    navigationStates: [],
    reducedMotionChanges: [],
    rendererCreated: 0,
    rendererDestroyed: 0,
    resizeObserverDisconnected: 0,
    skirmishCreated: 0,
    skirmishDestroyed: 0,
    skirmishSteps: 0,
    skirmishSuspended: [],
    structureDisposals: 0,
    structureLoads: 0,
    structureBaseUrl: null
  };
  const focusHistory = [];
  const animationCallbacks = new Map();
  let nextAnimationIdentifier = 1;
  let documentRef = null;

  class FakeTarget {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    listenerCount() {
      return Array.from(this.listeners.values()).reduce((total, listeners) => total + listeners.size, 0);
    }
    emit(type, overrides = {}) {
      const event = {
        type,
        target: this,
        currentTarget: this,
        detail: 0,
        persisted: false,
        pointerType: "mouse",
        preventDefault() {},
        stopPropagation() {},
        stopImmediatePropagation() {},
        ...overrides
      };
      return Array.from(this.listeners.get(type) || [], (listener) => listener(event));
    }
    async dispatch(type, overrides = {}) {
      await Promise.all(this.emit(type, overrides).map((result) => Promise.resolve(result)));
    }
  }

  function selectorMatches(element, selector) {
    if (selector === "button, a, input, select, textarea, dialog, [contenteditable='true']") {
      return ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "DIALOG"].includes(element.tagName)
        || element.getAttribute("contenteditable") === "true";
    }
    if (selector === "canvas[data-layer]") return element.tagName === "CANVAS" && Boolean(element.dataset.layer);
    if (selector === "button[data-production-role]") return element.tagName === "BUTTON" && Boolean(element.dataset.productionRole);
    if (selector === "button[data-queue-item-id]") return element.tagName === "BUTTON" && Boolean(element.dataset.queueItemId);
    if (selector === "button[data-queue-item-id]:not(:disabled)") {
      return element.tagName === "BUTTON" && Boolean(element.dataset.queueItemId) && !element.disabled;
    }
    if (selector === "button:not(:disabled)") return element.tagName === "BUTTON" && !element.disabled;
    if (selector === "[data-option-name]") return element.dataset.optionName !== undefined;
    if (selector === "[data-option-cost]") return element.dataset.optionCost !== undefined;
    if (selector === "button[value='close']") return element.tagName === "BUTTON" && element.value === "close";
    const queueIdentifier = selector.match(/^\[data-queue-item-id="([^"]+)"\]$/);
    return Boolean(queueIdentifier && element.dataset.queueItemId === queueIdentifier[1]);
  }

  class FakeElement extends FakeTarget {
    constructor(tagName = "div", id = "") {
      super();
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this.attributes = new Map();
      this.children = [];
      this.parentElement = null;
      this.parentNode = null;
      this.dataset = {};
      this.style = {};
      this.hidden = false;
      this.inert = false;
      this.disabled = false;
      this.isConnected = true;
      this.open = false;
      this.checked = false;
      this.value = "";
      this.max = 1;
      this.tabIndex = this.tagName === "BUTTON" || this.tagName === "SELECT" || this.tagName === "INPUT" ? 0 : -1;
      this.textContent = "";
      this.title = "";
      this.width = 0;
      this.height = 0;
    }
    append(...children) {
      for (const child of children) {
        if (!child) continue;
        child.parentElement = this;
        child.parentNode = this;
        this.children.push(child);
      }
    }
    replaceChildren(...children) {
      for (const child of this.children) {
        child.parentElement = null;
        child.parentNode = null;
      }
      this.children = [];
      this.append(...children);
    }
    contains(candidate) {
      for (let current = candidate; current; current = current.parentElement) {
        if (current === this) return true;
      }
      return false;
    }
    descendants() {
      const values = [];
      const visit = (parent) => {
        for (const child of parent.children) {
          values.push(child);
          visit(child);
        }
      };
      visit(this);
      return values;
    }
    querySelectorAll(selector) { return this.descendants().filter((element) => selectorMatches(element, selector)); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) {
      for (let current = this; current; current = current.parentElement) {
        if (selectorMatches(current, selector)) return current;
      }
      return null;
    }
    setAttribute(name, value) {
      const normalized = String(value);
      this.attributes.set(name, normalized);
      if (name === "open") this.open = true;
      if (name.startsWith("data-")) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this.dataset[key] = normalized;
      }
    }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) {
      this.attributes.delete(name);
      if (name === "open") this.open = false;
      if (name === "style") this.style = {};
      if (name.startsWith("data-")) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        delete this.dataset[key];
      }
    }
    matches(selector) { return selector === ":disabled" ? this.disabled : selectorMatches(this, selector); }
    focus() {
      documentRef.activeElement = this;
      focusHistory.push(this.id || this.tagName.toLowerCase());
    }
    showModal() { this.open = true; }
    close() {
      if (!this.open) return;
      this.open = false;
      this.emit("close");
    }
    getBoundingClientRect() {
      return { left: 0, top: 0, width: this.clientWidth || 844, height: this.clientHeight || 390 };
    }
    getContext() { return noOpContext(); }
  }

  const APP_IDS = Array.from(new Set(
    Array.from(read("phase7/app.js").matchAll(/byId\("([^"]+)"\)/g), (match) => match[1])
  ));
  const buttonIds = new Set(APP_IDS.filter((id) => id.endsWith("-button")));
  const tagFor = (id) => {
    if (buttonIds.has(id)) return "button";
    if (id === "structure-select" || id === "art-tier") return "select";
    if (id === "fullscreen-on-begin") return "input";
    if (id === "production-progress") return "progress";
    if (id === "settings-dialog") return "dialog";
    if (id === "menu-art") return "img";
    return "div";
  };
  const elements = Object.fromEntries(APP_IDS.map((id) => [id, new FakeElement(tagFor(id), id)]));
  const shell = elements["app-shell"];
  shell.clientWidth = 844;
  shell.clientHeight = 390;
  elements["menu-art"].dataset.src = "../concepts/images/minimal-menu.webp";
  elements["menu-fallback"].hidden = true;
  elements["art-tier"].value = "standard";
  elements["battlefield-screen"].hidden = true;
  elements["orientation-gate"].hidden = true;
  elements["size-gate"].hidden = true;
  elements["load-error"].hidden = true;
  elements["producer-tray"].hidden = true;
  elements["selection-marquee"].hidden = true;

  const menuScreen = elements["menu-screen"];
  const battlefieldScreen = elements["battlefield-screen"];
  const playFrame = elements["play-frame"];
  playFrame.tabIndex = 0;
  shell.append(menuScreen, battlefieldScreen, elements["orientation-gate"], elements["size-gate"],
    elements["load-error"], elements["settings-dialog"]);
  menuScreen.append(elements["menu-art"], elements["menu-fallback"], elements["begin-button"],
    elements["settings-button"], elements["menu-fullscreen-button"]);
  elements["settings-dialog"].append(elements["fullscreen-on-begin"], elements["art-tier"]);
  elements["load-error"].append(elements["load-error-detail"], elements["error-menu-button"]);
  const battlefieldChildren = APP_IDS
    .filter((id) => ![
      "app-shell", "menu-screen", "menu-art", "menu-fallback", "begin-button", "settings-button",
      "menu-fullscreen-button", "battlefield-screen", "orientation-gate", "size-gate", "load-error",
      "load-error-detail", "error-menu-button", "settings-dialog", "fullscreen-on-begin", "art-tier",
      "play-frame", "production-options", "production-queue"
    ].includes(id))
    .map((id) => elements[id]);
  battlefieldScreen.append(playFrame);
  playFrame.append(...battlefieldChildren);
  elements["producer-tray"].append(elements["production-options"], elements["production-queue"]);
  const productionButtons = [];
  for (const role of ["melee", "ranged", "signature"]) {
    const button = new FakeElement("button");
    button.dataset.productionRole = role;
    const name = new FakeElement("strong");
    name.dataset.optionName = "";
    const cost = new FakeElement("span");
    cost.dataset.optionCost = "";
    button.append(name, cost);
    elements["production-options"].append(button);
    productionButtons.push(button);
  }
  const dialogClose = new FakeElement("button");
  dialogClose.value = "close";
  elements["settings-dialog"].append(dialogClose);
  const canvasElements = hardening.CANVAS_LAYERS.map((layer) => {
    const canvas = new FakeElement("canvas");
    canvas.dataset.layer = layer;
    playFrame.append(canvas);
    return canvas;
  });

  class FakeDocument extends FakeTarget {
    constructor() {
      super();
      this.activeElement = null;
      this.baseURI = "https://example.invalid/Aeon-of-Kingdoms/phase7/";
      this.visibilityState = "visible";
      this.fullscreenElement = null;
      this.documentElement = new FakeElement("html", "document-element");
      this.documentElement.requestFullscreen = async () => {
        counters.fullscreenRequests += 1;
        this.fullscreenElement = this.documentElement;
      };
    }
    getElementById(id) { return elements[id] || null; }
    createDocumentFragment() { return new FakeElement("fragment"); }
    createElement(tagName) { return new FakeElement(tagName); }
    hasFocus() { return this.focused !== false; }
    async exitFullscreen() {
      counters.fullscreenExits += 1;
      this.fullscreenElement = null;
    }
  }
  documentRef = new FakeDocument();
  documentRef.focused = initiallyFocused;

  class FakeMediaQuery extends FakeTarget {
    constructor() { super(); this.matches = false; }
    addListener(listener) { this.addEventListener("change", listener); }
    removeListener(listener) { this.removeEventListener("change", listener); }
  }
  const reducedMotionQuery = new FakeMediaQuery();
  const windowRef = new FakeTarget();
  Object.assign(windowRef, {
    devicePixelRatio: 2,
    location: { search },
    matchMedia() { return reducedMotionQuery; },
    requestAnimationFrame(callback) {
      const identifier = nextAnimationIdentifier++;
      counters.animationRequested += 1;
      animationCallbacks.set(identifier, callback);
      return identifier;
    },
    cancelAnimationFrame(identifier) {
      if (animationCallbacks.delete(identifier)) counters.animationCancelled += 1;
    }
  });
  const screenRef = {
    orientation: {
      async lock(value) {
        assert.equal(value, "landscape");
        counters.orientationLocks += 1;
      },
      unlock() { counters.orientationUnlocks += 1; }
    }
  };

  class FakeImage extends FakeElement {
    constructor() {
      super("img");
      this.naturalWidth = map.layers.ground.width;
      this.naturalHeight = map.layers.ground.height;
      this.decoding = "auto";
      this._src = "";
      this.onload = null;
      this.onerror = null;
    }
    set src(value) {
      this._src = String(value);
      Promise.resolve().then(() => this.onload?.());
    }
    get src() { return this._src; }
    removeAttribute(name) {
      super.removeAttribute(name);
      if (name === "src" && this._src) {
        counters.groundReleases += 1;
        this._src = "";
      }
    }
  }

  class FakeResizeObserver {
    constructor(callback) { this.callback = callback; this.observed = null; }
    observe(element) { this.observed = element; }
    disconnect() {
      this.observed = null;
      counters.resizeObserverDisconnected += 1;
    }
  }

  const cameraState = { zoom: 1, scale: 1, viewportWidth: 844, viewportHeight: 390, centerX: 835, centerY: 470.5 };
  const cameraFacade = {
    configuration: { ...cameraApi.configuration },
    inspectViewport(width, height) {
      const portrait = height > width;
      const tooSmall = width < 640 || height < 360;
      return {
        playable: !portrait && !tooSmall,
        portrait,
        tooSmall,
        playRect: { left: 0, top: 0, width, height, letterboxed: false }
      };
    },
    createCamera() {
      return {
        snapshot() { return { ...cameraState }; },
        reset() {
          counters.cameraResets += 1;
          Object.assign(cameraState, { zoom: 1, centerX: 835, centerY: 470.5 });
        },
        resize(width, height) { Object.assign(cameraState, { viewportWidth: width, viewportHeight: height }); },
        zoomAt(zoom, x, y) {
          counters.cameraZooms.push([zoom, x, y]);
          cameraState.zoom = zoom;
        },
        worldToScreen(x, y) { return { x, y }; },
        screenToWorld(x, y) { return { x, y }; },
        panByScreen() {}
      };
    }
  };

  const rendererFacade = {
    createRenderer(options) {
      counters.rendererCreated += 1;
      let destroyed = false;
      return {
        resize(width, height, ratio) {
          const scale = Math.min(Math.max(1, ratio), cameraFacade.configuration.renderScaleCap);
          for (const canvas of Object.values(options.canvases)) {
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
          }
          options.camera.resize(width, height);
        },
        render() {},
        renderDynamic() {
          if (!destroyed) options.onDynamicDraw(noOpContext());
        },
        setNavigationVisible(value) { counters.navigationStates.push(Boolean(value)); },
        destroy() {
          if (destroyed) return;
          destroyed = true;
          counters.rendererDestroyed += 1;
        }
      };
    }
  };
  const dynamicRendererFacade = {
    captureIsContested() { return false; },
    createDynamicRenderer() {
      return {
        draw() { counters.dynamicDraws += 1; },
        setReducedMotion(value) { counters.reducedMotionChanges.push(Boolean(value)); }
      };
    }
  };
  const inputFacade = {
    createInput(options) {
      counters.inputCreated += 1;
      counters.inputOptions = options;
      let destroyed = false;
      let contextMode = null;
      return {
        destroy() {
          if (destroyed) return;
          destroyed = true;
          counters.inputDestroyed += 1;
        },
        resetTransient() {
          counters.inputTransientResets += 1;
          contextMode = null;
          options.onContextModeChange?.(null);
          options.onTransientReset?.();
        },
        setEnabled(value) {
          counters.inputEnabled.push(Boolean(value));
          if (!value && contextMode !== null) {
            contextMode = null;
            options.onContextModeChange?.(null);
            options.onTransientReset?.();
          }
        },
        snapshot() { return { contextMode }; },
        setContextMode(value) { contextMode = value; return contextMode; }
      };
    }
  };
  const entityAssetsFacade = {
    load(options) {
      counters.entityLoads += 1;
      counters.entityTier = options.tier;
      counters.entityBaseUrl = String(options.baseUrl);
      if (failEntityLoad) return Promise.reject(Object.assign(new Error("simulated-entity-load"), { code: "simulated-entity-load" }));
      let disposed = false;
      return Promise.resolve({
        cellSize: options.tier === "compact" ? 96 : 128,
        dispose() {
          if (disposed) return;
          disposed = true;
          counters.entityDisposals += 1;
        }
      });
    }
  };
  const structureAssetsFacade = {
    load(options) {
      counters.structureLoads += 1;
      counters.structureBaseUrl = String(options.baseUrl);
      let disposed = false;
      return Promise.resolve({
        dispose() {
          if (disposed) return;
          disposed = true;
          counters.structureDisposals += 1;
        }
      });
    }
  };
  const skirmishFacade = {
    createSkirmish(options) {
      counters.skirmishCreated += 1;
      const inner = skirmishApi.createSkirmish({ map, seed: Number(options.seed) });
      let destroyed = false;
      let forcedSnapshot = null;
      return {
        get tick() { return inner.tick; },
        battleSnapshot() { return forcedSnapshot || inner.battleSnapshot(); },
        compositeChecksum() { return inner.compositeChecksum(); },
        submitHumanCommand(request) {
          const translated = clone(request);
          const receipt = inner.submitHumanCommand(translated);
          counters.humanCommands.push({ kind: translated.kind, receipt: clone(receipt) });
          return receipt;
        },
        step() {
          counters.skirmishSteps += 1;
          const result = inner.step();
          if (Number.isInteger(completeAfterSteps) && counters.skirmishSteps >= completeAfterSteps && !forcedSnapshot) {
            forcedSnapshot = clone(inner.battleSnapshot());
            forcedSnapshot.match = {
              status: "complete",
              winnerSeat: 1,
              completedTick: forcedSnapshot.tick
            };
            forcedSnapshot.projectiles = [];
          }
          return result;
        },
        setSuspended(value) {
          counters.skirmishSuspended.push(Boolean(value));
          return inner.setSuspended(Boolean(value));
        },
        destroy() {
          if (destroyed) return;
          destroyed = true;
          counters.skirmishDestroyed += 1;
          inner.destroy();
        }
      };
    }
  };

  Object.assign(windowRef, {
    AeonPhase5Map: map,
    AeonPhase2Camera: cameraFacade,
    AeonPhase2Renderer: rendererFacade,
    AeonPhase5Config: phase5Config,
    AeonPhase6Skirmish: skirmishFacade,
    AeonPhase7Hardening: hardening,
    AeonPhase3Assets: entityAssetsFacade,
    AeonPhase5Assets: structureAssetsFacade,
    AeonPhase5Renderer: dynamicRendererFacade,
    AeonPhase5Input: inputFacade
  });
  const context = vm.createContext({
    window: windowRef,
    document: documentRef,
    screen: screenRef,
    Image: FakeImage,
    ResizeObserver: FakeResizeObserver,
    URL,
    URLSearchParams
  });
  vm.runInContext(read("phase7/app.js"), context, { filename: "phase7/app.js" });

  const listenerTargets = [windowRef, documentRef, reducedMotionQuery, ...Object.values(elements)];
  async function flush() {
    for (let turn = 0; turn < 6; turn += 1) await Promise.resolve();
  }
  function listenerCount() {
    return listenerTargets.reduce((total, target) => total + target.listenerCount(), 0);
  }
  function runNextAnimation(timestamp) {
    const entry = animationCallbacks.entries().next().value;
    assert.ok(entry, "one owned animation frame must be pending");
    const [identifier, callback] = entry;
    animationCallbacks.delete(identifier);
    callback(timestamp);
  }

  return {
    animationCallbacks,
    canvasElements,
    counters,
    document: documentRef,
    dialogClose,
    elements,
    flush,
    focusHistory,
    listenerCount,
    mediaQuery: reducedMotionQuery,
    productionButtons,
    runNextAnimation,
    window: windowRef
  };
}

function resetEntity(entity, x, y) {
  Object.assign(entity, {
    x, y, idleRoot: { x, y }, facing: "right", order: "IDLE", targetId: null,
    commandRoot: null, engagementRoot: null, defendAnchor: null,
    route: [], routeIndex: 0, formationDestination: null,
    savedRoute: [], savedRouteIndex: 0, savedDestination: null,
    savedRepathCount: 0, savedProgress: { distance: 0, stalledTicks: 0 },
    repathCount: 0, progress: { distance: 0, stalledTicks: 0 }, reservation: null,
    reservationWait: null, attackStartTick: null, pendingAttackTick: null,
    nextAttackStartTick: 0, returning: false, returnFailure: null
  });
}

function addCheapEntities(snapshot, seat, count, prefix) {
  const kind = seat === 1 ? "astral-guardian" : "gravebound-reaver";
  const template = clone(snapshot.entities.find((entity) => entity.ownerSeat === seat && entity.kind === kind));
  const navigator = navigationApi.createNavigator(map, configuration, snapshot.structures);
  const occupied = snapshot.entities.map((entity) => ({ x: entity.x, y: entity.y, radius: entity.radius }));
  const points = [];
  for (let y = 12000; y <= 92000 && points.length < count; y += 5000) {
    for (let x = 12000; x <= 155000 && points.length < count; x += 5000) {
      const point = { x, y };
      if (!navigator.isPointClear(point, template.radius)) continue;
      if (occupied.some((other) => {
        const minimum = other.radius + template.radius;
        return (other.x - x) ** 2 + (other.y - y) ** 2 < minimum ** 2;
      })) continue;
      points.push(point);
      occupied.push({ ...point, radius: template.radius });
    }
  }
  assert.equal(points.length, count, "fixture must find enough legal non-overlapping roots");
  points.forEach((point, index) => {
    const entity = clone(template);
    entity.id = `${prefix}-${String(index + 1).padStart(2, "0")}`;
    resetEntity(entity, point.x, point.y);
    snapshot.entities.push(entity);
  });
  snapshot.entities.sort((first, second) => compareIdentifiers(first.id, second.id));
  snapshot.players.find((player) => player.seat === seat).populationUsed += count;
}

function projectile(number) {
  return {
    id: `projectile-${String(number).padStart(12, "0")}`,
    sourceSeat: 1,
    targetId: "seat-2-gravebound-reaver-1",
    damage: 22,
    launchTick: 1,
    arrivalTick: 15,
    launchX: 64000,
    launchY: 60000,
    launchSourceRadius: 1400,
    launchTargetX: 89000,
    launchTargetY: 60000,
    launchTargetRadius: 1600,
    launchEdgeDistance: 22000
  };
}

test("Phase 7 is one strict local four-file shell over the closed Phase 6 stack", () => {
  const html = read("phase7/index.html");
  const scripts = Array.from(html.matchAll(/<script\s+src=["']([^"']+)["']/gi), (match) => match[1]);
  const styles = Array.from(html.matchAll(/<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']/gi), (match) => match[1]);
  const layers = Array.from(html.matchAll(/<canvas\s+data-layer=["']([^"']+)["']/gi), (match) => match[1]);
  assert.deepEqual(scripts, PHASE7_SCRIPTS);
  assert.deepEqual(styles, PHASE7_STYLES);
  assert.deepEqual(layers, hardening.CANVAS_LAYERS);
  assert.equal(new Set(scripts).size, scripts.length);
  assert.doesNotMatch(html, /https?:\/\/|<iframe|<object|<embed|<audio|<video/i);
  assert.match(html, /connect-src 'none'/i);
  assert.match(html, /media-src 'none'/i);
  assert.match(html, /object-src 'none'/i);
  assert.match(html, /worker-src 'none'/i);
  assert.match(html, /data-src=["']\.\.\/concepts\/images\/minimal-menu\.webp["']/i);
  const references = Array.from(html.matchAll(/\b(?:src|href|data-src)=["']([^"']+)["']/gi), (match) => match[1]);
  assert.equal(references.every(localReference), true, "every shell reference must remain repository-local");
  assert.deepEqual(fs.readdirSync(path.join(ROOT, "phase7")).sort(), ["app.js", "hardening.js", "index.html", "phase7.css"]);
});

test("Phase 7 semantic IDs and relationships are unique, resolvable, and outside Canvas", () => {
  const html = read("phase7/index.html");
  const ids = exactIds(html);
  assert.equal(new Set(ids).size, ids.length, "every authored id must be unique");
  const idSet = new Set(ids);
  for (const required of [
    "app-shell", "phase7-experience", "menu-screen", "menu-art", "menu-fallback",
    "begin-button", "settings-button", "settings-dialog", "fullscreen-on-begin", "art-tier",
    "menu-fullscreen-button", "battlefield-screen", "play-frame", "orientation-gate", "size-gate",
    "load-error", "load-error-detail", "resource-value", "population-value", "objective-value",
    "selection-summary", "selection-detail", "structure-select", "producer-tray", "production-progress",
    "production-queue", "match-status", "event-status", "command-availability", "rally-availability",
    "selection-clear-availability", "pause-button", "navigation-button", "menu-button"
  ]) assert.equal(idSet.has(required), true, `missing semantic owner #${required}`);

  for (const match of html.matchAll(/\b(?:aria-labelledby|aria-describedby)=["']([^"']+)["']/gi)) {
    for (const identifier of match[1].trim().split(/\s+/)) {
      assert.equal(idSet.has(identifier), true, `unresolved ARIA reference ${identifier}`);
    }
  }
  for (const match of html.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["'][^>]*>/gi)) {
    assert.equal(idSet.has(match[1]), true, `unresolved label target ${match[1]}`);
  }
  assert.equal(Array.from(html.matchAll(/<canvas\b[^>]*aria-hidden=["']true["']/gi)).length, 6);
  assert.match(html, /id=["']menu-art["'][^>]*alt=["']["'][^>]*aria-hidden=["']true["']/i);
  assert.match(html, /id=["']event-status["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/i);
  assert.match(html, /id=["']load-error["'][^>]*role=["']alert["']/i);
  assert.match(html, /id=["']match-status["'][^>]*role=["']status["']/i);
  assert.match(html, /<progress\s+id=["']production-progress["'][^>]*max=["']1["']/i);
  assert.match(html, /You[\s\S]*Astral Concord\s*·\s*◇ Azure/i);
  assert.match(html, /Computer[\s\S]*Gravebound Court\s*·\s*✕ Violet/i);
  assert.match(html, /Selected/i);
  assert.match(html, /hostile hover shows ⊗/i);
  assert.match(html, /<div\s+class=["']command-controls["']\s+role=["']group["'][^>]*aria-label=["']Tactical commands["']/i);
  for (const [buttonId, descriptionId] of [
    ["move-mode-button", "command-availability"],
    ["attack-mode-button", "command-availability"],
    ["attack-move-mode-button", "command-availability"],
    ["defend-point-mode-button", "command-availability"],
    ["defend-entity-mode-button", "command-availability"],
    ["stop-button", "command-availability"],
    ["rally-mode-button", "rally-availability"],
    ["clear-rally-button", "rally-availability"],
    ["clear-selection-button", "selection-clear-availability"]
  ]) {
    const tag = html.match(new RegExp(`<button\\b(?=[^>]*\\bid=["']${buttonId}["'])[^>]*>`, "i"))?.[0];
    assert.ok(tag, `missing tactical control #${buttonId}`);
    assert.match(tag, new RegExp(`aria-describedby=["']${descriptionId}["']`, "i"),
      `#${buttonId} must directly expose its changing disabled-state description`);
  }
  assert.doesNotMatch(html, /tabindex=["'][1-9]\d*["']/i,
    "authored focus order must remain native DOM order without a positive tabindex override");
  const targetCss = `${read("phase2/phase2.css")}\n${read("phase5/phase5.css")}\n${read("phase7/phase7.css")}`;
  for (const rule of [
    /\.menu-hit\s*\{[\s\S]{0,220}min-width:\s*44px[\s\S]{0,120}min-height:\s*44px/i,
    /\.battlefield-ui button\s*\{[\s\S]{0,180}min-width:\s*44px[\s\S]{0,120}min-height:\s*44px/i,
    /\.structure-jump select\s*\{[\s\S]{0,180}min-height:\s*44px/i,
    /\.production-options button\s*\{[\s\S]{0,180}min-height:\s*48px/i,
    /\.production-queue button\s*\{[\s\S]{0,160}min-width:\s*44px[\s\S]{0,100}min-height:\s*44px/i,
    /\.setting-field select,\s*\n\.structure-jump select\s*\{[\s\S]{0,160}min-width:\s*44px[\s\S]{0,100}min-height:\s*44px/i,
    /\.skip-link,\s*\n\.menu-status-link,\s*\n\.noscript-gate a\s*\{[\s\S]{0,80}min-height:\s*44px/i,
    /dialog label\s*\{[\s\S]{0,180}min-height:\s*44px/i
  ]) assert.match(targetCss, rule, "every authored interactive family needs a 44 CSS-pixel target rule");
  const app = read("phase7/app.js");
  assert.match(app, /rallyAvailability\.textContent\s*=\s*matchComplete[\s\S]{0,700}selectionClearAvailability\.textContent/,
    "rally and clear-selection descriptions must update from their actual availability state");
});

test("Phase 2 through Phase 6 source and the complete Phase 6 evidence suite remain byte locked", () => {
  for (const [relativePath, expected] of Object.entries(CLOSED_SOURCE_HASHES)) {
    assert.equal(sha256(bytes(relativePath)), expected, relativePath);
  }
  const inherited = read("tests/phase6-ai.test.js");
  for (const evidence of [
    /\[50, ["']production["']\]/,
    /\[800, ["']defense["']\]/,
    /\[960, ["']regroup["']\]/,
    /\[3400, ["']pre-assault["']\]/,
    /completedTick:\s*3715/
  ]) assert.match(inherited, evidence);
});

test("the hardening API has one bounded presentation-only surface", () => {
  assert.deepEqual(Object.keys(hardening), [
    "SUSPENSION_REASONS", "CANVAS_LAYERS", "DECODED_SOURCE_IMAGES",
    "createSuspensionController", "createBrowserFeatureController",
    "canReceiveProgrammaticFocus", "focusFirstAvailable", "decodedSourceImageProfile",
    "roundedPlayRect", "canvasBackingBytes"
  ]);
  assert.equal(Object.isFrozen(hardening), true);
  assert.deepEqual(hardening.SUSPENSION_REASONS, ["manual", "viewport", "hidden", "blur", "bfcache"]);
  const source = read("phase7/hardening.js");
  assert.doesNotMatch(source, /submitCommand|createSimulation|createSkirmish|localStorage|sessionStorage|indexedDB|fetch\s*\(|WebSocket|RTCPeerConnection|AudioContext/i);
});

test("suspension reasons compose, notify once, reject unknown state, and tear down", () => {
  const controller = hardening.createSuspensionController({ viewport: true });
  const notices = [];
  const unsubscribe = controller.subscribe((value) => notices.push(value));
  assert.deepEqual(controller.snapshot().reasons, ["viewport"]);
  controller.set("hidden", true);
  controller.set("hidden", true);
  controller.setMany({ viewport: false, blur: true });
  assert.equal(notices.length, 2);
  assert.deepEqual(controller.snapshot().reasons, ["hidden", "blur"]);
  const before = controller.snapshot();
  assert.throws(() => controller.set("network", true), /unknown suspension reason/);
  assert.throws(() => controller.set("manual", 1), /must be boolean/);
  assert.deepEqual(controller.snapshot(), before);
  assert.equal(unsubscribe(), true);
  assert.equal(unsubscribe(), false);
  assert.equal(controller.destroy(), true);
  assert.equal(controller.destroy(), false);
  assert.throws(() => controller.set("manual", true), /destroyed/);
});

test("fullscreen and orientation unsupported, rejection, success, release, and cancellation all settle", async () => {
  const unsupported = hardening.createBrowserFeatureController({
    document: { documentElement: {} },
    screen: { orientation: {} }
  });
  const unavailable = await unsupported.requestForBegin({ fullscreen: true });
  assert.deepEqual([unavailable.status, unavailable.fullscreen.status, unavailable.orientation.status],
    ["completed", "unsupported", "unsupported"]);

  const synchronousDenials = hardening.createBrowserFeatureController({
    document: { documentElement: { requestFullscreen() { throw new Error("denied"); } } },
    screen: { orientation: { lock() { throw new Error("denied"); } } }
  });
  const synchronousDenial = await synchronousDenials.requestForBegin({ fullscreen: true });
  assert.deepEqual([synchronousDenial.fullscreen.status, synchronousDenial.orientation.status], ["rejected", "rejected"]);

  const asynchronousDenials = hardening.createBrowserFeatureController({
    document: { documentElement: { requestFullscreen() { return Promise.reject(new Error("denied")); } } },
    screen: { orientation: { lock() { return Promise.reject(new Error("denied")); } } }
  });
  const asynchronousDenial = await asynchronousDenials.requestForBegin({ fullscreen: true });
  assert.deepEqual([asynchronousDenial.fullscreen.status, asynchronousDenial.orientation.status], ["rejected", "rejected"]);

  const calls = [];
  const documentRef = {
    fullscreenElement: null,
    documentElement: {
      async requestFullscreen() { calls.push("fullscreen"); documentRef.fullscreenElement = documentRef.documentElement; }
    },
    async exitFullscreen() { calls.push("exit-fullscreen"); documentRef.fullscreenElement = null; }
  };
  const screenRef = { orientation: {
    async lock(value) { calls.push(`orientation-${value}`); },
    unlock() { calls.push("unlock-orientation"); }
  } };
  const successful = hardening.createBrowserFeatureController({ document: documentRef, screen: screenRef });
  const granted = await successful.requestForBegin({ fullscreen: true });
  assert.deepEqual([granted.fullscreen.status, granted.orientation.status], ["succeeded", "succeeded"]);
  assert.deepEqual(calls.slice(0, 2), ["fullscreen", "orientation-landscape"]);
  const released = await successful.release();
  assert.equal(released.status, "completed");
  assert.deepEqual(calls.slice(2), ["unlock-orientation", "exit-fullscreen"]);
  assert.deepEqual(successful.snapshot(), {
    generation: 2, ownsFullscreen: false, ownsOrientation: false, fullscreenActive: false
  });

  const published = [];
  const partial = hardening.createBrowserFeatureController({
    document: { documentElement: {} },
    screen: { orientation: {
      lock() { return Promise.resolve(); },
      unlock() { return Promise.reject(new Error("still locked")); }
    } },
    onResult(value) { published.push(value); }
  });
  assert.equal((await partial.requestLandscape()).status, "succeeded");
  const partialRelease = await partial.release();
  assert.equal(partialRelease.status, "partial");
  assert.deepEqual(published.at(-1), partialRelease, "aggregate release status must remain the final truthful message");

  let settle;
  const staleDocument = {
    fullscreenElement: null,
    documentElement: {
      requestFullscreen() {
        return new Promise((resolve) => { settle = () => { staleDocument.fullscreenElement = staleDocument.documentElement; resolve(); }; });
      }
    },
    async exitFullscreen() { staleDocument.fullscreenElement = null; }
  };
  const stale = hardening.createBrowserFeatureController({ document: staleDocument, screen: { orientation: {} } });
  const pending = stale.requestForBegin({ fullscreen: true });
  stale.cancel();
  settle();
  const cancelled = await pending;
  assert.equal(cancelled.status, "cancelled");
  assert.equal(staleDocument.fullscreenElement, null);

  let settleOldFullscreen;
  let fullscreenRequestCount = 0;
  const serializedDocument = {
    fullscreenElement: null,
    documentElement: {
      requestFullscreen() {
        fullscreenRequestCount += 1;
        if (fullscreenRequestCount === 1) {
          return new Promise((resolve) => {
            settleOldFullscreen = () => {
              serializedDocument.fullscreenElement = serializedDocument.documentElement;
              resolve();
            };
          });
        }
        serializedDocument.fullscreenElement = serializedDocument.documentElement;
        return Promise.resolve();
      }
    },
    async exitFullscreen() { serializedDocument.fullscreenElement = null; }
  };
  const serialized = hardening.createBrowserFeatureController({
    document: serializedDocument,
    screen: { orientation: {} }
  });
  const oldFullscreen = serialized.requestForBegin({ fullscreen: true });
  const serializedRelease = serialized.release();
  const blockedReplacement = await serialized.requestForBegin({ fullscreen: true });
  assert.equal(blockedReplacement.status, "cancelled", "a new generation cannot overlap stale browser effects");
  assert.equal(fullscreenRequestCount, 1, "the blocked request must not touch the browser API");
  settleOldFullscreen();
  assert.equal((await oldFullscreen).status, "cancelled");
  assert.equal((await serializedRelease).status, "completed");
  assert.equal(serializedDocument.fullscreenElement, null);
  const freshFullscreen = await serialized.requestForBegin({ fullscreen: true });
  assert.equal(freshFullscreen.status, "completed");
  assert.deepEqual(serialized.snapshot(), {
    generation: 3, ownsFullscreen: true, ownsOrientation: false, fullscreenActive: true
  });

  let settleOldOrientation;
  let orientationLocked = false;
  let orientationRequestCount = 0;
  const serializedOrientation = hardening.createBrowserFeatureController({
    document: { documentElement: {} },
    screen: { orientation: {
      lock() {
        orientationRequestCount += 1;
        if (orientationRequestCount === 1) {
          return new Promise((resolve) => {
            settleOldOrientation = () => { orientationLocked = true; resolve(); };
          });
        }
        orientationLocked = true;
        return Promise.resolve();
      },
      unlock() { orientationLocked = false; }
    } }
  });
  const oldOrientation = serializedOrientation.requestLandscape();
  const orientationRelease = serializedOrientation.release();
  assert.equal((await serializedOrientation.requestLandscape()).status, "cancelled");
  assert.equal(orientationRequestCount, 1);
  settleOldOrientation();
  assert.equal((await oldOrientation).status, "cancelled");
  assert.equal((await orientationRelease).status, "completed");
  assert.equal(orientationLocked, false);
  assert.equal((await serializedOrientation.requestLandscape()).status, "succeeded");
  assert.equal(orientationLocked, true, "stale cleanup must not undo a fresh owned orientation lock");

  let settleUnreleasableFullscreen;
  const unreleasableDocument = {
    fullscreenElement: null,
    documentElement: {
      requestFullscreen() {
        return new Promise((resolve) => {
          settleUnreleasableFullscreen = () => {
            unreleasableDocument.fullscreenElement = unreleasableDocument.documentElement;
            resolve();
          };
        });
      }
    },
    exitFullscreen() { return Promise.reject(new Error("still active")); }
  };
  const unreleasable = hardening.createBrowserFeatureController({
    document: unreleasableDocument,
    screen: { orientation: {} }
  });
  const unreleasableRequest = unreleasable.requestFullscreen();
  const unreleasableRelease = unreleasable.release();
  settleUnreleasableFullscreen();
  assert.equal((await unreleasableRequest).status, "cancelled");
  assert.equal((await unreleasableRelease).status, "partial",
    "failed stale cleanup must remain owned and report a partial release");
  assert.deepEqual(unreleasable.snapshot(), {
    generation: 2, ownsFullscreen: true, ownsOrientation: false, fullscreenActive: true
  });

  let settleUnreleasableOrientation;
  const unreleasableOrientation = hardening.createBrowserFeatureController({
    document: { documentElement: {} },
    screen: { orientation: {
      lock() {
        return new Promise((resolve) => { settleUnreleasableOrientation = resolve; });
      },
      unlock() { throw new Error("still locked"); }
    } }
  });
  const unreleasableOrientationRequest = unreleasableOrientation.requestLandscape();
  const unreleasableOrientationRelease = unreleasableOrientation.release();
  settleUnreleasableOrientation();
  assert.equal((await unreleasableOrientationRequest).status, "cancelled");
  assert.equal((await unreleasableOrientationRelease).status, "partial");
  assert.equal(unreleasableOrientation.snapshot().ownsOrientation, true);

  let reentrant;
  let reentrantRequest = null;
  let reentering = false;
  reentrant = hardening.createBrowserFeatureController({
    document: { documentElement: {} },
    screen: { orientation: {} },
    onResult(value) {
      if (!reentering && !reentrantRequest && value.feature === "fullscreen" && value.action === "request") {
        reentering = true;
        reentrantRequest = reentrant.requestFullscreen();
      }
    }
  });
  assert.equal((await reentrant.requestFullscreen()).status, "unsupported");
  assert.equal((await reentrantRequest).status, "cancelled",
    "presentation callbacks cannot re-enter an in-flight browser request");
});

test("focus recovery skips hidden, inert, disabled, disconnected, and throwing candidates", () => {
  const focused = [];
  function element(name, properties = {}) {
    const attributes = new Map(Object.entries(properties.attributes || {}));
    return {
      name,
      isConnected: true,
      hidden: false,
      inert: false,
      disabled: false,
      parentElement: null,
      getAttribute(key) { return attributes.get(key) ?? null; },
      hasAttribute(key) { return attributes.has(key); },
      matches(selector) { return selector === ":disabled" && this.disabled; },
      focus(options) { focused.push([name, options]); },
      ...properties
    };
  }
  const hiddenParent = element("hidden-parent", { hidden: true });
  const hidden = element("hidden", { parentElement: hiddenParent });
  const inert = element("inert", { inert: true });
  const disabled = element("disabled", { disabled: true });
  const detached = element("detached", { isConnected: false });
  const throwing = element("throwing", { focus() { throw new Error("focus failure"); } });
  const visible = element("visible");
  const chosen = hardening.focusFirstAvailable([hidden, inert, disabled, detached, throwing, visible], {
    getComputedStyle(value) { return value.name === "css-hidden" ? { display: "none" } : { display: "block", visibility: "visible" }; }
  });
  assert.equal(chosen, visible);
  assert.deepEqual(focused, [["visible", { preventScroll: true }]]);
  assert.equal(hardening.canReceiveProgrammaticFocus(element("css-hidden"), {
    getComputedStyle() { return { display: "none", visibility: "visible" }; }
  }), false);
  assert.throws(() => hardening.focusFirstAvailable(null), /iterable/);
});

test("the exact viewport table, camera transform, and six-canvas backing arithmetic stay bounded", () => {
  const cases = [
    [1440, 900, true, false, false, { left: 0, top: 0, width: 1440, height: 900 }],
    [1024, 768, true, false, false, { left: 0, top: 0, width: 1024, height: 768 }],
    [844, 390, true, false, false, { left: 0, top: 0, width: 844, height: 390 }],
    [640, 360, true, false, false, { left: 0, top: 0, width: 640, height: 360 }],
    [640, 480, true, false, false, { left: 0, top: 0, width: 640, height: 480 }],
    [1680, 720, true, false, false, { left: 0, top: 0, width: 1680, height: 720 }],
    [3000, 1000, true, false, true, { left: 1000 / 3, top: 0, width: 7000 / 3, height: 1000 }],
    [639, 360, false, false, false, { left: 0, top: 0, width: 639, height: 360 }],
    [640, 359, false, false, false, { left: 0, top: 0, width: 640, height: 359 }],
    [390, 844, false, true, true, { left: 0, top: 1103 / 4, width: 390, height: 585 / 2 }],
    [640, 640, false, true, true, { left: 0, top: 80, width: 640, height: 480 }]
  ];
  for (const [width, height, playable, portrait, letterboxed, expected] of cases) {
    const inspection = cameraApi.inspectViewport(width, height);
    assert.equal(inspection.playable, playable, `${width}x${height} playable`);
    assert.equal(inspection.portrait, portrait, `${width}x${height} portrait`);
    assert.equal(inspection.playRect.letterboxed, letterboxed, `${width}x${height} letterbox`);
    for (const key of ["left", "top", "width", "height"]) approximate(inspection.playRect[key], expected[key], `${width}x${height} ${key}`);
    const renderedRect = hardening.roundedPlayRect(inspection.playRect, cameraApi.configuration);
    if (renderedRect.width > 0 && renderedRect.height > 0) {
      assert.ok(renderedRect.width / renderedRect.height >= cameraApi.configuration.minimumAspect,
        `${width}x${height} rounded play rectangle must stay at or above 4:3`);
      assert.ok(renderedRect.width / renderedRect.height <= cameraApi.configuration.maximumAspect,
        `${width}x${height} rounded play rectangle must stay at or below 21:9`);
    }
    if (width === 3000 && height === 1000) {
      assert.deepEqual(renderedRect, { left: 333, top: 0, width: 2333, height: 1000, letterboxed: true });
    }
  }
  assert.throws(() => hardening.roundedPlayRect({ left: 0, top: 0, width: -1, height: 1 }, cameraApi.configuration), /nonnegative/);
  assert.throws(() => hardening.roundedPlayRect({ left: 0, top: 0, width: 1, height: 1 }, {
    minimumAspect: 2,
    maximumAspect: 1
  }), /positive and ordered/);
  assert.match(read("phase7/app.js"), /hardeningApi\.roundedPlayRect\(inspection\.playRect, cameraApi\.configuration\)/,
    "runtime CSS geometry and focused arithmetic must use the same rounded play-rectangle owner");

  const home = map.layers.anchors.cameraStarts[0];
  const camera = cameraApi.createCamera(map.world.width, map.world.height, home);
  camera.resize(844, 390);
  const focus = { x: 277, y: 133 };
  const before = camera.screenToWorld(focus.x, focus.y);
  camera.zoomAt(2, focus.x, focus.y);
  const after = camera.screenToWorld(focus.x, focus.y);
  approximate(after.x, before.x, "focus-centred zoom x");
  approximate(after.y, before.y, "focus-centred zoom y");
  const screen = camera.worldToScreen(after.x, after.y);
  approximate(screen.x, focus.x, "round-trip screen x");
  approximate(screen.y, focus.y, "round-trip screen y");
  camera.panByScreen(1e9, -1e9);
  const bounded = camera.snapshot();
  assert.ok(bounded.centerX >= 0 && bounded.centerX <= map.world.width);
  assert.ok(bounded.centerY >= 0 && bounded.centerY <= map.world.height);
  camera.reset();
  assert.equal(camera.snapshot().zoom, home.zoom);

  for (const [width, height, ratio] of [[1440, 900, 1], [844, 390, 2], [3000, 1000, 3]]) {
    const inspection = cameraApi.inspectViewport(width, height);
    const renderedRect = hardening.roundedPlayRect(inspection.playRect, cameraApi.configuration);
    const canvases = canvasRecord();
    const localCamera = cameraApi.createCamera(map.world.width, map.world.height, home);
    const renderer = baseRendererApi.createRenderer({
      canvases, map, camera: localCamera,
      groundImage: { naturalWidth: 1672, naturalHeight: 941 },
      renderScaleCap: cameraApi.configuration.renderScaleCap,
      drawAnchorPreviews: false
    });
    renderer.resize(renderedRect.width, renderedRect.height, ratio);
    const scale = Math.min(Math.max(1, ratio), cameraApi.configuration.renderScaleCap);
    const expectedWidth = Math.round(renderedRect.width * scale);
    const expectedHeight = Math.round(renderedRect.height * scale);
    for (const canvas of Object.values(canvases)) assert.deepEqual([canvas.width, canvas.height], [expectedWidth, expectedHeight]);
    const arithmetic = hardening.canvasBackingBytes(canvases);
    assert.equal(arithmetic.canvasCount, 6);
    assert.equal(arithmetic.totalBytes, expectedWidth * expectedHeight * 4 * 6);
    renderer.destroy();
    for (const canvas of Object.values(canvases)) assert.deepEqual([canvas.width, canvas.height], [1, 1], "closed renderer releases to its inherited sentinel");
  }
});

test("source-image arithmetic uses actual local dimensions and never poses as browser memory", () => {
  const ground = webpDimensions(bytes("concepts/feasibility/phase1a/environment/battlefield-environment.webp"));
  const menu = webpDimensions(bytes("concepts/images/minimal-menu.webp"));
  assert.deepEqual(ground, { width: 1672, height: 941 });
  assert.deepEqual(menu, ground);
  assert.equal(ground.width * ground.height * 4, 6_293_408);
  assert.equal(menu.width * menu.height * 4, 6_293_408);
  assert.equal(entityManifest.tiers.standard.decodedBytes, 12_582_912);
  assert.equal(entityManifest.tiers.compact.decodedBytes, 7_077_888);
  assert.equal(structureManifest.totals.retainedDecodedBytesTwoPlayer, 12_811_776);
  assert.deepEqual(hardening.decodedSourceImageProfile("standard"), {
    tier: "standard", entitySheets: 12_582_912, structureSheets: 12_811_776,
    groundImage: 6_293_408, totalBytes: 31_688_096
  });
  assert.deepEqual(hardening.decodedSourceImageProfile("compact"), {
    tier: "compact", entitySheets: 7_077_888, structureSheets: 12_811_776,
    groundImage: 6_293_408, totalBytes: 26_183_072
  });
  assert.equal(hardening.DECODED_SOURCE_IMAGES.menuImage, 6_293_408);
  assert.throws(() => hardening.decodedSourceImageProfile("both"), /standard or compact/);
  assert.throws(() => hardening.canvasBackingBytes({}), /exactly/);
});

test("reduced-motion presentation cannot alter receipts, AI cadence, snapshots, or checksums", () => {
  const off = skirmishApi.createSkirmish({ seed: 0x77112233 });
  const on = skirmishApi.createSkirmish({ seed: 0x77112233 });
  for (let tick = 0; tick < 90; tick += 1) {
    if (tick % 30 === 0) {
      const entityId = off.battleSnapshot().entities.find((entity) => entity.ownerSeat === 1).id;
      const request = command({ tick: off.tick }, "STOP", { entityIds: [entityId] });
      assert.deepEqual(on.submitHumanCommand(clone(request)), off.submitHumanCommand(clone(request)));
    }
    assert.deepEqual(on.step(), off.step());
    assert.equal(on.compositeChecksum(), off.compositeChecksum());
  }
  assert.deepEqual(on.battleSnapshot(), off.battleSnapshot());
  assert.deepEqual(on.exportReplay(), off.exportReplay());
  const app = read("phase7/app.js");
  assert.match(app, /prefers-reduced-motion:\s*reduce/i);
  assert.match(app, /setReducedMotion\(reducedMotionQuery\.matches\)/);
  assert.doesNotMatch(app, /onReducedMotionChange[\s\S]{0,500}(?:submitHumanCommand|skirmish\.step|createSkirmish)/);
  const css = `${read("phase2/phase2.css")}\n${read("phase5/phase5.css")}\n${read("phase6/phase6.css")}\n${read("phase7/phase7.css")}`;
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
  assert.match(read("phase7/phase7.css"), /\.viewport-gate:focus,\s*\n\.load-error:focus\s*\{\s*\n\s*outline:\s*3px/i,
    "programmatically focused recovery surfaces must retain a visible outline");

  const opening = simulationApi.createSimulation({ map, seed: 0x4a0e2026 }).snapshot();
  const friendly = clone(opening.entities.find((entity) => entity.ownerSeat === 1));
  const hostile = clone(opening.entities.find((entity) => entity.ownerSeat === 2));
  hostile.health = Math.max(1, Math.floor(hostile.maxHealth / 2));
  const headquarters = clone(opening.structures.find((structure) => structure.id === "astral-headquarters-anchor"));
  headquarters.health = Math.floor(headquarters.maxHealth / 2);
  const authoredHeadquarters = map.phase5.structures.find((structure) => structure.id === headquarters.id);
  Object.assign(headquarters, {
    faction: authoredHeadquarters.faction,
    captureRadius: null,
    captureSeat: null,
    captureProgress: 0,
    contested: false
  });
  const suppressedImage = Object.freeze({ name: "ownership-hue-suppressed" });
  const ownerPresentations = {
    1: { id: 1, name: "Hue suppressed", rgb: [128, 128, 128], symbol: "diamond" },
    2: { id: 2, name: "Hue suppressed", rgb: [128, 128, 128], symbol: "cross" }
  };
  const entityAssets = {
    cellSize: 128,
    renderCell: { width: 160, height: 160, rootX: 80, rootY: 147.5 },
    ownerPresentations,
    entities: {
      [friendly.kind]: { ownerSheets: { 1: suppressedImage } },
      [hostile.kind]: { ownerSheets: { 2: suppressedImage } }
    }
  };
  const headquartersState = {
    neutralImage: suppressedImage,
    ownerSheets: { 1: suppressedImage, 2: suppressedImage }
  };
  const headquartersAsset = {
    neutralImage: suppressedImage,
    ownerSheets: headquartersState.ownerSheets,
    states: {
      intact: headquartersState,
      damaged: headquartersState,
      destroyed: { neutralImage: suppressedImage, ownerSheets: {} }
    },
    presentation: {
      drawSizeWorld: [160, 128],
      destinationGroundRoot: [80, 120],
      anchorOffsetsFromGroundWorld: { owner: [60, -94], health: [0, -108] }
    }
  };
  const operations = [];
  const drawingContext = new Proxy({}, {
    get(target, key) {
      if (!Object.hasOwn(target, key)) {
        target[key] = (...args) => { operations.push({ type: key, args }); };
      }
      return target[key];
    },
    set(target, key, value) {
      const visibleValue = key === "strokeStyle" || key === "fillStyle" ? "ownership-hue-suppressed" : value;
      operations.push({ type: "property", key, value: visibleValue });
      target[key] = visibleValue;
      return true;
    }
  });
  const suppressedRenderer = phase5RendererApi.createDynamicRenderer({
    camera: {
      snapshot() { return { scale: 1 }; },
      worldToScreen(x, y) { return { x, y }; }
    },
    configuration,
    representatives,
    entityAssets,
    structureAssets: {
      ownerPresentations,
      structures: {
        "astral-headquarters": headquartersAsset
      }
    }
  });
  suppressedRenderer.draw(drawingContext, {
    tick: opening.tick,
    entities: [friendly, hostile],
    structures: [headquarters],
    projectiles: [],
    defeatShells: [],
    effects: [],
    hoveredTargetId: hostile.id,
    selectedEntityIds: new Set([friendly.id]),
    selectedStructureId: headquarters.id,
    movementFrames: new Map(),
    destinationFeedback: []
  });
  const suppressedDraws = operations.filter(({ type }) => type === "drawImage");
  assert.ok(suppressedDraws.length >= 3, "the fixture must render both entities and the owned structure");
  assert.equal(suppressedDraws.every(({ args }) => args[0] === suppressedImage), true,
  "the renderer fixture must use only ownership-hue-suppressed image surfaces");
  assert.ok(operations.some(({ type }) => type === "closePath"), "the ◇ owner symbol must remain geometry");
  assert.ok(operations.filter(({ type }) => type === "lineTo").length >= 6, "the ✕ owner and target symbols must remain geometry");
  assert.ok(operations.filter(({ type }) => type === "ellipse").length >= 2, "selection outlines must survive hue suppression");
  assert.ok(operations.some(({ type, args }) => type === "fillText" && String(args[0]).startsWith("HP ")),
    "numeric combat health must survive hue suppression");
  assert.ok(operations.some(({ type, args }) => type === "fillText" && String(args[0]).includes("DAMAGED · HP")),
    "damage treatment and numeric structure health must survive hue suppression");
  assert.ok(operations.some(({ type, args }) => type === "fillText" && args[0] === "HOSTILE ⊗"),
    "hostile target geometry and text must survive hue suppression");
});

test("a deterministic public authoritative plus pure-planner soak reaches exactly 12,000 active ticks", {
  timeout: 90000
}, () => {
  const simulation = simulationApi.createSimulation({ seed: 0x4a0e2026 });
  const replay = replayApi.createReplay(simulation.snapshot());
  let aiState = aiApi.createInitialState();
  let previousEvents = [];
  let lastCheckpointBytes = 0;
  const maxima = {
    population: 0, entities: 0, structures: 0, queues: 0, pending: 0,
    projectiles: 0, routes: 0, repaths: 0, observedEvents: 0, forces: 0,
    threats: 0, candidates: 0, probes: 0, requests: 0,
    snapshotBytes: 0, aiBytes: 0, replayCommands: 0, replayBytes: 0, checkpointBytes: 0
  };

  while (simulation.tick < limits.evidenceMatchTickCap) {
    const snapshot = simulation.snapshot();
    const observation = aiApi.buildObservation(snapshot, previousEvents, { map });
    const planned = aiApi.plan(observation, aiState, { map });
    aiState = planned.state;

    if (simulation.tick % 200 === 0) {
      const entityId = snapshot.entities.find((entity) => entity.ownerSeat === 1).id;
      const receipt = simulation.submitStop(command(simulation, "STOP", { entityIds: [entityId] }));
      assert.equal(receipt.ok, true);
      replayApi.appendAccepted(replay, receipt);
    }

    const sampled = simulation.snapshot();
    maxima.population = Math.max(maxima.population, ...sampled.players.map((player) => player.populationUsed + player.populationReserved));
    maxima.entities = Math.max(maxima.entities, sampled.entities.length);
    maxima.structures = Math.max(maxima.structures, sampled.structures.length);
    maxima.queues = Math.max(maxima.queues, ...sampled.structures.map((structure) => structure.queue.length));
    maxima.pending = Math.max(maxima.pending, sampled.pendingCommands.length);
    maxima.projectiles = Math.max(maxima.projectiles, sampled.projectiles.length);
    maxima.routes = Math.max(maxima.routes, ...sampled.entities.flatMap((entity) => [entity.route.length, entity.savedRoute.length]));
    maxima.repaths = Math.max(maxima.repaths, ...sampled.entities.flatMap((entity) => [entity.repathCount, entity.savedRepathCount]));
    maxima.observedEvents = Math.max(maxima.observedEvents, observation.events.length);
    maxima.forces = Math.max(maxima.forces, aiState.forces.length);
    maxima.threats = Math.max(maxima.threats, aiState.threats.length);
    maxima.candidates = Math.max(maxima.candidates, planned.diagnostics.candidateCount);
    maxima.probes = Math.max(maxima.probes, planned.diagnostics.routeProbes);
    maxima.requests = Math.max(maxima.requests, planned.diagnostics.requestCount);

    if (simulation.tick % configuration.checksumIntervalTicks === 0) {
      assert.deepEqual(simulationApi.validateSnapshot(sampled, { map }), sampled);
      aiApi.validateState(aiState, observation);
      const checkpoint = skirmishApi.validateCheckpoint({
        schemaVersion: phase6Config.identity.schemaVersion,
        configurationId: phase6Config.identity.configurationId,
        battle: sampled,
        aiState
      }, { map });
      maxima.snapshotBytes = Math.max(maxima.snapshotBytes, replayApi.canonicalStringify(sampled).length);
      maxima.aiBytes = Math.max(maxima.aiBytes, replayApi.canonicalStringify(aiState).length);
      maxima.replayCommands = Math.max(maxima.replayCommands, replay.commands.length);
      maxima.replayBytes = Math.max(maxima.replayBytes, replayApi.canonicalStringify(replay).length);
      lastCheckpointBytes = replayApi.canonicalStringify(checkpoint).length;
      maxima.checkpointBytes = Math.max(maxima.checkpointBytes, lastCheckpointBytes);
    }

    const result = simulation.step();
    previousEvents = aiApi.filterEvents(result.events, simulation.tick, observation.structures);
  }

  const final = simulation.snapshot();
  assert.equal(final.tick, 12000);
  assert.deepEqual(final.match, { status: "active", winnerSeat: null, completedTick: null });
  assert.deepEqual(replayApi.runReplay(replay, { map, untilTick: 12000 }).snapshot, final);
  assert.ok(lastCheckpointBytes > 0);
  assert.ok(maxima.population <= configuration.populationCap);
  assert.ok(maxima.entities <= configuration.combatEntityCap);
  assert.equal(maxima.structures, configuration.structureCap);
  assert.ok(maxima.queues <= configuration.productionQueueCap);
  assert.ok(maxima.pending <= configuration.pendingCommandCap);
  assert.ok(maxima.projectiles <= configuration.projectileCap);
  assert.ok(maxima.routes <= configuration.routeWaypointCap);
  assert.ok(maxima.repaths <= configuration.repathAttemptCap);
  assert.ok(maxima.observedEvents <= limits.observedEventCap);
  assert.equal(maxima.forces, limits.forceSlotCap);
  assert.ok(maxima.threats <= limits.rememberedThreatCap);
  assert.ok(maxima.candidates <= limits.objectiveCandidateCap);
  assert.ok(maxima.probes <= limits.routeProbeCap);
  assert.equal(maxima.requests, limits.totalRequestCap);
  assert.ok(maxima.snapshotBytes <= configuration.snapshotByteCap);
  assert.ok(maxima.aiBytes > 0, "the soak must record an observed valid AI-state encoded maximum");
  assert.ok(maxima.aiBytes <= limits.aiStateByteCap);
  assert.ok(maxima.replayCommands <= configuration.replayCommandCap);
  assert.ok(maxima.replayBytes <= configuration.replayByteCap);
  assert.ok(maxima.checkpointBytes <= limits.checkpointByteCap);
});

test("population, production queue, pending command, tactical selection, and structure caps fail closed", () => {
  const populationFixture = simulationApi.createSimulation().snapshot();
  populationFixture.players[0].resources = 10000;
  let simulation = simulationApi.restoreSimulation(populationFixture);
  const producer = simulation.snapshot().structures.find((structure) => structure.ownerSeat === 1);
  for (const kind of ["aegis-titan", "aegis-titan", "astral-guardian", "astral-guardian", "astral-guardian"]) {
    assert.equal(simulation.submitQueueProduction(command(simulation, "QUEUE_PRODUCTION", {
      structureId: producer.id, entityKind: kind
    })).ok, true);
  }
  let result = simulation.step();
  assert.equal(result.events.at(-1).code, "population-cap");
  let snapshot = simulation.snapshot();
  assert.equal(snapshot.players[0].populationUsed + snapshot.players[0].populationReserved, configuration.populationCap);
  assert.equal(snapshot.structures.find((structure) => structure.id === producer.id).queue.length, 4);

  const queueFixture = simulationApi.createSimulation().snapshot();
  queueFixture.players[0].resources = 10000;
  simulation = simulationApi.restoreSimulation(queueFixture);
  const queueProducer = simulation.snapshot().structures.find((structure) => structure.ownerSeat === 1);
  for (let index = 0; index < configuration.productionQueueCap + 1; index += 1) {
    assert.equal(simulation.submitQueueProduction(command(simulation, "QUEUE_PRODUCTION", {
      structureId: queueProducer.id, entityKind: "astral-guardian"
    })).ok, true);
  }
  result = simulation.step();
  assert.equal(result.events.at(-1).code, "queue-cap");
  assert.equal(simulation.snapshot().structures.find((structure) => structure.id === queueProducer.id).queue.length,
    configuration.productionQueueCap);

  simulation = simulationApi.createSimulation();
  const oneId = simulation.snapshot().entities.find((entity) => entity.ownerSeat === 1).id;
  for (let index = 0; index < configuration.pendingCommandCap; index += 1) {
    assert.equal(simulation.submitStop(command(simulation, "STOP", { entityIds: [oneId] }, { targetTick: 8 })).ok, true);
  }
  const atPendingCap = replayApi.canonicalStringify(simulation.snapshot());
  assert.deepEqual(simulation.submitStop(command(simulation, "STOP", { entityIds: [oneId] }, { targetTick: 8 })),
    { ok: false, code: "command-cap" });
  assert.equal(replayApi.canonicalStringify(simulation.snapshot()), atPendingCap);

  const selectionFixture = simulationApi.createSimulation().snapshot();
  addCheapEntities(selectionFixture, 1, 6, "selection-fixture");
  simulation = simulationApi.restoreSimulation(selectionFixture);
  const twelve = simulation.snapshot().entities.filter((entity) => entity.ownerSeat === 1).map((entity) => entity.id).sort();
  assert.equal(twelve.length, configuration.selectionCap);
  assert.equal(simulation.submitStop(command(simulation, "STOP", { entityIds: twelve })).ok, true);
  const beforeOverSelection = replayApi.canonicalStringify(simulation.snapshot());
  assert.deepEqual(simulation.submitStop(command(simulation, "STOP", { entityIds: [...twelve, twelve[0]] })),
    { ok: false, code: "selection-cap" });
  assert.equal(replayApi.canonicalStringify(simulation.snapshot()), beforeOverSelection);

  const exactStructures = simulationApi.createSimulation().snapshot();
  assert.equal(simulationApi.validateSnapshot(exactStructures).structures.length, configuration.structureCap);
  const extraStructure = clone(exactStructures);
  extraStructure.structures.push(clone(extraStructure.structures.at(-1)));
  assert.throws(() => simulationApi.restoreSimulation(extraStructure), /structures are invalid/);
});

test("projectile, route, repath, and navigation-work caps accept their exact public boundary and reject one over", () => {
  const projectileFixture = simulationApi.createSimulation().snapshot();
  projectileFixture.tick = 1;
  projectileFixture.projectiles = Array.from({ length: configuration.projectileCap }, (_, index) => projectile(index + 1));
  projectileFixture.nextProjectileNumber = configuration.projectileCap + 1;
  assert.equal(simulationApi.restoreSimulation(projectileFixture).snapshot().projectiles.length, configuration.projectileCap);
  const overProjectiles = clone(projectileFixture);
  overProjectiles.projectiles.push(projectile(configuration.projectileCap + 1));
  overProjectiles.nextProjectileNumber += 1;
  assert.throws(() => simulationApi.restoreSimulation(overProjectiles), /projectiles exceed/);

  const routeFixture = simulationApi.createSimulation().snapshot();
  const mover = routeFixture.entities.find((entity) => entity.id === "seat-1-starbow-1");
  const point = { x: mover.x, y: mover.y };
  mover.order = "MOVE";
  mover.commandRoot = { x: mover.x, y: mover.y };
  mover.route = Array.from({ length: configuration.routeWaypointCap }, () => ({ ...point }));
  mover.routeIndex = 0;
  mover.formationDestination = { ...point };
  mover.repathCount = configuration.repathAttemptCap;
  assert.equal(simulationApi.restoreSimulation(routeFixture).snapshot()
    .entities.find((entity) => entity.id === mover.id).route.length, configuration.routeWaypointCap);
  const overRoute = clone(routeFixture);
  overRoute.entities.find((entity) => entity.id === mover.id).route.push({ ...point });
  assert.throws(() => simulationApi.restoreSimulation(overRoute), /route is invalid/);
  const overRepath = clone(routeFixture);
  overRepath.entities.find((entity) => entity.id === mover.id).repathCount += 1;
  assert.throws(() => simulationApi.restoreSimulation(overRepath), /entity state is invalid/);

  const exactNodeMap = { id: "exact-node-cap", world: { width: 2048, height: 1024 }, layers: { navigation: { blockers: [] } } };
  const navigator = navigationApi.createNavigator(exactNodeMap, configuration);
  assert.equal(navigator.nodeCount, configuration.navigationNodeCap);
  const overNodeMap = { id: "over-node-cap", world: { width: 21856, height: 96 }, layers: { navigation: { blockers: [] } } };
  assert.throws(() => navigationApi.createNavigator(overNodeMap, configuration), /navigation surface exceeds/);
});

test("observed events, remembered threats, and request batches stay at their real public and facade bounds", () => {
  const opening = simulationApi.createSimulation().snapshot();
  const observation = aiApi.buildObservation(opening);
  const rawEvents = Array.from({ length: limits.observedEventCap }, (_, index) => ({
    type: "combat", status: "damage", targetId: "gravebound-headquarters-anchor",
    damage: 1, health: 1800 - index, maxHealth: 1800
  }));
  assert.equal(aiApi.filterEvents(rawEvents, 64, observation.structures).length, limits.observedEventCap);
  assert.throws(() => aiApi.filterEvents([...rawEvents, {}], 64, observation.structures), /exceeds its bound/);

  const threats = Array.from({ length: limits.rememberedThreatCap + 1 }, (_, index) => ({
    tick: 20 - index,
    kind: "damage",
    sourceId: null,
    targetId: `threat-${index}`,
    structureId: null,
    status: "damage",
    ownerSeat: null
  }));
  const bounded = aiApi.foldEvents(aiApi.createInitialState(), threats, 20);
  assert.equal(bounded.threats.length, limits.rememberedThreatCap);
  const invalidState = clone(bounded);
  invalidState.threats.push(threats.at(-1));
  assert.throws(() => aiApi.validateState(invalidState), /identity or bounds/);

  const planned = aiApi.plan(observation, aiApi.createInitialState());
  assert.equal(planned.diagnostics.requestCount, limits.totalRequestCap);
  assert.equal(planned.intents.length, limits.totalRequestCap);
  assert.ok(planned.diagnostics.candidateCount <= limits.objectiveCandidateCap);
  assert.ok(planned.diagnostics.routeProbes <= limits.routeProbeCap);

  const skirmishSource = read("phase6/skirmish.js");
  const aiSource = read("phase6/ai.js");
  assert.match(skirmishSource, /intents\.length > limits\.totalRequestCap/);
  assert.match(skirmishSource, /groups\.tactical\.length > limits\.tacticalRequestCap/);
  assert.match(skirmishSource, /groups\.production\.length > limits\.productionRequestCap/);
  assert.match(skirmishSource, /groups\.rally\.length > limits\.rallyRequestCap/);
  assert.match(aiSource, /candidates\.length >= limits\.objectiveCandidateCap/);
  assert.match(aiSource, /routeProbes >= limits\.routeProbeCap/);
  assert.match(aiSource, /encodedSize\(state, ["']AI state["'], limits\.aiStateByteCap\)/,
    "the legacy-named AI encoded-length ceiling must remain in its canonical validator");
  const initialState = aiApi.createInitialState();
  const initialStateEncoding = replayApi.canonicalStringify(initialState);
  assert.ok(initialStateEncoding.length > 0 && initialStateEncoding.length < limits.aiStateByteCap);
  const oversizedAiField = clone(initialState);
  oversizedAiField.rosterSignature = "x".repeat(limits.aiStateByteCap + 1);
  assert.throws(() => aiApi.validateState(oversizedAiField), /AI state identity or bounds are invalid/,
    "ordinary hostile AI data must fail its earlier public field bound without a private mutation path");
  assert.equal(replayApi.canonicalStringify(initialState), initialStateEncoding,
    "rejected hostile AI data must not partially mutate the prior valid state");
  const contract = read("docs/PHASE7_PRODUCT_HARDENING.md");
  assert.match(contract, /exact-at-cap and one-over-cap cases wherever the approved public data contract can validly reach both sides/i);
  assert.match(contract, /legacy-named `\*ByteCap` encoded-length ceilings on snapshots, replay, AI state, and composite checkpoints/i);
  assert.match(contract, /do not use getters, proxies, alternate caps, semantically meaningless padding, or private mutation/i);
});

test("the private AI-intent facade dynamically rejects a fifth request before authoritative mutation", () => {
  const opening = simulationApi.createSimulation().snapshot();
  const computerId = opening.entities.find((entity) => entity.ownerSeat === 2).id;
  const intents = [0, 1].map(() => ({
    protocolVersion: configuration.protocolVersion,
    configurationId: configuration.configurationId,
    kind: "STOP",
    issuingPlayer: 2,
    targetTick: 1,
    entityIds: [computerId]
  }));
  intents.push({
    protocolVersion: configuration.protocolVersion,
    configurationId: configuration.configurationId,
    kind: "QUEUE_PRODUCTION",
    issuingPlayer: 2,
    targetTick: 1,
    structureId: "gravebound-headquarters-anchor",
    entityKind: "gravebound-reaver"
  }, {
    protocolVersion: configuration.protocolVersion,
    configurationId: configuration.configurationId,
    kind: "SET_RALLY",
    issuingPlayer: 2,
    targetTick: 1,
    structureId: "gravebound-headquarters-anchor",
    destination: { x: 140000, y: 40000 }
  });

  function facadeFor(plannedIntents) {
    // The facade itself is deliberately evaluated as a browser script. Translate
    // its VM-realm option/receipt objects at the CommonJS boundary so Phase 5's
    // strict plain-object validation is testing the request, not Node VM realms.
    const hostClone = (value) => JSON.parse(JSON.stringify(value));
    const simulationBoundary = {
      createSimulation(options) {
        return simulationApi.createSimulation({ map, seed: Number(options.seed) });
      },
      restoreSimulation(snapshot) {
        return simulationApi.restoreSimulation(snapshot, { map });
      },
      validateSnapshot(snapshot) {
        return simulationApi.validateSnapshot(snapshot, { map });
      }
    };
    const replayBoundary = {
      canonicalStringify(value) {
        return replayApi.canonicalStringify(hostClone(value));
      },
      checksum: replayApi.checksum,
      createReplay(snapshot) {
        return replayApi.createReplay(snapshot, { map });
      },
      validateReplay(replay) {
        return replayApi.validateReplay(replay, { map });
      },
      runReplay(replay, options = {}) {
        const translated = { map };
        if (options.untilTick !== undefined) translated.untilTick = Number(options.untilTick);
        return replayApi.runReplay(replay, translated);
      },
      canAppendAccepted(replay, receipt) {
        return replayApi.canAppendAccepted(replay, hostClone(receipt));
      },
      appendAccepted(replay, receipt) {
        return replayApi.appendAccepted(replay, hostClone(receipt));
      }
    };
    const context = vm.createContext({
      window: {
        AeonPhase6Config: phase6Config,
        AeonPhase5Simulation: simulationBoundary,
        AeonPhase5Replay: replayBoundary,
        AeonPhase5Map: map,
        plannedIntents: JSON.stringify(plannedIntents)
      }
    });
    vm.runInContext(`
      window.AeonPhase6AI = {
        createInitialState() { return {}; },
        validateState(value) { return value; },
        buildObservation() { return {}; },
        plan() {
          return {
            state: {},
            diagnostics: { decided: true },
            intents: JSON.parse(window.plannedIntents)
          };
        },
        recordResult(value) { return value; }
      };
    `, context);
    vm.runInContext(read("phase6/skirmish.js"), context, { filename: "phase6/skirmish.js" });
    return { context, facade: context.window.AeonPhase6Skirmish };
  }

  const at = facadeFor(intents);
  at.context.window.facade = at.facade;
  const atCap = vm.runInContext("window.facade.createSkirmish({ seed: 11 })", at.context);
  assert.doesNotThrow(() => atCap.step());
  const exceeded = facadeFor([...intents, intents[0]]);
  exceeded.context.window.facade = exceeded.facade;
  const over = vm.runInContext("window.facade.createSkirmish({ seed: 11 })", exceeded.context);
  const before = replayApi.checksum(over.battleSnapshot());
  assert.throws(() => over.step(), /AI intents exceed the per-decision bound/);
  assert.equal(replayApi.checksum(over.battleSnapshot()), before);
  assert.equal(over.exportReplay().commands.length, 0);
});

test("replay command count reaches exactly 8,192 while byte ceilings remain honest fail-closed guards", () => {
  const simulation = simulationApi.createSimulation({ seed: 5 });
  const replay = replayApi.createReplay(simulation.snapshot());
  const entityId = simulation.snapshot().entities.find((entity) => entity.ownerSeat === 1).id;
  while (replay.commands.length < configuration.replayCommandCap) {
    const batch = Math.min(configuration.pendingCommandCap,
      configuration.replayCommandCap - replay.commands.length);
    for (let index = 0; index < batch; index += 1) {
      const receipt = simulation.submitStop(command(simulation, "STOP", { entityIds: [entityId] }));
      assert.equal(receipt.ok, true);
      replay.commands.push({ acceptedTick: receipt.acceptedTick, command: receipt.command });
    }
    simulation.step();
  }
  assert.equal(replay.commands.length, configuration.replayCommandCap);
  assert.ok(replayApi.canonicalStringify(replay).length < configuration.replayByteCap,
    "the reachable count cap is independent of the larger byte ceiling");
  assert.equal(replayApi.validateReplay(replay).commands.length, configuration.replayCommandCap);
  const validReplayEncoding = replayApi.canonicalStringify(replay);
  const hostileEncodedReplay = clone(replay);
  hostileEncodedReplay.configurationId = "x".repeat(configuration.replayByteCap + 1);
  assert.throws(() => replayApi.validateReplay(hostileEncodedReplay), /replay exceeds its encoded bound/,
    "ordinary bounded hostile replay data must fail the encoded-length guard before normalization");
  assert.equal(replayApi.canonicalStringify(replay), validReplayEncoding,
    "encoded-length rejection must not mutate the prior valid replay");
  assert.match(read("phase5/replay.js"), /validateEncodedSize\(value, configuration\.replayByteCap, ["']replay["']\)/);
  const receipt = simulation.submitStop(command(simulation, "STOP", { entityIds: [entityId] }));
  assert.deepEqual(replayApi.canAppendAccepted(replay, receipt), { ok: false, code: "replay-cap" });
  const overReplay = clone(replay);
  overReplay.commands.push({});
  assert.throws(() => replayApi.validateReplay(overReplay), /command bound/);

  const opening = simulationApi.createSimulation().snapshot();
  assert.ok(replayApi.canonicalStringify(opening).length < configuration.snapshotByteCap);
  assert.deepEqual(simulationApi.validateSnapshot(opening), opening);
  const overSnapshot = clone(opening);
  overSnapshot.configurationId = "x".repeat(configuration.snapshotByteCap + 1);
  assert.throws(() => simulationApi.validateSnapshot(overSnapshot), /encoded bound/);

  const checkpoint = {
    schemaVersion: phase6Config.identity.schemaVersion,
    configurationId: phase6Config.identity.configurationId,
    battle: opening,
    aiState: aiApi.createInitialState()
  };
  const validated = skirmishApi.validateCheckpoint(checkpoint);
  assert.ok(replayApi.canonicalStringify(validated).length < limits.checkpointByteCap);
  const overCheckpoint = clone(checkpoint);
  overCheckpoint.configurationId = "x".repeat(limits.checkpointByteCap + 1);
  assert.throws(() => skirmishApi.validateCheckpoint(overCheckpoint), /encoded bound/);
});

test("early and production checkpoint continuations converge; inherited defense through completion remains locked", {
  timeout: 30000
}, () => {
  const original = skirmishApi.createSkirmish({ seed: 0x4a0e2026 });
  original.step();
  const earlyCheckpoint = original.checkpoint();
  const earlyReplay = original.exportReplay();
  while (original.tick < 50) original.step();
  const productionCheckpoint = original.checkpoint();
  assert.ok(productionCheckpoint.battle.structures.some((structure) => structure.queue.length > 0));

  const fromEarly = skirmishApi.restoreSkirmish(earlyCheckpoint, { replay: earlyReplay });
  while (fromEarly.tick < 50) fromEarly.step();
  assert.equal(fromEarly.compositeChecksum(), original.compositeChecksum());
  assert.deepEqual(fromEarly.checkpoint(), productionCheckpoint);
  assert.deepEqual(fromEarly.exportReplay(), original.exportReplay());

  const fromProduction = skirmishApi.restoreSkirmish(productionCheckpoint, { replay: original.exportReplay() });
  for (let tick = 0; tick < 45; tick += 1) {
    assert.deepEqual(fromProduction.step(), original.step());
    assert.equal(fromProduction.compositeChecksum(), original.compositeChecksum());
  }
  assert.deepEqual(fromProduction.exportReplay(), original.exportReplay());
  const frozenChecksum = fromProduction.compositeChecksum();
  fromEarly.destroy();
  fromProduction.destroy();
  assert.deepEqual(fromProduction.step(), { tick: 95, events: [] });
  assert.equal(fromProduction.compositeChecksum(), frozenChecksum);
});

test("three input lifecycles install one match-owned set, release captures, and remove every listener", () => {
  class FakeTarget {
    constructor() { this.listeners = new Map(); this.captures = new Set(); }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    count() { return Array.from(this.listeners.values()).reduce((total, values) => total + values.size, 0); }
    dispatch(type, event = {}) {
      for (const listener of [...(this.listeners.get(type) || [])]) listener({
        target: this, pointerType: "mouse", pointerId: 1, button: 0,
        clientX: 10, clientY: 10, preventDefault() {}, stopImmediatePropagation() {},
        ...event
      });
    }
    getBoundingClientRect() { return { left: 0, top: 0, width: 844, height: 390 }; }
    closest() { return null; }
    setPointerCapture(identifier) { this.captures.add(identifier); }
    hasPointerCapture(identifier) { return this.captures.has(identifier); }
    releasePointerCapture(identifier) { this.captures.delete(identifier); }
  }
  const priorWindow = global.window;
  const priorDocument = global.document;
  const windowTarget = new FakeTarget();
  const documentTarget = new FakeTarget();
  documentTarget.hidden = false;
  global.window = windowTarget;
  global.document = documentTarget;
  const inputApiPath = path.join(ROOT, "phase5/input.js");
  delete require.cache[require.resolve(inputApiPath)];
  const inputApi = require(inputApiPath);
  try {
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const target = new FakeTarget();
      const camera = {
        snapshot() { return { zoom: 1 }; },
        screenToWorld(x, y) { return { x, y }; },
        panByScreen() {}, zoomAt() {}
      };
      const input = inputApi.createInput({
        target, camera, configuration: cameraApi.configuration,
        onContextRequest() {}, onCameraChange() {}, onSelectPoint() {}, onSelectBox() {},
        onSelectionPreview() {}, onHoverChange() {}, onContextModeChange() {}, onTransientReset() {}
      });
      assert.equal(target.count(), 13, `cycle ${cycle + 1} target listener set`);
      assert.equal(windowTarget.count(), 5, `cycle ${cycle + 1} window listener set`);
      assert.equal(documentTarget.count(), 1, `cycle ${cycle + 1} document listener set`);
      target.dispatch("pointerdown", { pointerType: "touch", pointerId: 9 });
      assert.equal(target.captures.has(9), true);
      input.destroy();
      assert.equal(target.count(), 0);
      assert.equal(target.captures.size, 0);
      assert.equal(windowTarget.count(), 0);
      assert.equal(documentTarget.count(), 0);
    }
  } finally {
    global.window = priorWindow;
    global.document = priorDocument;
    delete require.cache[require.resolve(inputApiPath)];
  }
});

test("Phase 7 app owns one executable lifecycle, balanced listeners, bounded effects, and complete teardown", async () => {
  const app = read("phase7/app.js");
  const css = read("phase7/phase7.css");
  const additions = Array.from(app.matchAll(/([\w.]+)\.addEventListener\(["']([^"']+)["']\s*,\s*([\w]+)/g),
    (match) => `${match[1]}|${match[2]}|${match[3]}`).sort();
  const removals = Array.from(app.matchAll(/([\w.]+)\.removeEventListener\(["']([^"']+)["']\s*,\s*([\w]+)/g),
    (match) => `${match[1]}|${match[2]}|${match[3]}`).sort();
  assert.deepEqual(removals, additions, "every page-global listener has the same teardown owner");
  assert.match(app, /function cancelAnimationLoop\(\)[\s\S]{0,350}window\.cancelAnimationFrame\(animationFrame\)/);
  assert.match(app, /cancelAnimationLoop\(\)/);
  assert.match(app, /input\.destroy\(\)/);
  assert.match(app, /renderer\.destroy\(\)/);
  assert.match(app, /skirmish\.destroy\(\)/);
  assert.match(app, /entityAssets\?\.dispose/);
  assert.match(app, /entityAssets\.dispose\(\)/);
  assert.match(app, /structureAssets\?\.dispose/);
  assert.match(app, /structureAssets\.dispose\(\)/);
  assert.match(app, /releaseImage\(groundImage\)/);
  assert.match(app, /function releaseImage\([^)]*\)[\s\S]{0,300}image\.removeAttribute\(["']src["']\)/);
  assert.match(app, /menuArt\.removeAttribute\(["']src["']\)/);
  assert.match(app, /selectedEntityIds\.clear\(\)/);
  assert.match(app, /movementFrames\.clear\(\)/);
  assert.match(app, /destinationFeedback\.length\s*=\s*0/);
  assert.match(app, /defeatShells\.length\s*=\s*0/);
  assert.match(app, /presentationalEffects\.length\s*=\s*0/);
  assert.match(app, /pendingCommands\.clear\(\)/);
  assert.match(app, /presentationalEffects\.length \+ defeatShells\.length >= presentationCap\(\)/);
  assert.match(app, /tier:\s*artTier\.value/);
  assert.doesNotMatch(app, /tier:\s*["'](?:standard|compact)["'][\s\S]{0,120}tier:\s*["'](?:standard|compact)["']/);
  assert.match(app, /candidateEntityAssets\.dispose\(\)/);
  assert.match(app, /candidateStructureAssets\.dispose\(\)/);
  assert.match(app, /for \(const canvas of Object\.values\(canvases\)\)[\s\S]{0,120}canvas\.width\s*=\s*0[\s\S]{0,80}canvas\.height\s*=\s*0/);
  assert.match(app, /event\.persisted[\s\S]{0,250}resetTransient\(\)[\s\S]{0,250}destroy\(\)/);
  assert.match(app, /reducedMotionQuery\.removeEventListener\(["']change["'],\s*onReducedMotionChange\)/);
  assert.match(app, /stage = ["']battlefield["'][\s\S]{0,300}focusFirstAvailable\(\[playFrame\]\)/,
    "focus must leave the hidden disabled Begin control before asynchronous preload");
  assert.match(app, /function showLoadError\([^)]*\)[\s\S]{0,500}releaseBrowserFeatures\([^)]*load failure[^)]*\)[\s\S]{0,500}unloadRuntime\(\)/i,
    "load failure must cancel and release browser features before recovery");
  assert.match(app, /function retireCompletedRuntime\(\)[\s\S]{0,1800}input\?\.destroy\(\)[\s\S]{0,1800}skirmish\?\.destroy\(\)[\s\S]{0,1800}releaseImage\(groundImage\)[\s\S]{0,1800}canvas\.width\s*=\s*0[\s\S]{0,1800}releaseBrowserFeatures\(/,
    "completed presentation must retire match-owned runtime, assets, canvases, and browser locks");
  assert.match(app, /let completedRuntimeRetired = false[\s\S]{0,50000}function retireCompletedRuntime\(\)\s*\{[\s\S]{0,240}completedRuntimeRetired\)[\s\S]{0,120}completedRuntimeRetired = true/,
    "completed runtime teardown must be idempotent across later lifecycle events");
  assert.match(app, /aria-label["'],\s*active \? ["']Exit fullscreen["'] : ["']Request fullscreen["']/,
    "the active fullscreen control must expose its available exit action");
  assert.match(app, /currentSnapshot\.match\?\.status === ["']complete["'] && !completedPresentationActive\(\)[\s\S]{0,120}retireCompletedRuntime\(\)/,
    "the final presentation frame must invoke completed-match retirement");
  assert.match(app, /function syncInputState\(\)[\s\S]{0,500}matchComplete && \(suspended \|\| !completedPresentationActive\(\)\)[\s\S]{0,160}retireCompletedRuntime\(\)/,
    "suspension must retire a completed match even while terminal effects remain");
  assert.match(css, /@media\s*\(max-width:\s*900px\),\s*\(max-height:\s*500px\)[\s\S]{0,900}\.state-stack\s*\{[\s\S]{0,500}pointer-events:\s*auto/i,
    "the compact state scroller and structure selector must remain pointer and touch operable");
  assert.match(css, /\.menu-fallback:not\(\[hidden\]\)\s*~\s*\.menu-hit\s*\{[\s\S]{0,300}border:[\s\S]{0,200}background:[\s\S]{0,200}color:/i,
    "a failed menu image must reveal visible control surfaces instead of leaving transparent hit targets");
  assert.match(css, /\.menu-fallback:not\(\[hidden\]\)\s*~\s*\.menu-hit\s*>\s*\.visually-hidden\s*\{[\s\S]{0,500}position:\s*static\s*!important[\s\S]{0,500}clip:\s*auto\s*!important/i,
    "a failed menu image must restore readable labels on the remaining native controls");
  assert.match(app, /let browserReleasePromise = Promise\.resolve\(null\)/);
  assert.match(app, /function releaseBrowserFeatures\([^)]*\)[\s\S]{0,500}browserReleasePromise[\s\S]{0,500}browserFeatures\.release\(\)/,
    "browser-feature releases must be serialized");
  assert.match(app, /const browserFeatureRequests = new Set\(\)/);
  assert.match(app, /function trackBrowserFeatureRequest\([^)]*\)[\s\S]{0,500}browserFeatureRequests\.add\(pending\)[\s\S]{0,500}pending\.then\(clear, clear\)/,
    "every browser-feature request must remain tracked through fulfillment or rejection");
  assert.match(app, /function releaseBrowserFeatures\([^)]*\)[\s\S]{0,700}browserFeatureReleasePending = true[\s\S]{0,700}waitForBrowserFeatureRequests\(\)[\s\S]{0,700}browserFeatures\.release\(\)/,
    "release must block new browser actions and wait for every cancelled in-flight request");
  assert.match(app, /async function onFullscreenRequest\(\)\s*\{\s*if \(browserFeatureActionPending \|\| browserFeatureReleasePending\) return;/,
    "fullscreen actions must not enter while release owns the browser-feature lock");
  assert.match(app, /await request\.catch\([\s\S]{0,400}if \(browserFeatureReleasePending\) return;[\s\S]{0,120}browserFeatureActionPending = false/,
    "an older fullscreen request must not clear a newer release lock");
  assert.match(app, /async function returnToMenu\(\)[\s\S]{0,900}beginButton\.disabled = true[\s\S]{0,900}await release[\s\S]{0,300}beginButton\.disabled = false/,
    "a new Begin gesture must remain unavailable until prior browser-feature release settles");
  assert.match(app, /async function returnToMenu\(\)[\s\S]{0,900}focusFirstAvailable\(\[settingsButton\]\)[\s\S]{0,120}await release/,
    "Menu return must move focus to a visible enabled control before awaiting browser release");
  const fullscreenHandler = app.slice(app.indexOf("async function onFullscreenRequest"), app.indexOf("function onFullscreenChange"));
  assert.doesNotMatch(fullscreenHandler, /(?:menuFullscreenButton|battlefieldFullscreenButton)\.disabled\s*=/,
    "an activated fullscreen control must remain a valid focus target while its request settles");
  assert.match(app, /const cancelReason = currentSnapshot\?\.match\?\.status === ["']complete["'][\s\S]{0,1400}Cancel · \$\{titleWords\(cancelReason\)\}[\s\S]{0,500}cancel\.disabled = Boolean\(cancelReason\)/,
    "queue cancellation must expose a readable disabled reason while paused or complete");
  assert.match(app, /function onSettingsOpen\(\)\s*\{\s*settingsInvoker = settingsButton/,
    "Settings focus recovery must use its sole actual invoker rather than browser active-element quirks");

  const live = createPhase7AppVmHarness();
  const installedListeners = live.listenerCount();
  assert.ok(installedListeners > 20, "the executable shell must install its bounded page listener set");
  assert.equal(live.elements["app-shell"].dataset.stage, undefined);
  assert.equal(live.elements["menu-screen"].hidden, false);
  assert.equal(live.elements["battlefield-screen"].hidden, true);
  assert.equal(live.elements["menu-fallback"].hidden, true);
  live.elements["menu-art"].onerror();
  assert.equal(live.elements["menu-fallback"].hidden, false,
    "the executable image-failure path must expose the semantic fallback");

  live.elements["settings-button"].focus();
  await live.elements["settings-button"].dispatch("click", { detail: 0 });
  assert.equal(live.elements["settings-dialog"].open, true);
  assert.equal(live.document.activeElement, live.elements["fullscreen-on-begin"]);
  assert.equal([
    live.elements["fullscreen-on-begin"], live.elements["art-tier"], live.dialogClose
  ].every((control) => hardening.canReceiveProgrammaticFocus(control)), true);
  live.elements["settings-dialog"].close();
  assert.equal(live.document.activeElement, live.elements["settings-button"],
    "closing the native dialog must restore its actual invoker");

  live.elements["menu-fullscreen-button"].focus();
  await live.elements["menu-fullscreen-button"].dispatch("click", { detail: 0 });
  await live.flush();
  assert.equal(live.counters.fullscreenRequests, 1);
  assert.equal(live.document.fullscreenElement, live.document.documentElement);
  assert.equal(live.document.activeElement, live.elements["menu-fullscreen-button"],
    "keyboard-generated fullscreen activation must not discard its focus target");
  await live.elements["menu-fullscreen-button"].dispatch("click", { detail: 0 });
  await live.flush();
  assert.equal(live.counters.fullscreenExits, 1);
  assert.equal(live.document.fullscreenElement, null);

  live.elements["begin-button"].focus();
  await live.elements["begin-button"].dispatch("click", { detail: 0 });
  await live.flush();
  assert.equal(live.elements["app-shell"].dataset.stage, "battlefield");
  assert.equal(live.elements["menu-screen"].hidden, true);
  assert.equal(live.elements["battlefield-screen"].hidden, false);
  assert.equal(live.document.activeElement, live.elements["play-frame"],
    "focus must move into the active battlefield after Begin");
  assert.equal(live.counters.entityLoads, 1);
  assert.equal(live.counters.entityTier, "compact", "the selected URL-backed tier must be the only loaded entity tier");
  assert.match(live.counters.entityBaseUrl, /\/phase3\/$/);
  assert.match(live.counters.structureBaseUrl, /\/phase5\/$/);
  assert.equal(live.counters.structureLoads, 1);
  assert.equal(live.counters.orientationLocks, 1, "Begin must settle its app-owned landscape request");
  assert.equal(live.counters.skirmishCreated, 1);
  assert.equal(live.counters.rendererCreated, 1);
  assert.equal(live.counters.inputCreated, 1);
  assert.equal(live.animationCallbacks.size, 1, "one and only one app-owned RAF must be pending while active");
  assert.equal(live.canvasElements.every((canvas) => canvas.width > 0 && canvas.height > 0), true);
  assert.equal(live.elements["objective-value"].textContent, "Hostile HQ 1800 / 1800");

  live.elements["structure-select"].value = "astral-headquarters-anchor";
  live.elements["structure-select"].focus();
  await live.elements["structure-select"].dispatch("change", { detail: 0 });
  assert.equal(live.elements["selection-summary"].textContent, "Astral headquarters");
  assert.match(live.elements["selection-detail"].textContent, /You · Astral Concord · ◇ Azure/);
  assert.equal(live.elements["producer-tray"].hidden, false);
  assert.equal(live.elements["rally-mode-button"].disabled, false);
  assert.equal(live.elements["clear-selection-button"].disabled, false);
  assert.equal(live.elements["move-mode-button"].disabled, true);
  assert.match(live.elements["command-availability"].textContent, /select one or more owned combat entities/i);
  assert.equal(live.productionButtons.every((button) => !button.disabled), true);

  const queueOption = live.productionButtons[0];
  queueOption.focus();
  await live.elements["production-options"].dispatch("click", { detail: 0, target: queueOption });
  assert.equal(live.counters.humanCommands.at(-1).kind, "QUEUE_PRODUCTION",
    "native keyboard activation must execute the production button's real click path");

  const resetCountBeforeCameraButtons = live.counters.cameraResets;
  await live.elements["zoom-in-button"].dispatch("click", { detail: 0 });
  await live.elements["zoom-out-button"].dispatch("click", { detail: 0 });
  await live.elements["reset-camera-button"].dispatch("click", { detail: 0 });
  assert.equal(live.counters.cameraZooms.length, 2);
  assert.equal(live.counters.cameraResets, resetCountBeforeCameraButtons + 1);

  live.elements["navigation-button"].focus();
  await live.elements["navigation-button"].dispatch("click", { detail: 0 });
  assert.equal(live.elements["navigation-button"].getAttribute("aria-pressed"), "true");
  assert.equal(live.counters.navigationStates.at(-1), true);

  live.elements["battlefield-fullscreen-button"].focus();
  await live.elements["battlefield-fullscreen-button"].dispatch("click", { detail: 0 });
  await live.flush();
  assert.equal(live.counters.fullscreenRequests, 2);
  assert.equal(live.document.activeElement, live.elements["battlefield-fullscreen-button"]);
  await live.elements["battlefield-fullscreen-button"].dispatch("click", { detail: 0 });
  await live.flush();
  assert.equal(live.counters.fullscreenExits, 2);

  const opening = simulationApi.createSimulation({ map, seed: 0x4a0e2026 }).snapshot();
  const owned = opening.entities.find((entity) => entity.ownerSeat === 1);
  const hostile = opening.entities.find((entity) => entity.ownerSeat === 2);
  live.counters.inputOptions.onHoverChange({
    worldPoint: { x: hostile.x / configuration.positionScale, y: hostile.y / configuration.positionScale }
  });
  assert.match(live.elements["target-status"].textContent, /Computer · Gravebound Court · ✕ Violet · HP \d+\/\d+ · hostile marker ⊗/);
  live.counters.inputOptions.onSelectPoint({
    worldPoint: { x: owned.x / configuration.positionScale, y: owned.y / configuration.positionScale },
    additive: false
  });
  assert.equal(live.elements["move-mode-button"].disabled, false);
  live.elements["move-mode-button"].focus();
  await live.elements["move-mode-button"].dispatch("click", { detail: 0 });
  assert.equal(live.elements["move-mode-button"].getAttribute("aria-pressed"), "true");
  const beforeEscape = [live.counters.humanCommands.length, live.counters.skirmishSteps];
  let escapePrevented = false;
  let escapeStopped = false;
  await live.elements["play-frame"].dispatch("keydown", {
    target: live.elements["move-mode-button"],
    code: "Escape",
    detail: 0,
    preventDefault() { escapePrevented = true; },
    stopPropagation() { escapeStopped = true; }
  });
  assert.equal(live.elements["move-mode-button"].getAttribute("aria-pressed"), "false");
  assert.deepEqual([live.counters.humanCommands.length, live.counters.skirmishSteps], beforeEscape,
    "Escape on the focused tactical button must clear transient mode without command or tick");
  assert.deepEqual([escapePrevented, escapeStopped], [false, false],
    "Escape on an interactive control must preserve that control's native event behavior");

  const stepsBeforeReducedMotion = live.counters.skirmishSteps;
  live.mediaQuery.matches = true;
  await live.mediaQuery.dispatch("change");
  assert.equal(live.counters.reducedMotionChanges.at(-1), true);
  assert.equal(live.counters.skirmishSteps, stepsBeforeReducedMotion,
    "a runtime reduced-motion change is presentation-only");
  assert.equal(live.animationCallbacks.size, 1);

  let transientBefore = live.counters.inputTransientResets;
  const stepsBeforeBfCache = live.counters.skirmishSteps;
  await live.window.dispatch("pagehide", { persisted: true });
  assert.equal(live.animationCallbacks.size, 0);
  assert.ok(live.counters.inputTransientResets > transientBefore);
  assert.equal(live.counters.skirmishSteps, stepsBeforeBfCache);
  assert.equal(live.listenerCount(), installedListeners);
  await live.window.dispatch("pageshow", { persisted: true });
  assert.equal(live.animationCallbacks.size, 1);
  assert.equal(live.listenerCount(), installedListeners,
    "BFCache restore must neither duplicate global listeners nor RAF ownership");
  await live.window.dispatch("pageshow", { persisted: true });
  assert.equal(live.animationCallbacks.size, 1, "a repeated persisted pageshow cannot schedule a second RAF");
  assert.equal(live.listenerCount(), installedListeners);

  transientBefore = live.counters.inputTransientResets;
  live.elements["app-shell"].clientWidth = 390;
  live.elements["app-shell"].clientHeight = 844;
  await live.window.dispatch("resize");
  assert.equal(live.elements["orientation-gate"].hidden, false);
  assert.equal(live.elements["battlefield-screen"].hidden, true);
  assert.equal(live.elements["battlefield-screen"].inert, true);
  assert.equal(live.document.activeElement, live.elements["orientation-gate"]);
  assert.equal(live.animationCallbacks.size, 0);
  assert.ok(live.counters.inputTransientResets > transientBefore);
  assert.equal(live.counters.skirmishSteps, stepsBeforeBfCache);
  await live.window.dispatch("pagehide", { persisted: true });
  await live.window.dispatch("pageshow", { persisted: true });
  assert.equal(live.animationCallbacks.size, 0, "BFCache pageshow must remain gated in portrait");
  assert.equal(live.listenerCount(), installedListeners);

  live.elements["app-shell"].clientWidth = 639;
  live.elements["app-shell"].clientHeight = 360;
  await live.window.dispatch("resize");
  assert.equal(live.elements["orientation-gate"].hidden, true);
  assert.equal(live.elements["size-gate"].hidden, false);
  assert.equal(live.document.activeElement, live.elements["size-gate"]);
  assert.equal(live.animationCallbacks.size, 0);
  assert.equal(live.counters.skirmishSteps, stepsBeforeBfCache);

  live.elements["app-shell"].clientWidth = 844;
  live.elements["app-shell"].clientHeight = 390;
  await live.window.dispatch("resize");
  assert.equal(live.elements["size-gate"].hidden, true);
  assert.equal(live.elements["battlefield-screen"].hidden, false);
  assert.equal(live.document.activeElement, live.elements["play-frame"]);
  assert.equal(live.animationCallbacks.size, 1);

  transientBefore = live.counters.inputTransientResets;
  live.document.visibilityState = "hidden";
  await live.document.dispatch("visibilitychange");
  assert.equal(live.animationCallbacks.size, 0);
  assert.ok(live.counters.inputTransientResets > transientBefore);
  assert.equal(live.counters.skirmishSteps, stepsBeforeBfCache);
  live.document.visibilityState = "visible";
  await live.document.dispatch("visibilitychange");
  assert.equal(live.animationCallbacks.size, 1);

  transientBefore = live.counters.inputTransientResets;
  await live.window.dispatch("blur");
  assert.equal(live.animationCallbacks.size, 0);
  assert.ok(live.counters.inputTransientResets > transientBefore);
  assert.equal(live.counters.skirmishSteps, stepsBeforeBfCache);
  await live.window.dispatch("focus");
  assert.equal(live.animationCallbacks.size, 1);

  live.elements["structure-select"].value = "astral-headquarters-anchor";
  await live.elements["structure-select"].dispatch("change", { detail: 0 });
  assert.equal(live.elements["producer-tray"].hidden, false);

  live.elements["pause-button"].focus();
  await live.elements["pause-button"].dispatch("click", { detail: 0 });
  assert.equal(live.elements["pause-button"].textContent, "Resume");
  assert.equal(live.elements["pause-button"].getAttribute("aria-pressed"), "true");
  assert.equal(live.animationCallbacks.size, 0, "Pause must cancel the sole owned RAF");
  assert.ok(live.counters.inputTransientResets > transientBefore);
  assert.equal(live.counters.inputEnabled.at(-1), false);
  const stepsWhilePaused = live.counters.skirmishSteps;
  await live.flush();
  assert.equal(live.counters.skirmishSteps, stepsWhilePaused, "no authoritative step may run while paused");

  await live.elements["pause-button"].dispatch("click", { detail: 0 });
  assert.equal(live.elements["pause-button"].textContent, "Pause");
  assert.equal(live.elements["pause-button"].getAttribute("aria-pressed"), "false");
  assert.equal(live.counters.inputEnabled.at(-1), true);
  assert.equal(live.animationCallbacks.size, 1, "Resume must restore exactly one RAF owner");
  live.runNextAnimation(100);
  assert.equal(live.animationCallbacks.size, 1);
  live.runNextAnimation(100 + configuration.tickDurationMs + 1);
  assert.equal(live.counters.skirmishSteps, 1, "the resumed RAF must advance the inherited skirmish exactly once");
  assert.equal(live.animationCallbacks.size, 1, "the active loop must remain singly scheduled");

  let cancelButtons = live.elements["production-queue"].querySelectorAll("button[data-queue-item-id]");
  assert.equal(cancelButtons.length, 1, "the accepted production command must render one native cancel button");
  cancelButtons[0].focus();
  await live.elements["production-queue"].dispatch("click", { detail: 0, target: cancelButtons[0] });
  assert.equal(live.counters.humanCommands.at(-1).kind, "CANCEL_PRODUCTION",
    "native keyboard activation must execute the real queue-cancellation click path");
  live.runNextAnimation(100 + configuration.tickDurationMs * 2 + 2);
  assert.equal(live.counters.skirmishSteps, 2);
  cancelButtons = live.elements["production-queue"].querySelectorAll("button[data-queue-item-id]");
  assert.equal(cancelButtons.length, 0);
  assert.equal(live.document.activeElement, live.productionButtons[0],
    "removing the focused queue item must recover focus to the next enabled production control");

  const focusBeforeMenu = live.focusHistory.length;
  live.elements["menu-button"].focus();
  await live.elements["menu-button"].dispatch("click", { detail: 0 });
  await live.flush();
  assert.equal(live.elements["app-shell"].dataset.stage, "menu");
  assert.equal(live.elements["menu-screen"].hidden, false);
  assert.equal(live.elements["battlefield-screen"].hidden, true);
  assert.deepEqual(live.focusHistory.slice(focusBeforeMenu), ["menu-button", "settings-button", "begin-button"],
    "Menu must expose a stable focus target during release, then restore Begin");
  assert.equal(live.document.activeElement, live.elements["begin-button"]);
  assert.equal(live.counters.orientationUnlocks, 1);
  assert.equal(live.counters.inputDestroyed, 1);
  assert.equal(live.counters.rendererDestroyed, 1);
  assert.equal(live.counters.skirmishDestroyed, 1);
  assert.equal(live.counters.entityDisposals, 1);
  assert.equal(live.counters.structureDisposals, 1);
  assert.equal(live.counters.groundReleases, 1);
  assert.equal(live.animationCallbacks.size, 0);
  assert.equal(live.canvasElements.every((canvas) => canvas.width === 0 && canvas.height === 0), true);
  assert.equal(live.listenerCount(), installedListeners,
    "returning to the menu must retire match resources without duplicating page listeners");

  for (let cycle = 2; cycle <= 3; cycle += 1) {
    await live.elements["begin-button"].dispatch("click", { detail: 0 });
    await live.flush();
    assert.equal(live.elements["app-shell"].dataset.stage, "battlefield", `cycle ${cycle} active stage`);
    assert.equal(live.animationCallbacks.size, 1, `cycle ${cycle} owns one RAF`);
    assert.equal(live.listenerCount(), installedListeners, `cycle ${cycle} must not duplicate page listeners`);
    await live.elements["menu-button"].dispatch("click", { detail: 0 });
    await live.flush();
    assert.equal(live.elements["app-shell"].dataset.stage, "menu", `cycle ${cycle} menu stage`);
    assert.equal(live.animationCallbacks.size, 0, `cycle ${cycle} retires its RAF`);
    assert.equal(live.listenerCount(), installedListeners, `cycle ${cycle} preserves one page listener set`);
  }
  assert.equal(live.counters.inputCreated, 3);
  assert.equal(live.counters.inputDestroyed, 3);
  assert.equal(live.counters.rendererCreated, 3);
  assert.equal(live.counters.rendererDestroyed, 3);
  assert.equal(live.counters.skirmishCreated, 3);
  assert.equal(live.counters.skirmishDestroyed, 3);
  assert.equal(live.counters.entityLoads, 3);
  assert.equal(live.counters.entityDisposals, 3);
  assert.equal(live.counters.structureLoads, 3);
  assert.equal(live.counters.structureDisposals, 3);

  await live.window.dispatch("pagehide", { persisted: false });
  await live.flush();
  assert.equal(live.listenerCount(), 0, "a non-BFCache pagehide must remove every page listener");
  assert.equal(live.animationCallbacks.size, 0);
  assert.equal(live.counters.resizeObserverDisconnected, 1);
  assert.equal(live.counters.inputDestroyed, 3, "page teardown must not double-destroy a retired match input");

  const completed = createPhase7AppVmHarness({ completeAfterSteps: 1, search: "?art=standard" });
  const completedInstalledListeners = completed.listenerCount();
  await completed.elements["begin-button"].dispatch("click", { detail: 0 });
  await completed.flush();
  completed.runNextAnimation(100);
  completed.runNextAnimation(100 + configuration.tickDurationMs + 1);
  await completed.flush();
  assert.equal(completed.counters.skirmishSteps, 1);
  assert.equal(completed.elements["app-shell"].dataset.match, "complete");
  assert.match(completed.elements["objective-value"].textContent, /You win at tick 1/);
  assert.match(completed.elements["match-status"].textContent, /Match complete · You · ◇ Azure win · tick 1/);
  assert.equal(completed.elements["battlefield-fullscreen-button"].disabled, true);
  assert.equal(completed.counters.inputDestroyed, 1);
  assert.equal(completed.counters.rendererDestroyed, 1);
  assert.equal(completed.counters.skirmishDestroyed, 1,
    "the real completed-match branch must retire the inherited strategic session");
  assert.equal(completed.counters.entityDisposals, 1);
  assert.equal(completed.counters.structureDisposals, 1);
  assert.equal(completed.counters.groundReleases, 1);
  assert.equal(completed.counters.orientationUnlocks, 1);
  assert.equal(completed.animationCallbacks.size, 0);
  assert.equal(completed.canvasElements.every((canvas) => canvas.width === 0 && canvas.height === 0), true);
  assert.equal(completed.listenerCount(), completedInstalledListeners,
    "completed-match retirement preserves one page shell listener set until ordinary teardown");
  await completed.elements["menu-button"].dispatch("click", { detail: 0 });
  await completed.flush();
  assert.equal(completed.elements["app-shell"].dataset.stage, "menu");
  assert.equal(completed.counters.skirmishDestroyed, 1);
  assert.equal(completed.counters.entityDisposals, 1);
  assert.equal(completed.counters.structureDisposals, 1);
  await completed.window.dispatch("pagehide", { persisted: false });
  await completed.flush();
  assert.equal(completed.listenerCount(), 0);

  const failed = createPhase7AppVmHarness({ failEntityLoad: true, search: "?art=standard" });
  const failedInstalledListeners = failed.listenerCount();
  await failed.elements["begin-button"].dispatch("click");
  await failed.flush();
  assert.equal(failed.elements["app-shell"].dataset.stage, "error");
  assert.equal(failed.elements["load-error"].hidden, false);
  assert.match(failed.elements["load-error-detail"].textContent, /simulated-entity-load/);
  assert.equal(failed.document.activeElement, failed.elements["error-menu-button"],
    "load failure must focus an operable recovery control");
  assert.equal(failed.counters.entityTier, "standard");
  assert.equal(failed.counters.inputCreated, 0);
  assert.equal(failed.counters.rendererCreated, 0);
  assert.equal(failed.counters.skirmishCreated, 0);
  assert.equal(failed.counters.structureDisposals, 1,
    "a sibling preload that fulfilled before another failed must be disposed");
  assert.equal(failed.counters.groundReleases, 1);
  assert.equal(failed.animationCallbacks.size, 0);
  assert.equal(failed.listenerCount(), failedInstalledListeners);
  await failed.elements["error-menu-button"].dispatch("click");
  await failed.flush();
  assert.equal(failed.elements["app-shell"].dataset.stage, "menu");
  assert.equal(failed.document.activeElement, failed.elements["begin-button"]);
  await failed.window.dispatch("pagehide", { persisted: false });
  await failed.flush();
  assert.equal(failed.listenerCount(), 0);
  assert.equal(failed.counters.resizeObserverDisconnected, 1);

  const initiallyUnfocused = createPhase7AppVmHarness({
    initiallyFocused: false,
    search: "?art=compact&view=battlefield"
  });
  initiallyUnfocused.runNextAnimation(0);
  await initiallyUnfocused.flush();
  assert.equal(initiallyUnfocused.elements["app-shell"].dataset.stage, "battlefield");
  assert.equal(initiallyUnfocused.counters.skirmishSuspended.at(-1), true,
    "a directly opened battlefield must sample an initially unfocused document as suspended");
  assert.equal(initiallyUnfocused.counters.inputEnabled.at(-1), false);
  assert.equal(initiallyUnfocused.animationCallbacks.size, 0,
    "initial focus loss must prevent an authoritative RAF before any blur event exists");
  assert.equal(initiallyUnfocused.counters.skirmishSteps, 0);
  initiallyUnfocused.document.focused = true;
  await initiallyUnfocused.window.dispatch("focus");
  assert.equal(initiallyUnfocused.counters.skirmishSuspended.at(-1), false);
  assert.equal(initiallyUnfocused.counters.inputEnabled.at(-1), true);
  assert.equal(initiallyUnfocused.animationCallbacks.size, 1,
    "the first real focus event may resume exactly one RAF owner");
  await initiallyUnfocused.window.dispatch("pagehide", { persisted: false });
  await initiallyUnfocused.flush();
  assert.equal(initiallyUnfocused.listenerCount(), 0);
});
