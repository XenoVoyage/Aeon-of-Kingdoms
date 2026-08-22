"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const map = require(path.join(ROOT, "phase2/map.js"));
const configApi = require(path.join(ROOT, "phase3/config.js"));
const navigationApi = require(path.join(ROOT, "phase3/navigation.js"));
const simulationApi = require(path.join(ROOT, "phase3/simulation.js"));
const replayApi = require(path.join(ROOT, "phase3/replay.js"));
const { configuration, representatives } = configApi;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function moveRequest(simulation, overrides = {}) {
  const snapshot = simulation.snapshot();
  const defaultEntity = snapshot.entities.find((entity) => entity.ownerSeat === 1);
  return {
    protocolVersion: configuration.protocolVersion,
    configurationId: configuration.configurationId,
    kind: "MOVE",
    issuingPlayer: 1,
    targetTick: snapshot.tick + 1,
    entityIds: [defaultEntity.id],
    destination: { x: 50000, y: 50000 },
    ...overrides
  };
}

function assertNoOverlaps(entities) {
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

function twoSeatMap(blockers = []) {
  return {
    id: "phase3-test-map",
    world: { width: 800, height: 480 },
    layers: {
      navigation: { blockers },
      anchors: {
        playerSeats: [
          { id: "left-seat", seat: 1, x: 180, y: 240, radius: 32, facing: "right" },
          { id: "right-seat", seat: 2, x: 620, y: 240, radius: 32, facing: "left" }
        ],
        structures: [
          { id: "left-hq", category: "headquarters", seat: 1, faction: "astral-concord" },
          { id: "right-hq", category: "headquarters", seat: 2, faction: "gravebound-court" }
        ]
      }
    }
  };
}

test("Phase 3 exposes one frozen 20 Hz integer configuration and twelve opening entities", () => {
  assert.ok(Object.isFrozen(configuration));
  assert.equal(configuration.tickRate, 20);
  assert.equal(configuration.tickDurationMs, 50);
  assert.equal(configuration.positionScale, 100);
  assert.equal(configuration.maxCatchUpTicks, 4);
  assert.equal(configuration.openingEntityCount, 12);
  assert.equal(configuration.entityCap, 24);
  assert.equal(configuration.pendingCommandCap, 64);
  assert.equal(configuration.selectionCap, 12);
  assert.equal(configuration.separationPasses, 2);
  assert.equal(configuration.congestionTicks, 20);
  assert.equal(configuration.repathAttemptCap, 3);

  const snapshot = simulationApi.createSimulation({ seed: 0x1234abcd }).snapshot();
  assert.deepEqual(Object.keys(snapshot), [
    "schemaVersion", "protocolVersion", "configurationId", "mapId", "seed", "tick",
    "nextSequence", "entities", "pendingCommands"
  ]);
  assert.equal(snapshot.entities.length, 12);
  assert.equal(snapshot.tick, 0);
  assert.equal(snapshot.nextSequence, 1);
  assert.deepEqual(snapshot.entities.map((entity) => entity.id), [...snapshot.entities.map((entity) => entity.id)].sort());
  assert.deepEqual(
    snapshot.entities.reduce((counts, entity) => ({ ...counts, [entity.ownerSeat]: (counts[entity.ownerSeat] || 0) + 1 }), {}),
    { 1: 6, 2: 6 }
  );
  for (const entity of snapshot.entities) {
    const definition = representatives[entity.kind];
    assert.equal(entity.radius, definition.radius);
    assert.equal(entity.speedPerTick, definition.speedPerTick);
    assert.ok(Number.isSafeInteger(entity.x) && Number.isSafeInteger(entity.y));
    assert.equal(entity.order, "IDLE");
    assert.deepEqual(entity.route, []);
  }
  assertNoOverlaps(snapshot.entities);
});

test("MOVE validation is strict, bounded, owned, globally sequenced, and detached", () => {
  const simulation = simulationApi.createSimulation();
  const firstRequest = moveRequest(simulation);
  const first = simulation.submitMove(firstRequest);
  assert.equal(first.ok, true);
  assert.equal(first.command.sequence, 1);
  assert.equal(first.acceptedTick, 0);
  firstRequest.destination.x = 77777;
  firstRequest.entityIds[0] = "changed-after-acceptance";
  assert.notEqual(simulation.snapshot().pendingCommands[0].destination.x, 77777);
  assert.notEqual(simulation.snapshot().pendingCommands[0].entityIds[0], "changed-after-acceptance");

  const seatTwoId = simulation.snapshot().entities.find((entity) => entity.ownerSeat === 2).id;
  const second = simulation.submitMove(moveRequest(simulation, {
    issuingPlayer: 2,
    entityIds: [seatTwoId]
  }));
  assert.equal(second.ok, true);
  assert.equal(second.command.sequence, 2);

  const cases = [
    ["shape", { ...moveRequest(simulation), unexpected: true }],
    ["identity", { ...moveRequest(simulation), protocolVersion: 99 }],
    ["kind", { ...moveRequest(simulation), kind: "ATTACK" }],
    ["target-tick", { ...moveRequest(simulation), targetTick: simulation.tick }],
    ["duplicate-entity", { ...moveRequest(simulation), entityIds: [first.command.entityIds[0], first.command.entityIds[0]] }],
    ["foreign-entity", { ...moveRequest(simulation), entityIds: [seatTwoId] }],
    ["missing-entity", { ...moveRequest(simulation), entityIds: ["seat-1-missing-1"] }],
    ["destination", { ...moveRequest(simulation), destination: { x: 50000.5, y: 50000 } }],
    ["blocked-destination", { ...moveRequest(simulation), destination: { x: 10000, y: 10000 } }]
  ];
  for (const [code, request] of cases) assert.deepEqual(simulation.submitMove(request), { ok: false, code });

  const presequenced = { ...moveRequest(simulation), sequence: 7 };
  assert.deepEqual(simulation.acceptCommand(presequenced), { ok: false, code: "sequence" });
  assert.throws(() => simulation.advance(configuration.maxCatchUpTicks + 1), /advance count/);

  const exhaustedSnapshot = simulationApi.createSimulation().snapshot();
  exhaustedSnapshot.nextSequence = Number.MAX_SAFE_INTEGER;
  const exhausted = simulationApi.restoreSimulation(exhaustedSnapshot);
  assert.deepEqual(exhausted.submitMove(moveRequest(exhausted)), { ok: false, code: "sequence" });
});

test("the pending command queue accepts exactly its cap and does not allocate past it", () => {
  const simulation = simulationApi.createSimulation();
  for (let index = 0; index < configuration.pendingCommandCap; index += 1) {
    const receipt = simulation.submitMove(moveRequest(simulation));
    assert.equal(receipt.ok, true);
    assert.equal(receipt.command.sequence, index + 1);
  }
  assert.equal(simulation.snapshot().pendingCommands.length, configuration.pendingCommandCap);
  assert.deepEqual(simulation.submitMove(moveRequest(simulation)), { ok: false, code: "command-cap" });
});

test("deterministic footprint-aware A* routes around polygons and cannot cut a blocked corner", () => {
  const navigator = navigationApi.createNavigator(map, configuration);
  const start = { x: 25100, y: 37000 };
  const destination = { x: 120000, y: 45000 };
  const first = navigator.findRoute(start, destination, 1400);
  const second = navigator.findRoute(start, destination, 1400);
  assert.deepEqual(first, second);
  assert.equal(first.ok, true);
  assert.ok(first.visited <= configuration.navigationNodeCap);
  assert.ok(first.waypoints.length <= configuration.routeWaypointCap);
  let segmentStart = start;
  for (const waypoint of first.waypoints) {
    assert.equal(navigator.isSegmentClear(segmentStart, waypoint, 1400), true);
    segmentStart = waypoint;
  }
  assert.deepEqual(first.waypoints.at(-1), destination);

  const cornerMap = {
    id: "corner-test-map",
    world: { width: 96, height: 96 },
    layers: {
      navigation: {
        blockers: [
          { id: "east", polygon: [[32, 0], [64, 0], [64, 32], [32, 32]] },
          { id: "south", polygon: [[0, 32], [32, 32], [32, 64], [0, 64]] }
        ]
      }
    }
  };
  const cornerNavigator = navigationApi.createNavigator(cornerMap, configuration);
  const cornerRoute = cornerNavigator.findRoute({ x: 1600, y: 1600 }, { x: 4800, y: 4800 }, 0);
  assert.equal(cornerRoute.ok, false);
  assert.equal(cornerRoute.code, "unreachable");
});

test("formation slots are identifier-stable, unique, and spaced for the largest footprint", () => {
  const entities = [
    { id: "charlie", radius: 1400 },
    { id: "alpha", radius: 2400 },
    { id: "bravo", radius: 1600 },
    { id: "delta", radius: 1400 }
  ];
  const destination = { x: 80000, y: 60000 };
  const first = navigationApi.formationDestinations(entities, destination, configuration);
  const second = navigationApi.formationDestinations([...entities].reverse(), destination, configuration);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map((slot) => slot.entityId), ["alpha", "bravo", "charlie", "delta"]);
  assert.equal(new Set(first.map((slot) => `${slot.destination.x},${slot.destination.y}`)).size, entities.length);
  const expectedSpacing = 2 * 2400 + configuration.formationGapWorld * configuration.positionScale;
  assert.equal(Math.abs(first[1].destination.x - first[0].destination.x), expectedSpacing);
  assert.equal(Math.abs(first[2].destination.y - first[0].destination.y), expectedSpacing);
});

test("execution-time unreachable assignment is atomic and reports a bounded presentation event", () => {
  const dividedMap = twoSeatMap([
    { id: "complete-wall", polygon: [[390, 0], [410, 0], [410, 480], [390, 480]] }
  ]);
  const simulation = simulationApi.createSimulation({ map: dividedMap });
  const entity = simulation.snapshot().entities.find((candidate) => candidate.ownerSeat === 1);
  assert.equal(simulation.submitMove(moveRequest(simulation, {
    entityIds: [entity.id],
    destination: { x: 28000, y: 36000 }
  })).ok, true);
  assert.deepEqual(simulation.step().events, [
    { type: "command", sequence: 1, status: "applied", code: "ok" }
  ]);
  const preservedDestination = simulation.snapshot().entities.find((candidate) => candidate.id === entity.id).formationDestination;
  assert.equal(simulation.submitMove(moveRequest(simulation, {
    entityIds: [entity.id],
    targetTick: 2,
    destination: { x: 60000, y: 36000 }
  })).ok, true);
  const result = simulation.step();
  assert.deepEqual(result.events, [
    { type: "command", sequence: 2, status: "rejected", code: "unreachable" }
  ]);
  const after = simulation.snapshot().entities.find((candidate) => candidate.id === entity.id);
  assert.equal(after.order, "MOVE");
  assert.deepEqual(after.formationDestination, preservedDestination);
});

test("group movement remains deterministic, footprint-safe, completes, and emits lifecycle events", () => {
  function run() {
    const simulation = simulationApi.createSimulation({ seed: 42 });
    const entityIds = simulation.snapshot().entities
      .filter((entity) => entity.ownerSeat === 1)
      .map((entity) => entity.id);
    assert.equal(simulation.submitMove(moveRequest(simulation, {
      entityIds,
      destination: { x: 60000, y: 60000 }
    })).ok, true);
    const events = [];
    for (let tick = 0; tick < 400; tick += 1) {
      const result = simulation.step();
      events.push(...result.events);
      const snapshot = simulation.snapshot();
      assertNoOverlaps(snapshot.entities);
      for (const entity of snapshot.entities) {
        assert.ok(Number.isSafeInteger(entity.x) && Number.isSafeInteger(entity.y));
      }
    }
    return { snapshot: simulation.snapshot(), events };
  }
  const first = run();
  const second = run();
  assert.deepEqual(first, second);
  assert.equal(first.events[0].status, "applied");
  assert.equal(first.events.filter((event) => event.status === "completed").length, 6);
  assert.equal(first.snapshot.entities.filter((entity) => entity.ownerSeat === 1 && entity.order === "IDLE").length, 6);
});

test("stuck movement performs at most three repaths and stops with readable status", () => {
  const snapshot = simulationApi.createSimulation().snapshot();
  const moving = snapshot.entities.find((entity) => entity.id === "seat-1-starbow-1");
  const occupied = snapshot.entities.find((entity) => entity.id === "seat-1-astral-guardian-1");
  moving.order = "MOVE";
  moving.route = [{ x: occupied.x, y: occupied.y }];
  moving.routeIndex = 0;
  moving.formationDestination = { x: occupied.x, y: occupied.y };
  moving.repathCount = 0;
  moving.progress = { distance: Math.floor(Math.hypot(occupied.x - moving.x, occupied.y - moving.y)), stalledTicks: 0 };
  const simulation = simulationApi.restoreSimulation(snapshot);
  let stopped = null;
  for (let tick = 0; tick < 250 && !stopped; tick += 1) {
    const result = simulation.step();
    assertNoOverlaps(simulation.snapshot().entities);
    stopped = result.events.find((event) => event.entityId === moving.id && event.status === "stopped");
  }
  assert.deepEqual(stopped, {
    type: "entity",
    entityId: moving.id,
    status: "stopped",
    code: "congestion"
  });
  const after = simulation.snapshot().entities.find((entity) => entity.id === moving.id);
  assert.equal(after.order, "IDLE");
  assert.equal(after.repathCount, 0);
  assert.deepEqual(after.route, []);
});

test("snapshots are detached, strict, complete, bounded, and restore-and-continue converges", () => {
  const original = simulationApi.createSimulation({ seed: 99 });
  const entityId = "seat-1-starbow-1";
  original.submitMove(moveRequest(original, {
    entityIds: [entityId],
    destination: { x: 18000, y: 60000 }
  }));
  original.advance(4);
  original.advance(4);
  const checkpoint = original.snapshot();
  const restored = simulationApi.restoreSimulation(checkpoint);
  checkpoint.entities[0].x = 1;
  checkpoint.pendingCommands.length = 0;
  assert.notEqual(restored.snapshot().entities[0].x, 1);
  for (let index = 0; index < 40; index += 1) {
    original.step();
    restored.step();
    assert.deepEqual(restored.snapshot(), original.snapshot());
  }

  const unknown = clone(restored.snapshot());
  unknown.camera = { x: 0, y: 0 };
  assert.throws(() => simulationApi.validateSnapshot(unknown), /unknown or missing/);
  const nonFinite = clone(restored.snapshot());
  nonFinite.entities[0].x = Infinity;
  assert.throws(() => simulationApi.restoreSimulation(nonFinite), /position/);
  const overlapping = clone(simulationApi.createSimulation().snapshot());
  overlapping.entities[1].x = overlapping.entities[0].x;
  overlapping.entities[1].y = overlapping.entities[0].y;
  assert.throws(() => simulationApi.restoreSimulation(overlapping), /overlap/);
  const oversized = clone(simulationApi.createSimulation().snapshot());
  while (oversized.entities.length <= configuration.entityCap) {
    const entity = clone(oversized.entities.at(-1));
    entity.id = `synthetic-${oversized.entities.length}`;
    oversized.entities.push(entity);
  }
  oversized.entities.sort((first, second) => configApi.compareIdentifiers(first.id, second.id));
  assert.throws(() => simulationApi.restoreSimulation(oversized), /entity collection/);
});

test("every live snapshot remains restorable when separation runs beside blocker edges", () => {
  const simulation = simulationApi.createSimulation({ seed: 1 });
  const scheduled = new Map([
    [0, {
      issuingPlayer: 1,
      entityIds: ["seat-1-aegis-titan-1", "seat-1-astral-guardian-1", "seat-1-starbow-1"],
      destination: { x: 55900, y: 60400 }
    }],
    [25, {
      issuingPlayer: 2,
      entityIds: ["seat-2-gravebound-reaver-2", "seat-2-hollow-string-2", "seat-2-ossuary-colossus-2"],
      destination: { x: 32400, y: 45900 }
    }],
    [50, {
      issuingPlayer: 1,
      entityIds: ["seat-1-aegis-titan-1", "seat-1-astral-guardian-1", "seat-1-starbow-1"],
      destination: { x: 114100, y: 20400 }
    }]
  ]);
  for (let tick = 0; tick < 100; tick += 1) {
    const command = scheduled.get(simulation.tick);
    if (command) {
      assert.equal(simulation.submitMove(moveRequest(simulation, command)).ok, true);
    }
    simulation.step();
    const snapshot = simulation.snapshot();
    assert.deepEqual(simulationApi.validateSnapshot(snapshot), snapshot);
    assert.deepEqual(simulationApi.restoreSimulation(snapshot).snapshot(), snapshot);
  }
});

test("canonical replay reproduces periodic checksums and the final authoritative snapshot", () => {
  const live = simulationApi.createSimulation({ seed: 77 });
  const replay = replayApi.createReplay(live.snapshot());
  const first = live.submitMove(moveRequest(live, {
    entityIds: ["seat-1-starbow-1"],
    destination: { x: 18000, y: 60000 }
  }));
  replayApi.appendAccepted(replay, first);
  const liveChecksums = [{ tick: 0, checksum: replayApi.checksum(live.snapshot()) }];
  while (live.tick < 5) live.step();
  const second = live.submitMove(moveRequest(live, {
    issuingPlayer: 2,
    entityIds: ["seat-2-hollow-string-1"],
    targetTick: 6,
    destination: { x: 149000, y: 45000 }
  }));
  replayApi.appendAccepted(replay, second);
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
  assert.equal(replayApi.canonicalStringify({ value: -0 }), "{\"value\":0}");
  const changed = clone(live.snapshot());
  changed.entities[0].facing = changed.entities[0].facing === "right" ? "left" : "right";
  assert.notEqual(replayApi.checksum(changed), replayApi.checksum(live.snapshot()));
  assert.throws(() => replayApi.canonicalStringify({ value: NaN }), /finite/);
});

test("Phase 3 core modules expose the same browser namespaces without prototype compatibility globals", () => {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  for (const relativePath of [
    "phase2/map.js",
    "phase3/config.js",
    "phase3/navigation.js",
    "phase3/simulation.js",
    "phase3/replay.js"
  ]) vm.runInContext(read(relativePath), context, { filename: relativePath });
  assert.ok(context.AeonPhase2Map);
  assert.ok(context.AeonPhase3Config);
  assert.ok(context.AeonPhase3Navigation);
  assert.ok(context.AeonPhase3Simulation);
  assert.ok(context.AeonPhase3Replay);
  assert.equal(context.AeonPhase3Simulation.createSimulation().snapshot().entities.length, 12);
  assert.equal(context.AeonPhase3Unit, undefined);

  const sources = ["phase3/config.js", "phase3/navigation.js", "phase3/simulation.js", "phase3/replay.js"]
    .map(read)
    .join("\n");
  assert.doesNotMatch(sources, /Math\.random|Date\.now|performance\.now/);
  assert.doesNotMatch(sources, /limb|bone rig|ATTACK command|network|WebRTC/i);
});
