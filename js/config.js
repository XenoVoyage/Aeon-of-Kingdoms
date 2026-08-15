(function initConfig(global) {
  'use strict';

  const AOK = global.AOK = global.AOK || {};

  const ROLE = Object.freeze({
    VANGUARD: 'vanguard',
    RANGER: 'ranger',
    BULWARK: 'bulwark',
    BREAKER: 'breaker',
    SUPPORT: 'support',
    ASCENDANT: 'ascendant'
  });

  const MODE = Object.freeze({
    TOTAL_DOMINATION: 'total-domination',
    CONQUEST: 'conquest',
    KING_OF_THE_HILL: 'king-of-the-hill',
    DOMINATION: 'domination'
  });

  const SITE_KIND = Object.freeze({
    RESOURCE: 'resource',
    RECRUITMENT: 'recruitment',
    OBJECTIVE: 'objective'
  });

  function unit(id, name, role, symbol, stats) {
    return Object.freeze(Object.assign({
      id,
      name,
      role,
      symbol,
      cost: 50,
      population: 1,
      maxHp: 100,
      speed: 3.2,
      radius: 10,
      range: 22,
      damage: 12,
      attackTicks: 20,
      sight: 170,
      capture: 1,
      armor: 0,
      projectileSpeed: 0,
      large: false
    }, stats));
  }

  const FACTIONS = Object.freeze({
    concord: Object.freeze({
      id: 'concord',
      name: 'Astral Concord',
      shortName: 'Concord',
      description: 'Disciplined starborn humanity combining ancient steel with luminous technology.',
      primary: '#5de4ff',
      secondary: '#8b6cff',
      units: Object.freeze({
        [ROLE.VANGUARD]: unit('concord-legionnaire', 'Astral Legionnaire', ROLE.VANGUARD, 'V', {
          cost: 45, maxHp: 120, speed: 3.4, damage: 13, attackTicks: 18, armor: 1
        }),
        [ROLE.RANGER]: unit('concord-starbow', 'Starbow Ranger', ROLE.RANGER, 'R', {
          cost: 55, maxHp: 82, speed: 3.5, radius: 9, range: 132, damage: 11,
          attackTicks: 22, sight: 220, projectileSpeed: 16
        }),
        [ROLE.BULWARK]: unit('concord-aegis', 'Aegis Sentinel', ROLE.BULWARK, 'B', {
          cost: 75, population: 2, maxHp: 240, speed: 2.35, radius: 14, damage: 10,
          attackTicks: 24, armor: 4, capture: 1.4
        }),
        [ROLE.BREAKER]: unit('concord-lancer', 'Sunforged Lancer', ROLE.BREAKER, 'K', {
          cost: 85, population: 2, maxHp: 145, speed: 3.05, radius: 12, damage: 29,
          attackTicks: 30, armor: 1
        }),
        [ROLE.SUPPORT]: unit('concord-luminary', 'Luminary', ROLE.SUPPORT, 'S', {
          cost: 70, maxHp: 88, speed: 3.25, radius: 10, range: 94, damage: 7,
          attackTicks: 26, capture: 1.8, projectileSpeed: 13
        }),
        [ROLE.ASCENDANT]: unit('concord-titan', 'Solar Titan', ROLE.ASCENDANT, 'A', {
          cost: 180, population: 4, maxHp: 520, speed: 1.85, radius: 23, range: 62,
          damage: 44, attackTicks: 34, sight: 210, armor: 6, capture: 2.2, large: true
        })
      })
    }),
    gravebound: Object.freeze({
      id: 'gravebound',
      name: 'Gravebound Court',
      shortName: 'Gravebound',
      description: 'An undying court whose silent legions bend void and bone to their will.',
      primary: '#a879ff',
      secondary: '#35f2c1',
      units: Object.freeze({
        [ROLE.VANGUARD]: unit('gravebound-hollowblade', 'Hollowblade', ROLE.VANGUARD, 'V', {
          cost: 42, maxHp: 108, speed: 3.6, damage: 12, attackTicks: 16
        }),
        [ROLE.RANGER]: unit('gravebound-wraithbow', 'Wraithbow', ROLE.RANGER, 'R', {
          cost: 56, maxHp: 76, speed: 3.55, radius: 9, range: 142, damage: 10,
          attackTicks: 21, sight: 225, projectileSpeed: 17
        }),
        [ROLE.BULWARK]: unit('gravebound-colossus', 'Bone Colossus', ROLE.BULWARK, 'B', {
          cost: 78, population: 2, maxHp: 260, speed: 2.18, radius: 15, damage: 11,
          attackTicks: 25, armor: 4, capture: 1.3
        }),
        [ROLE.BREAKER]: unit('gravebound-reaver', 'Crypt Reaver', ROLE.BREAKER, 'K', {
          cost: 88, population: 2, maxHp: 132, speed: 3.15, radius: 12, damage: 32,
          attackTicks: 31
        }),
        [ROLE.SUPPORT]: unit('gravebound-binder', 'Veil Binder', ROLE.SUPPORT, 'S', {
          cost: 68, maxHp: 92, speed: 3.1, radius: 10, range: 90, damage: 7,
          attackTicks: 25, capture: 1.9, projectileSpeed: 12
        }),
        [ROLE.ASCENDANT]: unit('gravebound-sovereign', 'Dread Sovereign', ROLE.ASCENDANT, 'A', {
          cost: 185, population: 4, maxHp: 490, speed: 1.95, radius: 23, range: 56,
          damage: 49, attackTicks: 36, sight: 215, armor: 5, capture: 2.4, large: true
        })
      })
    })
  });

  function playerSpawn(id, x, y, angle) {
    return Object.freeze({ id, x, y, angle });
  }

  const SPAWNS = Object.freeze([
    // Fixed radian literals keep the multiplayer configuration hash independent
    // of engine-specific transcendental rounding during configuration load.
    playerSpawn(0, 800, 92, 1.570796327),
    playerSpawn(1, 1178.345, 212.228, 2.491337313),
    playerSpawn(2, 1178.345, 787.772, -2.491337313),
    playerSpawn(3, 800, 908, -1.570796327),
    playerSpawn(4, 421.655, 787.772, -0.650255341),
    playerSpawn(5, 421.655, 212.228, 0.650255341)
  ]);

  const ACTIVE_SPAWNS = Object.freeze({
    2: Object.freeze([0, 3]),
    4: Object.freeze([0, 2, 3, 5]),
    6: Object.freeze([0, 1, 2, 3, 4, 5])
  });

  const SITES = Object.freeze([
    // Outer resource wells: one readable expansion sector per spawn.
    Object.freeze({ id: 'well-0', kind: SITE_KIND.RESOURCE, x: 800, y: 245 }),
    Object.freeze({ id: 'well-1', kind: SITE_KIND.RESOURCE, x: 1170, y: 365 }),
    Object.freeze({ id: 'well-2', kind: SITE_KIND.RESOURCE, x: 1170, y: 635 }),
    Object.freeze({ id: 'well-3', kind: SITE_KIND.RESOURCE, x: 800, y: 755 }),
    Object.freeze({ id: 'well-4', kind: SITE_KIND.RESOURCE, x: 430, y: 635 }),
    Object.freeze({ id: 'well-5', kind: SITE_KIND.RESOURCE, x: 430, y: 365 }),
    // Forward gates create a second recruitment front without base building.
    Object.freeze({ id: 'gate-0', kind: SITE_KIND.RECRUITMENT, x: 800, y: 350 }),
    Object.freeze({ id: 'gate-1', kind: SITE_KIND.RECRUITMENT, x: 1040, y: 430 }),
    Object.freeze({ id: 'gate-2', kind: SITE_KIND.RECRUITMENT, x: 1040, y: 570 }),
    Object.freeze({ id: 'gate-3', kind: SITE_KIND.RECRUITMENT, x: 800, y: 650 }),
    Object.freeze({ id: 'gate-4', kind: SITE_KIND.RECRUITMENT, x: 560, y: 570 }),
    Object.freeze({ id: 'gate-5', kind: SITE_KIND.RECRUITMENT, x: 560, y: 430 }),
    // The Crown is the KOTH point; three seals power Domination.
    Object.freeze({ id: 'crown', kind: SITE_KIND.OBJECTIVE, objective: 'hill', x: 800, y: 500, radius: 48 }),
    Object.freeze({ id: 'seal-nw', kind: SITE_KIND.OBJECTIVE, objective: 'seal', x: 675, y: 430, radius: 34 }),
    Object.freeze({ id: 'seal-e', kind: SITE_KIND.OBJECTIVE, objective: 'seal', x: 950, y: 500, radius: 34 }),
    Object.freeze({ id: 'seal-sw', kind: SITE_KIND.OBJECTIVE, objective: 'seal', x: 675, y: 570, radius: 34 })
  ]);

  const OBSTACLES = Object.freeze([
    Object.freeze({ id: 'spire-nw', shape: 'circle', x: 610, y: 310, radius: 48 }),
    Object.freeze({ id: 'spire-ne', shape: 'circle', x: 990, y: 310, radius: 48 }),
    Object.freeze({ id: 'spire-se', shape: 'circle', x: 990, y: 690, radius: 48 }),
    Object.freeze({ id: 'spire-sw', shape: 'circle', x: 610, y: 690, radius: 48 }),
    Object.freeze({ id: 'rift-w', shape: 'rect', x: 315, y: 475, width: 125, height: 50 }),
    Object.freeze({ id: 'rift-e', shape: 'rect', x: 1160, y: 475, width: 125, height: 50 })
  ]);

  const STARTING_ROLES = Object.freeze([
    ROLE.VANGUARD,
    ROLE.VANGUARD,
    ROLE.RANGER,
    ROLE.RANGER,
    ROLE.SUPPORT
  ]);

  AOK.CONFIG = Object.freeze({
    VERSION: 1,
    SIMULATION_HZ: 20,
    TICK_MS: 50,
    MAX_CATCH_UP_TICKS: 5,
    RENDER: Object.freeze({
      maximumDevicePixelRatio: 2,
      maximumBackingPixels: 5200000,
      starCount: 220
    }),
    ROLE,
    MODE,
    SITE_KIND,
    FACTIONS,
    FACTION_IDS: Object.freeze(Object.keys(FACTIONS)),
    MAP: Object.freeze({
      id: 'aeon-convergence',
      name: 'Aeon Convergence',
      width: 1600,
      height: 1000,
      padding: 30,
      gridSize: 40,
      spatialCellSize: 56,
      spawns: SPAWNS,
      activeSpawns: ACTIVE_SPAWNS,
      sites: SITES,
      obstacles: OBSTACLES
    }),
    LIMITS: Object.freeze({
      minPlayers: 2,
      maxPlayers: 6,
      globalUnits: 240,
      unitsPerPlayer: 48,
      queuedCommands: 512,
      commandsPerTick: 64,
      unitIdsPerCommand: 48,
      commandLeadTicks: 80,
      pathNodes: 96,
      projectiles: 256,
      events: 96,
      stepTicks: 200,
      playerNameLength: 28,
      siteIdLength: 40
    }),
    ECONOMY: Object.freeze({
      startingCredits: 185,
      baseIncome: 7,
      wellIncome: 6,
      incomeTicks: 20,
      startingPopulationCap: 24,
      wellPopulation: 4,
      gatePopulation: 2,
      objectivePopulation: 1,
      maximumPopulationCap: 48,
      recruitCooldownTicks: 12,
      startingRoles: STARTING_ROLES,
      startingFormationDistance: 72,
      startingFormationSpacing: 26
    }),
    CAPTURE: Object.freeze({
      radius: 72,
      neutralTicks: 100,
      ownedTicks: 140,
      decayPerTick: 0.004,
      contestedDecayPerTick: 0.0015
    }),
    COMBAT: Object.freeze({
      acquireTicks: 8,
      leashDistance: 260,
      separationPadding: 4,
      separationStrength: 0.38,
      maxSeparationPerTick: 2.4,
      hqMaxHp: 1700,
      hqArmor: 3,
      hqRadius: 36,
      hqRange: 145,
      hqDamage: 9,
      hqAttackTicks: 24,
      breakerHeavyMultiplier: 1.45,
      attackRingRangeFactor: 0.82,
      supportHealRange: 105,
      supportHealAmount: 8,
      normalRepathTicks: 12,
      largeRepathTicks: 8
    }),
    VICTORY: Object.freeze({
      conquestPoints: 650,
      conquestTickInterval: 20,
      hillHoldTicks: 20 * 150,
      dominationHoldTicks: 20 * 75
    }),
    AI: Object.freeze({
      thinkTicks: 20,
      easyThinkTicks: 36,
      hardThinkTicks: 14,
      attackPopulation: 9,
      reserveCredits: 35
    }),
    PLAYER_COLORS: Object.freeze(['#55dfff', '#a879ff', '#ff668e', '#ffc857', '#42e6a4', '#ff8c42'])
  });
})(typeof window !== 'undefined' ? window : globalThis);
