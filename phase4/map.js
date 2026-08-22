/* global window */
"use strict";

(function exposePhase4Map() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const baseMap = commonJS ? require("../phase2/map.js") : window.AeonPhase2Map;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase4Config;

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const spawnSlots = {
    "astral-headquarters-anchor": [
      [370, 275], [340, 200], [250, 165], [160, 200],
      [250, 385], [340, 350]
    ],
    "gravebound-headquarters-anchor": [
      [1302, 275], [1332, 200], [1422, 165], [1512, 200],
      [1422, 385], [1332, 350]
    ],
    "west-production-outpost-anchor": [
      [520, 690], [600, 650], [620, 590], [600, 530],
      [520, 490], [440, 530]
    ],
    "east-production-outpost-anchor": [
      [1120, 605], [1200, 565], [1220, 505], [1200, 445],
      [1120, 405], [1040, 445]
    ]
  };

  const structures = baseMap.layers.anchors.structures.map((anchor) => {
    const captureRadius = configApi.captureRadiusWorld[anchor.category] || null;
    return {
      id: anchor.id,
      category: anchor.category,
      x: anchor.x,
      y: anchor.y,
      radius: anchor.radius,
      initialOwnerSeat: anchor.seat,
      faction: anchor.faction || null,
      captureRadius,
      spawnSlots: (spawnSlots[anchor.id] || []).map(([x, y], index) => ({
        id: `${anchor.id}-spawn-${index + 1}`,
        x,
        y
      }))
    };
  }).sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0);

  const map = deepFreeze({
    ...baseMap,
    phase4: {
      schemaVersion: 1,
      structureCategories: [...configApi.structureCategories],
      structures
    }
  });

  if (commonJS) module.exports = map;
  else window.AeonPhase4Map = map;
}());
