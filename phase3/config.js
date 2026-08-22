/* global window */
"use strict";

(function exposePhase3Configuration() {
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const configuration = deepFreeze({
    schemaVersion: 1,
    protocolVersion: 1,
    configurationId: "phase3-entity-movement-v1",
    tickRate: 20,
    tickDurationMs: 50,
    positionScale: 100,
    simulationTickCap: Number.MAX_SAFE_INTEGER - 16,
    maxCatchUpTicks: 4,
    openingEntityCount: 12,
    entityCap: 24,
    selectionCap: 12,
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
    snapshotByteCap: 512 * 1024,
    replayByteCap: 4 * 1024 * 1024,
    entityIdMaxLength: 64,
    mapIdMaxLength: 96,
    worldExtentFixedCap: 10000000
  });

  function representative(kind, faction, role, speedWorld, radiusWorld) {
    const speedPerTick = speedWorld * configuration.positionScale / configuration.tickRate;
    if (!Number.isInteger(speedPerTick)) {
      throw new Error(`${kind} movement must resolve to an integer fixed-step distance`);
    }
    return deepFreeze({
      kind,
      faction,
      role,
      speedWorld,
      radiusWorld,
      speedPerTick,
      radius: radiusWorld * configuration.positionScale
    });
  }

  const representatives = deepFreeze({
    "astral-guardian": representative("astral-guardian", "astral-concord", "melee", 34, 16),
    "starbow": representative("starbow", "astral-concord", "ranged", 31, 14),
    "aegis-titan": representative("aegis-titan", "astral-concord", "signature", 24, 24),
    "gravebound-reaver": representative("gravebound-reaver", "gravebound-court", "melee", 34, 16),
    "hollow-string": representative("hollow-string", "gravebound-court", "ranged", 31, 14),
    "ossuary-colossus": representative("ossuary-colossus", "gravebound-court", "signature", 24, 24)
  });

  const factionRosters = deepFreeze({
    "astral-concord": ["astral-guardian", "astral-guardian", "starbow", "starbow", "aegis-titan", "aegis-titan"],
    "gravebound-court": ["gravebound-reaver", "gravebound-reaver", "hollow-string", "hollow-string", "ossuary-colossus", "ossuary-colossus"]
  });

  // Slots are mirrored by seat facing so each opening group faces the map centre.
  const openingSlots = deepFreeze([
    { forward: 64, lateral: -40 },
    { forward: 64, lateral: 40 },
    { forward: -64, lateral: -40 },
    { forward: -64, lateral: 40 },
    { forward: 0, lateral: -52 },
    { forward: 0, lateral: 52 }
  ]);

  function compareIdentifiers(first, second) {
    return first < second ? -1 : first > second ? 1 : 0;
  }

  const api = Object.freeze({
    configuration,
    representatives,
    factionRosters,
    openingSlots,
    compareIdentifiers
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.AeonPhase3Config = api;
}());
