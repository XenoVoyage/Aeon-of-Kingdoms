"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const GAME_SOURCE = fs.readFileSync(path.join(ROOT, "js/game.js"), "utf8");
const CONFIG_SOURCE = fs.readFileSync(path.join(ROOT, "js/config.js"), "utf8");
const HTML_SOURCE = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS_SOURCE = fs.readFileSync(path.join(ROOT, "css/app.css"), "utf8");

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type) {
    const event = {
      type,
      target: this,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }
}

class FakeElement extends FakeEventTarget {
  constructor(id) {
    super();
    this.id = id;
    this.attributes = new Map();
    this.dataset = {};
    this.disabled = false;
    this.hidden = false;
    this.open = false;
    this.textContent = "";
    this.value = "";
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "open") this.open = true;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "open") this.open = false;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  focus() {}

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

function createHudHarness(mode, rivalProgress) {
  const ids = [...GAME_SOURCE.matchAll(/element\("([^"]+)"\)/g)].map((match) => match[1]);
  const elements = new Map(ids.map((id) => [id, new FakeElement(id)]));
  const documentTarget = new FakeEventTarget();
  const document = {
    body: { dataset: {} },
    hidden: false,
    getElementById: (id) => elements.get(id) || null,
    addEventListener: documentTarget.addEventListener.bind(documentTarget),
  };
  const browserWindow = new FakeEventTarget();
  Object.assign(browserWindow, {
    document,
    innerWidth: 1024,
    location: { protocol: "file:" },
    navigator: {},
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
  });
  browserWindow.window = browserWindow;

  const context = vm.createContext({
    console,
    document,
    navigator: browserWindow.navigator,
    window: browserWindow,
  });
  new vm.Script(CONFIG_SOURCE, { filename: "js/config.js" }).runInContext(context);
  const CONFIG = browserWindow.AOK.CONFIG;
  const roles = Object.values(CONFIG.ROLE);
  const recruitButtons = roles.map((role) => {
    const button = new FakeElement(`recruit-${role}`);
    button.dataset.role = role;
    const parts = new Map([
      [".recruit-name", new FakeElement(`${role}-name`)],
      [".unit-role", new FakeElement(`${role}-role`)],
      [".recruit-cost", new FakeElement(`${role}-cost`)],
    ]);
    button.querySelector = (selector) => parts.get(selector) || null;
    return button;
  });
  const recruitDock = elements.get("recruit-dock");
  recruitDock.querySelectorAll = () => recruitButtons;
  recruitDock.querySelector = (selector) => {
    const role = selector.match(/data-role="([^"]+)"/)?.[1];
    return recruitButtons.find((button) => button.dataset.role === role) || null;
  };

  const setup = elements.get("skirmish-setup");
  setup.elements = {
    "battle-mode": { value: mode },
    "player-count": { value: "4" },
  };
  elements.get("faction-select").value = "concord";

  class FakeRenderer {
    constructor() {
      this.camera = { x: 0, y: 0, zoom: 1 };
      this.height = 640;
      this.reducedMotion = false;
      this.width = 1024;
    }

    fitWorld() {}
    focus() {}
    render() {}
    zoomAt() {}
    hitTestSite() { return null; }
    hitTestUnit() { return null; }
    unitsInScreenRect() { return []; }
    screenToWorld(x, y) { return { x, y }; }
  }

  class FakeInputController {
    setEnabled() {}
    update() {}
  }

  browserWindow.AOK.Renderer = FakeRenderer;
  browserWindow.AOK.InputController = FakeInputController;
  browserWindow.AOK.Simulation = {
    create(options) {
      const players = options.players.map((player, id) => ({
        ...player,
        id,
        credits: 100,
        population: 0,
        populationCap: 20,
        eliminated: false,
        score: rivalProgress[id]?.score || 0,
        hillTicks: rivalProgress[id]?.hillTicks || 0,
        dominationTicks: rivalProgress[id]?.dominationTicks || 0,
      }));
      for (const [id, values] of Object.entries(rivalProgress)) {
        if (players[id]) Object.assign(players[id], values);
      }
      return {
        events: [],
        players,
        settings: { mode: options.mode },
        sites: mode === CONFIG.MODE.KING_OF_THE_HILL
          ? [{ kind: CONFIG.SITE_KIND.OBJECTIVE, objective: "hill", ownerId: 2 }]
          : [],
        status: "running",
        structures: [],
        tick: 0,
        units: [],
      };
    },
    getHeadquarters() { return null; },
    getUnitType(factionId, role) { return CONFIG.FACTIONS[factionId]?.units[role] || null; },
    move() { return null; },
    attackMove() { return null; },
    recruit() { return false; },
    step() {},
  };

  new vm.Script(GAME_SOURCE, { filename: "js/game.js" }).runInContext(context);
  setup.dispatch("submit");
  return elements.get("rival-objective");
}

test("objective HUD exposes the leading live rival in every scored mode", () => {
  const conquest = createHudHarness("conquest", {
    1: { name: "Faded Rival", score: 640, eliminated: true },
    2: { name: "Leading Rival", score: 500 },
    3: { name: "Trailing Rival", score: 400 },
  });
  assert.equal(conquest.hidden, false);
  assert.equal(conquest.textContent, "Rival warning · Leading Rival · 500 / 650");
  assert.equal(conquest.getAttribute("data-alert"), "true");

  const hill = createHudHarness("king-of-the-hill", {
    1: { name: "Trailing Rival", hillTicks: 1000 },
    2: { name: "Core Rival", hillTicks: 2400 },
  });
  assert.equal(hill.hidden, false);
  assert.equal(hill.textContent, "Rival warning · Core Rival holds the Core · 80%");
  assert.equal(hill.getAttribute("data-alert"), "true");

  const domination = createHudHarness("domination", {
    1: { name: "Seal Rival", dominationTicks: 1200 },
    2: { name: "Trailing Rival", dominationTicks: 600 },
  });
  assert.equal(domination.hidden, false);
  assert.equal(domination.textContent, "Rival warning · Seal Rival has total control · 80%");
  assert.equal(domination.getAttribute("data-alert"), "true");
});

test("Total Domination keeps the rival objective readout out of the HUD", () => {
  const rival = createHudHarness("total-domination", {
    1: { name: "Rival", score: 640, hillTicks: 2900, dominationTicks: 1400 },
  });
  assert.equal(rival.hidden, true);
  assert.equal(rival.textContent, "");
  assert.equal(rival.getAttribute("data-alert"), null);
});

test("compact HUD reserves separate selection and camera-control regions", () => {
  assert.match(
    HTML_SOURCE,
    /<output\s[^>]*id="rival-objective"[^>]*aria-label="Leading rival objective progress"[^>]*hidden/,
  );
  assert.match(
    CSS_SOURCE,
    /@media \(max-width: 640px\)[\s\S]*?\.selection-panel\s*\{[\s\S]*?- 12\.85rem[\s\S]*?\}/,
  );
  assert.match(
    CSS_SOURCE,
    /@media \(max-width: 480px\), \(max-width: 640px\) and \(orientation: portrait\)[\s\S]*?bottom:\s*calc\([^;]+\+ 8\.5rem\);[\s\S]*?width:\s*auto/,
  );

  const rem = 16;
  const edgeInset = 12;
  const cameraWidth = (2.6 + 3.8 + 2.6 + 2.6 + (3 * 0.25)) * rem;
  const selectionWidth = 640 - edgeInset - edgeInset - (12.85 * rem);
  const selectionRight = edgeInset + selectionWidth;
  const cameraLeft = 640 - edgeInset - cameraWidth;
  assert.ok(selectionRight < cameraLeft, "compact landscape regions must retain a visible gap");

  const coarseCameraTop = 5.25 * rem + 3 * rem;
  const stackedSelectionBottom = 8.5 * rem;
  assert.ok(stackedSelectionBottom > coarseCameraTop, "portrait selection must stack above 48px controls");
});
