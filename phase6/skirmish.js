/* global window */
"use strict";

(function exposePhase6Skirmish() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase6Config;
  const aiApi = commonJS ? require("./ai.js") : window.AeonPhase6AI;
  const simulationApi = commonJS ? require("../phase5/simulation.js") : window.AeonPhase5Simulation;
  const replayApi = commonJS ? require("../phase5/replay.js") : window.AeonPhase5Replay;
  const defaultMap = commonJS ? require("../phase5/map.js") : window.AeonPhase5Map;

  if (!configApi || !aiApi || !simulationApi || !replayApi || !defaultMap) {
    throw new Error("Phase 6 skirmish requires the approved local battle and AI modules");
  }

  const { battleConfig, identity, limits, requestOrder, compareIdentifiers } = configApi;
  const { configuration } = battleConfig;
  const CHECKPOINT_KEYS = Object.freeze(["aiState", "battle", "configurationId", "schemaVersion"]);
  const TACTICAL_KINDS = new Set(["MOVE", "ATTACK_ENTITY", "ATTACK_MOVE", "STOP", "DEFEND"]);
  const PRODUCTION_KINDS = new Set(["QUEUE_PRODUCTION", "CANCEL_PRODUCTION"]);
  const RALLY_KINDS = new Set(["SET_RALLY", "CLEAR_RALLY"]);

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

  function cloneJson(value) { return JSON.parse(replayApi.canonicalStringify(value)); }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function encodedCheckpoint(value) {
    let encoded;
    try { encoded = replayApi.canonicalStringify(value); } catch (error) {
      throw new TypeError(`Phase 6 checkpoint is not canonical JSON data: ${error.message}`);
    }
    if (encoded.length > limits.checkpointByteCap) {
      throw new RangeError("Phase 6 checkpoint exceeds its encoded bound");
    }
    return encoded;
  }

  function resolveMapOptions(options, label, extraKeys = []) {
    if (!plainObject(options)) throw new TypeError(`${label} options must be a plain object`);
    const allowed = new Set(["map", ...extraKeys]);
    for (const key of Object.keys(options)) if (!allowed.has(key)) throw new TypeError(`unknown ${label} option: ${key}`);
    const map = options.map || defaultMap;
    if (!map || String(map.id) !== identity.map.id) throw new Error(`${label} requires Moonfall Crossing`);
    return map;
  }

  function publicEvent(event, structures) {
    if (event?.type === "production") {
      const producer = structures.find((structure) => structure.id === event.structureId);
      return Boolean(producer && producer.ownerSeat === identity.computer.seat);
    }
    return plainObject(event) && (
      (event.type === "combat" && event.status === "damage")
      || event.type === "defeat"
      || (event.type === "structure" && (event.status === "captured" || event.status === "destroyed"))
      || (event.type === "match" && event.status === "completed")
    );
  }

  function boundedPublicEvents(events, structures) {
    const result = [];
    for (const event of events) {
      if (!publicEvent(event, structures)) continue;
      result.push(cloneJson(event));
      if (result.length === limits.observedEventCap) break;
    }
    return result;
  }

  function requestClass(request) {
    if (TACTICAL_KINDS.has(request?.kind)) return "tactical";
    if (PRODUCTION_KINDS.has(request?.kind)) return "production";
    if (RALLY_KINDS.has(request?.kind)) return "rally";
    return null;
  }

  function requestTie(value) {
    return `${value.kind}|${value.structureId || value.targetId || value.entityIds?.[0] || ""}|${replayApi.canonicalStringify(value)}`;
  }

  function normalizeIntents(intents, tick) {
    if (!denseArray(intents) || intents.length > limits.totalRequestCap) {
      throw new RangeError("AI intents exceed the per-decision bound");
    }
    const groups = Object.fromEntries(requestOrder.map((name) => [name, []]));
    for (const intent of intents) {
      const kind = requestClass(intent);
      if (!kind || !plainObject(intent)
        || intent.protocolVersion !== configuration.protocolVersion
        || intent.configurationId !== configuration.configurationId
        || intent.issuingPlayer !== identity.computer.seat
        || intent.targetTick !== tick + 1) throw new TypeError("AI intent is outside the legal command boundary");
      groups[kind].push(cloneJson(intent));
    }
    if (groups.tactical.length > limits.tacticalRequestCap
      || groups.production.length > limits.productionRequestCap
      || groups.rally.length > limits.rallyRequestCap) {
      throw new RangeError("AI request class exceeds its per-decision bound");
    }
    const result = [];
    for (const name of requestOrder) {
      groups[name].sort((first, second) => compareIdentifiers(requestTie(first), requestTie(second)));
      result.push(...groups[name]);
    }
    return result;
  }

  function predictedReceipt(snapshot, request) {
    return {
      ok: true,
      acceptedTick: snapshot.tick,
      command: { ...cloneJson(request), sequence: snapshot.nextSequence }
    };
  }

  function preflightAppend(replay, snapshot, request) {
    if (snapshot.pendingCommands.length >= configuration.pendingCommandCap) {
      return Object.freeze({ ok: false, code: "command-cap" });
    }
    return replayApi.canAppendAccepted(replay, predictedReceipt(snapshot, request));
  }

  function validateCheckpoint(value, options = {}) {
    const map = resolveMapOptions(options, "checkpoint validation");
    encodedCheckpoint(value);
    if (!exactKeys(value, CHECKPOINT_KEYS)
      || value.schemaVersion !== identity.schemaVersion
      || value.configurationId !== identity.configurationId) {
      throw new TypeError("Phase 6 checkpoint has unknown, missing, or incompatible fields");
    }
    const battle = simulationApi.validateSnapshot(value.battle, { map });
    const observation = aiApi.buildObservation(battle, [], { map });
    const aiState = aiApi.validateState(value.aiState, observation);
    const checkpoint = {
      schemaVersion: identity.schemaVersion,
      configurationId: identity.configurationId,
      battle,
      aiState
    };
    encodedCheckpoint(checkpoint);
    return deepFreeze(checkpoint);
  }

  function replayForRestore(checkpoint, replayInput, map) {
    if (replayInput === undefined) {
      try { return replayApi.createReplay(checkpoint.battle, { map }); } catch {
        throw new Error("restoring a progressed Phase 6 checkpoint requires its separately validated replay");
      }
    }
    const replay = replayApi.validateReplay(replayInput, { map });
    const reproduced = replayApi.runReplay(replay, { map, untilTick: checkpoint.battle.tick });
    if (replayApi.canonicalStringify(reproduced.snapshot)
      !== replayApi.canonicalStringify(checkpoint.battle)) {
      throw new Error("Phase 6 checkpoint and replay do not describe the same battle state");
    }
    return replay;
  }

  function createLiveSession(simulation, replay, initialAiState, map) {
    let aiState = aiApi.validateState(initialAiState);
    let previousEvents = [];
    let suspended = false;
    let destroyed = false;

    function battleSnapshot() { return simulation.snapshot(); }

    function normalizedAiState(snapshot) {
      const observation = aiApi.buildObservation(snapshot, previousEvents, { map });
      if (!observation.events.length) return aiApi.validateState(aiState, observation);
      return aiApi.foldEvents(aiState, observation.events, snapshot.tick, observation);
    }

    function checkpoint() {
      const battle = battleSnapshot();
      return validateCheckpoint({
        schemaVersion: identity.schemaVersion,
        configurationId: identity.configurationId,
        battle,
        aiState: normalizedAiState(battle)
      }, { map });
    }

    function compositeChecksum() { return replayApi.checksum(checkpoint()); }

    function exportReplay() { return deepFreeze(replayApi.validateReplay(replay, { map })); }

    function submitHumanCommand(request) {
      if (destroyed || suspended) return Object.freeze({ ok: false, code: "inactive" });
      if (!plainObject(request) || request.issuingPlayer !== identity.human.seat) {
        return Object.freeze({ ok: false, code: "human-seat" });
      }
      const snapshot = battleSnapshot();
      if (snapshot.match.status !== "active") return Object.freeze({ ok: false, code: "match-complete" });
      const preflight = preflightAppend(replay, snapshot, request);
      if (!preflight.ok) return preflight;
      const receipt = simulation.submitCommand(request);
      if (!receipt.ok) return receipt;
      replayApi.appendAccepted(replay, receipt);
      return receipt;
    }

    function submitComputerIntents(intents, tick) {
      const requests = normalizeIntents(intents, tick);
      let accepted = 0;
      let failure = null;
      for (const request of requests) {
        const snapshot = battleSnapshot();
        const preflight = preflightAppend(replay, snapshot, request);
        if (!preflight.ok) {
          failure = preflight.code;
          if (preflight.code === "command-cap" || preflight.code === "replay-cap") break;
          continue;
        }
        const receipt = simulation.submitCommand(request);
        if (!receipt.ok) {
          failure = `rejected-${receipt.code}`.slice(0, 64);
          continue;
        }
        replayApi.appendAccepted(replay, receipt);
        accepted += 1;
      }
      return { code: failure || (accepted > 0 ? "accepted" : "no-request") };
    }

    function step() {
      const before = battleSnapshot();
      if (destroyed || suspended || before.match.status !== "active") {
        return Object.freeze({ tick: before.tick, events: Object.freeze([]) });
      }
      const observation = aiApi.buildObservation(before, previousEvents, { map });
      const planned = aiApi.plan(observation, aiState, { map });
      aiState = aiApi.validateState(planned.state, observation);
      previousEvents = [];
      if (!planned.diagnostics.decided && planned.intents.length) {
        throw new Error("a skipped AI decision cannot emit requests");
      }
      if (planned.diagnostics.decided) {
        const summary = submitComputerIntents(planned.intents, before.tick);
        aiState = aiApi.recordResult(aiState, {
          tick: before.tick,
          code: summary.code,
          objectiveId: planned.state.lastResult?.objectiveId ?? null
        }, observation);
      }
      const result = simulation.step();
      previousEvents = boundedPublicEvents(result.events, battleSnapshot().structures);
      return result;
    }

    function setSuspended(value) {
      if (typeof value !== "boolean") throw new TypeError("suspension state must be boolean");
      if (!destroyed) suspended = value;
      return suspended;
    }

    function destroy() {
      destroyed = true;
      suspended = true;
    }

    return Object.freeze({
      get tick() { return simulation.tick; },
      battleSnapshot,
      submitHumanCommand,
      step,
      setSuspended,
      compositeChecksum,
      checkpoint,
      exportReplay,
      destroy
    });
  }

  function createSkirmish(options = {}) {
    const map = resolveMapOptions(options, "skirmish creation", ["seed"]);
    const simulation = simulationApi.createSimulation({ map, seed: options.seed ?? 1 });
    const replay = replayApi.createReplay(simulation.snapshot(), { map });
    return createLiveSession(simulation, replay, aiApi.createInitialState(), map);
  }

  function restoreSkirmish(checkpointInput, options = {}) {
    const map = resolveMapOptions(options, "skirmish restore", ["replay"]);
    const checkpoint = validateCheckpoint(checkpointInput, { map });
    const replay = replayForRestore(checkpoint, options.replay, map);
    const simulation = simulationApi.restoreSimulation(checkpoint.battle, { map });
    return createLiveSession(simulation, replay, checkpoint.aiState, map);
  }

  function runReplay(replay, options = {}) {
    const map = resolveMapOptions(options, "Phase 6 replay", ["untilTick"]);
    return replayApi.runReplay(replay, { map, ...(options.untilTick === undefined ? {} : { untilTick: options.untilTick }) });
  }

  const api = Object.freeze({ createSkirmish, restoreSkirmish, validateCheckpoint, runReplay });
  if (commonJS) module.exports = api;
  else window.AeonPhase6Skirmish = api;
}());
