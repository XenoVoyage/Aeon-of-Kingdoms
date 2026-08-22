"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const configApi = require(path.join(ROOT, "phase5/config.js"));
const map = require(path.join(ROOT, "phase5/map.js"));
const navigationApi = require(path.join(ROOT, "phase5/navigation.js"));
const simulationApi = require(path.join(ROOT, "phase5/simulation.js"));
const replayApi = require(path.join(ROOT, "phase5/replay.js"));
const { configuration, representatives } = configApi;

const clone = (value) => JSON.parse(JSON.stringify(value));
const entity = (snapshot, id) => snapshot.entities.find((value) => value.id === id);
const structure = (snapshot, id) => snapshot.structures.find((value) => value.id === id);
const player = (snapshot, seat) => snapshot.players[seat - 1];
const command = (simulation, kind, payload = {}, overrides = {}) => ({
  protocolVersion: configuration.protocolVersion,
  configurationId: configuration.configurationId,
  kind,
  issuingPlayer: 1,
  targetTick: simulation.tick + 1,
  ...payload,
  ...overrides
});
function stepMany(simulation, count) {
  const events = [];
  for (let index = 0; index < count; index += 1) events.push(...simulation.step().events);
  return events;
}
function placeIdle(value, x, y) {
  value.x = x; value.y = y; value.idleRoot = { x, y };
  value.order = "IDLE"; value.targetId = null; value.commandRoot = null;
  value.engagementRoot = null; value.defendAnchor = null;
  value.route = []; value.routeIndex = 0; value.formationDestination = null;
  value.savedRoute = []; value.savedRouteIndex = 0; value.savedDestination = null;
  value.savedRepathCount = 0; value.savedProgress = { distance: 0, stalledTicks: 0 };
  value.repathCount = 0; value.progress = { distance: 0, stalledTicks: 0 };
  value.reservation = null; value.reservationWait = null; value.attackStartTick = null; value.pendingAttackTick = null;
  value.returning = false; value.returnFailure = null;
}
function placePair(snapshot, attackerId = "seat-1-astral-guardian-1", targetId = "seat-2-gravebound-reaver-1",
  first = { x: 64000, y: 40000 }, second = { x: 68000, y: 40000 }) {
  placeIdle(entity(snapshot, attackerId), first.x, first.y);
  placeIdle(entity(snapshot, targetId), second.x, second.y);
  return { attackerId, targetId };
}
function focus(simulation, attackerId, targetId, issuingPlayer = 1) {
  return simulation.submitAttackEntity(command(simulation, "ATTACK_ENTITY", {
    entityIds: [attackerId], targetId
  }, { issuingPlayer }));
}
function setStopped(value) {
  placeIdle(value, value.x, value.y);
  value.order = "STOP";
}
function populationCost(value) { return representatives[value.kind].population; }
function rootDistanceForTest(first, second) {
  return Math.floor(Math.hypot(second.x - first.x, second.y - first.y));
}
function openMapForTest() {
  const value = clone(map);
  value.layers.navigation.blockers = [];
  return value;
}
function addOwnedGuardians(snapshot, count, prefix = "defend-reinforcement") {
  const template = entity(snapshot, "seat-1-astral-guardian-1");
  const navigator = navigationApi.createNavigator(map, configuration, snapshot.structures);
  const added = [];
  for (let y = 8000; y <= 80000 && added.length < count; y += 5200) {
    for (let x = 8000; x <= 80000 && added.length < count; x += 5200) {
      const candidate = { x, y, radius: template.radius };
      if (!navigator.isPointClear(candidate, candidate.radius)) continue;
      if (snapshot.entities.some((value) => {
        const minimum = value.radius + candidate.radius;
        const deltaX = value.x - candidate.x;
        const deltaY = value.y - candidate.y;
        return deltaX * deltaX + deltaY * deltaY < minimum * minimum;
      })) continue;
      const reinforcement = clone(template);
      reinforcement.id = `${prefix}-${String(added.length + 1).padStart(2, "0")}`;
      placeIdle(reinforcement, x, y);
      snapshot.entities.push(reinforcement);
      player(snapshot, 1).populationUsed += populationCost(reinforcement);
      added.push(reinforcement.id);
    }
  }
  assert.equal(added.length, count, "test fixture requires enough clear reinforcement roots");
  snapshot.entities.sort((first, second) => configApi.compareIdentifiers(first.id, second.id));
  return added;
}

test("Phase 5 freezes protocol 3, deterministic bounds, combat tables, and structure health", () => {
  assert.equal(Object.isFrozen(configuration), true);
  assert.deepEqual([
    configuration.schemaVersion, configuration.protocolVersion, configuration.configurationId,
    configuration.tickRate, configuration.tickDurationMs, configuration.positionScale,
    configuration.simulationTickCap
  ], [3, 3, "phase5-combat-tactics-v1", 20, 50, 100, Number.MAX_SAFE_INTEGER - 32]);
  assert.deepEqual([
    configuration.combatEntityCap, configuration.selectionCap, configuration.pendingCommandCap,
    configuration.projectileCap, configuration.reservationCapPerTarget,
    configuration.presentationalEffectCap, configuration.replayCommandCap,
    configuration.snapshotByteCap, configuration.replayByteCap, configuration.defeatPresentationTicks
  ], [36, 12, 64, 96, 24, 96, 8192, 1024 * 1024, 4 * 1024 * 1024, 12]);
  assert.deepEqual([
    configuration.projectileSpeedFixed,
    configuration.projectileTravelTickMin,
    configuration.projectileTravelTickMax
  ], [1600, 1, 14]);
  assert.deepEqual(configApi.combatByRole, {
    melee: { health: 240, damage: 28, attackCycleTicks: 20, contactOffsetTicks: 5,
      preferredGapWorld: 12, attackRangeWorld: 12, awarenessWorld: 180, idleLeashWorld: 240,
      reservationGapsWorld: [8, 64, 120] },
    ranged: { health: 160, damage: 22, attackCycleTicks: 24, contactOffsetTicks: 5,
      preferredGapWorld: 160, attackRangeWorld: 220, awarenessWorld: 260, idleLeashWorld: 300,
      reservationGapsWorld: [160, 104, 216] },
    signature: { health: 520, damage: 64, attackCycleTicks: 32, contactOffsetTicks: 5,
      preferredGapWorld: 16, attackRangeWorld: 16, awarenessWorld: 200, idleLeashWorld: 260,
      reservationGapsWorld: [12, 68, 124] }
  });
  assert.deepEqual(configApi.structureHealth, {
    "astral-headquarters-anchor": 1800, "gravebound-headquarters-anchor": 1800,
    "central-resource-point-anchor": 800, "west-production-outpost-anchor": 1200,
    "east-production-outpost-anchor": 1200
  });
  assert.equal(map.phase5.structures.length, 5);
  for (const value of map.phase5.structures) assert.equal(value.maximumHealth, configApi.structureHealth[value.id]);
});

test("all nine commands use one strict detached contiguous acceptance boundary", () => {
  const simulation = simulationApi.createSimulation();
  const snapshot = simulation.snapshot();
  const own = snapshot.entities.filter((value) => value.ownerSeat === 1).map((value) => value.id).sort();
  const hostile = snapshot.entities.find((value) => value.ownerSeat === 2).id;
  const producer = snapshot.structures.find((value) => value.ownerSeat === 1);
  const requests = [
    command(simulation, "MOVE", { entityIds: [own[0]], destination: { x: 50000, y: 40000 } }),
    command(simulation, "ATTACK_ENTITY", { entityIds: [own[1]], targetId: hostile }),
    command(simulation, "ATTACK_MOVE", { entityIds: [own[2]], destination: { x: 60000, y: 40000 } }),
    command(simulation, "STOP", { entityIds: [own[3]] }),
    command(simulation, "DEFEND", { entityIds: [own[4]], anchor: { kind: "point", destination: { x: 50000, y: 40000 } } }),
    command(simulation, "DEFEND", { entityIds: [own[5]], anchor: { kind: "entity", entityId: own[0] } }),
    command(simulation, "QUEUE_PRODUCTION", { structureId: producer.id, entityKind: "astral-guardian" }),
    command(simulation, "SET_RALLY", { structureId: producer.id, destination: { x: 50000, y: 40000 } }),
    command(simulation, "CLEAR_RALLY", { structureId: producer.id })
  ];
  requests.forEach((request, index) => {
    const receipt = simulation.submitCommand(request);
    assert.equal(receipt.ok, true, `${request.kind} should pass strict submission`);
    assert.equal(receipt.command.sequence, index + 1);
  });
  requests[0].entityIds[0] = "mutated";
  requests[4].anchor.destination.x = 1;
  assert.notEqual(simulation.snapshot().pendingCommands[0].entityIds[0], "mutated");
  assert.notEqual(simulation.snapshot().pendingCommands[4].anchor.destination.x, 1);
  for (const request of requests) assert.deepEqual(
    simulation.submitCommand({ ...request, extra: true }), { ok: false, code: "shape" }
  );
  assert.deepEqual(simulation.submitCommand(command(simulation, "ATTACK", {})), { ok: false, code: "kind" });
  assert.deepEqual(simulation.submitCommand(command(simulation, "STOP", { entityIds: [own[0], own[0]] })), {
    ok: false, code: "duplicate-entity"
  });
  assert.deepEqual(simulation.submitCommand(command(simulation, "STOP", { entityIds: [own[1], own[0]] })), {
    ok: false, code: "entity-order"
  });
  assert.deepEqual(simulation.submitCommand(command(simulation, "STOP", { entityIds: [hostile] })), {
    ok: false, code: "foreign-entity"
  });
  simulation.step();
  const queued = structure(simulation.snapshot(), producer.id).queue[0];
  assert.ok(queued);
  const cancellation = command(simulation, "CANCEL_PRODUCTION", {
    structureId: producer.id, queueItemId: queued.id
  });
  const cancellationReceipt = simulation.submitCancelProduction(cancellation);
  assert.equal(cancellationReceipt.ok, true);
  assert.equal(cancellationReceipt.command.sequence, 10);
  cancellation.queueItemId = "mutated";
  assert.equal(simulation.snapshot().pendingCommands[0].queueItemId, queued.id);
  assert.deepEqual(simulation.submitCommand({ ...cancellation, extra: true }), { ok: false, code: "shape" });
});

test("canonical reservation vectors use all 24 exact ring-direction positions for every role", () => {
  const target = { x: 50000, y: 40000, radius: 3800 };
  const attacker = { radius: 1600 };
  const directions = (radius) => {
    const diagonal = Math.floor(radius * 7071 / 10000);
    return [[radius, 0], [diagonal, diagonal], [0, radius], [-diagonal, diagonal],
      [-radius, 0], [-diagonal, -diagonal], [0, -radius], [diagonal, -diagonal]];
  };
  for (const [role, gaps] of Object.entries({ melee: [8, 64, 120], ranged: [160, 104, 216], signature: [12, 68, 124] })) {
    const candidates = navigationApi.reservationCandidates(target, attacker, role);
    assert.equal(candidates.length, 24);
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = target.radius + attacker.radius + gaps[ring] * configuration.positionScale;
      const expected = directions(radius);
      for (let direction = 0; direction < 8; direction += 1) {
        const slot = candidates[ring * 8 + direction];
        assert.equal(slot.slotIndex, ring * 8 + direction);
        assert.deepEqual(slot.point, { x: target.x + expected[direction][0], y: target.y + expected[direction][1] });
      }
    }
  }
  assert.throws(() => navigationApi.reservationOffset(100, 24), /24-slot bound/);
});

test("focus is atomic, sticky, bounded by its command root, and STOP cancels pending contact", () => {
  let staged = simulationApi.createSimulation().snapshot();
  const { attackerId, targetId } = placePair(staged);
  let simulation = simulationApi.restoreSimulation(staged);
  assert.equal(focus(simulation, attackerId, targetId).ok, true);
  const started = simulation.step();
  assert.ok(started.events.some((value) => value.status === "attack-started" && value.contactTick === 6));
  let after = simulation.snapshot();
  assert.equal(entity(after, attackerId).order, "ATTACK_ENTITY");
  assert.equal(entity(after, attackerId).targetId, targetId);
  assert.equal(entity(after, attackerId).nextAttackStartTick, 21);
  assert.equal(simulation.submitStop(command(simulation, "STOP", { entityIds: [attackerId] })).ok, true);
  simulation.step();
  assert.equal(entity(simulation.snapshot(), attackerId).pendingAttackTick, null);
  stepMany(simulation, 4);
  assert.equal(entity(simulation.snapshot(), targetId).health, 240, "replacing STOP must cancel the due contact");

  staged = simulationApi.createSimulation().snapshot();
  const own = staged.entities.filter((value) => value.ownerSeat === 1).slice(0, 2);
  const target = staged.entities.find((value) => value.ownerSeat === 2);
  simulation = simulationApi.restoreSimulation(staged);
  const navigator = navigationApi.createNavigator(map, configuration, staged.structures);
  const originalFindRoute = navigator.findRoute;
  assert.equal(typeof originalFindRoute, "function");
  assert.equal(simulation.submitAttackEntity(command(simulation, "ATTACK_ENTITY", {
    entityIds: own.map((value) => value.id).sort(), targetId: target.id
  })).ok, true);
  const result = simulation.step();
  assert.equal(result.events[0].status, "applied");
  const applied = simulation.snapshot();
  assert.ok(own.every((value) => entity(applied, value.id).targetId === target.id));
});

test("focus rolls back atomically, uses an inclusive 1200 leash, and passive replacements keep no hidden stack", () => {
  const dividedMap = openMapForTest();
  dividedMap.layers.navigation.blockers.push({
    id: "focus-atomic-wall", polygon: [[800, 0], [820, 0], [820, 941], [800, 941]]
  });
  let staged = simulationApi.createSimulation({ map: dividedMap }).snapshot();
  const blocked = entity(staged, "seat-1-astral-guardian-1");
  const reachable = entity(staged, "seat-1-astral-guardian-2");
  const target = entity(staged, "seat-2-gravebound-reaver-1");
  placeIdle(blocked, 70000, 40000); setStopped(blocked);
  placeIdle(reachable, 92000, 40000); setStopped(reachable);
  placeIdle(target, 100000, 40000); setStopped(target);
  const selectedIds = [blocked.id, reachable.id].sort(configApi.compareIdentifiers);
  const before = new Map(selectedIds.map((id) => [id, clone(entity(staged, id))]));
  let simulation = simulationApi.restoreSimulation(staged, { map: dividedMap });
  assert.equal(simulation.submitAttackEntity(command(simulation, "ATTACK_ENTITY", {
    entityIds: selectedIds, targetId: target.id
  })).ok, true);
  let result = simulation.step();
  assert.ok(result.events.some((value) => value.type === "command"
    && value.status === "rejected" && value.code === "unreachable"));
  for (const id of selectedIds) assert.deepEqual(entity(simulation.snapshot(), id), before.get(id));

  const openMap = openMapForTest();
  function focusLeashFixture(distance) {
    const snapshot = simulationApi.createSimulation({ map: openMap }).snapshot();
    const attacker = entity(snapshot, "seat-1-astral-guardian-1");
    const hostile = entity(snapshot, "seat-2-gravebound-reaver-1");
    placeIdle(attacker, 30000, 85000);
    placeIdle(hostile, attacker.x + distance, attacker.y); setStopped(hostile);
    const engine = simulationApi.restoreSimulation(snapshot, { map: openMap });
    assert.equal(focus(engine, attacker.id, hostile.id).ok, true);
    return { engine, attackerId: attacker.id };
  }
  let fixture = focusLeashFixture(configuration.focusLeashWorld * configuration.positionScale);
  result = fixture.engine.step();
  assert.ok(result.events.some((value) => value.type === "command" && value.status === "applied"));
  assert.equal(entity(fixture.engine.snapshot(), fixture.attackerId).order, "ATTACK_ENTITY");
  fixture = focusLeashFixture(configuration.focusLeashWorld * configuration.positionScale + 1);
  result = fixture.engine.step();
  assert.ok(result.events.some((value) => value.type === "command"
    && value.status === "rejected" && value.code === "focus-leash"));
  assert.equal(entity(fixture.engine.snapshot(), fixture.attackerId).order, "IDLE");

  staged = simulationApi.createSimulation({ map: openMap }).snapshot();
  const passive = entity(staged, "seat-1-astral-guardian-1");
  const nearby = entity(staged, "seat-2-gravebound-reaver-1");
  placeIdle(passive, 60000, 40000); placeIdle(nearby, 68000, 40000); setStopped(nearby);
  simulation = simulationApi.restoreSimulation(staged, { map: openMap });
  assert.equal(simulation.submitMove(command(simulation, "MOVE", {
    entityIds: [passive.id], destination: { x: 62000, y: 40000 }
  })).ok, true);
  simulation.step();
  assert.equal(entity(simulation.snapshot(), passive.id).targetId, null, "MOVE remains passive inside awareness");
  assert.equal(simulation.submitAttackMove(command(simulation, "ATTACK_MOVE", {
    entityIds: [passive.id], destination: { x: 90000, y: 60000 }
  })).ok, true);
  assert.equal(simulation.submitStop(command(simulation, "STOP", { entityIds: [passive.id] })).ok, true);
  simulation.step();
  const stopped = entity(simulation.snapshot(), passive.id);
  assert.equal(stopped.order, "STOP");
  assert.equal(stopped.targetId, null);
  assert.deepEqual(stopped.route, []);
  assert.deepEqual(stopped.savedRoute, []);
  stepMany(simulation, 30);
  assert.equal(entity(simulation.snapshot(), passive.id).order, "STOP", "STOP cannot resume a replaced order");

  const neutralSimulation = simulationApi.createSimulation();
  assert.deepEqual(neutralSimulation.submitAttackEntity(command(neutralSimulation, "ATTACK_ENTITY", {
    entityIds: ["seat-1-astral-guardian-1"], targetId: "central-resource-point-anchor"
  })), { ok: false, code: "not-hostile" });
});

test("IDLE role awareness and ATTACK_MOVE/DEFEND leashes use exact inclusive boundaries", () => {
  const openMap = openMapForTest();
  const targetId = "seat-2-gravebound-reaver-1";
  function retainOnlyTarget(snapshot) {
    const retained = entity(snapshot, targetId);
    snapshot.entities = snapshot.entities.filter((value) => value.ownerSeat !== 2 || value.id === targetId);
    player(snapshot, 2).populationUsed = populationCost(retained);
  }
  for (const attackerId of ["seat-1-astral-guardian-1", "seat-1-starbow-1", "seat-1-aegis-titan-1"]) {
    for (const outside of [0, 1]) {
      const staged = simulationApi.createSimulation({ map: openMap }).snapshot();
      retainOnlyTarget(staged);
      const attacker = entity(staged, attackerId);
      const target = entity(staged, targetId);
      placeIdle(attacker, 60000, 60000);
      const definition = representatives[attacker.kind];
      placeIdle(target, attacker.x + attacker.radius + target.radius
        + definition.awarenessWorld * configuration.positionScale + outside, attacker.y);
      setStopped(target);
      const simulation = simulationApi.restoreSimulation(staged, { map: openMap });
      simulation.step();
      assert.equal(entity(simulation.snapshot(), attacker.id).targetId, outside ? null : target.id,
        `${attacker.kind} IDLE awareness must be inclusive at the exact target-edge boundary only`);
    }
  }

  function orderedBoundary(order, outside) {
    const staged = simulationApi.createSimulation({ map: openMap }).snapshot();
    retainOnlyTarget(staged);
    const attacker = entity(staged, "seat-1-starbow-1");
    const target = entity(staged, targetId);
    placeIdle(attacker, 60000, 70000);
    const leash = order === "ATTACK_MOVE" ? configuration.attackMoveLeashWorld : configuration.defendLeashWorld;
    placeIdle(target, attacker.x + leash * configuration.positionScale + outside, attacker.y); setStopped(target);
    const simulation = simulationApi.restoreSimulation(staged, { map: openMap });
    const request = order === "ATTACK_MOVE"
      ? command(simulation, order, { entityIds: [attacker.id], destination: { x: 50000, y: 70000 } })
      : command(simulation, order, {
        entityIds: [attacker.id], anchor: { kind: "point", destination: { x: attacker.x, y: attacker.y } }
      });
    assert.equal(simulation.submitCommand(request).ok, true);
    simulation.step();
    return entity(simulation.snapshot(), attacker.id).targetId;
  }
  assert.equal(orderedBoundary("ATTACK_MOVE", 0), targetId);
  assert.equal(orderedBoundary("ATTACK_MOVE", 1), null);
  assert.equal(orderedBoundary("DEFEND", 0), targetId);
  assert.equal(orderedBoundary("DEFEND", 1), null);
});

test("congested focus and IDLE target chases exhaust bounded repaths and release by order semantics", () => {
  let staged = simulationApi.createSimulation().snapshot();
  const target = entity(staged, "seat-2-gravebound-reaver-1");
  for (const hostile of staged.entities.filter((value) => value.ownerSeat === 2)) setStopped(hostile);
  const focusedIds = staged.entities.filter((value) => value.ownerSeat === 1)
    .map((value) => value.id).sort(configApi.compareIdentifiers);
  let simulation = simulationApi.restoreSimulation(staged);
  assert.equal(simulation.submitAttackEntity(command(simulation, "ATTACK_ENTITY", {
    entityIds: focusedIds, targetId: target.id
  })).ok, true);
  let events = stepMany(simulation, 2000);
  const focusReleases = events.filter((value) => value.type === "combat" && value.status === "target-released"
    && value.code === "congestion" && focusedIds.includes(value.entityId));
  assert.ok(focusReleases.length > 0, "a hard-footprint-stalled focus cannot retain its target without bound");

  staged = simulationApi.createSimulation().snapshot();
  const idle = entity(staged, "seat-1-astral-guardian-1");
  const blocker = entity(staged, "seat-1-astral-guardian-2");
  const idleTarget = entity(staged, "seat-2-gravebound-reaver-1");
  placeIdle(idleTarget, 70000, 40000); setStopped(idleTarget);
  placeIdle(blocker, 63000, 40000); setStopped(blocker);
  placeIdle(idle, 55000, 40000);
  simulation = simulationApi.restoreSimulation(staged);
  events = stepMany(simulation, 200);
  assert.ok(events.some((value) => value.type === "combat" && value.status === "target-released"
    && value.entityId === idle.id && value.targetId === idleTarget.id && value.code === "congestion"),
  "an automatic IDLE chase blocked outside contact range follows the same bounded release path");
});

test("opening melee contacts occur at +5, repeat only at cycle eligibility, and misses still consume", () => {
  let staged = simulationApi.createSimulation().snapshot();
  const { attackerId, targetId } = placePair(staged);
  setStopped(entity(staged, targetId));
  let simulation = simulationApi.restoreSimulation(staged);
  focus(simulation, attackerId, targetId);
  let events = stepMany(simulation, 6);
  assert.ok(events.some((value) => value.status === "contact" && value.attackerId === attackerId));
  assert.equal(entity(simulation.snapshot(), targetId).health, 212);
  stepMany(simulation, 14);
  assert.equal(entity(simulation.snapshot(), targetId).health, 212);
  events = simulation.step().events;
  assert.ok(events.some((value) => value.status === "attack-started" && value.attackStartTick === 21));
  stepMany(simulation, 5);
  assert.equal(entity(simulation.snapshot(), targetId).health, 184);

  staged = simulationApi.createSimulation().snapshot();
  placePair(staged);
  setStopped(entity(staged, targetId));
  simulation = simulationApi.restoreSimulation(staged);
  focus(simulation, attackerId, targetId); simulation.step();
  const checkpoint = simulation.snapshot();
  placeIdle(entity(checkpoint, targetId), 96000, 40000);
  setStopped(entity(checkpoint, targetId));
  simulation = simulationApi.restoreSimulation(checkpoint);
  events = stepMany(simulation, 5);
  assert.ok(events.some((value) => value.status === "miss" && value.attackerId === attackerId));
  assert.equal(entity(simulation.snapshot(), attackerId).nextAttackStartTick, 21);
});

test("every role honors exact range, start/contact/cycle/damage rows, movement entry, and spawned T+1 eligibility", () => {
  const openMap = openMapForTest();
  const targetId = "seat-2-gravebound-reaver-1";
  const roleFixtures = [
    { attackerId: "seat-1-astral-guardian-1", blockerIds: ["seat-1-starbow-1", "seat-1-starbow-2"], cosine: 0.72 },
    { attackerId: "seat-1-starbow-1", blockerIds: ["seat-1-astral-guardian-1"], cosine: 1 },
    { attackerId: "seat-1-aegis-titan-1", blockerIds: ["seat-1-starbow-1", "seat-1-starbow-2"], cosine: 0.8 }
  ];
  function retainTarget(snapshot) {
    const target = entity(snapshot, targetId);
    snapshot.entities = snapshot.entities.filter((value) => value.ownerSeat !== 2 || value.id === targetId);
    player(snapshot, 2).populationUsed = populationCost(target);
    return target;
  }
  function rangeFixture(fixture, outside, holdAtBoundary = false) {
    const staged = simulationApi.createSimulation({ map: openMap }).snapshot();
    const target = retainTarget(staged);
    const attacker = entity(staged, fixture.attackerId);
    const definition = representatives[attacker.kind];
    placeIdle(target, 60000, 40000); setStopped(target);
    placeIdle(attacker, target.x + target.radius + attacker.radius
      + definition.attackRangeWorld * configuration.positionScale + outside - (holdAtBoundary ? 1 : 0), target.y);
    (outside || holdAtBoundary ? fixture.blockerIds : []).forEach((blockerId, index) => {
      const blocker = entity(staged, blockerId);
      const minimum = attacker.radius + blocker.radius;
      const deltaX = Math.floor(minimum * fixture.cosine);
      const deltaY = Math.ceil(Math.sqrt(minimum * minimum - deltaX * deltaX));
      const sign = fixture.blockerIds.length === 1 || index === 0 ? 1 : -1;
      placeIdle(blocker, attacker.x - deltaX, attacker.y + sign * deltaY); setStopped(blocker);
    });
    const simulation = simulationApi.restoreSimulation(staged, { map: openMap });
    assert.equal(focus(simulation, attacker.id, target.id).ok, true);
    return { simulation, attackerId: attacker.id, targetId: target.id, definition };
  }

  for (const fixture of roleFixtures) {
    let active = rangeFixture(fixture, 0);
    let events = active.simulation.step().events;
    assert.ok(events.some((value) => value.status === "attack-started" && value.attackStartTick === 1
      && value.contactTick === 1 + active.definition.contactOffsetTicks));
    let attacker = entity(active.simulation.snapshot(), active.attackerId);
    assert.equal(attacker.health, active.definition.health);
    assert.equal(attacker.nextAttackStartTick, 1 + active.definition.attackCycleTicks);
    events = stepMany(active.simulation, active.definition.contactOffsetTicks);
    if (active.definition.role === "ranged") {
      const launched = events.find((value) => value.type === "projectile" && value.status === "launched");
      assert.ok(launched);
      const projectile = active.simulation.snapshot().projectiles[0];
      assert.ok(projectile.launchEdgeDistance <= active.definition.attackRangeWorld * configuration.positionScale);
      events = stepMany(active.simulation, projectile.arrivalTick - active.simulation.tick);
      assert.ok(events.some((value) => value.status === "arrived" && value.damage === active.definition.damage));
    } else {
      assert.ok(events.some((value) => value.status === "contact" && value.damage === active.definition.damage));
    }
    assert.equal(entity(active.simulation.snapshot(), active.targetId).health, 240 - active.definition.damage);
    const nextStart = 1 + active.definition.attackCycleTicks;
    if (active.simulation.tick < nextStart - 1) stepMany(active.simulation, nextStart - active.simulation.tick - 1);
    events = active.simulation.step().events;
    assert.ok(events.some((value) => value.status === "attack-started" && value.attackStartTick === nextStart),
      `${active.definition.role} must not restart before its exact cycle boundary`);

    active = rangeFixture(fixture, 1);
    events = active.simulation.step().events;
    assert.ok(!events.some((value) => value.status === "attack-started"),
      `${active.definition.role} must not start one fixed unit outside its inclusive range`);
    assert.equal(entity(active.simulation.snapshot(), active.attackerId).pendingAttackTick, null);
  }

  const maximumFlight = rangeFixture(roleFixtures[1], 0, true);
  maximumFlight.simulation.step();
  let maximumEvents = stepMany(maximumFlight.simulation, maximumFlight.definition.contactOffsetTicks);
  const maximumProjectile = maximumFlight.simulation.snapshot().projectiles[0];
  assert.ok(maximumEvents.some((value) => value.type === "projectile" && value.status === "launched"));
  assert.equal(maximumProjectile.launchEdgeDistance,
    maximumFlight.definition.attackRangeWorld * configuration.positionScale);
  assert.equal(maximumProjectile.arrivalTick - maximumProjectile.launchTick, configuration.projectileTravelTickMax);

  let staged = simulationApi.createSimulation({ map: openMap }).snapshot();
  let target = retainTarget(staged);
  let attacker = entity(staged, "seat-1-astral-guardian-1");
  const melee = representatives[attacker.kind];
  placeIdle(target, 60000, 60000); setStopped(target);
  placeIdle(attacker, target.x + target.radius + attacker.radius
    + melee.attackRangeWorld * configuration.positionScale + attacker.speedPerTick, target.y);
  let simulation = simulationApi.restoreSimulation(staged, { map: openMap });
  focus(simulation, attacker.id, target.id);
  let events = simulation.step().events;
  assert.ok(events.some((value) => value.status === "attack-started" && value.attackStartTick === 1),
    "movement into inclusive range during stage 3 starts on the same tick");

  staged = simulationApi.createSimulation({ map: openMap }).snapshot();
  target = entity(staged, targetId);
  staged.entities = staged.entities.filter((value) => value.ownerSeat !== 1);
  player(staged, 1).populationUsed = 0;
  staged.entities = staged.entities.filter((value) => value.ownerSeat !== 2 || value.id === targetId);
  player(staged, 2).populationUsed = populationCost(target);
  placeIdle(target, 41400, 27500); setStopped(target);
  const producer = structure(staged, "astral-headquarters-anchor");
  producer.queue = [{
    id: "queue-00000001", ownerSeat: 1, entityKind: "astral-guardian",
    progressTicks: representatives["astral-guardian"].productionTicks - 1, blockedComplete: false
  }];
  staged.nextQueueNumber = 2;
  player(staged, 1).populationReserved = 1;
  simulation = simulationApi.restoreSimulation(staged, { map: openMap });
  events = simulation.step().events;
  const spawned = events.find((value) => value.type === "production" && value.status === "completed");
  assert.ok(spawned);
  const spawnedEntity = entity(simulation.snapshot(), spawned.entityId);
  assert.equal(spawnedEntity.nextAttackStartTick, 1);
  assert.equal(spawnedEntity.attackStartTick, null, "stage-9 spawn cannot enter stage-4 combat retroactively");
  events = simulation.step().events;
  assert.ok(events.some((value) => value.status === "attack-started"
    && value.attackerId === spawned.entityId && value.attackStartTick === 2));
});

test("IDLE acquisition is target-edge then ASCII, sticky, and returns to the frozen root within 96", () => {
  const staged = simulationApi.createSimulation().snapshot();
  const idle = entity(staged, "seat-1-starbow-1");
  const first = entity(staged, "seat-2-gravebound-reaver-1");
  const second = entity(staged, "seat-2-gravebound-reaver-2");
  placeIdle(idle, 64000, 60000); idle.idleRoot = { x: 60000, y: 60000 };
  placeIdle(first, 76000, 57000); placeIdle(second, 76000, 63000);
  setStopped(first); setStopped(second);
  let simulation = simulationApi.restoreSimulation(staged);
  stepMany(simulation, 70);
  const expected = [first.id, second.id].sort()[0];
  assert.equal(entity(simulation.snapshot(), idle.id).targetId, expected);
  const moved = simulation.snapshot();
  placeIdle(entity(moved, expected), 96000, 45000); setStopped(entity(moved, expected));
  const idleState = entity(moved, idle.id);
  idleState.targetId = expected;
  simulation = simulationApi.restoreSimulation(moved);
  simulation.step();
  assert.equal(entity(simulation.snapshot(), idle.id).returning, true);
  for (let index = 0; index < 40 && entity(simulation.snapshot(), idle.id).returning; index += 1) simulation.step();
  const returned = entity(simulation.snapshot(), idle.id);
  assert.ok(Math.floor(Math.hypot(returned.x - returned.idleRoot.x, returned.y - returned.idleRoot.y))
    <= 96 * configuration.positionScale);
});

test("ATTACK_MOVE records its engagement root, returns, and resumes its unchanged saved route", () => {
  const staged = simulationApi.createSimulation().snapshot();
  const attacker = entity(staged, "seat-1-starbow-1");
  const target = entity(staged, "seat-2-gravebound-reaver-1");
  placeIdle(attacker, 60000, 40000); placeIdle(target, 70000, 40000); setStopped(target);
  let simulation = simulationApi.restoreSimulation(staged);
  const destination = { x: 90000, y: 60000 };
  assert.equal(simulation.submitAttackMove(command(simulation, "ATTACK_MOVE", {
    entityIds: [attacker.id], destination
  })).ok, true);
  stepMany(simulation, 70);
  let value = entity(simulation.snapshot(), attacker.id);
  assert.equal(value.order, "ATTACK_MOVE");
  assert.equal(value.targetId, target.id);
  assert.ok(value.engagementRoot);
  const savedRoute = clone(value.savedRoute);
  const checkpoint = simulation.snapshot();
  placeIdle(entity(checkpoint, target.id), 96000, 45000); setStopped(entity(checkpoint, target.id));
  simulation = simulationApi.restoreSimulation(checkpoint);
  simulation.step();
  value = entity(simulation.snapshot(), attacker.id);
  assert.equal(value.returning, true);
  for (let index = 0; index < 100 && entity(simulation.snapshot(), attacker.id).returning; index += 1) simulation.step();
  value = entity(simulation.snapshot(), attacker.id);
  assert.equal(value.returning, false);
  assert.deepEqual(value.savedRoute, savedRoute);
  assert.equal(value.order, "ATTACK_MOVE");
  assert.deepEqual(value.savedDestination, destination);
});

test("DEFEND persists, ignores structures, follows a friendly anchor, and freezes its last root after loss", () => {
  const staged = simulationApi.createSimulation().snapshot();
  const defender = entity(staged, "seat-1-starbow-1");
  const anchor = entity(staged, "seat-1-astral-guardian-1");
  placeIdle(defender, 60000, 40000); placeIdle(anchor, 64000, 40000);
  let simulation = simulationApi.restoreSimulation(staged);
  assert.equal(simulation.submitDefend(command(simulation, "DEFEND", {
    entityIds: [defender.id], anchor: { kind: "entity", entityId: anchor.id }
  })).ok, true);
  simulation.step();
  let value = entity(simulation.snapshot(), defender.id);
  assert.equal(value.order, "DEFEND");
  assert.equal(value.defendAnchor.kind, "entity");
  const checkpoint = simulation.snapshot();
  const frozenRoot = clone(entity(checkpoint, defender.id).defendAnchor.lastRoot);
  entity(checkpoint, defender.id).defendAnchor = { kind: "point", destination: frozenRoot };
  checkpoint.entities = checkpoint.entities.filter((candidate) => candidate.id !== anchor.id);
  player(checkpoint, 1).populationUsed -= populationCost(anchor);
  simulation = simulationApi.restoreSimulation(checkpoint);
  simulation.step();
  value = entity(simulation.snapshot(), defender.id);
  assert.deepEqual(value.defendAnchor, { kind: "point", destination: frozenRoot });
  assert.equal(value.order, "DEFEND");
});

test("entity-anchored DEFEND plans every member across bounded rings or rejects the whole selection", () => {
  for (const selectionSize of [9, 10, 11, 12]) {
    const staged = simulationApi.createSimulation().snapshot();
    addOwnedGuardians(staged, selectionSize - 6, `legal-defend-${selectionSize}`);
    const selectedIds = staged.entities.filter((value) => value.ownerSeat === 1)
      .map((value) => value.id).sort(configApi.compareIdentifiers).slice(0, selectionSize);
    const anchor = structure(staged, "astral-headquarters-anchor");
    const simulation = simulationApi.restoreSimulation(staged);
    assert.equal(simulation.submitDefend(command(simulation, "DEFEND", {
      entityIds: selectedIds, anchor: { kind: "entity", entityId: anchor.id }
    })).ok, true);
    const applied = simulation.step();
    assert.ok(applied.events.some((value) => value.type === "command"
      && value.status === "applied" && value.code === "ok"));
    const after = simulation.snapshot();
    const defenders = selectedIds.map((id) => entity(after, id));
    assert.equal(defenders.every((value) => value.order === "DEFEND"), true);
    assert.equal(new Set(defenders.map((value) => `${value.formationDestination.x}:${value.formationDestination.y}`)).size,
      selectionSize, `${selectionSize} defenders receive distinct destinations`);
    for (const defender of defenders) {
      assert.ok(rootDistanceForTest(defender.formationDestination, anchor)
        <= configuration.defendLeashWorld * configuration.positionScale);
    }
  }

  const staged = simulationApi.createSimulation().snapshot();
  const anchor = entity(staged, "seat-1-aegis-titan-1");
  placeIdle(anchor, 56400, anchor.radius);
  addOwnedGuardians(staged, 7, "atomic-defend");
  const selectedIds = staged.entities.filter((value) => value.ownerSeat === 1 && value.id !== anchor.id)
    .map((value) => value.id).sort(configApi.compareIdentifiers).slice(0, 12);
  assert.equal(selectedIds.length, 12);
  const before = new Map(selectedIds.map((id) => [id, clone(entity(staged, id))]));
  const simulation = simulationApi.restoreSimulation(staged);
  assert.equal(simulation.submitDefend(command(simulation, "DEFEND", {
    entityIds: selectedIds, anchor: { kind: "entity", entityId: anchor.id }
  })).ok, true);
  const rejected = simulation.step();
  assert.ok(rejected.events.some((value) => value.type === "command"
    && value.status === "rejected" && value.code === "unreachable"));
  const after = simulation.snapshot();
  for (const id of selectedIds) {
    const value = entity(after, id);
    const original = before.get(id);
    assert.equal(value.order, original.order);
    assert.equal(value.commandRoot, original.commandRoot);
    assert.equal(value.defendAnchor, original.defendAnchor);
    assert.equal(value.formationDestination, original.formationDestination);
  }
});

test("DEFEND return completes at the live anchor's inclusive 96-world boundary and never beyond it", () => {
  const anchor = { x: 50000, y: 20000 };
  function returningDefender(x) {
    const staged = simulationApi.createSimulation().snapshot();
    const defender = entity(staged, "seat-1-starbow-1");
    placeIdle(defender, x, anchor.y);
    defender.order = "DEFEND";
    defender.commandRoot = { x: defender.x, y: defender.y };
    defender.defendAnchor = { kind: "point", destination: clone(anchor) };
    defender.returning = true;
    return { staged, defenderId: defender.id };
  }

  let fixture = returningDefender(anchor.x + 96 * configuration.positionScale);
  let simulation = simulationApi.restoreSimulation(fixture.staged);
  simulation.step();
  let defender = entity(simulation.snapshot(), fixture.defenderId);
  assert.equal(defender.returning, false, "exactly 96 world units is inside the inclusive return boundary");
  assert.equal(defender.x, anchor.x + 96 * configuration.positionScale, "an inclusive-boundary defender must not drift");

  fixture = returningDefender(anchor.x + 96 * configuration.positionScale + 1);
  simulation = simulationApi.restoreSimulation(fixture.staged);
  simulation.step();
  defender = entity(simulation.snapshot(), fixture.defenderId);
  assert.ok(defender.x < anchor.x + 96 * configuration.positionScale + 1,
    "96 world units plus one fixed unit must continue routing toward the anchor");
  assert.equal(defender.returning, false);
  assert.ok(rootDistanceForTest(defender, anchor) <= 96 * configuration.positionScale);

  fixture = returningDefender(64000);
  simulation = simulationApi.restoreSimulation(fixture.staged);
  for (let tick = 0; tick < 100 && entity(simulation.snapshot(), fixture.defenderId).returning; tick += 1) simulation.step();
  defender = entity(simulation.snapshot(), fixture.defenderId);
  assert.equal(defender.returning, false);
  assert.ok(rootDistanceForTest(defender, anchor) <= 96 * configuration.positionScale,
    "DEFEND must complete against the anchor root rather than its offset standing point");
});

test("direct-clear IDLE, ATTACK_MOVE, and DEFEND returns terminate under dynamic congestion", () => {
  function blockedReturn(order) {
    const staged = simulationApi.createSimulation().snapshot();
    const returning = entity(staged, "seat-1-astral-guardian-1");
    const blocker = entity(staged, "seat-1-astral-guardian-2");
    placeIdle(returning, 70000, 40000);
    placeIdle(blocker, 63000, 40000); setStopped(blocker);
    returning.order = order;
    returning.returning = true;
    if (order === "IDLE") {
      returning.idleRoot = { x: 55000, y: 40000 };
    } else if (order === "ATTACK_MOVE") {
      const savedDestination = { x: 50000, y: 50000 };
      const navigator = navigationApi.createNavigator(map, configuration, staged.structures);
      const saved = navigator.findRoute(returning, savedDestination, returning.radius);
      assert.equal(saved.ok, true);
      returning.commandRoot = { x: returning.x, y: returning.y };
      returning.engagementRoot = { x: 55000, y: 40000 };
      returning.savedRoute = saved.waypoints.map(clone);
      returning.savedRouteIndex = 0;
      returning.savedDestination = clone(savedDestination);
      returning.savedProgress = { distance: rootDistanceForTest(returning, savedDestination), stalledTicks: 0 };
    } else {
      returning.commandRoot = { x: returning.x, y: returning.y };
      returning.defendAnchor = { kind: "point", destination: { x: 55000, y: 40000 } };
    }
    return { staged, entityId: returning.id };
  }

  for (const order of ["IDLE", "ATTACK_MOVE", "DEFEND"]) {
    const fixture = blockedReturn(order);
    const simulation = simulationApi.restoreSimulation(fixture.staged);
    const events = stepMany(simulation, 250);
    const returned = entity(simulation.snapshot(), fixture.entityId);
    assert.equal(returned.returning, false, `${order} return must not remain stalled forever`);
    if (order === "DEFEND") {
      assert.equal(returned.order, "DEFEND");
      assert.equal(returned.returnFailure, "defend-return-unreachable");
      assert.equal(events.filter((value) => value.entityId === returned.id
        && value.code === "defend-return-unreachable").length, 1);
    } else {
      assert.equal(returned.order, "IDLE");
      if (order === "IDLE") assert.deepEqual(returned.idleRoot, { x: 55000, y: 40000 });
      assert.ok(events.some((value) => value.entityId === returned.id
        && value.status === "stopped" && value.code === "congestion"));
    }
  }
});

test("DEFEND freezes the last post-movement root on same-tick anchor defeat and ownership loss", () => {
  let staged = simulationApi.createSimulation().snapshot();
  const movingAnchor = entity(staged, "seat-1-starbow-1");
  const defender = entity(staged, "seat-1-astral-guardian-1");
  const attacker = entity(staged, "seat-2-ossuary-colossus-1");
  placeIdle(movingAnchor, 60000, 40000); movingAnchor.health = representatives[attacker.kind].damage;
  placeIdle(defender, 52000, 40000);
  defender.order = "DEFEND"; defender.commandRoot = { x: defender.x, y: defender.y };
  defender.defendAnchor = { kind: "entity", entityId: movingAnchor.id, lastRoot: { x: 60000, y: 40000 } };
  const attackPoint = navigationApi.reservationPoint(movingAnchor, attacker, "signature", 0);
  placeIdle(attacker, attackPoint.x, attackPoint.y);
  attacker.order = "ATTACK_ENTITY"; attacker.commandRoot = { x: attacker.x, y: attacker.y };
  attacker.targetId = movingAnchor.id; attacker.reservation = { targetId: movingAnchor.id, slotIndex: 0 };
  attacker.attackStartTick = 1; attacker.pendingAttackTick = 6; attacker.nextAttackStartTick = 33;
  staged.tick = 5;
  let simulation = simulationApi.restoreSimulation(staged);
  assert.equal(simulation.submitMove(command(simulation, "MOVE", {
    entityIds: [movingAnchor.id], destination: { x: 62000, y: 40000 }
  })).ok, true);
  simulation.step();
  assert.equal(entity(simulation.snapshot(), movingAnchor.id), undefined);
  assert.deepEqual(entity(simulation.snapshot(), defender.id).defendAnchor,
    { kind: "point", destination: { x: 60155, y: 40000 } },
    "the final living post-separation root is frozen before same-tick defeat removal");

  staged = simulationApi.createSimulation().snapshot();
  const capturedAnchor = structure(staged, "central-resource-point-anchor");
  capturedAnchor.ownerSeat = 1;
  capturedAnchor.capture = { challengerSeat: 2, progressTicks: configuration.captureRequiredTicks - 1 };
  const structureDefender = entity(staged, "seat-1-starbow-1");
  const challenger = entity(staged, "seat-2-gravebound-reaver-1");
  placeIdle(structureDefender, capturedAnchor.x + 18000, capturedAnchor.y);
  structureDefender.order = "DEFEND";
  structureDefender.commandRoot = { x: structureDefender.x, y: structureDefender.y };
  structureDefender.defendAnchor = {
    kind: "entity", entityId: capturedAnchor.id, lastRoot: { x: capturedAnchor.x, y: capturedAnchor.y }
  };
  placeIdle(challenger, capturedAnchor.x + 8000, capturedAnchor.y);
  simulation = simulationApi.restoreSimulation(staged);
  const captureEvents = simulation.step().events;
  assert.ok(captureEvents.some((value) => value.type === "structure"
    && value.structureId === capturedAnchor.id && value.status === "captured" && value.ownerSeat === 2));
  assert.deepEqual(entity(simulation.snapshot(), structureDefender.id).defendAnchor,
    { kind: "point", destination: { x: capturedAnchor.x, y: capturedAnchor.y } },
    "the only ownership-change path freezes the last valid fixed structure root");
});

test("canonical mixed-role allocation preserves unique shared slots and promotes an outer waiter in the release tick", () => {
  const staged = simulationApi.createSimulation().snapshot();
  const target = entity(staged, "seat-2-gravebound-reaver-1");
  placeIdle(target, 96000, 60000); setStopped(target);
  const template = entity(staged, "seat-1-astral-guardian-1");
  const close = staged.entities.filter((value) => value.ownerSeat === 1
    && representatives[value.kind].role !== "ranged");
  for (let index = 0; index < 5; index += 1) {
    const added = clone(template);
    added.id = `reinforcement-${String(index + 1).padStart(2, "0")}`;
    placeIdle(added, 60000 + index * 3800, 60000);
    staged.entities.push(added); player(staged, 1).populationUsed += 1; close.push(added);
  }
  const positions = [[60000, 60000], [66000, 60000], [72000, 60000], [78000, 60000],
    [84000, 60000], [90000, 60000], [60000, 66000], [66000, 66000], [72000, 66000]];
  close.slice(0, 9).forEach((value, index) => placeIdle(value, positions[index][0], positions[index][1]));
  staged.entities.sort((a, b) => configApi.compareIdentifiers(a.id, b.id));
  let simulation = simulationApi.restoreSimulation(staged);
  const selected = close.slice(0, 9).map((value) => value.id).sort();
  assert.equal(simulation.submitAttackEntity(command(simulation, "ATTACK_ENTITY", {
    entityIds: selected, targetId: target.id
  })).ok, true);
  simulation.step();
  let values = selected.map((id) => entity(simulation.snapshot(), id));
  assert.equal(new Set(values.map((value) => value.reservation.slotIndex)).size, 9);
  assert.equal(values.filter((value) => value.reservation.slotIndex < 8).length, 8);
  const firstRing = values.find((value) => value.reservation.slotIndex < 8);
  const outer = values.find((value) => value.reservation.slotIndex >= 8);
  assert.equal(simulation.submitStop(command(simulation, "STOP", { entityIds: [firstRing.id] })).ok, true);
  simulation.step();
  assert.ok(entity(simulation.snapshot(), outer.id).reservation.slotIndex < 8,
    "outer waiter must promote during the release tick");
});

test("moving slots recenter, close priority displaces ranged, mixed footprints separate, and collection order is invariant", () => {
  const openMap = openMapForTest();
  let staged = simulationApi.createSimulation({ map: openMap }).snapshot();
  let attacker = entity(staged, "seat-1-starbow-1");
  let target = entity(staged, "seat-2-gravebound-reaver-1");
  placeIdle(attacker, 80000, 60000);
  placeIdle(target, 100000, 60000); setStopped(target);
  let simulation = simulationApi.restoreSimulation(staged, { map: openMap });
  focus(simulation, attacker.id, target.id); simulation.step();
  const originalSlot = entity(simulation.snapshot(), attacker.id).reservation.slotIndex;
  assert.equal(simulation.submitMove(command(simulation, "MOVE", {
    entityIds: [target.id], destination: { x: target.x + representatives[target.kind].speedPerTick, y: target.y }
  }, { issuingPlayer: 2 })).ok, true);
  simulation.step();
  let moved = simulation.snapshot();
  assert.equal(entity(moved, attacker.id).reservation.slotIndex, originalSlot);
  assert.ok(entity(moved, target.id).x > target.x);
  const movedTarget = entity(moved, target.id);
  const movedAttacker = entity(moved, attacker.id);
  const recentered = navigationApi.reservationPoint(
    movedTarget, movedAttacker, representatives[movedAttacker.kind].role, originalSlot, configuration
  );
  const beforeRecenter = rootDistanceForTest(movedAttacker, recentered);
  assert.equal(simulation.submitStop(command(simulation, "STOP", { entityIds: [target.id] }, { issuingPlayer: 2 })).ok, true);
  simulation.step();
  moved = simulation.snapshot();
  assert.equal(entity(moved, attacker.id).reservation.slotIndex, originalSlot);
  assert.ok(rootDistanceForTest(entity(moved, attacker.id), recentered) < beforeRecenter,
    "the retained logical slot must chase its recentered point after target movement");

  function prioritySimulation(commandOrder) {
    const snapshot = simulationApi.createSimulation({ map: openMap }).snapshot();
    const close = entity(snapshot, "seat-1-aegis-titan-1");
    const ranged = entity(snapshot, "seat-1-starbow-1");
    const hostile = entity(snapshot, "seat-2-gravebound-reaver-1");
    placeIdle(close, 70000, 60000); setStopped(close);
    placeIdle(ranged, 90000, 60000); setStopped(ranged);
    placeIdle(hostile, 100000, 60000); setStopped(hostile);
    const engine = simulationApi.restoreSimulation(snapshot, { map: openMap });
    for (const id of commandOrder.map((name) => name === "close" ? close.id : ranged.id)) {
      assert.equal(focus(engine, id, hostile.id).ok, true);
    }
    engine.step();
    return { snapshot: engine.snapshot(), closeId: close.id, rangedId: ranged.id, targetId: hostile.id };
  }
  const first = prioritySimulation(["ranged", "close"]);
  const second = prioritySimulation(["close", "ranged"]);
  const firstClose = entity(first.snapshot, first.closeId);
  const firstRanged = entity(first.snapshot, first.rangedId);
  assert.equal(firstClose.reservation.slotIndex, 0, "close combat takes first-ring priority");
  assert.notEqual(firstRanged.reservation.slotIndex, 0, "the prior ranged incumbent is displaced canonically");
  const priorityTarget = entity(first.snapshot, first.targetId);
  const closePoint = navigationApi.reservationPoint(
    priorityTarget, firstClose, representatives[firstClose.kind].role, firstClose.reservation.slotIndex, configuration
  );
  const rangedPoint = navigationApi.reservationPoint(
    priorityTarget, firstRanged, representatives[firstRanged.kind].role, firstRanged.reservation.slotIndex, configuration
  );
  assert.ok(rootDistanceForTest(closePoint, rangedPoint) >= firstClose.radius + firstRanged.radius,
    "mixed close/ranged footprints receive non-stacking destinations");
  for (const id of [first.closeId, first.rangedId]) {
    assert.deepEqual(entity(first.snapshot, id).reservation, entity(second.snapshot, id).reservation,
      "reservation results cannot depend on command collection order");
    assert.deepEqual({ x: entity(first.snapshot, id).x, y: entity(first.snapshot, id).y },
      { x: entity(second.snapshot, id).x, y: entity(second.snapshot, id).y });
  }
});

test("a retained slot made unreachable by target movement releases and promotes a reachable waiter in the same pass", () => {
  const dividedMap = clone(map);
  dividedMap.layers.navigation.blockers.push({
    id: "retained-reservation-wall",
    polygon: [[800, 0], [820, 0], [820, 941], [800, 941]]
  });
  const staged = simulationApi.createSimulation({ map: dividedMap }).snapshot();
  const incumbent = entity(staged, "seat-1-astral-guardian-1");
  const waiter = entity(staged, "seat-1-astral-guardian-2");
  const target = entity(staged, "seat-2-gravebound-reaver-1");
  placeIdle(incumbent, 70000, 40000);
  placeIdle(waiter, 92500, 40000);
  placeIdle(target, 100000, 40000); setStopped(target);
  for (const [attacker, slotIndex] of [[incumbent, 0], [waiter, 8]]) {
    attacker.order = "ATTACK_ENTITY";
    attacker.commandRoot = { x: attacker.x, y: attacker.y };
    attacker.targetId = target.id;
    attacker.reservation = { targetId: target.id, slotIndex };
  }
  const simulation = simulationApi.restoreSimulation(staged, { map: dividedMap });
  const events = simulation.step().events;
  const after = simulation.snapshot();
  assert.equal(entity(after, waiter.id).reservation.slotIndex, 0);
  assert.equal(entity(after, incumbent.id).targetId, null);
  assert.ok(events.some((value) => value.status === "reservation"
    && value.entityId === waiter.id && value.slotIndex === 0));
  assert.ok(events.some((value) => value.status === "target-released"
    && value.entityId === incumbent.id && value.code === "unreachable"));
});

test("the legal 18-attacker maximum never overflows 24 slots and unavailable newcomers wait at distinct roots", () => {
  const openMap = clone(map);
  openMap.layers.navigation.blockers = [];
  const staged = simulationApi.createSimulation({ map: openMap }).snapshot();
  const template = clone(entity(staged, "seat-1-starbow-1"));
  const target = entity(staged, "seat-2-gravebound-reaver-1");
  placeIdle(target, 9000, 85000); setStopped(target);
  staged.entities = staged.entities.filter((value) => value.ownerSeat !== 1);
  player(staged, 1).populationUsed = 0;
  const navigator = navigationApi.createNavigator(openMap, configuration, staged.structures);
  const attackers = [];
  for (let y = 62000; y <= 90000 && attackers.length < configuration.populationCap; y += 3200) {
    for (let x = 14000; x <= 36000 && attackers.length < configuration.populationCap; x += 3200) {
      const candidate = { x, y, radius: template.radius };
      if (rootDistanceForTest(candidate, target) > 29000
        || !navigator.isPointClear(candidate, candidate.radius)
        || [...staged.entities, ...attackers].some((other) => {
          const minimum = other.radius + candidate.radius;
          const deltaX = other.x - candidate.x;
          const deltaY = other.y - candidate.y;
          return deltaX * deltaX + deltaY * deltaY < minimum * minimum;
        })) continue;
      const attacker = clone(template);
      attacker.id = `maximum-ranged-${String(attackers.length + 1).padStart(2, "0")}`;
      placeIdle(attacker, x, y);
      attackers.push(attacker);
    }
  }
  assert.equal(attackers.length, configuration.populationCap);
  staged.entities.push(...attackers);
  staged.entities.sort((first, second) => configApi.compareIdentifiers(first.id, second.id));
  player(staged, 1).populationUsed = attackers.reduce((total, value) => total + populationCost(value), 0);

  const simulation = simulationApi.restoreSimulation(staged, { map: openMap });
  simulation.step();
  const after = simulation.snapshot();
  const engaged = attackers.map((value) => entity(after, value.id));
  const reserved = engaged.filter((value) => value.reservation !== null);
  const waiting = engaged.filter((value) => value.reservationWait !== null);
  assert.equal(player(after, 1).populationUsed, 18);
  assert.ok(reserved.length <= configuration.reservationCapPerTarget);
  assert.equal(new Set(reserved.map((value) => value.reservation.slotIndex)).size, reserved.length);
  assert.ok(waiting.length > 0, "corner-blocked reservation candidates must create unavailable-slot waiters");
  assert.equal(reserved.length + waiting.length, 18);
  assert.ok(waiting.every((value) => value.targetId === target.id && value.formationDestination === null));
  assert.equal(new Set(waiting.map((value) => `${value.x}:${value.y}`)).size, waiting.length,
    "reservation-less attackers retain distinct ordinary separation roots");

  const stable = clone(after);
  simulation.step();
  const retried = simulation.snapshot();
  for (const waitingEntity of waiting) {
    assert.deepEqual(entity(retried, waitingEntity.id).reservationWait, entity(stable, waitingEntity.id).reservationWait);
    assert.deepEqual({ x: entity(retried, waitingEntity.id).x, y: entity(retried, waitingEntity.id).y },
      { x: waitingEntity.x, y: waitingEntity.y });
  }

  let changed = simulationApi.restoreSimulation(after, { map: openMap });
  assert.equal(changed.submitMove(command(changed, "MOVE", {
    entityIds: [target.id], destination: { x: target.x, y: target.y - 3000 }
  }, { issuingPlayer: 2 })).ok, true);
  changed.step();
  let changedSnapshot = changed.snapshot();
  assert.ok(entity(changedSnapshot, target.id).y < target.y);
  assert.ok(waiting.every((value) => entity(changedSnapshot, value.id).reservationWait === null),
    "post-allocation target movement clears the stale trigger so every waiter retries next tick");
  assert.deepEqual(simulationApi.restoreSimulation(changedSnapshot, { map: openMap }).snapshot(), changedSnapshot);

  const defeatedWaiterTrigger = clone(after);
  const defeatedAttacker = entity(defeatedWaiterTrigger, reserved[0].id);
  defeatedAttacker.health = 22;
  defeatedWaiterTrigger.projectiles = [{
    id: "projectile-000000000001", sourceSeat: 2, targetId: defeatedAttacker.id, damage: 22,
    launchTick: defeatedWaiterTrigger.tick, arrivalTick: defeatedWaiterTrigger.tick + 1,
    launchX: defeatedAttacker.x - representatives["hollow-string"].radius - defeatedAttacker.radius,
    launchY: defeatedAttacker.y,
    launchSourceRadius: representatives["hollow-string"].radius,
    launchTargetX: defeatedAttacker.x, launchTargetY: defeatedAttacker.y,
    launchTargetRadius: defeatedAttacker.radius, launchEdgeDistance: 0
  }];
  defeatedWaiterTrigger.nextProjectileNumber = 2;
  changed = simulationApi.restoreSimulation(defeatedWaiterTrigger, { map: openMap });
  changed.step();
  changedSnapshot = changed.snapshot();
  assert.equal(entity(changedSnapshot, defeatedAttacker.id), undefined);
  assert.ok(waiting.every((value) => entity(changedSnapshot, value.id).reservationWait === null),
    "same-tick attacker defeat clears stale roster triggers for every surviving waiter");
  assert.deepEqual(simulationApi.restoreSimulation(changedSnapshot, { map: openMap }).snapshot(), changedSnapshot);
});

test("ranged launch freezes geometry, survives source/target movement, and dissipates after target loss or capture", () => {
  let staged = simulationApi.createSimulation().snapshot();
  const attackerId = "seat-1-starbow-1";
  const targetId = "seat-2-gravebound-reaver-1";
  placePair(staged, attackerId, targetId, { x: 64000, y: 60000 }, { x: 75000, y: 60000 });
  setStopped(entity(staged, targetId));
  let simulation = simulationApi.restoreSimulation(staged);
  focus(simulation, attackerId, targetId);
  let events = stepMany(simulation, 6);
  const launched = events.find((value) => value.type === "projectile" && value.status === "launched");
  assert.ok(launched);
  const projectile = simulation.snapshot().projectiles[0];
  assert.equal(projectile.arrivalTick - projectile.launchTick, 5);
  const launchTarget = entity(simulation.snapshot(), targetId);
  assert.deepEqual({ x: projectile.launchTargetX, y: projectile.launchTargetY },
    { x: launchTarget.x, y: launchTarget.y });
  assert.equal(projectile.launchEdgeDistance, Math.max(0,
    rootDistanceForTest({ x: projectile.launchX, y: projectile.launchY }, launchTarget)
      - entity(simulation.snapshot(), attackerId).radius - launchTarget.radius));
  const launchCheckpoint = simulation.snapshot();
  assert.equal(simulation.submitMove(command(simulation, "MOVE", {
    entityIds: [targetId], destination: { x: 75000, y: 65000 }
  }, { issuingPlayer: 2 })).ok, true);
  events = stepMany(simulation, projectile.arrivalTick - simulation.tick);
  assert.ok(entity(simulation.snapshot(), targetId).y > projectile.launchTargetY,
    "later target movement does not alter the frozen projectile path or target lock");
  assert.ok(events.some((value) => value.status === "arrived" && value.projectileId === projectile.id));
  assert.equal(entity(simulation.snapshot(), targetId).health, 218);

  const checkpoint = clone(launchCheckpoint);
  const source = entity(checkpoint, attackerId);
  checkpoint.entities = checkpoint.entities.filter((value) => value.id !== attackerId);
  player(checkpoint, 1).populationUsed -= populationCost(source);
  simulation = simulationApi.restoreSimulation(checkpoint);
  events = stepMany(simulation, projectile.arrivalTick - simulation.tick);
  assert.ok(events.some((value) => value.status === "arrived" && value.projectileId === projectile.id));
  assert.equal(entity(simulation.snapshot(), targetId).health, 218);

  const removedTarget = clone(launchCheckpoint);
  const removedSource = entity(removedTarget, attackerId);
  const removedEnemy = entity(removedTarget, targetId);
  removedTarget.entities = removedTarget.entities.filter((value) => value.id !== attackerId && value.id !== targetId);
  player(removedTarget, 1).populationUsed -= populationCost(removedSource);
  player(removedTarget, 2).populationUsed -= populationCost(removedEnemy);
  simulation = simulationApi.restoreSimulation(removedTarget);
  events = stepMany(simulation, projectile.arrivalTick - simulation.tick);
  assert.ok(events.some((value) => value.status === "dissipated" && value.projectileId === projectile.id));

  staged = simulationApi.createSimulation().snapshot();
  const outpost = structure(staged, "east-production-outpost-anchor");
  outpost.ownerSeat = 2;
  outpost.capture = { challengerSeat: 1, progressTicks: configuration.captureRequiredTicks - 6 };
  const ranged = entity(staged, attackerId);
  const capturing = entity(staged, "seat-1-astral-guardian-1");
  const point = navigationApi.reservationPoint(outpost, ranged, "ranged", 0);
  placeIdle(ranged, point.x, point.y);
  placeIdle(capturing, outpost.x + 8000, outpost.y); setStopped(capturing);
  setStopped(entity(staged, "seat-2-gravebound-reaver-1"));
  simulation = simulationApi.restoreSimulation(staged);
  focus(simulation, attackerId, outpost.id);
  stepMany(simulation, 6);
  const inFlight = simulation.snapshot();
  const projectileId = inFlight.projectiles[0].id;
  assert.equal(structure(inFlight, outpost.id).ownerSeat, 1,
    "the target changes ownership only after the valid hostile projectile launch");
  simulation = simulationApi.restoreSimulation(inFlight);
  const before = structure(simulation.snapshot(), outpost.id).health;
  events = stepMany(simulation, inFlight.projectiles[0].arrivalTick - inFlight.tick);
  assert.ok(events.some((value) => value.status === "dissipated" && value.projectileId === projectileId));
  assert.equal(structure(simulation.snapshot(), outpost.id).health, before);
  const missingTarget = clone(inFlight);
  missingTarget.projectiles[0].targetId = "defeated-projectile-target";
  simulation = simulationApi.restoreSimulation(missingTarget);
  events = stepMany(simulation, missingTarget.projectiles[0].arrivalTick - missingTarget.tick);
  assert.ok(events.some((value) => value.status === "dissipated" && value.projectileId === projectileId));
});

test("projectile exact launch geometry, natural 1/14 travel boundaries, 96 cap, and ID limit are bounded", () => {
  const opening = simulationApi.createSimulation().snapshot();
  const targetId = "seat-2-gravebound-reaver-1";
  const makeProjectile = (number, launchEdgeDistance) => ({
    id: `projectile-${String(number).padStart(12, "0")}`, sourceSeat: 1, targetId, damage: 22,
    launchTick: 1,
    arrivalTick: 1 + Math.max(configuration.projectileTravelTickMin, Math.min(
      configuration.projectileTravelTickMax,
      Math.ceil(launchEdgeDistance / configuration.projectileSpeedFixed)
    )),
    launchX: 64000, launchY: 60000, launchSourceRadius: 1400,
    launchTargetX: 64000 + 1400 + 1600 + launchEdgeDistance, launchTargetY: 60000,
    launchTargetRadius: 1600, launchEdgeDistance
  });
  opening.tick = 1;
  opening.projectiles = [makeProjectile(1, 0), makeProjectile(2, 22000)];
  opening.nextProjectileNumber = 3;
  let simulation = simulationApi.restoreSimulation(opening);
  let events = simulation.step().events;
  assert.ok(events.some((value) => value.projectileId === "projectile-000000000001" && value.status === "arrived"));
  events = stepMany(simulation, 12);
  assert.ok(!events.some((value) => value.projectileId === "projectile-000000000002"));
  events = simulation.step().events;
  assert.ok(events.some((value) => value.projectileId === "projectile-000000000002" && value.status === "arrived"));

  const projectileCheckpoint = simulationApi.createSimulation().snapshot();
  projectileCheckpoint.tick = 1;
  projectileCheckpoint.projectiles = [makeProjectile(1, 0)];
  projectileCheckpoint.nextProjectileNumber = 2;
  for (const mutate of [
    (value) => { value.projectiles[0].damage = 0; },
    (value) => { value.projectiles[0].damage = 1800; },
    (value) => { value.projectiles[0].launchEdgeDistance = -1; },
    (value) => { value.projectiles[0].launchTargetX = -1; },
    (value) => { value.projectiles[0].launchSourceRadius = 1600; },
    (value) => { value.projectiles[0].launchTargetRadius = 999; },
    (value) => {
      value.projectiles[0].launchTargetRadius = 2400;
      value.projectiles[0].launchTargetX += 800;
    },
    (value) => { value.projectiles[0].launchEdgeDistance = 1; },
    (value) => { value.projectiles[0].arrivalTick += 1; }
  ]) {
    const malformed = clone(projectileCheckpoint);
    mutate(malformed);
    assert.throws(() => simulationApi.restoreSimulation(malformed), /projectile is invalid/);
  }

  let staged = simulationApi.createSimulation().snapshot();
  const { attackerId } = placePair(staged, "seat-1-starbow-1", targetId, { x: 64000, y: 60000 }, { x: 75000, y: 60000 });
  setStopped(entity(staged, targetId));
  simulation = simulationApi.restoreSimulation(staged); focus(simulation, attackerId, targetId); simulation.step();
  staged = simulation.snapshot();
  staged.projectiles = Array.from({ length: 96 }, (_, index) => ({
    id: `projectile-${String(index + 1).padStart(12, "0")}`, sourceSeat: 1, targetId, damage: 22,
    launchTick: 1, arrivalTick: 15, launchX: 64000, launchY: 60000, launchSourceRadius: 1400,
    launchTargetX: 89000, launchTargetY: 60000, launchTargetRadius: 1600, launchEdgeDistance: 22000
  }));
  staged.nextProjectileNumber = 97;
  simulation = simulationApi.restoreSimulation(staged);
  events = stepMany(simulation, 5);
  assert.ok(events.some((value) => value.code === "projectile-limit"));
  assert.equal(entity(simulation.snapshot(), attackerId).nextAttackStartTick, 25);

  staged = simulationApi.createSimulation().snapshot();
  placePair(staged, "seat-1-starbow-1", targetId, { x: 64000, y: 60000 }, { x: 75000, y: 60000 });
  setStopped(entity(staged, targetId));
  staged.nextProjectileNumber = configuration.projectileIdCap + 1;
  simulation = simulationApi.restoreSimulation(staged); focus(simulation, "seat-1-starbow-1", targetId); simulation.step();
  events = stepMany(simulation, 5);
  assert.ok(events.some((value) => value.code === "projectile-id-limit"));
});

test("same-tick damage is simultaneous, mutual defeat removes population once, and survivors alone capture", () => {
  let staged = simulationApi.createSimulation().snapshot();
  const { attackerId, targetId } = placePair(staged);
  entity(staged, attackerId).health = 28; entity(staged, targetId).health = 28;
  let simulation = simulationApi.restoreSimulation(staged);
  const beforeOne = player(staged, 1).populationUsed; const beforeTwo = player(staged, 2).populationUsed;
  const events = stepMany(simulation, 6);
  assert.equal(entity(simulation.snapshot(), attackerId), undefined);
  assert.equal(entity(simulation.snapshot(), targetId), undefined);
  assert.equal(player(simulation.snapshot(), 1).populationUsed, beforeOne - 1);
  assert.equal(player(simulation.snapshot(), 2).populationUsed, beforeTwo - 1);
  assert.equal(events.filter((value) => value.type === "defeat").length, 2);
  stepMany(simulation, 4);
  assert.equal(player(simulation.snapshot(), 1).populationUsed, beforeOne - 1);

  staged = simulationApi.createSimulation().snapshot();
  const resource = structure(staged, "central-resource-point-anchor");
  resource.capture = { challengerSeat: 2, progressTicks: 119 };
  const victim = entity(staged, "seat-2-gravebound-reaver-1");
  const killer = entity(staged, "seat-1-astral-guardian-1");
  placeIdle(victim, resource.x + 7000, resource.y); victim.health = 28;
  placeIdle(killer, victim.x, victim.y - 4000);
  killer.order = "ATTACK_ENTITY"; killer.commandRoot = { x: killer.x, y: killer.y };
  killer.targetId = victim.id; killer.reservation = { targetId: victim.id, slotIndex: 0 };
  killer.attackStartTick = 1; killer.pendingAttackTick = 6; killer.nextAttackStartTick = 21;
  staged.tick = 5;
  simulation = simulationApi.restoreSimulation(staged);
  simulation.step();
  assert.equal(structure(simulation.snapshot(), resource.id).ownerSeat, null,
    "a unit defeated in stage 6 cannot complete capture in stage 7");
});

test("structure damage refunds once, suppresses later stages, and single/double headquarters resolve victory/draw", () => {
  function stagedHeadquarters(attackerId, hqId, health) {
    const snapshot = simulationApi.createSimulation().snapshot();
    const attacker = entity(snapshot, attackerId); const hq = structure(snapshot, hqId);
    hq.health = health;
    const slot = navigationApi.reservationPoint(hq, attacker, representatives[attacker.kind].role, 0);
    placeIdle(attacker, slot.x, slot.y);
    return snapshot;
  }
  let staged = stagedHeadquarters("seat-1-astral-guardian-1", "gravebound-headquarters-anchor", 28);
  let simulation = simulationApi.restoreSimulation(staged);
  focus(simulation, "seat-1-astral-guardian-1", "gravebound-headquarters-anchor");
  let events = [...simulation.step().events];
  const chasing = entity(simulation.snapshot(), "seat-2-ossuary-colossus-1");
  assert.equal(chasing.order, "IDLE");
  assert.equal(chasing.targetId, "seat-1-astral-guardian-1");
  assert.ok(chasing.route.length > 0 && chasing.formationDestination !== null,
    "the completion fixture exercises a real transient idle-chase route");
  events.push(...stepMany(simulation, 5));
  assert.deepEqual(simulation.snapshot().match, { status: "complete", winnerSeat: 1, completedTick: 6 });
  assert.ok(events.some((value) => value.type === "structure" && value.status === "destroyed"));
  const frozen = clone(simulation.snapshot());
  const frozenChaser = entity(frozen, "seat-2-ossuary-colossus-1");
  assert.equal(frozenChaser.targetId, null);
  assert.equal(frozenChaser.route.length, 0);
  assert.equal(frozenChaser.formationDestination, null);
  assert.deepEqual(simulationApi.restoreSimulation(frozen).snapshot(), frozen,
    "a normal completed authoritative snapshot restores exactly");
  assert.deepEqual(simulation.step(), { tick: 6, events: [] });
  assert.deepEqual(simulation.snapshot(), frozen);
  assert.deepEqual(simulation.submitStop(command(simulation, "STOP", { entityIds: ["seat-1-starbow-1"] })), {
    ok: false, code: "match-complete"
  });

  staged = simulationApi.createSimulation().snapshot();
  const leftAttacker = entity(staged, "seat-2-gravebound-reaver-1");
  const rightAttacker = entity(staged, "seat-1-astral-guardian-1");
  const leftHq = structure(staged, "astral-headquarters-anchor");
  const rightHq = structure(staged, "gravebound-headquarters-anchor");
  leftHq.health = 28; rightHq.health = 28;
  let slot = navigationApi.reservationPoint(leftHq, leftAttacker, "melee", 0);
  placeIdle(leftAttacker, slot.x, slot.y);
  slot = navigationApi.reservationPoint(rightHq, rightAttacker, "melee", 4);
  placeIdle(rightAttacker, slot.x, slot.y);
  simulation = simulationApi.restoreSimulation(staged);
  focus(simulation, rightAttacker.id, rightHq.id, 1);
  focus(simulation, leftAttacker.id, leftHq.id, 2);
  stepMany(simulation, 6);
  assert.deepEqual(simulation.snapshot().match, { status: "complete", winnerSeat: null, completedTick: 6 });
});

test("destroying a queued producer applies the inherited full refund before production advances", () => {
  let simulation = simulationApi.createSimulation();
  const producerId = "gravebound-headquarters-anchor";
  assert.equal(simulation.submitQueueProduction(command(simulation, "QUEUE_PRODUCTION", {
    structureId: producerId, entityKind: "gravebound-reaver"
  }, { issuingPlayer: 2 })).ok, true);
  simulation.step();
  const staged = simulation.snapshot();
  const producer = structure(staged, producerId); producer.health = 28;
  const attacker = entity(staged, "seat-1-astral-guardian-1");
  const slot = navigationApi.reservationPoint(producer, attacker, "melee", 0);
  placeIdle(attacker, slot.x, slot.y);
  simulation = simulationApi.restoreSimulation(staged);
  const resourceBefore = player(simulation.snapshot(), 2).resources;
  focus(simulation, attacker.id, producerId);
  const events = stepMany(simulation, 6);
  const destroyed = events.find((value) => value.type === "structure" && value.status === "destroyed");
  assert.equal(destroyed.refundedItems, 1);
  assert.equal(player(simulation.snapshot(), 2).resources, resourceBefore + representatives["gravebound-reaver"].cost);
  assert.equal(player(simulation.snapshot(), 2).populationReserved, 0);
  assert.deepEqual(structure(simulation.snapshot(), producerId).queue, []);
});

test("non-HQ destruction refunds every item once and suppresses capture, income, and production stages", () => {
  const openMap = openMapForTest();
  let staged = simulationApi.createSimulation({ map: openMap }).snapshot();
  let producer = structure(staged, "east-production-outpost-anchor");
  producer.ownerSeat = 2;
  producer.health = 28;
  producer.queue = Array.from({ length: 3 }, (_, index) => ({
    id: `queue-${String(index + 1).padStart(8, "0")}`, ownerSeat: 2,
    entityKind: "gravebound-reaver", progressTicks: 0, blockedComplete: false
  }));
  staged.nextQueueNumber = 4;
  player(staged, 2).populationReserved = 3;
  let attacker = entity(staged, "seat-1-astral-guardian-1");
  let slot = navigationApi.reservationPoint(producer, attacker, "melee", 0, configuration);
  placeIdle(attacker, slot.x, slot.y);
  let simulation = simulationApi.restoreSimulation(staged, { map: openMap });
  const resourcesBefore = player(simulation.snapshot(), 2).resources;
  focus(simulation, attacker.id, producer.id);
  let events = stepMany(simulation, 6);
  let destroyed = events.find((value) => value.type === "structure"
    && value.structureId === producer.id && value.status === "destroyed");
  assert.equal(destroyed.refundedItems, 3);
  let snapshot = simulation.snapshot();
  producer = structure(snapshot, producer.id);
  assert.equal(producer.destroyed, true);
  assert.equal(producer.ownerSeat, null);
  assert.deepEqual(producer.queue, []);
  assert.equal(player(snapshot, 2).resources,
    resourcesBefore + 3 * representatives["gravebound-reaver"].cost);
  assert.equal(player(snapshot, 2).populationReserved, 0);
  assert.ok(!events.some((value) => value.type === "production" && value.status === "completed"),
    "a non-HQ producer destroyed in stage 6 cannot advance or spawn in stage 9");

  staged = simulationApi.createSimulation({ map: openMap }).snapshot();
  const resource = structure(staged, "central-resource-point-anchor");
  resource.ownerSeat = 2;
  resource.health = 28;
  attacker = entity(staged, "seat-1-astral-guardian-1");
  slot = navigationApi.reservationPoint(resource, attacker, "melee", 0, configuration);
  placeIdle(attacker, slot.x, slot.y);
  staged.tick = configuration.resourceIncomeIntervalTicks - 6;
  simulation = simulationApi.restoreSimulation(staged, { map: openMap });
  const incomeBefore = player(simulation.snapshot(), 2).resources;
  focus(simulation, attacker.id, resource.id);
  events = stepMany(simulation, 6);
  destroyed = events.find((value) => value.type === "structure"
    && value.structureId === resource.id && value.status === "destroyed");
  assert.ok(destroyed);
  snapshot = simulation.snapshot();
  assert.equal(snapshot.tick, configuration.resourceIncomeIntervalTicks);
  assert.equal(player(snapshot, 2).resources, incomeBefore,
    "a Resource Point destroyed in stage 6 cannot pay its former owner in stage 8");
  assert.deepEqual(structure(snapshot, resource.id).capture, { challengerSeat: null, progressTicks: 0 });
  assert.equal(structure(snapshot, resource.id).destroyed, true,
    "a destroyed capturable structure cannot resolve capture in stage 7");
});

test("a naturally completed match restores and replays to the same canonical frozen snapshot", () => {
  const live = simulationApi.createSimulation({ seed: 123 });
  const replay = replayApi.createReplay(live.snapshot());
  const hostileIds = live.snapshot().entities.filter((value) => value.ownerSeat === 2)
    .map((value) => value.id).sort(configApi.compareIdentifiers);
  const requests = [
    command(live, "STOP", { entityIds: hostileIds }, { issuingPlayer: 2 }),
    command(live, "ATTACK_ENTITY", {
      entityIds: ["seat-1-astral-guardian-1"], targetId: "gravebound-headquarters-anchor"
    })
  ];
  for (const request of requests) {
    const receipt = live.submitCommand(request);
    assert.equal(receipt.ok, true);
    replayApi.appendAccepted(replay, receipt);
  }
  while (live.snapshot().match.status === "active" && live.tick < 3000) live.step();
  const completed = live.snapshot();
  assert.deepEqual(completed.match, { status: "complete", winnerSeat: 1, completedTick: 2003 });
  assert.deepEqual(simulationApi.restoreSimulation(completed).snapshot(), completed);
  const reproduced = replayApi.runReplay(replay, { untilTick: completed.tick + 20 });
  assert.deepEqual(reproduced.snapshot, completed);
});

test("snapshots strictly preserve attacks, projectiles, reservations, outcomes, and restore-and-continue convergence", () => {
  const staged = simulationApi.createSimulation({ seed: 91 }).snapshot();
  const { attackerId, targetId } = placePair(staged, "seat-1-starbow-1", "seat-2-gravebound-reaver-1",
    { x: 64000, y: 60000 }, { x: 75000, y: 60000 });
  setStopped(entity(staged, targetId));
  const original = simulationApi.restoreSimulation(staged);
  focus(original, attackerId, targetId); stepMany(original, 6);
  const checkpoint = original.snapshot();
  assert.equal(checkpoint.projectiles.length, 1);
  const restored = simulationApi.restoreSimulation(checkpoint);
  checkpoint.entities[0].health = 1; checkpoint.projectiles.length = 0;
  assert.notEqual(restored.snapshot().entities[0].health, 1);
  assert.equal(restored.snapshot().projectiles.length, 1);
  for (let index = 0; index < 30; index += 1) {
    original.step(); restored.step();
    assert.deepEqual(restored.snapshot(), original.snapshot());
  }
  const unknown = clone(restored.snapshot()); unknown.camera = {};
  assert.throws(() => simulationApi.restoreSimulation(unknown), /unknown or missing/);
  const badHealth = clone(restored.snapshot()); badHealth.structures[0].health = badHealth.structures[0].maxHealth + 1;
  assert.throws(() => simulationApi.restoreSimulation(badHealth), /structure state/);
  for (const fixture of [
    { attackerId: "seat-1-astral-guardian-1", first: { x: 64000, y: 40000 }, second: { x: 68000, y: 40000 } },
    { attackerId: "seat-1-starbow-1", first: { x: 64000, y: 60000 }, second: { x: 75000, y: 60000 } }
  ]) {
    const active = simulationApi.createSimulation().snapshot();
    const pairIds = placePair(active, fixture.attackerId, "seat-2-gravebound-reaver-1", fixture.first, fixture.second);
    setStopped(entity(active, pairIds.targetId));
    const timingSimulation = simulationApi.restoreSimulation(active);
    focus(timingSimulation, pairIds.attackerId, pairIds.targetId);
    timingSimulation.step();
    const validTiming = timingSimulation.snapshot();
    const activeAttacker = entity(validTiming, pairIds.attackerId);
    assert.equal(activeAttacker.pendingAttackTick,
      activeAttacker.attackStartTick + representatives[activeAttacker.kind].contactOffsetTicks);
    assert.equal(activeAttacker.nextAttackStartTick,
      activeAttacker.attackStartTick + representatives[activeAttacker.kind].attackCycleTicks);
    const badContact = clone(validTiming);
    entity(badContact, pairIds.attackerId).pendingAttackTick -= 1;
    assert.throws(() => simulationApi.restoreSimulation(badContact), /active attack timing/);
    const badCycle = clone(validTiming);
    entity(badCycle, pairIds.attackerId).nextAttackStartTick -= 1;
    assert.throws(() => simulationApi.restoreSimulation(badCycle), /active attack timing/);
    const deletedContact = clone(validTiming);
    entity(deletedContact, pairIds.attackerId).pendingAttackTick = null;
    assert.throws(() => simulationApi.restoreSimulation(deletedContact), /active attack timing/);
    stepMany(timingSimulation, representatives[activeAttacker.kind].contactOffsetTicks);
    const postContact = timingSimulation.snapshot();
    const coolingAttacker = entity(postContact, pairIds.attackerId);
    assert.equal(coolingAttacker.pendingAttackTick, null);
    assert.notEqual(coolingAttacker.attackStartTick, null);
    const badCooldown = clone(postContact);
    entity(badCooldown, pairIds.attackerId).nextAttackStartTick -= 1;
    assert.throws(() => simulationApi.restoreSimulation(badCooldown), /active attack timing/);
    const lingeringContact = clone(postContact);
    entity(lingeringContact, pairIds.attackerId).pendingAttackTick = postContact.tick + 1;
    assert.throws(() => simulationApi.restoreSimulation(lingeringContact), /active attack timing/);
  }
  const duplicateReservation = simulationApi.createSimulation().snapshot();
  const pair = placePair(duplicateReservation);
  for (const id of [pair.attackerId, "seat-1-astral-guardian-2"]) {
    const value = entity(duplicateReservation, id);
    value.order = "ATTACK_ENTITY"; value.commandRoot = { x: value.x, y: value.y };
    value.targetId = pair.targetId; value.reservation = { targetId: pair.targetId, slotIndex: 0 };
  }
  assert.throws(() => simulationApi.restoreSimulation(duplicateReservation), /reservations collide/);

  const futureCooldown = simulationApi.createSimulation().snapshot();
  entity(futureCooldown, "seat-1-astral-guardian-1").nextAttackStartTick = 1000000000;
  assert.throws(() => simulationApi.restoreSimulation(futureCooldown), /entity state/);

  const returningBase = simulationApi.createSimulation().snapshot();
  returningBase.tick = 1;
  const returningId = "seat-1-astral-guardian-1";
  const returningTarget = entity(returningBase, "seat-2-gravebound-reaver-1");
  entity(returningBase, returningId).returning = true;
  assert.deepEqual(simulationApi.restoreSimulation(returningBase).snapshot(), returningBase);
  for (const mutate of [
    (value) => { entity(value, returningId).targetId = returningTarget.id; },
    (value) => {
      const attacker = entity(value, returningId);
      attacker.targetId = returningTarget.id;
      attacker.reservation = { targetId: returningTarget.id, slotIndex: 0 };
    },
    (value) => {
      const attacker = entity(value, returningId);
      attacker.targetId = returningTarget.id;
      attacker.reservationWait = {
        targetId: returningTarget.id, targetX: returningTarget.x, targetY: returningTarget.y,
        attackerRoster: returningId
      };
    },
    (value) => {
      const attacker = entity(value, returningId);
      attacker.targetId = returningTarget.id;
      attacker.reservation = { targetId: returningTarget.id, slotIndex: 0 };
      attacker.attackStartTick = 1;
      attacker.pendingAttackTick = 6;
      attacker.nextAttackStartTick = 21;
    }
  ]) {
    const malformed = clone(returningBase);
    mutate(malformed);
    assert.throws(() => simulationApi.restoreSimulation(malformed), /return state/);
  }
  const invalidFailure = clone(returningBase);
  entity(invalidFailure, returningId).returning = false;
  entity(invalidFailure, returningId).returnFailure = "defend-return-unreachable";
  assert.throws(() => simulationApi.restoreSimulation(invalidFailure), /return state/);

  let attackMoveSimulation = simulationApi.createSimulation();
  assert.equal(attackMoveSimulation.submitAttackMove(command(attackMoveSimulation, "ATTACK_MOVE", {
    entityIds: [returningId], destination: { x: 50000, y: 40000 }
  })).ok, true);
  attackMoveSimulation.step();
  const missingEngagement = attackMoveSimulation.snapshot();
  const attackMover = entity(missingEngagement, returningId);
  attackMover.returning = true;
  attackMover.route = []; attackMover.routeIndex = 0; attackMover.formationDestination = null;
  attackMover.progress = { distance: 0, stalledTicks: 0 };
  attackMover.engagementRoot = null;
  assert.throws(() => simulationApi.restoreSimulation(missingEngagement), /return state|attack-move entity/);

  const forgedEngagement = simulationApi.createSimulation().snapshot();
  const stopped = entity(forgedEngagement, returningId); setStopped(stopped);
  stopped.engagementRoot = { x: stopped.x, y: stopped.y };
  assert.throws(() => simulationApi.restoreSimulation(forgedEngagement), /engagement root/);

  const defendSimulation = simulationApi.createSimulation();
  assert.equal(defendSimulation.submitDefend(command(defendSimulation, "DEFEND", {
    entityIds: ["seat-1-starbow-1"],
    anchor: { kind: "entity", entityId: "seat-1-astral-guardian-1" }
  })).ok, true);
  defendSimulation.step();
  const validDefend = defendSimulation.snapshot();
  for (const mutate of [
    (anchor) => { anchor.entityId = "missing-anchor"; },
    (anchor) => { anchor.entityId = "seat-2-gravebound-reaver-1"; },
    (anchor) => { anchor.lastRoot.x += 1; }
  ]) {
    const malformed = clone(validDefend);
    mutate(entity(malformed, "seat-1-starbow-1").defendAnchor);
    assert.throws(() => simulationApi.restoreSimulation(malformed), /defend anchor/);
  }

  const mismatchedCompletion = simulationApi.createSimulation().snapshot();
  const defeatedHeadquarters = structure(mismatchedCompletion, "gravebound-headquarters-anchor");
  defeatedHeadquarters.health = 0; defeatedHeadquarters.destroyed = true; defeatedHeadquarters.ownerSeat = null;
  defeatedHeadquarters.capture = { challengerSeat: null, progressTicks: 0 };
  defeatedHeadquarters.queue = []; defeatedHeadquarters.rally = null;
  mismatchedCompletion.tick = 100;
  mismatchedCompletion.match = { status: "complete", winnerSeat: 1, completedTick: 50 };
  assert.throws(() => simulationApi.restoreSimulation(mismatchedCompletion), /match outcome/);
});

test("snapshot and replay caps, encoded sizes, dense arrays, and raw-ASCII order fail closed", () => {
  const opening = simulationApi.createSimulation().snapshot();
  const oversizedSnapshot = { ...opening, padding: "x".repeat(configuration.snapshotByteCap) };
  assert.throws(() => simulationApi.restoreSimulation(oversizedSnapshot), /encoded bound/);

  let malformed = clone(opening);
  delete malformed.entities[0];
  assert.throws(() => simulationApi.restoreSimulation(malformed), /entity collection/);
  malformed = clone(opening);
  [malformed.entities[0], malformed.entities[1]] = [malformed.entities[1], malformed.entities[0]];
  assert.throws(() => simulationApi.restoreSimulation(malformed), /entity state/);
  malformed = clone(opening);
  malformed.entities = Array.from({ length: configuration.combatEntityCap + 1 }, (_, index) => ({
    ...clone(opening.entities[0]), id: `cap-entity-${String(index).padStart(2, "0")}`
  }));
  assert.throws(() => simulationApi.restoreSimulation(malformed), /entity collection/);
  malformed = clone(opening);
  malformed.projectiles = Array.from({ length: configuration.projectileCap + 1 }, () => ({}));
  assert.throws(() => simulationApi.restoreSimulation(malformed), /projectiles exceed/);
  malformed = clone(opening);
  malformed.pendingCommands = Array.from({ length: configuration.pendingCommandCap + 1 }, () => ({}));
  assert.throws(() => simulationApi.restoreSimulation(malformed), /pending commands exceed/);

  const projectileSnapshot = clone(opening);
  projectileSnapshot.tick = 1;
  projectileSnapshot.projectiles = [1, 2].map((number) => ({
    id: `projectile-${String(number).padStart(12, "0")}`, sourceSeat: 1,
    targetId: "seat-2-gravebound-reaver-1", damage: 22,
    launchTick: 1, arrivalTick: 2, launchX: 64000, launchY: 60000,
    launchSourceRadius: 1400, launchTargetX: 67000, launchTargetY: 60000,
    launchTargetRadius: 1600, launchEdgeDistance: 0
  }));
  projectileSnapshot.nextProjectileNumber = 3;
  assert.deepEqual(simulationApi.restoreSimulation(projectileSnapshot).snapshot(), projectileSnapshot);
  malformed = clone(projectileSnapshot);
  malformed.projectiles.reverse();
  assert.throws(() => simulationApi.restoreSimulation(malformed), /projectile is invalid/);

  const live = simulationApi.createSimulation();
  const replay = replayApi.createReplay(live.snapshot());
  replayApi.appendAccepted(replay, live.submitStop(command(live, "STOP", {
    entityIds: ["seat-1-astral-guardian-1"]
  })));
  const sparseReplay = clone(replay);
  delete sparseReplay.commands[0];
  assert.throws(() => replayApi.validateReplay(sparseReplay), /canonical JSON|header|command bound/);
  const cappedReplay = clone(replay);
  cappedReplay.commands = Array.from({ length: configuration.replayCommandCap + 1 }, () => ({}));
  assert.throws(() => replayApi.validateReplay(cappedReplay), /header|command bound/);
  const oversizedReplay = { ...clone(replay), padding: "x".repeat(configuration.replayByteCap) };
  assert.throws(() => replayApi.validateReplay(oversizedReplay), /encoded bound/);
});

test("canonical replay covers every order kind, contiguous sequence, checksums, malformed data, and convergence", () => {
  const live = simulationApi.createSimulation({ seed: 77 });
  const replay = replayApi.createReplay(live.snapshot());
  const snapshot = live.snapshot();
  const own = snapshot.entities.filter((value) => value.ownerSeat === 1).map((value) => value.id).sort();
  const targetId = snapshot.entities.find((value) => value.ownerSeat === 2).id;
  const requests = [
    command(live, "MOVE", { entityIds: [own[0]], destination: { x: 50000, y: 40000 } }),
    command(live, "ATTACK_ENTITY", { entityIds: [own[1]], targetId }),
    command(live, "ATTACK_MOVE", { entityIds: [own[2]], destination: { x: 60000, y: 40000 } }),
    command(live, "STOP", { entityIds: [own[3]] }),
    command(live, "DEFEND", { entityIds: [own[4]], anchor: { kind: "point", destination: { x: 50000, y: 40000 } } }),
    command(live, "DEFEND", { entityIds: [own[5]], anchor: { kind: "entity", entityId: own[0] } })
  ];
  for (const request of requests) replayApi.appendAccepted(replay, live.submitCommand(request));
  const producer = live.snapshot().structures.find((value) => value.ownerSeat === 1);
  for (const request of [
    command(live, "QUEUE_PRODUCTION", { structureId: producer.id, entityKind: "astral-guardian" }),
    command(live, "SET_RALLY", { structureId: producer.id, destination: { x: 50000, y: 40000 } }),
    command(live, "CLEAR_RALLY", { structureId: producer.id })
  ]) replayApi.appendAccepted(replay, live.submitCommand(request));
  const checksums = [{ tick: 0, checksum: replayApi.checksum(live.snapshot()) }];
  live.step();
  const queued = structure(live.snapshot(), producer.id).queue[0];
  assert.ok(queued);
  replayApi.appendAccepted(replay, live.submitCancelProduction(command(live, "CANCEL_PRODUCTION", {
    structureId: producer.id, queueItemId: queued.id
  })));
  while (live.tick < 100) {
    live.step();
    if (live.tick % configuration.checksumIntervalTicks === 0) checksums.push({ tick: live.tick, checksum: replayApi.checksum(live.snapshot()) });
  }
  assert.deepEqual(replayApi.validateReplay(replay), replay);
  const reproduced = replayApi.runReplay(replay, { untilTick: 100 });
  assert.deepEqual(reproduced.snapshot, live.snapshot());
  assert.deepEqual(reproduced.checksums, checksums);
  const malformed = clone(replay); malformed.commands[0].command.sequence = 2;
  assert.throws(() => replayApi.validateReplay(malformed), /sequence/);
  assert.notEqual(replayApi.checksum({ health: 1 }), replayApi.checksum({ health: 2 }));
});

test("Phase 5 modules expose browser namespaces and contain no random, network, prototype, or mutation escape", () => {
  const context = { console }; context.window = context; vm.createContext(context);
  for (const relativePath of [
    "phase2/map.js", "phase4/config.js", "phase4/map.js",
    "phase5/config.js", "phase5/map.js", "phase5/navigation.js",
    "phase5/simulation.js", "phase5/replay.js"
  ]) vm.runInContext(read(relativePath), context, { filename: relativePath });
  for (const name of ["AeonPhase5Config", "AeonPhase5Map", "AeonPhase5Navigation", "AeonPhase5Simulation", "AeonPhase5Replay"]) {
    assert.ok(context[name], `${name} browser API is missing`);
  }
  assert.equal(context.AeonPhase5Simulation.createSimulation().applyStructureDestruction, undefined);
  const sources = ["phase5/config.js", "phase5/map.js", "phase5/navigation.js", "phase5/simulation.js", "phase5/replay.js"]
    .map(read).join("\n");
  assert.doesNotMatch(sources, /Math\.random|Date\.now|performance\.now/);
  assert.doesNotMatch(sources, /WebSocket|RTCPeerConnection|TURN server|signaling/i);
  assert.doesNotMatch(sources, /v2026\.8\.15|prototype combat/i);
});
