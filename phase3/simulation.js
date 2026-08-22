/* global window */
"use strict";

(function exposePhase3Simulation() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase3Config;
  const navigationApi = commonJS ? require("./navigation.js") : window.AeonPhase3Navigation;
  const defaultMap = commonJS ? require("../phase2/map.js") : window.AeonPhase2Map;
  const { configuration, representatives, factionRosters, openingSlots, compareIdentifiers } = configApi;

  const SNAPSHOT_KEYS = Object.freeze([
    "configurationId", "entities", "mapId", "nextSequence", "pendingCommands",
    "protocolVersion", "schemaVersion", "seed", "tick"
  ]);
  const ENTITY_KEYS = Object.freeze([
    "facing", "formationDestination", "id", "kind", "order", "ownerSeat", "progress",
    "radius", "repathCount", "route", "routeIndex", "speedPerTick", "x", "y"
  ]);
  const REQUEST_KEYS = Object.freeze([
    "configurationId", "destination", "entityIds", "issuingPlayer", "kind", "protocolVersion", "targetTick"
  ]);
  const COMMAND_KEYS = Object.freeze([...REQUEST_KEYS, "sequence"].sort(compareIdentifiers));

  function exactKeys(value, expected) {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
      return false;
    }
    const keys = Object.keys(value).sort(compareIdentifiers);
    return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
  }

  function denseArray(value) {
    if (!Array.isArray(value) || Object.keys(value).length !== value.length) return false;
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) return false;
    }
    return true;
  }

  function safeInteger(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
    return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  }

  function validIdentifier(value, maximumLength = configuration.entityIdMaxLength) {
    return typeof value === "string" && value.length >= 1 && value.length <= maximumLength && /^[A-Za-z0-9-]+$/.test(value);
  }

  function clonePoint(point) {
    return { x: point.x, y: point.y };
  }

  function cloneCommand(command) {
    return {
      protocolVersion: command.protocolVersion,
      configurationId: command.configurationId,
      kind: command.kind,
      issuingPlayer: command.issuingPlayer,
      sequence: command.sequence,
      targetTick: command.targetTick,
      entityIds: [...command.entityIds],
      destination: clonePoint(command.destination)
    };
  }

  function frozenCommand(command) {
    const cloned = cloneCommand(command);
    Object.freeze(cloned.entityIds);
    Object.freeze(cloned.destination);
    return Object.freeze(cloned);
  }

  function cloneEntity(entity) {
    return {
      id: entity.id,
      ownerSeat: entity.ownerSeat,
      kind: entity.kind,
      x: entity.x,
      y: entity.y,
      radius: entity.radius,
      speedPerTick: entity.speedPerTick,
      facing: entity.facing,
      order: entity.order,
      route: entity.route.map(clonePoint),
      routeIndex: entity.routeIndex,
      formationDestination: entity.formationDestination ? clonePoint(entity.formationDestination) : null,
      repathCount: entity.repathCount,
      progress: { distance: entity.progress.distance, stalledTicks: entity.progress.stalledTicks }
    };
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
      entities: state.entities.map(cloneEntity),
      pendingCommands: state.pendingCommands.map(cloneCommand)
    };
  }

  function distanceFixed(first, second) {
    return Math.floor(Math.hypot(second.x - first.x, second.y - first.y));
  }

  function overlaps(first, second) {
    const deltaX = first.x - second.x;
    const deltaY = first.y - second.y;
    const minimum = first.radius + second.radius;
    return deltaX * deltaX + deltaY * deltaY < minimum * minimum;
  }

  function commandOrder(first, second) {
    return first.targetTick - second.targetTick || first.sequence - second.sequence;
  }

  function resolveMap(candidate) {
    const map = candidate || defaultMap;
    if (!map) throw new Error("Phase 3 requires the approved Phase 2 map before simulation starts");
    if (!validIdentifier(String(map.id), configuration.mapIdMaxLength)) throw new TypeError("map identifier must be bounded ASCII");
    return map;
  }

  function seatFactions(map) {
    const result = new Map();
    for (const structure of map.layers?.anchors?.structures || []) {
      if (structure.category !== "headquarters" || structure.seat === null) continue;
      if (result.has(structure.seat)) throw new Error(`seat ${structure.seat} has more than one headquarters faction owner`);
      if (!factionRosters[structure.faction]) throw new Error(`seat ${structure.seat} has an unknown headquarters faction owner`);
      result.set(structure.seat, structure.faction);
    }
    if (result.size !== 2 || !result.has(1) || !result.has(2)) {
      throw new Error("Phase 3 requires one faction headquarters owner for each seat");
    }
    return result;
  }

  function openingState(map, seed) {
    if (!safeInteger(seed, 0, 0xffffffff)) throw new RangeError("seed must be an unsigned 32-bit integer");
    const navigator = navigationApi.createNavigator(map, configuration);
    const seats = [...(map.layers?.anchors?.playerSeats || [])].sort((first, second) => first.seat - second.seat);
    if (seats.length !== 2 || seats[0].seat !== 1 || seats[1].seat !== 2) {
      throw new Error("Phase 3 opening state requires the approved two-seat map contract");
    }
    const entities = [];
    const factionBySeat = seatFactions(map);
    for (const seat of seats) {
      const roster = factionRosters[factionBySeat.get(seat.seat)];
      if (!roster || roster.length !== openingSlots.length || (seat.facing !== "right" && seat.facing !== "left")) {
        throw new Error(`seat ${seat.seat} does not map to one approved opening faction and facing`);
      }
      const occurrences = new Map();
      for (let index = 0; index < roster.length; index += 1) {
        const kind = roster[index];
        const definition = representatives[kind];
        const occurrence = (occurrences.get(kind) || 0) + 1;
        occurrences.set(kind, occurrence);
        const slot = openingSlots[index];
        const direction = seat.facing === "right" ? 1 : -1;
        const entity = {
          id: `seat-${seat.seat}-${kind}-${occurrence}`,
          ownerSeat: seat.seat,
          kind,
          x: Math.round((seat.x + slot.forward * direction) * configuration.positionScale),
          y: Math.round((seat.y + slot.lateral) * configuration.positionScale),
          radius: definition.radius,
          speedPerTick: definition.speedPerTick,
          facing: seat.facing,
          order: "IDLE",
          route: [],
          routeIndex: 0,
          formationDestination: null,
          repathCount: 0,
          progress: { distance: 0, stalledTicks: 0 }
        };
        if (!navigator.isPointClear(entity, entity.radius)) throw new Error(`${entity.id} opening position is blocked`);
        entities.push(entity);
      }
    }
    entities.sort((first, second) => compareIdentifiers(first.id, second.id));
    for (let first = 0; first < entities.length; first += 1) {
      for (let second = first + 1; second < entities.length; second += 1) {
        if (overlaps(entities[first], entities[second])) throw new Error("opening combat entities overlap");
      }
    }
    if (entities.length !== configuration.openingEntityCount || entities.length > configuration.entityCap) {
      throw new Error("opening roster does not match the Phase 3 entity bounds");
    }
    return {
      schemaVersion: configuration.schemaVersion,
      protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId,
      mapId: String(map.id),
      seed,
      tick: 0,
      nextSequence: 1,
      entities,
      pendingCommands: []
    };
  }

  function validatePointShape(point) {
    return exactKeys(point, ["x", "y"]) && safeInteger(point.x) && safeInteger(point.y);
  }

  function validateCommand(state, navigator, value, sequenced) {
    const expectedKeys = sequenced ? COMMAND_KEYS : REQUEST_KEYS;
    if (!exactKeys(value, expectedKeys)) return "shape";
    if (value.protocolVersion !== configuration.protocolVersion || value.configurationId !== configuration.configurationId) return "identity";
    if (value.kind !== "MOVE") return "kind";
    if (value.issuingPlayer !== 1 && value.issuingPlayer !== 2) return "player";
    if (!safeInteger(value.targetTick, state.tick + configuration.commandLeadMinTicks, state.tick + configuration.commandLeadMaxTicks)) return "target-tick";
    if (!safeInteger(state.nextSequence, 1, Number.MAX_SAFE_INTEGER - 1)) return "sequence";
    if (sequenced && (!safeInteger(value.sequence, 1, Number.MAX_SAFE_INTEGER - 1) || value.sequence !== state.nextSequence)) return "sequence";
    if (!denseArray(value.entityIds) || value.entityIds.length < 1 || value.entityIds.length > configuration.selectionCap) return "selection-cap";
    let previous = null;
    const entityById = new Map(state.entities.map((entity) => [entity.id, entity]));
    const selected = [];
    for (const entityId of value.entityIds) {
      if (!validIdentifier(entityId)) return "entity-id";
      if (previous !== null && compareIdentifiers(previous, entityId) >= 0) return previous === entityId ? "duplicate-entity" : "entity-order";
      previous = entityId;
      const entity = entityById.get(entityId);
      if (!entity) return "missing-entity";
      if (entity.ownerSeat !== value.issuingPlayer) return "foreign-entity";
      selected.push(entity);
    }
    if (!validatePointShape(value.destination)) return "destination";
    for (const entity of selected) {
      if (!navigator.isPointClear(value.destination, entity.radius)) return "blocked-destination";
    }
    if (state.pendingCommands.length >= configuration.pendingCommandCap) return "command-cap";
    return null;
  }

  function validateSerializedSize(value, cap, label) {
    let encoded;
    try {
      encoded = JSON.stringify(value);
    } catch {
      throw new TypeError(`${label} must be acyclic JSON data`);
    }
    if (encoded === undefined || encoded.length > cap) throw new RangeError(`${label} exceeds its encoded bound`);
  }

  function validatedState(snapshot, map) {
    validateSerializedSize(snapshot, configuration.snapshotByteCap, "snapshot");
    if (!exactKeys(snapshot, SNAPSHOT_KEYS)) throw new TypeError("snapshot has unknown or missing fields");
    if (snapshot.schemaVersion !== configuration.schemaVersion
      || snapshot.protocolVersion !== configuration.protocolVersion
      || snapshot.configurationId !== configuration.configurationId) {
      throw new Error("snapshot protocol or configuration identity is incompatible");
    }
    if (snapshot.mapId !== String(map.id) || !validIdentifier(snapshot.mapId, configuration.mapIdMaxLength)) {
      throw new Error("snapshot map identity does not match the loaded map");
    }
    if (!safeInteger(snapshot.seed, 0, 0xffffffff)
      || !safeInteger(snapshot.tick, 0, configuration.simulationTickCap)
      || !safeInteger(snapshot.nextSequence, 1)) {
      throw new TypeError("snapshot seed, tick, and next sequence must be bounded integers");
    }
    if (!denseArray(snapshot.entities) || snapshot.entities.length > configuration.entityCap) {
      throw new RangeError("snapshot entity collection exceeds its bound");
    }
    const navigator = navigationApi.createNavigator(map, configuration);
    const factionBySeat = seatFactions(map);
    const maximumProgressDistance = Math.floor(Math.hypot(navigator.worldWidth, navigator.worldHeight));
    const entities = [];
    let previousId = null;
    for (const value of snapshot.entities) {
      if (!exactKeys(value, ENTITY_KEYS)) throw new TypeError("snapshot entity has unknown or missing fields");
      if (!validIdentifier(value.id) || (previousId !== null && compareIdentifiers(previousId, value.id) >= 0)) {
        throw new Error("snapshot entity identifiers must be unique and raw-ASCII sorted");
      }
      previousId = value.id;
      const definition = representatives[value.kind];
      if (!definition
        || (value.ownerSeat !== 1 && value.ownerSeat !== 2)
        || definition.faction !== factionBySeat.get(value.ownerSeat)) {
        throw new Error("snapshot entity kind or owner is invalid");
      }
      if (value.radius !== definition.radius || value.speedPerTick !== definition.speedPerTick) throw new Error("snapshot entity movement definition changed");
      if (!safeInteger(value.x) || !safeInteger(value.y) || !navigator.isPointClear(value, value.radius)) {
        throw new Error("snapshot entity position is invalid or blocked");
      }
      if (value.facing !== "right" && value.facing !== "left") throw new Error("snapshot entity facing is invalid");
      if (value.order !== "IDLE" && value.order !== "MOVE") throw new Error("snapshot entity order is invalid");
      if (!denseArray(value.route) || value.route.length > configuration.routeWaypointCap) throw new RangeError("snapshot route exceeds its bound");
      const route = value.route.map((point) => {
        if (!validatePointShape(point) || !navigator.isPointClear(point, value.radius)) throw new Error("snapshot route contains a blocked point");
        return clonePoint(point);
      });
      if (!safeInteger(value.routeIndex, 0, route.length) || !safeInteger(value.repathCount, 0, configuration.repathAttemptCap)) {
        throw new Error("snapshot route cursor or repath count is invalid");
      }
      if (!exactKeys(value.progress, ["distance", "stalledTicks"])
        || !safeInteger(value.progress.distance, 0, maximumProgressDistance)
        || !safeInteger(value.progress.stalledTicks, 0, configuration.congestionTicks)) {
        throw new Error("snapshot progress marker is invalid");
      }
      let formationDestination = null;
      if (value.formationDestination !== null) {
        if (!validatePointShape(value.formationDestination) || !navigator.isPointClear(value.formationDestination, value.radius)) {
          throw new Error("snapshot formation destination is invalid");
        }
        formationDestination = clonePoint(value.formationDestination);
      }
      if (value.order === "IDLE") {
        if (route.length !== 0 || value.routeIndex !== 0 || formationDestination !== null || value.repathCount !== 0
          || value.progress.distance !== 0 || value.progress.stalledTicks !== 0) {
          throw new Error("idle snapshot entity retains movement state");
        }
      } else if (route.length < 1 || value.routeIndex >= route.length || formationDestination === null) {
        throw new Error("moving snapshot entity lacks an active bounded route");
      }
      if (value.order === "MOVE") {
        const finalWaypoint = route.at(-1);
        if (finalWaypoint.x !== formationDestination.x || finalWaypoint.y !== formationDestination.y) {
          throw new Error("moving snapshot route does not end at its formation destination");
        }
      }
      let segmentStart = { x: value.x, y: value.y };
      for (let index = value.routeIndex; index < route.length; index += 1) {
        if (!navigator.isSegmentClear(segmentStart, route[index], value.radius)) throw new Error("snapshot route crosses a hard blocker");
        segmentStart = route[index];
      }
      entities.push({
        id: value.id,
        ownerSeat: value.ownerSeat,
        kind: value.kind,
        x: value.x,
        y: value.y,
        radius: value.radius,
        speedPerTick: value.speedPerTick,
        facing: value.facing,
        order: value.order,
        route,
        routeIndex: value.routeIndex,
        formationDestination,
        repathCount: value.repathCount,
        progress: { distance: value.progress.distance, stalledTicks: value.progress.stalledTicks }
      });
    }
    for (let first = 0; first < entities.length; first += 1) {
      for (let second = first + 1; second < entities.length; second += 1) {
        if (overlaps(entities[first], entities[second])) throw new Error("snapshot entity footprints overlap");
      }
    }
    if (!denseArray(snapshot.pendingCommands) || snapshot.pendingCommands.length > configuration.pendingCommandCap) {
      throw new RangeError("snapshot pending command collection exceeds its bound");
    }
    const state = {
      schemaVersion: snapshot.schemaVersion,
      protocolVersion: snapshot.protocolVersion,
      configurationId: snapshot.configurationId,
      mapId: snapshot.mapId,
      seed: snapshot.seed,
      tick: snapshot.tick,
      nextSequence: snapshot.nextSequence,
      entities,
      pendingCommands: []
    };
    let previousCommand = null;
    const seenSequences = new Set();
    for (const value of snapshot.pendingCommands) {
      if (!exactKeys(value, COMMAND_KEYS)) throw new TypeError("snapshot command has unknown or missing fields");
      const savedNext = state.nextSequence;
      state.nextSequence = value.sequence;
      const error = validateCommand(state, navigator, value, true);
      state.nextSequence = savedNext;
      if (error) throw new Error(`snapshot command is invalid: ${error}`);
      if (value.sequence >= snapshot.nextSequence || seenSequences.has(value.sequence)) throw new Error("snapshot command sequence is invalid");
      if (previousCommand && commandOrder(previousCommand, value) >= 0) throw new Error("snapshot commands are not in total order");
      const command = cloneCommand(value);
      state.pendingCommands.push(command);
      previousCommand = command;
      seenSequences.add(command.sequence);
    }
    return state;
  }

  function createEngine(state, map) {
    const navigator = navigationApi.createNavigator(map, configuration);

    function enqueue(command) {
      state.pendingCommands.push(cloneCommand(command));
      state.pendingCommands.sort(commandOrder);
      state.nextSequence = command.sequence + 1;
      return Object.freeze({ ok: true, acceptedTick: state.tick, command: frozenCommand(command) });
    }

    function submitMove(request) {
      const error = validateCommand(state, navigator, request, false);
      if (error) return Object.freeze({ ok: false, code: error });
      return enqueue({ ...request, sequence: state.nextSequence });
    }

    function acceptCommand(command) {
      const error = validateCommand(state, navigator, command, true);
      if (error) return Object.freeze({ ok: false, code: error });
      return enqueue(command);
    }

    function stopEntity(entity) {
      entity.order = "IDLE";
      entity.route = [];
      entity.routeIndex = 0;
      entity.formationDestination = null;
      entity.repathCount = 0;
      entity.progress = { distance: 0, stalledTicks: 0 };
    }

    function assignCommand(command) {
      const entityById = new Map(state.entities.map((entity) => [entity.id, entity]));
      const selected = command.entityIds.map((entityId) => entityById.get(entityId));
      const slots = navigationApi.formationDestinations(selected, command.destination, configuration);
      const plans = [];
      for (const slot of slots) {
        const entity = entityById.get(slot.entityId);
        const route = navigator.findRoute(entity, slot.destination, entity.radius);
        if (!route.ok) {
          return Object.freeze({ type: "command", sequence: command.sequence, status: "rejected", code: "unreachable" });
        }
        plans.push({ entity, destination: slot.destination, route: route.waypoints });
      }
      for (const plan of plans) {
        plan.entity.order = "MOVE";
        plan.entity.route = plan.route.map(clonePoint);
        plan.entity.routeIndex = 0;
        plan.entity.formationDestination = clonePoint(plan.destination);
        plan.entity.repathCount = 0;
        plan.entity.progress = {
          distance: distanceFixed(plan.entity, plan.destination),
          stalledTicks: 0
        };
      }
      return Object.freeze({ type: "command", sequence: command.sequence, status: "applied", code: "ok" });
    }

    function proposeMovement(entity) {
      const proposal = {
        entity,
        x: entity.x,
        y: entity.y,
        routeIndex: entity.routeIndex,
        facing: entity.facing,
        moved: false
      };
      if (entity.order !== "MOVE") return proposal;
      let remaining = entity.speedPerTick;
      let safety = 0;
      while (remaining > 0 && proposal.routeIndex < entity.route.length && safety <= configuration.routeWaypointCap) {
        const waypoint = entity.route[proposal.routeIndex];
        const deltaX = waypoint.x - proposal.x;
        const deltaY = waypoint.y - proposal.y;
        const distance = Math.hypot(deltaX, deltaY);
        if (deltaX !== 0) proposal.facing = deltaX > 0 ? "right" : "left";
        if (distance === 0) {
          proposal.routeIndex += 1;
          safety += 1;
          continue;
        }
        let nextX;
        let nextY;
        if (distance <= remaining) {
          nextX = waypoint.x;
          nextY = waypoint.y;
        } else {
          let stepX = Math.trunc(deltaX * remaining / distance);
          let stepY = Math.trunc(deltaY * remaining / distance);
          if (stepX === 0 && stepY === 0) {
            if (Math.abs(deltaX) >= Math.abs(deltaY)) stepX = Math.sign(deltaX);
            else stepY = Math.sign(deltaY);
          }
          nextX = proposal.x + stepX;
          nextY = proposal.y + stepY;
        }
        const nextPoint = { x: nextX, y: nextY };
        if (!navigator.isSegmentClear({ x: proposal.x, y: proposal.y }, nextPoint, entity.radius)
          || !navigator.isSegmentClear(nextPoint, waypoint, entity.radius)) break;
        const travelled = Math.floor(Math.hypot(nextX - proposal.x, nextY - proposal.y));
        proposal.x = nextX;
        proposal.y = nextY;
        proposal.moved = proposal.moved || travelled > 0;
        if (distance <= remaining) {
          proposal.routeIndex += 1;
          remaining = Math.max(0, remaining - travelled);
        } else {
          remaining = 0;
        }
        safety += 1;
      }
      return proposal;
    }

    function applySeparation(proposals) {
      for (let pass = 0; pass < configuration.separationPasses; pass += 1) {
        const changes = proposals.map(() => ({ x: 0, y: 0 }));
        for (let first = 0; first < proposals.length; first += 1) {
          for (let second = first + 1; second < proposals.length; second += 1) {
            const firstProposal = proposals[first];
            const secondProposal = proposals[second];
            const firstMoving = firstProposal.entity.order === "MOVE";
            const secondMoving = secondProposal.entity.order === "MOVE";
            if (!firstMoving && !secondMoving) continue;
            const deltaX = secondProposal.x - firstProposal.x;
            const deltaY = secondProposal.y - firstProposal.y;
            const minimum = firstProposal.entity.radius + secondProposal.entity.radius;
            const distanceSquared = deltaX * deltaX + deltaY * deltaY;
            if (distanceSquared >= minimum * minimum) continue;
            const distance = Math.floor(Math.sqrt(distanceSquared));
            const overlap = minimum - distance + 1;
            const directionX = distance === 0 ? 1 : deltaX / distance;
            const directionY = distance === 0 ? 0 : deltaY / distance;
            const firstShare = secondMoving ? Math.ceil(overlap / 2) : overlap;
            const secondShare = firstMoving ? Math.floor(overlap / 2) : overlap;
            if (firstMoving) {
              changes[first].x -= Math.round(directionX * firstShare);
              changes[first].y -= Math.round(directionY * firstShare);
            }
            if (secondMoving) {
              changes[second].x += Math.round(directionX * secondShare);
              changes[second].y += Math.round(directionY * secondShare);
            }
          }
        }
        for (let index = 0; index < proposals.length; index += 1) {
          const proposal = proposals[index];
          if (proposal.entity.order !== "MOVE") continue;
          const candidate = { x: proposal.x + changes[index].x, y: proposal.y + changes[index].y };
          const nextWaypoint = proposal.entity.route[proposal.routeIndex];
          const keepsRouteLegal = !nextWaypoint
            || navigator.isSegmentClear(candidate, nextWaypoint, proposal.entity.radius);
          if (keepsRouteLegal && navigator.isSegmentClear(proposal, candidate, proposal.entity.radius)) {
            proposal.x = candidate.x;
            proposal.y = candidate.y;
          }
        }
      }
    }

    function enforceHardFootprints(proposals) {
      const accepted = [];
      for (let index = 0; index < proposals.length; index += 1) {
        const proposal = proposals[index];
        const candidate = {
          x: proposal.x,
          y: proposal.y,
          radius: proposal.entity.radius
        };
        const occupied = [
          ...accepted,
          ...proposals.slice(index + 1).map((later) => ({ x: later.entity.x, y: later.entity.y, radius: later.entity.radius }))
        ];
        if (occupied.some((other) => overlaps(candidate, other))) {
          proposal.x = proposal.entity.x;
          proposal.y = proposal.entity.y;
          proposal.routeIndex = proposal.entity.routeIndex;
          proposal.facing = proposal.entity.facing;
          proposal.moved = false;
        }
        accepted.push({ x: proposal.x, y: proposal.y, radius: proposal.entity.radius });
      }
    }

    function updateMovement(events) {
      const proposals = state.entities.map(proposeMovement);
      applySeparation(proposals);
      enforceHardFootprints(proposals);
      for (const proposal of proposals) {
        const entity = proposal.entity;
        entity.x = proposal.x;
        entity.y = proposal.y;
        entity.routeIndex = proposal.routeIndex;
        entity.facing = proposal.facing;
        if (entity.order !== "MOVE") continue;
        const destination = entity.formationDestination;
        if (entity.routeIndex >= entity.route.length && entity.x === destination.x && entity.y === destination.y) {
          const entityId = entity.id;
          stopEntity(entity);
          events.push(Object.freeze({ type: "entity", entityId, status: "completed", code: "destination-reached" }));
          continue;
        }
        if (entity.routeIndex >= entity.route.length) entity.routeIndex = entity.route.length - 1;
        const distance = distanceFixed(entity, destination);
        const material = configuration.materialProgressFixed;
        if (entity.progress.distance - distance >= material) {
          entity.progress.distance = distance;
          entity.progress.stalledTicks = 0;
        } else {
          entity.progress.stalledTicks += 1;
        }
        if (entity.progress.stalledTicks < configuration.congestionTicks) continue;
        if (entity.repathCount < configuration.repathAttemptCap) {
          const route = navigator.findRoute(entity, destination, entity.radius);
          entity.repathCount += 1;
          entity.progress = { distance, stalledTicks: 0 };
          if (route.ok) {
            entity.route = route.waypoints.map(clonePoint);
            entity.routeIndex = 0;
          }
          continue;
        }
        const entityId = entity.id;
        stopEntity(entity);
        events.push(Object.freeze({ type: "entity", entityId, status: "stopped", code: "congestion" }));
      }
    }

    function stepOnce() {
      if (state.tick >= configuration.simulationTickCap) {
        throw new RangeError("simulation tick exceeds its deterministic integer bound");
      }
      state.tick += 1;
      const events = [];
      const due = [];
      while (state.pendingCommands.length > 0 && state.pendingCommands[0].targetTick === state.tick) {
        due.push(state.pendingCommands.shift());
      }
      for (const command of due) events.push(assignCommand(command));
      updateMovement(events);
      return Object.freeze({ tick: state.tick, events: Object.freeze(events) });
    }

    function advance(count = 1) {
      if (!safeInteger(count, 1, configuration.maxCatchUpTicks)) {
        throw new RangeError(`advance count must be between 1 and ${configuration.maxCatchUpTicks}`);
      }
      const events = [];
      for (let index = 0; index < count; index += 1) events.push(...stepOnce().events);
      return Object.freeze({ tick: state.tick, events: Object.freeze(events) });
    }

    const engine = {
      get tick() { return state.tick; },
      configuration,
      submitMove,
      acceptCommand,
      step() { return advance(1); },
      advance,
      snapshot() { return snapshotState(state); }
    };
    return Object.freeze(engine);
  }

  function createSimulation(options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options) || Object.getPrototypeOf(options) !== Object.prototype) {
      throw new TypeError("simulation options must be a plain object");
    }
    const allowed = new Set(["map", "seed"]);
    for (const key of Object.keys(options)) if (!allowed.has(key)) throw new TypeError(`unknown simulation option: ${key}`);
    const map = resolveMap(options.map);
    return createEngine(openingState(map, options.seed ?? 1), map);
  }

  function restoreSimulation(snapshot, options = {}) {
    const allowed = new Set(["map"]);
    if (!options || typeof options !== "object" || Array.isArray(options) || Object.getPrototypeOf(options) !== Object.prototype) {
      throw new TypeError("restore options must be a plain object");
    }
    for (const key of Object.keys(options)) if (!allowed.has(key)) throw new TypeError(`unknown restore option: ${key}`);
    const map = resolveMap(options.map);
    return createEngine(validatedState(snapshot, map), map);
  }

  function validateSnapshot(snapshot, options = {}) {
    if (!options || typeof options !== "object" || Array.isArray(options) || Object.getPrototypeOf(options) !== Object.prototype) {
      throw new TypeError("snapshot validation options must be a plain object");
    }
    for (const key of Object.keys(options)) if (key !== "map") throw new TypeError(`unknown snapshot validation option: ${key}`);
    const map = resolveMap(options.map);
    return snapshotState(validatedState(snapshot, map));
  }

  const api = Object.freeze({ createSimulation, restoreSimulation, validateSnapshot });
  if (commonJS) module.exports = api;
  else window.AeonPhase3Simulation = api;
}());
