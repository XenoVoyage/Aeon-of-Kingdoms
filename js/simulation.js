/**
 * Aeon of Kingdoms deterministic simulation API
 * ------------------------------------------------
 * Load order: js/config.js -> js/core.js -> js/simulation.js -> js/ai.js
 *
 * AOK.Simulation.create(options) -> mutable, JSON-safe match state
 *   options: { playerCount: 2|4|6, mode, seed, players[], ai, startingUnits }
 * AOK.Simulation.step(state, ticks = 1) -> state
 * AOK.Simulation.queueCommand(state, command) -> normalized command | null
 *   commands: move, attackMove, stop, recruit
 * AOK.Simulation.move/attackMove/stop/recruit(...) -> command | null
 * AOK.Simulation.queryUnits(state, query) -> stable array of unit references
 * AOK.Simulation.snapshot(state) -> detached JSON-safe state
 * AOK.Simulation.checksum(state) -> eight-character deterministic checksum
 *
 * World coordinates use AOK.CONFIG.MAP.width/height. Consumers may read state,
 * but simulation mutations must go through commands + step so peers can replay
 * the same ordered command stream. Entity arrays and command IDs remain stable.
 */
(function initSimulation(global) {
  'use strict';

  const AOK = global.AOK = global.AOK || {};
  const CONFIG = AOK.CONFIG;
  const Core = AOK.Core;

  if (!CONFIG || !Core) {
    throw new Error('AOK.CONFIG and AOK.Core must be loaded before AOK.Simulation');
  }

  const COMMAND = Object.freeze({
    MOVE: 'move',
    ATTACK_MOVE: 'attackMove',
    STOP: 'stop',
    RECRUIT: 'recruit'
  });
  const VALID_COMMANDS = Object.freeze(Object.values(COMMAND));
  const IDLE_ORDER = 'idle';
  const INITIAL_ROLES = CONFIG.ECONOMY.startingRoles;

  function finiteNumber(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function integer(value, fallback) {
    const number = finiteNumber(value, fallback);
    return Math.floor(number);
  }

  function getPlayer(state, playerId) {
    return state.players.find((player) => player.id === playerId) || null;
  }

  function getUnit(state, unitId) {
    return state.units.find((unit) => unit.id === unitId) || null;
  }

  function getStructure(state, structureId) {
    return state.structures.find((structure) => structure.id === structureId) || null;
  }

  function getSite(state, siteId) {
    return state.sites.find((site) => String(site.id) === String(siteId)) || null;
  }

  function getEntity(state, entityId) {
    return getUnit(state, entityId) || getStructure(state, entityId);
  }

  function getFaction(factionId) {
    return CONFIG.FACTIONS[factionId] || null;
  }

  function getUnitType(factionId, roleOrType) {
    const faction = getFaction(factionId);
    if (!faction) {
      return null;
    }
    if (faction.units[roleOrType]) {
      return faction.units[roleOrType];
    }
    const roles = Object.keys(faction.units);
    for (let index = 0; index < roles.length; index += 1) {
      const unitType = faction.units[roles[index]];
      if (unitType.id === roleOrType) {
        return unitType;
      }
    }
    return null;
  }

  function createPlayer(index, spawnId, input, defaultAi) {
    const supplied = input || {};
    const factionId = CONFIG.FACTIONS[supplied.factionId]
      ? supplied.factionId
      : CONFIG.FACTION_IDS[index % CONFIG.FACTION_IDS.length];
    return {
      id: index,
      name: String(supplied.name || ('Commander ' + (index + 1))).slice(0, CONFIG.LIMITS.playerNameLength),
      factionId,
      color: supplied.color || CONFIG.PLAYER_COLORS[index],
      spawnId,
      ai: supplied.ai === undefined ? defaultAi : Boolean(supplied.ai),
      difficulty: ['easy', 'normal', 'hard'].includes(supplied.difficulty)
        ? supplied.difficulty
        : 'normal',
      credits: CONFIG.ECONOMY.startingCredits,
      population: 0,
      populationCap: CONFIG.ECONOMY.startingPopulationCap,
      eliminated: false,
      score: 0,
      hillTicks: 0,
      dominationTicks: 0,
      sitesOwned: 0,
      unitsLost: 0,
      unitsDefeated: 0
    };
  }

  function copyUnitStats(unitType) {
    return {
      typeId: unitType.id,
      name: unitType.name,
      role: unitType.role,
      symbol: unitType.symbol,
      populationCost: unitType.population,
      maxHp: unitType.maxHp,
      speed: unitType.speed,
      radius: unitType.radius,
      range: unitType.range,
      damage: unitType.damage,
      attackTicks: unitType.attackTicks,
      sight: unitType.sight,
      captureStrength: unitType.capture,
      armor: unitType.armor,
      projectileSpeed: unitType.projectileSpeed,
      large: unitType.large
    };
  }

  function addEvent(state, type, payload) {
    if (state.events.length >= CONFIG.LIMITS.events) {
      return;
    }
    state.events.push(Object.assign({ tick: state.tick, type }, payload || {}));
  }

  function createUnit(state, player, role, x, y) {
    if (state.units.length >= CONFIG.LIMITS.globalUnits) {
      return null;
    }
    const unitType = getUnitType(player.factionId, role);
    if (!unitType) {
      return null;
    }
    const resolved = Core.resolveObstacleCollision(x, y, unitType.radius, CONFIG.MAP, state.obstacles);
    const unit = Object.assign({
      id: state.nextEntityId++,
      playerId: player.id,
      factionId: player.factionId,
      x: resolved.x,
      y: resolved.y,
      hp: unitType.maxHp,
      attackCooldown: 0,
      targetId: null,
      approachX: null,
      approachY: null,
      repathTick: 0,
      dead: false,
      order: { type: IDLE_ORDER, x: resolved.x, y: resolved.y, path: [], pathIndex: 0 }
    }, copyUnitStats(unitType));
    state.units.push(unit);
    player.population += unitType.population;
    return unit;
  }

  function createHeadquarters(state, player, spawn) {
    const hq = {
      id: state.nextEntityId++,
      kind: 'hq',
      type: 'hq',
      shape: 'circle',
      name: getFaction(player.factionId).shortName + ' Nexus',
      playerId: player.id,
      factionId: player.factionId,
      x: spawn.x,
      y: spawn.y,
      radius: CONFIG.COMBAT.hqRadius,
      maxHp: CONFIG.COMBAT.hqMaxHp,
      hp: CONFIG.COMBAT.hqMaxHp,
      armor: CONFIG.COMBAT.hqArmor,
      range: CONFIG.COMBAT.hqRange,
      damage: CONFIG.COMBAT.hqDamage,
      attackTicks: CONFIG.COMBAT.hqAttackTicks,
      attackCooldown: 0,
      recruitCooldown: 0,
      dead: false
    };
    state.structures.push(hq);
    return hq;
  }

  function spawnInitialFormation(state, player, spawn, count) {
    const desiredCount = Core.clamp(integer(count, INITIAL_ROLES.length), 0, INITIAL_ROLES.length);
    const center = {
      x: spawn.x + Math.cos(spawn.angle) * CONFIG.ECONOMY.startingFormationDistance,
      y: spawn.y + Math.sin(spawn.angle) * CONFIG.ECONOMY.startingFormationDistance
    };
    const slots = Core.formationSlots(
      desiredCount,
      center,
      { x: spawn.x, y: spawn.y },
      CONFIG.ECONOMY.startingFormationSpacing
    );
    for (let index = 0; index < desiredCount; index += 1) {
      createUnit(state, player, INITIAL_ROLES[index], slots[index].x, slots[index].y);
    }
  }

  function create(options) {
    const settings = options || {};
    const playerCount = integer(settings.playerCount, 2);
    if (![2, 4, 6].includes(playerCount)) {
      throw new RangeError('playerCount must be 2, 4, or 6');
    }
    const mode = Object.values(CONFIG.MODE).includes(settings.mode)
      ? settings.mode
      : CONFIG.MODE.TOTAL_DOMINATION;
    const seed = (integer(settings.seed, 0x0ae02026) >>> 0) || 0x6d2b79f5;
    const state = {
      version: CONFIG.VERSION,
      configurationHash: Core.checksum(CONFIG),
      mapId: CONFIG.MAP.id,
      tick: 0,
      rngState: seed,
      status: 'running',
      winnerId: null,
      victoryReason: null,
      settings: {
        playerCount,
        mode,
        seed,
        aiEnabled: settings.ai !== false
      },
      players: [],
      units: [],
      structures: [],
      sites: CONFIG.MAP.sites.map((site) => ({
        id: site.id,
        kind: site.kind,
        type: site.kind,
        objective: site.objective || null,
        x: site.x,
        y: site.y,
        radius: site.radius || 28,
        captureRadius: (site.radius || 28) + CONFIG.CAPTURE.radius,
        ownerId: null,
        capturingPlayerId: null,
        captureProgress: 0,
        contested: false,
        recruitCooldown: 0
      })),
      obstacles: CONFIG.MAP.obstacles.map((obstacle) => Object.assign({}, obstacle)),
      projectiles: [],
      commands: [],
      events: [],
      nextEntityId: 1,
      nextCommandSequence: 1,
      stats: {
        commandsAccepted: 0,
        commandsRejected: 0,
        peakUnits: 0
      }
    };

    const spawnIds = CONFIG.MAP.activeSpawns[playerCount];
    const playerInputs = Array.isArray(settings.players) ? settings.players : [];
    for (let index = 0; index < playerCount; index += 1) {
      const defaultAi = settings.ai !== false && index > 0;
      const player = createPlayer(index, spawnIds[index], playerInputs[index], defaultAi);
      state.players.push(player);
      const spawn = CONFIG.MAP.spawns[player.spawnId];
      createHeadquarters(state, player, spawn);
      spawnInitialFormation(state, player, spawn, settings.startingUnits);
    }
    state.units.sort(Core.stableEntitySort);
    state.structures.sort(Core.stableEntitySort);
    recalculatePopulationCaps(state);
    state.stats.peakUnits = state.units.length;
    return state;
  }

  function normalizeCoordinate(value, maximum) {
    return Core.quantize(Core.clamp(finiteNumber(value, maximum / 2), CONFIG.MAP.padding, maximum - CONFIG.MAP.padding));
  }

  function normalizeCommand(state, input) {
    if (!input || typeof input !== 'object' || !VALID_COMMANDS.includes(input.type)) {
      return null;
    }
    const playerId = integer(input.playerId, -1);
    const player = getPlayer(state, playerId);
    if (!player || player.eliminated) {
      return null;
    }
    const command = {
      playerId,
      type: input.type,
      executeTick: Core.clamp(
        integer(input.executeTick, state.tick + 1),
        state.tick + 1,
        state.tick + CONFIG.LIMITS.commandLeadTicks
      ),
      sequence: state.nextCommandSequence
    };

    if (input.type === COMMAND.RECRUIT) {
      const unitType = getUnitType(player.factionId, input.role || input.typeId);
      if (!unitType || input.siteId === undefined || input.siteId === null ||
          String(input.siteId).length > CONFIG.LIMITS.siteIdLength ||
          !findRecruitSource(state, playerId, input.siteId)) {
        return null;
      }
      command.siteId = input.siteId;
      command.role = unitType.role;
      return command;
    }

    const ids = Core.uniqueSortedIds(input.unitIds, CONFIG.LIMITS.unitIdsPerCommand)
      .filter((unitId) => {
        const unit = getUnit(state, unitId);
        return unit && !unit.dead && unit.playerId === playerId;
      });
    if (ids.length === 0) {
      return null;
    }
    command.unitIds = ids;
    if (input.type === COMMAND.MOVE || input.type === COMMAND.ATTACK_MOVE) {
      command.x = normalizeCoordinate(input.x, CONFIG.MAP.width);
      command.y = normalizeCoordinate(input.y, CONFIG.MAP.height);
    }
    return command;
  }

  function queueCommand(state, input) {
    if (!state || state.status !== 'running' || state.commands.length >= CONFIG.LIMITS.queuedCommands) {
      if (state && state.stats) {
        state.stats.commandsRejected += 1;
      }
      return null;
    }
    const command = normalizeCommand(state, input);
    if (!command) {
      state.stats.commandsRejected += 1;
      return null;
    }
    state.nextCommandSequence += 1;
    state.commands.push(command);
    state.commands.sort((a, b) => a.executeTick - b.executeTick || a.sequence - b.sequence || a.playerId - b.playerId);
    state.stats.commandsAccepted += 1;
    return command;
  }

  function commandUnits(state, command) {
    const units = [];
    for (let index = 0; index < command.unitIds.length; index += 1) {
      const unit = getUnit(state, command.unitIds[index]);
      if (unit && !unit.dead && unit.playerId === command.playerId) {
        units.push(unit);
      }
    }
    units.sort(Core.stableEntitySort);
    return units;
  }

  function buildNavigationObstacles(state) {
    const obstacles = state.obstacles.slice();
    for (let index = 0; index < state.structures.length; index += 1) {
      const structure = state.structures[index];
      if (!structure.dead) {
        obstacles.push(structure);
      }
    }
    return obstacles;
  }

  function pathClearance(unit) {
    return unit.radius + (unit.large ? 8 : 3);
  }

  function movementClearance(unit) {
    return unit.radius + (unit.large ? 4 : 0);
  }

  function resolveUnitPosition(state, unit, x, y, obstacles, clearance) {
    const blockers = obstacles || buildNavigationObstacles(state);
    const resolvedClearance = clearance === undefined ? movementClearance(unit) : clearance;
    let resolved = { x, y };
    // Repeating the bounded static resolver prevents a later structure push from
    // leaving a unit inside an earlier arena obstacle (or vice versa).
    for (let pass = 0; pass < 3; pass += 1) {
      const next = Core.resolveObstacleCollision(
        resolved.x, resolved.y, resolvedClearance, CONFIG.MAP, blockers
      );
      if (Core.pointWalkable(
        next.x, next.y, resolvedClearance, CONFIG.MAP, blockers
      )) {
        return next;
      }
      resolved = next;
    }

    // A structure close to an arena edge can make iterative pushes alternate
    // between two blockers. Search a small deterministic neighborhood for the
    // nearest legal point instead of accepting an out-of-bounds result.
    const searchStep = Math.max(12, resolvedClearance);
    const phase = ((Math.imul(unit.id, 2654435761) >>> 0) / 0x100000000) * Core.TAU;
    for (let ring = 1; ring <= 8; ring += 1) {
      const slots = 8 + ring * 4;
      for (let slot = 0; slot < slots; slot += 1) {
        const angle = phase + Core.TAU * slot / slots;
        const candidate = {
          x: Core.quantize(resolved.x + Math.cos(angle) * searchStep * ring),
          y: Core.quantize(resolved.y + Math.sin(angle) * searchStep * ring)
        };
        if (Core.pointWalkable(
          candidate.x, candidate.y, resolvedClearance, CONFIG.MAP, blockers
        )) {
          return candidate;
        }
      }
    }
    return resolved;
  }

  function assignMoveOrder(state, units, target, attackMove, navigationObstacles) {
    if (units.length === 0) {
      return;
    }
    let sourceX = 0;
    let sourceY = 0;
    let largestRadius = 0;
    for (let index = 0; index < units.length; index += 1) {
      sourceX += units[index].x;
      sourceY += units[index].y;
      largestRadius = Math.max(largestRadius, units[index].radius);
    }
    const source = { x: sourceX / units.length, y: sourceY / units.length };
    const slots = Core.formationSlots(units.length, target, source, largestRadius * 2 + 8);

    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];
      const slot = resolveUnitPosition(
        state, unit, slots[index].x, slots[index].y, navigationObstacles,
        unit.radius + (unit.large ? 5 : 2)
      );
      unit.targetId = null;
      unit.approachX = null;
      unit.approachY = null;
      unit.order = {
        type: attackMove ? COMMAND.ATTACK_MOVE : COMMAND.MOVE,
        x: slot.x,
        y: slot.y,
        path: Core.findPath(unit, slot, {
          map: CONFIG.MAP,
          obstacles: navigationObstacles,
          clearance: pathClearance(unit)
        }),
        pathIndex: 0
      };
    }
  }

  function findRecruitSource(state, playerId, siteId) {
    const structure = getStructure(state, Number(siteId));
    if (structure && structure.kind === 'hq' && structure.playerId === playerId && !structure.dead) {
      return structure;
    }
    const site = getSite(state, siteId);
    if (site && site.kind === CONFIG.SITE_KIND.RECRUITMENT && site.ownerId === playerId) {
      return site;
    }
    return null;
  }

  function occupiedAt(state, x, y, radius) {
    for (let index = 0; index < state.units.length; index += 1) {
      const unit = state.units[index];
      if (!unit.dead && Core.distanceSquared(x, y, unit.x, unit.y) < Math.pow(radius + unit.radius + 3, 2)) {
        return true;
      }
    }
    for (let index = 0; index < state.structures.length; index += 1) {
      const structure = state.structures[index];
      if (!structure.dead && Core.distanceSquared(x, y, structure.x, structure.y) <
          Math.pow(radius + structure.radius + 3, 2)) {
        return true;
      }
    }
    return false;
  }

  function findSpawnPosition(state, source, radius, sequence) {
    const baseRadius = source.radius + radius + 16;
    for (let ring = 0; ring < 3; ring += 1) {
      const slots = 8 + ring * 4;
      for (let offset = 0; offset < slots; offset += 1) {
        const slot = (offset + sequence) % slots;
        const angle = -Math.PI / 2 + Core.TAU * slot / slots;
        const distance = baseRadius + ring * (radius * 2 + 10);
        const x = source.x + Math.cos(angle) * distance;
        const y = source.y + Math.sin(angle) * distance;
        if (Core.pointWalkable(x, y, radius + 3, CONFIG.MAP, state.obstacles) &&
            !occupiedAt(state, x, y, radius)) {
          return { x: Core.quantize(x), y: Core.quantize(y) };
        }
      }
    }
    return null;
  }

  function executeRecruit(state, command) {
    const player = getPlayer(state, command.playerId);
    const source = findRecruitSource(state, player.id, command.siteId);
    const unitType = getUnitType(player.factionId, command.role);
    const playerUnits = state.units.filter((unit) => !unit.dead && unit.playerId === player.id).length;
    if (!source || !unitType || source.recruitCooldown > 0 || player.credits < unitType.cost ||
        player.population + unitType.population > player.populationCap ||
        playerUnits >= CONFIG.LIMITS.unitsPerPlayer || state.units.length >= CONFIG.LIMITS.globalUnits) {
      addEvent(state, 'recruit-rejected', { playerId: player.id, siteId: command.siteId, role: command.role });
      return;
    }
    const position = findSpawnPosition(state, source, unitType.radius, command.sequence);
    if (!position) {
      addEvent(state, 'recruit-rejected', {
        playerId: player.id,
        siteId: command.siteId,
        role: command.role,
        reason: 'spawn-blocked'
      });
      return;
    }
    const created = createUnit(state, player, command.role, position.x, position.y);
    if (!created) {
      return;
    }
    player.credits -= unitType.cost;
    source.recruitCooldown = CONFIG.ECONOMY.recruitCooldownTicks;
    state.units.sort(Core.stableEntitySort);
    addEvent(state, 'unit-recruited', {
      playerId: player.id,
      unitId: created.id,
      siteId: command.siteId,
      role: created.role
    });
  }

  function executeCommand(state, command, navigationObstacles) {
    if (command.type === COMMAND.RECRUIT) {
      executeRecruit(state, command);
      return;
    }
    const units = commandUnits(state, command);
    if (command.type === COMMAND.STOP) {
      for (let index = 0; index < units.length; index += 1) {
        const unit = units[index];
        unit.targetId = null;
        unit.order = { type: IDLE_ORDER, x: unit.x, y: unit.y, path: [], pathIndex: 0 };
      }
      return;
    }
    assignMoveOrder(
      state, units, { x: command.x, y: command.y },
      command.type === COMMAND.ATTACK_MOVE, navigationObstacles
    );
  }

  function executeDueCommands(state, navigationObstacles) {
    const due = [];
    const pending = [];
    for (let index = 0; index < state.commands.length; index += 1) {
      const command = state.commands[index];
      if (command.executeTick <= state.tick && due.length < CONFIG.LIMITS.commandsPerTick) {
        due.push(command);
      } else {
        pending.push(command);
      }
    }
    state.commands = pending;
    due.sort((a, b) => a.executeTick - b.executeTick || a.sequence - b.sequence || a.playerId - b.playerId);
    for (let index = 0; index < due.length; index += 1) {
      executeCommand(state, due[index], navigationObstacles);
    }
  }

  function isEnemy(entity, playerId) {
    return entity && !entity.dead && entity.playerId !== playerId;
  }

  function findNearestEnemy(state, unit, maximumDistance) {
    const maximumSquared = maximumDistance * maximumDistance;
    let best = null;
    let bestDistance = maximumSquared;
    const candidates = state.units.concat(state.structures);
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (!isEnemy(candidate, unit.playerId)) {
        continue;
      }
      const distanceSquared = Core.distanceSquared(unit.x, unit.y, candidate.x, candidate.y);
      if (distanceSquared < bestDistance ||
          (distanceSquared === bestDistance && best && Core.compareIds(candidate.id, best.id) < 0)) {
        best = candidate;
        bestDistance = distanceSquared;
      }
    }
    return best;
  }

  function validateAndAcquireTargets(state) {
    for (let index = 0; index < state.units.length; index += 1) {
      const unit = state.units[index];
      if (unit.dead) {
        continue;
      }
      const target = unit.targetId === null ? null : getEntity(state, unit.targetId);
      if (!isEnemy(target, unit.playerId)) {
        unit.targetId = null;
      }
      const mayAcquire = unit.order.type === IDLE_ORDER || unit.order.type === COMMAND.ATTACK_MOVE;
      if (mayAcquire && unit.targetId === null && (state.tick + unit.id) % CONFIG.COMBAT.acquireTicks === 0) {
        const enemy = findNearestEnemy(state, unit, unit.sight);
        if (enemy) {
          unit.targetId = enemy.id;
          unit.repathTick = 0;
        }
      }
    }
  }

  function reservationIsClear(reservations, candidate, attacker) {
    for (let index = 0; index < reservations.length; index += 1) {
      const reservation = reservations[index];
      const minimumDistance = attacker.radius + reservation.radius + CONFIG.COMBAT.separationPadding;
      if (Core.distanceSquared(candidate.x, candidate.y, reservation.x, reservation.y) <
          minimumDistance * minimumDistance) {
        return false;
      }
    }
    return true;
  }

  function reserveAttackApproaches(state, navigationObstacles) {
    const groups = Object.create(null);
    for (let index = 0; index < state.units.length; index += 1) {
      const unit = state.units[index];
      unit.approachX = null;
      unit.approachY = null;
      if (unit.dead || unit.targetId === null) {
        continue;
      }
      (groups[unit.targetId] = groups[unit.targetId] || []).push(unit);
    }
    const targetIds = Object.keys(groups).map(Number).sort((a, b) => a - b);
    for (let groupIndex = 0; groupIndex < targetIds.length; groupIndex += 1) {
      const target = getEntity(state, targetIds[groupIndex]);
      if (!target || target.dead) {
        continue;
      }
      const attackers = groups[target.id].sort(Core.stableEntitySort);
      const phase = ((target.id * 2654435761) >>> 0) / 0x100000000 * Core.TAU;
      let largestFootprint = 0;
      for (let index = 0; index < attackers.length; index += 1) {
        largestFootprint = Math.max(
          largestFootprint,
          attackers[index].radius + (attackers[index].large ? 8 : 3)
        );
      }
      const slotSpacing = largestFootprint * 2 + CONFIG.COMBAT.separationPadding;
      const baseRadius = target.radius + largestFootprint + CONFIG.COMBAT.separationPadding;
      const rings = [];
      const reservations = [];

      function ringAt(ringIndex) {
        if (!rings[ringIndex]) {
          const radius = baseRadius + ringIndex * slotSpacing;
          const capacity = Math.max(6, Math.floor(Core.TAU * radius / slotSpacing));
          rings[ringIndex] = { radius, capacity, used: new Uint8Array(capacity) };
        }
        return rings[ringIndex];
      }

      for (let attackerIndex = 0; attackerIndex < attackers.length; attackerIndex += 1) {
        const attacker = attackers[attackerIndex];
        const desiredRange = Math.max(
          attacker.radius + 5,
          attacker.range * CONFIG.COMBAT.attackRingRangeFactor
        );
        const preferredRadius = target.radius + desiredRange;
        const preferredRing = Math.max(0, Math.round((preferredRadius - baseRadius) / slotSpacing));
        const maximumRing = preferredRing + Math.ceil(attackers.length / 6) + 6;
        let assigned = false;

        for (let ringIndex = preferredRing; ringIndex <= maximumRing && !assigned; ringIndex += 1) {
          const ring = ringAt(ringIndex);
          const slotSeed = (Math.imul(attacker.id, 1103515245) ^ Math.imul(target.id, 2654435761)) >>> 0;
          const startSlot = slotSeed % ring.capacity;
          for (let probe = 0; probe < ring.capacity; probe += 1) {
            const slot = (startSlot + probe) % ring.capacity;
            if (ring.used[slot]) {
              continue;
            }
            const angle = phase + Core.TAU * slot / ring.capacity;
            const resolved = resolveUnitPosition(
              state,
              attacker,
              target.x + Math.cos(angle) * ring.radius,
              target.y + Math.sin(angle) * ring.radius,
              navigationObstacles,
              pathClearance(attacker)
            );
            if (!reservationIsClear(reservations, resolved, attacker)) {
              continue;
            }
            ring.used[slot] = 1;
            reservations.push({ x: resolved.x, y: resolved.y, radius: attacker.radius });
            attacker.approachX = resolved.x;
            attacker.approachY = resolved.y;
            assigned = true;
            break;
          }
        }

        if (!assigned) {
          // An arena can be too congested to expose another reachable slot. The
          // stable overflow behavior is to wait at a structure-safe position
          // until an earlier reservation becomes free.
          const resolved = resolveUnitPosition(
            state, attacker, attacker.x, attacker.y, navigationObstacles
          );
          attacker.approachX = resolved.x;
          attacker.approachY = resolved.y;
        }
      }
    }
  }

  function routeToward(state, unit, destination, navigationObstacles) {
    const movedDestination = !unit.order.pathTarget || Core.distanceSquared(
      unit.order.pathTarget.x, unit.order.pathTarget.y, destination.x, destination.y
    ) > 24 * 24;
    if (state.tick >= unit.repathTick || movedDestination) {
      unit.order.path = Core.findPath(unit, destination, {
        map: CONFIG.MAP,
        obstacles: navigationObstacles,
        clearance: pathClearance(unit)
      });
      unit.order.pathIndex = 0;
      unit.order.pathTarget = { x: destination.x, y: destination.y };
      unit.repathTick = state.tick + (unit.large
        ? CONFIG.COMBAT.largeRepathTicks
        : CONFIG.COMBAT.normalRepathTicks);
    }
  }

  function moveAlongPath(state, unit, destination, dynamic, navigationObstacles) {
    if (dynamic) {
      routeToward(state, unit, destination, navigationObstacles);
    } else if (!unit.order.path || unit.order.path.length === 0) {
      unit.order.path = Core.findPath(unit, destination, {
        map: CONFIG.MAP,
        obstacles: navigationObstacles,
        clearance: pathClearance(unit)
      });
      unit.order.pathIndex = 0;
    }
    const path = unit.order.path;
    let index = unit.order.pathIndex || 0;
    while (index < path.length && Core.distanceSquared(unit.x, unit.y, path[index].x, path[index].y) <=
      Math.pow(unit.speed + 2, 2)) {
      unit.x = path[index].x;
      unit.y = path[index].y;
      index += 1;
    }
    unit.order.pathIndex = index;
    if (index >= path.length) {
      return true;
    }
    const waypoint = path[index];
    const direction = Core.normalize(waypoint.x - unit.x, waypoint.y - unit.y);
    const step = Math.min(unit.speed, direction.length);
    const resolved = resolveUnitPosition(
      state,
      unit,
      unit.x + direction.x * step,
      unit.y + direction.y * step,
      navigationObstacles
    );
    unit.x = resolved.x;
    unit.y = resolved.y;
    return false;
  }

  function calculateDamage(attacker, target) {
    let multiplier = 1;
    if (attacker.role === CONFIG.ROLE.BREAKER && (target.kind === 'hq' || target.large)) {
      multiplier = CONFIG.COMBAT.breakerHeavyMultiplier;
    }
    return Math.max(1, Core.quantize(attacker.damage * multiplier - (target.armor || 0), 10));
  }

  function stageAttack(actions, attacker, target) {
    if (attacker.attackCooldown > 0) {
      return false;
    }
    const damage = calculateDamage(attacker, target);
    attacker.attackCooldown = attacker.attackTicks;
    actions.push({
      kind: 'attack',
      sourceId: attacker.id,
      targetId: target.id,
      playerId: attacker.playerId,
      damage,
      ranged: attacker.range > 40
    });
    return true;
  }

  function stageHealNearbyAlly(state, unit, actions) {
    if (unit.role !== CONFIG.ROLE.SUPPORT || unit.attackCooldown > 0 || unit.targetId !== null) {
      return false;
    }
    let ally = null;
    let bestRatio = 1;
    for (let index = 0; index < state.units.length; index += 1) {
      const candidate = state.units[index];
      if (candidate.dead || candidate.playerId !== unit.playerId || candidate.id === unit.id ||
          Core.distanceSquared(unit.x, unit.y, candidate.x, candidate.y) >
            CONFIG.COMBAT.supportHealRange * CONFIG.COMBAT.supportHealRange) {
        continue;
      }
      const ratio = candidate.hp / candidate.maxHp;
      if (ratio < bestRatio || (ratio === bestRatio && ally && candidate.id < ally.id)) {
        ally = candidate;
        bestRatio = ratio;
      }
    }
    if (!ally) {
      return false;
    }
    const amount = CONFIG.COMBAT.supportHealAmount;
    unit.attackCooldown = unit.attackTicks;
    actions.push({
      kind: 'heal',
      sourceId: unit.id,
      targetId: ally.id,
      playerId: unit.playerId,
      amount
    });
    return true;
  }

  function updateUnits(state, actions, navigationObstacles) {
    for (let index = 0; index < state.units.length; index += 1) {
      const unit = state.units[index];
      if (unit.dead) {
        continue;
      }
      unit.attackCooldown = Math.max(0, unit.attackCooldown - 1);
      const target = unit.targetId === null ? null : getEntity(state, unit.targetId);
      if (isEnemy(target, unit.playerId)) {
        const edgeDistance = Math.max(0,
          Core.distance(unit.x, unit.y, target.x, target.y) - unit.radius - target.radius
        );
        if (edgeDistance <= unit.range) {
          stageAttack(actions, unit, target);
        } else {
          moveAlongPath(state, unit, {
            x: unit.approachX === null ? target.x : unit.approachX,
            y: unit.approachY === null ? target.y : unit.approachY
          }, true, navigationObstacles);
        }
        continue;
      }
      stageHealNearbyAlly(state, unit, actions);
      if (unit.order.type === COMMAND.MOVE || unit.order.type === COMMAND.ATTACK_MOVE) {
        const arrived = moveAlongPath(state, unit, unit.order, false, navigationObstacles);
        if (arrived) {
          unit.order = { type: IDLE_ORDER, x: unit.x, y: unit.y, path: [], pathIndex: 0 };
        }
      }
    }
  }

  function separateUnits(state, navigationObstacles) {
    // Two bounded passes keep crowds readable. Large units use hard footprints;
    // normal units use soft steering and may still flow through narrow groups.
    for (let pass = 0; pass < 2; pass += 1) {
      const spatial = Core.buildSpatialHash(state.units, CONFIG.MAP.spatialCellSize);
      for (let index = 0; index < state.units.length; index += 1) {
        const unit = state.units[index];
        if (unit.dead) {
          continue;
        }
        const nearby = Core.querySpatialHash(spatial, unit.x, unit.y, unit.radius * 2 + 36);
        for (let otherIndex = 0; otherIndex < nearby.length; otherIndex += 1) {
          const other = nearby[otherIndex];
          if (other.dead || other.id <= unit.id) {
            continue;
          }
          const minimumDistance = unit.radius + other.radius + CONFIG.COMBAT.separationPadding;
          const vector = Core.normalize(other.x - unit.x, other.y - unit.y);
          if (vector.length >= minimumDistance) {
            continue;
          }
          const hard = unit.large || other.large;
          const overlap = minimumDistance - vector.length;
          const correction = hard
            ? overlap / 2 + 0.01
            : Math.min(CONFIG.COMBAT.maxSeparationPerTick, overlap * CONFIG.COMBAT.separationStrength / 2);
          const directionX = vector.length > Core.EPSILON ? vector.x : ((unit.id + other.id) & 1 ? 1 : -1);
          const directionY = vector.length > Core.EPSILON ? vector.y : 0;
          let unitShare = correction;
          let otherShare = correction;
          if (unit.large && !other.large) {
            unitShare = 0;
            otherShare = hard ? overlap + 0.01 : correction * 2;
          } else if (!unit.large && other.large) {
            unitShare = hard ? overlap + 0.01 : correction * 2;
            otherShare = 0;
          }
          const first = resolveUnitPosition(
            state, unit,
            unit.x - directionX * unitShare, unit.y - directionY * unitShare,
            navigationObstacles
          );
          const second = resolveUnitPosition(
            state, other,
            other.x + directionX * otherShare, other.y + directionY * otherShare,
            navigationObstacles
          );
          unit.x = first.x;
          unit.y = first.y;
          other.x = second.x;
          other.y = second.y;
        }
        const structureSafe = resolveUnitPosition(
          state, unit, unit.x, unit.y, navigationObstacles
        );
        unit.x = structureSafe.x;
        unit.y = structureSafe.y;
      }
    }
  }

  function updateHeadquarters(state, actions) {
    for (let index = 0; index < state.structures.length; index += 1) {
      const hq = state.structures[index];
      if (hq.dead) {
        continue;
      }
      hq.attackCooldown = Math.max(0, hq.attackCooldown - 1);
      hq.recruitCooldown = Math.max(0, hq.recruitCooldown - 1);
      if (hq.attackCooldown > 0) {
        continue;
      }
      let target = null;
      let bestDistance = Math.pow(hq.range + hq.radius, 2);
      for (let unitIndex = 0; unitIndex < state.units.length; unitIndex += 1) {
        const unit = state.units[unitIndex];
        if (!isEnemy(unit, hq.playerId)) {
          continue;
        }
        const distanceSquared = Core.distanceSquared(hq.x, hq.y, unit.x, unit.y);
        if (distanceSquared < bestDistance ||
            (distanceSquared === bestDistance && target && unit.id < target.id)) {
          target = unit;
          bestDistance = distanceSquared;
        }
      }
      if (target) {
        stageAttack(actions, hq, target);
      }
    }
  }

  function compareCombatActions(first, second) {
    return Core.compareIds(first.sourceId, second.sourceId) ||
      Core.compareIds(first.targetId, second.targetId) ||
      (first.kind < second.kind ? -1 : first.kind > second.kind ? 1 : 0);
  }

  function resolveCombat(state, actions) {
    actions.sort(compareCombatActions);
    const outcomes = Object.create(null);

    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];
      const target = getEntity(state, action.targetId);
      if (!target || target.dead) {
        continue;
      }
      const outcome = outcomes[action.targetId] = outcomes[action.targetId] || {
        damage: 0,
        healing: 0,
        contributions: Object.create(null)
      };
      if (action.kind === 'heal') {
        outcome.healing = Core.quantize(outcome.healing + action.amount, 10);
        addEvent(state, 'heal', {
          sourceId: action.sourceId,
          targetId: action.targetId,
          amount: action.amount,
          playerId: action.playerId
        });
        continue;
      }

      outcome.damage = Core.quantize(outcome.damage + action.damage, 10);
      const contribution = outcome.contributions[action.playerId] =
        outcome.contributions[action.playerId] || { damage: 0, firstSourceId: action.sourceId };
      contribution.damage = Core.quantize(contribution.damage + action.damage, 10);
      contribution.firstSourceId = Math.min(contribution.firstSourceId, action.sourceId);
      addEvent(state, 'attack', {
        sourceId: action.sourceId,
        targetId: action.targetId,
        playerId: action.playerId,
        damage: action.damage,
        ranged: action.ranged
      });
    }

    const targetIds = Object.keys(outcomes).map(Number).sort((a, b) => a - b);
    for (let index = 0; index < targetIds.length; index += 1) {
      const target = getEntity(state, targetIds[index]);
      if (!target || target.dead) {
        continue;
      }
      const outcome = outcomes[target.id];
      target.hp = Core.quantize(Core.clamp(
        target.hp - outcome.damage + outcome.healing,
        0,
        target.maxHp
      ), 10);
      if (target.hp > 0) {
        continue;
      }

      let creditedPlayerId = null;
      let creditedDamage = -1;
      let creditedSourceId = Infinity;
      const contributingPlayerIds = Object.keys(outcome.contributions).map(Number).sort((a, b) => a - b);
      for (let playerIndex = 0; playerIndex < contributingPlayerIds.length; playerIndex += 1) {
        const playerId = contributingPlayerIds[playerIndex];
        const contribution = outcome.contributions[playerId];
        if (contribution.damage > creditedDamage ||
            (contribution.damage === creditedDamage && contribution.firstSourceId < creditedSourceId)) {
          creditedPlayerId = playerId;
          creditedDamage = contribution.damage;
          creditedSourceId = contribution.firstSourceId;
        }
      }

      target.dead = true;
      const defeatedPlayer = getPlayer(state, target.playerId);
      const creditedPlayer = getPlayer(state, creditedPlayerId);
      if (target.role && defeatedPlayer) {
        defeatedPlayer.unitsLost += 1;
        if (creditedPlayer) {
          creditedPlayer.unitsDefeated += 1;
        }
      }
      addEvent(state, target.kind === 'hq' ? 'hq-destroyed' : 'unit-defeated', {
        entityId: target.id,
        playerId: target.playerId,
        byPlayerId: creditedPlayerId
      });
    }
  }

  function captureStrengths(state, site) {
    const strengths = Object.create(null);
    const radiusSquared = site.captureRadius * site.captureRadius;
    for (let index = 0; index < state.units.length; index += 1) {
      const unit = state.units[index];
      if (unit.dead || Core.distanceSquared(unit.x, unit.y, site.x, site.y) > radiusSquared) {
        continue;
      }
      strengths[unit.playerId] = (strengths[unit.playerId] || 0) + unit.captureStrength;
    }
    return Object.keys(strengths)
      .map((playerId) => ({ playerId: Number(playerId), strength: strengths[playerId] }))
      .filter((entry) => {
        const player = getPlayer(state, entry.playerId);
        return player && !player.eliminated;
      })
      .sort((a, b) => a.playerId - b.playerId);
  }

  function updateSites(state) {
    for (let index = 0; index < state.sites.length; index += 1) {
      const site = state.sites[index];
      site.recruitCooldown = Math.max(0, site.recruitCooldown - 1);
      const occupiers = captureStrengths(state, site);
      site.contested = occupiers.length > 1;
      if (occupiers.length !== 1) {
        const decay = occupiers.length > 1
          ? CONFIG.CAPTURE.contestedDecayPerTick
          : CONFIG.CAPTURE.decayPerTick;
        site.captureProgress = Core.quantize(Math.max(0, site.captureProgress - decay));
        if (site.captureProgress === 0) {
          site.capturingPlayerId = null;
        }
        continue;
      }
      const occupier = occupiers[0];
      if (site.ownerId === occupier.playerId) {
        site.captureProgress = Core.quantize(Math.max(0, site.captureProgress - CONFIG.CAPTURE.decayPerTick));
        if (site.captureProgress === 0) {
          site.capturingPlayerId = null;
        }
        continue;
      }
      if (site.capturingPlayerId !== null && site.capturingPlayerId !== occupier.playerId) {
        site.captureProgress = Core.quantize(Math.max(
          0, site.captureProgress - CONFIG.CAPTURE.decayPerTick * Math.max(1, occupier.strength)
        ));
        if (site.captureProgress === 0) {
          site.capturingPlayerId = occupier.playerId;
        }
        continue;
      }
      site.capturingPlayerId = occupier.playerId;
      const requiredTicks = site.ownerId === null ? CONFIG.CAPTURE.neutralTicks : CONFIG.CAPTURE.ownedTicks;
      site.captureProgress = Core.quantize(Math.min(
        1, site.captureProgress + Math.min(3, occupier.strength) / requiredTicks
      ));
      if (site.captureProgress >= 1) {
        const previousOwnerId = site.ownerId;
        site.ownerId = occupier.playerId;
        site.captureProgress = 0;
        site.capturingPlayerId = null;
        addEvent(state, 'site-captured', {
          siteId: site.id,
          kind: site.kind,
          playerId: occupier.playerId,
          previousOwnerId
        });
      }
    }
  }

  function recalculatePopulationCaps(state) {
    for (let playerIndex = 0; playerIndex < state.players.length; playerIndex += 1) {
      const player = state.players[playerIndex];
      let cap = CONFIG.ECONOMY.startingPopulationCap;
      let sitesOwned = 0;
      for (let siteIndex = 0; siteIndex < state.sites.length; siteIndex += 1) {
        const site = state.sites[siteIndex];
        if (site.ownerId !== player.id) {
          continue;
        }
        sitesOwned += 1;
        if (site.kind === CONFIG.SITE_KIND.RESOURCE) {
          cap += CONFIG.ECONOMY.wellPopulation;
        } else if (site.kind === CONFIG.SITE_KIND.RECRUITMENT) {
          cap += CONFIG.ECONOMY.gatePopulation;
        } else {
          cap += CONFIG.ECONOMY.objectivePopulation;
        }
      }
      player.sitesOwned = sitesOwned;
      player.populationCap = Math.min(CONFIG.ECONOMY.maximumPopulationCap, cap);
    }
  }

  function updateEconomy(state) {
    recalculatePopulationCaps(state);
    if (state.tick % CONFIG.ECONOMY.incomeTicks !== 0) {
      return;
    }
    for (let playerIndex = 0; playerIndex < state.players.length; playerIndex += 1) {
      const player = state.players[playerIndex];
      if (player.eliminated) {
        continue;
      }
      let wells = 0;
      for (let siteIndex = 0; siteIndex < state.sites.length; siteIndex += 1) {
        const site = state.sites[siteIndex];
        if (site.ownerId === player.id && site.kind === CONFIG.SITE_KIND.RESOURCE) {
          wells += 1;
        }
      }
      const income = CONFIG.ECONOMY.baseIncome + wells * CONFIG.ECONOMY.wellIncome;
      player.credits += income;
      addEvent(state, 'income', { playerId: player.id, amount: income });
    }
  }

  function cleanupDefeatedEntities(state) {
    const aliveUnits = [];
    for (let index = 0; index < state.units.length; index += 1) {
      const unit = state.units[index];
      if (unit.dead || unit.hp <= 0) {
        const player = getPlayer(state, unit.playerId);
        if (player) {
          player.population = Math.max(0, player.population - unit.populationCost);
        }
      } else {
        aliveUnits.push(unit);
      }
    }
    state.units = aliveUnits;

    for (let index = 0; index < state.structures.length; index += 1) {
      const hq = state.structures[index];
      if (hq.kind !== 'hq' || !hq.dead) {
        continue;
      }
      const player = getPlayer(state, hq.playerId);
      if (!player || player.eliminated) {
        continue;
      }
      player.eliminated = true;
      for (let unitIndex = 0; unitIndex < state.units.length; unitIndex += 1) {
        if (state.units[unitIndex].playerId === player.id) {
          state.units[unitIndex].dead = true;
        }
      }
      for (let siteIndex = 0; siteIndex < state.sites.length; siteIndex += 1) {
        if (state.sites[siteIndex].ownerId === player.id) {
          state.sites[siteIndex].ownerId = null;
          state.sites[siteIndex].captureProgress = 0;
          state.sites[siteIndex].capturingPlayerId = null;
        }
      }
      addEvent(state, 'player-eliminated', { playerId: player.id });
    }
    if (state.units.some((unit) => unit.dead)) {
      cleanupDefeatedEntities(state);
    }
  }

  function finishMatch(state, winnerId, reason) {
    if (state.status !== 'running') {
      return;
    }
    state.status = 'finished';
    state.winnerId = winnerId;
    state.victoryReason = reason;
    state.commands.length = 0;
    addEvent(state, 'match-finished', { playerId: winnerId, reason });
  }

  function objectiveOwner(state, objective) {
    const site = state.sites.find((candidate) => candidate.objective === objective);
    return site && !site.contested ? site.ownerId : null;
  }

  function updateVictory(state) {
    const alive = state.players.filter((player) => !player.eliminated);
    if (alive.length <= 1) {
      finishMatch(state, alive.length === 1 ? alive[0].id : null, 'elimination');
      return;
    }
    const mode = state.settings.mode;
    if (mode === CONFIG.MODE.CONQUEST && state.tick % CONFIG.VICTORY.conquestTickInterval === 0) {
      for (let playerIndex = 0; playerIndex < alive.length; playerIndex += 1) {
        const player = alive[playerIndex];
        let gain = 0;
        for (let siteIndex = 0; siteIndex < state.sites.length; siteIndex += 1) {
          const site = state.sites[siteIndex];
          if (site.ownerId !== player.id || site.contested) {
            continue;
          }
          gain += site.kind === CONFIG.SITE_KIND.OBJECTIVE ? 3
            : site.kind === CONFIG.SITE_KIND.RECRUITMENT ? 2 : 1;
        }
        player.score += gain;
        if (player.score >= CONFIG.VICTORY.conquestPoints) {
          finishMatch(state, player.id, 'conquest');
          return;
        }
      }
    }
    if (mode === CONFIG.MODE.KING_OF_THE_HILL) {
      const ownerId = objectiveOwner(state, 'hill');
      for (let index = 0; index < alive.length; index += 1) {
        const player = alive[index];
        player.hillTicks = ownerId === player.id ? player.hillTicks + 1 : 0;
        if (player.hillTicks >= CONFIG.VICTORY.hillHoldTicks) {
          finishMatch(state, player.id, 'king-of-the-hill');
          return;
        }
      }
    }
    if (mode === CONFIG.MODE.DOMINATION) {
      const objectives = state.sites.filter((site) => site.kind === CONFIG.SITE_KIND.OBJECTIVE);
      for (let index = 0; index < alive.length; index += 1) {
        const player = alive[index];
        const controlsAll = objectives.length > 0 && objectives.every(
          (site) => site.ownerId === player.id && !site.contested
        );
        player.dominationTicks = controlsAll ? player.dominationTicks + 1 : 0;
        if (player.dominationTicks >= CONFIG.VICTORY.dominationHoldTicks) {
          finishMatch(state, player.id, 'domination');
          return;
        }
      }
    }
  }

  function runAi(state) {
    if (state.settings.aiEnabled && AOK.AI && typeof AOK.AI.update === 'function') {
      AOK.AI.update(state);
    }
  }

  function runSingleTick(state) {
    if (state.status !== 'running') {
      return;
    }
    state.tick += 1;
    state.events = [];
    const navigationObstacles = buildNavigationObstacles(state);
    const combatActions = [];
    executeDueCommands(state, navigationObstacles);
    validateAndAcquireTargets(state);
    reserveAttackApproaches(state, navigationObstacles);
    updateUnits(state, combatActions, navigationObstacles);
    separateUnits(state, navigationObstacles);
    updateHeadquarters(state, combatActions);
    resolveCombat(state, combatActions);
    updateSites(state);
    cleanupDefeatedEntities(state);
    updateEconomy(state);
    updateVictory(state);
    state.stats.peakUnits = Math.max(state.stats.peakUnits, state.units.length);
    runAi(state);
  }

  function step(state, ticks) {
    if (!state || !Array.isArray(state.players)) {
      throw new TypeError('AOK.Simulation.step requires a match state');
    }
    const count = Core.clamp(integer(ticks, 1), 0, CONFIG.LIMITS.stepTicks);
    for (let index = 0; index < count && state.status === 'running'; index += 1) {
      runSingleTick(state);
    }
    return state;
  }

  function queryUnits(state, query) {
    const options = query || {};
    const units = state.units.filter((unit) => {
      if (unit.dead || (options.playerId !== undefined && unit.playerId !== options.playerId)) {
        return false;
      }
      if (options.role && unit.role !== options.role) {
        return false;
      }
      if (options.rect) {
        const minimumX = Math.min(options.rect.x1, options.rect.x2);
        const maximumX = Math.max(options.rect.x1, options.rect.x2);
        const minimumY = Math.min(options.rect.y1, options.rect.y2);
        const maximumY = Math.max(options.rect.y1, options.rect.y2);
        if (unit.x < minimumX || unit.x > maximumX || unit.y < minimumY || unit.y > maximumY) {
          return false;
        }
      }
      if (Number.isFinite(options.radius) && Number.isFinite(options.x) && Number.isFinite(options.y) &&
          Core.distanceSquared(unit.x, unit.y, options.x, options.y) > options.radius * options.radius) {
        return false;
      }
      return true;
    });
    return units.sort(Core.stableEntitySort);
  }

  function move(state, playerId, unitIds, x, y, executeTick) {
    return queueCommand(state, { playerId, type: COMMAND.MOVE, unitIds, x, y, executeTick });
  }

  function attackMove(state, playerId, unitIds, x, y, executeTick) {
    return queueCommand(state, { playerId, type: COMMAND.ATTACK_MOVE, unitIds, x, y, executeTick });
  }

  function stop(state, playerId, unitIds, executeTick) {
    return queueCommand(state, { playerId, type: COMMAND.STOP, unitIds, executeTick });
  }

  function recruit(state, playerId, siteId, role, executeTick) {
    return queueCommand(state, { playerId, type: COMMAND.RECRUIT, siteId, role, executeTick });
  }

  function getHeadquarters(state, playerId) {
    return state.structures.find(
      (structure) => structure.kind === 'hq' && structure.playerId === playerId && !structure.dead
    ) || null;
  }

  AOK.Simulation = Object.freeze({
    COMMAND,
    create,
    createMatch: create,
    step,
    queueCommand,
    issueCommand: queueCommand,
    move,
    attackMove,
    stop,
    recruit,
    queryUnits,
    getPlayer,
    getUnit,
    getStructure,
    getSite,
    getEntity,
    getFaction,
    getUnitType,
    getHeadquarters,
    snapshot: Core.clone,
    checksum: Core.checksum
  });
})(typeof window !== 'undefined' ? window : globalThis);
