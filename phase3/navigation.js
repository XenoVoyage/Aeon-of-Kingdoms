/* global window */
"use strict";

(function exposePhase3Navigation() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const configApi = commonJS ? require("./config.js") : window.AeonPhase3Config;

  function integerPoint(point, label) {
    if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y)) {
      throw new TypeError(`${label} must contain integer fixed-point x and y values`);
    }
  }

  function pointOnSegment(point, start, end) {
    const cross = (point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x);
    if (cross !== 0) return false;
    return (
      point.x >= Math.min(start.x, end.x)
      && point.x <= Math.max(start.x, end.x)
      && point.y >= Math.min(start.y, end.y)
      && point.y <= Math.max(start.y, end.y)
    );
  }

  function orientation(start, end, point) {
    const value = (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
    return value < 0 ? -1 : value > 0 ? 1 : 0;
  }

  function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
    const firstA = orientation(firstStart, firstEnd, secondStart);
    const firstB = orientation(firstStart, firstEnd, secondEnd);
    const secondA = orientation(secondStart, secondEnd, firstStart);
    const secondB = orientation(secondStart, secondEnd, firstEnd);
    if (firstA !== firstB && secondA !== secondB) return true;
    return (
      (firstA === 0 && pointOnSegment(secondStart, firstStart, firstEnd))
      || (firstB === 0 && pointOnSegment(secondEnd, firstStart, firstEnd))
      || (secondA === 0 && pointOnSegment(firstStart, secondStart, secondEnd))
      || (secondB === 0 && pointOnSegment(firstEnd, secondStart, secondEnd))
    );
  }

  function pointInOrOnPolygon(point, polygon) {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
      const start = polygon[previous];
      const end = polygon[index];
      if (pointOnSegment(point, start, end)) return true;
      const crosses = (end.y > point.y) !== (start.y > point.y);
      if (!crosses) continue;
      const edgeX = ((start.x - end.x) * (point.y - end.y)) / (start.y - end.y) + end.x;
      if (point.x < edgeX) inside = !inside;
    }
    return inside;
  }

  function distanceSquaredToSegment(point, start, end) {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    if (lengthSquared === 0) {
      const x = point.x - start.x;
      const y = point.y - start.y;
      return x * x + y * y;
    }
    const numerator = (point.x - start.x) * deltaX + (point.y - start.y) * deltaY;
    const projection = Math.max(0, Math.min(1, numerator / lengthSquared));
    const nearestX = start.x + projection * deltaX;
    const nearestY = start.y + projection * deltaY;
    const distanceX = point.x - nearestX;
    const distanceY = point.y - nearestY;
    return distanceX * distanceX + distanceY * distanceY;
  }

  function segmentDistanceSquared(firstStart, firstEnd, secondStart, secondEnd) {
    if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) return 0;
    return Math.min(
      distanceSquaredToSegment(firstStart, secondStart, secondEnd),
      distanceSquaredToSegment(firstEnd, secondStart, secondEnd),
      distanceSquaredToSegment(secondStart, firstStart, firstEnd),
      distanceSquaredToSegment(secondEnd, firstStart, firstEnd)
    );
  }

  function heapCompare(first, second) {
    if (first.f !== second.f) return first.f - second.f;
    if (first.h !== second.h) return first.h - second.h;
    return first.index - second.index;
  }

  function heapPush(heap, entry) {
    heap.push(entry);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (heapCompare(heap[parent], entry) <= 0) break;
      heap[index] = heap[parent];
      index = parent;
    }
    heap[index] = entry;
  }

  function heapPop(heap) {
    const root = heap[0];
    const last = heap.pop();
    if (heap.length === 0) return root;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= heap.length) break;
      const right = left + 1;
      const child = right < heap.length && heapCompare(heap[right], heap[left]) < 0 ? right : left;
      if (heapCompare(heap[child], last) >= 0) break;
      heap[index] = heap[child];
      index = child;
    }
    heap[index] = last;
    return root;
  }

  function createNavigator(map, providedConfiguration = configApi.configuration) {
    if (!map || !map.world || !map.layers?.navigation || !Array.isArray(map.layers.navigation.blockers)) {
      throw new TypeError("navigation requires one authored map with world bounds and blocker polygons");
    }
    const scale = providedConfiguration.positionScale;
    const cell = providedConfiguration.navigationCellWorld * scale;
    const worldWidth = Math.round(map.world.width * scale);
    const worldHeight = Math.round(map.world.height * scale);
    if (!Number.isSafeInteger(cell) || cell <= 0 || cell % 2 !== 0) {
      throw new RangeError("navigation cell must resolve to a positive even fixed-point integer");
    }
    if (!Number.isSafeInteger(worldWidth)
      || !Number.isSafeInteger(worldHeight)
      || worldWidth <= 0
      || worldHeight <= 0
      || worldWidth > providedConfiguration.worldExtentFixedCap
      || worldHeight > providedConfiguration.worldExtentFixedCap) {
      throw new RangeError("map world bounds exceed the safe fixed-point geometry surface");
    }
    const columns = Math.floor(worldWidth / cell);
    const rows = Math.floor(worldHeight / cell);
    const nodeCount = columns * rows;
    if (columns < 1 || rows < 1 || nodeCount > providedConfiguration.navigationNodeCap) {
      throw new RangeError("authored navigation grid exceeds the bounded Phase 3 search surface");
    }

    const blockers = map.layers.navigation.blockers.map((blocker) => {
      if (!blocker || !Array.isArray(blocker.polygon) || blocker.polygon.length < 3) {
        throw new TypeError("every blocker needs a polygon with at least three points");
      }
      return Object.freeze({
        id: String(blocker.id),
        polygon: Object.freeze(blocker.polygon.map((point) => {
          if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) {
            throw new TypeError("blocker points must be finite coordinate pairs");
          }
          const fixed = { x: Math.round(point[0] * scale), y: Math.round(point[1] * scale) };
          if (!Number.isSafeInteger(fixed.x)
            || !Number.isSafeInteger(fixed.y)
            || fixed.x < 0
            || fixed.y < 0
            || fixed.x > worldWidth
            || fixed.y > worldHeight) {
            throw new RangeError("blocker points must remain inside the bounded fixed-point world");
          }
          return Object.freeze(fixed);
        }))
      });
    });
    const clearanceCaches = new Map();

    function insideBounds(point, radius) {
      return (
        point.x - radius >= 0
        && point.y - radius >= 0
        && point.x + radius <= worldWidth
        && point.y + radius <= worldHeight
      );
    }

    function isPointClear(point, radius) {
      integerPoint(point, "navigation point");
      if (!Number.isInteger(radius) || radius < 0) throw new TypeError("footprint radius must be a non-negative integer");
      if (!insideBounds(point, radius)) return false;
      const radiusSquared = radius * radius;
      for (const blocker of blockers) {
        if (pointInOrOnPolygon(point, blocker.polygon)) return false;
        for (let index = 0; index < blocker.polygon.length; index += 1) {
          const start = blocker.polygon[index];
          const end = blocker.polygon[(index + 1) % blocker.polygon.length];
          if (distanceSquaredToSegment(point, start, end) < radiusSquared) return false;
        }
      }
      return true;
    }

    function isSegmentClear(start, end, radius) {
      integerPoint(start, "segment start");
      integerPoint(end, "segment end");
      if (!isPointClear(start, radius) || !isPointClear(end, radius)) return false;
      const radiusSquared = radius * radius;
      for (const blocker of blockers) {
        if (pointInOrOnPolygon(start, blocker.polygon) || pointInOrOnPolygon(end, blocker.polygon)) return false;
        for (let index = 0; index < blocker.polygon.length; index += 1) {
          const edgeStart = blocker.polygon[index];
          const edgeEnd = blocker.polygon[(index + 1) % blocker.polygon.length];
          if (segmentsIntersect(start, end, edgeStart, edgeEnd)) return false;
          if (segmentDistanceSquared(start, end, edgeStart, edgeEnd) < radiusSquared) return false;
        }
      }
      return true;
    }

    function nodePoint(index) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return { x: column * cell + cell / 2, y: row * cell + cell / 2 };
    }

    function clearanceForRadius(radius) {
      let cache = clearanceCaches.get(radius);
      if (cache) return cache;
      cache = new Uint8Array(nodeCount);
      for (let index = 0; index < nodeCount; index += 1) {
        cache[index] = isPointClear(nodePoint(index), radius) ? 1 : 0;
      }
      clearanceCaches.set(radius, cache);
      return cache;
    }

    function connectorIndex(point, radius, clearance) {
      let bestIndex = -1;
      let bestDistance = Infinity;
      for (let index = 0; index < nodeCount; index += 1) {
        if (clearance[index] === 0) continue;
        const candidate = nodePoint(index);
        const deltaX = point.x - candidate.x;
        const deltaY = point.y - candidate.y;
        const distance = deltaX * deltaX + deltaY * deltaY;
        if (distance > bestDistance || (distance === bestDistance && index > bestIndex)) continue;
        if (!isSegmentClear(point, candidate, radius)) continue;
        bestIndex = index;
        bestDistance = distance;
      }
      return bestIndex;
    }

    function heuristic(firstIndex, secondIndex) {
      const firstColumn = firstIndex % columns;
      const firstRow = Math.floor(firstIndex / columns);
      const secondColumn = secondIndex % columns;
      const secondRow = Math.floor(secondIndex / columns);
      const deltaX = Math.abs(firstColumn - secondColumn);
      const deltaY = Math.abs(firstRow - secondRow);
      const diagonal = Math.min(deltaX, deltaY);
      return diagonal * 14 + (Math.max(deltaX, deltaY) - diagonal) * 10;
    }

    function compressPath(start, rawWaypoints, radius) {
      const compressed = [];
      let anchor = start;
      let next = 0;
      while (next < rawWaypoints.length) {
        let farthest = -1;
        for (let candidate = rawWaypoints.length - 1; candidate >= next; candidate -= 1) {
          if (isSegmentClear(anchor, rawWaypoints[candidate], radius)) {
            farthest = candidate;
            break;
          }
        }
        if (farthest < next) return null;
        const waypoint = rawWaypoints[farthest];
        if (anchor.x !== waypoint.x || anchor.y !== waypoint.y) compressed.push({ x: waypoint.x, y: waypoint.y });
        if (compressed.length > providedConfiguration.routeWaypointCap) return null;
        anchor = waypoint;
        next = farthest + 1;
      }
      return compressed;
    }

    function findRoute(start, destination, radius) {
      integerPoint(start, "route start");
      integerPoint(destination, "route destination");
      if (!Number.isInteger(radius) || radius < 0) throw new TypeError("footprint radius must be a non-negative integer");
      if (!isPointClear(start, radius) || !isPointClear(destination, radius)) {
        return { ok: false, code: "blocked", visited: 0 };
      }
      if (isSegmentClear(start, destination, radius)) {
        return { ok: true, waypoints: [{ x: destination.x, y: destination.y }], visited: 0 };
      }

      const clearance = clearanceForRadius(radius);
      const startIndex = connectorIndex(start, radius, clearance);
      const destinationIndex = connectorIndex(destination, radius, clearance);
      if (startIndex < 0 || destinationIndex < 0) return { ok: false, code: "unreachable", visited: 0 };

      const gScore = new Float64Array(nodeCount);
      gScore.fill(Infinity);
      const cameFrom = new Int32Array(nodeCount);
      cameFrom.fill(-1);
      const closed = new Uint8Array(nodeCount);
      const open = [];
      const startingHeuristic = heuristic(startIndex, destinationIndex);
      gScore[startIndex] = 0;
      heapPush(open, { index: startIndex, g: 0, h: startingHeuristic, f: startingHeuristic });
      let visited = 0;
      const directions = [
        [0, -1, 10], [1, 0, 10], [0, 1, 10], [-1, 0, 10],
        [1, -1, 14], [1, 1, 14], [-1, 1, 14], [-1, -1, 14]
      ];

      while (open.length > 0) {
        const current = heapPop(open);
        if (closed[current.index] || current.g !== gScore[current.index]) continue;
        closed[current.index] = 1;
        visited += 1;
        if (visited > providedConfiguration.navigationNodeCap) {
          return { ok: false, code: "search-cap", visited: providedConfiguration.navigationNodeCap };
        }
        if (current.index === destinationIndex) break;

        const currentColumn = current.index % columns;
        const currentRow = Math.floor(current.index / columns);
        for (const [columnStep, rowStep, stepCost] of directions) {
          const column = currentColumn + columnStep;
          const row = currentRow + rowStep;
          if (column < 0 || row < 0 || column >= columns || row >= rows) continue;
          const neighbor = row * columns + column;
          if (!clearance[neighbor] || closed[neighbor]) continue;
          if (columnStep !== 0 && rowStep !== 0) {
            const horizontal = currentRow * columns + column;
            const vertical = row * columns + currentColumn;
            if (!clearance[horizontal] || !clearance[vertical]) continue;
          }
          if (!isSegmentClear(nodePoint(current.index), nodePoint(neighbor), radius)) continue;
          const tentative = current.g + stepCost;
          if (tentative >= gScore[neighbor]) continue;
          cameFrom[neighbor] = current.index;
          gScore[neighbor] = tentative;
          const nextHeuristic = heuristic(neighbor, destinationIndex);
          heapPush(open, { index: neighbor, g: tentative, h: nextHeuristic, f: tentative + nextHeuristic });
        }
      }

      if (!closed[destinationIndex]) return { ok: false, code: "unreachable", visited };
      const indices = [];
      let cursor = destinationIndex;
      while (cursor >= 0) {
        indices.push(cursor);
        if (cursor === startIndex) break;
        cursor = cameFrom[cursor];
        if (indices.length > providedConfiguration.navigationNodeCap) {
          return { ok: false, code: "search-cap", visited };
        }
      }
      if (indices.at(-1) !== startIndex) return { ok: false, code: "unreachable", visited };
      indices.reverse();
      const rawWaypoints = indices.map(nodePoint);
      rawWaypoints.push({ x: destination.x, y: destination.y });
      const waypoints = compressPath(start, rawWaypoints, radius);
      if (!waypoints || waypoints.length === 0) return { ok: false, code: "waypoint-cap", visited };
      return { ok: true, waypoints, visited };
    }

    return Object.freeze({
      mapId: String(map.id),
      worldWidth,
      worldHeight,
      columns,
      rows,
      nodeCount,
      isPointClear,
      isSegmentClear,
      findRoute
    });
  }

  function formationDestinations(entities, destination, providedConfiguration = configApi.configuration) {
    integerPoint(destination, "formation destination");
    if (!Array.isArray(entities) || entities.length < 1 || entities.length > providedConfiguration.selectionCap) {
      throw new RangeError("formation entity count is outside the Phase 3 selection bound");
    }
    const sorted = [...entities].sort((first, second) => configApi.compareIdentifiers(first.id, second.id));
    const maximumRadius = Math.max(...sorted.map((entity) => entity.radius));
    if (!Number.isInteger(maximumRadius) || maximumRadius <= 0) throw new TypeError("formation footprints must be positive integers");
    const spacing = maximumRadius * 2 + providedConfiguration.formationGapWorld * providedConfiguration.positionScale;
    const columns = Math.ceil(Math.sqrt(sorted.length));
    const rows = Math.ceil(sorted.length / columns);
    return sorted.map((entity, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const offsetX = ((column * 2 - (columns - 1)) * spacing) / 2;
      const offsetY = ((row * 2 - (rows - 1)) * spacing) / 2;
      return {
        entityId: entity.id,
        destination: { x: destination.x + offsetX, y: destination.y + offsetY }
      };
    });
  }

  const api = Object.freeze({ createNavigator, formationDestinations });
  if (commonJS) module.exports = api;
  else window.AeonPhase3Navigation = api;
}());
