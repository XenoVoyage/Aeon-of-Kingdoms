const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/config.js');
require('../js/core.js');
require('../js/simulation.js');

const { CONFIG, Core, Simulation } = globalThis.AOK;

function duel(startingUnits) {
  return Simulation.create({
    playerCount: 2,
    players: [
      { ai: false, factionId: 'concord' },
      { ai: false, factionId: 'gravebound' }
    ],
    ai: false,
    startingUnits
  });
}

function attackOrder(target) {
  return { type: 'attackMove', x: target.x, y: target.y, path: [], pathIndex: 0 };
}

test('mirrored lethal attacks trade units and award both defeats on the same tick', () => {
  const state = duel(1);
  const first = Simulation.queryUnits(state, { playerId: 0 })[0];
  const second = Simulation.queryUnits(state, { playerId: 1 })[0];

  Object.assign(first, {
    x: 790,
    y: 500,
    hp: 10,
    maxHp: 10,
    armor: 0,
    damage: 20,
    range: 30,
    targetId: second.id,
    attackCooldown: 0,
    order: attackOrder(second)
  });
  Object.assign(second, {
    x: 810,
    y: 500,
    hp: 10,
    maxHp: 10,
    armor: 0,
    damage: 20,
    range: 30,
    targetId: first.id,
    attackCooldown: 0,
    order: attackOrder(first)
  });

  Simulation.step(state, 1);

  assert.equal(state.units.length, 0);
  assert.deepEqual(state.players.map((player) => player.unitsLost), [1, 1]);
  assert.deepEqual(state.players.map((player) => player.unitsDefeated), [1, 1]);
  assert.deepEqual(
    state.events.filter((event) => event.type === 'unit-defeated')
      .map((event) => [event.entityId, event.byPlayerId]),
    [[first.id, 1], [second.id, 0]]
  );
});

test('equal multi-player damage credits the lowest stable source identifier', () => {
  const state = Simulation.create({
    playerCount: 4,
    players: Array.from({ length: 4 }, (_, index) => ({
      ai: false,
      factionId: index % 2 ? 'gravebound' : 'concord'
    })),
    ai: false,
    startingUnits: 1
  });
  const first = Simulation.queryUnits(state, { playerId: 0 })[0];
  const second = Simulation.queryUnits(state, { playerId: 1 })[0];
  const target = Simulation.queryUnits(state, { playerId: 2 })[0];

  Object.assign(target, {
    x: 800,
    y: 500,
    hp: 15,
    maxHp: 15,
    armor: 0,
    attackCooldown: 100,
    targetId: null,
    order: { type: 'idle', x: 800, y: 500, path: [], pathIndex: 0 }
  });
  for (const [index, attacker] of [first, second].entries()) {
    Object.assign(attacker, {
      x: 780 + index * 40,
      y: 500,
      damage: 10,
      range: 30,
      targetId: target.id,
      attackCooldown: 0,
      order: attackOrder(target)
    });
  }
  state.units = [first, second, target].sort(Core.stableEntitySort);

  Simulation.step(state, 1);

  const defeated = state.events.find(
    (event) => event.type === 'unit-defeated' && event.entityId === target.id
  );
  assert.equal(defeated.byPlayerId, first.playerId);
  assert.equal(state.players[first.playerId].unitsDefeated, 1);
  assert.equal(state.players[second.playerId].unitsDefeated, 0);
});

test('support healing and incoming damage resolve together instead of by entity order', () => {
  const state = duel(5);
  const allies = Simulation.queryUnits(state, { playerId: 0 });
  const victim = allies[0];
  const support = allies.find((unit) => unit.role === CONFIG.ROLE.SUPPORT);
  const attacker = Simulation.queryUnits(state, { playerId: 1 })[0];

  Object.assign(victim, {
    x: 790,
    y: 500,
    hp: 5,
    maxHp: 100,
    armor: 0,
    targetId: null,
    order: { type: 'idle', x: 790, y: 500, path: [], pathIndex: 0 }
  });
  Object.assign(support, {
    x: 760,
    y: 500,
    targetId: null,
    attackCooldown: 0,
    order: { type: 'idle', x: 760, y: 500, path: [], pathIndex: 0 }
  });
  Object.assign(attacker, {
    x: 810,
    y: 500,
    damage: 10,
    range: 30,
    targetId: victim.id,
    attackCooldown: 0,
    order: attackOrder(victim)
  });
  state.units = [victim, support, attacker].sort(Core.stableEntitySort);

  Simulation.step(state, 1);

  assert.equal(victim.dead, false);
  assert.equal(victim.hp, 3);
  assert.deepEqual(
    state.events.filter((event) => event.type === 'attack' || event.type === 'heal')
      .map((event) => event.type),
    ['heal', 'attack']
  );
});

test('simultaneous destruction of the final headquarters finishes as an elimination tie', () => {
  const state = duel(1);
  const first = Simulation.queryUnits(state, { playerId: 0 })[0];
  const second = Simulation.queryUnits(state, { playerId: 1 })[0];
  const firstHq = Simulation.getHeadquarters(state, 0);
  const secondHq = Simulation.getHeadquarters(state, 1);

  Object.assign(first, {
    x: secondHq.x,
    y: secondHq.y - secondHq.radius - first.radius - 1,
    damage: 5000,
    range: 30,
    targetId: secondHq.id,
    attackCooldown: 0,
    order: attackOrder(secondHq)
  });
  Object.assign(second, {
    x: firstHq.x,
    y: firstHq.y + firstHq.radius + second.radius + 1,
    damage: 5000,
    range: 30,
    targetId: firstHq.id,
    attackCooldown: 0,
    order: attackOrder(firstHq)
  });

  Simulation.step(state, 1);

  assert.equal(firstHq.dead, true);
  assert.equal(secondHq.dead, true);
  assert.deepEqual(state.players.map((player) => player.eliminated), [true, true]);
  assert.equal(state.status, 'finished');
  assert.equal(state.winnerId, null);
  assert.equal(state.victoryReason, 'elimination');
  assert.deepEqual(
    state.events.filter((event) => event.type === 'hq-destroyed')
      .map((event) => [event.entityId, event.byPlayerId]),
    [[firstHq.id, 1], [secondHq.id, 0]]
  );
});

test('48 attackers use bounded multi-ring approaches outside the headquarters footprint', () => {
  const state = duel(1);
  const template = Simulation.queryUnits(state, { playerId: 0 })[0];
  const target = Simulation.getHeadquarters(state, 1);
  target.hp = 1000000;
  target.maxHp = 1000000;

  state.units = Array.from({ length: CONFIG.LIMITS.unitsPerPlayer }, (_, index) => {
    const unit = Core.clone(template);
    Object.assign(unit, {
      id: 100 + index,
      x: 650 + (index % 8) * 42,
      y: 540 + Math.floor(index / 8) * 30,
      hp: unit.maxHp,
      targetId: target.id,
      approachX: null,
      approachY: null,
      attackCooldown: 0,
      repathTick: 0,
      dead: false,
      order: attackOrder(target)
    });
    return unit;
  });
  state.nextEntityId = 100 + state.units.length;
  state.players[0].population = state.units.length;
  state.players[0].populationCap = CONFIG.ECONOMY.maximumPopulationCap;
  state.players[1].population = 0;

  Simulation.step(state, CONFIG.LIMITS.stepTicks);

  const attackers = Simulation.queryUnits(state, { playerId: 0 });
  const exactPositions = new Set(attackers.map((unit) => unit.x + ',' + unit.y));
  let overlappingPairs = 0;
  const overlapsByUnit = new Uint8Array(attackers.length);
  for (let firstIndex = 0; firstIndex < attackers.length; firstIndex += 1) {
    const first = attackers[firstIndex];
    const structureDistance = Core.distance(first.x, first.y, target.x, target.y);
    assert.ok(
      structureDistance + 0.001 >= target.radius + first.radius,
      'unit ' + first.id + ' entered the living headquarters footprint'
    );
    for (let secondIndex = firstIndex + 1; secondIndex < attackers.length; secondIndex += 1) {
      const second = attackers[secondIndex];
      if (Core.distance(first.x, first.y, second.x, second.y) + 0.001 <
          first.radius + second.radius) {
        overlappingPairs += 1;
        overlapsByUnit[firstIndex] += 1;
        overlapsByUnit[secondIndex] += 1;
      }
    }
  }

  assert.equal(attackers.length, CONFIG.LIMITS.unitsPerPlayer);
  assert.equal(exactPositions.size, attackers.length);
  assert.ok(overlappingPairs <= attackers.length / 8);
  assert.ok(Math.max(...overlapsByUnit) <= 2);
});
