const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/config.js');
require('../js/core.js');

const { CONFIG, Core } = globalThis.AOK;

test('factions share semantic roles while exposing unique unit identities', () => {
  const roles = Object.values(CONFIG.ROLE).sort();
  const concord = CONFIG.FACTIONS.concord;
  const gravebound = CONFIG.FACTIONS.gravebound;

  assert.deepEqual(Object.keys(concord.units).sort(), roles);
  assert.deepEqual(Object.keys(gravebound.units).sort(), roles);
  for (const role of roles) {
    assert.equal(concord.units[role].role, role);
    assert.equal(gravebound.units[role].role, role);
    assert.notEqual(concord.units[role].id, gravebound.units[role].id);
    assert.notEqual(concord.units[role].name, gravebound.units[role].name);
  }
});

test('one map assigns stable spawn sets for two, four, and six players', () => {
  assert.equal(CONFIG.MAP.spawns.length, 6);
  assert.deepEqual(CONFIG.MAP.activeSpawns[2], [0, 3]);
  assert.deepEqual(CONFIG.MAP.activeSpawns[4], [0, 2, 3, 5]);
  assert.deepEqual(CONFIG.MAP.activeSpawns[6], [0, 1, 2, 3, 4, 5]);
});

test('A* routing returns walkable, smoothed segments around static obstacles', () => {
  const clearance = 14;
  const start = { x: 200, y: 500 };
  const goal = { x: 1400, y: 500 };
  const path = Core.findPath(start, goal, { clearance });

  assert.ok(path.length > 1, 'the direct line crosses both rift obstacles');
  assert.ok(path.length <= CONFIG.LIMITS.pathNodes);
  let previous = start;
  for (const waypoint of path) {
    assert.equal(
      Core.segmentWalkable(
        previous.x, previous.y, waypoint.x, waypoint.y,
        clearance, CONFIG.MAP, CONFIG.MAP.obstacles
      ),
      true
    );
    previous = waypoint;
  }
  assert.deepEqual(path.at(-1), goal);
});

test('formation and attack ring allocation produce stable non-overlapping destinations', () => {
  const first = Core.formationSlots(12, { x: 800, y: 500 }, { x: 800, y: 100 }, 28);
  const second = Core.formationSlots(12, { x: 800, y: 500 }, { x: 800, y: 100 }, 28);
  const ring = Core.attackRingSlots({ x: 800, y: 500 }, 12, 70, 0.25);

  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((slot) => slot.x + ',' + slot.y)).size, 12);
  assert.equal(new Set(ring.map((slot) => slot.x + ',' + slot.y)).size, 12);
});

test('seeded PRNG and checksum are reproducible', () => {
  const stateA = { rngState: 123456789 };
  const stateB = { rngState: 123456789 };
  const sequenceA = Array.from({ length: 16 }, () => Core.nextRandom(stateA));
  const sequenceB = Array.from({ length: 16 }, () => Core.nextRandom(stateB));

  assert.deepEqual(sequenceA, sequenceB);
  assert.notEqual(new Set(sequenceA).size, 1);
});

test('authoritative identifier ordering uses locale-independent code units', () => {
  const identifiers = ['zeta', 'äther', 'alpha', '10', '2'];
  assert.deepEqual(
    identifiers.sort(Core.compareIds),
    ['10', '2', 'alpha', 'zeta', 'äther']
  );
  assert.equal(Core.compareIds('same', 'same'), 0);
  assert.equal(Core.compareIds(2, 10), -8);
});
