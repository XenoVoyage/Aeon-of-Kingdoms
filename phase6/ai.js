/* global window */
"use strict";

(function exposePhase6AI() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase6Config;
  const navigationDefault = commonJS ? require("../phase5/navigation.js") : window.AeonPhase5Navigation;
  const mapDefault = commonJS ? require("../phase5/map.js") : window.AeonPhase5Map;

  if (!configApi || !navigationDefault || !mapDefault) {
    throw new Error("Phase 6 AI requires the approved configuration, map, and navigator");
  }

  const {
    battleConfig, identity, timings, limits, forceNames, needOrder, needValues,
    roleTargets, captureFormation, eventKinds, compareIdentifiers
  } = configApi;
  const {
    configuration, representatives, productionRosters, captureRadiusWorld
  } = battleConfig;

  const STATE_KEYS = Object.freeze([
    "configurationId", "currentNeed", "forces", "lastResult", "nextAssaultEligibleTick",
    "nextDecisionTick", "planNumber", "rosterSignature", "schemaVersion", "seat", "threats",
    "urgentEligibleTick"
  ]);
  const FORCE_KEYS = Object.freeze([
    "commitmentUntilTick", "committedStrength", "entityIds", "name", "need",
    "objectiveId", "objectiveRoot", "stage"
  ]);
  const THREAT_KEYS = Object.freeze([
    "kind", "ownerSeat", "sourceId", "status", "structureId", "targetId", "tick"
  ]);
  const RESULT_KEYS = Object.freeze(["code", "objectiveId", "tick"]);
  const OBSERVATION_KEYS = Object.freeze([
    "battleConfigurationId", "computer", "entities", "events", "map", "match",
    "protocolVersion", "schemaVersion", "structures", "tick"
  ]);
  const OBSERVATION_MAP_KEYS = Object.freeze(["height", "id", "structures", "title", "width"]);
  const MAP_STRUCTURE_KEYS = Object.freeze([
    "captureRadius", "category", "id", "radius", "spawnSlots", "x", "y"
  ]);
  const COMPUTER_KEYS = Object.freeze([
    "faction", "populationCap", "populationReserved", "populationUsed", "resources", "seat"
  ]);
  const ENTITY_KEYS = Object.freeze([
    "health", "id", "kind", "maxHealth", "order", "orderAnchorId", "orderDestination",
    "ownerSeat", "radius", "role", "targetId", "x", "y"
  ]);
  const STRUCTURE_KEYS = Object.freeze([
    "capture", "category", "damageState", "destroyed", "health", "id", "maxHealth",
    "ownerSeat", "queue", "radius", "rally", "x", "y"
  ]);
  const EVENT_KEYS = THREAT_KEYS;
  const MATCH_KEYS = Object.freeze(["completedTick", "status", "winnerSeat"]);
  const POINT_KEYS = Object.freeze(["x", "y"]);
  const CAPTURE_KEYS = Object.freeze(["challengerSeat", "progressTicks"]);
  const QUEUE_KEYS = Object.freeze(["blockedComplete", "entityKind", "id", "progressTicks"]);
  const PUBLIC_EVENT_TYPES = new Set(eventKinds);
  const FORCE_STAGE = new Set([null, "approach", "capture"]);
  const NEED_SET = new Set(needOrder);
  const PUBLIC_ORDERS = new Set(["IDLE", "MOVE", "ATTACK_ENTITY", "ATTACK_MOVE", "STOP", "DEFEND"]);
  const MAP_SPAWN_SLOT_CAP = 6;

  function plainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
      && Object.getPrototypeOf(value) === Object.prototype;
  }

  function denseArray(value) {
    if (!Array.isArray(value) || Object.keys(value).length !== value.length) return false;
    for (let index = 0; index < value.length; index += 1) if (!Object.hasOwn(value, index)) return false;
    return true;
  }

  function exactKeys(value, expected) {
    if (!plainObject(value)) return false;
    const keys = Object.keys(value).sort(compareIdentifiers);
    const sorted = [...expected].sort(compareIdentifiers);
    return keys.length === sorted.length && keys.every((key, index) => key === sorted[index]);
  }

  function safeInteger(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
    return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  }

  function identifier(value, maximum = configuration.structureIdMaxLength) {
    return typeof value === "string" && value.length >= 1 && value.length <= maximum
      && /^[A-Za-z0-9-]+$/.test(value);
  }

  function nullableIdentifier(value, maximum = configuration.structureIdMaxLength) {
    return value === null || identifier(value, maximum);
  }

  function point(value) {
    return exactKeys(value, POINT_KEYS)
      && safeInteger(value.x, 0, configuration.worldExtentFixedCap)
      && safeInteger(value.y, 0, configuration.worldExtentFixedCap);
  }

  function clonePoint(value) { return value === null ? null : { x: value.x, y: value.y }; }

  function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function encodedSize(value, label, cap) {
    let encoded;
    try { encoded = JSON.stringify(value); } catch { throw new TypeError(`${label} must be acyclic JSON data`); }
    if (encoded === undefined || encoded.length > cap) throw new RangeError(`${label} exceeds its encoded bound`);
    return encoded.length;
  }

  function damageState(health, maximum) {
    if (health <= 0) return "destroyed";
    return health * 2 <= maximum ? "damaged" : "intact";
  }

  function eventIdentifier(value) { return value === null ? "" : value; }

  function compareThreat(first, second) {
    return second.tick - first.tick
      || compareIdentifiers(first.kind, second.kind)
      || compareIdentifiers(eventIdentifier(first.sourceId), eventIdentifier(second.sourceId))
      || compareIdentifiers(eventIdentifier(first.targetId), eventIdentifier(second.targetId))
      || compareIdentifiers(eventIdentifier(first.structureId), eventIdentifier(second.structureId));
  }

  function cloneThreat(value) {
    return {
      tick: value.tick, kind: value.kind, sourceId: value.sourceId,
      targetId: value.targetId, structureId: value.structureId, status: value.status,
      ownerSeat: value.ownerSeat
    };
  }

  function emptyForce(name) {
    return {
      name, entityIds: [], need: null, objectiveId: null, objectiveRoot: null,
      commitmentUntilTick: 0, committedStrength: 0, stage: null
    };
  }

  function createInitialState() {
    return deepFreeze({
      schemaVersion: identity.schemaVersion,
      configurationId: identity.configurationId,
      seat: identity.computer.seat,
      nextDecisionTick: 0,
      urgentEligibleTick: 0,
      planNumber: 0,
      currentNeed: null,
      nextAssaultEligibleTick: timings.earliestAssaultTick,
      rosterSignature: "",
      forces: forceNames.map(emptyForce),
      threats: [],
      lastResult: null
    });
  }

  function validateThreat(value, maximumTick) {
    if (!exactKeys(value, THREAT_KEYS)
      || !safeInteger(value.tick, 0, maximumTick)
      || !PUBLIC_EVENT_TYPES.has(value.kind)
      || !nullableIdentifier(value.sourceId)
      || !nullableIdentifier(value.targetId)
      || !nullableIdentifier(value.structureId)
      || typeof value.status !== "string" || value.status.length > 32
      || (value.ownerSeat !== null && value.ownerSeat !== 1 && value.ownerSeat !== 2)) {
      throw new TypeError("AI threat memory is invalid");
    }
  }

  function validateState(state, observation = null) {
    if (!exactKeys(state, STATE_KEYS)
      || state.schemaVersion !== identity.schemaVersion
      || state.configurationId !== identity.configurationId
      || state.seat !== identity.computer.seat
      || !safeInteger(state.nextDecisionTick, 0, configuration.simulationTickCap)
      || !safeInteger(state.urgentEligibleTick, 0, configuration.simulationTickCap)
      || !safeInteger(state.planNumber, 0)
      || (state.currentNeed !== null && !NEED_SET.has(state.currentNeed))
      || !safeInteger(state.nextAssaultEligibleTick, timings.earliestAssaultTick, configuration.simulationTickCap)
      || typeof state.rosterSignature !== "string"
      || state.rosterSignature.length > configuration.entityCap * (configuration.entityIdMaxLength + 1)
      || !denseArray(state.forces) || state.forces.length !== limits.forceSlotCap
      || !denseArray(state.threats) || state.threats.length > limits.rememberedThreatCap) {
      throw new TypeError("AI state identity or bounds are invalid");
    }
    const seen = new Set();
    state.forces.forEach((force, index) => {
      if (!exactKeys(force, FORCE_KEYS) || force.name !== forceNames[index]
        || !denseArray(force.entityIds) || force.entityIds.length > configuration.combatEntityCap
        || (force.need !== null && !NEED_SET.has(force.need))
        || !nullableIdentifier(force.objectiveId)
        || (force.objectiveRoot !== null && !point(force.objectiveRoot))
        || !safeInteger(force.commitmentUntilTick, 0, configuration.simulationTickCap)
        || !safeInteger(force.committedStrength, 0)
        || !FORCE_STAGE.has(force.stage)
        || ((force.need === null) !== (force.objectiveId === null))
        || ((force.objectiveId === null) !== (force.objectiveRoot === null))) {
        throw new TypeError("AI task force is invalid");
      }
      let previous = null;
      for (const id of force.entityIds) {
        if (!identifier(id, configuration.entityIdMaxLength)
          || (previous !== null && compareIdentifiers(previous, id) >= 0)
          || seen.has(id)) throw new TypeError("AI task-force membership is invalid");
        previous = id;
        seen.add(id);
      }
    });
    let previousThreat = null;
    for (const threat of state.threats) {
      validateThreat(threat, configuration.simulationTickCap);
      if (previousThreat && compareThreat(previousThreat, threat) > 0) {
        throw new TypeError("AI threat memory order is invalid");
      }
      previousThreat = threat;
    }
    if (state.lastResult !== null && (!exactKeys(state.lastResult, RESULT_KEYS)
      || !safeInteger(state.lastResult.tick, 0, configuration.simulationTickCap)
      || typeof state.lastResult.code !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(state.lastResult.code)
      || !nullableIdentifier(state.lastResult.objectiveId))) {
      throw new TypeError("AI last result is invalid");
    }
    if (observation !== null) {
      validateObservation(observation);
      const living = new Set(observation.entities
        .filter((entity) => entity.ownerSeat === identity.computer.seat)
        .map((entity) => entity.id));
      for (const id of seen) if (!living.has(id)) throw new TypeError("AI force references a non-living computer entity");
    }
    encodedSize(state, "AI state", limits.aiStateByteCap);
    return cloneJson(state);
  }

  function recordResult(state, result, observation = null) {
    const next = validateState(state, observation);
    if (!exactKeys(result, RESULT_KEYS)
      || !safeInteger(result.tick, 0, configuration.simulationTickCap)
      || (observation !== null && result.tick !== observation.tick)
      || typeof result.code !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(result.code)
      || !nullableIdentifier(result.objectiveId)) {
      throw new TypeError("AI bounded result is invalid");
    }
    next.lastResult = {
      tick: result.tick,
      code: result.code,
      objectiveId: result.objectiveId
    };
    encodedSize(next, "AI state", limits.aiStateByteCap);
    return deepFreeze(next);
  }

  function mapGeometry(map) {
    if (!map || String(map.id) !== identity.map.id || !map.world
      || !safeInteger(map.world.width, 1) || !safeInteger(map.world.height, 1)
      || !denseArray(map.phase5?.structures)
      || map.phase5.structures.length !== configuration.structureCap) {
      throw new TypeError("AI map geometry is invalid");
    }
    for (const structure of map.phase5.structures) {
      if (!plainObject(structure) || !denseArray(structure.spawnSlots)
        || structure.spawnSlots.length > MAP_SPAWN_SLOT_CAP) {
        throw new RangeError("AI map spawn geometry exceeds its bound");
      }
    }
    return {
      id: String(map.id), title: String(map.title), width: map.world.width, height: map.world.height,
      structures: [...map.phase5.structures].sort((first, second) => compareIdentifiers(first.id, second.id))
        .map((structure) => ({
          id: structure.id, category: structure.category,
          x: Math.round(structure.x * configuration.positionScale),
          y: Math.round(structure.y * configuration.positionScale),
          radius: Math.round(structure.radius * configuration.positionScale),
          captureRadius: structure.captureRadius === null ? null
            : Math.round(structure.captureRadius * configuration.positionScale),
          spawnSlots: structure.spawnSlots.map((slot) => ({
            x: Math.round(slot.x * configuration.positionScale),
            y: Math.round(slot.y * configuration.positionScale)
          }))
        }))
    };
  }

  function filteredEvent(event, tick, structures) {
    if (!plainObject(event) || typeof event.type !== "string") return null;
    let kind = null;
    if (event.type === "combat" && event.status === "damage") kind = "damage";
    else if (event.type === "defeat") kind = "defeat";
    else if (event.type === "structure" && event.status === "captured") kind = "capture";
    else if (event.type === "structure" && event.status === "destroyed") kind = "structure-destruction";
    else if (event.type === "production") kind = "production";
    else if (event.type === "match" && event.status === "completed") kind = "match-result";
    if (kind === null) return null;

    const structureId = typeof event.structureId === "string" ? event.structureId : null;
    if (kind === "production") {
      const structure = structures.find((value) => value.id === structureId);
      if (!structure || structure.ownerSeat !== identity.computer.seat) return null;
    }
    const sourceId = kind === "damage" ? null
      : typeof event.attackerId === "string" ? event.attackerId
        : typeof event.entityId === "string" ? event.entityId : null;
    const targetId = typeof event.targetId === "string" ? event.targetId
      : kind === "defeat" && typeof event.entityId === "string" ? event.entityId
        : structureId;
    return {
      tick: safeInteger(event.tick, 0, tick) ? event.tick : tick,
      kind,
      sourceId,
      targetId,
      structureId,
      status: typeof event.status === "string" ? event.status.slice(0, 32) : "",
      ownerSeat: event.ownerSeat === 1 || event.ownerSeat === 2 ? event.ownerSeat
        : event.winnerSeat === 1 || event.winnerSeat === 2 ? event.winnerSeat : null
    };
  }

  function filterEvents(rawEvents, tick, structures) {
    if (!denseArray(rawEvents) || rawEvents.length > limits.observedEventCap
      || !safeInteger(tick, 0, configuration.simulationTickCap)
      || !denseArray(structures) || structures.length > configuration.structureCap) {
      throw new RangeError("public event filter input exceeds its bound");
    }
    return deepFreeze(rawEvents.map((event) => filteredEvent(event, tick, structures))
      .filter(Boolean).sort(compareThreat).slice(0, limits.observedEventCap));
  }

  function buildObservation(battleSnapshot, previousEvents = [], options = {}) {
    if (!plainObject(battleSnapshot) || !plainObject(options)
      || Object.keys(options).some((key) => key !== "map")) {
      throw new TypeError("observation input is invalid");
    }
    if (!denseArray(previousEvents) || previousEvents.length > limits.observedEventCap) {
      throw new RangeError("observed events exceed their bound");
    }
    const map = options.map || mapDefault;
    if (battleSnapshot.schemaVersion !== configuration.schemaVersion
      || battleSnapshot.protocolVersion !== configuration.protocolVersion
      || battleSnapshot.configurationId !== configuration.configurationId
      || battleSnapshot.mapId !== identity.map.id
      || !safeInteger(battleSnapshot.tick, 0, configuration.simulationTickCap)
      || !denseArray(battleSnapshot.players) || battleSnapshot.players.length !== 2
      || !denseArray(battleSnapshot.entities) || battleSnapshot.entities.length > configuration.combatEntityCap
      || !denseArray(battleSnapshot.structures) || battleSnapshot.structures.length !== configuration.structureCap
      || !plainObject(battleSnapshot.match)) {
      throw new TypeError("battle snapshot cannot form an AI observation");
    }
    const computer = battleSnapshot.players.find((value) => value.seat === identity.computer.seat);
    if (!computer || computer.faction !== identity.computer.faction
      || !safeInteger(computer.resources) || !safeInteger(computer.populationUsed, 0, configuration.populationCap)
      || !safeInteger(computer.populationReserved, 0, configuration.populationCap)
      || computer.populationCap !== configuration.populationCap) {
      throw new TypeError("computer public economy is invalid");
    }
    for (const structure of battleSnapshot.structures) {
      if (structure?.ownerSeat === identity.computer.seat
        && (!denseArray(structure.queue) || structure.queue.length > configuration.productionQueueCap)) {
        throw new RangeError("computer production observation exceeds its queue bound");
      }
    }
    const entities = battleSnapshot.entities.filter((entity) => entity.health > 0).map((entity) => {
      const definition = representatives[entity.kind];
      if (!definition || (entity.ownerSeat !== 1 && entity.ownerSeat !== 2)
        || !identifier(entity.id, configuration.entityIdMaxLength)
        || !safeInteger(entity.x, 0, configuration.worldExtentFixedCap)
        || !safeInteger(entity.y, 0, configuration.worldExtentFixedCap)
        || entity.radius !== definition.radius
        || !safeInteger(entity.health, 1, definition.health)) {
        throw new TypeError("public combat entity is invalid");
      }
      const own = entity.ownerSeat === identity.computer.seat;
      return {
        id: entity.id, ownerSeat: entity.ownerSeat, kind: entity.kind, role: definition.role,
        x: entity.x, y: entity.y, radius: entity.radius, health: entity.health,
        maxHealth: definition.health,
        order: own && typeof entity.order === "string" ? entity.order : null,
        targetId: own && typeof entity.targetId === "string" ? entity.targetId : null,
        orderAnchorId: own && entity.defendAnchor?.kind === "entity"
          && typeof entity.defendAnchor.entityId === "string" ? entity.defendAnchor.entityId : null,
        orderDestination: own && entity.order === "ATTACK_MOVE" && entity.savedDestination
          ? clonePoint(entity.savedDestination)
          : own && (entity.order === "MOVE" || entity.order === "ATTACK_MOVE")
            && entity.formationDestination ? clonePoint(entity.formationDestination) : null
      };
    }).sort((first, second) => compareIdentifiers(first.id, second.id));
    const seenEntities = new Set();
    for (const entity of entities) {
      if (seenEntities.has(entity.id)) throw new TypeError("public combat identifiers collide");
      seenEntities.add(entity.id);
    }
    const structures = battleSnapshot.structures.map((structure) => {
      if (!identifier(structure.id) || !battleConfig.structureCategories.includes(structure.category)
        || (structure.ownerSeat !== null && structure.ownerSeat !== 1 && structure.ownerSeat !== 2)
        || !safeInteger(structure.x, 0, configuration.worldExtentFixedCap)
        || !safeInteger(structure.y, 0, configuration.worldExtentFixedCap)
        || !safeInteger(structure.radius)
        || !safeInteger(structure.maxHealth, 1)
        || !safeInteger(structure.health, 0, structure.maxHealth)
        || typeof structure.destroyed !== "boolean"
        || !plainObject(structure.capture)) throw new TypeError("public structure is invalid");
      const own = structure.ownerSeat === identity.computer.seat;
      const queue = own ? structure.queue.map((item) => ({
        id: item.id, entityKind: item.entityKind,
        progressTicks: item.progressTicks, blockedComplete: item.blockedComplete
      })) : null;
      return {
        id: structure.id, category: structure.category, x: structure.x, y: structure.y,
        radius: structure.radius, maxHealth: structure.maxHealth, health: structure.health,
        ownerSeat: structure.ownerSeat, destroyed: structure.destroyed,
        damageState: damageState(structure.health, structure.maxHealth),
        capture: {
          challengerSeat: structure.capture.challengerSeat,
          progressTicks: structure.capture.progressTicks
        },
        queue,
        rally: own && structure.rally ? clonePoint(structure.rally) : null
      };
    }).sort((first, second) => compareIdentifiers(first.id, second.id));
    const events = filterEvents(previousEvents, battleSnapshot.tick, structures);
    const observation = {
      schemaVersion: identity.schemaVersion,
      battleConfigurationId: configuration.configurationId,
      protocolVersion: configuration.protocolVersion,
      tick: battleSnapshot.tick,
      map: mapGeometry(map),
      match: {
        status: battleSnapshot.match.status,
        winnerSeat: battleSnapshot.match.winnerSeat,
        completedTick: battleSnapshot.match.completedTick
      },
      computer: {
        seat: computer.seat, faction: computer.faction, resources: computer.resources,
        populationUsed: computer.populationUsed,
        populationReserved: computer.populationReserved,
        populationCap: computer.populationCap
      },
      entities,
      structures,
      events
    };
    validateObservation(observation);
    return deepFreeze(observation);
  }

  function validateObservation(observation) {
    if (!exactKeys(observation, OBSERVATION_KEYS)
      || observation.schemaVersion !== identity.schemaVersion
      || observation.battleConfigurationId !== configuration.configurationId
      || observation.protocolVersion !== configuration.protocolVersion
      || !safeInteger(observation.tick, 0, configuration.simulationTickCap)
      || !exactKeys(observation.map, OBSERVATION_MAP_KEYS)
      || observation.map.id !== identity.map.id || observation.map.title !== identity.map.title
      || !safeInteger(observation.map.width, 1) || !safeInteger(observation.map.height, 1)
      || !denseArray(observation.map.structures)
      || observation.map.structures.length !== configuration.structureCap
      || !exactKeys(observation.computer, COMPUTER_KEYS)
      || observation.computer.seat !== identity.computer.seat
      || observation.computer.faction !== identity.computer.faction
      || !safeInteger(observation.computer.resources)
      || !safeInteger(observation.computer.populationUsed, 0, configuration.populationCap)
      || !safeInteger(observation.computer.populationReserved, 0, configuration.populationCap)
      || observation.computer.populationCap !== configuration.populationCap
      || observation.computer.populationUsed + observation.computer.populationReserved
        > observation.computer.populationCap
      || !exactKeys(observation.match, MATCH_KEYS)
      || (observation.match.status !== "active" && observation.match.status !== "complete")
      || (observation.match.winnerSeat !== null && observation.match.winnerSeat !== 1 && observation.match.winnerSeat !== 2)
      || (observation.match.completedTick !== null
        && !safeInteger(observation.match.completedTick, 1, observation.tick))
      || !denseArray(observation.entities) || observation.entities.length > configuration.combatEntityCap
      || !denseArray(observation.structures) || observation.structures.length !== configuration.structureCap
      || !denseArray(observation.events) || observation.events.length > limits.observedEventCap) {
      throw new TypeError("AI observation identity or bounds are invalid");
    }
    if ((observation.match.status === "active") !== (observation.match.completedTick === null)) {
      throw new TypeError("AI public match outcome is inconsistent");
    }
    let previousGeometryId = null;
    for (const geometry of observation.map.structures) {
      if (!exactKeys(geometry, MAP_STRUCTURE_KEYS) || !identifier(geometry.id)
        || (previousGeometryId !== null && compareIdentifiers(previousGeometryId, geometry.id) >= 0)
        || !battleConfig.structureCategories.includes(geometry.category)
        || !safeInteger(geometry.x, 0, configuration.worldExtentFixedCap)
        || !safeInteger(geometry.y, 0, configuration.worldExtentFixedCap)
        || !safeInteger(geometry.radius)
        || (geometry.captureRadius !== null && !safeInteger(geometry.captureRadius))
        || !denseArray(geometry.spawnSlots)
        || geometry.spawnSlots.some((slot) => !point(slot))) throw new TypeError("AI public map geometry is invalid");
      previousGeometryId = geometry.id;
    }
    let previousId = null;
    for (const entity of observation.entities) {
      const definition = representatives[entity.kind];
      if (!exactKeys(entity, ENTITY_KEYS) || !identifier(entity.id, configuration.entityIdMaxLength)
        || (previousId !== null && compareIdentifiers(previousId, entity.id) >= 0)
        || (entity.ownerSeat !== 1 && entity.ownerSeat !== 2) || !definition
        || entity.role !== definition.role || entity.radius !== definition.radius
        || !safeInteger(entity.x, 0, configuration.worldExtentFixedCap)
        || !safeInteger(entity.y, 0, configuration.worldExtentFixedCap)
        || !safeInteger(entity.health, 1, definition.health) || entity.maxHealth !== definition.health
        || (entity.ownerSeat === identity.computer.seat
          ? !PUBLIC_ORDERS.has(entity.order) || !nullableIdentifier(entity.targetId)
            || !nullableIdentifier(entity.orderAnchorId)
            || (entity.orderDestination !== null && !point(entity.orderDestination))
          : entity.order !== null || entity.targetId !== null
            || entity.orderAnchorId !== null || entity.orderDestination !== null)) {
        throw new TypeError("AI public entity is invalid");
      }
      previousId = entity.id;
      if ((entity.orderAnchorId !== null && entity.order !== "DEFEND")
        || (entity.orderDestination !== null && entity.order !== "MOVE" && entity.order !== "ATTACK_MOVE")) {
        throw new TypeError("AI public order detail is inconsistent");
      }
    }
    previousId = null;
    for (const structure of observation.structures) {
      if (!exactKeys(structure, STRUCTURE_KEYS) || !identifier(structure.id)
        || (previousId !== null && compareIdentifiers(previousId, structure.id) >= 0)
        || !battleConfig.structureCategories.includes(structure.category)
        || (structure.ownerSeat !== null && structure.ownerSeat !== 1 && structure.ownerSeat !== 2)
        || !safeInteger(structure.x, 0, configuration.worldExtentFixedCap)
        || !safeInteger(structure.y, 0, configuration.worldExtentFixedCap)
        || !safeInteger(structure.radius) || !safeInteger(structure.maxHealth, 1)
        || !safeInteger(structure.health, 0, structure.maxHealth)
        || structure.damageState !== damageState(structure.health, structure.maxHealth)
        || structure.destroyed !== (structure.health === 0)
        || !exactKeys(structure.capture, CAPTURE_KEYS)
        || (structure.capture.challengerSeat !== null
          && structure.capture.challengerSeat !== 1 && structure.capture.challengerSeat !== 2)
        || !safeInteger(structure.capture.progressTicks, 0, configuration.captureRequiredTicks - 1)
        || (structure.ownerSeat === identity.computer.seat
          ? !denseArray(structure.queue) : structure.queue !== null)
        || (structure.queue !== null && structure.queue.length > configuration.productionQueueCap)
        || (structure.ownerSeat !== identity.computer.seat && structure.rally !== null)
        || (structure.rally !== null && !point(structure.rally))) throw new TypeError("AI public structure is invalid");
      if (structure.queue) for (const item of structure.queue) {
        if (!exactKeys(item, QUEUE_KEYS) || !identifier(item.id, configuration.queueIdMaxLength)
          || !representatives[item.entityKind]
          || !safeInteger(item.progressTicks, 0, representatives[item.entityKind].productionTicks)
          || typeof item.blockedComplete !== "boolean") throw new TypeError("AI public production queue is invalid");
      }
      previousId = structure.id;
    }
    if (observation.map.structures.some((geometry, index) => {
      const structure = observation.structures[index];
      return geometry.id !== structure.id || geometry.category !== structure.category
        || geometry.x !== structure.x || geometry.y !== structure.y || geometry.radius !== structure.radius;
    })) throw new TypeError("AI public map and structure geometry disagree");
    let previousEvent = null;
    for (const event of observation.events) {
      if (!exactKeys(event, EVENT_KEYS)) throw new TypeError("AI public event is invalid");
      validateThreat(event, observation.tick);
      if (previousEvent && compareThreat(previousEvent, event) > 0) throw new TypeError("AI public event order is invalid");
      previousEvent = event;
    }
    return cloneJson(observation);
  }

  function foldEvents(state, events, tick, observation = null) {
    const next = validateState(state);
    if (!denseArray(events) || events.length > limits.observedEventCap
      || !safeInteger(tick, 0, configuration.simulationTickCap)) throw new TypeError("AI event fold is invalid");
    const values = next.threats.filter((threat) => threat.tick + timings.threatLifetimeTicks > tick);
    for (const event of events) {
      validateThreat(event, tick);
      if (event.tick + timings.threatLifetimeTicks <= tick) continue;
      values.push(cloneThreat(event));
    }
    values.sort(compareThreat);
    const unique = [];
    const keys = new Set();
    for (const value of values) {
      const key = JSON.stringify(value);
      if (keys.has(key)) continue;
      keys.add(key);
      unique.push(value);
      if (unique.length === limits.rememberedThreatCap) break;
    }
    next.threats = unique;
    const normalized = observation === null ? next
      : repairRosterState(validateObservation(observation), next);
    encodedSize(normalized, "AI state", limits.aiStateByteCap);
    return deepFreeze(normalized);
  }

  function entityStrength(entity) {
    if (!plainObject(entity) || !representatives[entity.kind]
      || !safeInteger(entity.health, 1, representatives[entity.kind].health)) {
      throw new TypeError("strength requires one living public combat entity");
    }
    const definition = representatives[entity.kind];
    return entity.health
      + Math.floor(definition.damage * limits.strengthDamageScale / definition.attackCycleTicks)
      + definition.attackRangeWorld;
  }

  function groupStrength(entities) {
    if (!denseArray(entities) || entities.length > configuration.combatEntityCap) {
      throw new RangeError("strength group exceeds its bound");
    }
    let total = 0;
    for (const entity of entities) {
      const value = entityStrength(entity);
      if (!Number.isSafeInteger(total + value)) throw new RangeError("strength sum exceeds safe integer range");
      total += value;
    }
    return total;
  }

  function distance(first, second) { return Math.floor(Math.hypot(second.x - first.x, second.y - first.y)); }

  function withinWorld(first, second, radiusWorld) {
    const radius = radiusWorld * configuration.positionScale;
    const deltaX = first.x - second.x;
    const deltaY = first.y - second.y;
    return deltaX * deltaX + deltaY * deltaY <= radius * radius;
  }

  function livingFor(observation, seat) {
    return observation.entities.filter((entity) => entity.ownerSeat === seat);
  }

  function byId(observation) {
    return new Map([...observation.entities, ...observation.structures].map((value) => [value.id, value]));
  }

  function headquarters(observation, seat) {
    return observation.structures.find((structure) => structure.category === "headquarters"
      && structure.ownerSeat === seat && !structure.destroyed) || null;
  }

  function localOpposition(observation, root, seat, radiusWorld = limits.localOppositionRadiusWorld) {
    return observation.entities.filter((entity) => entity.ownerSeat !== seat && withinWorld(entity, root, radiusWorld));
  }

  function headquartersEmergency(observation, state) {
    const hq = headquarters(observation, identity.computer.seat);
    if (!hq) return false;
    if (localOpposition(observation, hq, identity.computer.seat).length > 0) return true;
    return state.threats.some((threat) => threat.kind === "damage"
      && threat.targetId === hq.id && threat.tick + timings.threatLifetimeTicks > observation.tick);
  }

  function threatenedOutposts(observation) {
    return observation.structures.filter((structure) => !structure.destroyed
      && structure.category === "production-outpost"
      && structure.ownerSeat === identity.computer.seat
      && (localOpposition(observation, structure, identity.computer.seat,
        limits.outpostThreatRadiusWorld).length > 0
        || (structure.capture.challengerSeat !== null
          && structure.capture.challengerSeat !== identity.computer.seat)))
      .sort((first, second) => compareIdentifiers(first.id, second.id));
  }

  function rosterSignature(entities) {
    return entities.map((entity) => entity.id).sort(compareIdentifiers).join("|");
  }

  function forceEntities(force, ownById) {
    return force.entityIds.map((id) => ownById.get(id)).filter(Boolean);
  }

  function assignForces(observation, state) {
    const own = livingFor(observation, identity.computer.seat).sort((first, second) => compareIdentifiers(first.id, second.id));
    const signature = rosterSignature(own);
    if (signature === state.rosterSignature) return state.forces.map(cloneJson);
    const hq = headquarters(observation, identity.computer.seat);
    const reserveTarget = Math.min(observation.computer.populationUsed,
      Math.max(limits.reservePopulationMinimum,
        Math.ceil(observation.computer.populationUsed / limits.reservePopulationDivisor)));
    const sortedByHome = [...own].sort((first, second) => distance(first, hq) - distance(second, hq)
      || compareIdentifiers(first.id, second.id));
    const reserve = [];
    let reservePopulation = 0;
    while (sortedByHome.length && reservePopulation < reserveTarget) {
      const next = sortedByHome.shift();
      reserve.push(next);
      reservePopulation += representatives[next.kind].population;
    }
    const result = forceNames.map(emptyForce);
    result[0].entityIds = reserve.map((entity) => entity.id).sort(compareIdentifiers);
    const fieldStrengths = [0, 0];
    sortedByHome.sort((first, second) => entityStrength(second) - entityStrength(first)
      || compareIdentifiers(first.id, second.id));
    for (const entity of sortedByHome) {
      const index = fieldStrengths[0] <= fieldStrengths[1] ? 0 : 1;
      result[index + 1].entityIds.push(entity.id);
      fieldStrengths[index] += entityStrength(entity);
    }
    for (const force of result) {
      force.entityIds.sort(compareIdentifiers);
      force.commitmentUntilTick = Math.min(configuration.simulationTickCap,
        observation.tick + timings.minimumCommitmentTicks);
      force.committedStrength = groupStrength(force.entityIds.map((id) => own.find((entity) => entity.id === id)));
    }
    return result;
  }

  function repairRosterState(observation, state) {
    const own = livingFor(observation, identity.computer.seat);
    const signature = rosterSignature(own);
    if (signature === state.rosterSignature) return state;
    let forces;
    if (observation.match.status === "active" && headquarters(observation, identity.computer.seat)) {
      const assigned = new Set(state.forces.flatMap((force) => force.entityIds));
      if (state.rosterSignature === "" || assigned.size === 0) {
        forces = assignForces(observation, state).map(cloneForce);
      } else {
        const ownById = new Map(own.map((entity) => [entity.id, entity]));
        forces = state.forces.map(cloneForce);
        for (const force of forces) {
          force.entityIds = force.entityIds.filter((id) => ownById.has(id));
          if (!force.entityIds.length) {
            force.need = null; force.objectiveId = null; force.objectiveRoot = null;
            force.commitmentUntilTick = 0; force.committedStrength = 0; force.stage = null;
          }
        }
        const retained = new Set(forces.flatMap((force) => force.entityIds));
        const unassigned = own.filter((entity) => !retained.has(entity.id));
        const home = headquarters(observation, identity.computer.seat);
        const reserveTarget = Math.min(observation.computer.populationUsed,
          Math.max(limits.reservePopulationMinimum,
            Math.ceil(observation.computer.populationUsed / limits.reservePopulationDivisor)));
        let reservePopulation = populationOf(forceEntities(forces[0], ownById));
        unassigned.sort((first, second) => distance(first, home) - distance(second, home)
          || compareIdentifiers(first.id, second.id));
        while (unassigned.length && reservePopulation < reserveTarget) {
          const entity = unassigned.shift();
          forces[0].entityIds.push(entity.id);
          reservePopulation += representatives[entity.kind].population;
        }
        if (reservePopulation < reserveTarget) {
          const transferable = forces.slice(1).flatMap((force) => force.entityIds.map((id) => ({
            force, entity: ownById.get(id)
          }))).filter((value) => value.entity)
            .sort((first, second) => distance(first.entity, home) - distance(second.entity, home)
              || compareIdentifiers(first.entity.id, second.entity.id));
          while (transferable.length && reservePopulation < reserveTarget) {
            const { force, entity } = transferable.shift();
            force.entityIds = force.entityIds.filter((id) => id !== entity.id);
            forces[0].entityIds.push(entity.id);
            reservePopulation += representatives[entity.kind].population;
          }
        }
        unassigned.sort((first, second) => entityStrength(second) - entityStrength(first)
          || compareIdentifiers(first.id, second.id));
        for (const entity of unassigned) {
          const fieldStrengths = forces.slice(1).map((force) => groupStrength(forceEntities(force, ownById)));
          const index = fieldStrengths[0] <= fieldStrengths[1] ? 1 : 2;
          forces[index].entityIds.push(entity.id);
        }
        for (const force of forces) {
          force.entityIds.sort(compareIdentifiers);
          if (!force.entityIds.length) {
            force.need = null; force.objectiveId = null; force.objectiveRoot = null;
            force.commitmentUntilTick = 0; force.committedStrength = 0; force.stage = null;
          }
        }
      }
    } else {
      const living = new Set(own.map((entity) => entity.id));
      forces = state.forces.map((force) => {
        const next = cloneForce(force);
        next.entityIds = next.entityIds.filter((id) => living.has(id));
        if (!next.entityIds.length) {
          next.need = null; next.objectiveId = null; next.objectiveRoot = null;
          next.commitmentUntilTick = 0; next.committedStrength = 0; next.stage = null;
        }
        return next;
      });
    }
    return {
      ...state,
      rosterSignature: signature,
      forces,
      currentNeed: forces.find((force) => force.need)?.need || null
    };
  }

  function populationOf(entities) {
    return entities.reduce((total, entity) => total + representatives[entity.kind].population, 0);
  }

  function routeCost(start, waypoints) {
    let total = 0;
    let root = start;
    for (const waypoint of waypoints) {
      const segment = Math.floor(Math.hypot(waypoint.x - root.x, waypoint.y - root.y));
      if (!Number.isSafeInteger(total + segment)) throw new RangeError("AI route cost exceeds safe integer range");
      total += segment;
      root = waypoint;
    }
    return total;
  }

  function directionOffset(radius, direction) {
    const diagonal = Math.floor(radius * captureFormation.diagonalNumerator
      / captureFormation.diagonalDenominator);
    return {
      east: { x: radius, y: 0 }, southeast: { x: diagonal, y: diagonal },
      south: { x: 0, y: radius }, southwest: { x: -diagonal, y: diagonal },
      west: { x: -radius, y: 0 }, northwest: { x: -diagonal, y: -diagonal },
      north: { x: 0, y: -radius }, northeast: { x: diagonal, y: -diagonal }
    }[direction];
  }

  function candidateComparator(first, second) {
    return Number(second.urgent) - Number(first.urgent)
      || needOrder.indexOf(first.need) - needOrder.indexOf(second.need)
      || second.value - first.value
      || second.projection - first.projection
      || Number(second.committed) - Number(first.committed)
      || first.routeCost - second.routeCost
      || compareIdentifiers(first.objectiveId, second.objectiveId)
      || compareIdentifiers(first.forceName, second.forceName);
  }

  function plannerContext(observation, map, navigationApi) {
    if (!navigationApi || typeof navigationApi.createNavigator !== "function"
      || typeof navigationApi.formationDestinations !== "function"
      || typeof navigationApi.reservationPoint !== "function") {
      throw new TypeError("AI planning requires the approved navigation API");
    }
    if (!map || String(map.id) !== observation.map.id) throw new TypeError("AI planning map identity does not match");
    const navigator = navigationApi.createNavigator(map, configuration, observation.structures);
    let routeProbes = 0;
    function findRoute(start, destination, radius) {
      if (routeProbes >= limits.routeProbeCap) return null;
      routeProbes += 1;
      return navigator.findRoute(start, destination, radius);
    }
    return {
      navigator, navigationApi, findRoute,
      probes() { return routeProbes; },
      remaining() { return limits.routeProbeCap - routeProbes; }
    };
  }

  function validateFormation(context, entities, root) {
    if (!entities.length || context.remaining() < entities.length) return null;
    let plans;
    try { plans = context.navigationApi.formationDestinations(entities, root, configuration); } catch { return null; }
    let total = 0;
    for (const plan of plans) {
      const entity = entities.find((value) => value.id === plan.entityId);
      const route = context.findRoute(entity, plan.destination, entity.radius);
      if (!route?.ok) return null;
      total += routeCost(entity, route.waypoints || []);
      if (!Number.isSafeInteger(total)) throw new RangeError("AI formation route cost exceeds safe integer range");
    }
    return { root: clonePoint(root), routeCost: total };
  }

  function validateAnchored(context, entities, target) {
    if (!entities.length || context.remaining() < entities.length) return null;
    let total = 0;
    for (let index = 0; index < entities.length; index += 1) {
      const entity = entities[index];
      const destination = context.navigationApi.reservationPoint(
        target, entity, entity.role, index % configuration.reservationCapPerTarget, configuration
      );
      const route = context.findRoute(entity, destination, entity.radius);
      if (!route?.ok) return null;
      total += routeCost(entity, route.waypoints || []);
      if (!Number.isSafeInteger(total)) throw new RangeError("AI anchored route cost exceeds safe integer range");
    }
    return { root: { x: target.x, y: target.y }, routeCost: total };
  }

  function validateDefend(context, entities, target) {
    if (!entities.length) return null;
    const sorted = [...entities].sort((first, second) => compareIdentifiers(first.id, second.id));
    const maximumRadius = Math.max(...sorted.map((entity) => entity.radius));
    const firstRing = target.radius + maximumRadius + 16 * configuration.positionScale;
    const ringStep = maximumRadius * 2 + configuration.formationGapWorld * configuration.positionScale;
    const maximumRing = configuration.defendLeashWorld * configuration.positionScale;
    const maximumRings = Math.ceil(configuration.selectionCap / 8) + 1;
    const slots = [];
    for (let ringIndex = 0; ringIndex < maximumRings; ringIndex += 1) {
      const ring = firstRing + ringIndex * ringStep;
      if (ring > maximumRing) break;
      for (let direction = 0; direction < 8; direction += 1) slots.push({ ringIndex, direction, ring });
    }
    const occupied = new Set();
    const planned = [];
    let total = 0;
    for (const entity of sorted) {
      let accepted = false;
      for (const slot of slots) {
        const key = `${slot.ringIndex}:${slot.direction}`;
        if (occupied.has(key)) continue;
        const offset = context.navigationApi.reservationOffset(slot.ring, slot.direction);
        const destination = { x: target.x + offset.x, y: target.y + offset.y };
        if (!context.navigator.isPointClear(destination, entity.radius)
          || planned.some((other) => {
            const minimum = other.entity.radius + entity.radius;
            const deltaX = other.destination.x - destination.x;
            const deltaY = other.destination.y - destination.y;
            return deltaX * deltaX + deltaY * deltaY < minimum * minimum;
          }) || context.remaining() < 1) continue;
        const route = context.findRoute(entity, destination, entity.radius);
        if (!route?.ok) continue;
        occupied.add(key);
        planned.push({ entity, destination });
        total += routeCost(entity, route.waypoints || []);
        accepted = true;
        break;
      }
      if (!accepted) return null;
    }
    return { root: { x: target.x, y: target.y }, routeCost: total };
  }

  function validateCapture(context, entities, structure, reservedProbes = 0) {
    const captureRadius = captureRadiusWorld[structure.category] * configuration.positionScale;
    for (const offsetWorld of captureFormation.ringOffsetsWorld) {
      const radius = captureRadius - offsetWorld * configuration.positionScale;
      for (const direction of captureFormation.directions) {
        if (context.remaining() < entities.length + reservedProbes) return null;
        const offset = directionOffset(radius, direction);
        const root = { x: structure.x + offset.x, y: structure.y + offset.y };
        const result = validateFormation(context, entities, root);
        if (result) return result;
      }
    }
    return null;
  }

  function cloneForce(force) {
    return {
      name: force.name, entityIds: [...force.entityIds], need: force.need,
      objectiveId: force.objectiveId, objectiveRoot: clonePoint(force.objectiveRoot),
      commitmentUntilTick: force.commitmentUntilTick,
      committedStrength: force.committedStrength, stage: force.stage
    };
  }

  function forceRetreats(force, entities, observation, target) {
    if (!force.need || !["assault", "pressure", "raid"].includes(force.need) || !target) return false;
    const current = groupStrength(entities);
    const opposition = groupStrength(localOpposition(observation, target, identity.computer.seat));
    return (opposition > 0 && current * 100 < opposition * limits.retreatStrengthPercent)
      || (force.committedStrength > 0
        && current * 100 <= force.committedStrength * (100 - limits.retreatCommittedLossPercent));
  }

  function addCandidate(candidates, candidate) {
    if (candidates.length >= limits.objectiveCandidateCap) return false;
    candidates.push(candidate);
    return true;
  }

  function objectiveValue(need, structure = null) {
    const value = needValues[need];
    return typeof value === "number" ? value : value[structure.category];
  }

  function objectiveStillValid(force, observation, lookup) {
    if (!force.need || !force.objectiveId) return false;
    const target = lookup.get(force.objectiveId);
    if (!target || target.destroyed === true || target.health <= 0) return false;
    if (force.need === "capture") return target.category !== "headquarters" && target.ownerSeat === null;
    if (force.need === "raid") return target.category !== "headquarters" && target.ownerSeat === identity.human.seat;
    if (force.need === "pressure") return target.ownerSeat === identity.human.seat;
    if (force.need === "assault") return target.category === "headquarters" && target.ownerSeat === identity.human.seat;
    if (force.need === "reinforce") {
      return threatenedOutposts(observation).some((structure) => structure.id === target.id);
    }
    return target.ownerSeat === identity.computer.seat;
  }

  function buildCandidates(observation, state, forces, context, emergency) {
    const candidates = [];
    const ownById = new Map(livingFor(observation, identity.computer.seat).map((value) => [value.id, value]));
    const hq = headquarters(observation, identity.computer.seat);
    const hostileHq = headquarters(observation, identity.human.seat);
    const outposts = threatenedOutposts(observation);
    const neutral = observation.structures.filter((structure) => !structure.destroyed
      && structure.category !== "headquarters" && structure.ownerSeat === null)
      .sort((first, second) => compareIdentifiers(first.id, second.id));
    const hostileShared = observation.structures.filter((structure) => !structure.destroyed
      && structure.category !== "headquarters" && structure.ownerSeat === identity.human.seat)
      .sort((first, second) => compareIdentifiers(first.id, second.id));
    const hostileEntities = livingFor(observation, identity.human.seat)
      .sort((first, second) => compareIdentifiers(first.id, second.id));
    const lookup = byId(observation);

    function candidateFor(force, need, target, urgent = false, special = null) {
      if (!target || !force.entityIds.length || candidates.length >= limits.objectiveCandidateCap) return;
      const committed = observation.tick < force.commitmentUntilTick
        && objectiveStillValid(force, observation, lookup);
      const sameCommitment = force.need === need && force.objectiveId === target.id;
      const permittedOverride = (emergency && need === "defend") || need === "recover";
      if (committed && !sameCommitment && !permittedOverride) return;
      let members = forceEntities(force, ownById).slice(0, configuration.selectionCap);
      if (need === "capture") members = members.slice(0, limits.captureDetachmentCap);
      if (!members.length) return;
      const reservedProbes = limits.productionRequestCap + limits.rallyRequestCap + 1;
      if (context.remaining() < members.length + reservedProbes) return;
      const friendly = groupStrength(members);
      const opposition = groupStrength(localOpposition(observation, target, identity.computer.seat));
      if (need === "raid" && opposition > friendly) return;
      let route = null;
      if (need === "capture" || need === "raid" || special === "capture") {
        route = validateCapture(context, members, target, reservedProbes);
      }
      else if (["defend", "recover", "reinforce"].includes(need)) {
        route = validateDefend(context, members, target);
      } else if (need === "assault") {
        route = validateAnchored(context, members, target);
      } else route = validateFormation(context, members, { x: target.x, y: target.y });
      if (!route) return;
      addCandidate(candidates, {
        forceName: force.name, need, objectiveId: target.id,
        root: route.root, target, entityIds: members.map((entity) => entity.id).sort(compareIdentifiers),
        urgent, value: objectiveValue(need, target), projection: friendly - opposition,
        committed: sameCommitment && observation.tick < force.commitmentUntilTick,
        routeCost: route.routeCost, friendlyStrength: friendly, oppositionStrength: opposition
      });
    }

    function reinforcementForce(target) {
      const fields = forces.slice(1).filter((force) => force.entityIds.length > 0);
      const committed = fields.filter((force) => force.need === "reinforce"
        && force.objectiveId === target.id && observation.tick < force.commitmentUntilTick)
        .sort((first, second) => compareIdentifiers(first.name, second.name));
      if (committed.length) return committed[0];
      return fields.sort((first, second) => {
        const firstStrength = groupStrength(forceEntities(first, ownById));
        const secondStrength = groupStrength(forceEntities(second, ownById));
        const firstDistance = Math.min(...forceEntities(first, ownById).map((entity) => distance(entity, target)));
        const secondDistance = Math.min(...forceEntities(second, ownById).map((entity) => distance(entity, target)));
        return firstStrength - secondStrength || firstDistance - secondDistance
          || compareIdentifiers(first.name, second.name);
      })[0] || forces[0];
    }

    if (emergency) {
      candidateFor(forces[0], "defend", hq, true);
      const field = [...forces.slice(1)].sort((first, second) => {
        const firstStrength = groupStrength(forceEntities(first, ownById));
        const secondStrength = groupStrength(forceEntities(second, ownById));
        return secondStrength - firstStrength || compareIdentifiers(first.name, second.name);
      })[0];
      candidateFor(field, "defend", hq, true);
    }
    for (const force of forces.slice(1)) {
      const currentTarget = force.objectiveId ? byId(observation).get(force.objectiveId) : null;
      const members = forceEntities(force, ownById);
      if (forceRetreats(force, members, observation, currentTarget)) {
        const producing = observation.structures.filter((structure) => !structure.destroyed
          && structure.ownerSeat === identity.computer.seat
          && (structure.category === "headquarters" || structure.category === "production-outpost"))
          .sort((first, second) => distance(members[0] || hq, first) - distance(members[0] || hq, second)
            || compareIdentifiers(first.id, second.id));
        for (const target of producing) candidateFor(force, "recover", target, true);
      }
    }
    for (const outpost of outposts) candidateFor(reinforcementForce(outpost), "reinforce", outpost, true);
    for (const target of neutral) for (const force of forces.slice(1)) candidateFor(force, "capture", target);
    for (const target of hostileShared) for (const force of forces.slice(1)) candidateFor(force, "raid", target);
    for (const target of hostileEntities) for (const force of forces.slice(1)) {
      candidateFor(force, "pressure", target);
      if (candidates.length >= limits.objectiveCandidateCap) break;
    }
    if (hostileHq && observation.tick >= timings.earliestAssaultTick
      && observation.tick >= state.nextAssaultEligibleTick
      && observation.computer.populationUsed >= limits.assaultPopulationMinimum
      && forces[0].entityIds.length > 0) {
      for (const force of forces.slice(1)) {
        const members = forceEntities(force, ownById);
        const friendly = groupStrength(members);
        const opposition = groupStrength(localOpposition(observation, hostileHq, identity.computer.seat));
        if (friendly * 100 >= opposition * limits.assaultStrengthPercent) candidateFor(force, "assault", hostileHq);
      }
    }
    return candidates.sort(candidateComparator);
  }

  function selectCandidates(candidates, observation) {
    const selected = [];
    const usedForces = new Set();
    const fieldObjectives = new Set();
    const uniqueNonHeadquarters = new Set(candidates
      .filter((candidate) => candidate.forceName !== "reserve" && candidate.target.category !== "headquarters")
      .map((candidate) => candidate.objectiveId));
    const distinctRequired = observation.computer.populationUsed >= limits.multiFrontPopulationMinimum
      && uniqueNonHeadquarters.size >= 2;
    for (const candidate of candidates) {
      if (selected.length >= limits.tacticalRequestCap || usedForces.has(candidate.forceName)) continue;
      if (distinctRequired && candidate.forceName !== "reserve" && fieldObjectives.has(candidate.objectiveId)) continue;
      selected.push(candidate);
      usedForces.add(candidate.forceName);
      if (candidate.forceName !== "reserve") fieldObjectives.add(candidate.objectiveId);
    }
    return selected;
  }

  function tacticalIntent(candidate, previousForce) {
    const common = {
      protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId,
      issuingPlayer: identity.computer.seat,
      targetTick: candidate.tick + 1,
      entityIds: [...candidate.entityIds].sort(compareIdentifiers)
    };
    if (["defend", "recover", "reinforce"].includes(candidate.need)) {
      return { ...common, kind: "DEFEND", anchor: { kind: "entity", entityId: candidate.objectiveId } };
    }
    if (candidate.need === "capture") return { ...common, kind: "MOVE", destination: clonePoint(candidate.root) };
    if (candidate.need === "raid") {
      const captureRadius = captureRadiusWorld[candidate.target.category] * configuration.positionScale;
      const near = candidate.entityIds.some((id) => {
        const entity = candidate.observationEntities.get(id);
        return entity && distance(entity, candidate.target) <= captureRadius + limits.localOppositionRadiusWorld * configuration.positionScale / 2;
      });
      if (previousForce.stage === "approach" && near) {
        return { ...common, kind: "MOVE", destination: clonePoint(candidate.root) };
      }
      return { ...common, kind: "ATTACK_MOVE", destination: clonePoint(candidate.root) };
    }
    if (candidate.need === "pressure") return { ...common, kind: "ATTACK_MOVE", destination: clonePoint(candidate.root) };
    return { ...common, kind: "ATTACK_ENTITY", targetId: candidate.objectiveId };
  }

  function samePoint(first, second) {
    return Boolean(first) && Boolean(second) && first.x === second.x && first.y === second.y;
  }

  function activeTacticalEntityIds(candidate, intent) {
    const entities = candidate.entityIds.map((id) => candidate.observationEntities.get(id)).filter(Boolean);
    if (entities.length !== candidate.entityIds.length) return new Set();
    if (intent.kind === "DEFEND") {
      return new Set(entities.filter((entity) => entity.order === "DEFEND"
        && entity.orderAnchorId === intent.anchor.entityId).map((entity) => entity.id));
    }
    if (intent.kind === "ATTACK_ENTITY") {
      return new Set(entities.filter((entity) => entity.order === "ATTACK_ENTITY"
        && entity.targetId === intent.targetId).map((entity) => entity.id));
    }
    if (intent.kind !== "MOVE" && intent.kind !== "ATTACK_MOVE") return new Set();
    let plans;
    try {
      plans = navigationDefault.formationDestinations(entities, intent.destination, configuration);
    } catch { return new Set(); }
    const expected = new Map(plans.map((plan) => [plan.entityId, plan.destination]));
    return new Set(entities.filter((entity) => {
      if (entity.order === intent.kind && samePoint(entity.orderDestination, expected.get(entity.id))) return true;
      if (candidate.committed && entity.order === intent.kind && entity.orderDestination !== null) return true;
      if (intent.kind === "ATTACK_MOVE" && candidate.need === "pressure"
        && entity.targetId === candidate.objectiveId) return true;
      if (intent.kind !== "MOVE" || entity.order !== "IDLE"
        || candidate.target.category === "headquarters") return false;
      const captureRadius = captureRadiusWorld[candidate.target.category] * configuration.positionScale;
      return distance(entity, candidate.target) <= captureRadius;
    }).map((entity) => entity.id));
  }

  function classifyHostiles(observation) {
    let melee = 0;
    let ranged = 0;
    for (const entity of livingFor(observation, identity.human.seat)) {
      const population = representatives[entity.kind].population;
      if (entity.role === "melee") melee += population;
      else if (entity.role === "ranged") ranged += population;
    }
    if (melee >= ranged + limits.roleClassificationMarginPopulation) return "melee-heavy";
    if (ranged >= melee + limits.roleClassificationMarginPopulation) return "ranged-heavy";
    return "balanced";
  }

  function activeObjective(selected, state) {
    if (selected.length) return selected[0];
    const force = state.forces.find((value) => value.objectiveId !== null);
    return force ? { objectiveId: force.objectiveId, root: force.objectiveRoot, need: force.need } : null;
  }

  function producingStructures(observation) {
    return observation.structures.filter((structure) => !structure.destroyed
      && structure.ownerSeat === identity.computer.seat
      && (structure.category === "headquarters" || structure.category === "production-outpost"))
      .sort((first, second) => compareIdentifiers(first.id, second.id));
  }

  function producerRoute(context, observation, map, producer, objective, radius) {
    if (!objective?.root) return { ok: true, cost: 0 };
    const geometry = observation.map.structures.find((value) => value.id === producer.id);
    const start = geometry?.spawnSlots[0];
    if (!start || context.remaining() < 1) return null;
    const route = context.findRoute(start, objective.root, radius);
    return route?.ok ? { ok: true, cost: routeCost(start, route.waypoints || []) } : null;
  }

  function productionIntent(observation, currentNeed, objective, context, map) {
    const producers = producingStructures(observation);
    const blocked = producers.flatMap((producer) => (producer.queue || [])
      .filter((item) => item.blockedComplete)
      .map((item) => ({ producer, item })))
      .sort((first, second) => compareIdentifiers(first.producer.id, second.producer.id)
        || compareIdentifiers(first.item.id, second.item.id))[0];
    if (blocked) return {
      protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId,
      kind: "CANCEL_PRODUCTION", issuingPlayer: identity.computer.seat,
      targetTick: observation.tick + 1, structureId: blocked.producer.id,
      queueItemId: blocked.item.id
    };

    const own = livingFor(observation, identity.computer.seat);
    const profile = currentNeed === "assault" ? "assault" : classifyHostiles(observation);
    const target = roleTargets[profile];
    const counts = { melee: 0, ranged: 0, signature: 0 };
    for (const entity of own) counts[entity.role] += representatives[entity.kind].population;
    for (const producer of producers) for (const item of producer.queue || []) {
      const definition = representatives[item.entityKind];
      counts[definition.role] += definition.population;
    }
    const roster = productionRosters[identity.computer.faction];
    const choices = roster.map((kind, rosterIndex) => {
      const definition = representatives[kind];
      return { kind, role: definition.role, deficit: target[definition.role] - counts[definition.role],
        cost: definition.cost, population: definition.population, rosterIndex };
    }).filter((choice) => choice.deficit > 0)
      .sort((first, second) => second.deficit - first.deficit || first.cost - second.cost
        || first.rosterIndex - second.rosterIndex);
    const choice = choices[0];
    if (!choice || observation.computer.resources < choice.cost
      || observation.computer.populationUsed + observation.computer.populationReserved + choice.population
        > observation.computer.populationCap) return null;
    const eligible = [];
    for (const producer of producers) {
      if (producer.queue.length >= configuration.productionQueueCap) continue;
      const route = producerRoute(context, observation, map, producer, objective,
        representatives[choice.kind].radius);
      if (!route) continue;
      eligible.push({ producer, routeCost: route.cost });
    }
    eligible.sort((first, second) => first.producer.queue.length - second.producer.queue.length
      || first.routeCost - second.routeCost
      || compareIdentifiers(first.producer.id, second.producer.id));
    if (!eligible.length) return null;
    return {
      protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId,
      kind: "QUEUE_PRODUCTION", issuingPlayer: identity.computer.seat,
      targetTick: observation.tick + 1, structureId: eligible[0].producer.id,
      entityKind: choice.kind
    };
  }

  function rallyIntent(observation, objective, context) {
    if (!objective?.root) return null;
    const producers = producingStructures(observation);
    const threshold = configuration.formationGapWorld * configuration.positionScale;
    for (const producer of producers) {
      if (producer.rally && distance(producer.rally, objective.root) < threshold) continue;
      const geometry = observation.map.structures.find((value) => value.id === producer.id);
      const start = geometry?.spawnSlots[0];
      if (!start || context.remaining() < 1) continue;
      const route = context.findRoute(start, objective.root,
        configuration.largestRallyRadiusWorld * configuration.positionScale);
      if (!route?.ok) continue;
      return {
        protocolVersion: configuration.protocolVersion,
        configurationId: configuration.configurationId,
        kind: "SET_RALLY", issuingPlayer: identity.computer.seat,
        targetTick: observation.tick + 1, structureId: producer.id,
        destination: clonePoint(objective.root)
      };
    }
    return null;
  }

  function requestComparator(first, second) {
    return compareIdentifiers(first.kind, second.kind)
      || compareIdentifiers(first.structureId || first.targetId || first.entityIds?.[0] || "",
        second.structureId || second.targetId || second.entityIds?.[0] || "");
  }

  function plan(observationInput, stateInput, options = {}) {
    if (!plainObject(options) || Object.keys(options).some((key) => key !== "map" && key !== "navigationApi")) {
      throw new TypeError("AI planning options are invalid");
    }
    const observation = validateObservation(observationInput);
    let state = foldEvents(stateInput, observation.events, observation.tick);
    let stateCopy = validateState(state);
    const urgentKinds = new Set(["damage", "capture", "structure-destruction"]);
    const eventUrgent = observation.events.some((event) => urgentKinds.has(event.kind))
      || stateCopy.threats.some((threat) => threat.tick === observation.tick && urgentKinds.has(threat.kind));
    const emergency = headquartersEmergency(observation, stateCopy);
    stateCopy = repairRosterState(observation, stateCopy);
    const urgent = emergency || threatenedOutposts(observation).length > 0 || eventUrgent;
    const normalDue = observation.tick >= stateCopy.nextDecisionTick;
    const urgentDue = urgent && observation.tick >= stateCopy.urgentEligibleTick;
    if (observation.match.status !== "active" || (!normalDue && !urgentDue)) {
      validateState(stateCopy, observation);
      return deepFreeze({ intents: [], state: stateCopy, diagnostics: {
        decided: false, urgent, candidateCount: 0, routeProbes: 0, requestCount: 0
      } });
    }

    const map = options.map || mapDefault;
    const navigationApi = options.navigationApi || navigationDefault;
    const context = plannerContext(observation, map, navigationApi);
    const forces = assignForces(observation, stateCopy).map(cloneForce);
    const candidates = buildCandidates(observation, stateCopy, forces, context, emergency);
    const selected = selectCandidates(candidates, observation);
    const ownById = new Map(livingFor(observation, identity.computer.seat).map((value) => [value.id, value]));
    const tactical = [];
    let assaultEnded = false;
    const selectedForces = new Set();
    for (const candidate of selected) {
      candidate.tick = observation.tick;
      candidate.observationEntities = ownById;
      const force = forces.find((value) => value.name === candidate.forceName);
      selectedForces.add(force.name);
      const intent = tacticalIntent(candidate, force);
      const activeEntityIds = activeTacticalEntityIds(candidate, intent);
      if (activeEntityIds.size < intent.entityIds.length) {
        intent.entityIds = intent.entityIds.filter((id) => !activeEntityIds.has(id));
        tactical.push(intent);
      }
      const changed = force.need !== candidate.need || force.objectiveId !== candidate.objectiveId
        || observation.tick >= force.commitmentUntilTick;
      if (force.need === "assault" && candidate.need !== "assault") assaultEnded = true;
      force.need = candidate.need;
      force.objectiveId = candidate.objectiveId;
      force.objectiveRoot = clonePoint(candidate.root);
      if (changed) {
        force.commitmentUntilTick = observation.tick + timings.minimumCommitmentTicks;
        force.committedStrength = candidate.friendlyStrength;
      }
      force.stage = candidate.need === "raid"
        ? intent.kind === "MOVE" ? "capture" : "approach" : null;
    }
    const lookup = byId(observation);
    for (const force of forces) {
      if (selectedForces.has(force.name) || !force.objectiveId
        || objectiveStillValid(force, observation, lookup)) continue;
      if (force.need === "assault") assaultEnded = true;
      force.need = null; force.objectiveId = null; force.objectiveRoot = null;
      force.commitmentUntilTick = 0; force.committedStrength = 0; force.stage = null;
    }
    tactical.sort(requestComparator);
    const active = activeObjective(selected, { forces });
    const currentNeed = selected[0]?.need || forces.find((force) => force.need)?.need || null;
    const production = productionIntent(observation, currentNeed, active, context, map);
    const rally = rallyIntent(observation, active, context);
    const intents = [
      ...tactical.slice(0, limits.tacticalRequestCap),
      ...(production ? [production] : []),
      ...(rally ? [rally] : [])
    ].slice(0, limits.totalRequestCap);

    const priorAssault = stateCopy.currentNeed === "assault";
    const nextAssaultEligibleTick = assaultEnded || (priorAssault && currentNeed !== "assault")
      ? Math.min(configuration.simulationTickCap,
        observation.tick + timings.assaultCooldownTicks)
      : stateCopy.nextAssaultEligibleTick;
    const next = {
      ...stateCopy,
      nextDecisionTick: observation.tick + timings.strategicCadenceTicks,
      urgentEligibleTick: observation.tick + timings.urgentResponseTicks,
      planNumber: stateCopy.planNumber + 1,
      currentNeed,
      nextAssaultEligibleTick,
      rosterSignature: rosterSignature(livingFor(observation, identity.computer.seat)),
      forces,
      lastResult: selected.length ? {
        tick: observation.tick, code: "planned", objectiveId: selected[0].objectiveId
      } : {
        tick: observation.tick, code: context.remaining() === 0 ? "route-probe-cap" : "no-objective",
        objectiveId: null
      }
    };
    validateState(next, observation);
    return deepFreeze({
      intents,
      state: next,
      diagnostics: {
        decided: true, urgent, candidateCount: candidates.length,
        routeProbes: context.probes(), requestCount: intents.length
      }
    });
  }

  const api = Object.freeze({
    createInitialState, validateState, recordResult, filterEvents, buildObservation, validateObservation, foldEvents,
    entityStrength, groupStrength, plan
  });
  if (commonJS) module.exports = api;
  else window.AeonPhase6AI = api;
}());
