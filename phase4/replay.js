/* global window */
"use strict";

(function exposePhase4Replay() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase4Config;
  const simulationApi = commonJS ? require("./simulation.js") : window.AeonPhase4Simulation;
  const defaultMap = commonJS ? require("./map.js") : window.AeonPhase4Map;
  const { configuration, compareIdentifiers } = configApi;

  const REPLAY_KEYS = Object.freeze(["commands", "configurationId", "mapId", "protocolVersion", "schemaVersion", "seed"]);
  const ENTRY_KEYS = Object.freeze(["acceptedTick", "command"]);
  const RECEIPT_KEYS = Object.freeze(["acceptedTick", "command", "ok"]);
  const COMMON_KEYS = Object.freeze(["configurationId", "issuingPlayer", "kind", "protocolVersion", "sequence", "targetTick"]);
  const PAYLOAD_KEYS = Object.freeze({
    MOVE: ["destination", "entityIds"],
    QUEUE_PRODUCTION: ["entityKind", "structureId"],
    CANCEL_PRODUCTION: ["queueItemId", "structureId"],
    SET_RALLY: ["destination", "structureId"],
    CLEAR_RALLY: ["structureId"]
  });

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
  function clonePoint(point) { return { x: point.x, y: point.y }; }
  function cloneCommand(command) {
    const result = {
      protocolVersion: command.protocolVersion,
      configurationId: command.configurationId,
      kind: command.kind,
      issuingPlayer: command.issuingPlayer,
      sequence: command.sequence,
      targetTick: command.targetTick
    };
    if (command.entityIds) result.entityIds = [...command.entityIds];
    if (command.destination) result.destination = clonePoint(command.destination);
    if (command.structureId) result.structureId = command.structureId;
    if (command.entityKind) result.entityKind = command.entityKind;
    if (command.queueItemId) result.queueItemId = command.queueItemId;
    return result;
  }
  function cloneReplay(replay) {
    return {
      schemaVersion: replay.schemaVersion,
      protocolVersion: replay.protocolVersion,
      configurationId: replay.configurationId,
      mapId: replay.mapId,
      seed: replay.seed,
      commands: replay.commands.map((entry) => ({ acceptedTick: entry.acceptedTick, command: cloneCommand(entry.command) }))
    };
  }

  function canonicalStringify(value) {
    const ancestors = new Set();
    function encode(candidate) {
      if (candidate === null) return "null";
      if (typeof candidate === "string" || typeof candidate === "boolean") return JSON.stringify(candidate);
      if (typeof candidate === "number") {
        if (!Number.isFinite(candidate)) throw new TypeError("numbers must be finite");
        return Object.is(candidate, -0) ? "0" : JSON.stringify(candidate);
      }
      if (typeof candidate !== "object") throw new TypeError("values must be JSON-compatible");
      if (ancestors.has(candidate)) throw new TypeError("cycles are not allowed");
      ancestors.add(candidate);
      let encoded;
      if (Array.isArray(candidate)) {
        if (!denseArray(candidate)) throw new TypeError("arrays must be dense and have no named properties");
        encoded = `[${candidate.map(encode).join(",")}]`;
      } else {
        if (!plainObject(candidate)) throw new TypeError("objects must have the default prototype");
        const keys = Object.keys(candidate).sort(compareIdentifiers);
        encoded = `{${keys.map((key) => `${JSON.stringify(key)}:${encode(candidate[key])}`).join(",")}}`;
      }
      ancestors.delete(candidate);
      return encoded;
    }
    return encode(value);
  }

  function checksum(value) {
    const encoded = canonicalStringify(value);
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    const mask = 0xffffffffffffffffn;
    function consume(byte) { hash ^= BigInt(byte); hash = (hash * prime) & mask; }
    for (let index = 0; index < encoded.length; index += 1) {
      const codePoint = encoded.codePointAt(index);
      if (codePoint > 0xffff) index += 1;
      if (codePoint <= 0x7f) consume(codePoint);
      else if (codePoint <= 0x7ff) { consume(0xc0 | (codePoint >> 6)); consume(0x80 | (codePoint & 0x3f)); }
      else if (codePoint <= 0xffff) {
        consume(0xe0 | (codePoint >> 12)); consume(0x80 | ((codePoint >> 6) & 0x3f)); consume(0x80 | (codePoint & 0x3f));
      } else {
        consume(0xf0 | (codePoint >> 18)); consume(0x80 | ((codePoint >> 12) & 0x3f));
        consume(0x80 | ((codePoint >> 6) & 0x3f)); consume(0x80 | (codePoint & 0x3f));
      }
    }
    return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
  }

  function validateEncodedSize(value, cap, label) {
    let encoded;
    try { encoded = canonicalStringify(value); } catch (error) { throw new TypeError(`${label} is not canonical JSON data: ${error.message}`); }
    if (encoded.length > cap) throw new RangeError(`${label} exceeds its encoded bound`);
  }

  function validateCommand(command, acceptedTick, expectedSequence) {
    if (!plainObject(command) || !PAYLOAD_KEYS[command.kind]
      || !exactKeys(command, [...COMMON_KEYS, ...PAYLOAD_KEYS[command.kind]])) throw new TypeError("replay command has unknown or missing fields");
    if (command.protocolVersion !== configuration.protocolVersion || command.configurationId !== configuration.configurationId) throw new Error("replay command identity is incompatible");
    if (command.issuingPlayer !== 1 && command.issuingPlayer !== 2) throw new Error("replay command player is invalid");
    if (command.sequence !== expectedSequence) throw new Error("replay command sequence is not contiguous");
    if (!safeInteger(command.targetTick, acceptedTick + configuration.commandLeadMinTicks, acceptedTick + configuration.commandLeadMaxTicks)) {
      throw new Error("replay command target tick is outside the accepted lead window");
    }
    if (command.kind === "MOVE") {
      if (!denseArray(command.entityIds) || command.entityIds.length < 1 || command.entityIds.length > configuration.selectionCap) throw new Error("replay selection exceeds its bound");
      let previous = null;
      for (const id of command.entityIds) {
        if (!validIdentifier(id) || (previous !== null && compareIdentifiers(previous, id) >= 0)) throw new Error("replay entity identifiers are invalid");
        previous = id;
      }
      if (!exactKeys(command.destination, ["x", "y"]) || !safeInteger(command.destination.x) || !safeInteger(command.destination.y)) throw new Error("replay destination is invalid");
    } else {
      if (!validIdentifier(command.structureId, configuration.structureIdMaxLength)) throw new Error("replay structure identifier is invalid");
      if (command.kind === "QUEUE_PRODUCTION" && !validIdentifier(command.entityKind)) throw new Error("replay entity kind is invalid");
      if (command.kind === "CANCEL_PRODUCTION" && !validIdentifier(command.queueItemId, configuration.queueIdMaxLength)) throw new Error("replay queue identifier is invalid");
      if (command.kind === "SET_RALLY" && (!exactKeys(command.destination, ["x", "y"])
        || !safeInteger(command.destination.x) || !safeInteger(command.destination.y))) throw new Error("replay rally destination is invalid");
    }
  }

  function resolveOptions(options, label, allowUntilTick = false) {
    if (!plainObject(options)) throw new TypeError(`${label} options must be a plain object`);
    for (const key of Object.keys(options)) if (key !== "map" && !(allowUntilTick && key === "untilTick")) throw new TypeError(`unknown ${label} option: ${key}`);
    const map = options.map || defaultMap;
    if (!map) throw new Error("Phase 4 replay requires the approved map");
    return { map, untilTick: options.untilTick };
  }

  function normalizeReplay(value, map) {
    validateEncodedSize(value, configuration.replayByteCap, "replay");
    if (!exactKeys(value, REPLAY_KEYS)) throw new TypeError("replay has unknown or missing fields");
    if (value.schemaVersion !== configuration.schemaVersion || value.protocolVersion !== configuration.protocolVersion
      || value.configurationId !== configuration.configurationId || value.mapId !== String(map.id)) throw new Error("replay identity is incompatible");
    if (!safeInteger(value.seed, 0, 0xffffffff) || !denseArray(value.commands) || value.commands.length > configuration.replayCommandCap) throw new Error("replay header or command bound is invalid");
    let previousAcceptedTick = 0;
    const commands = value.commands.map((entry, index) => {
      if (!exactKeys(entry, ENTRY_KEYS) || !safeInteger(entry.acceptedTick, 0, configuration.replayTickCap)
        || (index > 0 && entry.acceptedTick < previousAcceptedTick)) throw new Error("replay accepted ticks are invalid");
      validateCommand(entry.command, entry.acceptedTick, index + 1);
      if (entry.command.targetTick > configuration.replayTickCap) throw new Error("replay target tick exceeds its bound");
      previousAcceptedTick = entry.acceptedTick;
      return { acceptedTick: entry.acceptedTick, command: cloneCommand(entry.command) };
    });
    return { schemaVersion: value.schemaVersion, protocolVersion: value.protocolVersion,
      configurationId: value.configurationId, mapId: value.mapId, seed: value.seed, commands };
  }

  function createReplay(snapshot, options = {}) {
    const { map } = resolveOptions(options, "replay creation");
    const validated = simulationApi.validateSnapshot(snapshot, { map });
    const opening = simulationApi.createSimulation({ map, seed: validated.seed }).snapshot();
    if (canonicalStringify(validated) !== canonicalStringify(opening)) throw new Error("a replay must begin at the exact generated opening snapshot");
    return { schemaVersion: configuration.schemaVersion, protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId, mapId: String(map.id), seed: validated.seed, commands: [] };
  }

  function preparedAppend(replay, receipt) {
    if (!exactKeys(receipt, RECEIPT_KEYS) || receipt.ok !== true) throw new TypeError("only a successful authoritative receipt may enter replay");
    if (!exactKeys(replay, REPLAY_KEYS) || !denseArray(replay.commands)) throw new TypeError("replay log is not mutable canonical data");
    if (replay.schemaVersion !== configuration.schemaVersion || replay.protocolVersion !== configuration.protocolVersion
      || replay.configurationId !== configuration.configurationId || !validIdentifier(replay.mapId, configuration.mapIdMaxLength)
      || !safeInteger(replay.seed, 0, 0xffffffff)) throw new Error("replay header is incompatible");
    if (replay.commands.length >= configuration.replayCommandCap) throw new RangeError("replay command log exceeds its bound");
    const acceptedTick = receipt.acceptedTick;
    if (!safeInteger(acceptedTick, 0, configuration.replayTickCap)) throw new Error("accepted tick is invalid");
    const previous = replay.commands.at(-1);
    if (previous && acceptedTick < previous.acceptedTick) throw new Error("accepted ticks must remain ordered");
    validateCommand(receipt.command, acceptedTick, replay.commands.length + 1);
    const candidate = cloneReplay(replay);
    const entry = { acceptedTick, command: cloneCommand(receipt.command) };
    candidate.commands.push(entry);
    validateEncodedSize(candidate, configuration.replayByteCap, "replay");
    return entry;
  }

  function canAppendAccepted(replay, receipt) {
    try {
      preparedAppend(replay, receipt);
      return Object.freeze({ ok: true, code: "ok" });
    } catch (error) {
      return Object.freeze({
        ok: false,
        code: error instanceof RangeError ? "replay-cap" : "replay-invalid"
      });
    }
  }

  function appendAccepted(replay, receipt) {
    replay.commands.push(preparedAppend(replay, receipt));
    return replay;
  }

  function executeReplay(replay, map, untilTick) {
    const lastAcceptedTick = replay.commands.length ? replay.commands.at(-1).acceptedTick : 0;
    const finalTick = untilTick === undefined
      ? Math.max(lastAcceptedTick, ...replay.commands.map((entry) => entry.command.targetTick)) : untilTick;
    if (!safeInteger(finalTick, lastAcceptedTick, configuration.replayTickCap)) throw new RangeError("replay final tick is invalid");
    const simulation = simulationApi.createSimulation({ map, seed: replay.seed });
    const checksums = [];
    let commandIndex = 0;
    while (true) {
      while (commandIndex < replay.commands.length && replay.commands[commandIndex].acceptedTick === simulation.tick) {
        const receipt = simulation.acceptCommand(replay.commands[commandIndex].command);
        if (!receipt.ok) throw new Error(`replay command ${commandIndex + 1} was rejected: ${receipt.code}`);
        commandIndex += 1;
      }
      if (simulation.tick % configuration.checksumIntervalTicks === 0) checksums.push(Object.freeze({ tick: simulation.tick, checksum: checksum(simulation.snapshot()) }));
      if (simulation.tick === finalTick) break;
      simulation.step();
    }
    if (commandIndex !== replay.commands.length) throw new Error("replay ended before all commands were accepted");
    return Object.freeze({ snapshot: simulation.snapshot(), checksums: Object.freeze(checksums) });
  }

  function validateReplay(value, options = {}) {
    const { map } = resolveOptions(options, "replay validation");
    const replay = normalizeReplay(value, map);
    executeReplay(replay, map, replay.commands.length ? replay.commands.at(-1).acceptedTick : 0);
    return cloneReplay(replay);
  }
  function runReplay(value, options = {}) {
    const { map, untilTick } = resolveOptions(options, "replay run", true);
    return executeReplay(normalizeReplay(value, map), map, untilTick);
  }

  const api = Object.freeze({
    canonicalStringify,
    checksum,
    createReplay,
    canAppendAccepted,
    appendAccepted,
    validateReplay,
    runReplay
  });
  if (commonJS) module.exports = api;
  else window.AeonPhase4Replay = api;
}());
