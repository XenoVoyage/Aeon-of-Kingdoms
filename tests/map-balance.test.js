const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/config.js');
require('../js/core.js');

const { CONFIG, Core } = globalThis.AOK;
const DISTANCE_TOLERANCE = 0.001;

function distanceTo(spawn, site) {
  return Core.distance(spawn.x, spawn.y, site.x, site.y);
}

function nearestSite(spawn, kind) {
  return CONFIG.MAP.sites
    .filter((site) => site.kind === kind)
    .map((site) => ({ site, distance: distanceTo(spawn, site) }))
    .sort((left, right) => left.distance - right.distance || left.site.id.localeCompare(right.site.id))[0];
}

function approximatelyEqual(actual, expected, tolerance = DISTANCE_TOLERANCE) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test('every seat has equal nearest Well and Forge opening distances', () => {
  const wellDistances = [];
  const forgeDistances = [];

  for (const spawn of CONFIG.MAP.spawns) {
    const well = nearestSite(spawn, CONFIG.SITE_KIND.RESOURCE);
    const forge = nearestSite(spawn, CONFIG.SITE_KIND.RECRUITMENT);

    assert.equal(well.site.id, `well-${spawn.id}`);
    assert.equal(forge.site.id, `gate-${spawn.id}`);
    wellDistances.push(well.distance);
    forgeDistances.push(forge.distance);
  }

  for (const distance of wellDistances) approximatelyEqual(distance, wellDistances[0]);
  for (const distance of forgeDistances) approximatelyEqual(distance, forgeDistances[0]);
  approximatelyEqual(wellDistances[0], 153);
  approximatelyEqual(forgeDistances[0], 258);
});

test('two, four, and six-seat sets retain mirrored inward-facing geometry', () => {
  const center = { x: CONFIG.MAP.width / 2, y: CONFIG.MAP.height / 2 };

  for (const spawn of CONFIG.MAP.spawns) {
    const opposite = CONFIG.MAP.spawns[(spawn.id + 3) % CONFIG.MAP.spawns.length];
    approximatelyEqual(spawn.x + opposite.x, center.x * 2);
    approximatelyEqual(spawn.y + opposite.y, center.y * 2);
    approximatelyEqual(Math.cos(spawn.angle) + Math.cos(opposite.angle), 0);
    approximatelyEqual(Math.sin(spawn.angle) + Math.sin(opposite.angle), 0);

    const inwardDotProduct =
      Math.cos(spawn.angle) * (center.x - spawn.x) +
      Math.sin(spawn.angle) * (center.y - spawn.y);
    assert.ok(inwardDotProduct > 0, `spawn ${spawn.id} must face inward`);
  }

  for (const playerCount of [2, 4, 6]) {
    const active = CONFIG.MAP.activeSpawns[playerCount];
    assert.equal(active.length, playerCount);
    assert.equal(new Set(active).size, playerCount);
    for (const spawnId of active) {
      assert.ok(active.includes((spawnId + 3) % CONFIG.MAP.spawns.length));
    }
  }
});

test('headquarters and opening lanes keep deterministic obstacle and site clearance', () => {
  const hqClearance = CONFIG.COMBAT.hqRadius + 12;
  const largeUnitClearance = 31;

  for (const spawn of CONFIG.MAP.spawns) {
    assert.equal(
      Core.pointWalkable(spawn.x, spawn.y, hqClearance, CONFIG.MAP, CONFIG.MAP.obstacles),
      true,
      `spawn ${spawn.id} must clear the arena and static obstacles`
    );

    const localSites = [
      CONFIG.MAP.sites.find((site) => site.id === `well-${spawn.id}`),
      CONFIG.MAP.sites.find((site) => site.id === `gate-${spawn.id}`)
    ];
    for (const site of localSites) {
      const siteRadius = site.radius || 28;
      const minimumSiteClearance =
        CONFIG.COMBAT.hqRadius + siteRadius + CONFIG.CAPTURE.radius;
      assert.ok(
        distanceTo(spawn, site) >= minimumSiteClearance,
        `spawn ${spawn.id} must not overlap ${site.id}'s capture area`
      );
      assert.equal(
        Core.segmentWalkable(
          spawn.x, spawn.y, site.x, site.y,
          largeUnitClearance, CONFIG.MAP, CONFIG.MAP.obstacles
        ),
        true,
        `spawn ${spawn.id} needs a clear opening lane to ${site.id}`
      );
    }
  }
});
