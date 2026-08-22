/* global window */
"use strict";

(function exposePhase5Map() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const phase4Map = commonJS ? require("../phase4/map.js") : window.AeonPhase4Map;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase5Config;

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const structures = phase4Map.phase4.structures.map((structure) => ({
    ...structure,
    maximumHealth: configApi.structureHealth[structure.id]
  })).sort((first, second) => configApi.compareIdentifiers(first.id, second.id));

  const map = deepFreeze({
    ...phase4Map,
    phase5: {
      schemaVersion: 1,
      structureCategories: [...configApi.structureCategories],
      structures
    }
  });

  if (commonJS) module.exports = map;
  else window.AeonPhase5Map = map;
}());
