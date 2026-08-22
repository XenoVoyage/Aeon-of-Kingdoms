/* global window */
"use strict";

(function exposePhase6Configuration() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const battleConfig = commonJS ? require("../phase5/config.js") : window.AeonPhase5Config;

  if (!battleConfig || !battleConfig.configuration) {
    throw new Error("Phase 6 requires the approved Phase 5 battle configuration");
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const identity = deepFreeze({
    schemaVersion: 1,
    configurationId: "phase6-strategic-ai-v1",
    profile: "standard",
    map: { id: "moonfall-crossing-two-player", title: "Moonfall Crossing" },
    human: { seat: 1, faction: "astral-concord", symbol: "◇", color: "Azure" },
    computer: { seat: 2, faction: "gravebound-court", symbol: "✕", color: "Violet" }
  });

  const timings = deepFreeze({
    strategicCadenceTicks: 40,
    urgentResponseTicks: 10,
    minimumCommitmentTicks: 80,
    threatLifetimeTicks: 120,
    earliestAssaultTick: 800,
    assaultCooldownTicks: 400
  });

  const limits = deepFreeze({
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
    aiStateByteCap: 32 * 1024,
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

  const forceNames = deepFreeze(["reserve", "front-a", "front-b"]);
  const needOrder = deepFreeze([
    "defend", "recover", "reinforce", "capture", "raid", "pressure", "assault"
  ]);
  const needValues = deepFreeze({
    defend: 1000,
    recover: 650,
    reinforce: 700,
    capture: { "resource-point": 500, "production-outpost": 550 },
    raid: { "resource-point": 575, "production-outpost": 625 },
    pressure: 400,
    assault: 800
  });
  const roleTargets = deepFreeze({
    balanced: { melee: 6, ranged: 6, signature: 6 },
    "melee-heavy": { melee: 4, ranged: 8, signature: 6 },
    "ranged-heavy": { melee: 8, ranged: 4, signature: 6 },
    assault: { melee: 5, ranged: 4, signature: 9 }
  });
  const captureFormation = deepFreeze({
    ringOffsetsWorld: [28, 52],
    directions: [
      "east", "southeast", "south", "southwest",
      "west", "northwest", "north", "northeast"
    ],
    diagonalNumerator: 7071,
    diagonalDenominator: 10000
  });
  const eventKinds = deepFreeze([
    "damage", "defeat", "capture", "production", "structure-destruction", "match-result"
  ]);
  const requestOrder = deepFreeze(["tactical", "production", "rally"]);

  const api = Object.freeze({
    battleConfig,
    identity,
    timings,
    limits,
    forceNames,
    needOrder,
    needValues,
    roleTargets,
    captureFormation,
    eventKinds,
    requestOrder,
    compareIdentifiers: battleConfig.compareIdentifiers
  });

  if (commonJS) module.exports = api;
  else window.AeonPhase6Config = api;
}());
