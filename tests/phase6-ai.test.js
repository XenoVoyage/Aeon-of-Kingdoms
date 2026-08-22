"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ai = require(path.join(ROOT, "phase6/ai.js"));
const phase6Config = require(path.join(ROOT, "phase6/config.js"));
const phase5Config = require(path.join(ROOT, "phase5/config.js"));
const map = require(path.join(ROOT, "phase5/map.js"));
const navigation = require(path.join(ROOT, "phase5/navigation.js"));
const simulationApi = require(path.join(ROOT, "phase5/simulation.js"));
const skirmishApi = require(path.join(ROOT, "phase6/skirmish.js"));

const { configuration, representatives, compareIdentifiers } = phase5Config;
const clone = (value) => JSON.parse(JSON.stringify(value));
const snapshot = () => simulationApi.createSimulation({ seed: 23 }).snapshot();
const ownEntities = (observation) => observation.entities.filter((value) => value.ownerSeat === 2);

function population(entities) {
  return entities.reduce((total, entity) => total + representatives[entity.kind].population, 0);
}

function setTick(value, tick) {
  value.tick = tick;
  return value;
}

function placeIdle(entity, x, y) {
  entity.x = x; entity.y = y; entity.idleRoot = { x, y };
  entity.order = "IDLE"; entity.targetId = null; entity.commandRoot = null;
  entity.engagementRoot = null; entity.defendAnchor = null;
  entity.route = []; entity.routeIndex = 0; entity.formationDestination = null;
  entity.savedRoute = []; entity.savedRouteIndex = 0; entity.savedDestination = null;
  entity.savedRepathCount = 0; entity.savedProgress = { distance: 0, stalledTicks: 0 };
  entity.repathCount = 0; entity.progress = { distance: 0, stalledTicks: 0 };
  entity.reservation = null; entity.reservationWait = null;
  entity.attackStartTick = null; entity.pendingAttackTick = null; entity.nextAttackStartTick = 0;
  entity.returning = false; entity.returnFailure = null;
}

function makeSharedOwner(value, seat) {
  for (const structure of value.structures) {
    if (structure.category === "headquarters") continue;
    structure.ownerSeat = seat;
    if (seat === 2) {
      structure.queue = [];
      structure.rally = null;
    }
  }
}

function assaultSnapshot() {
  const value = setTick(snapshot(), 800);
  makeSharedOwner(value, 2);
  value.entities = value.entities.filter((entity) => entity.ownerSeat === 2);
  value.players[0].populationUsed = 0;
  const template = clone(value.entities.find((entity) => entity.kind === "gravebound-reaver"));
  for (let index = 0; index < 2; index += 1) {
    const reinforcement = clone(template);
    reinforcement.id = `reinforcement-${index + 1}`;
    reinforcement.x = 120000 + index * 4000;
    reinforcement.y = 70000;
    reinforcement.idleRoot = { x: reinforcement.x, y: reinforcement.y };
    value.entities.push(reinforcement);
  }
  value.players[1].populationUsed += 2;
  return value;
}

function fullyOwnedThreatSnapshot() {
  const value = setTick(snapshot(), 800);
  makeSharedOwner(value, 2);
  const intruder = value.entities.find((entity) => entity.id === "seat-1-astral-guardian-1");
  value.entities = value.entities.filter((entity) => entity.ownerSeat === 2 || entity.id === intruder.id);
  value.players[0].populationUsed = 1;
  placeIdle(intruder, 37900, 45000);
  intruder.health = 1;
  const slots = map.phase5.structures.find((structure) => structure.id === "west-production-outpost-anchor").spawnSlots;
  value.entities.filter((entity) => entity.ownerSeat === 2).forEach((entity, index) => {
    placeIdle(entity, slots[index].x * configuration.positionScale, slots[index].y * configuration.positionScale);
    entity.nextAttackStartTick = 800;
  });
  const reinforcement = clone(value.entities.find((entity) => entity.id === "seat-2-ossuary-colossus-1"));
  reinforcement.id = "reinforcement-colossus";
  placeIdle(reinforcement, 135700, 35800);
  reinforcement.nextAttackStartTick = 800;
  value.entities.push(reinforcement);
  value.entities.sort((first, second) => compareIdentifiers(first.id, second.id));
  value.players[1].populationUsed += representatives[reinforcement.kind].population;
  return value;
}

test("Phase 6 AI exposes a bounded deeply frozen initial state and strict validator", () => {
  const state = ai.createInitialState();
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.forces), true);
  assert.equal(Object.isFrozen(state.forces[0]), true);
  assert.deepEqual(state, {
    schemaVersion: 1,
    configurationId: "phase6-strategic-ai-v1",
    seat: 2,
    nextDecisionTick: 0,
    urgentEligibleTick: 0,
    planNumber: 0,
    currentNeed: null,
    nextAssaultEligibleTick: 800,
    rosterSignature: "",
    forces: ["reserve", "front-a", "front-b"].map((name) => ({
      name, entityIds: [], need: null, objectiveId: null, objectiveRoot: null,
      commitmentUntilTick: 0, committedStrength: 0, stage: null
    })),
    threats: [],
    lastResult: null
  });
  assert.deepEqual(ai.validateState(state), clone(state));
  assert.throws(() => ai.validateState({ ...clone(state), extra: true }), /identity or bounds/);
  const duplicate = clone(state);
  duplicate.forces[0].entityIds = ["same-id"];
  duplicate.forces[1].entityIds = ["same-id"];
  assert.throws(() => ai.validateState(duplicate), /membership/);
  const tooMany = clone(state);
  tooMany.threats = Array.from({ length: phase6Config.limits.rememberedThreatCap + 1 }, (_, tick) => ({
    tick, kind: "damage", sourceId: null, targetId: "gravebound-headquarters-anchor",
    structureId: null, status: "damage", ownerSeat: null
  }));
  assert.throws(() => ai.validateState(tooMany), /identity or bounds/);
  const recorded = ai.recordResult(state, { tick: 0, code: "accepted", objectiveId: null });
  assert.equal(Object.isFrozen(recorded), true);
  assert.deepEqual(recorded.lastResult, { tick: 0, code: "accepted", objectiveId: null });
  assert.equal(state.lastResult, null);
  assert.throws(() => ai.recordResult(state, {
    tick: 0, code: "accepted", objectiveId: null, private: true
  }), /bounded result/);
});

test("observation is detached, ASCII ordered, exact-field, and redacts every hidden human field", () => {
  const source = snapshot();
  const hidden = clone(source);
  hidden.players[0].resources = 987654;
  hidden.players[0].populationReserved = 17;
  hidden.pendingCommands = [{ private: "future" }];
  const human = hidden.entities.find((entity) => entity.ownerSeat === 1);
  human.order = "ATTACK_ENTITY";
  human.targetId = "private-target";
  human.route = [{ x: 1, y: 2 }];
  human.formationDestination = { x: 3, y: 4 };
  human.attackStartTick = 99;
  human.pendingAttackTick = 100;
  human.nextAttackStartTick = 101;
  human.reservation = { targetId: "private-target", slotIndex: 3 };
  const humanHeadquarters = hidden.structures.find((structure) => structure.ownerSeat === 1);
  humanHeadquarters.queue = [{ private: "queue" }];
  humanHeadquarters.rally = { x: 1, y: 2 };

  const first = ai.buildObservation(source);
  const second = ai.buildObservation(hidden);
  assert.deepEqual(second, first);
  assert.equal(Object.isFrozen(first), true);
  assert.deepEqual(first.entities.map((entity) => entity.id),
    [...first.entities.map((entity) => entity.id)].sort(compareIdentifiers));
  for (const entity of first.entities.filter((value) => value.ownerSeat === 1)) {
    assert.equal(entity.order, null);
    assert.equal(entity.targetId, null);
    assert.deepEqual(Object.keys(entity).sort(), [
      "health", "id", "kind", "maxHealth", "order", "orderAnchorId", "orderDestination",
      "ownerSeat", "radius", "role", "targetId", "x", "y"
    ]);
  }
  assert.equal(first.structures.find((value) => value.ownerSeat === 1).queue, null);
  const copy = ai.validateObservation(first);
  copy.entities[0].x += 1;
  assert.notEqual(copy.entities[0].x, first.entities[0].x);
  const extra = clone(first);
  extra.pendingCommands = [];
  assert.throws(() => ai.validateObservation(extra), /identity or bounds/);
});

test("observation rejects oversized owned queues and custom spawn geometry before mapping them", () => {
  const battle = snapshot();
  battle.structures.find((structure) => structure.ownerSeat === 2).queue = Array.from({
    length: configuration.productionQueueCap + 1
  }, () => ({}));
  assert.throws(() => ai.buildObservation(battle), /queue bound/);
  const customMap = clone(map);
  customMap.phase5.structures[0].spawnSlots = Array.from({ length: 7 }, () => ({ x: 1, y: 1 }));
  assert.throws(() => ai.buildObservation(snapshot(), [], { map: customMap }), /spawn geometry/);
});

test("public event filtering caps work, hides human production, and preserves source-less aggregate damage", () => {
  const battle = snapshot();
  const publicStructures = ai.buildObservation(battle).structures;
  const events = ai.filterEvents([
    { type: "production", status: "completed", structureId: "astral-headquarters-anchor", queueItemId: "secret" },
    { type: "production", status: "completed", structureId: "gravebound-headquarters-anchor", queueItemId: "queue-1", entityId: "entity-1" },
    { type: "combat", status: "damage", targetId: "gravebound-headquarters-anchor", damage: 28, health: 1772, maxHealth: 1800 },
    { type: "defeat", status: "defeated", entityId: "seat-2-gravebound-reaver-1", ownerSeat: 2, tick: 4 },
    { type: "combat", status: "attack-started", attackerId: "hidden", targetId: "hidden" }
  ], 4, publicStructures);
  assert.deepEqual(events.map((event) => event.kind), ["damage", "defeat", "production"]);
  assert.equal(events.find((event) => event.kind === "damage").sourceId, null);
  assert.equal(events.some((event) => event.structureId === "astral-headquarters-anchor"), false);
  assert.equal(events.some((event) => Object.hasOwn(event, "queueItemId")), false);
  assert.throws(() => ai.filterEvents(
    Array.from({ length: phase6Config.limits.observedEventCap + 1 }, () => ({})), 0, publicStructures
  ), /exceeds its bound/);
});

test("strength is the exact health, cycle damage, and range formula with safe bounded sums", () => {
  const observation = ai.buildObservation(snapshot());
  const byRole = Object.fromEntries(observation.entities.filter((value) => value.ownerSeat === 2)
    .map((entity) => [entity.role, entity]));
  assert.equal(ai.entityStrength(byRole.melee), 392);
  assert.equal(ai.entityStrength(byRole.ranged), 471);
  assert.equal(ai.entityStrength(byRole.signature), 736);
  assert.equal(ai.groupStrength([byRole.melee, byRole.ranged, byRole.signature]), 1599);
  assert.equal(ai.entityStrength({ ...byRole.melee, health: 1 }), 153);
  assert.throws(() => ai.groupStrength(Array.from({ length: configuration.combatEntityCap + 1 }, () => byRole.melee)), /bound/);
});

test("threat memory uses exact lifetime, newest-first ties, deduplication, and optional roster repair", () => {
  const battle = setTick(snapshot(), 20);
  const observation = ai.buildObservation(battle);
  const events = [
    { tick: 20, kind: "defeat", sourceId: "b", targetId: "b", structureId: null, status: "defeated", ownerSeat: 2 },
    { tick: 20, kind: "damage", sourceId: null, targetId: "gravebound-headquarters-anchor", structureId: null, status: "damage", ownerSeat: null },
    { tick: 19, kind: "capture", sourceId: null, targetId: "east-production-outpost-anchor", structureId: "east-production-outpost-anchor", status: "captured", ownerSeat: 1 }
  ];
  const folded = ai.foldEvents(ai.createInitialState(), events, 20, observation);
  assert.deepEqual(folded.threats.map((value) => [value.tick, value.kind]), [
    [20, "damage"], [20, "defeat"], [19, "capture"]
  ]);
  assert.equal(folded.rosterSignature.length > 0, true);
  assert.equal(new Set(folded.forces.flatMap((force) => force.entityIds)).size, 6);
  assert.equal(ai.foldEvents(folded, events, 20).threats.length, 3);
  assert.equal(ai.foldEvents(folded, [], 139).threats.length, 2);
  assert.equal(ai.foldEvents(folded, [], 140).threats.length, 0);
});

test("initial planning is pure, permutation-stable, bounded, legal, and ordered tactical-production-rally", () => {
  const simulation = simulationApi.createSimulation({ seed: 23 });
  const battle = simulation.snapshot();
  const permuted = clone(battle);
  permuted.entities.reverse();
  permuted.structures.reverse();
  permuted.players.reverse();
  const observation = ai.buildObservation(battle);
  const permutedObservation = ai.buildObservation(permuted);
  assert.deepEqual(permutedObservation, observation);
  const initial = ai.createInitialState();
  const beforeObservation = JSON.stringify(observation);
  const beforeState = JSON.stringify(initial);
  const first = ai.plan(observation, initial);
  const second = ai.plan(permutedObservation, initial);
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(observation), beforeObservation);
  assert.equal(JSON.stringify(initial), beforeState);
  assert.deepEqual(first.intents.map((intent) => intent.kind), [
    "MOVE", "MOVE", "QUEUE_PRODUCTION", "SET_RALLY"
  ]);
  assert.ok(first.diagnostics.candidateCount <= phase6Config.limits.objectiveCandidateCap);
  assert.ok(first.diagnostics.routeProbes <= phase6Config.limits.routeProbeCap);
  assert.ok(first.intents.length <= phase6Config.limits.totalRequestCap);
  assert.equal(first.intents.filter((intent) => ["MOVE", "ATTACK_ENTITY", "ATTACK_MOVE", "STOP", "DEFEND"].includes(intent.kind)).length <= 2, true);
  const beforeBattle = simulation.snapshot();
  for (const intent of first.intents) assert.equal(simulation.submitCommand(clone(intent)).ok, true, intent.kind);
  assert.equal(beforeBattle.tick, simulation.tick);
  assert.deepEqual(beforeBattle.entities, simulation.snapshot().entities);
  assert.equal(simulation.snapshot().pendingCommands.length, first.intents.length);
});

test("real navigator probes and every emitted request remain inside their inherited and Phase 6 caps", () => {
  let probes = 0;
  const countedNavigation = {
    ...navigation,
    createNavigator(...argumentsList) {
      const real = navigation.createNavigator(...argumentsList);
      return Object.freeze({
        ...real,
        findRoute(...routeArguments) {
          probes += 1;
          return real.findRoute(...routeArguments);
        }
      });
    }
  };
  const result = ai.plan(ai.buildObservation(snapshot()), ai.createInitialState(), {
    map, navigationApi: countedNavigation
  });
  assert.equal(probes, result.diagnostics.routeProbes);
  assert.ok(probes <= phase6Config.limits.routeProbeCap);
  for (const intent of result.intents.filter((value) => value.entityIds)) {
    assert.ok(intent.entityIds.length <= configuration.selectionCap);
    assert.deepEqual(intent.entityIds, [...intent.entityIds].sort(compareIdentifiers));
  }
});

test("normal cadence and remembered urgent damage use exact 40-tick and 10-tick clocks", () => {
  const opening = snapshot();
  const first = ai.plan(ai.buildObservation(opening), ai.createInitialState());
  assert.deepEqual([first.state.nextDecisionTick, first.state.urgentEligibleTick], [40, 10]);
  const atNine = setTick(clone(opening), 9);
  const damage = [{
    type: "combat", status: "damage", targetId: "gravebound-headquarters-anchor",
    damage: 1, health: 1799, maxHealth: 1800
  }];
  const withheld = ai.plan(ai.buildObservation(atNine, damage), first.state);
  assert.equal(withheld.diagnostics.decided, false);
  assert.deepEqual(withheld.intents, []);
  assert.deepEqual(withheld.state.forces, first.state.forces);
  const atTen = setTick(clone(opening), 10);
  const urgent = ai.plan(ai.buildObservation(atTen), withheld.state);
  assert.equal(urgent.diagnostics.decided, true);
  assert.equal(urgent.diagnostics.urgent, true);
  assert.deepEqual([urgent.state.nextDecisionTick, urgent.state.urgentEligibleTick], [50, 20]);
  assert.ok(urgent.intents.some((intent) => intent.kind === "DEFEND"
    && intent.anchor.entityId === "gravebound-headquarters-anchor"));
});

test("reserve is retained while two disjoint fields select distinct reachable fronts", () => {
  const observation = ai.buildObservation(snapshot());
  const result = ai.plan(observation, ai.createInitialState());
  const [reserve, frontA, frontB] = result.state.forces;
  const all = result.state.forces.flatMap((force) => force.entityIds);
  assert.equal(new Set(all).size, all.length);
  assert.ok(reserve.entityIds.length > 0);
  assert.ok(frontA.entityIds.length > 0);
  assert.ok(frontB.entityIds.length > 0);
  assert.ok(population(reserve.entityIds.map((id) => observation.entities.find((entity) => entity.id === id)))
    >= phase6Config.limits.reservePopulationMinimum);
  assert.notEqual(frontA.objectiveId, frontB.objectiveId);
  const tacticalIds = new Set(result.intents.filter((intent) => intent.entityIds).flatMap((intent) => intent.entityIds));
  assert.equal(reserve.entityIds.some((id) => tacticalIds.has(id)), false);
  assert.equal(frontA.commitmentUntilTick, phase6Config.timings.minimumCommitmentTicks);
  assert.equal(frontB.commitmentUntilTick, phase6Config.timings.minimumCommitmentTicks);
});

test("headquarters damage and a contested owned outpost produce legal anchored defense", () => {
  const headquartersBattle = snapshot();
  const damage = [{
    type: "combat", status: "damage", targetId: "gravebound-headquarters-anchor",
    damage: 1, health: 1799, maxHealth: 1800
  }];
  const defense = ai.plan(ai.buildObservation(headquartersBattle, damage), ai.createInitialState());
  const reserve = defense.state.forces[0];
  assert.ok(defense.intents.some((intent) => intent.kind === "DEFEND"
    && intent.anchor.entityId === "gravebound-headquarters-anchor"
    && intent.entityIds.every((id) => reserve.entityIds.includes(id))));

  const outpostBattle = snapshot();
  const outpost = outpostBattle.structures.find((value) => value.id === "east-production-outpost-anchor");
  outpost.ownerSeat = 2;
  outpost.queue = [];
  outpost.rally = null;
  outpost.capture = { challengerSeat: 1, progressTicks: 5 };
  const reinforcement = ai.plan(ai.buildObservation(outpostBattle), ai.createInitialState());
  assert.ok(reinforcement.intents.some((intent) => intent.kind === "DEFEND"
    && intent.anchor.entityId === outpost.id));
});

test("an urgent committed defense is not reissued every 10 ticks and combat timing progresses", () => {
  const battle = snapshot();
  const intruderId = "seat-1-astral-guardian-1";
  placeIdle(battle.entities.find((entity) => entity.id === intruderId), 154200, 27500);
  const simulation = simulationApi.restoreSimulation(battle);
  let state = ai.createInitialState();
  let previousEvents = [];
  let initialDefense = 0;
  let tickTenDefense = -1;
  let attackStarts = 0;
  let damageEvents = 0;
  for (let index = 0; index < 160; index += 1) {
    const observation = ai.buildObservation(simulation.snapshot(), previousEvents);
    const planned = ai.plan(observation, state);
    state = planned.state;
    const defenseCount = planned.intents.filter((intent) => intent.kind === "DEFEND").length;
    if (simulation.tick === 0) initialDefense = defenseCount;
    if (simulation.tick === 10) tickTenDefense = defenseCount;
    for (const intent of planned.intents) assert.equal(simulation.submitCommand(intent).ok, true);
    const result = simulation.step();
    previousEvents = result.events;
    attackStarts += result.events.filter((event) => event.status === "attack-started").length;
    damageEvents += result.events.filter((event) => event.status === "damage").length;
    if (!simulation.snapshot().entities.some((entity) => entity.id === intruderId)) break;
  }
  assert.equal(initialDefense, 2);
  assert.equal(tickTenDefense, 0, "the same committed defenders must keep their persistent order");
  assert.ok(attackStarts > 0);
  assert.ok(damageEvents > 0);
  assert.equal(simulation.snapshot().entities.some((entity) => entity.id === intruderId), false);
});

test("production reacts to visible melee-heavy composition without reading hidden economy", () => {
  const battle = snapshot();
  const template = battle.entities.find((entity) => entity.id === "seat-1-astral-guardian-1");
  for (let index = 0; index < 2; index += 1) {
    const extra = clone(template);
    extra.id = `human-melee-extra-${index + 1}`;
    battle.entities.push(extra);
  }
  battle.players[0].populationUsed += 2;
  const result = ai.plan(ai.buildObservation(battle), ai.createInitialState());
  const production = result.intents.find((intent) => intent.kind === "QUEUE_PRODUCTION");
  assert.equal(production.entityKind, "hollow-string");
  assert.equal(production.issuingPlayer, 2);
  assert.equal(production.targetTick, 1);
});

test("hostile shared structures are approached and captured without illegal focus fire", () => {
  const battle = snapshot();
  makeSharedOwner(battle, 1);
  const result = ai.plan(ai.buildObservation(battle), ai.createInitialState());
  const tactical = result.intents.filter((intent) => intent.entityIds);
  assert.ok(tactical.some((intent) => intent.kind === "ATTACK_MOVE"));
  assert.equal(tactical.some((intent) => intent.kind === "ATTACK_ENTITY"
    && battle.structures.some((structure) => structure.category !== "headquarters"
      && structure.id === intent.targetId)), false);
  assert.ok(result.state.forces.some((force) => force.need === "raid" && force.stage === "approach"));
});

test("timed headquarters assault retains reserve, then losing fields retreat and start exact cooldown", () => {
  const battle = assaultSnapshot();
  const assault = ai.plan(ai.buildObservation(battle), ai.createInitialState());
  assert.equal(assault.state.currentNeed, "assault");
  assert.equal(assault.intents.filter((intent) => intent.kind === "ATTACK_ENTITY"
    && intent.targetId === "astral-headquarters-anchor").length, 2);
  assert.ok(assault.state.forces[0].entityIds.length > 0);
  assert.equal(assault.state.forces[0].need, null);

  const losing = clone(battle);
  losing.tick = 840;
  const humanOpening = snapshot().entities.filter((entity) => entity.ownerSeat === 1);
  for (const entity of humanOpening) {
    entity.x = 30000;
    entity.y = 27500;
    entity.idleRoot = { x: entity.x, y: entity.y };
    losing.entities.push(entity);
  }
  losing.players[0].populationUsed = 10;
  const committed = new Set(assault.state.forces.slice(1).flatMap((force) => force.entityIds));
  for (const entity of losing.entities) if (committed.has(entity.id)) entity.health = 1;
  const retreat = ai.plan(ai.buildObservation(losing), assault.state);
  assert.equal(retreat.state.currentNeed, "recover");
  assert.ok(retreat.intents.some((intent) => intent.kind === "DEFEND"));
  assert.equal(retreat.state.nextAssaultEligibleTick, 1240);
});

test("defeat/spawn roster repair occurs even between decisions without issuing a command", () => {
  const opening = snapshot();
  const first = ai.plan(ai.buildObservation(opening), ai.createInitialState());
  const changed = setTick(clone(opening), 1);
  const removedId = first.state.forces[1].entityIds[0];
  const removed = changed.entities.find((entity) => entity.id === removedId);
  changed.entities = changed.entities.filter((entity) => entity.id !== removedId);
  changed.players[1].populationUsed -= representatives[removed.kind].population;
  const repaired = ai.plan(ai.buildObservation(changed), first.state);
  assert.equal(repaired.diagnostics.decided, false);
  assert.deepEqual(repaired.intents, []);
  assert.equal(repaired.state.forces.flatMap((force) => force.entityIds).includes(removedId), false);
  assert.doesNotThrow(() => ai.validateState(repaired.state, ai.buildObservation(changed)));
});

test("one spawn is incrementally assigned without repartitioning existing forces or objectives", () => {
  const opening = snapshot();
  const first = ai.plan(ai.buildObservation(opening), ai.createInitialState());
  const beforeSlot = new Map(first.state.forces.flatMap((force) => force.entityIds.map((id) => [id, force.name])));
  const changed = setTick(clone(opening), 1);
  const reinforcement = clone(changed.entities.find((entity) => entity.id === "seat-2-gravebound-reaver-1"));
  reinforcement.id = "entity-00000001";
  changed.entities.push(reinforcement);
  changed.players[1].populationUsed += representatives[reinforcement.kind].population;
  const repaired = ai.plan(ai.buildObservation(changed), first.state);
  assert.equal(repaired.diagnostics.decided, false);
  for (const force of repaired.state.forces) for (const id of force.entityIds) {
    if (id !== reinforcement.id) assert.equal(force.name, beforeSlot.get(id));
  }
  for (const prior of first.state.forces) {
    const current = repaired.state.forces.find((force) => force.name === prior.name);
    assert.deepEqual([current.need, current.objectiveId, current.objectiveRoot],
      [prior.need, prior.objectiveId, prior.objectiveRoot]);
  }
  assert.equal(repaired.state.forces.flatMap((force) => force.entityIds)
    .filter((id) => id === reinforcement.id).length, 1);
});

test("a decision clears stale unselected objectives as soon as their trigger becomes invalid", () => {
  const opening = snapshot();
  const first = ai.plan(ai.buildObservation(opening), ai.createInitialState());
  assert.ok(first.state.forces.some((force) => force.need === "capture"));
  const resolved = setTick(clone(opening), 40);
  makeSharedOwner(resolved, 2);
  resolved.entities = resolved.entities.filter((entity) => entity.ownerSeat === 2);
  resolved.players[0].populationUsed = 0;
  const next = ai.plan(ai.buildObservation(resolved), first.state);
  assert.equal(next.state.forces.some((force) => force.need === "capture"), false);
  assert.equal(next.state.forces.some((force) => force.objectiveId
    && resolved.structures.find((structure) => structure.id === force.objectiveId)?.ownerSeat === 2), false);
});

test("one threatened-site field leaves the other on pressure and the real battle reaches headquarters damage", () => {
  const simulation = simulationApi.restoreSimulation(fullyOwnedThreatSnapshot());
  let state = ai.createInitialState();
  let previousEvents = [];
  let initialPlan = null;
  let assaultAccepted = false;
  for (let index = 0; index < 1200; index += 1) {
    const planned = ai.plan(ai.buildObservation(simulation.snapshot(), previousEvents), state);
    state = planned.state;
    if (simulation.tick === 800) initialPlan = clone(planned);
    for (const intent of planned.intents) {
      const receipt = simulation.submitCommand(intent);
      assert.equal(receipt.ok, true, intent.kind);
      if (intent.kind === "ATTACK_ENTITY" && intent.targetId === "astral-headquarters-anchor") {
        assaultAccepted = true;
      }
    }
    const result = simulation.step();
    previousEvents = result.events;
    if (simulation.snapshot().structures.find((structure) => structure.id === "astral-headquarters-anchor").health < 1800) break;
  }
  assert.equal(initialPlan.intents.filter((intent) => intent.kind === "DEFEND"
    && intent.anchor.entityId === "west-production-outpost-anchor").length, 1);
  assert.equal(initialPlan.intents.filter((intent) => intent.kind === "ATTACK_MOVE").length, 1);
  assert.deepEqual(new Set(initialPlan.state.forces.map((force) => force.need)), new Set([null, "reinforce", "pressure"]));
  assert.equal(simulation.snapshot().entities.some((entity) => entity.id === "seat-1-astral-guardian-1"), false);
  assert.equal(assaultAccepted, true);
  assert.ok(simulation.snapshot().structures.find((structure) => structure.id === "astral-headquarters-anchor").health < 1800);
});

test("the actual passive local skirmish defeats the human headquarters before the evidence ceiling", {
  timeout: 300000
}, () => {
  const session = skirmishApi.createSkirmish({ seed: 0x4a0e2026 });
  const restoreTicks = new Map([
    [50, "production"],
    [800, "defense"],
    [960, "regroup"],
    [3400, "pre-assault"]
  ]);
  const restored = [];
  while (session.tick < phase6Config.limits.evidenceMatchTickCap) {
    const result = session.step();
    for (const scenario of restored) {
      if (scenario.complete) continue;
      scenario.session.step();
      if (session.tick === scenario.untilTick) {
        assert.equal(scenario.session.compositeChecksum(), session.compositeChecksum(),
          `${scenario.name} restore diverged at tick ${session.tick}`);
        assert.deepEqual(scenario.session.battleSnapshot(), session.battleSnapshot());
        assert.deepEqual(scenario.session.exportReplay(), session.exportReplay());
        scenario.complete = true;
      }
    }
    const scenarioName = restoreTicks.get(session.tick);
    if (scenarioName) {
      const checkpoint = session.checkpoint();
      const replay = session.exportReplay();
      if (scenarioName === "production") {
        assert.ok(checkpoint.battle.structures.some((structure) => structure.queue?.length > 0));
      } else if (scenarioName === "defense") {
        assert.equal(checkpoint.aiState.currentNeed, "reinforce");
      } else if (scenarioName === "regroup") {
        assert.equal(checkpoint.aiState.currentNeed, "recover");
      } else {
        assert.equal(checkpoint.aiState.currentNeed, "pressure");
        assert.equal(checkpoint.battle.structures
          .find((structure) => structure.id === "astral-headquarters-anchor").health, 1800);
      }
      const restoredSession = skirmishApi.restoreSkirmish(checkpoint, { replay });
      assert.equal(restoredSession.compositeChecksum(), session.compositeChecksum());
      restored.push({
        name: scenarioName,
        session: restoredSession,
        untilTick: session.tick + (scenarioName === "pre-assault" ? 80 : 45),
        complete: false
      });
    }
    if (result.events.some((event) => event.type === "match" && event.status === "completed")) break;
  }
  const battle = session.battleSnapshot();
  const replay = session.exportReplay();
  assert.deepEqual(restored.map((scenario) => [scenario.name, scenario.complete]), [
    ["production", true],
    ["defense", true],
    ["regroup", true],
    ["pre-assault", true]
  ]);
  const preAssaultReplay = restored.find((scenario) => scenario.name === "pre-assault")
    .session.exportReplay();
  assert.ok(preAssaultReplay.commands.some((entry) => entry.acceptedTick >= 3400
    && entry.command.kind === "ATTACK_ENTITY"
    && entry.command.targetId === "astral-headquarters-anchor"));
  assert.deepEqual(battle.match, { status: "complete", winnerSeat: 2, completedTick: 3715 });
  assert.ok(battle.tick <= phase6Config.limits.evidenceMatchTickCap);
  assert.ok(replay.commands.some((entry) => entry.command.kind === "ATTACK_MOVE"));
  assert.ok(replay.commands.some((entry) => entry.command.kind === "ATTACK_ENTITY"
    && entry.command.targetId === "astral-headquarters-anchor"));
});
