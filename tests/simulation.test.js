const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/config.js');
require('../js/core.js');
require('../js/simulation.js');
require('../js/ai.js');

const { CONFIG, Core, Simulation } = globalThis.AOK;

function humanPlayers(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: 'Player ' + index,
    factionId: index % 2 ? 'gravebound' : 'concord',
    ai: false
  }));
}

test('creates bounded JSON-safe matches for every supported player count', () => {
  for (const playerCount of [2, 4, 6]) {
    const state = Simulation.create({ playerCount, players: humanPlayers(playerCount), seed: 7 });
    assert.equal(state.players.length, playerCount);
    assert.equal(state.structures.length, playerCount);
    assert.equal(state.units.length, playerCount * 5);
    assert.ok(state.units.length <= CONFIG.LIMITS.globalUnits);
    assert.doesNotThrow(() => JSON.stringify(state));
  }
  assert.throws(() => Simulation.create({ playerCount: 3 }), /2, 4, or 6/);
});

test('ordered command replay is deterministic and rejects foreign selection IDs', () => {
  const options = { playerCount: 2, players: humanPlayers(2), seed: 42 };
  const stateA = Simulation.create(options);
  const stateB = Simulation.create(options);
  const ownA = Simulation.queryUnits(stateA, { playerId: 0 }).map((unit) => unit.id);
  const ownB = Simulation.queryUnits(stateB, { playerId: 0 }).map((unit) => unit.id);
  const enemyId = Simulation.queryUnits(stateA, { playerId: 1 })[0].id;
  const enemyIdB = Simulation.queryUnits(stateB, { playerId: 1 })[0].id;

  assert.equal(Simulation.move(stateA, 0, [enemyId], 800, 500), null);
  assert.equal(Simulation.move(stateB, 0, [enemyIdB], 800, 500), null);
  assert.ok(Simulation.attackMove(stateA, 0, ownA, 800, 500));
  assert.ok(Simulation.attackMove(stateB, 0, ownB, 800, 500));
  Simulation.step(stateA, 200);
  Simulation.step(stateB, 200);

  assert.equal(Simulation.checksum(stateA), Simulation.checksum(stateB));
  assert.deepEqual(Simulation.snapshot(stateA), Simulation.snapshot(stateB));
});

test('formation movement and separation keep a selected army from collapsing to one point', () => {
  const state = Simulation.create({ playerCount: 2, players: humanPlayers(2), seed: 99 });
  const units = Simulation.queryUnits(state, { playerId: 0 });
  Simulation.move(state, 0, units.map((unit) => unit.id), 800, 500);
  Simulation.step(state, 200);

  const destinations = units.map((unit) => unit.order.x + ',' + unit.order.y);
  const positions = units.map((unit) => Core.quantize(unit.x, 10) + ',' + Core.quantize(unit.y, 10));
  assert.equal(new Set(destinations).size, units.length);
  assert.ok(new Set(positions).size >= units.length - 1);
});

test('large units use hard footprints when another unit occupies the same space', () => {
  const state = Simulation.create({ playerCount: 2, players: humanPlayers(2), seed: 5 });
  const units = Simulation.queryUnits(state, { playerId: 0 });
  const large = units[0];
  const small = units[1];
  large.large = true;
  large.radius = 23;
  small.x = large.x;
  small.y = large.y;

  Simulation.step(state, 1);
  assert.ok(Core.distance(large.x, large.y, small.x, small.y) >= large.radius + small.radius);
});

test('captured resource wells increase income and population capacity', () => {
  const state = Simulation.create({ playerCount: 2, players: humanPlayers(2), seed: 13 });
  const well = state.sites.find((site) => site.kind === CONFIG.SITE_KIND.RESOURCE);
  const units = Simulation.queryUnits(state, { playerId: 0 });
  for (let index = 0; index < units.length; index += 1) {
    units[index].x = well.x + index * 3;
    units[index].y = well.y;
    units[index].order = { type: 'idle', x: units[index].x, y: units[index].y, path: [], pathIndex: 0 };
  }
  const startingCredits = state.players[0].credits;
  Simulation.step(state, 120);

  assert.equal(well.ownerId, 0);
  assert.ok(state.players[0].populationCap > CONFIG.ECONOMY.startingPopulationCap);
  assert.ok(state.players[0].credits > startingCredits + CONFIG.ECONOMY.baseIncome);
});

test('owned headquarters recruits faction-specific units under currency and population caps', () => {
  const state = Simulation.create({ playerCount: 2, players: humanPlayers(2), seed: 17 });
  const hq = Simulation.getHeadquarters(state, 0);
  const beforeCount = state.units.length;
  const beforeCredits = state.players[0].credits;
  const role = CONFIG.ROLE.BULWARK;
  const type = Simulation.getUnitType('concord', role);

  assert.ok(Simulation.recruit(state, 0, hq.id, role));
  Simulation.step(state, 1);

  const recruited = state.units.find((unit) => unit.typeId === type.id && unit.id > beforeCount + 2);
  assert.equal(state.units.length, beforeCount + 1);
  assert.ok(recruited);
  assert.equal(recruited.name, 'Aegis Sentinel');
  assert.equal(state.players[0].credits, beforeCredits - type.cost);
});

test('headquarters destruction eliminates a player and always wins the final duel', () => {
  const state = Simulation.create({ playerCount: 2, players: humanPlayers(2), seed: 23 });
  const attacker = Simulation.queryUnits(state, { playerId: 0 })[0];
  const enemyHq = Simulation.getHeadquarters(state, 1);
  attacker.x = enemyHq.x - enemyHq.radius - attacker.radius - 10;
  attacker.y = enemyHq.y;
  attacker.range = 30;
  attacker.damage = 600;
  attacker.attackTicks = 1;
  attacker.targetId = enemyHq.id;
  attacker.order = { type: 'attackMove', x: enemyHq.x, y: enemyHq.y, path: [], pathIndex: 0 };

  Simulation.step(state, 5);
  assert.equal(state.players[1].eliminated, true);
  assert.equal(state.status, 'finished');
  assert.equal(state.winnerId, 0);
  assert.equal(state.victoryReason, 'elimination');
});

test('objective modes resolve through their own deterministic counters', () => {
  const hill = Simulation.create({
    playerCount: 2,
    players: humanPlayers(2),
    mode: CONFIG.MODE.KING_OF_THE_HILL
  });
  hill.sites.find((site) => site.objective === 'hill').ownerId = 0;
  hill.players[0].hillTicks = CONFIG.VICTORY.hillHoldTicks - 1;
  Simulation.step(hill, 1);
  assert.equal(hill.victoryReason, 'king-of-the-hill');

  const domination = Simulation.create({
    playerCount: 2,
    players: humanPlayers(2),
    mode: CONFIG.MODE.DOMINATION
  });
  domination.sites.filter((site) => site.kind === CONFIG.SITE_KIND.OBJECTIVE)
    .forEach((site) => { site.ownerId = 0; });
  domination.players[0].dominationTicks = CONFIG.VICTORY.dominationHoldTicks - 1;
  Simulation.step(domination, 1);
  assert.equal(domination.victoryReason, 'domination');

  const conquest = Simulation.create({
    playerCount: 2,
    players: humanPlayers(2),
    mode: CONFIG.MODE.CONQUEST
  });
  conquest.tick = CONFIG.VICTORY.conquestTickInterval - 1;
  conquest.players[0].score = CONFIG.VICTORY.conquestPoints - 1;
  conquest.sites[0].ownerId = 0;
  Simulation.step(conquest, 1);
  assert.equal(conquest.victoryReason, 'conquest');
});

test('AI planning is bounded and emits the same decisions for the same state', () => {
  const options = {
    playerCount: 2,
    players: [{ ai: false, factionId: 'concord' }, { ai: true, factionId: 'gravebound' }],
    seed: 101
  };
  const stateA = Simulation.create(options);
  const stateB = Simulation.create(options);
  Simulation.step(stateA, 15);
  Simulation.step(stateB, 15);

  assert.ok(stateA.stats.commandsAccepted > 0);
  assert.ok(stateA.commands.length <= CONFIG.LIMITS.queuedCommands);
  assert.deepEqual(stateA.commands, stateB.commands);
  assert.equal(Simulation.checksum(stateA), Simulation.checksum(stateB));
});
