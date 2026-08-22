/* global window */
"use strict";

(function exposePhase5Configuration() {
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const configuration = deepFreeze({
    schemaVersion: 3,
    protocolVersion: 3,
    configurationId: "phase5-combat-tactics-v1",
    playerCount: 2,
    tickRate: 20,
    tickDurationMs: 50,
    positionScale: 100,
    simulationTickCap: Number.MAX_SAFE_INTEGER - 32,
    maxCatchUpTicks: 4,
    openingEntityCount: 12,
    entityCap: 36,
    combatEntityCap: 36,
    selectionCap: 12,
    structureCap: 5,
    pendingCommandCap: 64,
    commandLeadMinTicks: 1,
    commandLeadMaxTicks: 8,
    navigationCellWorld: 32,
    navigationNodeCap: 2048,
    routeWaypointCap: 96,
    separationPasses: 2,
    congestionTicks: 20,
    repathAttemptCap: 3,
    checksumIntervalTicks: 20,
    formationGapWorld: 8,
    materialProgressFixed: 100,
    replayCommandCap: 8192,
    replayTickCap: 1000000,
    snapshotByteCap: 1024 * 1024,
    replayByteCap: 4 * 1024 * 1024,
    entityIdMaxLength: 64,
    structureIdMaxLength: 96,
    queueIdMaxLength: 32,
    projectileIdMaxLength: 25,
    mapIdMaxLength: 96,
    worldExtentFixedCap: 10000000,
    generatedIdCap: 99999999,
    projectileIdCap: 999999999999,
    projectileCap: 96,
    reservationCapPerTarget: 24,
    presentationalEffectCap: 96,
    projectileSpeedFixed: 1600,
    projectileTravelTickMin: 1,
    projectileTravelTickMax: 14,
    defeatPresentationTicks: 12,
    startingResources: 240,
    populationCap: 18,
    openingPopulationUsed: 10,
    productionQueueCap: 5,
    resourceIncomeAmount: 12,
    resourceIncomeIntervalTicks: 20,
    captureRequiredTicks: 120,
    captureUnwindPerTick: 2,
    largestRallyRadiusWorld: 24,
    refundPercent: 100,
    focusLeashWorld: 1200,
    attackMoveLeashWorld: 240,
    defendLeashWorld: 224,
    returnThresholdWorld: 96
  });

  const combatByRole = deepFreeze({
    melee: {
      health: 240, damage: 28, attackCycleTicks: 20, contactOffsetTicks: 5,
      preferredGapWorld: 12, attackRangeWorld: 12, awarenessWorld: 180,
      idleLeashWorld: 240, reservationGapsWorld: [8, 64, 120]
    },
    ranged: {
      health: 160, damage: 22, attackCycleTicks: 24, contactOffsetTicks: 5,
      preferredGapWorld: 160, attackRangeWorld: 220, awarenessWorld: 260,
      idleLeashWorld: 300, reservationGapsWorld: [160, 104, 216]
    },
    signature: {
      health: 520, damage: 64, attackCycleTicks: 32, contactOffsetTicks: 5,
      preferredGapWorld: 16, attackRangeWorld: 16, awarenessWorld: 200,
      idleLeashWorld: 260, reservationGapsWorld: [12, 68, 124]
    }
  });

  function representative(kind, faction, role, speedWorld, radiusWorld, cost, productionTicks, population) {
    const speedPerTick = speedWorld * configuration.positionScale / configuration.tickRate;
    if (!Number.isInteger(speedPerTick)) throw new Error(`${kind} movement must resolve to an integer fixed-step distance`);
    const combat = combatByRole[role];
    return deepFreeze({
      kind, faction, role, speedWorld, radiusWorld, speedPerTick,
      radius: radiusWorld * configuration.positionScale,
      cost, productionTicks, population,
      health: combat.health,
      damage: combat.damage,
      attackCycleTicks: combat.attackCycleTicks,
      contactOffsetTicks: combat.contactOffsetTicks,
      preferredGapWorld: combat.preferredGapWorld,
      attackRangeWorld: combat.attackRangeWorld,
      awarenessWorld: combat.awarenessWorld,
      idleLeashWorld: combat.idleLeashWorld,
      reservationGapsWorld: [...combat.reservationGapsWorld]
    });
  }

  const representatives = deepFreeze({
    "astral-guardian": representative("astral-guardian", "astral-concord", "melee", 34, 16, 60, 80, 1),
    "starbow": representative("starbow", "astral-concord", "ranged", 31, 14, 80, 100, 1),
    "aegis-titan": representative("aegis-titan", "astral-concord", "signature", 24, 24, 180, 180, 3),
    "gravebound-reaver": representative("gravebound-reaver", "gravebound-court", "melee", 34, 16, 60, 80, 1),
    "hollow-string": representative("hollow-string", "gravebound-court", "ranged", 31, 14, 80, 100, 1),
    "ossuary-colossus": representative("ossuary-colossus", "gravebound-court", "signature", 24, 24, 180, 180, 3)
  });

  const factionRosters = deepFreeze({
    "astral-concord": ["astral-guardian", "astral-guardian", "starbow", "starbow", "aegis-titan", "aegis-titan"],
    "gravebound-court": ["gravebound-reaver", "gravebound-reaver", "hollow-string", "hollow-string", "ossuary-colossus", "ossuary-colossus"]
  });
  const productionRosters = deepFreeze({
    "astral-concord": ["astral-guardian", "starbow", "aegis-titan"],
    "gravebound-court": ["gravebound-reaver", "hollow-string", "ossuary-colossus"]
  });
  const openingSlots = deepFreeze([
    { forward: 64, lateral: -40 }, { forward: 64, lateral: 40 },
    { forward: -64, lateral: -40 }, { forward: -64, lateral: 40 },
    { forward: 0, lateral: -52 }, { forward: 0, lateral: 52 }
  ]);
  const structureCategories = deepFreeze(["headquarters", "resource-point", "production-outpost"]);
  const captureRadiusWorld = deepFreeze({ "resource-point": 112, "production-outpost": 124 });
  const structureHealth = deepFreeze({
    "astral-headquarters-anchor": 1800,
    "gravebound-headquarters-anchor": 1800,
    "central-resource-point-anchor": 800,
    "west-production-outpost-anchor": 1200,
    "east-production-outpost-anchor": 1200
  });
  function compareIdentifiers(first, second) { return first < second ? -1 : first > second ? 1 : 0; }

  const api = Object.freeze({
    configuration, combatByRole, representatives, factionRosters, productionRosters,
    openingSlots, structureCategories, captureRadiusWorld, structureHealth, compareIdentifiers
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.AeonPhase5Config = api;
}());
