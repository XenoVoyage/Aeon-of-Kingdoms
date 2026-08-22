/* global window */
"use strict";

(function exposePhase4Simulation() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase4Config;
  const navigationApi = commonJS ? require("./navigation.js") : window.AeonPhase4Navigation;
  const defaultMap = commonJS ? require("./map.js") : window.AeonPhase4Map;
  const {
    configuration, representatives, factionRosters, productionRosters,
    openingSlots, structureCategories, compareIdentifiers
  } = configApi;

  const SNAPSHOT_KEYS = Object.freeze([
    "configurationId", "entities", "mapId", "nextEntityNumber", "nextQueueNumber",
    "nextSequence", "pendingCommands", "players", "protocolVersion", "schemaVersion",
    "seed", "structures", "tick"
  ]);
  const PLAYER_KEYS = Object.freeze([
    "faction", "populationCap", "populationReserved", "populationUsed", "resources", "seat"
  ]);
  const STRUCTURE_KEYS = Object.freeze([
    "capture", "category", "destroyed", "id", "ownerSeat", "queue", "radius", "rally", "x", "y"
  ]);
  const CAPTURE_KEYS = Object.freeze(["challengerSeat", "progressTicks"]);
  const QUEUE_KEYS = Object.freeze(["blockedComplete", "entityKind", "id", "ownerSeat", "progressTicks"]);
  const ENTITY_KEYS = Object.freeze([
    "facing", "formationDestination", "id", "kind", "order", "ownerSeat", "progress",
    "radius", "repathCount", "route", "routeIndex", "speedPerTick", "x", "y"
  ]);
  const COMMON_REQUEST_KEYS = Object.freeze([
    "configurationId", "issuingPlayer", "kind", "protocolVersion", "targetTick"
  ]);
  const PAYLOAD_KEYS = Object.freeze({
    MOVE: ["destination", "entityIds"],
    QUEUE_PRODUCTION: ["entityKind", "structureId"],
    CANCEL_PRODUCTION: ["queueItemId", "structureId"],
    SET_RALLY: ["destination", "structureId"],
    CLEAR_RALLY: ["structureId"]
  });
  const COMMAND_KINDS = Object.freeze(Object.keys(PAYLOAD_KEYS));

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

  function clonePoint(point) { return { x: point.x, y: point.y }; }
  function cloneCapture(capture) { return { challengerSeat: capture.challengerSeat, progressTicks: capture.progressTicks }; }
  function cloneQueueItem(item) {
    return {
      id: item.id,
      ownerSeat: item.ownerSeat,
      entityKind: item.entityKind,
      progressTicks: item.progressTicks,
      blockedComplete: item.blockedComplete
    };
  }
  function cloneStructure(structure) {
    return {
      id: structure.id,
      category: structure.category,
      x: structure.x,
      y: structure.y,
      radius: structure.radius,
      ownerSeat: structure.ownerSeat,
      destroyed: structure.destroyed,
      capture: cloneCapture(structure.capture),
      queue: structure.queue.map(cloneQueueItem),
      rally: structure.rally ? clonePoint(structure.rally) : null
    };
  }
  function clonePlayer(player) {
    return {
      seat: player.seat,
      faction: player.faction,
      resources: player.resources,
      populationUsed: player.populationUsed,
      populationReserved: player.populationReserved,
      populationCap: player.populationCap
    };
  }
  function cloneEntity(entity) {
    return {
      id: entity.id, ownerSeat: entity.ownerSeat, kind: entity.kind,
      x: entity.x, y: entity.y, radius: entity.radius, speedPerTick: entity.speedPerTick,
      facing: entity.facing, order: entity.order,
      route: entity.route.map(clonePoint), routeIndex: entity.routeIndex,
      formationDestination: entity.formationDestination ? clonePoint(entity.formationDestination) : null,
      repathCount: entity.repathCount,
      progress: { distance: entity.progress.distance, stalledTicks: entity.progress.stalledTicks }
    };
  }

  function requestKeys(kind, sequenced) {
    const payload = PAYLOAD_KEYS[kind];
    return payload ? [...COMMON_REQUEST_KEYS, ...payload, ...(sequenced ? ["sequence"] : [])] : null;
  }

  function cloneCommand(command) {
    const cloned = {
      protocolVersion: command.protocolVersion,
      configurationId: command.configurationId,
      kind: command.kind,
      issuingPlayer: command.issuingPlayer,
      sequence: command.sequence,
      targetTick: command.targetTick
    };
    if (command.entityIds) cloned.entityIds = [...command.entityIds];
    if (command.destination) cloned.destination = clonePoint(command.destination);
    if (command.structureId) cloned.structureId = command.structureId;
    if (command.entityKind) cloned.entityKind = command.entityKind;
    if (command.queueItemId) cloned.queueItemId = command.queueItemId;
    return cloned;
  }

  function frozenCommand(command) {
    const cloned = cloneCommand(command);
    if (cloned.entityIds) Object.freeze(cloned.entityIds);
    if (cloned.destination) Object.freeze(cloned.destination);
    return Object.freeze(cloned);
  }

  function snapshotState(state) {
    return {
      schemaVersion: state.schemaVersion,
      protocolVersion: state.protocolVersion,
      configurationId: state.configurationId,
      mapId: state.mapId,
      seed: state.seed,
      tick: state.tick,
      nextSequence: state.nextSequence,
      nextEntityNumber: state.nextEntityNumber,
      nextQueueNumber: state.nextQueueNumber,
      players: state.players.map(clonePlayer),
      structures: state.structures.map(cloneStructure),
      entities: state.entities.map(cloneEntity),
      pendingCommands: state.pendingCommands.map(cloneCommand)
    };
  }

  function distanceFixed(first, second) { return Math.floor(Math.hypot(second.x - first.x, second.y - first.y)); }
  function overlaps(first, second) {
    const deltaX = first.x - second.x;
    const deltaY = first.y - second.y;
    const minimum = first.radius + second.radius;
    return deltaX * deltaX + deltaY * deltaY < minimum * minimum;
  }
  function commandOrder(first, second) { return first.targetTick - second.targetTick || first.sequence - second.sequence; }
  function validatePointShape(point) { return exactKeys(point, ["x", "y"]) && safeInteger(point.x) && safeInteger(point.y); }

  function resolveMap(candidate) {
    const map = candidate || defaultMap;
    if (!map?.phase4?.structures || !Array.isArray(map.phase4.structures)) throw new Error("Phase 4 requires the approved gameplay map overlay");
    if (!validIdentifier(String(map.id), configuration.mapIdMaxLength)) throw new TypeError("map identifier must be bounded ASCII");
    return map;
  }

  function authoredStructures(map) {
    const authored = [...map.phase4.structures].sort((a, b) => compareIdentifiers(a.id, b.id));
    if (authored.length !== configuration.structureCap) throw new Error("Phase 4 map must author exactly five structures");
    const counts = Object.fromEntries(structureCategories.map((category) => [category, 0]));
    const anchorById = new Map(map.layers.anchors.structures.map((anchor) => [anchor.id, anchor]));
    const spawnIdentifiers = new Set();
    for (const structure of authored) {
      const anchor = anchorById.get(structure.id);
      if (!validIdentifier(structure.id, configuration.structureIdMaxLength) || !structureCategories.includes(structure.category)) {
        throw new Error("Phase 4 map contains an invalid structure identity");
      }
      if (!anchor || structure.category !== anchor.category || structure.x !== anchor.x || structure.y !== anchor.y
        || structure.radius !== anchor.radius || structure.initialOwnerSeat !== anchor.seat
        || structure.faction !== (anchor.faction || null)) throw new Error("Phase 4 structure overlay diverges from its approved anchor");
      counts[structure.category] += 1;
      const produces = structure.category === "headquarters" || structure.category === "production-outpost";
      if ((produces && structure.spawnSlots.length !== 6) || (!produces && structure.spawnSlots.length !== 0)) {
        throw new Error("Phase 4 map must author six ordered slots for every producer only");
      }
      const expectedCapture = configApi.captureRadiusWorld[structure.category] || null;
      if (structure.captureRadius !== expectedCapture) throw new Error("Phase 4 capture radius diverges from configuration");
      for (let index = 0; index < structure.spawnSlots.length; index += 1) {
        const slot = structure.spawnSlots[index];
        if (!plainObject(slot) || !exactKeys(slot, ["id", "x", "y"])
          || slot.id !== `${structure.id}-spawn-${index + 1}` || spawnIdentifiers.has(slot.id)
          || !Number.isFinite(slot.x) || !Number.isFinite(slot.y)
          || slot.x < 0 || slot.y < 0 || slot.x > map.world.width || slot.y > map.world.height) {
          throw new Error("Phase 4 spawn slot is invalid");
        }
        spawnIdentifiers.add(slot.id);
      }
    }
    if (counts.headquarters !== 2 || counts["resource-point"] !== 1 || counts["production-outpost"] !== 2) {
      throw new Error("Phase 4 map structure taxonomy is invalid");
    }
    return authored;
  }

  function seatFactions(map) {
    const result = new Map();
    for (const structure of map.layers?.anchors?.structures || []) {
      if (structure.category !== "headquarters" || structure.seat === null) continue;
      if (result.has(structure.seat) || !factionRosters[structure.faction]) throw new Error("headquarters faction ownership is invalid");
      result.set(structure.seat, structure.faction);
    }
    if (result.size !== 2 || !result.has(1) || !result.has(2)) throw new Error("Phase 4 requires two faction seats");
    return result;
  }

  function fixedStructure(authored) {
    return {
      id: authored.id,
      category: authored.category,
      x: Math.round(authored.x * configuration.positionScale),
      y: Math.round(authored.y * configuration.positionScale),
      radius: Math.round(authored.radius * configuration.positionScale),
      ownerSeat: authored.initialOwnerSeat,
      destroyed: false,
      capture: { challengerSeat: null, progressTicks: 0 },
      queue: [],
      rally: null
    };
  }

  function createOpeningEntity(seat, kind, occurrence, slot) {
    const definition = representatives[kind];
    const direction = seat.facing === "right" ? 1 : -1;
    return {
      id: `seat-${seat.seat}-${kind}-${occurrence}`,
      ownerSeat: seat.seat,
      kind,
      x: Math.round((seat.x + slot.forward * direction) * configuration.positionScale),
      y: Math.round((seat.y + slot.lateral) * configuration.positionScale),
      radius: definition.radius,
      speedPerTick: definition.speedPerTick,
      facing: seat.facing,
      order: "IDLE",
      route: [], routeIndex: 0, formationDestination: null, repathCount: 0,
      progress: { distance: 0, stalledTicks: 0 }
    };
  }

  function openingState(map, seed) {
    if (!safeInteger(seed, 0, 0xffffffff)) throw new RangeError("seed must be an unsigned 32-bit integer");
    const factionBySeat = seatFactions(map);
    const structures = authoredStructures(map).map(fixedStructure);
    const navigator = navigationApi.createNavigator(map, configuration, structures);
    const largestRadius = configuration.largestRallyRadiusWorld * configuration.positionScale;
    for (const producer of authoredStructures(map).filter((structure) => structure.spawnSlots.length)) {
      const reference = {
        x: Math.round(producer.spawnSlots[0].x * configuration.positionScale),
        y: Math.round(producer.spawnSlots[0].y * configuration.positionScale)
      };
      for (const slot of producer.spawnSlots) {
        const point = { x: Math.round(slot.x * configuration.positionScale), y: Math.round(slot.y * configuration.positionScale) };
        if (!navigator.isPointClear(point, largestRadius)) throw new Error(`${slot.id} is not statically clear for the largest footprint`);
        if (!navigator.findRoute(reference, point, largestRadius).ok) {
          throw new Error(`${slot.id} is not statically reachable for the largest footprint`);
        }
      }
    }
    const seats = [...map.layers.anchors.playerSeats].sort((a, b) => a.seat - b.seat);
    if (seats.length !== 2 || seats[0].seat !== 1 || seats[1].seat !== 2) throw new Error("Phase 4 opening requires two ordered seats");
    const entities = [];
    for (const seat of seats) {
      const roster = factionRosters[factionBySeat.get(seat.seat)];
      const occurrences = new Map();
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
    for (let first = 0; first < entities.length; first += 1) {
      for (let second = first + 1; second < entities.length; second += 1) if (overlaps(entities[first], entities[second])) throw new Error("opening combat entities overlap");
    }
    const players = [1, 2].map((seat) => ({
      seat,
      faction: factionBySeat.get(seat),
      resources: configuration.startingResources,
      populationUsed: entities.filter((entity) => entity.ownerSeat === seat)
        .reduce((total, entity) => total + representatives[entity.kind].population, 0),
      populationReserved: 0,
      populationCap: configuration.populationCap
    }));
    if (players.some((player) => player.populationUsed !== configuration.openingPopulationUsed)) throw new Error("opening population is invalid");
    return {
      schemaVersion: configuration.schemaVersion,
      protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId,
      mapId: String(map.id), seed, tick: 0,
      nextSequence: 1, nextEntityNumber: 1, nextQueueNumber: 1,
      players, structures, entities, pendingCommands: []
    };
  }

  function validateCommandShape(value, sequenced) {
    if (!plainObject(value) || !COMMAND_KINDS.includes(value.kind)) return "kind";
    const expected = requestKeys(value.kind, sequenced);
    if (!exactKeys(value, expected)) return "shape";
    if (value.protocolVersion !== configuration.protocolVersion || value.configurationId !== configuration.configurationId) return "identity";
    if (value.issuingPlayer !== 1 && value.issuingPlayer !== 2) return "player";
    if (!safeInteger(value.targetTick, 1, configuration.simulationTickCap)) return "target-tick";
    if (sequenced && !safeInteger(value.sequence, 1, Number.MAX_SAFE_INTEGER - 1)) return "sequence";
    if (value.kind === "MOVE") {
      if (!denseArray(value.entityIds) || value.entityIds.length < 1 || value.entityIds.length > configuration.selectionCap) return "selection-cap";
      let previous = null;
      for (const id of value.entityIds) {
        if (!validIdentifier(id)) return "entity-id";
        if (previous !== null && compareIdentifiers(previous, id) >= 0) return previous === id ? "duplicate-entity" : "entity-order";
        previous = id;
      }
      if (!validatePointShape(value.destination)) return "destination";
    } else {
      if (!validIdentifier(value.structureId, configuration.structureIdMaxLength)) return "structure-id";
      if (value.kind === "QUEUE_PRODUCTION" && !validIdentifier(value.entityKind)) return "entity-kind";
      if (value.kind === "CANCEL_PRODUCTION" && !validIdentifier(value.queueItemId, configuration.queueIdMaxLength)) return "queue-item-id";
      if (value.kind === "SET_RALLY" && !validatePointShape(value.destination)) return "destination";
    }
    return null;
  }

  function structureAuthoredById(map) { return new Map(authoredStructures(map).map((value) => [value.id, value])); }
  function stateById(state) {
    return {
      entities: new Map(state.entities.map((value) => [value.id, value])),
      structures: new Map(state.structures.map((value) => [value.id, value])),
      players: new Map(state.players.map((value) => [value.seat, value]))
    };
  }

  function rallyLegality(state, map, navigator, structure, destination) {
    const authored = structureAuthoredById(map).get(structure.id);
    if (!authored || authored.spawnSlots.length !== 6) return "spawn-slots";
    const radius = configuration.largestRallyRadiusWorld * configuration.positionScale;
    if (!navigator.isPointClear(destination, radius)) return "blocked-destination";
    const first = authored.spawnSlots[0];
    const start = { x: Math.round(first.x * configuration.positionScale), y: Math.round(first.y * configuration.positionScale) };
    const route = navigator.findRoute(start, destination, radius);
    return route.ok ? null : "unreachable";
  }

  function validateSubmitReferences(state, map, navigator, value) {
    const lookup = stateById(state);
    if (value.kind === "MOVE") {
      for (const id of value.entityIds) {
        const entity = lookup.entities.get(id);
        if (!entity) return "missing-entity";
        if (entity.ownerSeat !== value.issuingPlayer) return "foreign-entity";
        if (!navigator.isPointClear(value.destination, entity.radius)) return "blocked-destination";
      }
      return null;
    }
    const structure = lookup.structures.get(value.structureId);
    if (!structure) return "missing-structure";
    if (structure.destroyed) return "destroyed";
    if (structure.ownerSeat !== value.issuingPlayer) return "foreign-structure";
    const producer = structure.category === "headquarters" || structure.category === "production-outpost";
    if (!producer) return "not-producer";
    if (value.kind === "QUEUE_PRODUCTION") {
      const player = lookup.players.get(value.issuingPlayer);
      if (!representatives[value.entityKind] || !productionRosters[player.faction].includes(value.entityKind)) return "entity-kind";
    } else if (value.kind === "CANCEL_PRODUCTION") {
      if (!structure.queue.some((item) => item.id === value.queueItemId)) return "missing-queue-item";
    } else if (value.kind === "SET_RALLY") {
      return rallyLegality(state, map, navigator, structure, value.destination);
    }
    return null;
  }

  function validateSubmission(state, map, navigator, value, sequenced) {
    const shape = validateCommandShape(value, sequenced);
    if (shape) return shape;
    if (!safeInteger(value.targetTick, state.tick + configuration.commandLeadMinTicks, state.tick + configuration.commandLeadMaxTicks)) return "target-tick";
    if (!safeInteger(state.nextSequence, 1, Number.MAX_SAFE_INTEGER - 1)) return "sequence";
    if (sequenced && value.sequence !== state.nextSequence) return "sequence";
    if (state.pendingCommands.length >= configuration.pendingCommandCap) return "command-cap";
    return validateSubmitReferences(state, map, navigator, value);
  }

  function stopEntity(entity) {
    entity.order = "IDLE"; entity.route = []; entity.routeIndex = 0;
    entity.formationDestination = null; entity.repathCount = 0;
    entity.progress = { distance: 0, stalledTicks: 0 };
  }

  function validatedState(snapshot, map) {
    validateSerializedSize(snapshot, configuration.snapshotByteCap, "snapshot");
    if (!exactKeys(snapshot, SNAPSHOT_KEYS)) throw new TypeError("snapshot has unknown or missing fields");
    if (snapshot.schemaVersion !== configuration.schemaVersion || snapshot.protocolVersion !== configuration.protocolVersion
      || snapshot.configurationId !== configuration.configurationId) throw new Error("snapshot identity is incompatible");
    if (snapshot.mapId !== String(map.id)) throw new Error("snapshot map identity does not match");
    if (!safeInteger(snapshot.seed, 0, 0xffffffff) || !safeInteger(snapshot.tick, 0, configuration.simulationTickCap)
      || !safeInteger(snapshot.nextSequence, 1) || !safeInteger(snapshot.nextEntityNumber, 1, configuration.generatedIdCap + 1)
      || !safeInteger(snapshot.nextQueueNumber, 1, configuration.generatedIdCap + 1)) throw new Error("snapshot counters are invalid");
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
        || typeof value.destroyed !== "boolean" || (value.ownerSeat !== null && value.ownerSeat !== 1 && value.ownerSeat !== 2)
        || !exactKeys(value.capture, CAPTURE_KEYS) || !denseArray(value.queue)
        || value.queue.length > configuration.productionQueueCap) throw new Error("snapshot structure state is invalid");
      if (value.category === "headquarters") {
        if (value.capture.challengerSeat !== null || value.capture.progressTicks !== 0
          || (!value.destroyed && value.ownerSeat !== expected.initialOwnerSeat)) throw new Error("headquarters state is invalid");
      } else {
        if ((value.capture.challengerSeat !== null && value.capture.challengerSeat !== 1 && value.capture.challengerSeat !== 2)
          || !safeInteger(value.capture.progressTicks, 0, configuration.captureRequiredTicks - 1)
          || (value.capture.progressTicks === 0) !== (value.capture.challengerSeat === null)
          || (value.capture.challengerSeat !== null && value.capture.challengerSeat === value.ownerSeat)) throw new Error("capture state is invalid");
      }
      if (value.destroyed && (value.ownerSeat !== null || value.queue.length || value.rally !== null
        || value.capture.challengerSeat !== null || value.capture.progressTicks !== 0)) throw new Error("destroyed structure retains active state");
      let priorQueueId = null;
      const queue = value.queue.map((item) => {
        if (!exactKeys(item, QUEUE_KEYS) || !validIdentifier(item.id, configuration.queueIdMaxLength)
          || !/^queue-\d{8}$/.test(item.id)
          || seenQueueIds.has(item.id) || (priorQueueId !== null && compareIdentifiers(priorQueueId, item.id) >= 0)
          || (item.ownerSeat !== 1 && item.ownerSeat !== 2)
          || item.ownerSeat !== value.ownerSeat || !representatives[item.entityKind]
          || representatives[item.entityKind].faction !== factionBySeat.get(item.ownerSeat)
          || !safeInteger(item.progressTicks, 0, representatives[item.entityKind].productionTicks)
          || typeof item.blockedComplete !== "boolean"
          || item.blockedComplete !== (item.progressTicks === representatives[item.entityKind].productionTicks)) {
          throw new Error("snapshot queue item is invalid");
        }
        seenQueueIds.add(item.id);
        priorQueueId = item.id;
        return cloneQueueItem(item);
      });
      if (queue.some((item, queueIndex) => queueIndex > 0 && item.progressTicks !== 0)) throw new Error("only queue head may progress");
      if (value.category !== "headquarters" && value.category !== "production-outpost" && queue.length) {
        throw new Error("non-producer structure retains a production queue");
      }
      return { ...cloneStructure(value), queue };
    });

    const navigator = navigationApi.createNavigator(map, configuration, structures);
    for (let index = 0; index < structures.length; index += 1) {
      const structure = structures[index];
      if (structure.rally !== null) {
        if (!validatePointShape(structure.rally) || structure.destroyed || structure.ownerSeat === null
          || (structure.category !== "headquarters" && structure.category !== "production-outpost")
          || rallyLegality({ structures }, map, navigator, structure, structure.rally)) throw new Error("snapshot rally is invalid");
      }
    }

    if (!denseArray(snapshot.entities) || snapshot.entities.length > configuration.entityCap) throw new Error("snapshot entity collection exceeds its bound");
    const entities = [];
    let priorEntityId = null;
    for (const value of snapshot.entities) {
      if (!exactKeys(value, ENTITY_KEYS) || !validIdentifier(value.id)
        || (priorEntityId !== null && compareIdentifiers(priorEntityId, value.id) >= 0)) throw new Error("snapshot entity identifiers are invalid");
      priorEntityId = value.id;
      const definition = representatives[value.kind];
      if (!definition || (value.ownerSeat !== 1 && value.ownerSeat !== 2) || definition.faction !== factionBySeat.get(value.ownerSeat)
        || value.radius !== definition.radius || value.speedPerTick !== definition.speedPerTick
        || !safeInteger(value.x) || !safeInteger(value.y) || !navigator.isPointClear(value, value.radius)
        || (value.facing !== "right" && value.facing !== "left") || (value.order !== "IDLE" && value.order !== "MOVE")
        || !denseArray(value.route) || value.route.length > configuration.routeWaypointCap
        || !safeInteger(value.routeIndex, 0, value.route.length) || !safeInteger(value.repathCount, 0, configuration.repathAttemptCap)
        || !exactKeys(value.progress, ["distance", "stalledTicks"]) || !safeInteger(value.progress.distance)
        || !safeInteger(value.progress.stalledTicks, 0, configuration.congestionTicks)) throw new Error("snapshot entity state is invalid");
      const entity = cloneEntity(value);
      for (const point of entity.route) if (!validatePointShape(point) || !navigator.isPointClear(point, entity.radius)) throw new Error("snapshot route is invalid");
      if (entity.formationDestination !== null && (!validatePointShape(entity.formationDestination)
        || !navigator.isPointClear(entity.formationDestination, entity.radius))) throw new Error("snapshot formation destination is invalid");
      if (entity.order === "IDLE") {
        if (entity.route.length || entity.routeIndex || entity.formationDestination !== null || entity.repathCount
          || entity.progress.distance || entity.progress.stalledTicks) throw new Error("idle entity retains movement state");
      } else if (!entity.route.length || entity.routeIndex >= entity.route.length || entity.formationDestination === null) {
        throw new Error("moving entity lacks a route");
      }
      if (entity.order === "MOVE") {
        const finalWaypoint = entity.route.at(-1);
        if (finalWaypoint.x !== entity.formationDestination.x || finalWaypoint.y !== entity.formationDestination.y) {
          throw new Error("moving route does not end at its formation destination");
        }
      }
      let segmentStart = entity;
      for (let routeIndex = entity.routeIndex; routeIndex < entity.route.length; routeIndex += 1) {
        if (!navigator.isSegmentClear(segmentStart, entity.route[routeIndex], entity.radius)) throw new Error("snapshot route crosses a blocker");
        segmentStart = entity.route[routeIndex];
      }
      entities.push(entity);
    }
    for (let first = 0; first < entities.length; first += 1) {
      for (let second = first + 1; second < entities.length; second += 1) if (overlaps(entities[first], entities[second])) throw new Error("snapshot entities overlap");
    }
    for (const player of players) {
      const used = entities.filter((entity) => entity.ownerSeat === player.seat)
        .reduce((total, entity) => total + representatives[entity.kind].population, 0);
      const reserved = structures.flatMap((structure) => structure.queue).filter((item) => item.ownerSeat === player.seat)
        .reduce((total, item) => total + representatives[item.entityKind].population, 0);
      if (used !== player.populationUsed || reserved !== player.populationReserved) throw new Error("snapshot population accounting is inconsistent");
      const refundable = structures.flatMap((structure) => structure.queue).filter((item) => item.ownerSeat === player.seat)
        .reduce((total, item) => total + representatives[item.entityKind].cost, 0);
      if (player.resources > Number.MAX_SAFE_INTEGER - refundable) {
        throw new Error("snapshot Resource cannot safely settle its production queue");
      }
    }
    for (const entity of entities) {
      const match = /^entity-(\d{8})$/.exec(entity.id);
      if (match && Number(match[1]) >= snapshot.nextEntityNumber) throw new Error("snapshot next entity number is not monotonic");
    }
    for (const queueId of seenQueueIds) {
      const match = /^queue-(\d{8})$/.exec(queueId);
      if (match && Number(match[1]) >= snapshot.nextQueueNumber) throw new Error("snapshot next queue number is not monotonic");
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
      pendingCommands.push(cloneCommand(value));
      previousCommand = value;
      seenSequences.add(value.sequence);
    }
    return {
      schemaVersion: snapshot.schemaVersion, protocolVersion: snapshot.protocolVersion,
      configurationId: snapshot.configurationId, mapId: snapshot.mapId, seed: snapshot.seed,
      tick: snapshot.tick, nextSequence: snapshot.nextSequence,
      nextEntityNumber: snapshot.nextEntityNumber, nextQueueNumber: snapshot.nextQueueNumber,
      players, structures, entities, pendingCommands
    };
  }

  function createEngine(state, map) {
    const navigator = navigationApi.createNavigator(map, configuration, () => state.structures);
    const authoredById = structureAuthoredById(map);

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

    function assignMovement(entityIds, destination, issuingPlayer) {
      const entityById = new Map(state.entities.map((entity) => [entity.id, entity]));
      const selected = entityIds.map((id) => entityById.get(id));
      if (selected.some((entity) => !entity || entity.ownerSeat !== issuingPlayer)) return { ok: false, code: "ownership" };
      const slots = navigationApi.formationDestinations(selected, destination, configuration);
      const plans = [];
      for (const slot of slots) {
        const entity = entityById.get(slot.entityId);
        const route = navigator.findRoute(entity, slot.destination, entity.radius);
        if (!route.ok) return { ok: false, code: "unreachable" };
        plans.push({ entity, destination: slot.destination, route: route.waypoints });
      }
      for (const plan of plans) {
        plan.entity.order = "MOVE"; plan.entity.route = plan.route.map(clonePoint); plan.entity.routeIndex = 0;
        plan.entity.formationDestination = clonePoint(plan.destination); plan.entity.repathCount = 0;
        plan.entity.progress = { distance: distanceFixed(plan.entity, plan.destination), stalledTicks: 0 };
      }
      return { ok: true, code: "ok" };
    }

    function playerFor(seat) { return state.players[seat - 1]; }
    function structureFor(id) { return state.structures.find((structure) => structure.id === id); }

    function refundableResourceForSeat(seat) {
      return state.structures.flatMap((structure) => structure.queue)
        .filter((item) => item.ownerSeat === seat)
        .reduce((total, item) => total + representatives[item.entityKind].cost, 0);
    }

    function assertRefundCapacity(player, amount) {
      if (!safeInteger(amount) || player.resources > Number.MAX_SAFE_INTEGER - amount) {
        throw new RangeError("Resource refund exceeds safe integer bound");
      }
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
        const player = playerFor(structure.queue[0].ownerSeat);
        const refund = structure.queue.reduce((total, item) => total + representatives[item.entityKind].cost, 0);
        assertRefundCapacity(player, refund);
      }
      for (const item of structure.queue) refundItem(item);
      structure.queue = [];
      structure.rally = null;
      return count;
    }

    function applyStructureDestruction(structureId) {
      if (!validIdentifier(structureId, configuration.structureIdMaxLength)) return Object.freeze({ ok: false, code: "structure-id" });
      const structure = structureFor(structureId);
      if (!structure) return Object.freeze({ ok: false, code: "missing-structure" });
      if (structure.destroyed) return Object.freeze({ ok: false, code: "destroyed" });
      const priorOwnerSeat = structure.ownerSeat;
      const refundedItems = settleQueue(structure);
      structure.ownerSeat = null;
      structure.destroyed = true;
      structure.capture = { challengerSeat: null, progressTicks: 0 };
      return Object.freeze({ ok: true, structureId, priorOwnerSeat, refundedItems });
    }

    function executeCommand(command) {
      const baseEvent = { type: "command", sequence: command.sequence };
      if (command.kind === "MOVE") {
        const result = assignMovement(command.entityIds, command.destination, command.issuingPlayer);
        return Object.freeze({ ...baseEvent, status: result.ok ? "applied" : "rejected", code: result.code });
      }
      const structure = structureFor(command.structureId);
      if (!structure || structure.destroyed || structure.ownerSeat !== command.issuingPlayer) {
        return Object.freeze({ ...baseEvent, status: "rejected", code: !structure ? "missing-structure" : structure.destroyed ? "destroyed" : "ownership" });
      }
      const producer = structure.category === "headquarters" || structure.category === "production-outpost";
      if (!producer) return Object.freeze({ ...baseEvent, status: "rejected", code: "not-producer" });
      if (command.kind === "QUEUE_PRODUCTION") {
        const definition = representatives[command.entityKind];
        const player = playerFor(command.issuingPlayer);
        if (!definition || definition.faction !== player.faction) return Object.freeze({ ...baseEvent, status: "rejected", code: "entity-kind" });
        if (structure.queue.length >= configuration.productionQueueCap) return Object.freeze({ ...baseEvent, status: "rejected", code: "queue-cap" });
        if (player.resources < definition.cost) return Object.freeze({ ...baseEvent, status: "rejected", code: "resources" });
        if (player.populationUsed + player.populationReserved + definition.population > player.populationCap) {
          return Object.freeze({ ...baseEvent, status: "rejected", code: "population-cap" });
        }
        if (state.nextQueueNumber > configuration.generatedIdCap) return Object.freeze({ ...baseEvent, status: "rejected", code: "queue-id-cap" });
        const queueItemId = `queue-${String(state.nextQueueNumber).padStart(8, "0")}`;
        state.nextQueueNumber += 1;
        player.resources -= definition.cost;
        player.populationReserved += definition.population;
        structure.queue.push({ id: queueItemId, ownerSeat: player.seat, entityKind: command.entityKind, progressTicks: 0, blockedComplete: false });
        return Object.freeze({ ...baseEvent, status: "applied", code: "ok", queueItemId });
      }
      if (command.kind === "CANCEL_PRODUCTION") {
        const index = structure.queue.findIndex((item) => item.id === command.queueItemId);
        if (index < 0) return Object.freeze({ ...baseEvent, status: "rejected", code: "missing-queue-item" });
        const item = structure.queue[index];
        refundItem(item);
        structure.queue.splice(index, 1);
        return Object.freeze({ ...baseEvent, status: "applied", code: "refunded", queueItemId: item.id });
      }
      if (command.kind === "SET_RALLY") {
        const error = rallyLegality(state, map, navigator, structure, command.destination);
        if (error) return Object.freeze({ ...baseEvent, status: "rejected", code: error });
        structure.rally = clonePoint(command.destination);
        return Object.freeze({ ...baseEvent, status: "applied", code: "ok" });
      }
      structure.rally = null;
      return Object.freeze({ ...baseEvent, status: "applied", code: "ok" });
    }

    function proposeMovement(entity) {
      const proposal = { entity, x: entity.x, y: entity.y, routeIndex: entity.routeIndex, facing: entity.facing, moved: false };
      if (entity.order !== "MOVE") return proposal;
      let remaining = entity.speedPerTick;
      let safety = 0;
      while (remaining > 0 && proposal.routeIndex < entity.route.length && safety <= configuration.routeWaypointCap) {
        const waypoint = entity.route[proposal.routeIndex];
        const deltaX = waypoint.x - proposal.x;
        const deltaY = waypoint.y - proposal.y;
        const distance = Math.hypot(deltaX, deltaY);
        if (deltaX !== 0) proposal.facing = deltaX > 0 ? "right" : "left";
        if (distance === 0) { proposal.routeIndex += 1; safety += 1; continue; }
        let nextX; let nextY;
        if (distance <= remaining) { nextX = waypoint.x; nextY = waypoint.y; }
        else {
          let stepX = Math.trunc(deltaX * remaining / distance);
          let stepY = Math.trunc(deltaY * remaining / distance);
          if (stepX === 0 && stepY === 0) {
            if (Math.abs(deltaX) >= Math.abs(deltaY)) stepX = Math.sign(deltaX); else stepY = Math.sign(deltaY);
          }
          nextX = proposal.x + stepX; nextY = proposal.y + stepY;
        }
        const nextPoint = { x: nextX, y: nextY };
        if (!navigator.isSegmentClear({ x: proposal.x, y: proposal.y }, nextPoint, entity.radius)
          || !navigator.isSegmentClear(nextPoint, waypoint, entity.radius)) break;
        const travelled = Math.floor(Math.hypot(nextX - proposal.x, nextY - proposal.y));
        proposal.x = nextX; proposal.y = nextY; proposal.moved ||= travelled > 0;
        if (distance <= remaining) { proposal.routeIndex += 1; remaining = Math.max(0, remaining - travelled); } else remaining = 0;
        safety += 1;
      }
      return proposal;
    }

    function applySeparation(proposals) {
      for (let pass = 0; pass < configuration.separationPasses; pass += 1) {
        const changes = proposals.map(() => ({ x: 0, y: 0 }));
        for (let first = 0; first < proposals.length; first += 1) for (let second = first + 1; second < proposals.length; second += 1) {
          const a = proposals[first]; const b = proposals[second];
          const aMoving = a.entity.order === "MOVE"; const bMoving = b.entity.order === "MOVE";
          if (!aMoving && !bMoving) continue;
          const deltaX = b.x - a.x; const deltaY = b.y - a.y;
          const minimum = a.entity.radius + b.entity.radius;
          const squared = deltaX * deltaX + deltaY * deltaY;
          if (squared >= minimum * minimum) continue;
          const distance = Math.floor(Math.sqrt(squared));
          const overlap = minimum - distance + 1;
          const directionX = distance === 0 ? 1 : deltaX / distance;
          const directionY = distance === 0 ? 0 : deltaY / distance;
          if (aMoving) {
            const share = bMoving ? Math.ceil(overlap / 2) : overlap;
            changes[first].x -= Math.round(directionX * share); changes[first].y -= Math.round(directionY * share);
          }
          if (bMoving) {
            const share = aMoving ? Math.floor(overlap / 2) : overlap;
            changes[second].x += Math.round(directionX * share); changes[second].y += Math.round(directionY * share);
          }
        }
        for (let index = 0; index < proposals.length; index += 1) {
          const proposal = proposals[index];
          if (proposal.entity.order !== "MOVE") continue;
          const candidate = { x: proposal.x + changes[index].x, y: proposal.y + changes[index].y };
          const nextWaypoint = proposal.entity.route[proposal.routeIndex];
          if ((!nextWaypoint || navigator.isSegmentClear(candidate, nextWaypoint, proposal.entity.radius))
            && navigator.isSegmentClear(proposal, candidate, proposal.entity.radius)) {
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
        const occupied = [...accepted, ...proposals.slice(index + 1).map((later) => ({ x: later.entity.x, y: later.entity.y, radius: later.entity.radius }))];
        if (occupied.some((other) => overlaps(candidate, other))) {
          proposal.x = proposal.entity.x; proposal.y = proposal.entity.y; proposal.routeIndex = proposal.entity.routeIndex;
          proposal.facing = proposal.entity.facing; proposal.moved = false;
        }
        accepted.push({ x: proposal.x, y: proposal.y, radius: proposal.entity.radius });
      }
    }

    function updateMovement(events) {
      const proposals = state.entities.map(proposeMovement);
      applySeparation(proposals); enforceHardFootprints(proposals);
      for (const proposal of proposals) {
        const entity = proposal.entity;
        entity.x = proposal.x; entity.y = proposal.y; entity.routeIndex = proposal.routeIndex; entity.facing = proposal.facing;
        if (entity.order !== "MOVE") continue;
        const destination = entity.formationDestination;
        if (entity.routeIndex >= entity.route.length && entity.x === destination.x && entity.y === destination.y) {
          const entityId = entity.id; stopEntity(entity);
          events.push(Object.freeze({ type: "entity", entityId, status: "completed", code: "destination-reached" }));
          continue;
        }
        if (entity.routeIndex >= entity.route.length) entity.routeIndex = entity.route.length - 1;
        const distance = distanceFixed(entity, destination);
        if (entity.progress.distance - distance >= configuration.materialProgressFixed) entity.progress = { distance, stalledTicks: 0 };
        else entity.progress.stalledTicks += 1;
        if (entity.progress.stalledTicks < configuration.congestionTicks) continue;
        if (entity.repathCount < configuration.repathAttemptCap) {
          const route = navigator.findRoute(entity, destination, entity.radius);
          entity.repathCount += 1; entity.progress = { distance, stalledTicks: 0 };
          if (route.ok) { entity.route = route.waypoints.map(clonePoint); entity.routeIndex = 0; }
          continue;
        }
        const entityId = entity.id; stopEntity(entity);
        events.push(Object.freeze({ type: "entity", entityId, status: "stopped", code: "congestion" }));
      }
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
        events.push(Object.freeze({ type: "structure", structureId: structure.id, status: "captured", priorOwnerSeat, ownerSeat: nextOwnerSeat, refundedItems }));
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
      if (state.entities.length >= configuration.entityCap) return null;
      const definition = representatives[item.entityKind];
      const authored = authoredById.get(structure.id);
      const reference = {
        x: Math.round(authored.spawnSlots[0].x * configuration.positionScale),
        y: Math.round(authored.spawnSlots[0].y * configuration.positionScale)
      };
      for (const slot of authored.spawnSlots) {
        const point = { x: Math.round(slot.x * configuration.positionScale), y: Math.round(slot.y * configuration.positionScale) };
        if (!navigator.isPointClear(point, definition.radius)) continue;
        if (!navigator.findRoute(reference, point, definition.radius).ok) continue;
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
          if (!item.blockedComplete) events.push(Object.freeze({ type: "production", structureId: structure.id, queueItemId: item.id, status: "blocked", code: "spawn-blocked" }));
          item.blockedComplete = true;
          continue;
        }
        if (state.nextEntityNumber > configuration.generatedIdCap) {
          item.blockedComplete = true;
          continue;
        }
        const player = playerFor(item.ownerSeat);
        const entityId = `entity-${String(state.nextEntityNumber).padStart(8, "0")}`;
        state.nextEntityNumber += 1;
        const seatAnchor = map.layers.anchors.playerSeats.find((seat) => seat.seat === item.ownerSeat);
        const entity = {
          id: entityId, ownerSeat: item.ownerSeat, kind: item.entityKind,
          x: slot.x, y: slot.y, radius: definition.radius, speedPerTick: definition.speedPerTick,
          facing: seatAnchor.facing, order: "IDLE", route: [], routeIndex: 0,
          formationDestination: null, repathCount: 0, progress: { distance: 0, stalledTicks: 0 }
        };
        structure.queue.shift();
        player.populationReserved -= definition.population;
        player.populationUsed += definition.population;
        state.entities.push(entity);
        state.entities.sort((a, b) => compareIdentifiers(a.id, b.id));
        if (structure.rally) spawnedRallies.push({ entityId, ownerSeat: entity.ownerSeat, destination: clonePoint(structure.rally), structureId: structure.id });
        events.push(Object.freeze({ type: "production", structureId: structure.id, queueItemId: item.id, entityId, status: "completed", code: "spawned" }));
      }
    }

    function assignSpawnedRallies(spawnedRallies, events) {
      for (const rally of spawnedRallies) {
        const result = assignMovement([rally.entityId], rally.destination, rally.ownerSeat);
        events.push(Object.freeze({ type: "rally", structureId: rally.structureId, entityId: rally.entityId,
          status: result.ok ? "applied" : "rejected", code: result.code }));
      }
    }

    function stepOnce() {
      if (state.tick >= configuration.simulationTickCap) throw new RangeError("simulation tick exceeds its bound");
      state.tick += 1;
      const events = [];
      const due = [];
      while (state.pendingCommands.length && state.pendingCommands[0].targetTick === state.tick) due.push(state.pendingCommands.shift());
      due.sort((a, b) => a.sequence - b.sequence);
      for (const command of due) events.push(executeCommand(command));
      updateMovement(events);
      updateCapture(events);
      settleIncome();
      const spawnedRallies = [];
      updateProduction(events, spawnedRallies);
      assignSpawnedRallies(spawnedRallies, events);
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

    const engine = {
      get tick() { return state.tick; },
      configuration,
      submitCommand,
      submitMove(request) { return submitTyped("MOVE", request); },
      submitQueueProduction(request) { return submitTyped("QUEUE_PRODUCTION", request); },
      submitCancelProduction(request) { return submitTyped("CANCEL_PRODUCTION", request); },
      submitSetRally(request) { return submitTyped("SET_RALLY", request); },
      submitClearRally(request) { return submitTyped("CLEAR_RALLY", request); },
      acceptCommand,
      step() { return advance(1); },
      advance,
      snapshot() { return snapshotState(state); }
    };
    if (commonJS) engine.applyStructureDestruction = applyStructureDestruction;
    return Object.freeze(engine);
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
  else window.AeonPhase4Simulation = api;
}());
