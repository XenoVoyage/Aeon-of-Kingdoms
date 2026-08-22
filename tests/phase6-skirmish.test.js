"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const configApi = require(path.join(ROOT, "phase6/config.js"));
const simulationApi = require(path.join(ROOT, "phase5/simulation.js"));
const replayApi = require(path.join(ROOT, "phase5/replay.js"));
const skirmishApi = require(path.join(ROOT, "phase6/skirmish.js"));
const { configuration } = configApi.battleConfig;

const clone = (value) => JSON.parse(JSON.stringify(value));

function humanStop(session, overrides = {}) {
  const snapshot = session.battleSnapshot();
  const entityId = snapshot.entities.find((entity) => entity.ownerSeat === 1).id;
  return {
    protocolVersion: configuration.protocolVersion,
    configurationId: configuration.configurationId,
    kind: "STOP",
    issuingPlayer: 1,
    targetTick: snapshot.tick + 1,
    entityIds: [entityId],
    ...overrides
  };
}

test("one live step preserves human-before-computer sequence and the exact bounded request order", () => {
  const session = skirmishApi.createSkirmish({ seed: 0x2468ace0 });
  assert.equal(Object.isFrozen(session), true);
  assert.equal(session.tick, 0);
  const human = session.submitHumanCommand(humanStop(session));
  assert.equal(human.ok, true);
  assert.equal(human.command.sequence, 1);

  const result = session.step();
  assert.equal(result.tick, 1);
  assert.equal(session.tick, 1);
  const replay = session.exportReplay();
  assert.ok(replay.commands.length >= 2 && replay.commands.length <= 1 + configApi.limits.totalRequestCap);
  assert.equal(replay.commands[0].command.issuingPlayer, 1);
  assert.equal(replay.commands[0].command.sequence, 1);
  const computer = replay.commands.slice(1);
  computer.forEach((entry, index) => {
    assert.equal(entry.command.issuingPlayer, 2);
    assert.equal(entry.command.targetTick, 1);
    assert.equal(entry.command.sequence, index + 2);
  });
  const classes = computer.map((entry) => {
    if (["MOVE", "ATTACK_ENTITY", "ATTACK_MOVE", "STOP", "DEFEND"].includes(entry.command.kind)) return "tactical";
    if (["QUEUE_PRODUCTION", "CANCEL_PRODUCTION"].includes(entry.command.kind)) return "production";
    return "rally";
  });
  assert.deepEqual(classes, [...classes].sort((first, second) => (
    configApi.requestOrder.indexOf(first) - configApi.requestOrder.indexOf(second)
  )));
  assert.ok(classes.filter((value) => value === "tactical").length <= configApi.limits.tacticalRequestCap);
  assert.ok(classes.filter((value) => value === "production").length <= configApi.limits.productionRequestCap);
  assert.ok(classes.filter((value) => value === "rally").length <= configApi.limits.rallyRequestCap);
  assert.equal(session.checkpoint().aiState.lastResult.code, "accepted");
});

test("seat ownership, suspension, and teardown all fail closed without advancing either state machine", () => {
  const session = skirmishApi.createSkirmish({ seed: 12 });
  const openingChecksum = session.compositeChecksum();
  const foreign = session.submitHumanCommand(humanStop(session, { issuingPlayer: 2 }));
  assert.deepEqual(foreign, { ok: false, code: "human-seat" });
  assert.deepEqual(session.submitHumanCommand({ ...humanStop(session), extra: true }),
    { ok: false, code: "replay-invalid" });
  assert.equal(session.compositeChecksum(), openingChecksum);

  assert.equal(session.setSuspended(true), true);
  assert.deepEqual(session.submitHumanCommand(humanStop(session)), { ok: false, code: "inactive" });
  assert.deepEqual(session.step(), { tick: 0, events: [] });
  assert.equal(session.compositeChecksum(), openingChecksum);
  assert.equal(session.exportReplay().commands.length, 0);

  assert.equal(session.setSuspended(false), false);
  session.step();
  assert.equal(session.tick, 1);
  const beforeDestroy = session.compositeChecksum();
  session.destroy();
  assert.deepEqual(session.step(), { tick: 1, events: [] });
  assert.deepEqual(session.submitHumanCommand(humanStop(session)), { ok: false, code: "inactive" });
  assert.equal(session.compositeChecksum(), beforeDestroy);
});

test("pending capacity is checked before AI mutation and records one bounded batch result", () => {
  const session = skirmishApi.createSkirmish({ seed: 13 });
  for (let index = 0; index < configuration.pendingCommandCap; index += 1) {
    const receipt = session.submitHumanCommand(humanStop(session));
    assert.equal(receipt.ok, true);
    assert.equal(receipt.command.sequence, index + 1);
  }
  session.step();
  const replay = session.exportReplay();
  assert.equal(replay.commands.length, configuration.pendingCommandCap);
  assert.equal(replay.commands.every((entry) => entry.command.issuingPlayer === 1), true);
  assert.deepEqual(session.checkpoint().aiState.lastResult, {
    tick: 0,
    code: "command-cap",
    objectiveId: "east-production-outpost-anchor"
  });
});

test("the exact checkpoint and separately validated replay restore future battle and AI intent", () => {
  const original = skirmishApi.createSkirmish({ seed: 77 });
  original.submitHumanCommand(humanStop(original));
  for (let tick = 0; tick < 45; tick += 1) original.step();

  const checkpoint = original.checkpoint();
  const replay = original.exportReplay();
  assert.deepEqual(Object.keys(checkpoint), ["schemaVersion", "configurationId", "battle", "aiState"]);
  assert.equal(Object.isFrozen(checkpoint), true);
  assert.equal(checkpoint.schemaVersion, 1);
  assert.equal(checkpoint.configurationId, "phase6-strategic-ai-v1");
  assert.equal(checkpoint.battle.tick, 45);
  assert.deepEqual(checkpoint.aiState.forces.map((force) => force.name), ["reserve", "front-a", "front-b"]);
  assert.match(original.compositeChecksum(), /^fnv1a64:[0-9a-f]{16}$/);
  assert.equal(original.compositeChecksum(), replayApi.checksum(checkpoint));

  const restored = skirmishApi.restoreSkirmish(checkpoint, { replay });
  assert.deepEqual(restored.battleSnapshot(), original.battleSnapshot());
  assert.equal(restored.compositeChecksum(), original.compositeChecksum());
  for (let tick = 0; tick < 85; tick += 1) {
    original.step();
    restored.step();
    assert.equal(restored.compositeChecksum(), original.compositeChecksum(), `diverged at tick ${original.tick}`);
  }
  assert.deepEqual(restored.battleSnapshot(), original.battleSnapshot());
  assert.deepEqual(restored.exportReplay(), original.exportReplay());
});

test("checkpoint validation rejects unknown fields, oversized data, bad AI references, and mismatched replay", () => {
  const opening = skirmishApi.createSkirmish({ seed: 33 });
  const openingCheckpoint = opening.checkpoint();
  assert.equal(skirmishApi.restoreSkirmish(openingCheckpoint).tick, 0,
    "an exact generated opening can restore without a replay log");

  const progressed = skirmishApi.createSkirmish({ seed: 34 });
  progressed.step();
  const checkpoint = progressed.checkpoint();
  assert.throws(() => skirmishApi.restoreSkirmish(checkpoint), /separately validated replay/);

  assert.throws(() => skirmishApi.validateCheckpoint({ ...clone(checkpoint), extra: true }),
    /unknown, missing, or incompatible/);
  const oversized = { ...clone(checkpoint), padding: "x".repeat(configApi.limits.checkpointByteCap) };
  assert.throws(() => skirmishApi.validateCheckpoint(oversized), /encoded bound/);

  const badReference = clone(checkpoint);
  const force = badReference.aiState.forces.find((value) => value.entityIds.length);
  force.entityIds = ["missing-computer-entity"];
  assert.throws(() => skirmishApi.validateCheckpoint(badReference), /non-living computer entity/);

  const other = skirmishApi.createSkirmish({ seed: 35 });
  assert.throws(() => skirmishApi.restoreSkirmish(checkpoint, { replay: other.exportReplay() }),
    /same battle state/);
});

test("mixed replay playback reproduces battle state without exposing or rerunning live planning", () => {
  const session = skirmishApi.createSkirmish({ seed: 91 });
  session.submitHumanCommand(humanStop(session));
  for (let tick = 0; tick < 90; tick += 1) session.step();
  const replay = session.exportReplay();
  assert.ok(replay.commands.some((entry) => entry.command.issuingPlayer === 1));
  assert.ok(replay.commands.some((entry) => entry.command.issuingPlayer === 2));
  const playback = skirmishApi.runReplay(replay, { untilTick: session.tick });
  assert.deepEqual(playback.snapshot, session.battleSnapshot());
  assert.deepEqual(Object.keys(playback), ["snapshot", "checksums"]);
  assert.equal(Object.hasOwn(playback, "aiState"), false);
});

test("the facade rejects unknown options and leaves Phase 5 simulation/replay APIs unchanged", () => {
  assert.throws(() => skirmishApi.createSkirmish({ network: true }), /unknown skirmish creation option/);
  assert.throws(() => skirmishApi.runReplay({}, { playbackPlanner: true }), /unknown Phase 6 replay option/);
  assert.deepEqual(Object.keys(simulationApi), ["createSimulation", "restoreSimulation", "validateSnapshot"]);
  assert.deepEqual(Object.keys(replayApi), [
    "canonicalStringify", "checksum", "createReplay", "canAppendAccepted",
    "appendAccepted", "validateReplay", "runReplay"
  ]);
});
