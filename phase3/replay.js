/* global window */
"use strict";

(function exposePhase3Replay() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase3Config;
  const simulationApi = commonJS ? require("./simulation.js") : window.AeonPhase3Simulation;
  const defaultMap = commonJS ? require("../phase2/map.js") : window.AeonPhase2Map;
  const { configuration, compareIdentifiers } = configApi;

  const REPLAY_KEYS = Object.freeze([
    "commands", "configurationId", "mapId", "protocolVersion", "schemaVersion", "seed"
  ]);
  const ENTRY_KEYS = Object.freeze(["acceptedTick", "command"]);
  const RECEIPT_KEYS = Object.freeze(["acceptedTick", "command", "ok"]);
  const COMMAND_KEYS = Object.freeze([
    "configurationId", "destination", "entityIds", "issuingPlayer", "kind", "protocolVersion", "sequence", "targetTick"
  ]);

  function plainObject(value) {
    return Boolean(value)
      && typeof value === "object"
      && !Array.isArray(value)
      && Object.getPrototypeOf(value) === Object.prototype;
  }

  function exactKeys(value, expected) {
    if (!plainObject(value)) return false;
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

  function cloneReplay(replay) {
    return {
      schemaVersion: replay.schemaVersion,
      protocolVersion: replay.protocolVersion,
      configurationId: replay.configurationId,
      mapId: replay.mapId,
      seed: replay.seed,
      commands: replay.commands.map((entry) => ({
        acceptedTick: entry.acceptedTick,
        command: cloneCommand(entry.command)
      }))
    };
  }

  function validateEncodedSize(value, cap, label) {
    let encoded;
    try {
      encoded = canonicalStringify(value);
    } catch (error) {
      throw new TypeError(`${label} is not canonical JSON data: ${error.message}`);
    }
    if (encoded.length > cap) throw new RangeError(`${label} exceeds its encoded bound`);
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

    function consume(byte) {
      hash ^= BigInt(byte);
      hash = (hash * prime) & mask;
    }

    for (let index = 0; index < encoded.length; index += 1) {
      let codePoint = encoded.codePointAt(index);
      if (codePoint > 0xffff) index += 1;
      if (codePoint <= 0x7f) {
        consume(codePoint);
      } else if (codePoint <= 0x7ff) {
        consume(0xc0 | (codePoint >> 6));
        consume(0x80 | (codePoint & 0x3f));
      } else if (codePoint <= 0xffff) {
        consume(0xe0 | (codePoint >> 12));
        consume(0x80 | ((codePoint >> 6) & 0x3f));
        consume(0x80 | (codePoint & 0x3f));
      } else {
        consume(0xf0 | (codePoint >> 18));
        consume(0x80 | ((codePoint >> 12) & 0x3f));
        consume(0x80 | ((codePoint >> 6) & 0x3f));
        consume(0x80 | (codePoint & 0x3f));
      }
    }
    return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
  }

  function resolveOptions(options, label, allowUntilTick = false) {
    if (!plainObject(options)) throw new TypeError(`${label} options must be a plain object`);
    for (const key of Object.keys(options)) {
      if (key !== "map" && !(allowUntilTick && key === "untilTick")) {
        throw new TypeError(`unknown ${label} option: ${key}`);
      }
    }
    const map = options.map || defaultMap;
    if (!map) throw new Error("Phase 3 replay requires the approved Phase 2 map");
    return { map, untilTick: options.untilTick };
  }

  function validateCommandShape(command, acceptedTick, expectedSequence) {
    if (!exactKeys(command, COMMAND_KEYS)) throw new TypeError("replay command has unknown or missing fields");
    if (command.protocolVersion !== configuration.protocolVersion
      || command.configurationId !== configuration.configurationId) {
      throw new Error("replay command identity is incompatible");
    }
    if (command.kind !== "MOVE" || (command.issuingPlayer !== 1 && command.issuingPlayer !== 2)) {
      throw new Error("replay command kind or issuing player is invalid");
    }
    if (command.sequence !== expectedSequence) throw new Error("replay command sequence is not contiguous");
    if (!safeInteger(command.targetTick,
      acceptedTick + configuration.commandLeadMinTicks,
      acceptedTick + configuration.commandLeadMaxTicks)) {
      throw new Error("replay command target tick is outside the accepted lead window");
    }
    if (!denseArray(command.entityIds)
      || command.entityIds.length < 1
      || command.entityIds.length > configuration.selectionCap) {
      throw new RangeError("replay command selection exceeds its bound");
    }
    let previous = null;
    for (const entityId of command.entityIds) {
      if (typeof entityId !== "string"
        || entityId.length < 1
        || entityId.length > configuration.entityIdMaxLength
        || !/^[A-Za-z0-9-]+$/.test(entityId)) {
        throw new Error("replay command has an invalid entity identifier");
      }
      if (previous !== null && compareIdentifiers(previous, entityId) >= 0) {
        throw new Error("replay command entity identifiers are not unique and sorted");
      }
      previous = entityId;
    }
    if (!exactKeys(command.destination, ["x", "y"])
      || !safeInteger(command.destination.x)
      || !safeInteger(command.destination.y)) {
      throw new Error("replay command destination is not bounded fixed-point data");
    }
  }

  function normalizeReplay(value, map) {
    validateEncodedSize(value, configuration.replayByteCap, "replay");
    if (!exactKeys(value, REPLAY_KEYS)) throw new TypeError("replay has unknown or missing fields");
    if (value.schemaVersion !== configuration.schemaVersion
      || value.protocolVersion !== configuration.protocolVersion
      || value.configurationId !== configuration.configurationId) {
      throw new Error("replay protocol or configuration identity is incompatible");
    }
    if (value.mapId !== String(map.id)) throw new Error("replay map identity does not match the loaded map");
    if (!safeInteger(value.seed, 0, 0xffffffff)) throw new Error("replay seed is not an unsigned 32-bit integer");
    if (!denseArray(value.commands) || value.commands.length > configuration.replayCommandCap) {
      throw new RangeError("replay command log exceeds its bound");
    }
    let previousAcceptedTick = 0;
    const commands = value.commands.map((entry, index) => {
      if (!exactKeys(entry, ENTRY_KEYS)) throw new TypeError("replay entry has unknown or missing fields");
      if (!safeInteger(entry.acceptedTick, 0, configuration.replayTickCap)
        || (index > 0 && entry.acceptedTick < previousAcceptedTick)) {
        throw new Error("replay accepted ticks are not bounded and ordered");
      }
      validateCommandShape(entry.command, entry.acceptedTick, index + 1);
      if (entry.command.targetTick > configuration.replayTickCap) {
        throw new RangeError("replay target tick exceeds its bound");
      }
      previousAcceptedTick = entry.acceptedTick;
      return { acceptedTick: entry.acceptedTick, command: cloneCommand(entry.command) };
    });
    return {
      schemaVersion: value.schemaVersion,
      protocolVersion: value.protocolVersion,
      configurationId: value.configurationId,
      mapId: value.mapId,
      seed: value.seed,
      commands
    };
  }

  function createReplay(snapshot, options = {}) {
    const { map } = resolveOptions(options, "replay creation");
    const validated = simulationApi.validateSnapshot(snapshot, { map });
    const opening = simulationApi.createSimulation({ map, seed: validated.seed }).snapshot();
    if (canonicalStringify(validated) !== canonicalStringify(opening)) {
      throw new Error("a replay must begin from the exact generated opening snapshot");
    }
    return {
      schemaVersion: configuration.schemaVersion,
      protocolVersion: configuration.protocolVersion,
      configurationId: configuration.configurationId,
      mapId: String(map.id),
      seed: validated.seed,
      commands: []
    };
  }

  function appendAccepted(replay, receipt) {
    if (!exactKeys(receipt, RECEIPT_KEYS) || receipt.ok !== true) {
      throw new TypeError("only a successful authoritative acceptance receipt can enter the replay");
    }
    if (!exactKeys(replay, REPLAY_KEYS) || !denseArray(replay.commands)) {
      throw new TypeError("replay command log is not mutable canonical data");
    }
    if (replay.schemaVersion !== configuration.schemaVersion
      || replay.protocolVersion !== configuration.protocolVersion
      || replay.configurationId !== configuration.configurationId
      || typeof replay.mapId !== "string"
      || replay.mapId.length < 1
      || replay.mapId.length > configuration.mapIdMaxLength
      || !/^[A-Za-z0-9-]+$/.test(replay.mapId)
      || !safeInteger(replay.seed, 0, 0xffffffff)) {
      throw new Error("replay header identity is incompatible");
    }
    if (replay.commands.length >= configuration.replayCommandCap) throw new RangeError("replay command log exceeds its bound");
    const acceptedTick = receipt.acceptedTick;
    if (!safeInteger(acceptedTick, 0, configuration.replayTickCap)) throw new RangeError("accepted tick exceeds its bound");
    const previous = replay.commands.at(-1);
    if (previous && acceptedTick < previous.acceptedTick) throw new Error("accepted ticks must remain ordered");
    validateCommandShape(receipt.command, acceptedTick, replay.commands.length + 1);
    const entry = { acceptedTick, command: cloneCommand(receipt.command) };
    const candidate = cloneReplay(replay);
    candidate.commands.push(entry);
    validateEncodedSize(candidate, configuration.replayByteCap, "replay");
    replay.commands.push(entry);
    return replay;
  }

  function executeReplay(replay, map, untilTick) {
    const lastAcceptedTick = replay.commands.length === 0 ? 0 : replay.commands.at(-1).acceptedTick;
    const finalTick = untilTick === undefined
      ? Math.max(lastAcceptedTick, ...replay.commands.map((entry) => entry.command.targetTick))
      : untilTick;
    if (!safeInteger(finalTick, lastAcceptedTick, configuration.replayTickCap)) {
      throw new RangeError("replay final tick is before its log or exceeds its bound");
    }
    const simulation = simulationApi.createSimulation({ map, seed: replay.seed });
    const checksums = [];
    let commandIndex = 0;
    while (true) {
      while (commandIndex < replay.commands.length
        && replay.commands[commandIndex].acceptedTick === simulation.tick) {
        const receipt = simulation.acceptCommand(replay.commands[commandIndex].command);
        if (!receipt.ok) throw new Error(`replay command ${commandIndex + 1} was rejected: ${receipt.code}`);
        commandIndex += 1;
      }
      if (simulation.tick % configuration.checksumIntervalTicks === 0) {
        checksums.push(Object.freeze({ tick: simulation.tick, checksum: checksum(simulation.snapshot()) }));
      }
      if (simulation.tick === finalTick) break;
      simulation.step();
    }
    if (commandIndex !== replay.commands.length) throw new Error("replay ended before all accepted commands were submitted");
    return Object.freeze({
      snapshot: simulation.snapshot(),
      checksums: Object.freeze(checksums)
    });
  }

  function validateReplay(value, options = {}) {
    const { map } = resolveOptions(options, "replay validation");
    const replay = normalizeReplay(value, map);
    const lastAcceptedTick = replay.commands.length === 0 ? 0 : replay.commands.at(-1).acceptedTick;
    executeReplay(replay, map, lastAcceptedTick);
    return cloneReplay(replay);
  }

  function runReplay(value, options = {}) {
    const { map, untilTick } = resolveOptions(options, "replay run", true);
    const replay = normalizeReplay(value, map);
    return executeReplay(replay, map, untilTick);
  }

  const api = Object.freeze({
    canonicalStringify,
    checksum,
    createReplay,
    appendAccepted,
    validateReplay,
    runReplay
  });

  if (commonJS) module.exports = api;
  else window.AeonPhase3Replay = api;
}());
