const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/config.js');
require('../js/core.js');
require('../js/simulation.js');
require('../js/ai.js');

const { AI, CONFIG, Simulation } = globalThis.AOK;

function aiPlayers(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: 'CPU ' + index,
    factionId: index % 2 ? 'gravebound' : 'concord',
    ai: true,
    difficulty: 'normal'
  }));
}

function createAiMatch(playerCount, mode, seed) {
  return Simulation.create({
    playerCount,
    players: aiPlayers(playerCount),
    mode,
    seed
  });
}

function assertFiniteNumbers(value, path) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), path + ' must be finite');
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertFiniteNumbers(child, path + '.' + key);
  }
}

test('every AI strategy state is finite and survives a JSON snapshot round-trip', () => {
  const idleState = createAiMatch(2, CONFIG.MODE.TOTAL_DOMINATION, 11);
  const idlePlayer = idleState.players[0];
  idlePlayer.aiState = { lastOrderTick: -Infinity };
  idleState.units = idleState.units.filter((unit) => unit.playerId !== idlePlayer.id);
  AI.plan(idleState, idlePlayer);

  const siteState = createAiMatch(2, CONFIG.MODE.CONQUEST, 12);
  AI.plan(siteState, siteState.players[0]);
  assert.equal(siteState.players[0].aiState.target.kind, 'site');

  const defendState = createAiMatch(2, CONFIG.MODE.KING_OF_THE_HILL, 13);
  const defender = defendState.players[0];
  const defenderHq = Simulation.getHeadquarters(defendState, defender.id);
  const threat = Simulation.queryUnits(defendState, { playerId: 1 })[0];
  threat.x = defenderHq.x + 80;
  threat.y = defenderHq.y;
  AI.plan(defendState, defender);
  assert.equal(defender.aiState.target.kind, 'defend');

  const pressureState = createAiMatch(4, CONFIG.MODE.DOMINATION, 14);
  const attacker = pressureState.players[0];
  AI.plan(pressureState, attacker);
  attacker.population = CONFIG.AI.attackPopulation + 5;
  attacker.aiState.nextPressureTick = pressureState.tick;
  attacker.aiState.lastOrderTick = -1;
  AI.plan(pressureState, attacker);
  assert.equal(attacker.aiState.target.kind, 'hq');

  for (const state of [idleState, siteState, defendState, pressureState]) {
    for (const player of state.players) {
      if (player.aiState) {
        assertFiniteNumbers(player.aiState, 'aiState[' + player.id + ']');
      }
    }
    const snapshot = Simulation.snapshot(state);
    assert.deepEqual(snapshot, JSON.parse(JSON.stringify(snapshot)));
  }
});

test('HQ pressure selects the same reachable target across repeated decisions', () => {
  const state = createAiMatch(4, CONFIG.MODE.TOTAL_DOMINATION, 31);
  const player = state.players[0];
  AI.plan(state, player);
  player.population = CONFIG.AI.attackPopulation + 5;
  player.aiState.nextPressureTick = state.tick;

  const units = Simulation.queryUnits(state, { playerId: player.id });
  const first = AI.chooseStrategicTarget(state, player, units);
  const second = AI.chooseStrategicTarget(state, player, units.slice().reverse());

  assert.equal(first.kind, 'hq');
  assert.deepEqual(second, first);
  assert.notEqual(Simulation.getStructure(state, first.id).playerId, player.id);
});

test('objective modes return to contested objectives between bounded HQ pressure waves', () => {
  for (const mode of [CONFIG.MODE.KING_OF_THE_HILL, CONFIG.MODE.DOMINATION]) {
    const state = createAiMatch(4, mode, 47);
    const player = state.players[0];
    AI.plan(state, player);
    player.population = CONFIG.AI.attackPopulation + 5;
    player.aiState.nextPressureTick = state.tick;
    const units = Simulation.queryUnits(state, { playerId: player.id });

    const pressure = AI.chooseStrategicTarget(state, player, units);
    assert.equal(pressure.kind, 'hq');

    state.tick = player.aiState.pressureUntilTick + 1;
    player.aiState.lastProgressTick = state.tick;
    const objective = AI.chooseStrategicTarget(state, player, units);
    const site = Simulation.getSite(state, objective.id);

    assert.equal(objective.kind, 'site');
    assert.equal(site.kind, CONFIG.SITE_KIND.OBJECTIVE);
    if (mode === CONFIG.MODE.KING_OF_THE_HILL) {
      assert.equal(site.objective, 'hill');
    }
  }
});

test('all exposed modes make bounded deterministic match progress for two and four players', () => {
  const horizonTicks = 6000;
  for (const playerCount of [2, 4]) {
    for (const mode of Object.values(CONFIG.MODE)) {
      const state = createAiMatch(playerCount, mode, 101);
      const initialHealth = new Map(state.structures.map((hq) => [hq.id, hq.hp]));

      while (state.status === 'running' && state.tick < horizonTicks) {
        Simulation.step(state, Math.min(CONFIG.LIMITS.stepTicks, horizonTicks - state.tick));
      }

      const headquartersDamaged = state.structures.some(
        (hq) => hq.hp < initialHealth.get(hq.id)
      );
      const playerEliminated = state.players.some((player) => player.eliminated);
      const label = playerCount + '-player ' + mode;
      assert.ok(
        state.status === 'finished' || headquartersDamaged || playerEliminated,
        label + ' neither finished nor applied headquarters pressure by tick ' + horizonTicks
      );
      if (mode === CONFIG.MODE.TOTAL_DOMINATION) {
        assert.equal(state.status, 'finished', label + ' did not complete by the deterministic horizon');
        assert.equal(state.victoryReason, 'elimination');
      }
      assert.ok(state.commands.length <= CONFIG.LIMITS.queuedCommands, label + ' exceeded the command cap');
      assert.ok(state.units.length <= CONFIG.LIMITS.globalUnits, label + ' exceeded the unit cap');
    }
  }
});
