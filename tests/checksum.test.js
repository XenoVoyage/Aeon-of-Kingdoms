const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/config.js');
require('../js/core.js');
require('../js/simulation.js');
require('../js/ai.js');

const { CONFIG, Core, Simulation } = globalThis.AOK;

function humanPlayers() {
  return [
    { name: 'Concord', factionId: 'concord', ai: false },
    { name: 'Gravebound', factionId: 'gravebound', ai: false }
  ];
}

function createState(seed) {
  return Simulation.create({ playerCount: 2, players: humanPlayers(), ai: false, seed });
}

function reverseObjectInsertionOrder(value) {
  if (Array.isArray(value)) {
    return value.map(reverseObjectInsertionOrder);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const output = {};
  Object.keys(value).reverse().forEach((key) => {
    output[key] = reverseObjectInsertionOrder(value[key]);
  });
  return output;
}

test('checksum is stable across identical replay and object insertion order', () => {
  const stateA = createState(0x12345678);
  const stateB = createState(0x12345678);
  const unitsA = Simulation.queryUnits(stateA, { playerId: 0 }).map((unit) => unit.id);
  const unitsB = Simulation.queryUnits(stateB, { playerId: 0 }).map((unit) => unit.id);

  Simulation.attackMove(stateA, 0, unitsA, 800, 500, 4);
  Simulation.attackMove(stateB, 0, unitsB, 800, 500, 4);
  Simulation.step(stateA, 40);
  Simulation.step(stateB, 40);

  assert.equal(Core.checksum(stateA), Core.checksum(stateB));
  assert.equal(Core.checksum(stateA), Core.checksum(reverseObjectInsertionOrder(stateA)));
});

test('checksum includes queued commands and their ordered payload', () => {
  const baseline = createState(91);
  const queued = Core.clone(baseline);
  const unitId = queued.units.find((unit) => unit.playerId === 0).id;

  assert.ok(Simulation.move(queued, 0, [unitId], 760, 420, 8));
  assert.notEqual(Core.checksum(queued), Core.checksum(baseline));

  const changedPayload = Core.clone(queued);
  changedPayload.commands[0].x += 1;
  assert.notEqual(Core.checksum(changedPayload), Core.checksum(queued));

  const changedOrder = Core.clone(queued);
  changedOrder.commands.push(Object.assign({}, changedOrder.commands[0], {
    executeTick: 9,
    sequence: changedOrder.nextCommandSequence
  }));
  const reversedOrder = Core.clone(changedOrder);
  reversedOrder.commands.reverse();
  assert.notEqual(Core.checksum(changedOrder), Core.checksum(reversedOrder));
});

test('checksum covers all current state that can change later simulation outcomes', () => {
  const baseline = createState(37);
  baseline.players[1].ai = true;
  baseline.players[1].aiState = { recruitCursor: 1, lastOrderTick: 0, target: null };
  baseline.units[0].order = {
    type: Simulation.COMMAND.MOVE,
    x: 700,
    y: 450,
    path: [{ x: 500, y: 400 }, { x: 700, y: 450 }],
    pathIndex: 0,
    pathTarget: { x: 700, y: 450 }
  };

  const cases = [
    ['RNG cursor', (state) => { state.rngState ^= 0x01010101; }],
    ['player economy', (state) => { state.players[0].credits += 1; }],
    ['player AI cursor', (state) => { state.players[1].aiState.recruitCursor += 1; }],
    ['unit order destination', (state) => { state.units[0].order.x += 1; }],
    ['unit cached path', (state) => { state.units[0].order.path[0].x += 1; }],
    ['unit path cursor', (state) => { state.units[0].order.pathIndex += 1; }],
    ['unit attack cooldown', (state) => { state.units[0].attackCooldown += 1; }],
    ['unit repath tick', (state) => { state.units[0].repathTick += 1; }],
    ['site ownership', (state) => { state.sites[0].ownerId = 0; }],
    ['site capture state', (state) => { state.sites[0].captureProgress = 0.25; }],
    ['site recruit cooldown', (state) => { state.sites[0].recruitCooldown += 1; }],
    ['structure health', (state) => { state.structures[0].hp -= 1; }],
    ['structure attack cooldown', (state) => { state.structures[0].attackCooldown += 1; }],
    ['structure recruit cooldown', (state) => { state.structures[0].recruitCooldown += 1; }],
    ['next entity ID', (state) => { state.nextEntityId += 1; }],
    ['next command sequence', (state) => { state.nextCommandSequence += 1; }],
    ['configuration identity', (state) => { state.configurationHash = '00000000'; }],
    ['match mode', (state) => { state.settings.mode = CONFIG.MODE.CONQUEST; }],
    ['navigation obstacle', (state) => { state.obstacles[0].radius += 1; }]
  ];

  const baselineChecksum = Core.checksum(baseline);
  for (const [label, mutate] of cases) {
    const changed = Core.clone(baseline);
    mutate(changed);
    assert.notEqual(Core.checksum(changed), baselineChecksum, label);
  }
});

test('checksum excludes cosmetic, presentation-event, and telemetry fields', () => {
  const baseline = createState(54);
  const cosmetic = Core.clone(baseline);

  cosmetic.events.push({ tick: 0, type: 'visual-only', color: '#fff' });
  cosmetic.stats.commandsAccepted += 9;
  cosmetic.stats.peakUnits += 12;
  cosmetic.players[0].name = 'Cosmetic commander name';
  cosmetic.players[0].color = '#ffffff';
  cosmetic.players[0].sitesOwned += 7;
  cosmetic.players[0].unitsLost += 3;
  cosmetic.players[0].unitsDefeated += 4;
  cosmetic.units[0].name = 'Cosmetic unit name';
  cosmetic.units[0].symbol = 'different-symbol';
  cosmetic.structures[0].name = 'Cosmetic structure name';

  assert.equal(Core.checksum(cosmetic), Core.checksum(baseline));
});

test('checksum rejects non-JSON, non-finite, sparse, and cyclic state clearly', () => {
  const unsupported = createState(12);
  unsupported.authoritativeExtension = undefined;
  assert.throws(() => Core.checksum(unsupported), /unsupported undefined value/);

  const nonFinite = createState(12);
  nonFinite.units[0].hp = Infinity;
  assert.throws(() => Core.checksum(nonFinite), /numbers must be finite/);

  const sparse = createState(12);
  sparse.commands.length = 1;
  assert.throws(() => Core.checksum(sparse), /sparse arrays are unsupported/);

  const cyclic = createState(12);
  cyclic.authoritativeExtension = cyclic;
  assert.throws(() => Core.checksum(cyclic), /cyclic data is unsupported/);

  const symbolProperty = createState(12);
  symbolProperty.units[0][Symbol('hidden')] = 1;
  assert.throws(() => Core.checksum(symbolProperty), /symbol properties are unsupported/);
});
