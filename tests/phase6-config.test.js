"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const phase5Config = require(path.join(ROOT, "phase5/config.js"));
const configApi = require(path.join(ROOT, "phase6/config.js"));

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

test("Phase 6 freezes its exact identity while retaining the Phase 5 battle identity by reference", () => {
  assert.equal(Object.isFrozen(configApi), true);
  assert.equal(configApi.battleConfig, phase5Config);
  assert.equal(configApi.battleConfig.configuration, phase5Config.configuration);
  assert.deepEqual(configApi.identity, {
    schemaVersion: 1,
    configurationId: "phase6-strategic-ai-v1",
    profile: "standard",
    map: { id: "moonfall-crossing-two-player", title: "Moonfall Crossing" },
    human: { seat: 1, faction: "astral-concord", symbol: "◇", color: "Azure" },
    computer: { seat: 2, faction: "gravebound-court", symbol: "✕", color: "Violet" }
  });
  assert.equal(configApi.battleConfig.configuration.protocolVersion, 3);
  assert.equal(configApi.battleConfig.configuration.configurationId, "phase5-combat-tactics-v1");
  assert.equal(Object.hasOwn(configApi.identity, "protocolVersion"), false);
  assert.equal(Object.hasOwn(configApi.limits, "selectionCap"), false);
  assert.equal(configApi.battleConfig.configuration.selectionCap, 12);
  assertDeepFrozen(configApi);
});

test("Phase 6 freezes every strategic timing, bound, threshold, force, and ordering enum", () => {
  assert.deepEqual(configApi.timings, {
    strategicCadenceTicks: 40,
    urgentResponseTicks: 10,
    minimumCommitmentTicks: 80,
    threatLifetimeTicks: 120,
    earliestAssaultTick: 800,
    assaultCooldownTicks: 400
  });
  assert.deepEqual(configApi.limits, {
    forceSlotCap: 3,
    tacticalRequestCap: 2,
    productionRequestCap: 1,
    rallyRequestCap: 1,
    totalRequestCap: 4,
    captureDetachmentCap: 6,
    objectiveCandidateCap: 24,
    routeProbeCap: 16,
    rememberedThreatCap: 8,
    observedEventCap: 64,
    aiStateByteCap: 32768,
    checkpointByteCap: 1310720,
    evidenceMatchTickCap: 12000,
    strengthDamageScale: 100,
    localOppositionRadiusWorld: 320,
    outpostThreatRadiusWorld: 288,
    reservePopulationMinimum: 3,
    reservePopulationDivisor: 4,
    multiFrontPopulationMinimum: 10,
    assaultPopulationMinimum: 12,
    assaultStrengthPercent: 125,
    retreatStrengthPercent: 80,
    retreatCommittedLossPercent: 40,
    roleClassificationMarginPopulation: 2
  });
  assert.deepEqual(configApi.forceNames, ["reserve", "front-a", "front-b"]);
  assert.equal(configApi.forceNames.length, configApi.limits.forceSlotCap);
  assert.deepEqual(configApi.needOrder,
    ["defend", "recover", "reinforce", "capture", "raid", "pressure", "assault"]);
  assert.deepEqual(configApi.eventKinds,
    ["damage", "defeat", "capture", "production", "structure-destruction", "match-result"]);
  assert.deepEqual(configApi.requestOrder, ["tactical", "production", "rally"]);
});

test("Phase 6 freezes objective values, role-population targets, and capture geometry", () => {
  assert.deepEqual(configApi.needValues, {
    defend: 1000,
    recover: 650,
    reinforce: 700,
    capture: { "resource-point": 500, "production-outpost": 550 },
    raid: { "resource-point": 575, "production-outpost": 625 },
    pressure: 400,
    assault: 800
  });
  assert.deepEqual(configApi.roleTargets, {
    balanced: { melee: 6, ranged: 6, signature: 6 },
    "melee-heavy": { melee: 4, ranged: 8, signature: 6 },
    "ranged-heavy": { melee: 8, ranged: 4, signature: 6 },
    assault: { melee: 5, ranged: 4, signature: 9 }
  });
  for (const target of Object.values(configApi.roleTargets)) {
    assert.deepEqual(Object.keys(target), ["melee", "ranged", "signature"]);
    assert.equal(Object.values(target).reduce((sum, value) => sum + value, 0),
      phase5Config.configuration.populationCap);
  }
  assert.deepEqual(configApi.captureFormation, {
    ringOffsetsWorld: [28, 52],
    directions: [
      "east", "southeast", "south", "southwest",
      "west", "northwest", "north", "northeast"
    ],
    diagonalNumerator: 7071,
    diagonalDenominator: 10000
  });
  assert.equal(configApi.battleConfig.captureRadiusWorld["resource-point"]
    - configApi.captureFormation.ringOffsetsWorld[0], 84);
  assert.equal(configApi.battleConfig.captureRadiusWorld["production-outpost"]
    - configApi.captureFormation.ringOffsetsWorld[1], 72);
});

test("the inherited combat table yields the frozen Phase 6 strength scores", () => {
  const strength = (role) => {
    const combat = configApi.battleConfig.combatByRole[role];
    return combat.health + Math.floor(combat.damage * configApi.limits.strengthDamageScale
      / combat.attackCycleTicks) + combat.attackRangeWorld;
  };
  assert.deepEqual([strength("melee"), strength("ranged"), strength("signature")], [392, 471, 736]);
});

test("the classic-script API uses only the preloaded local Phase 5 configuration", () => {
  const browserWindow = {};
  const context = vm.createContext({ window: browserWindow, Object, Number, Error });
  new vm.Script(read("phase5/config.js"), { filename: "phase5/config.js" }).runInContext(context);
  new vm.Script(read("phase6/config.js"), { filename: "phase6/config.js" }).runInContext(context);
  assert.equal(browserWindow.AeonPhase6Config.battleConfig, browserWindow.AeonPhase5Config);
  assert.equal(browserWindow.AeonPhase6Config.identity.computer.seat, 2);

  const source = read("phase6/config.js");
  assert.deepEqual([...source.matchAll(/require\("([^"]+)"\)/g)].map((match) => match[1]),
    ["../phase5/config.js"]);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/);
});
