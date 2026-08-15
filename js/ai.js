(function initAi(global) {
  'use strict';

  const AOK = global.AOK = global.AOK || {};
  const CONFIG = AOK.CONFIG;
  const Core = AOK.Core;
  const Simulation = AOK.Simulation;

  if (!CONFIG || !Core || !Simulation) {
    throw new Error('AOK.CONFIG, AOK.Core, and AOK.Simulation must be loaded before AOK.AI');
  }

  const RECRUIT_PATTERN = Object.freeze([
    CONFIG.ROLE.VANGUARD,
    CONFIG.ROLE.RANGER,
    CONFIG.ROLE.BULWARK,
    CONFIG.ROLE.BREAKER,
    CONFIG.ROLE.SUPPORT,
    CONFIG.ROLE.VANGUARD,
    CONFIG.ROLE.RANGER
  ]);
  const NEVER_TICK = -1;
  const MAX_PRIORITY = Number.MAX_SAFE_INTEGER;
  const MAP_DIAGONAL = Math.sqrt(
    CONFIG.MAP.width * CONFIG.MAP.width + CONFIG.MAP.height * CONFIG.MAP.height
  );
  const STRATEGY = Object.freeze({
    progressEpsilon: 0.5,
    stallTicks: CONFIG.SIMULATION_HZ * 16,
    warmupTicks: CONFIG.SIMULATION_HZ * 18,
    pressureIntervalTicks: CONFIG.SIMULATION_HZ * 38,
    objectivePressureTicks: CONFIG.SIMULATION_HZ * 11,
    conquestPressureTicks: CONFIG.SIMULATION_HZ * 9,
    eliminationPressureTicks: CONFIG.SIMULATION_HZ * 30
  });

  function finiteInteger(value, fallback) {
    return Number.isFinite(value) ? Math.floor(value) : fallback;
  }

  function jsonSafeId(value) {
    if (Number.isSafeInteger(value)) {
      return value;
    }
    return typeof value === 'string' && value.length <= CONFIG.LIMITS.siteIdLength
      ? value
      : null;
  }

  function ensureAiState(state, player) {
    const current = player.aiState && typeof player.aiState === 'object'
      ? player.aiState
      : {};
    const initialPressureTick = state.tick + STRATEGY.warmupTicks +
      player.id * CONFIG.SIMULATION_HZ;
    current.recruitCursor = Core.clamp(
      finiteInteger(current.recruitCursor, player.id % RECRUIT_PATTERN.length),
      0,
      RECRUIT_PATTERN.length - 1
    );
    current.lastOrderTick = finiteInteger(current.lastOrderTick, NEVER_TICK);
    const targetId = current.target && typeof current.target === 'object'
      ? jsonSafeId(current.target.id)
      : null;
    current.target = targetId === null
      ? null
      : { kind: String(current.target.kind || ''), id: targetId };
    current.targetSinceTick = finiteInteger(current.targetSinceTick, state.tick);
    current.lastProgressTick = finiteInteger(current.lastProgressTick, state.tick);
    current.targetProgress = Number.isFinite(current.targetProgress)
      ? current.targetProgress
      : 0;
    current.nextPressureTick = finiteInteger(current.nextPressureTick, initialPressureTick);
    current.pressureUntilTick = finiteInteger(current.pressureUntilTick, NEVER_TICK);
    current.pressureTargetId = Number.isSafeInteger(current.pressureTargetId)
      ? current.pressureTargetId
      : null;
    player.aiState = current;
    return current;
  }

  function thinkInterval(player) {
    if (player.difficulty === 'easy') {
      return CONFIG.AI.easyThinkTicks;
    }
    if (player.difficulty === 'hard') {
      return CONFIG.AI.hardThinkTicks;
    }
    return CONFIG.AI.thinkTicks;
  }

  function playerUnits(state, playerId) {
    return state.units
      .filter((unit) => !unit.dead && unit.playerId === playerId)
      .sort(Core.stableEntitySort);
  }

  function recruitSources(state, playerId) {
    const sources = [];
    const headquarters = Simulation.getHeadquarters(state, playerId);
    if (headquarters) {
      sources.push(headquarters);
    }
    for (let index = 0; index < state.sites.length; index += 1) {
      const site = state.sites[index];
      if (site.kind === CONFIG.SITE_KIND.RECRUITMENT && site.ownerId === playerId) {
        sources.push(site);
      }
    }
    return sources.sort(Core.stableEntitySort);
  }

  function chooseRecruitRole(state, player, units) {
    const counts = Object.create(null);
    for (let index = 0; index < units.length; index += 1) {
      counts[units[index].role] = (counts[units[index].role] || 0) + 1;
    }
    const ascendant = Simulation.getUnitType(player.factionId, CONFIG.ROLE.ASCENDANT);
    if (units.length >= 14 && !counts[CONFIG.ROLE.ASCENDANT] &&
        player.credits >= ascendant.cost + CONFIG.AI.reserveCredits) {
      return CONFIG.ROLE.ASCENDANT;
    }
    const cursor = (player.aiState && player.aiState.recruitCursor) || 0;
    for (let offset = 0; offset < RECRUIT_PATTERN.length; offset += 1) {
      const role = RECRUIT_PATTERN[(cursor + offset) % RECRUIT_PATTERN.length];
      const type = Simulation.getUnitType(player.factionId, role);
      if (type && player.credits >= type.cost && player.population + type.population <= player.populationCap) {
        player.aiState.recruitCursor = (cursor + offset + 1) % RECRUIT_PATTERN.length;
        return role;
      }
    }
    return null;
  }

  function tryRecruit(state, player, units) {
    if (player.credits <= CONFIG.AI.reserveCredits ||
        units.length >= CONFIG.LIMITS.unitsPerPlayer || player.population >= player.populationCap) {
      return null;
    }
    const sources = recruitSources(state, player.id).filter((source) => source.recruitCooldown <= 0);
    if (sources.length === 0) {
      return null;
    }
    const role = chooseRecruitRole(state, player, units);
    return role ? Simulation.recruit(state, player.id, sources[0].id, role) : null;
  }

  function centroid(units, fallback) {
    if (units.length === 0) {
      return fallback;
    }
    let x = 0;
    let y = 0;
    for (let index = 0; index < units.length; index += 1) {
      x += units[index].x;
      y += units[index].y;
    }
    return { x: x / units.length, y: y / units.length };
  }

  function nearbyThreat(state, playerId, origin, radius) {
    const maximumSquared = radius * radius;
    let threat = null;
    let bestDistance = maximumSquared;
    for (let index = 0; index < state.units.length; index += 1) {
      const unit = state.units[index];
      if (unit.dead || unit.playerId === playerId) {
        continue;
      }
      const distanceSquared = Core.distanceSquared(origin.x, origin.y, unit.x, unit.y);
      if (distanceSquared < bestDistance ||
          (distanceSquared === bestDistance && threat && unit.id < threat.id)) {
        threat = unit;
        bestDistance = distanceSquared;
      }
    }
    return threat;
  }

  function sitePriority(state, player, site, origin) {
    if (site.ownerId === player.id && !site.contested) {
      return -Infinity;
    }
    let value = site.kind === CONFIG.SITE_KIND.OBJECTIVE ? 440
      : site.kind === CONFIG.SITE_KIND.RECRUITMENT ? 330 : 280;
    if (site.ownerId !== null && site.ownerId !== player.id) {
      value += 90;
    }
    if (site.contested) {
      value += 120;
    }
    if (state.settings.mode === CONFIG.MODE.KING_OF_THE_HILL && site.objective === 'hill') {
      value += 520;
    } else if (state.settings.mode === CONFIG.MODE.DOMINATION && site.kind === CONFIG.SITE_KIND.OBJECTIVE) {
      value += 360;
    } else if (state.settings.mode === CONFIG.MODE.CONQUEST) {
      value += site.kind === CONFIG.SITE_KIND.OBJECTIVE ? 220 : 80;
    }
    return value - Math.sqrt(Core.distanceSquared(origin.x, origin.y, site.x, site.y)) * 0.55;
  }

  function pathIsReachable(state, unit, target) {
    const clearance = unit.radius + (unit.large ? 8 : 3);
    const goal = Core.resolveObstacleCollision(
      target.x,
      target.y,
      clearance,
      CONFIG.MAP,
      state.obstacles
    );
    if (Core.segmentWalkable(
      unit.x,
      unit.y,
      goal.x,
      goal.y,
      clearance,
      CONFIG.MAP,
      state.obstacles
    )) {
      return true;
    }
    const path = Core.findPath(unit, goal, {
      map: CONFIG.MAP,
      obstacles: state.obstacles,
      clearance
    });
    if (!Array.isArray(path) || path.length === 0) {
      return false;
    }
    let from = unit;
    for (let index = 0; index < path.length; index += 1) {
      const waypoint = path[index];
      if (!Core.segmentWalkable(
        from.x,
        from.y,
        waypoint.x,
        waypoint.y,
        clearance,
        CONFIG.MAP,
        state.obstacles
      )) {
        return false;
      }
      from = waypoint;
    }
    return true;
  }

  function reachableEnemyHeadquarters(state, player, units, origin) {
    if (units.length === 0) {
      return [];
    }
    const probe = units.slice().sort((a, b) => {
      const distanceA = Core.distanceSquared(a.x, a.y, origin.x, origin.y);
      const distanceB = Core.distanceSquared(b.x, b.y, origin.x, origin.y);
      return distanceA - distanceB || Core.compareIds(a.id, b.id);
    })[0];
    return state.structures
      .filter((structure) => structure.kind === 'hq' && !structure.dead &&
        structure.playerId !== player.id && pathIsReachable(state, probe, structure))
      .sort((a, b) => {
        const healthA = a.hp / a.maxHp;
        const healthB = b.hp / b.maxHp;
        const distanceA = Core.distanceSquared(origin.x, origin.y, a.x, a.y);
        const distanceB = Core.distanceSquared(origin.x, origin.y, b.x, b.y);
        return healthA - healthB || distanceA - distanceB ||
          a.playerId - b.playerId || Core.compareIds(a.id, b.id);
      });
  }

  function targetEntity(state, target) {
    if (!target) {
      return null;
    }
    if (target.kind === 'site') {
      return state.sites.find((site) => String(site.id) === String(target.id)) || null;
    }
    return state.units.concat(state.structures)
      .find((entity) => !entity.dead && String(entity.id) === String(target.id)) || null;
  }

  function targetProgress(state, player, units, target) {
    const entity = targetEntity(state, target);
    if (!entity || units.length === 0) {
      return 0;
    }
    let closestDistance = MAP_DIAGONAL;
    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];
      closestDistance = Math.min(
        closestDistance,
        Core.distance(unit.x, unit.y, entity.x, entity.y)
      );
    }
    const approach = MAP_DIAGONAL - closestDistance;
    if (target.kind === 'site') {
      if (entity.ownerId === player.id && !entity.contested) {
        return MAP_DIAGONAL * 3;
      }
      const capture = entity.capturingPlayerId === player.id ? entity.captureProgress : 0;
      return approach + capture * MAP_DIAGONAL;
    }
    if (target.kind === 'hq') {
      return approach + (entity.maxHp - entity.hp) * MAP_DIAGONAL;
    }
    return approach + (entity.maxHp ? entity.maxHp - entity.hp : 0) * MAP_DIAGONAL;
  }

  function updateTargetProgress(state, player, units) {
    const aiState = player.aiState;
    if (!aiState.target) {
      aiState.lastProgressTick = state.tick;
      aiState.targetProgress = 0;
      return;
    }
    const progress = targetProgress(state, player, units, aiState.target);
    if (progress > aiState.targetProgress + STRATEGY.progressEpsilon) {
      aiState.targetProgress = progress;
      aiState.lastProgressTick = state.tick;
    }
  }

  function pressureDuration(mode) {
    if (mode === CONFIG.MODE.TOTAL_DOMINATION) {
      return STRATEGY.eliminationPressureTicks;
    }
    if (mode === CONFIG.MODE.CONQUEST) {
      return STRATEGY.conquestPressureTicks;
    }
    return STRATEGY.objectivePressureTicks;
  }

  function sufficientForce(state, player) {
    const aliveCount = Math.max(1, state.players.filter((candidate) => !candidate.eliminated).length);
    const territoryThreshold = Math.max(3, Math.ceil(state.sites.length / aliveCount));
    return player.population >= CONFIG.AI.attackPopulation + 5 ||
      player.sitesOwned >= territoryThreshold;
  }

  function preparePressure(state, player, units, origin) {
    const aiState = player.aiState;
    if (aiState.pressureUntilTick < state.tick) {
      aiState.pressureUntilTick = NEVER_TICK;
      aiState.pressureTargetId = null;
    }

    const pressureActive = aiState.pressureUntilTick >= state.tick;
    const stalled = aiState.target !== null &&
      state.tick - aiState.lastProgressTick >= STRATEGY.stallTicks;
    const scheduled = sufficientForce(state, player) && state.tick >= aiState.nextPressureTick;
    if (!pressureActive && !stalled && !scheduled) {
      return null;
    }
    const headquarters = reachableEnemyHeadquarters(state, player, units, origin);
    const current = headquarters.find((candidate) => candidate.id === aiState.pressureTargetId);
    if (pressureActive && current) {
      return current;
    }
    if (pressureActive && !current && headquarters.length > 0 &&
        state.settings.mode === CONFIG.MODE.TOTAL_DOMINATION) {
      aiState.pressureTargetId = headquarters[0].id;
      return headquarters[0];
    }
    if (pressureActive && !current) {
      aiState.pressureUntilTick = NEVER_TICK;
      aiState.pressureTargetId = null;
      return null;
    }
    if (headquarters.length === 0 || (!stalled && !scheduled)) {
      return null;
    }
    const target = headquarters[0];
    aiState.pressureTargetId = target.id;
    aiState.pressureUntilTick = state.tick + pressureDuration(state.settings.mode);
    aiState.nextPressureTick = state.tick + STRATEGY.pressureIntervalTicks +
      player.id * CONFIG.SIMULATION_HZ;
    aiState.lastProgressTick = state.tick;
    return target;
  }

  function chooseStrategicTarget(state, player, units) {
    ensureAiState(state, player);
    const headquarters = Simulation.getHeadquarters(state, player.id);
    const origin = centroid(units, headquarters || { x: CONFIG.MAP.width / 2, y: CONFIG.MAP.height / 2 });
    if (headquarters) {
      const threat = nearbyThreat(state, player.id, headquarters, 285);
      if (threat) {
        return { kind: 'defend', x: threat.x, y: threat.y, id: threat.id, score: MAX_PRIORITY };
      }
    }
    const pressureTarget = preparePressure(state, player, units, origin);
    if (pressureTarget) {
      return {
        kind: 'hq',
        x: pressureTarget.x,
        y: pressureTarget.y,
        id: pressureTarget.id,
        score: MAX_PRIORITY - 1
      };
    }
    let best = null;
    for (let index = 0; index < state.sites.length; index += 1) {
      const site = state.sites[index];
      const score = sitePriority(state, player, site, origin);
      if (!best || score > best.score || (score === best.score && Core.compareIds(site.id, best.id) < 0)) {
        best = { kind: 'site', x: site.x, y: site.y, id: site.id, score };
      }
    }
    if (best && Number.isFinite(best.score)) {
      return best;
    }
    const enemyHeadquarters = reachableEnemyHeadquarters(state, player, units, origin);
    const enemy = enemyHeadquarters[0];
    return enemy ? { kind: 'hq', x: enemy.x, y: enemy.y, id: enemy.id, score: 0 } : null;
  }

  function tryOrderArmy(state, player, units) {
    if (units.length === 0) {
      return null;
    }
    updateTargetProgress(state, player, units);
    const target = chooseStrategicTarget(state, player, units);
    if (!target) {
      return null;
    }
    const force = units.filter((unit) => unit.role !== CONFIG.ROLE.SUPPORT || units.length < 5)
      .concat(units.filter((unit) => unit.role === CONFIG.ROLE.SUPPORT && units.length >= 5));
    const enoughToAttack = player.population >= CONFIG.AI.attackPopulation;
    const urgent = target.kind === 'defend';
    const idle = force.filter((unit) => unit.order.type === 'idle');
    if (!urgent && !enoughToAttack && idle.length < Math.min(3, force.length)) {
      return null;
    }
    const previous = player.aiState.target;
    const targetChanged = !previous || previous.kind !== target.kind || String(previous.id) !== String(target.id);
    const refreshDue = state.tick - player.aiState.lastOrderTick >= thinkInterval(player) * 4;
    if (!targetChanged && !refreshDue) {
      return null;
    }
    player.aiState.target = { kind: target.kind, id: target.id };
    if (targetChanged) {
      player.aiState.targetSinceTick = state.tick;
      player.aiState.lastProgressTick = state.tick;
      player.aiState.targetProgress = targetProgress(
        state,
        player,
        units,
        player.aiState.target
      );
    }
    player.aiState.lastOrderTick = state.tick;
    return Simulation.attackMove(
      state,
      player.id,
      force.map((unit) => unit.id),
      target.x,
      target.y
    );
  }

  function plan(state, player) {
    ensureAiState(state, player);
    const units = playerUnits(state, player.id);
    return {
      recruit: tryRecruit(state, player, units),
      order: tryOrderArmy(state, player, units)
    };
  }

  function update(state) {
    if (!state || state.status !== 'running') {
      return;
    }
    for (let index = 0; index < state.players.length; index += 1) {
      const player = state.players[index];
      if (!player.ai || player.eliminated) {
        continue;
      }
      const interval = thinkInterval(player);
      if ((state.tick + player.id * 5) % interval === 0) {
        plan(state, player);
      }
    }
  }

  AOK.AI = Object.freeze({
    update,
    plan,
    chooseStrategicTarget
  });
})(typeof window !== 'undefined' ? window : globalThis);
