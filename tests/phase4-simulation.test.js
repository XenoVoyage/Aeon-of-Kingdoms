"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const configApi = require(path.join(ROOT, "phase4/config.js"));
const map = require(path.join(ROOT, "phase4/map.js"));
const navigationApi = require(path.join(ROOT, "phase4/navigation.js"));
const simulationApi = require(path.join(ROOT, "phase4/simulation.js"));
const replayApi = require(path.join(ROOT, "phase4/replay.js"));
const { configuration, representatives } = configApi;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function command(simulation, kind, payload = {}, overrides = {}) {
  return {
    protocolVersion: configuration.protocolVersion,
    configurationId: configuration.configurationId,
    kind,
    issuingPlayer: 1,
    targetTick: simulation.snapshot().tick + 1,
    ...payload,
    ...overrides
  };
}

function seat(snapshot, number) {
  return snapshot.players.find((candidate) => (candidate.seat ?? candidate.id) === number);
}

function structure(snapshot, id) {
  return snapshot.structures.find((candidate) => candidate.id === id);
}

function firstOwnedProducer(snapshot, ownerSeat = 1) {
  return snapshot.structures.find((candidate) => (
    candidate.ownerSeat === ownerSeat
    && (candidate.category === "headquarters" || candidate.category === "production-outpost")
    && candidate.destroyed !== true
  ));
}

function queueOf(producer) {
  return producer.queue || producer.productionQueue;
}

function resourceOf(player) {
  return player.resource ?? player.resources;
}

function populationOf(player, key) {
  if (player.population && typeof player.population === "object") return player.population[key];
  const property = `population${key[0].toUpperCase()}${key.slice(1)}`;
  return player[property];
}

function assertIntegerPoint(point, label) {
  assert.ok(point && Number.isSafeInteger(point.x) && Number.isSafeInteger(point.y), `${label} must be fixed-point integers`);
}

function assertCanonicalCollections(snapshot) {
  for (const key of ["entities", "structures", "players", "pendingCommands"]) {
    assert.ok(Array.isArray(snapshot[key]), `${key} must be an authoritative array`);
  }
  assert.deepEqual(
    snapshot.entities.map(({ id }) => id),
    [...snapshot.entities.map(({ id }) => id)].sort(configApi.compareIdentifiers),
    "combat entities must stay in raw-ASCII identifier order"
  );
  assert.deepEqual(
    snapshot.structures.map(({ id }) => id),
    [...snapshot.structures.map(({ id }) => id)].sort(configApi.compareIdentifiers),
    "structures must stay in raw-ASCII identifier order"
  );
}

function assertNoEntityOverlaps(entities) {
  for (let first = 0; first < entities.length; first += 1) {
    for (let second = first + 1; second < entities.length; second += 1) {
      const deltaX = entities[first].x - entities[second].x;
      const deltaY = entities[first].y - entities[second].y;
      const minimum = entities[first].radius + entities[second].radius;
      assert.ok(
        deltaX * deltaX + deltaY * deltaY >= minimum * minimum,
        `${entities[first].id} overlaps ${entities[second].id}`
      );
    }
  }
}

function stopEntity(entity) {
  entity.order = "IDLE";
  entity.route = [];
  entity.routeIndex = 0;
  entity.formationDestination = null;
  entity.repathCount = 0;
  entity.progress = { distance: 0, stalledTicks: 0 };
}

function placeContributor(snapshot, structureId, ownerSeat, side = ownerSeat === 1 ? -1 : 1) {
  const target = structure(snapshot, structureId);
  const entity = snapshot.entities.find((candidate) => (
    candidate.ownerSeat === ownerSeat
    && representatives[candidate.kind].role === "ranged"
  ));
  entity.x = target.x + side * 7000;
  entity.y = target.y;
  stopEntity(entity);
  return entity.id;
}

function restoreOpeningPosition(snapshot, entityId) {
  const opening = simulationApi.createSimulation({ seed: snapshot.seed }).snapshot();
  const source = opening.entities.find((entity) => entity.id === entityId);
  const target = snapshot.entities.find((entity) => entity.id === entityId);
  Object.assign(target, clone(source));
}

function stepMany(simulation, count) {
  const events = [];
  for (let index = 0; index < count; index += 1) events.push(...simulation.step().events);
  return events;
}

function captureFor(simulation, structureId, ownerSeat) {
  const staged = simulation.snapshot();
  placeContributor(staged, structureId, ownerSeat);
  const capturing = simulationApi.restoreSimulation(staged);
  const events = stepMany(capturing, configuration.captureRequiredTicks);
  const captureEvent = events.find((event) => event.type === "structure" && event.structureId === structureId);
  assert.ok(captureEvent, `${structureId} should capture after the frozen tick count`);
  assert.equal(structure(capturing.snapshot(), structureId).ownerSeat, ownerSeat);
  return capturing;
}

function queueRequest(simulation, producer, entityKind, overrides = {}) {
  return command(simulation, "QUEUE_PRODUCTION", {
    structureId: producer.id,
    entityKind
  }, overrides);
}

test("Phase 4 freezes the approved integer economy, population, capture, and production table", () => {
  assert.equal(Object.isFrozen(configuration), true);
  assert.equal(configuration.schemaVersion, 2);
  assert.equal(configuration.protocolVersion, 2);
  assert.equal(configuration.configurationId, "phase4-structures-economy-v1");
  assert.equal(configuration.tickRate, 20);
  assert.equal(configuration.tickDurationMs, 50);
  assert.equal(configuration.positionScale, 100);
  assert.equal(configuration.startingResources, 240);
  assert.equal(configuration.populationCap, 18);
  assert.equal(configuration.openingPopulationUsed, 10);
  assert.equal(configuration.entityCap, 36);
  assert.equal(configuration.combatEntityCap, 36);
  assert.equal(configuration.productionQueueCap, 5);
  assert.equal(configuration.resourceIncomeAmount, 12);
  assert.equal(configuration.resourceIncomeIntervalTicks, 20);
  assert.equal(configuration.captureRequiredTicks, 120);
  assert.equal(configuration.captureUnwindPerTick, 2);
  assert.equal(configuration.refundPercent, 100);
  assert.equal(configuration.largestRallyRadiusWorld, 24);
  assert.deepEqual(configApi.structureCategories, [
    "headquarters",
    "resource-point",
    "production-outpost"
  ]);
  assert.deepEqual(configApi.captureRadiusWorld, {
    "resource-point": 112,
    "production-outpost": 124
  });

  const byRole = Object.values(representatives).reduce((result, representative) => {
    result[representative.role] ||= [];
    result[representative.role].push([
      representative.cost,
      representative.productionTicks,
      representative.population
    ]);
    return result;
  }, {});
  assert.deepEqual(byRole.melee, [[60, 80, 1], [60, 80, 1]]);
  assert.deepEqual(byRole.ranged, [[80, 100, 1], [80, 100, 1]]);
  assert.deepEqual(byRole.signature, [[180, 180, 3], [180, 180, 3]]);
  assert.deepEqual(configApi.productionRosters, {
    "astral-concord": ["astral-guardian", "starbow", "aegis-titan"],
    "gravebound-court": ["gravebound-reaver", "hollow-string", "ossuary-colossus"]
  });
});

test("the approved map has exactly five instances across three categories and six ordered producer spawn slots", () => {
  assert.equal(Object.isFrozen(map), true);
  assert.deepEqual(map.layerOrder, [
    "ground", "detail", "navigation", "anchors", "dynamic", "foreground"
  ]);
  assert.deepEqual(map.phase4.structureCategories, configApi.structureCategories);
  assert.equal(map.phase4.structures.length, 5);
  assert.deepEqual(
    map.phase4.structures.reduce((counts, candidate) => ({
      ...counts,
      [candidate.category]: (counts[candidate.category] || 0) + 1
    }), {}),
    { headquarters: 2, "resource-point": 1, "production-outpost": 2 }
  );
  const resourcePoint = map.phase4.structures.find(({ category }) => category === "resource-point");
  const outposts = map.phase4.structures.filter(({ category }) => category === "production-outpost");
  const headquarters = map.phase4.structures.filter(({ category }) => category === "headquarters");
  assert.equal(resourcePoint.initialOwnerSeat, null);
  assert.equal(resourcePoint.captureRadius, 112);
  assert.deepEqual(outposts.map(({ initialOwnerSeat, captureRadius }) => [initialOwnerSeat, captureRadius]), [
    [null, 124], [null, 124]
  ]);
  assert.deepEqual(headquarters.map(({ initialOwnerSeat, captureRadius }) => [initialOwnerSeat, captureRadius]), [
    [1, null], [2, null]
  ]);
  for (const producer of [...headquarters, ...outposts]) {
    assert.equal(producer.spawnSlots.length, 6, `${producer.id} must expose the frozen bounded slot count`);
    assert.equal(new Set(producer.spawnSlots.map(({ id }) => id)).size, 6);
    for (let index = 0; index < producer.spawnSlots.length; index += 1) {
      const slot = producer.spawnSlots[index];
      assert.equal(slot.id, `${producer.id}-spawn-${index + 1}`);
      assert.ok(slot.x >= 0 && slot.x <= map.world.width);
      assert.ok(slot.y >= 0 && slot.y <= map.world.height);
    }
  }
  assert.equal(resourcePoint.spawnSlots.length, 0);
});

test("opening state is bounded, sorted, detached, and accounts for Resource and population", () => {
  const simulation = simulationApi.createSimulation({ seed: 0x1234abcd });
  const first = simulation.snapshot();
  const second = simulation.snapshot();
  assert.notEqual(first, second);
  assert.equal(first.schemaVersion, 2);
  assert.equal(first.protocolVersion, 2);
  assert.equal(first.configurationId, "phase4-structures-economy-v1");
  assert.equal(first.mapId, map.id);
  assert.equal(first.tick, 0);
  assert.equal(first.entities.length, 12);
  assert.equal(first.structures.length, 5);
  assert.equal(first.players.length, 2);
  assertCanonicalCollections(first);
  assertNoEntityOverlaps(first.entities);

  for (const player of first.players) {
    assert.equal(resourceOf(player), 240);
    assert.equal(populationOf(player, "used"), 10);
    assert.equal(populationOf(player, "reserved"), 0);
    assert.equal(populationOf(player, "cap"), 18);
  }
  for (const producer of first.structures.filter(({ category }) => category !== "resource-point")) {
    assert.deepEqual(queueOf(producer), []);
    assert.equal(producer.rally, null);
    assert.equal(producer.destroyed, false);
  }
  for (const shared of first.structures.filter(({ category }) => category !== "headquarters")) {
    assert.equal(shared.ownerSeat, null);
    assert.deepEqual(shared.capture, { challengerSeat: null, progressTicks: 0 });
  }
  first.entities[0].x = 1;
  first.players[0].resource = 1;
  first.structures[0].ownerSeat = null;
  assert.notEqual(simulation.snapshot().entities[0].x, 1);
  assert.notEqual(resourceOf(seat(simulation.snapshot(), 1)), 1);
  assert.notEqual(simulation.snapshot().structures[0].ownerSeat, null);
});

test("all five commands share one strict, detached, contiguous acceptance boundary", () => {
  const simulation = simulationApi.createSimulation();
  const snapshot = simulation.snapshot();
  const entityId = snapshot.entities.find(({ ownerSeat }) => ownerSeat === 1).id;
  const producer = firstOwnedProducer(snapshot, 1);
  const requests = [
    command(simulation, "MOVE", { entityIds: [entityId], destination: { x: 50000, y: 50000 } }),
    command(simulation, "QUEUE_PRODUCTION", { structureId: producer.id, entityKind: "astral-guardian" }),
    command(simulation, "SET_RALLY", { structureId: producer.id, destination: { x: 45000, y: 40000 } }),
    command(simulation, "CLEAR_RALLY", { structureId: producer.id })
  ];
  for (let index = 0; index < requests.length; index += 1) {
    const receipt = simulation.submitCommand(requests[index]);
    assert.equal(receipt.ok, true);
    assert.equal(receipt.acceptedTick, 0);
    assert.equal(receipt.command.sequence, index + 1);
  }
  requests[0].entityIds[0] = "changed";
  requests[1].structureId = "changed";
  const accepted = simulation.snapshot().pendingCommands;
  assert.notEqual(accepted[0].entityIds[0], "changed");
  assert.notEqual(accepted[1].structureId, "changed");

  const strictCases = [
    command(simulation, "MOVE", { entityIds: [entityId], destination: { x: 50000, y: 50000 }, extra: true }),
    command(simulation, "QUEUE_PRODUCTION", { structureId: producer.id, entityKind: "astral-guardian", extra: true }),
    command(simulation, "CANCEL_PRODUCTION", { structureId: producer.id, queueItemId: "queue-1", extra: true }),
    command(simulation, "SET_RALLY", { structureId: producer.id, destination: { x: 45000, y: 40000 }, extra: true }),
    command(simulation, "CLEAR_RALLY", { structureId: producer.id, extra: true })
  ];
  for (const request of strictCases) {
    assert.deepEqual(simulation.submitCommand(request), { ok: false, code: "shape" });
  }
  assert.deepEqual(simulation.submitCommand(command(simulation, "ATTACK", {})), { ok: false, code: "kind" });
  assert.deepEqual(simulation.submitCommand(command(simulation, "MOVE", {
    entityIds: [entityId], destination: { x: 50000, y: 50000 }
  }, { protocolVersion: 1 })), { ok: false, code: "identity" });
  assert.deepEqual(simulation.submitCommand(command(simulation, "MOVE", {
    entityIds: [entityId], destination: { x: 50000, y: 50000 }
  }, { targetTick: simulation.tick })), { ok: false, code: "target-tick" });
  assert.deepEqual(simulation.acceptCommand({
    ...command(simulation, "MOVE", { entityIds: [entityId], destination: { x: 50000, y: 50000 } }),
    sequence: 99
  }), { ok: false, code: "sequence" });
});

test("capture advances, contests freeze, absence unwinds by two, and a new challenger cannot inherit progress", () => {
  const structureId = "central-resource-point-anchor";
  let snapshot = simulationApi.createSimulation().snapshot();
  const seatOneEntity = placeContributor(snapshot, structureId, 1, -1);
  let simulation = simulationApi.restoreSimulation(snapshot);
  stepMany(simulation, 10);
  assert.deepEqual(structure(simulation.snapshot(), structureId).capture, {
    challengerSeat: 1,
    progressTicks: 10
  });

  snapshot = simulation.snapshot();
  const seatTwoEntity = placeContributor(snapshot, structureId, 2, 1);
  simulation = simulationApi.restoreSimulation(snapshot);
  stepMany(simulation, 6);
  assert.deepEqual(structure(simulation.snapshot(), structureId).capture, {
    challengerSeat: 1,
    progressTicks: 10
  }, "both seats present must freeze rather than bias by identifier order");

  snapshot = simulation.snapshot();
  restoreOpeningPosition(snapshot, seatOneEntity);
  simulation = simulationApi.restoreSimulation(snapshot);
  stepMany(simulation, 5);
  assert.deepEqual(structure(simulation.snapshot(), structureId).capture, {
    challengerSeat: null,
    progressTicks: 0
  }, "the old challenge must unwind completely before switching seats");
  simulation.step();
  assert.deepEqual(structure(simulation.snapshot(), structureId).capture, {
    challengerSeat: 2,
    progressTicks: 1
  });

  snapshot = simulation.snapshot();
  restoreOpeningPosition(snapshot, seatTwoEntity);
  simulation = simulationApi.restoreSimulation(snapshot);
  simulation.step();
  assert.deepEqual(structure(simulation.snapshot(), structureId).capture, {
    challengerSeat: null,
    progressTicks: 0
  }, "absence unwinds by two ticks and clears a zero-progress challenger");
});

test("capture completes at exactly 120 ticks and an income-boundary capture pays the new owner", () => {
  const structureId = "central-resource-point-anchor";
  const staged = simulationApi.createSimulation().snapshot();
  placeContributor(staged, structureId, 1);
  const simulation = simulationApi.restoreSimulation(staged);
  const initialResource = resourceOf(seat(simulation.snapshot(), 1));
  stepMany(simulation, configuration.captureRequiredTicks - 1);
  let target = structure(simulation.snapshot(), structureId);
  assert.equal(target.ownerSeat, null);
  assert.deepEqual(target.capture, { challengerSeat: 1, progressTicks: 119 });
  assert.equal(resourceOf(seat(simulation.snapshot(), 1)), initialResource);

  const result = simulation.step();
  target = structure(simulation.snapshot(), structureId);
  assert.equal(target.ownerSeat, 1);
  assert.deepEqual(target.capture, { challengerSeat: null, progressTicks: 0 });
  assert.ok(result.events.some((event) => (
    event.type === "structure"
    && event.structureId === structureId
    && event.status === "captured"
    && event.ownerSeat === 1
  )));
  assert.equal(
    resourceOf(seat(simulation.snapshot(), 1)),
    initialResource + configuration.resourceIncomeAmount,
    "tick order must award the interval income to the seat that captured this tick"
  );
  stepMany(simulation, configuration.resourceIncomeIntervalTicks);
  assert.equal(resourceOf(seat(simulation.snapshot(), 1)), initialResource + 24);
  assert.equal(resourceOf(seat(simulation.snapshot(), 2)), 240);
});

test("owner defense unwinds hostile progress and headquarters never capture", () => {
  const resourceId = "central-resource-point-anchor";
  let simulation = captureFor(simulationApi.createSimulation(), resourceId, 1);
  let snapshot = simulation.snapshot();
  const defenderId = snapshot.entities.find(({ ownerSeat, kind }) => ownerSeat === 1 && kind === "starbow").id;
  restoreOpeningPosition(snapshot, defenderId);
  const intruderId = placeContributor(snapshot, resourceId, 2, 1);
  simulation = simulationApi.restoreSimulation(snapshot);
  stepMany(simulation, 8);
  assert.deepEqual(structure(simulation.snapshot(), resourceId).capture, {
    challengerSeat: 2,
    progressTicks: 8
  });
  snapshot = simulation.snapshot();
  restoreOpeningPosition(snapshot, intruderId);
  placeContributor(snapshot, resourceId, 1, -1);
  simulation = simulationApi.restoreSimulation(snapshot);
  stepMany(simulation, 4);
  assert.deepEqual(structure(simulation.snapshot(), resourceId).capture, {
    challengerSeat: null,
    progressTicks: 0
  });

  const hqId = "astral-headquarters-anchor";
  snapshot = simulation.snapshot();
  const headquarters = structure(snapshot, hqId);
  const headquartersVisitor = placeContributor(snapshot, hqId, 2, 1);
  snapshot.entities.find(({ id }) => id === headquartersVisitor).x = headquarters.x + 10000;
  simulation = simulationApi.restoreSimulation(snapshot);
  stepMany(simulation, configuration.captureRequiredTicks + 10);
  assert.equal(structure(simulation.snapshot(), hqId).ownerSeat, 1);
  assert.deepEqual(structure(simulation.snapshot(), hqId).capture, {
    challengerSeat: null,
    progressTicks: 0
  });
});

test("queue execution spends Resource, reserves population, and advances its head on the command tick", () => {
  const simulation = simulationApi.createSimulation();
  const producer = firstOwnedProducer(simulation.snapshot(), 1);
  const receipt = simulation.submitCommand(queueRequest(simulation, producer, "astral-guardian"));
  assert.equal(receipt.ok, true);
  const result = simulation.step();
  assert.deepEqual(result.events[0], {
    type: "command",
    sequence: 1,
    status: "applied",
    code: "ok",
    queueItemId: "queue-00000001"
  });
  const snapshot = simulation.snapshot();
  const player = seat(snapshot, 1);
  const item = queueOf(structure(snapshot, producer.id))[0];
  assert.equal(resourceOf(player), 180);
  assert.equal(populationOf(player, "used"), 10);
  assert.equal(populationOf(player, "reserved"), 1);
  assert.deepEqual(item, {
    id: "queue-00000001",
    ownerSeat: 1,
    entityKind: "astral-guardian",
    progressTicks: 1,
    blockedComplete: false
  });
});

test("only the queue head advances, capacity is five, and same-tick execution is sequence-stable", () => {
  const staged = simulationApi.createSimulation().snapshot();
  seat(staged, 1).resources = 10000;
  const simulation = simulationApi.restoreSimulation(staged);
  const producer = firstOwnedProducer(simulation.snapshot(), 1);
  const receipts = [];
  for (let index = 0; index < 6; index += 1) {
    receipts.push(simulation.submitCommand(queueRequest(simulation, producer, "astral-guardian")));
  }
  assert.ok(receipts.every(({ ok }) => ok), "receipt validation defers mutable economy and queue checks to target tick");
  const result = simulation.step();
  assert.deepEqual(result.events.map(({ sequence, status, code }) => [sequence, status, code]), [
    [1, "applied", "ok"],
    [2, "applied", "ok"],
    [3, "applied", "ok"],
    [4, "applied", "ok"],
    [5, "applied", "ok"],
    [6, "rejected", "queue-cap"]
  ]);
  const queue = queueOf(structure(simulation.snapshot(), producer.id));
  assert.equal(queue.length, 5);
  assert.equal(queue[0].progressTicks, 1);
  assert.ok(queue.slice(1).every(({ progressTicks }) => progressTicks === 0));
  assert.equal(populationOf(seat(simulation.snapshot(), 1), "reserved"), 5);
});

test("resource and population rejection happen deterministically at execution", () => {
  const simulation = simulationApi.createSimulation();
  const producer = firstOwnedProducer(simulation.snapshot(), 1);
  for (const kind of ["aegis-titan", "astral-guardian", "starbow"]) {
    assert.equal(simulation.submitCommand(queueRequest(simulation, producer, kind)).ok, true);
  }
  const result = simulation.step();
  assert.deepEqual(result.events.map(({ status, code }) => [status, code]), [
    ["applied", "ok"],
    ["applied", "ok"],
    ["rejected", "resources"]
  ]);
  assert.equal(resourceOf(seat(simulation.snapshot(), 1)), 0);
  assert.equal(populationOf(seat(simulation.snapshot(), 1), "reserved"), 4);

  const populationStaged = simulationApi.createSimulation().snapshot();
  seat(populationStaged, 1).resources = 10000;
  const populationSimulation = simulationApi.restoreSimulation(populationStaged);
  const populationProducer = firstOwnedProducer(populationSimulation.snapshot(), 1);
  for (let index = 0; index < 3; index += 1) {
    assert.equal(populationSimulation.submitCommand(queueRequest(
      populationSimulation,
      populationProducer,
      "aegis-titan"
    )).ok, true);
  }
  const populationResult = populationSimulation.step();
  assert.deepEqual(populationResult.events.map(({ status, code }) => [status, code]), [
    ["applied", "ok"],
    ["applied", "ok"],
    ["rejected", "population-cap"]
  ]);
  assert.equal(populationOf(seat(populationSimulation.snapshot(), 1), "reserved"), 6);
});

test("completion uses authoritative ticks, ordered clear slots, monotonic IDs, and exact population conversion", () => {
  const simulation = simulationApi.createSimulation();
  const before = simulation.snapshot();
  const producer = firstOwnedProducer(before, 1);
  const authored = map.phase4.structures.find(({ id }) => id === producer.id);
  const navigator = navigationApi.createNavigator(map, configuration, before.structures);
  const definition = representatives["astral-guardian"];
  const expectedSlot = authored.spawnSlots.find((slot) => {
    const point = {
      x: slot.x * configuration.positionScale,
      y: slot.y * configuration.positionScale
    };
    if (!navigator.isPointClear(point, definition.radius)) return false;
    return !before.entities.some((entity) => {
      const deltaX = entity.x - point.x;
      const deltaY = entity.y - point.y;
      const minimum = entity.radius + definition.radius;
      return deltaX * deltaX + deltaY * deltaY < minimum * minimum;
    });
  });
  assert.ok(expectedSlot, "the producer needs at least one clear authored slot");
  assert.equal(simulation.submitCommand(queueRequest(simulation, producer, "astral-guardian")).ok, true);
  const events = stepMany(simulation, representatives["astral-guardian"].productionTicks);
  const completed = events.find((event) => event.type === "production" && event.status === "completed");
  assert.ok(completed);
  assert.equal(completed.entityId, "entity-00000001");
  const snapshot = simulation.snapshot();
  assert.equal(snapshot.entities.length, 13);
  assert.equal(queueOf(structure(snapshot, producer.id)).length, 0);
  assert.equal(populationOf(seat(snapshot, 1), "used"), 11);
  assert.equal(populationOf(seat(snapshot, 1), "reserved"), 0);
  assert.deepEqual(
    snapshot.entities.map(({ id }) => id),
    [...snapshot.entities.map(({ id }) => id)].sort(configApi.compareIdentifiers)
  );
  const spawned = snapshot.entities.find(({ id }) => id === completed.entityId);
  assert.deepEqual(
    { x: spawned.x, y: spawned.y },
    {
      x: expectedSlot.x * configuration.positionScale,
      y: expectedSlot.y * configuration.positionScale
    },
    "the first unoccupied authored slot must win"
  );
});

test("a fully blocked head remains once, never duplicates, retries, and can be cancelled for 100 percent", () => {
  const staged = simulationApi.createSimulation().snapshot();
  const producer = firstOwnedProducer(staged, 1);
  const authored = map.phase4.structures.find(({ id }) => id === producer.id);
  const blockerTemplate = staged.entities.find(({ kind, ownerSeat }) => kind === "gravebound-reaver" && ownerSeat === 2);
  let addedPopulation = 0;
  let blockerNumber = 1;
  for (const slot of authored.spawnSlots) {
    const fixed = { x: slot.x * configuration.positionScale, y: slot.y * configuration.positionScale };
    const occupied = staged.entities.some((entity) => {
      const deltaX = entity.x - fixed.x;
      const deltaY = entity.y - fixed.y;
      const minimum = entity.radius + representatives["astral-guardian"].radius;
      return deltaX * deltaX + deltaY * deltaY < minimum * minimum;
    });
    if (occupied) continue;
    staged.entities.push({
      ...clone(blockerTemplate),
      id: `blocker-${String(blockerNumber).padStart(2, "0")}`,
      x: fixed.x,
      y: fixed.y
    });
    blockerNumber += 1;
    addedPopulation += representatives[blockerTemplate.kind].population;
  }
  staged.entities.sort((first, second) => configApi.compareIdentifiers(first.id, second.id));
  seat(staged, 2).populationUsed += addedPopulation;
  seat(staged, 1).resources -= 60;
  seat(staged, 1).populationReserved = 1;
  producer.queue = [{
    id: "queue-00000001",
    ownerSeat: 1,
    entityKind: "astral-guardian",
    progressTicks: 80,
    blockedComplete: true
  }];
  staged.nextQueueNumber = 2;
  const simulation = simulationApi.restoreSimulation(staged);
  const entityCount = simulation.snapshot().entities.length;
  stepMany(simulation, 8);
  let snapshot = simulation.snapshot();
  assert.equal(snapshot.entities.length, entityCount);
  assert.equal(queueOf(structure(snapshot, producer.id)).length, 1);
  assert.equal(queueOf(structure(snapshot, producer.id))[0].progressTicks, 80);
  assert.equal(queueOf(structure(snapshot, producer.id))[0].blockedComplete, true);

  const cancel = simulation.submitCommand(command(simulation, "CANCEL_PRODUCTION", {
    structureId: producer.id,
    queueItemId: "queue-00000001"
  }));
  assert.equal(cancel.ok, true);
  const result = simulation.step();
  assert.ok(result.events.some(({ status, code }) => status === "applied" && code === "refunded"));
  snapshot = simulation.snapshot();
  assert.equal(queueOf(structure(snapshot, producer.id)).length, 0);
  assert.equal(resourceOf(seat(snapshot, 1)), 240);
  assert.equal(populationOf(seat(snapshot, 1), "reserved"), 0);
});

test("ordinary cancellation refunds the selected item fully without clearing rally", () => {
  const simulation = simulationApi.createSimulation();
  const producer = firstOwnedProducer(simulation.snapshot(), 1);
  const rally = { x: 50000, y: 40000 };
  assert.equal(simulation.submitCommand(queueRequest(simulation, producer, "starbow")).ok, true);
  assert.equal(simulation.submitCommand(command(simulation, "SET_RALLY", {
    structureId: producer.id,
    destination: rally
  })).ok, true);
  simulation.step();
  let snapshot = simulation.snapshot();
  const itemId = queueOf(structure(snapshot, producer.id))[0].id;
  assert.equal(resourceOf(seat(snapshot, 1)), 160);
  assert.equal(populationOf(seat(snapshot, 1), "reserved"), 1);
  assert.deepEqual(structure(snapshot, producer.id).rally, rally);
  assert.equal(simulation.submitCommand(command(simulation, "CANCEL_PRODUCTION", {
    structureId: producer.id,
    queueItemId: itemId
  })).ok, true);
  simulation.step();
  snapshot = simulation.snapshot();
  assert.equal(resourceOf(seat(snapshot, 1)), 240);
  assert.equal(populationOf(seat(snapshot, 1), "reserved"), 0);
  assert.deepEqual(structure(snapshot, producer.id).rally, rally);
});

test("ownership change refunds every unsettled item to the prior owner before production advances and clears rally", () => {
  const outpostId = "west-production-outpost-anchor";
  let simulation = captureFor(simulationApi.createSimulation(), outpostId, 1);
  const producer = structure(simulation.snapshot(), outpostId);
  assert.equal(simulation.submitCommand(queueRequest(simulation, producer, "aegis-titan")).ok, true);
  assert.equal(simulation.submitCommand(command(simulation, "SET_RALLY", {
    structureId: outpostId,
    destination: { x: 70000, y: 60000 }
  })).ok, true);
  simulation.step();
  let snapshot = simulation.snapshot();
  assert.equal(resourceOf(seat(snapshot, 1)), 60);
  assert.equal(populationOf(seat(snapshot, 1), "reserved"), 3);
  const defenderId = snapshot.entities.find(({ ownerSeat, kind }) => ownerSeat === 1 && kind === "starbow").id;
  restoreOpeningPosition(snapshot, defenderId);
  placeContributor(snapshot, outpostId, 2, 1);
  simulation = simulationApi.restoreSimulation(snapshot);
  const resultEvents = stepMany(simulation, configuration.captureRequiredTicks);
  const capture = resultEvents.find((event) => event.type === "structure" && event.structureId === outpostId);
  assert.ok(capture);
  assert.equal(capture.refundedItems, 1);
  snapshot = simulation.snapshot();
  assert.equal(structure(snapshot, outpostId).ownerSeat, 2);
  assert.deepEqual(queueOf(structure(snapshot, outpostId)), []);
  assert.equal(structure(snapshot, outpostId).rally, null);
  assert.equal(resourceOf(seat(snapshot, 1)), 240);
  assert.equal(populationOf(seat(snapshot, 1), "reserved"), 0);
});

test("the internal destruction reducer refunds, clears, disables, and is not exposed as a player command", () => {
  const simulation = simulationApi.createSimulation();
  const producer = firstOwnedProducer(simulation.snapshot(), 1);
  assert.equal(simulation.submitCommand(queueRequest(simulation, producer, "aegis-titan")).ok, true);
  assert.equal(simulation.submitCommand(command(simulation, "SET_RALLY", {
    structureId: producer.id,
    destination: { x: 50000, y: 40000 }
  })).ok, true);
  simulation.step();
  const settlement = simulation.applyStructureDestruction(producer.id);
  assert.deepEqual(settlement, {
    ok: true,
    structureId: producer.id,
    priorOwnerSeat: 1,
    refundedItems: 1
  });
  const snapshot = simulation.snapshot();
  const destroyed = structure(snapshot, producer.id);
  assert.equal(destroyed.destroyed, true);
  assert.equal(destroyed.ownerSeat, null);
  assert.deepEqual(destroyed.capture, { challengerSeat: null, progressTicks: 0 });
  assert.deepEqual(destroyed.queue, []);
  assert.equal(destroyed.rally, null);
  assert.equal(resourceOf(seat(snapshot, 1)), 240);
  assert.equal(populationOf(seat(snapshot, 1), "reserved"), 0);
  assert.deepEqual(simulation.applyStructureDestruction(producer.id), { ok: false, code: "destroyed" });
  assert.deepEqual(simulation.submitCommand(command(simulation, "DESTROY_STRUCTURE", {
    structureId: producer.id
  })), { ok: false, code: "kind" });
});

test("valid rally can be set and cleared while invalid placement preserves the current value", () => {
  const simulation = simulationApi.createSimulation();
  const producer = firstOwnedProducer(simulation.snapshot(), 1);
  const valid = { x: 50000, y: 40000 };
  assert.equal(simulation.submitCommand(command(simulation, "SET_RALLY", {
    structureId: producer.id,
    destination: valid
  })).ok, true);
  simulation.step();
  assert.deepEqual(structure(simulation.snapshot(), producer.id).rally, valid);

  const blocked = { x: producer.x, y: producer.y };
  const rejected = simulation.submitCommand(command(simulation, "SET_RALLY", {
    structureId: producer.id,
    destination: blocked
  }));
  assert.deepEqual(rejected, { ok: false, code: "blocked-destination" });
  assert.deepEqual(structure(simulation.snapshot(), producer.id).rally, valid);

  assert.equal(simulation.submitCommand(command(simulation, "CLEAR_RALLY", {
    structureId: producer.id
  })).ok, true);
  simulation.step();
  assert.equal(structure(simulation.snapshot(), producer.id).rally, null);
});

test("a completed spawn receives ordinary validated rally movement without consuming an external sequence", () => {
  const simulation = simulationApi.createSimulation();
  const producer = firstOwnedProducer(simulation.snapshot(), 1);
  const rally = { x: 50000, y: 40000 };
  assert.equal(simulation.submitCommand(command(simulation, "SET_RALLY", {
    structureId: producer.id,
    destination: rally
  })).ok, true);
  assert.equal(simulation.submitCommand(queueRequest(simulation, producer, "astral-guardian")).ok, true);
  const events = stepMany(simulation, representatives["astral-guardian"].productionTicks);
  const completed = events.find(({ type, status }) => type === "production" && status === "completed");
  const rallied = events.find(({ type, entityId }) => type === "rally" && entityId === completed.entityId);
  assert.deepEqual(rallied, {
    type: "rally",
    structureId: producer.id,
    entityId: completed.entityId,
    status: "applied",
    code: "ok"
  });
  const snapshot = simulation.snapshot();
  const spawned = snapshot.entities.find(({ id }) => id === completed.entityId);
  assert.equal(spawned.order, "MOVE");
  assert.deepEqual(spawned.formationDestination, rally);
  assert.equal(snapshot.nextSequence, 3, "internal rally assignment must not allocate a player-command sequence");
});

test("snapshots are strict, population-consistent, restorable, and restore-and-continue converges", () => {
  const original = simulationApi.createSimulation({ seed: 99 });
  const producer = firstOwnedProducer(original.snapshot(), 1);
  original.submitCommand(queueRequest(original, producer, "starbow"));
  original.advance(4);
  original.advance(4);
  const checkpoint = original.snapshot();
  const restored = simulationApi.restoreSimulation(checkpoint);
  checkpoint.players[0].resources = 1;
  checkpoint.structures[0].queue.length = 0;
  assert.notEqual(resourceOf(seat(restored.snapshot(), 1)), 1);
  assert.notEqual(queueOf(restored.snapshot().structures[0]).length, 0);
  for (let index = 0; index < 40; index += 1) {
    original.step();
    restored.step();
    assert.deepEqual(restored.snapshot(), original.snapshot());
  }

  const unknown = clone(restored.snapshot());
  unknown.camera = { x: 0, y: 0 };
  assert.throws(() => simulationApi.validateSnapshot(unknown), /unknown or missing/);
  const badEconomy = clone(restored.snapshot());
  badEconomy.players[0].populationReserved += 1;
  assert.throws(() => simulationApi.restoreSimulation(badEconomy), /population accounting/i);
  const badCapture = clone(simulationApi.createSimulation().snapshot());
  const resource = badCapture.structures.find(({ category }) => category === "resource-point");
  resource.capture = { challengerSeat: 1, progressTicks: 0 };
  assert.throws(() => simulationApi.restoreSimulation(badCapture), /capture state/i);
  const oversized = clone(simulationApi.createSimulation().snapshot());
  oversized.structures[0].queue = Array.from({ length: configuration.productionQueueCap + 1 }, (_, index) => ({
    id: `queue-${String(index + 1).padStart(8, "0")}`,
    ownerSeat: 1,
    entityKind: "astral-guardian",
    progressTicks: 0,
    blockedComplete: false
  }));
  assert.throws(() => simulationApi.restoreSimulation(oversized), /structure state/i);

  const nonProducerQueue = clone(simulationApi.createSimulation().snapshot());
  const resourcePoint = nonProducerQueue.structures.find(({ category }) => category === "resource-point");
  resourcePoint.ownerSeat = 1;
  resourcePoint.queue.push({
    id: "queue-00000001",
    ownerSeat: 1,
    entityKind: "astral-guardian",
    progressTicks: 0,
    blockedComplete: false
  });
  nonProducerQueue.players[0].resources -= representatives["astral-guardian"].cost;
  nonProducerQueue.players[0].populationReserved += representatives["astral-guardian"].population;
  nonProducerQueue.nextQueueNumber = 2;
  assert.throws(() => simulationApi.restoreSimulation(nonProducerQueue), /non-producer structure/i);

  const unsafeRefund = simulationApi.createSimulation();
  const unsafeProducer = firstOwnedProducer(unsafeRefund.snapshot(), 1);
  unsafeRefund.submitCommand(queueRequest(unsafeRefund, unsafeProducer, "astral-guardian"));
  unsafeRefund.step();
  const unsafeSnapshot = unsafeRefund.snapshot();
  unsafeSnapshot.players[0].resources = Number.MAX_SAFE_INTEGER;
  assert.throws(() => simulationApi.restoreSimulation(unsafeSnapshot), /cannot safely settle/i);
});

test("canonical replay reproduces mixed commands, periodic checksums, and the final authoritative state", () => {
  const live = simulationApi.createSimulation({ seed: 77 });
  const replay = replayApi.createReplay(live.snapshot());
  const producer = firstOwnedProducer(live.snapshot(), 1);
  const first = live.submitCommand(queueRequest(live, producer, "astral-guardian"));
  assert.deepEqual(replayApi.canAppendAccepted(replay, first), { ok: true, code: "ok" });
  replayApi.appendAccepted(replay, first);
  const second = live.submitCommand(command(live, "SET_RALLY", {
    structureId: producer.id,
    destination: { x: 50000, y: 40000 }
  }));
  replayApi.appendAccepted(replay, second);
  const entityId = live.snapshot().entities.find(({ ownerSeat }) => ownerSeat === 2).id;
  const third = live.submitCommand(command(live, "MOVE", {
    entityIds: [entityId],
    destination: { x: 120000, y: 65000 }
  }, { issuingPlayer: 2 }));
  replayApi.appendAccepted(replay, third);
  const liveChecksums = [{ tick: 0, checksum: replayApi.checksum(live.snapshot()) }];
  while (live.tick < 200) {
    live.step();
    if (live.tick % configuration.checksumIntervalTicks === 0) {
      liveChecksums.push({ tick: live.tick, checksum: replayApi.checksum(live.snapshot()) });
    }
  }
  assert.deepEqual(replayApi.validateReplay(replay), replay);
  const reproduced = replayApi.runReplay(replay, { untilTick: 200 });
  assert.deepEqual(reproduced.snapshot, live.snapshot());
  assert.deepEqual(reproduced.checksums, liveChecksums);
  assert.equal(replayApi.canonicalStringify({ b: 2, a: 1 }), replayApi.canonicalStringify({ a: 1, b: 2 }));
  const changed = clone(live.snapshot());
  changed.players[0].resources += 1;
  assert.notEqual(replayApi.checksum(changed), replayApi.checksum(live.snapshot()));
});

test("core Phase 4 modules expose browser namespaces without nondeterministic authority", () => {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  for (const relativePath of [
    "phase2/map.js",
    "phase4/config.js",
    "phase4/map.js",
    "phase4/navigation.js",
    "phase4/simulation.js",
    "phase4/replay.js"
  ]) vm.runInContext(read(relativePath), context, { filename: relativePath });
  for (const name of [
    "AeonPhase4Config", "AeonPhase4Map", "AeonPhase4Navigation",
    "AeonPhase4Simulation", "AeonPhase4Replay"
  ]) assert.ok(context[name], `${name} browser API is missing`);
  const browserSimulation = context.AeonPhase4Simulation.createSimulation();
  assert.equal(
    typeof browserSimulation.applyStructureDestruction,
    "undefined",
    "Phase 4 destruction settlement must not be an immediate browser mutation API"
  );

  const sources = [
    "phase4/config.js", "phase4/map.js", "phase4/navigation.js",
    "phase4/simulation.js", "phase4/replay.js"
  ].map(read).join("\n");
  assert.doesNotMatch(sources, /Math\.random|Date\.now|performance\.now/);
  assert.doesNotMatch(sources, /WebSocket|RTCPeerConnection|signaling|TURN server/i);
  assert.doesNotMatch(sources, /ATTACK_ENTITY|ATTACK_MOVE|strategic AI/i);
});
