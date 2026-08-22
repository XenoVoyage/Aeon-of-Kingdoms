/* global window */
"use strict";

(function exposePhase5Simulation() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase5Config;
  const navigationApi = commonJS ? require("./navigation.js") : window.AeonPhase5Navigation;
  const defaultMap = commonJS ? require("./map.js") : window.AeonPhase5Map;
  const {
    configuration, combatByRole, representatives, factionRosters, productionRosters,
    openingSlots, structureCategories, structureHealth, compareIdentifiers
  } = configApi;

  const SNAPSHOT_KEYS = Object.freeze([
    "configurationId", "entities", "mapId", "match", "nextEntityNumber",
    "nextProjectileNumber", "nextQueueNumber", "nextSequence", "pendingCommands",
    "players", "projectiles", "protocolVersion", "schemaVersion", "seed",
    "structures", "tick"
  ]);
  const PLAYER_KEYS = Object.freeze([
    "faction", "populationCap", "populationReserved", "populationUsed", "resources", "seat"
  ]);
  const STRUCTURE_KEYS = Object.freeze([
    "capture", "category", "destroyed", "health", "id", "maxHealth", "ownerSeat",
    "queue", "radius", "rally", "x", "y"
  ]);
  const CAPTURE_KEYS = Object.freeze(["challengerSeat", "progressTicks"]);
  const QUEUE_KEYS = Object.freeze(["blockedComplete", "entityKind", "id", "ownerSeat", "progressTicks"]);
  const ENTITY_KEYS = Object.freeze([
    "attackStartTick", "commandRoot", "defendAnchor", "engagementRoot", "facing",
    "formationDestination", "health", "id", "idleRoot", "kind", "maxHealth",
    "nextAttackStartTick", "order", "ownerSeat", "pendingAttackTick", "progress",
    "radius", "repathCount", "reservation", "returnFailure", "returning", "route",
    "routeIndex", "savedDestination", "savedProgress", "savedRepathCount", "savedRoute", "savedRouteIndex",
    "reservationWait", "speedPerTick",
    "targetId", "x", "y"
  ]);
  const PROJECTILE_KEYS = Object.freeze([
    "arrivalTick", "damage", "id", "launchEdgeDistance", "launchTick", "launchX", "launchY",
    "launchSourceRadius", "launchTargetRadius", "launchTargetX", "launchTargetY", "sourceSeat", "targetId"
  ]);
  const MATCH_KEYS = Object.freeze(["completedTick", "status", "winnerSeat"]);
  const RESERVATION_KEYS = Object.freeze(["slotIndex", "targetId"]);
  const RESERVATION_WAIT_KEYS = Object.freeze(["attackerRoster", "targetId", "targetX", "targetY"]);
  const COMMON_REQUEST_KEYS = Object.freeze([
    "configurationId", "issuingPlayer", "kind", "protocolVersion", "targetTick"
  ]);
  const PAYLOAD_KEYS = Object.freeze({
    MOVE: ["destination", "entityIds"],
    ATTACK_ENTITY: ["entityIds", "targetId"],
    ATTACK_MOVE: ["destination", "entityIds"],
    STOP: ["entityIds"],
    DEFEND: ["anchor", "entityIds"],
    QUEUE_PRODUCTION: ["entityKind", "structureId"],
    CANCEL_PRODUCTION: ["queueItemId", "structureId"],
    SET_RALLY: ["destination", "structureId"],
    CLEAR_RALLY: ["structureId"]
  });
  const COMMAND_KINDS = Object.freeze(Object.keys(PAYLOAD_KEYS));
  const TACTICAL_KINDS = new Set(["MOVE", "ATTACK_ENTITY", "ATTACK_MOVE", "STOP", "DEFEND"]);
  const ORDERS = new Set(["IDLE", "MOVE", "ATTACK_ENTITY", "ATTACK_MOVE", "STOP", "DEFEND"]);
  const RETURNING_ORDERS = new Set(["IDLE", "ATTACK_MOVE", "DEFEND"]);

  function plainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
      && Object.getPrototypeOf(value) === Object.prototype;
  }
  function exactKeys(value, expected) {
    if (!plainObject(value)) return false;
    const keys = Object.keys(value).sort(compareIdentifiers);
    const sorted = [...expected].sort(compareIdentifiers);
    return keys.length === sorted.length && keys.every((key, index) => key === sorted[index]);
  }
  function denseArray(value) {
    if (!Array.isArray(value) || Object.keys(value).length !== value.length) return false;
    for (let index = 0; index < value.length; index += 1) if (!Object.hasOwn(value, index)) return false;
    return true;
  }
  function safeInteger(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
    return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  }
  function validIdentifier(value, maximumLength = configuration.entityIdMaxLength) {
    return typeof value === "string" && value.length >= 1 && value.length <= maximumLength
      && /^[A-Za-z0-9-]+$/.test(value);
  }
  function validateSerializedSize(value, cap, label) {
    let encoded;
    try { encoded = JSON.stringify(value); } catch { throw new TypeError(`${label} must be acyclic JSON data`); }
    if (encoded === undefined || encoded.length > cap) throw new RangeError(`${label} exceeds its encoded bound`);
  }
  function clonePoint(point) { return point ? { x: point.x, y: point.y } : null; }
  function validatePointShape(point) {
    return exactKeys(point, ["x", "y"])
      && safeInteger(point.x, 0, configuration.worldExtentFixedCap)
      && safeInteger(point.y, 0, configuration.worldExtentFixedCap);
  }
  function distanceFixed(first, second) {
    return Math.floor(Math.hypot(second.x - first.x, second.y - first.y));
  }
  function rootDistance(first, second) { return distanceFixed(first, second); }
  function targetEdgeDistance(attacker, target) {
    return Math.max(0, distanceFixed(attacker, target) - attacker.radius - target.radius);
  }
  function overlaps(first, second) {
    const deltaX = first.x - second.x;
    const deltaY = first.y - second.y;
    const minimum = first.radius + second.radius;
    return deltaX * deltaX + deltaY * deltaY < minimum * minimum;
  }
  function commandOrder(first, second) { return first.targetTick - second.targetTick || first.sequence - second.sequence; }

  function cloneCapture(value) { return { challengerSeat: value.challengerSeat, progressTicks: value.progressTicks }; }
  function cloneQueueItem(value) {
    return {
      id: value.id, ownerSeat: value.ownerSeat, entityKind: value.entityKind,
      progressTicks: value.progressTicks, blockedComplete: value.blockedComplete
    };
  }
  function cloneStructure(value) {
    return {
      id: value.id, category: value.category, x: value.x, y: value.y, radius: value.radius,
      maxHealth: value.maxHealth, health: value.health, ownerSeat: value.ownerSeat,
      destroyed: value.destroyed, capture: cloneCapture(value.capture),
      queue: value.queue.map(cloneQueueItem), rally: clonePoint(value.rally)
    };
  }
  function clonePlayer(value) {
    return {
      seat: value.seat, faction: value.faction, resources: value.resources,
      populationUsed: value.populationUsed, populationReserved: value.populationReserved,
      populationCap: value.populationCap
    };
  }
  function cloneAnchor(value) {
    if (!value) return null;
    if (value.kind === "point") return { kind: "point", destination: clonePoint(value.destination) };
    return { kind: "entity", entityId: value.entityId, lastRoot: clonePoint(value.lastRoot) };
  }
  function cloneReservation(value) { return value ? { targetId: value.targetId, slotIndex: value.slotIndex } : null; }
  function cloneEntity(value) {
    return {
      id: value.id, ownerSeat: value.ownerSeat, kind: value.kind,
      x: value.x, y: value.y, radius: value.radius, speedPerTick: value.speedPerTick,
      maxHealth: value.maxHealth, health: value.health, facing: value.facing,
      order: value.order, targetId: value.targetId,
      commandRoot: clonePoint(value.commandRoot), engagementRoot: clonePoint(value.engagementRoot),
      idleRoot: clonePoint(value.idleRoot), defendAnchor: cloneAnchor(value.defendAnchor),
      route: value.route.map(clonePoint), routeIndex: value.routeIndex,
      formationDestination: clonePoint(value.formationDestination),
      savedRoute: value.savedRoute.map(clonePoint), savedRouteIndex: value.savedRouteIndex,
      savedDestination: clonePoint(value.savedDestination),
      savedRepathCount: value.savedRepathCount,
      savedProgress: { distance: value.savedProgress.distance, stalledTicks: value.savedProgress.stalledTicks },
      repathCount: value.repathCount,
      progress: { distance: value.progress.distance, stalledTicks: value.progress.stalledTicks },
      reservation: cloneReservation(value.reservation),
      reservationWait: value.reservationWait ? {
        targetId: value.reservationWait.targetId, targetX: value.reservationWait.targetX,
        targetY: value.reservationWait.targetY, attackerRoster: value.reservationWait.attackerRoster
      } : null,
      attackStartTick: value.attackStartTick, pendingAttackTick: value.pendingAttackTick,
      nextAttackStartTick: value.nextAttackStartTick,
      returning: value.returning, returnFailure: value.returnFailure
    };
  }
  function cloneProjectile(value) {
    return {
      id: value.id, sourceSeat: value.sourceSeat, targetId: value.targetId, damage: value.damage,
      launchTick: value.launchTick, arrivalTick: value.arrivalTick,
      launchX: value.launchX, launchY: value.launchY,
      launchTargetX: value.launchTargetX, launchTargetY: value.launchTargetY,
      launchSourceRadius: value.launchSourceRadius, launchTargetRadius: value.launchTargetRadius,
      launchEdgeDistance: value.launchEdgeDistance
    };
  }
  function cloneMatch(value) {
    return { status: value.status, winnerSeat: value.winnerSeat, completedTick: value.completedTick };
  }
  function cloneCommand(command) {
    const result = {
      protocolVersion: command.protocolVersion, configurationId: command.configurationId,
      kind: command.kind, issuingPlayer: command.issuingPlayer,
      sequence: command.sequence, targetTick: command.targetTick
    };
    if (command.entityIds) result.entityIds = [...command.entityIds];
    if (command.destination) result.destination = clonePoint(command.destination);
    if (command.anchor) {
      result.anchor = command.anchor.kind === "point"
        ? { kind: "point", destination: clonePoint(command.anchor.destination) }
        : { kind: "entity", entityId: command.anchor.entityId };
    }
    if (command.targetId) result.targetId = command.targetId;
    if (command.structureId) result.structureId = command.structureId;
    if (command.entityKind) result.entityKind = command.entityKind;
    if (command.queueItemId) result.queueItemId = command.queueItemId;
    return result;
  }
  function frozenCommand(command) {
    const value = cloneCommand(command);
    if (value.entityIds) Object.freeze(value.entityIds);
    if (value.destination) Object.freeze(value.destination);
    if (value.anchor) {
      if (value.anchor.destination) Object.freeze(value.anchor.destination);
      Object.freeze(value.anchor);
    }
    return Object.freeze(value);
  }
  function snapshotState(state) {
    return {
      schemaVersion: state.schemaVersion, protocolVersion: state.protocolVersion,
      configurationId: state.configurationId, mapId: state.mapId, seed: state.seed,
      tick: state.tick, nextSequence: state.nextSequence,
      nextEntityNumber: state.nextEntityNumber, nextQueueNumber: state.nextQueueNumber,
      nextProjectileNumber: state.nextProjectileNumber,
      match: cloneMatch(state.match), players: state.players.map(clonePlayer),
      structures: state.structures.map(cloneStructure), entities: state.entities.map(cloneEntity),
      projectiles: state.projectiles.map(cloneProjectile),
      pendingCommands: state.pendingCommands.map(cloneCommand)
    };
  }

  function requestKeys(kind, sequenced) {
    const payload = PAYLOAD_KEYS[kind];
    return payload ? [...COMMON_REQUEST_KEYS, ...payload, ...(sequenced ? ["sequence"] : [])] : null;
  }
  function validateEntityIds(ids) {
    if (!denseArray(ids) || ids.length < 1 || ids.length > configuration.selectionCap) return "selection-cap";
    let previous = null;
    for (const id of ids) {
      if (!validIdentifier(id)) return "entity-id";
      if (previous !== null && compareIdentifiers(previous, id) >= 0) return previous === id ? "duplicate-entity" : "entity-order";
      previous = id;
    }
    return null;
  }
  function validateAnchorShape(anchor) {
    if (!plainObject(anchor) || (anchor.kind !== "point" && anchor.kind !== "entity")) return false;
    if (anchor.kind === "point") return exactKeys(anchor, ["destination", "kind"]) && validatePointShape(anchor.destination);
    return exactKeys(anchor, ["entityId", "kind"]) && validIdentifier(anchor.entityId, configuration.structureIdMaxLength);
  }
  function validateCommandShape(value, sequenced) {
    if (!plainObject(value) || !COMMAND_KINDS.includes(value.kind)) return "kind";
    if (!exactKeys(value, requestKeys(value.kind, sequenced))) return "shape";
    if (value.protocolVersion !== configuration.protocolVersion || value.configurationId !== configuration.configurationId) return "identity";
    if (value.issuingPlayer !== 1 && value.issuingPlayer !== 2) return "player";
    if (!safeInteger(value.targetTick, 1, configuration.simulationTickCap)) return "target-tick";
    if (sequenced && !safeInteger(value.sequence, 1, Number.MAX_SAFE_INTEGER - 1)) return "sequence";
    if (TACTICAL_KINDS.has(value.kind)) {
      const ids = validateEntityIds(value.entityIds);
      if (ids) return ids;
      if ((value.kind === "MOVE" || value.kind === "ATTACK_MOVE") && !validatePointShape(value.destination)) return "destination";
      if (value.kind === "ATTACK_ENTITY" && !validIdentifier(value.targetId, configuration.structureIdMaxLength)) return "target-id";
      if (value.kind === "DEFEND" && !validateAnchorShape(value.anchor)) return "anchor";
      return null;
    }
    if (!validIdentifier(value.structureId, configuration.structureIdMaxLength)) return "structure-id";
    if (value.kind === "QUEUE_PRODUCTION" && !validIdentifier(value.entityKind)) return "entity-kind";
    if (value.kind === "CANCEL_PRODUCTION" && !validIdentifier(value.queueItemId, configuration.queueIdMaxLength)) return "queue-item-id";
    if (value.kind === "SET_RALLY" && !validatePointShape(value.destination)) return "destination";
    return null;
  }

  function resolveMap(candidate) {
    const map = candidate || defaultMap;
    if (!map?.phase5?.structures || !Array.isArray(map.phase5.structures)) throw new Error("Phase 5 requires the approved gameplay map overlay");
    if (!validIdentifier(String(map.id), configuration.mapIdMaxLength)) throw new TypeError("map identifier must be bounded ASCII");
    return map;
  }
  function authoredStructures(map) {
    const values = [...map.phase5.structures].sort((a, b) => compareIdentifiers(a.id, b.id));
    if (values.length !== configuration.structureCap) throw new Error("Phase 5 map must author exactly five structures");
    const counts = Object.fromEntries(structureCategories.map((category) => [category, 0]));
    const anchors = new Map(map.layers.anchors.structures.map((value) => [value.id, value]));
    const spawnIdentifiers = new Set();
    for (const value of values) {
      const anchor = anchors.get(value.id);
      if (!validIdentifier(value.id, configuration.structureIdMaxLength)
        || !structureCategories.includes(value.category) || value.maximumHealth !== structureHealth[value.id]
        || !anchor || value.category !== anchor.category || value.x !== anchor.x || value.y !== anchor.y
        || value.radius !== anchor.radius || value.initialOwnerSeat !== anchor.seat
        || value.faction !== (anchor.faction || null)) {
        throw new Error("Phase 5 map structure identity or health is invalid");
      }
      counts[value.category] += 1;
      const produces = value.category === "headquarters" || value.category === "production-outpost";
      if (!denseArray(value.spawnSlots) || (produces ? value.spawnSlots.length !== 6 : value.spawnSlots.length !== 0)
        || value.captureRadius !== (configApi.captureRadiusWorld[value.category] || null)) {
        throw new Error("Phase 5 map structure production or capture geometry is invalid");
      }
      for (let index = 0; index < value.spawnSlots.length; index += 1) {
        const slot = value.spawnSlots[index];
        if (!exactKeys(slot, ["id", "x", "y"]) || slot.id !== `${value.id}-spawn-${index + 1}`
          || spawnIdentifiers.has(slot.id) || !Number.isFinite(slot.x) || !Number.isFinite(slot.y)
          || slot.x < 0 || slot.y < 0 || slot.x > map.world.width || slot.y > map.world.height) {
          throw new Error("Phase 5 map spawn slot is invalid");
        }
        spawnIdentifiers.add(slot.id);
      }
    }
    if (counts.headquarters !== 2 || counts["resource-point"] !== 1 || counts["production-outpost"] !== 2) {
      throw new Error("Phase 5 map structure taxonomy is invalid");
    }
    return values;
  }
  function seatFactions(map) {
    const result = new Map();
    for (const value of map.layers.anchors.structures) {
      if (value.category !== "headquarters" || value.seat === null) continue;
      if (result.has(value.seat) || !factionRosters[value.faction]) throw new Error("headquarters faction ownership is invalid");
      result.set(value.seat, value.faction);
    }
    if (result.size !== 2 || !result.has(1) || !result.has(2)) throw new Error("Phase 5 requires two faction seats");
    return result;
  }
  function fixedStructure(authored) {
    return {
      id: authored.id, category: authored.category,
      x: Math.round(authored.x * configuration.positionScale),
      y: Math.round(authored.y * configuration.positionScale),
      radius: Math.round(authored.radius * configuration.positionScale),
      maxHealth: authored.maximumHealth, health: authored.maximumHealth,
      ownerSeat: authored.initialOwnerSeat, destroyed: false,
      capture: { challengerSeat: null, progressTicks: 0 }, queue: [], rally: null
    };
  }
  function combatFields(definition, x, y, creationTick) {
    return {
      maxHealth: definition.health, health: definition.health,
      order: "IDLE", targetId: null,
      commandRoot: null, engagementRoot: null, idleRoot: { x, y }, defendAnchor: null,
      route: [], routeIndex: 0, formationDestination: null,
      savedRoute: [], savedRouteIndex: 0, savedDestination: null,
      savedRepathCount: 0, savedProgress: { distance: 0, stalledTicks: 0 },
      repathCount: 0, progress: { distance: 0, stalledTicks: 0 },
      reservation: null, reservationWait: null, attackStartTick: null, pendingAttackTick: null,
      nextAttackStartTick: creationTick, returning: false, returnFailure: null
    };
  }
  function createOpeningEntity(seat, kind, occurrence, slot) {
    const definition = representatives[kind];
    const direction = seat.facing === "right" ? 1 : -1;
    const x = Math.round((seat.x + slot.forward * direction) * configuration.positionScale);
    const y = Math.round((seat.y + slot.lateral) * configuration.positionScale);
    return {
      id: `seat-${seat.seat}-${kind}-${occurrence}`, ownerSeat: seat.seat, kind,
      x, y, radius: definition.radius, speedPerTick: definition.speedPerTick,
      facing: seat.facing, ...combatFields(definition, x, y, 0)
    };
  }
  function openingState(map, seed) {
    if (!safeInteger(seed, 0, 0xffffffff)) throw new RangeError("seed must be an unsigned 32-bit integer");
    const factions = seatFactions(map);
    const structures = authoredStructures(map).map(fixedStructure);
    const navigator = navigationApi.createNavigator(map, configuration, structures);
    const largestRadius = configuration.largestRallyRadiusWorld * configuration.positionScale;
    for (const producer of authoredStructures(map).filter((value) => value.spawnSlots.length)) {
      const reference = {
        x: Math.round(producer.spawnSlots[0].x * configuration.positionScale),
        y: Math.round(producer.spawnSlots[0].y * configuration.positionScale)
      };
      for (const slot of producer.spawnSlots) {
        const point = { x: Math.round(slot.x * configuration.positionScale), y: Math.round(slot.y * configuration.positionScale) };
        if (!navigator.isPointClear(point, largestRadius)
          || !navigator.findRoute(reference, point, largestRadius).ok) throw new Error(`${slot.id} is not statically reachable`);
      }
    }
    const entities = [];
    for (const seat of [...map.layers.anchors.playerSeats].sort((a, b) => a.seat - b.seat)) {
      const occurrences = new Map();
      const roster = factionRosters[factions.get(seat.seat)];
      for (let index = 0; index < roster.length; index += 1) {
        const kind = roster[index];
        const occurrence = (occurrences.get(kind) || 0) + 1;
        occurrences.set(kind, occurrence);
        const entity = createOpeningEntity(seat, kind, occurrence, openingSlots[index]);
        if (!navigator.isPointClear(entity, entity.radius)) throw new Error(`${entity.id} opening position is blocked`);
        entities.push(entity);
      }
    }
    entities.sort((a, b) => compareIdentifiers(a.id, b.id));
    for (let a = 0; a < entities.length; a += 1) for (let b = a + 1; b < entities.length; b += 1) {
      if (overlaps(entities[a], entities[b])) throw new Error("opening combat entities overlap");
    }
    const players = [1, 2].map((seat) => ({
      seat, faction: factions.get(seat), resources: configuration.startingResources,
      populationUsed: entities.filter((entity) => entity.ownerSeat === seat)
        .reduce((total, entity) => total + representatives[entity.kind].population, 0),
      populationReserved: 0, populationCap: configuration.populationCap
    }));
    return {
      schemaVersion: configuration.schemaVersion, protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId, mapId: String(map.id), seed, tick: 0,
      nextSequence: 1, nextEntityNumber: 1, nextQueueNumber: 1, nextProjectileNumber: 1,
      match: { status: "active", winnerSeat: null, completedTick: null },
      players, structures, entities, projectiles: [], pendingCommands: []
    };
  }

  function stateById(state) {
    return {
      entities: new Map(state.entities.map((value) => [value.id, value])),
      structures: new Map(state.structures.map((value) => [value.id, value])),
      players: new Map(state.players.map((value) => [value.seat, value]))
    };
  }
  function structureAuthoredById(map) { return new Map(authoredStructures(map).map((value) => [value.id, value])); }
  function targetFor(state, id) {
    return state.entities.find((value) => value.id === id)
      || state.structures.find((value) => value.id === id) || null;
  }
  function targetLiving(value) {
    return Boolean(value) && value.health > 0 && value.destroyed !== true;
  }
  function hostileTo(value, seat) {
    return targetLiving(value) && value.ownerSeat !== null && value.ownerSeat !== seat;
  }
  function rallyLegality(map, navigator, structure, destination) {
    const authored = structureAuthoredById(map).get(structure.id);
    if (!authored || authored.spawnSlots.length !== 6) return "spawn-slots";
    const radius = configuration.largestRallyRadiusWorld * configuration.positionScale;
    if (!navigator.isPointClear(destination, radius)) return "blocked-destination";
    const first = authored.spawnSlots[0];
    const start = { x: Math.round(first.x * configuration.positionScale), y: Math.round(first.y * configuration.positionScale) };
    return navigator.findRoute(start, destination, radius).ok ? null : "unreachable";
  }
  function validateSubmitReferences(state, map, navigator, value) {
    const lookup = stateById(state);
    if (TACTICAL_KINDS.has(value.kind)) {
      for (const id of value.entityIds) {
        const entity = lookup.entities.get(id);
        if (!entity) return "missing-entity";
        if (entity.ownerSeat !== value.issuingPlayer) return "foreign-entity";
      }
      if (value.kind === "MOVE" || value.kind === "ATTACK_MOVE") {
        for (const id of value.entityIds) if (!navigator.isPointClear(value.destination, lookup.entities.get(id).radius)) return "blocked-destination";
      } else if (value.kind === "ATTACK_ENTITY") {
        const target = targetFor(state, value.targetId);
        if (!target) return "missing-target";
        if (!hostileTo(target, value.issuingPlayer)) return "not-hostile";
      } else if (value.kind === "DEFEND") {
        if (value.anchor.kind === "point") {
          for (const id of value.entityIds) if (!navigator.isPointClear(value.anchor.destination, lookup.entities.get(id).radius)) return "blocked-destination";
        } else {
          const anchor = lookup.entities.get(value.anchor.entityId) || lookup.structures.get(value.anchor.entityId);
          if (!targetLiving(anchor)) return "missing-anchor";
          if (anchor.ownerSeat !== value.issuingPlayer) return "foreign-anchor";
        }
      }
      return null;
    }
    const structure = lookup.structures.get(value.structureId);
    if (!structure) return "missing-structure";
    if (structure.destroyed) return "destroyed";
    if (structure.ownerSeat !== value.issuingPlayer) return "foreign-structure";
    if (structure.category !== "headquarters" && structure.category !== "production-outpost") return "not-producer";
    if (value.kind === "QUEUE_PRODUCTION") {
      const player = lookup.players.get(value.issuingPlayer);
      if (!representatives[value.entityKind] || !productionRosters[player.faction].includes(value.entityKind)) return "entity-kind";
    } else if (value.kind === "CANCEL_PRODUCTION") {
      if (!structure.queue.some((item) => item.id === value.queueItemId)) return "missing-queue-item";
    } else if (value.kind === "SET_RALLY") return rallyLegality(map, navigator, structure, value.destination);
    return null;
  }
  function validateSubmission(state, map, navigator, value, sequenced) {
    if (state.match.status === "complete") return "match-complete";
    const shape = validateCommandShape(value, sequenced);
    if (shape) return shape;
    if (!safeInteger(value.targetTick, state.tick + configuration.commandLeadMinTicks, state.tick + configuration.commandLeadMaxTicks)) return "target-tick";
    if (!safeInteger(state.nextSequence, 1, Number.MAX_SAFE_INTEGER - 1)) return "sequence";
    if (sequenced && value.sequence !== state.nextSequence) return "sequence";
    if (state.pendingCommands.length >= configuration.pendingCommandCap) return "command-cap";
    return validateSubmitReferences(state, map, navigator, value);
  }

  function validStoredAnchor(value) {
    if (value === null) return true;
    if (!plainObject(value) || (value.kind !== "point" && value.kind !== "entity")) return false;
    if (value.kind === "point") return exactKeys(value, ["destination", "kind"]) && validatePointShape(value.destination);
    return exactKeys(value, ["entityId", "kind", "lastRoot"])
      && validIdentifier(value.entityId, configuration.structureIdMaxLength) && validatePointShape(value.lastRoot);
  }
  function validateRoute(route, index, destination, navigator, radius, label) {
    if (!denseArray(route) || route.length > configuration.routeWaypointCap
      || !safeInteger(index, 0, route.length)) throw new Error(`${label} route is invalid`);
    let previous = null;
    for (const point of route) {
      if (!validatePointShape(point) || !navigator.isPointClear(point, radius)
        || (previous && !navigator.isSegmentClear(previous, point, radius))) throw new Error(`${label} route is invalid`);
      previous = point;
    }
    if (destination !== null && (!validatePointShape(destination) || !route.length
      || route.at(-1).x !== destination.x || route.at(-1).y !== destination.y)) throw new Error(`${label} destination is invalid`);
    if (destination === null && (route.length || index)) throw new Error(`${label} has a route without a destination`);
  }

  function validatedState(snapshot, map) {
    validateSerializedSize(snapshot, configuration.snapshotByteCap, "snapshot");
    if (!exactKeys(snapshot, SNAPSHOT_KEYS)) throw new TypeError("snapshot has unknown or missing fields");
    if (snapshot.schemaVersion !== configuration.schemaVersion || snapshot.protocolVersion !== configuration.protocolVersion
      || snapshot.configurationId !== configuration.configurationId) throw new Error("snapshot identity is incompatible");
    if (snapshot.mapId !== String(map.id)) throw new Error("snapshot map identity does not match");
    if (!safeInteger(snapshot.seed, 0, 0xffffffff) || !safeInteger(snapshot.tick, 0, configuration.simulationTickCap)
      || !safeInteger(snapshot.nextSequence, 1) || !safeInteger(snapshot.nextEntityNumber, 1, configuration.generatedIdCap + 1)
      || !safeInteger(snapshot.nextQueueNumber, 1, configuration.generatedIdCap + 1)
      || !safeInteger(snapshot.nextProjectileNumber, 1, configuration.projectileIdCap + 1)) throw new Error("snapshot counters are invalid");
    if (!exactKeys(snapshot.match, MATCH_KEYS)
      || (snapshot.match.status !== "active" && snapshot.match.status !== "complete")
      || (snapshot.match.winnerSeat !== null && snapshot.match.winnerSeat !== 1 && snapshot.match.winnerSeat !== 2)
      || (snapshot.match.completedTick !== null && !safeInteger(snapshot.match.completedTick, 1, snapshot.tick))) {
      throw new Error("snapshot match outcome is invalid");
    }
    if ((snapshot.match.status === "active") !== (snapshot.match.completedTick === null)) throw new Error("snapshot match outcome is inconsistent");
    if (snapshot.match.status === "complete" && snapshot.match.completedTick !== snapshot.tick) {
      throw new Error("snapshot match outcome is inconsistent");
    }

    const factionBySeat = seatFactions(map);
    if (!denseArray(snapshot.players) || snapshot.players.length !== 2) throw new Error("snapshot players are invalid");
    const players = snapshot.players.map((value, index) => {
      if (!exactKeys(value, PLAYER_KEYS) || value.seat !== index + 1 || value.faction !== factionBySeat.get(value.seat)
        || !safeInteger(value.resources) || !safeInteger(value.populationUsed, 0, configuration.populationCap)
        || !safeInteger(value.populationReserved, 0, configuration.populationCap)
        || value.populationUsed + value.populationReserved > configuration.populationCap
        || value.populationCap !== configuration.populationCap) throw new Error("snapshot player economy is invalid");
      return clonePlayer(value);
    });

    const authored = authoredStructures(map);
    if (!denseArray(snapshot.structures) || snapshot.structures.length !== authored.length) throw new Error("snapshot structures are invalid");
    const seenQueueIds = new Set();
    const structures = snapshot.structures.map((value, index) => {
      const expected = authored[index];
      if (!exactKeys(value, STRUCTURE_KEYS) || value.id !== expected.id || value.category !== expected.category
        || value.x !== Math.round(expected.x * configuration.positionScale)
        || value.y !== Math.round(expected.y * configuration.positionScale)
        || value.radius !== Math.round(expected.radius * configuration.positionScale)
        || value.maxHealth !== expected.maximumHealth || !safeInteger(value.health, 0, value.maxHealth)
        || typeof value.destroyed !== "boolean" || value.destroyed !== (value.health === 0)
        || (value.ownerSeat !== null && value.ownerSeat !== 1 && value.ownerSeat !== 2)
        || !exactKeys(value.capture, CAPTURE_KEYS) || !denseArray(value.queue)
        || value.queue.length > configuration.productionQueueCap) throw new Error("snapshot structure state is invalid");
      if (value.category === "headquarters") {
        if (value.capture.challengerSeat !== null || value.capture.progressTicks !== 0
          || (!value.destroyed && value.ownerSeat !== expected.initialOwnerSeat)) throw new Error("headquarters state is invalid");
      } else if ((value.capture.challengerSeat !== null && value.capture.challengerSeat !== 1 && value.capture.challengerSeat !== 2)
        || !safeInteger(value.capture.progressTicks, 0, configuration.captureRequiredTicks - 1)
        || (value.capture.progressTicks === 0) !== (value.capture.challengerSeat === null)
        || (value.capture.challengerSeat !== null && value.capture.challengerSeat === value.ownerSeat)) {
        throw new Error("capture state is invalid");
      }
      if (value.destroyed && (value.ownerSeat !== null || value.queue.length || value.rally !== null
        || value.capture.challengerSeat !== null || value.capture.progressTicks !== 0)) throw new Error("destroyed structure retains active state");
      let previousQueueId = null;
      const queue = value.queue.map((item) => {
        if (!exactKeys(item, QUEUE_KEYS) || !/^queue-\d{8}$/.test(item.id) || seenQueueIds.has(item.id)
          || (previousQueueId !== null && compareIdentifiers(previousQueueId, item.id) >= 0)
          || (item.ownerSeat !== 1 && item.ownerSeat !== 2) || item.ownerSeat !== value.ownerSeat
          || !representatives[item.entityKind] || representatives[item.entityKind].faction !== factionBySeat.get(item.ownerSeat)
          || !safeInteger(item.progressTicks, 0, representatives[item.entityKind].productionTicks)
          || typeof item.blockedComplete !== "boolean"
          || item.blockedComplete !== (item.progressTicks === representatives[item.entityKind].productionTicks)) {
          throw new Error("snapshot queue item is invalid");
        }
        previousQueueId = item.id; seenQueueIds.add(item.id); return cloneQueueItem(item);
      });
      if (queue.some((item, queueIndex) => queueIndex > 0 && item.progressTicks !== 0)) throw new Error("only queue head may progress");
      if (value.category !== "headquarters" && value.category !== "production-outpost" && queue.length) throw new Error("non-producer structure retains a production queue");
      return { ...cloneStructure(value), queue };
    });

    const navigator = navigationApi.createNavigator(map, configuration, structures);
    for (const value of structures) if (value.rally !== null
      && (!validatePointShape(value.rally) || value.destroyed || value.ownerSeat === null
        || (value.category !== "headquarters" && value.category !== "production-outpost")
        || rallyLegality(map, navigator, value, value.rally))) throw new Error("snapshot rally is invalid");

    if (!denseArray(snapshot.entities) || snapshot.entities.length > configuration.combatEntityCap) throw new Error("snapshot entity collection exceeds its bound");
    const entities = [];
    let previousEntityId = null;
    for (const value of snapshot.entities) {
      const definition = representatives[value.kind];
      if (!exactKeys(value, ENTITY_KEYS) || !validIdentifier(value.id)
        || (previousEntityId !== null && compareIdentifiers(previousEntityId, value.id) >= 0)
        || !definition || (value.ownerSeat !== 1 && value.ownerSeat !== 2)
        || definition.faction !== factionBySeat.get(value.ownerSeat)
        || value.radius !== definition.radius || value.speedPerTick !== definition.speedPerTick
        || value.maxHealth !== definition.health || !safeInteger(value.health, 1, value.maxHealth)
        || !safeInteger(value.x, 0, configuration.worldExtentFixedCap)
        || !safeInteger(value.y, 0, configuration.worldExtentFixedCap)
        || !navigator.isPointClear(value, value.radius)
        || (value.facing !== "right" && value.facing !== "left") || !ORDERS.has(value.order)
        || (value.targetId !== null && !validIdentifier(value.targetId, configuration.structureIdMaxLength))
        || (value.commandRoot !== null && !validatePointShape(value.commandRoot))
        || (value.engagementRoot !== null && !validatePointShape(value.engagementRoot))
        || !validatePointShape(value.idleRoot) || !validStoredAnchor(value.defendAnchor)
        || !safeInteger(value.repathCount, 0, configuration.repathAttemptCap)
        || !exactKeys(value.progress, ["distance", "stalledTicks"]) || !safeInteger(value.progress.distance)
        || !safeInteger(value.progress.stalledTicks, 0, configuration.congestionTicks)
        || !safeInteger(value.savedRepathCount, 0, configuration.repathAttemptCap)
        || !exactKeys(value.savedProgress, ["distance", "stalledTicks"]) || !safeInteger(value.savedProgress.distance)
        || !safeInteger(value.savedProgress.stalledTicks, 0, configuration.congestionTicks)
        || (value.reservation !== null && (!exactKeys(value.reservation, RESERVATION_KEYS)
          || value.reservation.targetId !== value.targetId
          || !safeInteger(value.reservation.slotIndex, 0, configuration.reservationCapPerTarget - 1)))
        || (value.reservationWait !== null && (!exactKeys(value.reservationWait, RESERVATION_WAIT_KEYS)
          || value.reservationWait.targetId !== value.targetId || !safeInteger(value.reservationWait.targetX)
          || !safeInteger(value.reservationWait.targetY) || typeof value.reservationWait.attackerRoster !== "string"
          || value.reservationWait.attackerRoster.length > configuration.combatEntityCap * (configuration.entityIdMaxLength + 1)))
        || (value.attackStartTick !== null && !safeInteger(value.attackStartTick, 1, snapshot.tick))
        || (value.pendingAttackTick !== null && !safeInteger(value.pendingAttackTick, snapshot.tick + 1,
          configuration.simulationTickCap + definition.contactOffsetTicks))
        || !safeInteger(value.nextAttackStartTick, 0,
          configuration.simulationTickCap + definition.attackCycleTicks)
        || value.nextAttackStartTick > snapshot.tick + definition.attackCycleTicks
        || typeof value.returning !== "boolean"
        || (value.returnFailure !== null && value.returnFailure !== "defend-return-unreachable")) {
        throw new Error("snapshot entity state is invalid");
      }
      validateRoute(value.route, value.routeIndex, value.formationDestination, navigator, value.radius, "snapshot entity");
      validateRoute(value.savedRoute, value.savedRouteIndex, value.savedDestination, navigator, value.radius, "snapshot saved");
      if (value.reservation !== null && value.targetId === null
        || value.reservation !== null && value.reservationWait !== null
        || value.reservationWait !== null && value.targetId === null
        || value.pendingAttackTick !== null && (value.attackStartTick === null || value.targetId === null || value.reservation === null)
        || value.targetId === null && value.attackStartTick !== null) throw new Error("snapshot combat timing is inconsistent");
      if (value.returning && (value.targetId !== null || value.reservation !== null
        || value.reservationWait !== null || value.attackStartTick !== null || value.pendingAttackTick !== null)) {
        throw new Error("snapshot return state is inconsistent");
      }
      if (value.returning && (!RETURNING_ORDERS.has(value.order)
        || value.order === "ATTACK_MOVE" && value.engagementRoot === null)) {
        throw new Error("snapshot return state is inconsistent");
      }
      if (value.returnFailure !== null && (value.order !== "DEFEND" || value.returning)) {
        throw new Error("snapshot return state is inconsistent");
      }
      if (value.attackStartTick !== null
        && value.nextAttackStartTick !== value.attackStartTick + definition.attackCycleTicks) {
        throw new Error("snapshot active attack timing is inconsistent");
      }
      if (value.attackStartTick !== null
        && ((value.attackStartTick + definition.contactOffsetTicks > snapshot.tick)
          !== (value.pendingAttackTick !== null))) {
        throw new Error("snapshot active attack timing is inconsistent");
      }
      if (value.pendingAttackTick !== null
        && value.pendingAttackTick !== value.attackStartTick + definition.contactOffsetTicks) {
        throw new Error("snapshot active attack timing is inconsistent");
      }
      if (value.order !== "ATTACK_MOVE" && (value.savedRoute.length || value.savedDestination !== null || value.savedRouteIndex
        || value.savedRepathCount || value.savedProgress.distance || value.savedProgress.stalledTicks)) {
        throw new Error("non-attack-move entity retains a saved route");
      }
      if (value.order !== "DEFEND" && value.defendAnchor !== null) throw new Error("non-defender retains a defend anchor");
      if (value.order !== "ATTACK_MOVE" && value.engagementRoot !== null) {
        throw new Error("non-attack-move entity retains an engagement root");
      }
      if (value.order === "STOP" && (value.targetId !== null || value.reservation !== null || value.pendingAttackTick !== null
        || value.route.length || value.formationDestination !== null || value.commandRoot !== null || value.returning)) {
        throw new Error("stopped entity retains combat state");
      }
      if (value.order === "IDLE" && (value.commandRoot !== null || value.engagementRoot !== null
        || (value.targetId === null && !value.returning && (value.route.length || value.formationDestination !== null)))) {
        throw new Error("idle entity retains an incompatible order state");
      }
      if (value.order === "MOVE" && (value.targetId !== null || value.commandRoot === null
        || value.route.length === 0 || value.formationDestination === null || value.returning)) {
        throw new Error("moving entity state is inconsistent");
      }
      if (value.order === "ATTACK_ENTITY" && snapshot.match.status === "active"
        && (value.targetId === null || value.commandRoot === null || value.returning)) {
        throw new Error("focus entity state is inconsistent");
      }
      if (value.order === "ATTACK_MOVE" && (value.commandRoot === null || value.savedRoute.length === 0
        || value.savedDestination === null
        || ((value.targetId !== null || value.returning) !== (value.engagementRoot !== null)))) {
        throw new Error("attack-move entity state is inconsistent");
      }
      if (value.order === "DEFEND" && (value.commandRoot === null || value.defendAnchor === null)) {
        throw new Error("defend entity state is inconsistent");
      }
      previousEntityId = value.id;
      entities.push(cloneEntity(value));
    }
    for (let first = 0; first < entities.length; first += 1) for (let second = first + 1; second < entities.length; second += 1) {
      if (overlaps(entities[first], entities[second])) throw new Error("snapshot entities overlap");
    }
    const structureIds = new Set(structures.map((value) => value.id));
    if (entities.some((value) => structureIds.has(value.id))) throw new Error("snapshot entity and structure identifiers collide");
    const allTargets = new Map([...entities, ...structures].map((value) => [value.id, value]));
    const reservationKeys = new Set();
    for (const entity of entities) {
      if (entity.defendAnchor?.kind === "entity") {
        const anchor = allTargets.get(entity.defendAnchor.entityId);
        if (!targetLiving(anchor) || anchor.ownerSeat !== entity.ownerSeat
          || entity.defendAnchor.lastRoot.x !== anchor.x || entity.defendAnchor.lastRoot.y !== anchor.y) {
          throw new Error("snapshot defend anchor is invalid");
        }
      }
      if (entity.targetId !== null && (!hostileTo(allTargets.get(entity.targetId), entity.ownerSeat) || entity.targetId === entity.id)) {
        throw new Error("snapshot target is invalid");
      }
      if (entity.reservation) {
        const key = `${entity.reservation.targetId}\u0000${entity.reservation.slotIndex}`;
        if (reservationKeys.has(key)) throw new Error("snapshot reservations collide");
        reservationKeys.add(key);
      }
      if (entity.reservationWait) {
        const target = allTargets.get(entity.reservationWait.targetId);
        const roster = entities.filter((candidate) => candidate.targetId === entity.reservationWait.targetId)
          .map((candidate) => candidate.id).sort(compareIdentifiers).join("|");
        if (!target || entity.reservationWait.targetX !== target.x || entity.reservationWait.targetY !== target.y
          || entity.reservationWait.attackerRoster !== roster) throw new Error("snapshot reservation wait is invalid");
      }
    }

    if (!denseArray(snapshot.projectiles) || snapshot.projectiles.length > configuration.projectileCap) throw new Error("snapshot projectiles exceed their bound");
    const projectiles = [];
    let previousProjectileId = null;
    const rangedSourceRadii = new Set(Object.values(representatives)
      .filter((definition) => definition.role === "ranged").map((definition) => definition.radius));
    const targetRadii = new Set([
      ...Object.values(representatives).map((definition) => definition.radius),
      ...structures.map((structure) => structure.radius)
    ]);
    for (const value of snapshot.projectiles) {
      const launchRootDistance = distanceFixed(
        { x: value.launchX, y: value.launchY },
        { x: value.launchTargetX, y: value.launchTargetY }
      );
      const expectedTravelTicks = safeInteger(value.launchEdgeDistance)
        ? Math.max(configuration.projectileTravelTickMin, Math.min(
          configuration.projectileTravelTickMax,
          Math.ceil(value.launchEdgeDistance / configuration.projectileSpeedFixed)
        ))
        : null;
      if (!exactKeys(value, PROJECTILE_KEYS) || !/^projectile-\d{12}$/.test(value.id)
        || (previousProjectileId !== null && compareIdentifiers(previousProjectileId, value.id) >= 0)
        || (value.sourceSeat !== 1 && value.sourceSeat !== 2) || !validIdentifier(value.targetId, configuration.structureIdMaxLength)
        || value.damage !== combatByRole.ranged.damage || !safeInteger(value.launchTick, 1, snapshot.tick)
        || !safeInteger(value.arrivalTick, snapshot.tick + 1,
          configuration.simulationTickCap + configuration.projectileTravelTickMax)
        || expectedTravelTicks === null || value.arrivalTick !== value.launchTick + expectedTravelTicks
        || !safeInteger(value.launchX, 0, configuration.worldExtentFixedCap)
        || !safeInteger(value.launchY, 0, configuration.worldExtentFixedCap)
        || !safeInteger(value.launchTargetX, 0, configuration.worldExtentFixedCap)
        || !safeInteger(value.launchTargetY, 0, configuration.worldExtentFixedCap)
        || !rangedSourceRadii.has(value.launchSourceRadius) || !targetRadii.has(value.launchTargetRadius)
        || (allTargets.has(value.targetId) && value.launchTargetRadius !== allTargets.get(value.targetId).radius)
        || value.launchEdgeDistance > combatByRole.ranged.attackRangeWorld * configuration.positionScale
        || launchRootDistance < value.launchSourceRadius + value.launchTargetRadius
        || value.launchEdgeDistance !== launchRootDistance - value.launchSourceRadius - value.launchTargetRadius) {
        throw new Error("snapshot projectile is invalid");
      }
      previousProjectileId = value.id; projectiles.push(cloneProjectile(value));
      if (Number(value.id.slice("projectile-".length)) >= snapshot.nextProjectileNumber) throw new Error("snapshot next projectile number is not monotonic");
    }
    for (const entity of entities) {
      const match = /^entity-(\d{8})$/.exec(entity.id);
      if (match && Number(match[1]) >= snapshot.nextEntityNumber) throw new Error("snapshot next entity number is not monotonic");
    }
    for (const queueId of seenQueueIds) if (Number(queueId.slice("queue-".length)) >= snapshot.nextQueueNumber) {
      throw new Error("snapshot next queue number is not monotonic");
    }
    for (const player of players) {
      const used = entities.filter((entity) => entity.ownerSeat === player.seat)
        .reduce((total, entity) => total + representatives[entity.kind].population, 0);
      const reserved = structures.flatMap((value) => value.queue).filter((item) => item.ownerSeat === player.seat)
        .reduce((total, item) => total + representatives[item.entityKind].population, 0);
      if (used !== player.populationUsed || reserved !== player.populationReserved) throw new Error("snapshot population accounting is inconsistent");
      const refundable = structures.flatMap((value) => value.queue).filter((item) => item.ownerSeat === player.seat)
        .reduce((total, item) => total + representatives[item.entityKind].cost, 0);
      if (player.resources > Number.MAX_SAFE_INTEGER - refundable) throw new Error("snapshot Resource cannot safely settle its production queue");
    }
    const destroyedHeadquarters = structures.filter((value) => value.category === "headquarters" && value.destroyed);
    if (snapshot.match.status === "active" && destroyedHeadquarters.length) throw new Error("active match has a destroyed headquarters");
    if (snapshot.match.status === "complete") {
      const expectedWinner = destroyedHeadquarters.length === 2 ? null
        : destroyedHeadquarters.length === 1 ? (destroyedHeadquarters[0].id === "astral-headquarters-anchor" ? 2 : 1) : undefined;
      if (expectedWinner === undefined || snapshot.match.winnerSeat !== expectedWinner || snapshot.pendingCommands.length) {
        throw new Error("completed match outcome is inconsistent");
      }
    }

    if (!denseArray(snapshot.pendingCommands) || snapshot.pendingCommands.length > configuration.pendingCommandCap) throw new Error("snapshot pending commands exceed their bound");
    const pendingCommands = [];
    let previousCommand = null;
    const seenSequences = new Set();
    for (const value of snapshot.pendingCommands) {
      const error = validateCommandShape(value, true);
      if (error || value.targetTick <= snapshot.tick || value.targetTick > snapshot.tick + configuration.commandLeadMaxTicks
        || value.sequence >= snapshot.nextSequence || seenSequences.has(value.sequence)
        || (previousCommand && commandOrder(previousCommand, value) >= 0)) throw new Error(`snapshot command is invalid: ${error || "order"}`);
      pendingCommands.push(cloneCommand(value)); previousCommand = value; seenSequences.add(value.sequence);
    }
    return {
      schemaVersion: snapshot.schemaVersion, protocolVersion: snapshot.protocolVersion,
      configurationId: snapshot.configurationId, mapId: snapshot.mapId, seed: snapshot.seed,
      tick: snapshot.tick, nextSequence: snapshot.nextSequence,
      nextEntityNumber: snapshot.nextEntityNumber, nextQueueNumber: snapshot.nextQueueNumber,
      nextProjectileNumber: snapshot.nextProjectileNumber, match: cloneMatch(snapshot.match),
      players, structures, entities, projectiles, pendingCommands
    };
  }

  function createEngine(state, map) {
    const navigator = navigationApi.createNavigator(map, configuration, () => state.structures);
    const authoredById = structureAuthoredById(map);

    function playerFor(seat) { return state.players[seat - 1]; }
    function entityFor(id) { return state.entities.find((entity) => entity.id === id); }
    function structureFor(id) { return state.structures.find((structure) => structure.id === id); }
    function enqueue(command) {
      state.pendingCommands.push(cloneCommand(command));
      state.pendingCommands.sort(commandOrder);
      state.nextSequence = command.sequence + 1;
      return Object.freeze({ ok: true, acceptedTick: state.tick, command: frozenCommand(command) });
    }
    function submitCommand(request) {
      const error = validateSubmission(state, map, navigator, request, false);
      if (error) return Object.freeze({ ok: false, code: error });
      return enqueue({ ...request, sequence: state.nextSequence });
    }
    function acceptCommand(command) {
      const error = validateSubmission(state, map, navigator, command, true);
      if (error) return Object.freeze({ ok: false, code: error });
      return enqueue(command);
    }

    function clearMovement(entity) {
      entity.route = []; entity.routeIndex = 0; entity.formationDestination = null;
      entity.repathCount = 0; entity.progress = { distance: 0, stalledTicks: 0 };
    }
    function clearSavedMovement(entity) {
      entity.savedRoute = []; entity.savedRouteIndex = 0; entity.savedDestination = null;
      entity.savedRepathCount = 0; entity.savedProgress = { distance: 0, stalledTicks: 0 };
    }
    function cancelPendingAttack(entity) {
      entity.attackStartTick = null; entity.pendingAttackTick = null;
    }
    function releaseCombat(entity) {
      entity.targetId = null; entity.reservation = null; entity.reservationWait = null; entity.engagementRoot = null;
      cancelPendingAttack(entity);
    }
    function enterIdle(entity, recordRoot = true) {
      releaseCombat(entity); clearMovement(entity); clearSavedMovement(entity);
      entity.order = "IDLE"; entity.commandRoot = null; entity.defendAnchor = null;
      entity.returning = false; entity.returnFailure = null;
      if (recordRoot) entity.idleRoot = { x: entity.x, y: entity.y };
    }
    function replaceOrder(entity, order) {
      releaseCombat(entity); clearMovement(entity); clearSavedMovement(entity);
      entity.order = order; entity.commandRoot = null; entity.defendAnchor = null;
      entity.returning = false; entity.returnFailure = null;
    }
    function planRoutes(entities, destinations) {
      const plans = [];
      for (const { entityId, destination } of destinations) {
        const entity = entities.find((value) => value.id === entityId);
        const route = navigator.findRoute(entity, destination, entity.radius);
        if (!route.ok) return { ok: false, code: "unreachable" };
        plans.push({ entity, destination: clonePoint(destination), route: route.waypoints.map(clonePoint) });
      }
      return { ok: true, plans };
    }
    function formationPlans(entityIds, destination, issuingPlayer) {
      const selected = entityIds.map(entityFor);
      if (selected.some((entity) => !entity || entity.ownerSeat !== issuingPlayer)) return { ok: false, code: "ownership" };
      const destinations = navigationApi.formationDestinations(selected, destination, configuration);
      return planRoutes(selected, destinations);
    }
    function installOrdinaryPlan(plan, order) {
      replaceOrder(plan.entity, order);
      plan.entity.route = plan.route; plan.entity.routeIndex = 0;
      plan.entity.formationDestination = plan.destination;
      plan.entity.progress = { distance: distanceFixed(plan.entity, plan.destination), stalledTicks: 0 };
      plan.entity.commandRoot = { x: plan.entity.x, y: plan.entity.y };
    }
    function assignMove(entityIds, destination, issuingPlayer) {
      const result = formationPlans(entityIds, destination, issuingPlayer);
      if (!result.ok) return result;
      for (const plan of result.plans) installOrdinaryPlan(plan, "MOVE");
      return { ok: true, code: "ok" };
    }
    function assignAttackMove(entityIds, destination, issuingPlayer) {
      const result = formationPlans(entityIds, destination, issuingPlayer);
      if (!result.ok) return result;
      for (const plan of result.plans) {
        installOrdinaryPlan(plan, "ATTACK_MOVE");
        plan.entity.savedRoute = plan.route.map(clonePoint);
        plan.entity.savedRouteIndex = 0;
        plan.entity.savedDestination = clonePoint(plan.destination);
        plan.entity.savedRepathCount = 0;
        plan.entity.savedProgress = { distance: plan.entity.progress.distance, stalledTicks: 0 };
      }
      return { ok: true, code: "ok" };
    }
    function focusSlotOrder(definition) {
      if (definition.role === "ranged") return Array.from({ length: 24 }, (_, index) => index);
      return [...Array.from({ length: 8 }, (_, index) => index), ...Array.from({ length: 16 }, (_, index) => index + 8)];
    }
    function assignFocus(entityIds, targetId, issuingPlayer) {
      const target = targetFor(state, targetId);
      const selected = entityIds.map(entityFor);
      if (!target || !hostileTo(target, issuingPlayer)) return { ok: false, code: "not-hostile" };
      if (selected.some((entity) => !entity || entity.ownerSeat !== issuingPlayer)) return { ok: false, code: "ownership" };
      const backups = new Map(state.entities.map((entity) => [entity.id, cloneEntity(entity)]));
      for (const entity of [...selected].sort((a, b) => compareIdentifiers(a.id, b.id))) {
        if (rootDistance(entity, target) > configuration.focusLeashWorld * configuration.positionScale) {
          return { ok: false, code: "focus-leash" };
        }
        let reachable = false;
        for (const slotIndex of focusSlotOrder(representatives[entity.kind])) {
          const point = navigationApi.reservationPoint(target, entity, representatives[entity.kind].role, slotIndex, configuration);
          if (!navigator.isPointClear(point, entity.radius)) continue;
          const route = navigator.findRoute(entity, point, entity.radius);
          if (!route.ok) continue;
          reachable = true;
          break;
        }
        if (!reachable) return { ok: false, code: "unreachable" };
      }
      for (const entity of selected) {
        replaceOrder(entity, "ATTACK_ENTITY");
        entity.commandRoot = { x: entity.x, y: entity.y };
        entity.targetId = targetId;
      }
      allocateReservations([]);
      if (selected.some((entity) => entity.targetId !== targetId || entity.reservation === null)) {
        for (const entity of state.entities) Object.assign(entity, backups.get(entity.id));
        return { ok: false, code: "unreachable" };
      }
      return { ok: true, code: "ok" };
    }
    function defendRoot(anchor) {
      if (anchor.kind === "point") return anchor.destination;
      const target = targetFor(state, anchor.entityId);
      return targetLiving(target) ? target : anchor.lastRoot;
    }
    function defendEntityPlans(selected, root, anchorTarget) {
      const sorted = [...selected].sort((a, b) => compareIdentifiers(a.id, b.id));
      const maximumRadius = Math.max(...sorted.map((entity) => entity.radius));
      const firstRing = anchorTarget.radius + maximumRadius + 16 * configuration.positionScale;
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
      const plans = [];
      for (const entity of sorted) {
        let plan = null;
        for (const slot of slots) {
          const slotKey = `${slot.ringIndex}:${slot.direction}`;
          if (occupied.has(slotKey)) continue;
          const offset = navigationApi.reservationOffset(slot.ring, slot.direction);
          const destination = { x: root.x + offset.x, y: root.y + offset.y };
          if (rootDistance(root, destination) > maximumRing
            || !navigator.isPointClear(destination, entity.radius)
            || plans.some((candidate) => overlaps(
              { ...destination, radius: entity.radius },
              { ...candidate.destination, radius: candidate.entity.radius }
            ))) continue;
          const route = navigator.findRoute(entity, destination, entity.radius);
          if (!route.ok) continue;
          occupied.add(slotKey);
          plan = { entity, destination, route: route.waypoints.map(clonePoint) };
          plans.push(plan);
          break;
        }
        if (!plan) return { ok: false, code: "unreachable" };
      }
      return { ok: true, plans };
    }
    function assignDefend(entityIds, externalAnchor, issuingPlayer) {
      const selected = entityIds.map(entityFor);
      if (selected.some((entity) => !entity || entity.ownerSeat !== issuingPlayer)) return { ok: false, code: "ownership" };
      let storedAnchor;
      let root;
      let anchorTarget = null;
      if (externalAnchor.kind === "point") {
        storedAnchor = { kind: "point", destination: clonePoint(externalAnchor.destination) };
        root = externalAnchor.destination;
      } else {
        anchorTarget = targetFor(state, externalAnchor.entityId);
        if (!targetLiving(anchorTarget) || anchorTarget.ownerSeat !== issuingPlayer) return { ok: false, code: "anchor" };
        root = { x: anchorTarget.x, y: anchorTarget.y };
        storedAnchor = { kind: "entity", entityId: anchorTarget.id, lastRoot: clonePoint(root) };
      }
      const result = externalAnchor.kind === "point"
        ? planRoutes(selected, navigationApi.formationDestinations(selected, root, configuration))
        : defendEntityPlans(selected, root, anchorTarget);
      if (!result.ok) return result;
      for (const plan of result.plans) {
        installOrdinaryPlan(plan, "DEFEND");
        plan.entity.defendAnchor = cloneAnchor(storedAnchor);
      }
      return { ok: true, code: "ok" };
    }
    function assignStop(entityIds, issuingPlayer) {
      const selected = entityIds.map(entityFor);
      if (selected.some((entity) => !entity || entity.ownerSeat !== issuingPlayer)) return { ok: false, code: "ownership" };
      for (const entity of selected) replaceOrder(entity, "STOP");
      return { ok: true, code: "ok" };
    }

    function refundableResourceForSeat(seat) {
      return state.structures.flatMap((value) => value.queue).filter((item) => item.ownerSeat === seat)
        .reduce((total, item) => total + representatives[item.entityKind].cost, 0);
    }
    function assertRefundCapacity(player, amount) {
      if (!safeInteger(amount) || player.resources > Number.MAX_SAFE_INTEGER - amount) throw new RangeError("Resource refund exceeds safe integer bound");
    }
    function refundItem(item) {
      const definition = representatives[item.entityKind];
      const player = playerFor(item.ownerSeat);
      assertRefundCapacity(player, definition.cost);
      player.resources += definition.cost;
      player.populationReserved -= definition.population;
    }
    function settleQueue(structure) {
      const count = structure.queue.length;
      if (count) {
        const refund = structure.queue.reduce((total, item) => total + representatives[item.entityKind].cost, 0);
        assertRefundCapacity(playerFor(structure.queue[0].ownerSeat), refund);
      }
      for (const item of structure.queue) refundItem(item);
      structure.queue = []; structure.rally = null;
      return count;
    }
    function settleStructureDestruction(structure) {
      if (structure.destroyed) return null;
      const priorOwnerSeat = structure.ownerSeat;
      const refundedItems = settleQueue(structure);
      structure.health = 0; structure.destroyed = true; structure.ownerSeat = null;
      structure.capture = { challengerSeat: null, progressTicks: 0 };
      return { priorOwnerSeat, refundedItems };
    }

    function executeCommand(command) {
      const base = { type: "command", sequence: command.sequence };
      let result;
      if (command.kind === "MOVE") result = assignMove(command.entityIds, command.destination, command.issuingPlayer);
      else if (command.kind === "ATTACK_MOVE") result = assignAttackMove(command.entityIds, command.destination, command.issuingPlayer);
      else if (command.kind === "ATTACK_ENTITY") result = assignFocus(command.entityIds, command.targetId, command.issuingPlayer);
      else if (command.kind === "DEFEND") result = assignDefend(command.entityIds, command.anchor, command.issuingPlayer);
      else if (command.kind === "STOP") result = assignStop(command.entityIds, command.issuingPlayer);
      if (result) return Object.freeze({ ...base, status: result.ok ? "applied" : "rejected", code: result.code });

      const structure = structureFor(command.structureId);
      if (!structure || structure.destroyed || structure.ownerSeat !== command.issuingPlayer) {
        return Object.freeze({ ...base, status: "rejected", code: !structure ? "missing-structure" : structure.destroyed ? "destroyed" : "ownership" });
      }
      if (structure.category !== "headquarters" && structure.category !== "production-outpost") {
        return Object.freeze({ ...base, status: "rejected", code: "not-producer" });
      }
      if (command.kind === "QUEUE_PRODUCTION") {
        const definition = representatives[command.entityKind];
        const player = playerFor(command.issuingPlayer);
        if (!definition || definition.faction !== player.faction) return Object.freeze({ ...base, status: "rejected", code: "entity-kind" });
        if (structure.queue.length >= configuration.productionQueueCap) return Object.freeze({ ...base, status: "rejected", code: "queue-cap" });
        if (player.resources < definition.cost) return Object.freeze({ ...base, status: "rejected", code: "resources" });
        if (player.populationUsed + player.populationReserved + definition.population > player.populationCap) {
          return Object.freeze({ ...base, status: "rejected", code: "population-cap" });
        }
        if (state.nextQueueNumber > configuration.generatedIdCap) return Object.freeze({ ...base, status: "rejected", code: "queue-id-cap" });
        const queueItemId = `queue-${String(state.nextQueueNumber).padStart(8, "0")}`;
        state.nextQueueNumber += 1; player.resources -= definition.cost; player.populationReserved += definition.population;
        structure.queue.push({ id: queueItemId, ownerSeat: player.seat, entityKind: command.entityKind, progressTicks: 0, blockedComplete: false });
        return Object.freeze({ ...base, status: "applied", code: "ok", queueItemId });
      }
      if (command.kind === "CANCEL_PRODUCTION") {
        const index = structure.queue.findIndex((item) => item.id === command.queueItemId);
        if (index < 0) return Object.freeze({ ...base, status: "rejected", code: "missing-queue-item" });
        const item = structure.queue[index]; refundItem(item); structure.queue.splice(index, 1);
        return Object.freeze({ ...base, status: "applied", code: "refunded", queueItemId: item.id });
      }
      if (command.kind === "SET_RALLY") {
        const error = rallyLegality(map, navigator, structure, command.destination);
        if (error) return Object.freeze({ ...base, status: "rejected", code: error });
        structure.rally = clonePoint(command.destination);
        return Object.freeze({ ...base, status: "applied", code: "ok" });
      }
      structure.rally = null;
      return Object.freeze({ ...base, status: "applied", code: "ok" });
    }

    function currentDefendRoot(entity) {
      if (!entity.defendAnchor) return null;
      if (entity.defendAnchor.kind === "point") return entity.defendAnchor.destination;
      const anchor = targetFor(state, entity.defendAnchor.entityId);
      if (targetLiving(anchor) && anchor.ownerSeat === entity.ownerSeat) {
        entity.defendAnchor.lastRoot = { x: anchor.x, y: anchor.y };
        return entity.defendAnchor.lastRoot;
      }
      const frozen = clonePoint(entity.defendAnchor.lastRoot);
      entity.defendAnchor = { kind: "point", destination: frozen };
      return frozen;
    }
    function leashRoot(entity) {
      if (entity.order === "ATTACK_ENTITY") return entity.commandRoot;
      if (entity.order === "ATTACK_MOVE") return entity.engagementRoot;
      if (entity.order === "DEFEND") return currentDefendRoot(entity);
      if (entity.order === "IDLE") return entity.idleRoot;
      return null;
    }
    function leashWorld(entity) {
      if (entity.order === "ATTACK_ENTITY") return configuration.focusLeashWorld;
      if (entity.order === "ATTACK_MOVE") return configuration.attackMoveLeashWorld;
      if (entity.order === "DEFEND") return configuration.defendLeashWorld;
      return representatives[entity.kind].idleLeashWorld;
    }
    function targetAllowedForOrder(entity, target) {
      if (!hostileTo(target, entity.ownerSeat)) return false;
      const isStructure = Object.hasOwn(target, "category");
      if ((entity.order === "IDLE" || entity.order === "DEFEND") && isStructure) return false;
      const root = leashRoot(entity);
      return root !== null && rootDistance(root, target) <= leashWorld(entity) * configuration.positionScale;
    }
    function beginReturn(entity) {
      const engagementRoot = clonePoint(entity.engagementRoot);
      releaseCombat(entity);
      if (entity.order === "ATTACK_MOVE") entity.engagementRoot = engagementRoot;
      entity.returning = true; entity.returnFailure = null;
      clearMovement(entity);
    }
    function handleTargetLoss(entity) {
      if (entity.order === "ATTACK_ENTITY") enterIdle(entity);
      else if (entity.order === "ATTACK_MOVE" || entity.order === "DEFEND" || entity.order === "IDLE") beginReturn(entity);
      else releaseCombat(entity);
    }
    function acquisitionCandidates(entity) {
      if (entity.order === "STOP" || entity.order === "MOVE" || entity.order === "ATTACK_ENTITY" || entity.returning) return [];
      const definition = representatives[entity.kind];
      const values = [...state.entities];
      if (entity.order === "ATTACK_MOVE") values.push(...state.structures);
      return values.filter((target) => {
        if (target.id === entity.id || !hostileTo(target, entity.ownerSeat)
          || targetEdgeDistance(entity, target) > definition.awarenessWorld * configuration.positionScale) return false;
        if (entity.order === "ATTACK_MOVE") {
          return rootDistance(entity, target) <= configuration.attackMoveLeashWorld * configuration.positionScale;
        }
        return targetAllowedForOrder(entity, target);
      })
        .sort((first, second) => targetEdgeDistance(entity, first) - targetEdgeDistance(entity, second)
          || compareIdentifiers(first.id, second.id));
    }
    function validateAndAcquireTargets(events) {
      for (const entity of state.entities) {
        if (entity.order === "DEFEND") currentDefendRoot(entity);
        if (entity.targetId !== null) {
          const target = targetFor(state, entity.targetId);
          if (!targetAllowedForOrder(entity, target)) {
            const targetId = entity.targetId;
            handleTargetLoss(entity);
            events.push(Object.freeze({ type: "combat", status: "target-released", entityId: entity.id, targetId, code: "invalid-or-leash" }));
          }
        }
        if (entity.targetId !== null || entity.returning) continue;
        const candidates = acquisitionCandidates(entity);
        if (!candidates.length) continue;
        const target = candidates[0];
        clearMovement(entity);
        entity.targetId = target.id;
        if (entity.order === "ATTACK_MOVE") entity.engagementRoot = { x: entity.x, y: entity.y };
        events.push(Object.freeze({ type: "combat", status: "target-acquired", entityId: entity.id, targetId: target.id }));
      }
    }

    function reachableReservation(entity, target, slotIndex) {
      const role = representatives[entity.kind].role;
      const point = navigationApi.reservationPoint(target, entity, role, slotIndex, configuration);
      if (!navigator.isPointClear(point, entity.radius)) return false;
      if (navigator.isSegmentClear(entity, point, entity.radius)) return true;
      return navigator.findRoute(entity, point, entity.radius).ok;
    }
    function retainedReservationClear(entity, target, slotIndex) {
      const role = representatives[entity.kind].role;
      const point = navigationApi.reservationPoint(target, entity, role, slotIndex, configuration);
      if (!navigator.isPointClear(point, entity.radius)) return false;
      if (navigator.isSegmentClear(entity, point, entity.radius)) return true;
      if (entity.formationDestination?.x === point.x && entity.formationDestination.y === point.y
        && entity.routeIndex < entity.route.length) return true;
      return navigator.findRoute(entity, point, entity.radius).ok;
    }
    function allocationGroups(attackers) {
      const close = attackers.filter((entity) => representatives[entity.kind].role !== "ranged")
        .sort((a, b) => compareIdentifiers(a.id, b.id));
      const ranged = attackers.filter((entity) => representatives[entity.kind].role === "ranged")
        .sort((a, b) => compareIdentifiers(a.id, b.id));
      return { close, ranged };
    }
    function allocateReservations(events) {
      const byTarget = new Map();
      for (const entity of state.entities) {
        if (entity.targetId === null) { entity.reservation = null; entity.reservationWait = null; continue; }
        if (!byTarget.has(entity.targetId)) byTarget.set(entity.targetId, []);
        byTarget.get(entity.targetId).push(entity);
      }
      for (const [targetId, attackers] of [...byTarget].sort((a, b) => compareIdentifiers(a[0], b[0]))) {
        const target = targetFor(state, targetId);
        if (!targetLiving(target)) {
          for (const entity of attackers) handleTargetLoss(entity);
          continue;
        }
        const attackerRoster = attackers.map((entity) => entity.id).sort(compareIdentifiers).join("|");
        const dormant = new Set(attackers.filter((entity) => entity.reservation === null
          && entity.reservationWait?.targetId === targetId
          && entity.reservationWait.targetX === target.x && entity.reservationWait.targetY === target.y
          && entity.reservationWait.attackerRoster === attackerRoster).map((entity) => entity.id));
        const { close, ranged } = allocationGroups(attackers);
        const assigned = new Map();
        const occupied = new Set();
        const attemptRetain = (entity, allowed) => {
          const slot = entity.reservation?.targetId === targetId ? entity.reservation.slotIndex : -1;
          if (!allowed(slot) || occupied.has(slot) || !retainedReservationClear(entity, target, slot)) return false;
          occupied.add(slot); assigned.set(entity.id, slot); return true;
        };
        const attemptScan = (entity, indices) => {
          if (dormant.has(entity.id)) return false;
          for (const slot of indices) {
            if (occupied.has(slot) || !reachableReservation(entity, target, slot)) continue;
            occupied.add(slot); assigned.set(entity.id, slot); return true;
          }
          return false;
        };
        const firstRing = Array.from({ length: 8 }, (_, index) => index);
        const allSlots = Array.from({ length: 24 }, (_, index) => index);
        const outer = Array.from({ length: 16 }, (_, index) => index + 8);

        const closeWaiting = [];
        for (const entity of close) if (!attemptRetain(entity, (slot) => slot >= 0 && slot < 8)) closeWaiting.push(entity);
        const closeOuter = [];
        for (const entity of closeWaiting) if (!attemptScan(entity, firstRing)) closeOuter.push(entity);
        const rangedWaiting = [];
        for (const entity of ranged) if (!attemptRetain(entity, (slot) => slot >= 0 && slot < 24)) rangedWaiting.push(entity);
        for (const entity of rangedWaiting) attemptScan(entity, allSlots);
        const outerWaiting = [];
        for (const entity of closeOuter) if (!attemptRetain(entity, (slot) => slot >= 8 && slot < 24)) outerWaiting.push(entity);
        for (const entity of outerWaiting) attemptScan(entity, outer);

        for (const entity of attackers) {
          const previous = entity.reservation?.slotIndex;
          let slotIndex = assigned.get(entity.id);
          if (slotIndex === undefined && !dormant.has(entity.id)) {
            const candidates = representatives[entity.kind].role === "ranged" ? allSlots : [...firstRing, ...outer];
            const free = candidates.filter((slot) => !occupied.has(slot));
            if (free.length) {
              for (const candidate of free) if (reachableReservation(entity, target, candidate)) {
                slotIndex = candidate; occupied.add(candidate); assigned.set(entity.id, candidate); break;
              }
              if (slotIndex === undefined && previous !== undefined) {
                const releasedTargetId = entity.targetId;
                handleTargetLoss(entity);
                events.push(Object.freeze({ type: "combat", status: "target-released", entityId: entity.id,
                  targetId: releasedTargetId, code: "unreachable" }));
                continue;
              }
            }
          }
          entity.reservation = slotIndex === undefined ? null : { targetId, slotIndex };
          entity.reservationWait = slotIndex === undefined
            ? { targetId, targetX: target.x, targetY: target.y, attackerRoster }
            : null;
          if (slotIndex !== previous) {
            clearMovement(entity);
            if (slotIndex !== undefined) {
              const point = navigationApi.reservationPoint(
                target, entity, representatives[entity.kind].role, slotIndex, configuration
              );
              entity.progress = { distance: distanceFixed(entity, point), stalledTicks: 0 };
              events.push(Object.freeze({ type: "combat", status: "reservation", entityId: entity.id, targetId, slotIndex }));
            }
          }
        }
      }
    }

    function clearChangedReservationWaitTriggers() {
      for (const entity of state.entities) {
        const waiting = entity.reservationWait;
        if (!waiting) continue;
        const target = targetFor(state, waiting.targetId);
        const attackerRoster = state.entities.filter((candidate) => candidate.targetId === waiting.targetId)
          .map((candidate) => candidate.id).sort(compareIdentifiers).join("|");
        if (!target || waiting.targetX !== target.x || waiting.targetY !== target.y
          || waiting.attackerRoster !== attackerRoster) entity.reservationWait = null;
      }
    }

    function routeTowardPoint(entity, destination) {
      if (distanceFixed(entity, destination) <= entity.speedPerTick) {
        return { ok: true, x: destination.x, y: destination.y, routeIndex: entity.routeIndex };
      }
      let waypoint = destination;
      if (!navigator.isSegmentClear(entity, destination, entity.radius)) {
        if (!entity.formationDestination || entity.formationDestination.x !== destination.x
          || entity.formationDestination.y !== destination.y || entity.routeIndex >= entity.route.length) {
          const route = navigator.findRoute(entity, destination, entity.radius);
          if (!route.ok) return { ok: false };
          entity.route = route.waypoints.map(clonePoint); entity.routeIndex = 0;
          entity.formationDestination = clonePoint(destination);
          if (entity.targetId === null && !entity.returning) {
            entity.repathCount = 0;
            entity.progress = { distance: distanceFixed(entity, destination), stalledTicks: 0 };
          }
        }
        const routed = proposeRouteMovement(entity);
        return { ok: true, x: routed.x, y: routed.y, routeIndex: routed.routeIndex };
      }
      const deltaX = waypoint.x - entity.x;
      const deltaY = waypoint.y - entity.y;
      const distance = Math.hypot(deltaX, deltaY);
      let stepX = Math.trunc(deltaX * entity.speedPerTick / distance);
      let stepY = Math.trunc(deltaY * entity.speedPerTick / distance);
      if (stepX === 0 && stepY === 0) {
        if (Math.abs(deltaX) >= Math.abs(deltaY)) stepX = Math.sign(deltaX); else stepY = Math.sign(deltaY);
      }
      const next = { x: entity.x + stepX, y: entity.y + stepY };
      return navigator.isSegmentClear(entity, next, entity.radius)
        ? { ok: true, ...next, routeIndex: entity.routeIndex } : { ok: false };
    }
    function proposeRouteMovement(entity) {
      const proposal = { entity, x: entity.x, y: entity.y, routeIndex: entity.routeIndex, facing: entity.facing, moving: false };
      if (!entity.formationDestination || entity.routeIndex >= entity.route.length) return proposal;
      let remaining = entity.speedPerTick;
      let safety = 0;
      while (remaining > 0 && proposal.routeIndex < entity.route.length && safety <= configuration.routeWaypointCap) {
        const waypoint = entity.route[proposal.routeIndex];
        const deltaX = waypoint.x - proposal.x; const deltaY = waypoint.y - proposal.y;
        const distance = Math.hypot(deltaX, deltaY);
        if (deltaX !== 0) proposal.facing = deltaX > 0 ? "right" : "left";
        if (distance === 0) { proposal.routeIndex += 1; safety += 1; continue; }
        let nextX; let nextY;
        if (distance <= remaining) { nextX = waypoint.x; nextY = waypoint.y; }
        else {
          let stepX = Math.trunc(deltaX * remaining / distance); let stepY = Math.trunc(deltaY * remaining / distance);
          if (stepX === 0 && stepY === 0) { if (Math.abs(deltaX) >= Math.abs(deltaY)) stepX = Math.sign(deltaX); else stepY = Math.sign(deltaY); }
          nextX = proposal.x + stepX; nextY = proposal.y + stepY;
        }
        const next = { x: nextX, y: nextY };
        if (!navigator.isSegmentClear({ x: proposal.x, y: proposal.y }, next, entity.radius)) break;
        const travelled = Math.floor(Math.hypot(nextX - proposal.x, nextY - proposal.y));
        proposal.x = nextX; proposal.y = nextY; proposal.moving ||= travelled > 0;
        if (distance <= remaining) { proposal.routeIndex += 1; remaining = Math.max(0, remaining - travelled); } else remaining = 0;
        safety += 1;
      }
      return proposal;
    }
    function returnDestination(entity) {
      if (entity.order === "ATTACK_MOVE") return entity.engagementRoot;
      if (entity.order === "IDLE") return entity.idleRoot;
      return null;
    }
    function sameDefendAnchor(first, second) {
      if (!first || !second || first.kind !== second.kind) return false;
      if (first.kind === "entity") return first.entityId === second.entityId;
      return first.destination.x === second.destination.x && first.destination.y === second.destination.y;
    }
    function defendStandPoint(entity) {
      const root = currentDefendRoot(entity);
      if (!root) return null;
      const peers = state.entities.filter((candidate) => candidate.order === "DEFEND"
        && sameDefendAnchor(candidate.defendAnchor, entity.defendAnchor))
        .sort((a, b) => compareIdentifiers(a.id, b.id));
      const ordinal = Math.max(0, peers.findIndex((candidate) => candidate.id === entity.id));
      const anchorTarget = entity.defendAnchor?.kind === "entity" ? targetFor(state, entity.defendAnchor.entityId) : null;
      const anchorRadius = targetLiving(anchorTarget) ? anchorTarget.radius : 0;
      const minimumRing = anchorRadius + (targetLiving(anchorTarget) ? entity.radius : 0);
      const intendedRing = anchorRadius + entity.radius
        + (16 + Math.floor(ordinal / 8) * 56) * configuration.positionScale;
      const maximumRing = configuration.returnThresholdWorld * configuration.positionScale;
      const rings = [...new Set([
        Math.max(minimumRing, Math.min(intendedRing, maximumRing)),
        minimumRing,
        targetLiving(anchorTarget) ? null : 0
      ].filter((value) => value !== null))];
      for (const ring of rings) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const direction = (ordinal + attempt) % 8;
          const offset = navigationApi.reservationOffset(ring, direction);
          const point = { x: root.x + offset.x, y: root.y + offset.y };
          if (rootDistance(root, point) <= maximumRing && navigator.isPointClear(point, entity.radius)) return point;
        }
      }
      return null;
    }
    function completeReturn(entity) {
      entity.returning = false;
      entity.returnFailure = null;
      if (entity.order === "ATTACK_MOVE") {
        entity.engagementRoot = null;
        entity.route = entity.savedRoute.map(clonePoint);
        entity.routeIndex = entity.savedRouteIndex;
        entity.formationDestination = clonePoint(entity.savedDestination);
        entity.repathCount = entity.savedRepathCount;
        entity.progress = { distance: entity.savedProgress.distance, stalledTicks: entity.savedProgress.stalledTicks };
      } else clearMovement(entity);
    }
    function failReturn(entity, events, code) {
      const entityId = entity.id;
      if (entity.order === "DEFEND") {
        entity.returning = false;
        clearMovement(entity);
        if (entity.returnFailure === null) {
          entity.returnFailure = "defend-return-unreachable";
          events.push(Object.freeze({ type: "entity", entityId, status: "stopped", code: entity.returnFailure }));
        }
        return;
      }
      if (entity.order === "IDLE") {
        entity.returning = false;
        entity.returnFailure = null;
        clearMovement(entity);
      } else enterIdle(entity);
      events.push(Object.freeze({ type: "entity", entityId, status: "stopped", code }));
    }
    function proposeMovement(entity, events) {
      if (entity.targetId !== null && entity.reservation) {
        const target = targetFor(state, entity.targetId);
        const point = navigationApi.reservationPoint(target, entity, representatives[entity.kind].role, entity.reservation.slotIndex, configuration);
        const move = routeTowardPoint(entity, point);
        if (!move.ok) {
          const targetId = entity.targetId;
          handleTargetLoss(entity);
          events.push(Object.freeze({ type: "combat", status: "target-released", entityId: entity.id, targetId, code: "unreachable" }));
          return { entity, x: entity.x, y: entity.y, routeIndex: entity.routeIndex, facing: entity.facing, moving: false };
        }
        return { entity, x: move.x, y: move.y, routeIndex: move.routeIndex,
          facing: move.x === entity.x ? entity.facing : move.x > entity.x ? "right" : "left", moving: move.x !== entity.x || move.y !== entity.y };
      }
      if (entity.returning) {
        const completionRoot = entity.order === "DEFEND" ? currentDefendRoot(entity) : returnDestination(entity);
        if (!completionRoot) {
          entity.returning = false;
          return { entity, x: entity.x, y: entity.y, routeIndex: entity.routeIndex, facing: entity.facing, moving: false };
        }
        if (rootDistance(entity, completionRoot) <= configuration.returnThresholdWorld * configuration.positionScale) {
          completeReturn(entity);
          return proposeRouteMovement(entity);
        }
        const destination = entity.order === "DEFEND" ? defendStandPoint(entity) : completionRoot;
        if (!destination) {
          failReturn(entity, events, "unreachable");
          return { entity, x: entity.x, y: entity.y, routeIndex: entity.routeIndex, facing: entity.facing, moving: false };
        }
        const move = routeTowardPoint(entity, destination);
        if (!move.ok) {
          failReturn(entity, events, "unreachable");
          return { entity, x: entity.x, y: entity.y, routeIndex: entity.routeIndex, facing: entity.facing, moving: false };
        }
        return { entity, x: move.x, y: move.y, routeIndex: move.routeIndex,
          facing: move.x === entity.x ? entity.facing : move.x > entity.x ? "right" : "left", moving: true };
      }
      if (entity.order === "DEFEND" && entity.targetId === null) {
        if (entity.formationDestination && entity.routeIndex < entity.route.length) return proposeRouteMovement(entity);
        const anchorRoot = currentDefendRoot(entity);
        const destination = defendStandPoint(entity);
        if (entity.returnFailure !== null || !destination
          || !anchorRoot || rootDistance(entity, anchorRoot) <= configuration.returnThresholdWorld * configuration.positionScale) {
          return { entity, x: entity.x, y: entity.y, routeIndex: entity.routeIndex, facing: entity.facing, moving: false };
        }
        const move = routeTowardPoint(entity, destination);
        if (!move.ok) {
          if (entity.returnFailure === null) {
            entity.returnFailure = "defend-return-unreachable";
            events.push(Object.freeze({ type: "entity", entityId: entity.id, status: "stopped", code: entity.returnFailure }));
          }
          return { entity, x: entity.x, y: entity.y, routeIndex: entity.routeIndex, facing: entity.facing, moving: false };
        }
        return { entity, x: move.x, y: move.y, routeIndex: move.routeIndex,
          facing: move.x === entity.x ? entity.facing : move.x > entity.x ? "right" : "left", moving: true };
      }
      if (entity.order === "MOVE" || entity.order === "ATTACK_MOVE" || entity.order === "DEFEND") return proposeRouteMovement(entity);
      return { entity, x: entity.x, y: entity.y, routeIndex: entity.routeIndex, facing: entity.facing, moving: false };
    }

    function applySeparation(proposals) {
      for (let pass = 0; pass < configuration.separationPasses; pass += 1) {
        const changes = proposals.map(() => ({ x: 0, y: 0 }));
        for (let first = 0; first < proposals.length; first += 1) for (let second = first + 1; second < proposals.length; second += 1) {
          const a = proposals[first]; const b = proposals[second];
          if (!a.moving && !b.moving) continue;
          const deltaX = b.x - a.x; const deltaY = b.y - a.y;
          const minimum = a.entity.radius + b.entity.radius;
          const squared = deltaX * deltaX + deltaY * deltaY;
          if (squared >= minimum * minimum) continue;
          const distance = Math.floor(Math.sqrt(squared));
          const overlap = minimum - distance + 1;
          const directionX = distance === 0 ? 1 : deltaX / distance;
          const directionY = distance === 0 ? 0 : deltaY / distance;
          if (a.moving) {
            const share = b.moving ? Math.ceil(overlap / 2) : overlap;
            changes[first].x -= Math.round(directionX * share); changes[first].y -= Math.round(directionY * share);
          }
          if (b.moving) {
            const share = a.moving ? Math.floor(overlap / 2) : overlap;
            changes[second].x += Math.round(directionX * share); changes[second].y += Math.round(directionY * share);
          }
        }
        for (let index = 0; index < proposals.length; index += 1) {
          const proposal = proposals[index];
          if (!proposal.moving) continue;
          const candidate = { x: proposal.x + changes[index].x, y: proposal.y + changes[index].y };
          if (navigator.isSegmentClear(proposal.entity, candidate, proposal.entity.radius)) {
            proposal.x = candidate.x; proposal.y = candidate.y;
          }
        }
      }
    }
    function enforceHardFootprints(proposals) {
      const accepted = [];
      for (let index = 0; index < proposals.length; index += 1) {
        const proposal = proposals[index];
        const candidate = { x: proposal.x, y: proposal.y, radius: proposal.entity.radius };
        const occupied = [...accepted, ...proposals.slice(index + 1).map((later) => ({
          x: later.entity.x, y: later.entity.y, radius: later.entity.radius
        }))];
        if (occupied.some((other) => overlaps(candidate, other))) {
          proposal.x = proposal.entity.x; proposal.y = proposal.entity.y;
          proposal.routeIndex = proposal.entity.routeIndex; proposal.facing = proposal.entity.facing; proposal.moving = false;
        }
        accepted.push({ x: proposal.x, y: proposal.y, radius: proposal.entity.radius });
      }
    }
    function finishOrdinaryDestination(entity, events) {
      if (!entity.formationDestination || entity.routeIndex < entity.route.length
        || entity.x !== entity.formationDestination.x || entity.y !== entity.formationDestination.y) return;
      if (entity.order === "MOVE") {
        const entityId = entity.id; enterIdle(entity);
        events.push(Object.freeze({ type: "entity", entityId, status: "completed", code: "destination-reached" }));
      } else if (entity.order === "ATTACK_MOVE") {
        const entityId = entity.id; enterIdle(entity);
        events.push(Object.freeze({ type: "entity", entityId, status: "completed", code: "attack-move-destination-reached" }));
      } else if (entity.order === "DEFEND") clearMovement(entity);
    }
    function updateChaseProgress(entity, events) {
      if (entity.targetId === null || entity.reservation === null) return false;
      const target = targetFor(state, entity.targetId);
      if (!targetLiving(target)) return false;
      const destination = navigationApi.reservationPoint(
        target, entity, representatives[entity.kind].role, entity.reservation.slotIndex, configuration
      );
      const distance = distanceFixed(entity, destination);
      if (distance <= configuration.materialProgressFixed || attackRevalidates(entity, target)) {
        entity.repathCount = 0;
        entity.progress = { distance, stalledTicks: 0 };
        return false;
      }
      if (entity.progress.distance === 0 && entity.progress.stalledTicks === 0) {
        entity.progress = { distance, stalledTicks: 0 };
        return false;
      }
      if (entity.progress.distance - distance >= configuration.materialProgressFixed) {
        entity.progress = { distance, stalledTicks: 0 };
        return false;
      }
      entity.progress.stalledTicks += 1;
      if (entity.progress.stalledTicks < configuration.congestionTicks) return false;
      if (entity.repathCount < configuration.repathAttemptCap) {
        const route = navigator.findRoute(entity, destination, entity.radius);
        entity.repathCount += 1;
        entity.progress = { distance, stalledTicks: 0 };
        if (route.ok) {
          entity.route = route.waypoints.map(clonePoint);
          entity.routeIndex = 0;
          entity.formationDestination = clonePoint(destination);
        }
        return false;
      }
      const targetId = entity.targetId;
      handleTargetLoss(entity);
      events.push(Object.freeze({
        type: "combat", status: "target-released", entityId: entity.id, targetId, code: "congestion"
      }));
      return true;
    }
    function updateReturnProgress(entity, events) {
      if (!entity.returning) return false;
      const completionRoot = entity.order === "DEFEND" ? currentDefendRoot(entity) : returnDestination(entity);
      if (!completionRoot) {
        failReturn(entity, events, "unreachable");
        return true;
      }
      if (rootDistance(entity, completionRoot) <= configuration.returnThresholdWorld * configuration.positionScale) {
        completeReturn(entity);
        return true;
      }
      const destination = entity.order === "DEFEND" ? defendStandPoint(entity) : completionRoot;
      if (!destination) {
        failReturn(entity, events, "unreachable");
        return true;
      }
      const distance = distanceFixed(entity, destination);
      if (distance <= configuration.materialProgressFixed) {
        entity.repathCount = 0;
        entity.progress = { distance, stalledTicks: 0 };
        return false;
      }
      if (entity.progress.distance === 0 && entity.progress.stalledTicks === 0) {
        entity.progress = { distance, stalledTicks: 0 };
        return false;
      }
      if (entity.progress.distance - distance >= configuration.materialProgressFixed) {
        entity.progress = { distance, stalledTicks: 0 };
        return false;
      }
      entity.progress.stalledTicks += 1;
      if (entity.progress.stalledTicks < configuration.congestionTicks) return false;
      if (entity.repathCount < configuration.repathAttemptCap) {
        const route = navigator.findRoute(entity, destination, entity.radius);
        entity.repathCount += 1;
        entity.progress = { distance, stalledTicks: 0 };
        if (route.ok) {
          entity.route = route.waypoints.map(clonePoint);
          entity.routeIndex = 0;
          entity.formationDestination = clonePoint(destination);
        }
        return false;
      }
      failReturn(entity, events, "congestion");
      return true;
    }
    function updateMovement(events) {
      const proposals = state.entities.map((entity) => proposeMovement(entity, events));
      applySeparation(proposals); enforceHardFootprints(proposals);
      for (const proposal of proposals) {
        const entity = proposal.entity;
        entity.x = proposal.x; entity.y = proposal.y; entity.routeIndex = proposal.routeIndex; entity.facing = proposal.facing;
        if (entity.returning) {
          updateReturnProgress(entity, events);
          continue;
        }
        if (entity.targetId !== null) {
          updateChaseProgress(entity, events);
          continue;
        }
        if (entity.order === "ATTACK_MOVE" && entity.targetId === null && !entity.returning && entity.route.length) {
          entity.savedRouteIndex = entity.routeIndex;
        }
        finishOrdinaryDestination(entity, events);
        if (!entity.formationDestination || entity.routeIndex >= entity.route.length
          || (entity.order !== "MOVE" && entity.order !== "ATTACK_MOVE" && entity.order !== "DEFEND")) continue;
        const distance = distanceFixed(entity, entity.formationDestination);
        if (entity.progress.distance - distance >= configuration.materialProgressFixed) entity.progress = { distance, stalledTicks: 0 };
        else entity.progress.stalledTicks += 1;
        if (entity.progress.stalledTicks < configuration.congestionTicks) continue;
        if (entity.repathCount < configuration.repathAttemptCap) {
          const route = navigator.findRoute(entity, entity.formationDestination, entity.radius);
          entity.repathCount += 1; entity.progress = { distance, stalledTicks: 0 };
          if (route.ok) {
            entity.route = route.waypoints.map(clonePoint); entity.routeIndex = 0;
            if (entity.order === "ATTACK_MOVE" && entity.targetId === null && !entity.returning) {
              entity.savedRoute = entity.route.map(clonePoint); entity.savedRouteIndex = 0;
            }
          }
          continue;
        }
        const entityId = entity.id;
        if (entity.order === "ATTACK_MOVE") enterIdle(entity);
        else if (entity.order === "MOVE") enterIdle(entity);
        else clearMovement(entity);
        events.push(Object.freeze({ type: "entity", entityId, status: "stopped", code: "congestion" }));
      }
      for (const entity of state.entities) {
        if (entity.order !== "ATTACK_MOVE" || entity.targetId !== null || entity.returning) continue;
        entity.savedRoute = entity.route.map(clonePoint);
        entity.savedRouteIndex = entity.routeIndex;
        entity.savedDestination = clonePoint(entity.formationDestination);
        entity.savedRepathCount = entity.repathCount;
        entity.savedProgress = { distance: entity.progress.distance, stalledTicks: entity.progress.stalledTicks };
      }
      for (const entity of state.entities) {
        if (entity.order === "DEFEND" && entity.defendAnchor?.kind === "entity") currentDefendRoot(entity);
      }
    }

    function attackCapableReservation(entity) {
      if (!entity.reservation) return false;
      return representatives[entity.kind].role === "ranged" || entity.reservation.slotIndex < 8;
    }
    function edgePointFromTarget(attacker, target) {
      const deltaX = attacker.x - target.x; const deltaY = attacker.y - target.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance === 0) return { x: target.x, y: target.y };
      const outward = (value) => Math.sign(value) * Math.ceil(Math.abs(value));
      return {
        x: target.x + outward(deltaX * target.radius / distance),
        y: target.y + outward(deltaY * target.radius / distance)
      };
    }
    function combatGeometryValid(entity, target) {
      const edge = edgePointFromTarget(entity, target);
      return navigator.isSegmentClear(entity, edge, 0);
    }
    function attackRevalidates(entity, target) {
      const definition = representatives[entity.kind];
      return hostileTo(target, entity.ownerSeat)
        && targetAllowedForOrder(entity, target)
        && attackCapableReservation(entity)
        && targetEdgeDistance(entity, target) <= definition.attackRangeWorld * configuration.positionScale
        && combatGeometryValid(entity, target);
    }
    function collectCombatPackets(events) {
      const packets = [];
      for (const entity of state.entities) {
        const target = entity.targetId === null ? null : targetFor(state, entity.targetId);
        if (entity.pendingAttackTick === null && target && attackRevalidates(entity, target)
          && state.tick >= entity.nextAttackStartTick) {
          const definition = representatives[entity.kind];
          entity.attackStartTick = state.tick;
          entity.pendingAttackTick = state.tick + definition.contactOffsetTicks;
          entity.nextAttackStartTick = state.tick + definition.attackCycleTicks;
          events.push(Object.freeze({ type: "combat", status: "attack-started", attackerId: entity.id,
            targetId: target.id, attackStartTick: state.tick, contactTick: entity.pendingAttackTick }));
        }
      }

      const dueDirect = state.entities.filter((entity) => entity.pendingAttackTick === state.tick
        && representatives[entity.kind].role !== "ranged").sort((a, b) => compareIdentifiers(a.id, b.id));
      for (const entity of dueDirect) {
        const target = entity.targetId === null ? null : targetFor(state, entity.targetId);
        if (target && attackRevalidates(entity, target)) {
          packets.push({ targetId: target.id, sourceSeat: entity.ownerSeat, attackerId: entity.id,
            damage: representatives[entity.kind].damage, source: "contact" });
          events.push(Object.freeze({ type: "combat", status: "contact", attackerId: entity.id,
            targetId: target.id, damage: representatives[entity.kind].damage }));
        } else events.push(Object.freeze({ type: "combat", status: "miss", attackerId: entity.id, targetId: entity.targetId }));
        entity.pendingAttackTick = null;
      }

      const dueRanged = state.entities.filter((entity) => entity.pendingAttackTick === state.tick
        && representatives[entity.kind].role === "ranged").sort((a, b) => compareIdentifiers(a.id, b.id));
      for (const entity of dueRanged) {
        const target = entity.targetId === null ? null : targetFor(state, entity.targetId);
        if (!target || !attackRevalidates(entity, target)) {
          events.push(Object.freeze({ type: "combat", status: "miss", attackerId: entity.id, targetId: entity.targetId }));
        } else if (state.projectiles.length >= configuration.projectileCap) {
          events.push(Object.freeze({ type: "projectile", status: "withheld", code: "projectile-limit", attackerId: entity.id, targetId: target.id }));
        } else if (state.nextProjectileNumber > configuration.projectileIdCap) {
          events.push(Object.freeze({ type: "projectile", status: "withheld", code: "projectile-id-limit", attackerId: entity.id, targetId: target.id }));
        } else {
          const projectileId = `projectile-${String(state.nextProjectileNumber).padStart(12, "0")}`;
          state.nextProjectileNumber += 1;
          const launchEdgeDistance = targetEdgeDistance(entity, target);
          const travelTicks = Math.max(configuration.projectileTravelTickMin, Math.min(
            configuration.projectileTravelTickMax,
            Math.ceil(launchEdgeDistance / configuration.projectileSpeedFixed)
          ));
          state.projectiles.push({
            id: projectileId, sourceSeat: entity.ownerSeat, targetId: target.id,
            damage: representatives[entity.kind].damage, launchTick: state.tick,
            arrivalTick: state.tick + travelTicks, launchX: entity.x, launchY: entity.y,
            launchSourceRadius: entity.radius, launchTargetRadius: target.radius,
            launchTargetX: target.x, launchTargetY: target.y, launchEdgeDistance
          });
          state.projectiles.sort((a, b) => compareIdentifiers(a.id, b.id));
          events.push(Object.freeze({ type: "projectile", status: "launched", projectileId,
            attackerId: entity.id, targetId: target.id, arrivalTick: state.tick + travelTicks }));
        }
        entity.pendingAttackTick = null;
      }

      const remaining = [];
      for (const projectile of state.projectiles) {
        if (projectile.arrivalTick > state.tick) { remaining.push(projectile); continue; }
        const target = targetFor(state, projectile.targetId);
        if (hostileTo(target, projectile.sourceSeat)) {
          packets.push({ targetId: target.id, sourceSeat: projectile.sourceSeat, attackerId: null,
            damage: projectile.damage, source: "projectile", projectileId: projectile.id });
          events.push(Object.freeze({ type: "projectile", status: "arrived", projectileId: projectile.id,
            targetId: target.id, damage: projectile.damage }));
        } else events.push(Object.freeze({ type: "projectile", status: "dissipated", projectileId: projectile.id, targetId: projectile.targetId }));
      }
      state.projectiles = remaining;
      return packets;
    }

    function applyDamagePackets(packets, events) {
      const totals = new Map();
      for (const packet of packets) totals.set(packet.targetId, (totals.get(packet.targetId) || 0) + packet.damage);
      for (const targetId of [...totals.keys()].sort(compareIdentifiers)) {
        const target = targetFor(state, targetId);
        if (!targetLiving(target)) continue;
        const damage = totals.get(targetId);
        const priorHealth = target.health;
        target.health = Math.max(0, target.health - damage);
        events.push(Object.freeze({ type: "combat", status: "damage", targetId,
          damage: priorHealth - target.health, health: target.health, maxHealth: target.maxHealth }));
      }
    }

    function settleDefeatAndOutcome(events) {
      const defeated = state.entities.filter((entity) => entity.health === 0)
        .sort((a, b) => compareIdentifiers(a.id, b.id));
      const defeatedIds = new Set(defeated.map((entity) => entity.id));
      for (const entity of defeated) {
        playerFor(entity.ownerSeat).populationUsed -= representatives[entity.kind].population;
        events.push(Object.freeze({ type: "defeat", entityId: entity.id, ownerSeat: entity.ownerSeat,
          kind: entity.kind, tick: state.tick, presentationTicks: configuration.defeatPresentationTicks }));
      }
      if (defeated.length) {
        state.entities = state.entities.filter((entity) => !defeatedIds.has(entity.id));
        for (const entity of state.entities) {
          if (defeatedIds.has(entity.targetId)) handleTargetLoss(entity);
          if (entity.defendAnchor?.kind === "entity" && defeatedIds.has(entity.defendAnchor.entityId)) currentDefendRoot(entity);
        }
      }

      for (const structure of state.structures.filter((value) => !value.destroyed && value.health === 0)) {
        const settlement = settleStructureDestruction(structure);
        events.push(Object.freeze({ type: "structure", structureId: structure.id, status: "destroyed",
          priorOwnerSeat: settlement.priorOwnerSeat, refundedItems: settlement.refundedItems }));
        for (const entity of state.entities) {
          if (entity.targetId === structure.id) handleTargetLoss(entity);
          if (entity.defendAnchor?.kind === "entity" && entity.defendAnchor.entityId === structure.id) currentDefendRoot(entity);
        }
      }
      const destroyedHeadquarters = state.structures.filter((value) => value.category === "headquarters" && value.destroyed);
      if (!destroyedHeadquarters.length) return false;
      const winnerSeat = destroyedHeadquarters.length === 2 ? null
        : destroyedHeadquarters[0].id === "astral-headquarters-anchor" ? 2 : 1;
      state.match = { status: "complete", winnerSeat, completedTick: state.tick };
      state.pendingCommands = [];
      for (const entity of state.entities) {
        const transientMovement = entity.targetId !== null || entity.returning || entity.engagementRoot !== null;
        releaseCombat(entity);
        entity.returning = false;
        if (transientMovement) clearMovement(entity);
      }
      events.push(Object.freeze({ type: "match", status: "completed", winnerSeat, completedTick: state.tick }));
      return true;
    }

    function updateCapture(events) {
      for (const structure of state.structures) {
        if (structure.destroyed || structure.category === "headquarters") continue;
        const authored = authoredById.get(structure.id);
        const captureRadius = authored.captureRadius * configuration.positionScale;
        const present = new Set();
        for (const entity of state.entities) {
          const deltaX = entity.x - structure.x; const deltaY = entity.y - structure.y;
          if (deltaX * deltaX + deltaY * deltaY <= captureRadius * captureRadius) present.add(entity.ownerSeat);
        }
        if (present.size > 1) continue;
        const sole = present.size === 1 ? [...present][0] : null;
        if (sole === null || sole === structure.ownerSeat) {
          structure.capture.progressTicks = Math.max(0, structure.capture.progressTicks - configuration.captureUnwindPerTick);
          if (structure.capture.progressTicks === 0) structure.capture.challengerSeat = null;
          continue;
        }
        if (structure.capture.challengerSeat === null) structure.capture.challengerSeat = sole;
        if (structure.capture.challengerSeat !== sole) {
          structure.capture.progressTicks = Math.max(0, structure.capture.progressTicks - configuration.captureUnwindPerTick);
          if (structure.capture.progressTicks === 0) structure.capture.challengerSeat = null;
          continue;
        }
        structure.capture.progressTicks += 1;
        if (structure.capture.progressTicks < configuration.captureRequiredTicks) continue;
        const priorOwnerSeat = structure.ownerSeat;
        const nextOwnerSeat = structure.capture.challengerSeat;
        const refundedItems = settleQueue(structure);
        structure.ownerSeat = nextOwnerSeat;
        structure.capture = { challengerSeat: null, progressTicks: 0 };
        for (const entity of state.entities) {
          if (entity.targetId === structure.id && !hostileTo(structure, entity.ownerSeat)) handleTargetLoss(entity);
          if (entity.defendAnchor?.kind === "entity" && entity.defendAnchor.entityId === structure.id
            && structure.ownerSeat !== entity.ownerSeat) currentDefendRoot(entity);
        }
        events.push(Object.freeze({ type: "structure", structureId: structure.id, status: "captured",
          priorOwnerSeat, ownerSeat: nextOwnerSeat, refundedItems }));
      }
    }
    function settleIncome() {
      if (state.tick % configuration.resourceIncomeIntervalTicks !== 0) return;
      for (const structure of state.structures) {
        if (structure.destroyed || structure.category !== "resource-point" || structure.ownerSeat === null) continue;
        const player = playerFor(structure.ownerSeat);
        const refundable = refundableResourceForSeat(player.seat);
        if (player.resources > Number.MAX_SAFE_INTEGER - configuration.resourceIncomeAmount - refundable) {
          throw new RangeError("Resource income would make queue settlement unsafe");
        }
        player.resources += configuration.resourceIncomeAmount;
      }
    }
    function clearSpawnSlot(structure, item) {
      if (state.entities.length >= configuration.combatEntityCap) return null;
      const definition = representatives[item.entityKind];
      const authored = authoredById.get(structure.id);
      const reference = {
        x: Math.round(authored.spawnSlots[0].x * configuration.positionScale),
        y: Math.round(authored.spawnSlots[0].y * configuration.positionScale)
      };
      for (const slot of authored.spawnSlots) {
        const point = { x: Math.round(slot.x * configuration.positionScale), y: Math.round(slot.y * configuration.positionScale) };
        if (!navigator.isPointClear(point, definition.radius) || !navigator.findRoute(reference, point, definition.radius).ok) continue;
        const candidate = { ...point, radius: definition.radius };
        if (state.entities.some((entity) => overlaps(candidate, entity))) continue;
        return point;
      }
      return null;
    }
    function updateProduction(events, spawnedRallies) {
      for (const structure of state.structures) {
        if (structure.destroyed || !structure.queue.length
          || (structure.category !== "headquarters" && structure.category !== "production-outpost")) continue;
        const item = structure.queue[0];
        const definition = representatives[item.entityKind];
        if (item.progressTicks < definition.productionTicks) item.progressTicks += 1;
        if (item.progressTicks < definition.productionTicks) continue;
        const slot = clearSpawnSlot(structure, item);
        if (!slot) {
          if (!item.blockedComplete) events.push(Object.freeze({ type: "production", structureId: structure.id,
            queueItemId: item.id, status: "blocked", code: "spawn-blocked" }));
          item.blockedComplete = true; continue;
        }
        if (state.nextEntityNumber > configuration.generatedIdCap) { item.blockedComplete = true; continue; }
        const player = playerFor(item.ownerSeat);
        const entityId = `entity-${String(state.nextEntityNumber).padStart(8, "0")}`;
        state.nextEntityNumber += 1;
        const seatAnchor = map.layers.anchors.playerSeats.find((seat) => seat.seat === item.ownerSeat);
        const entity = {
          id: entityId, ownerSeat: item.ownerSeat, kind: item.entityKind,
          x: slot.x, y: slot.y, radius: definition.radius, speedPerTick: definition.speedPerTick,
          facing: seatAnchor.facing, ...combatFields(definition, slot.x, slot.y, state.tick)
        };
        structure.queue.shift(); player.populationReserved -= definition.population; player.populationUsed += definition.population;
        state.entities.push(entity); state.entities.sort((a, b) => compareIdentifiers(a.id, b.id));
        if (structure.rally) spawnedRallies.push({ entityId, ownerSeat: entity.ownerSeat,
          destination: clonePoint(structure.rally), structureId: structure.id });
        events.push(Object.freeze({ type: "production", structureId: structure.id, queueItemId: item.id,
          entityId, status: "completed", code: "spawned" }));
      }
    }
    function assignSpawnedRallies(spawnedRallies, events) {
      for (const rally of spawnedRallies) {
        const result = assignMove([rally.entityId], rally.destination, rally.ownerSeat);
        events.push(Object.freeze({ type: "rally", structureId: rally.structureId, entityId: rally.entityId,
          status: result.ok ? "applied" : "rejected", code: result.code }));
      }
    }

    function stepOnce() {
      if (state.match.status === "complete") return Object.freeze({ tick: state.tick, events: Object.freeze([]) });
      if (state.tick >= configuration.simulationTickCap) throw new RangeError("simulation tick exceeds its bound");
      state.tick += 1;
      const events = [];
      const due = [];
      while (state.pendingCommands.length && state.pendingCommands[0].targetTick === state.tick) due.push(state.pendingCommands.shift());
      due.sort((a, b) => a.sequence - b.sequence);
      for (const command of due) events.push(executeCommand(command));
      validateAndAcquireTargets(events);
      allocateReservations(events);
      updateMovement(events);
      const packets = collectCombatPackets(events);
      applyDamagePackets(packets, events);
      if (settleDefeatAndOutcome(events)) return Object.freeze({ tick: state.tick, events: Object.freeze(events) });
      updateCapture(events);
      settleIncome();
      const spawnedRallies = [];
      updateProduction(events, spawnedRallies);
      assignSpawnedRallies(spawnedRallies, events);
      clearChangedReservationWaitTriggers();
      return Object.freeze({ tick: state.tick, events: Object.freeze(events) });
    }
    function advance(count = 1) {
      if (!safeInteger(count, 1, configuration.maxCatchUpTicks)) throw new RangeError(`advance count must be between 1 and ${configuration.maxCatchUpTicks}`);
      const events = [];
      for (let index = 0; index < count; index += 1) events.push(...stepOnce().events);
      return Object.freeze({ tick: state.tick, events: Object.freeze(events) });
    }
    function submitTyped(kind, request) {
      if (!plainObject(request) || request.kind !== kind) return Object.freeze({ ok: false, code: "kind" });
      return submitCommand(request);
    }

    return Object.freeze({
      get tick() { return state.tick; }, configuration,
      submitCommand,
      submitMove(request) { return submitTyped("MOVE", request); },
      submitAttackEntity(request) { return submitTyped("ATTACK_ENTITY", request); },
      submitAttackMove(request) { return submitTyped("ATTACK_MOVE", request); },
      submitStop(request) { return submitTyped("STOP", request); },
      submitDefend(request) { return submitTyped("DEFEND", request); },
      submitQueueProduction(request) { return submitTyped("QUEUE_PRODUCTION", request); },
      submitCancelProduction(request) { return submitTyped("CANCEL_PRODUCTION", request); },
      submitSetRally(request) { return submitTyped("SET_RALLY", request); },
      submitClearRally(request) { return submitTyped("CLEAR_RALLY", request); },
      acceptCommand,
      step() { return advance(1); }, advance,
      snapshot() { return snapshotState(state); }
    });
  }

  function createSimulation(options = {}) {
    if (!plainObject(options)) throw new TypeError("simulation options must be a plain object");
    for (const key of Object.keys(options)) if (key !== "map" && key !== "seed") throw new TypeError(`unknown simulation option: ${key}`);
    const map = resolveMap(options.map);
    return createEngine(openingState(map, options.seed ?? 1), map);
  }
  function restoreSimulation(snapshot, options = {}) {
    if (!plainObject(options)) throw new TypeError("restore options must be a plain object");
    for (const key of Object.keys(options)) if (key !== "map") throw new TypeError(`unknown restore option: ${key}`);
    const map = resolveMap(options.map);
    return createEngine(validatedState(snapshot, map), map);
  }
  function validateSnapshot(snapshot, options = {}) {
    if (!plainObject(options)) throw new TypeError("snapshot validation options must be a plain object");
    for (const key of Object.keys(options)) if (key !== "map") throw new TypeError(`unknown snapshot validation option: ${key}`);
    const map = resolveMap(options.map);
    return snapshotState(validatedState(snapshot, map));
  }

  const api = Object.freeze({ createSimulation, restoreSimulation, validateSnapshot });
  if (commonJS) module.exports = api;
  else window.AeonPhase5Simulation = api;
}());
