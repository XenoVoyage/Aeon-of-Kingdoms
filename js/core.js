(function initCore(global) {
  'use strict';

  const AOK = global.AOK = global.AOK || {};
  const CONFIG = AOK.CONFIG;

  if (!CONFIG) {
    throw new Error('AOK.CONFIG must be loaded before AOK.Core');
  }

  const EPSILON = 1e-7;
  const TAU = Math.PI * 2;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function quantize(value, precision) {
    const step = precision || 1000;
    return Math.round(value * step) / step;
  }

  function distanceSquared(aX, aY, bX, bY) {
    const dx = bX - aX;
    const dy = bY - aY;
    return dx * dx + dy * dy;
  }

  function distance(aX, aY, bX, bY) {
    return Math.sqrt(distanceSquared(aX, aY, bX, bY));
  }

  function normalize(dx, dy) {
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < EPSILON) {
      return { x: 0, y: 0, length: 0 };
    }
    return { x: dx / length, y: dy / length, length };
  }

  function compareIds(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    const left = String(a);
    const right = String(b);
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  }

  function stableEntitySort(a, b) {
    return compareIds(a.id, b.id);
  }

  function uniqueSortedIds(ids, maximum) {
    const seen = Object.create(null);
    const output = [];
    const limit = Math.min(Array.isArray(ids) ? ids.length : 0, maximum || Infinity);
    for (let index = 0; index < limit; index += 1) {
      const id = Number(ids[index]);
      if (!Number.isSafeInteger(id) || id < 0 || seen[id]) {
        continue;
      }
      seen[id] = true;
      output.push(id);
    }
    output.sort((a, b) => a - b);
    return output;
  }

  function nextRandom(state) {
    let value = state.rngState >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    state.rngState = value >>> 0 || 0x6d2b79f5;
    return state.rngState;
  }

  function randomFloat(state) {
    return nextRandom(state) / 0x100000000;
  }

  function randomInt(state, minimum, maximumExclusive) {
    const span = Math.max(1, maximumExclusive - minimum);
    return minimum + Math.floor(randomFloat(state) * span);
  }

  function pointInsideObstacle(x, y, clearance, obstacle) {
    if (obstacle.shape === 'circle') {
      const radius = obstacle.radius + clearance;
      return distanceSquared(x, y, obstacle.x, obstacle.y) < radius * radius;
    }
    const halfWidth = obstacle.width / 2 + clearance;
    const halfHeight = obstacle.height / 2 + clearance;
    return x > obstacle.x - halfWidth && x < obstacle.x + halfWidth &&
      y > obstacle.y - halfHeight && y < obstacle.y + halfHeight;
  }

  function pointWalkable(x, y, clearance, map, obstacles) {
    const arena = map || CONFIG.MAP;
    const blockers = obstacles || arena.obstacles;
    const padding = arena.padding + clearance;
    if (x < padding || x > arena.width - padding || y < padding || y > arena.height - padding) {
      return false;
    }
    for (let index = 0; index < blockers.length; index += 1) {
      if (pointInsideObstacle(x, y, clearance, blockers[index])) {
        return false;
      }
    }
    return true;
  }

  function segmentCircleBlocked(aX, aY, bX, bY, obstacle, clearance) {
    const abX = bX - aX;
    const abY = bY - aY;
    const lengthSquared = abX * abX + abY * abY;
    const projection = lengthSquared < EPSILON ? 0 : clamp(
      ((obstacle.x - aX) * abX + (obstacle.y - aY) * abY) / lengthSquared,
      0,
      1
    );
    const closestX = aX + abX * projection;
    const closestY = aY + abY * projection;
    const radius = obstacle.radius + clearance;
    return distanceSquared(closestX, closestY, obstacle.x, obstacle.y) < radius * radius;
  }

  function segmentRectBlocked(aX, aY, bX, bY, obstacle, clearance) {
    const minimumX = obstacle.x - obstacle.width / 2 - clearance;
    const maximumX = obstacle.x + obstacle.width / 2 + clearance;
    const minimumY = obstacle.y - obstacle.height / 2 - clearance;
    const maximumY = obstacle.y + obstacle.height / 2 + clearance;
    const deltaX = bX - aX;
    const deltaY = bY - aY;
    let lower = 0;
    let upper = 1;
    const boundaries = [
      [-deltaX, aX - minimumX],
      [deltaX, maximumX - aX],
      [-deltaY, aY - minimumY],
      [deltaY, maximumY - aY]
    ];

    for (let index = 0; index < boundaries.length; index += 1) {
      const direction = boundaries[index][0];
      const offset = boundaries[index][1];
      if (Math.abs(direction) < EPSILON) {
        if (offset < 0) {
          return false;
        }
        continue;
      }
      const ratio = offset / direction;
      if (direction < 0) {
        lower = Math.max(lower, ratio);
      } else {
        upper = Math.min(upper, ratio);
      }
      if (lower > upper) {
        return false;
      }
    }
    return true;
  }

  function segmentWalkable(aX, aY, bX, bY, clearance, map, obstacles) {
    const arena = map || CONFIG.MAP;
    const blockers = obstacles || arena.obstacles;
    if (!pointWalkable(bX, bY, clearance, arena, blockers)) {
      return false;
    }
    for (let index = 0; index < blockers.length; index += 1) {
      const obstacle = blockers[index];
      const blocked = obstacle.shape === 'circle'
        ? segmentCircleBlocked(aX, aY, bX, bY, obstacle, clearance)
        : segmentRectBlocked(aX, aY, bX, bY, obstacle, clearance);
      if (blocked) {
        return false;
      }
    }
    return true;
  }

  function resolveObstacleCollision(x, y, radius, map, obstacles) {
    const arena = map || CONFIG.MAP;
    const blockers = obstacles || arena.obstacles;
    let resolvedX = clamp(x, arena.padding + radius, arena.width - arena.padding - radius);
    let resolvedY = clamp(y, arena.padding + radius, arena.height - arena.padding - radius);

    for (let index = 0; index < blockers.length; index += 1) {
      const obstacle = blockers[index];
      if (obstacle.shape === 'circle') {
        const minimumDistance = obstacle.radius + radius;
        const vector = normalize(resolvedX - obstacle.x, resolvedY - obstacle.y);
        if (vector.length < minimumDistance) {
          const directionX = vector.length > EPSILON ? vector.x : ((index & 1) ? -1 : 1);
          const directionY = vector.length > EPSILON ? vector.y : 0;
          resolvedX = obstacle.x + directionX * minimumDistance;
          resolvedY = obstacle.y + directionY * minimumDistance;
        }
      } else {
        const halfWidth = obstacle.width / 2 + radius;
        const halfHeight = obstacle.height / 2 + radius;
        const dx = resolvedX - obstacle.x;
        const dy = resolvedY - obstacle.y;
        if (Math.abs(dx) < halfWidth && Math.abs(dy) < halfHeight) {
          const pushX = halfWidth - Math.abs(dx);
          const pushY = halfHeight - Math.abs(dy);
          if (pushX <= pushY) {
            resolvedX = obstacle.x + (dx < 0 ? -halfWidth : halfWidth);
          } else {
            resolvedY = obstacle.y + (dy < 0 ? -halfHeight : halfHeight);
          }
        }
      }
    }

    return { x: quantize(resolvedX), y: quantize(resolvedY) };
  }

  class MinHeap {
    constructor() {
      this.items = [];
    }

    push(item) {
      const items = this.items;
      items.push(item);
      let index = items.length - 1;
      while (index > 0) {
        const parent = (index - 1) >> 1;
        if (compareHeapItems(items[parent], item) <= 0) {
          break;
        }
        items[index] = items[parent];
        index = parent;
      }
      items[index] = item;
    }

    pop() {
      const items = this.items;
      if (items.length === 0) {
        return null;
      }
      const first = items[0];
      const last = items.pop();
      if (items.length === 0) {
        return first;
      }
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= items.length) {
          break;
        }
        let child = left;
        if (right < items.length && compareHeapItems(items[right], items[left]) < 0) {
          child = right;
        }
        if (compareHeapItems(last, items[child]) <= 0) {
          break;
        }
        items[index] = items[child];
        index = child;
      }
      items[index] = last;
      return first;
    }

    get length() {
      return this.items.length;
    }
  }

  function compareHeapItems(a, b) {
    return a.f - b.f || a.h - b.h || a.node - b.node;
  }

  function findNearestGridNode(column, row, columns, rows, walkable) {
    const startColumn = clamp(column, 0, columns - 1);
    const startRow = clamp(row, 0, rows - 1);
    if (walkable(startColumn, startRow)) {
      return startRow * columns + startColumn;
    }
    const maximumRing = Math.max(columns, rows);
    for (let ring = 1; ring <= maximumRing; ring += 1) {
      for (let offsetY = -ring; offsetY <= ring; offsetY += 1) {
        for (let offsetX = -ring; offsetX <= ring; offsetX += 1) {
          if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== ring) {
            continue;
          }
          const candidateColumn = startColumn + offsetX;
          const candidateRow = startRow + offsetY;
          if (candidateColumn >= 0 && candidateColumn < columns && candidateRow >= 0 &&
              candidateRow < rows && walkable(candidateColumn, candidateRow)) {
            return candidateRow * columns + candidateColumn;
          }
        }
      }
    }
    return -1;
  }

  function findPath(start, goal, options) {
    const settings = options || {};
    const map = settings.map || CONFIG.MAP;
    const obstacles = settings.obstacles || map.obstacles;
    const clearance = Math.max(0, settings.clearance || 0);
    const gridSize = settings.gridSize || map.gridSize;
    const finalGoal = resolveObstacleCollision(goal.x, goal.y, clearance, map, obstacles);

    if (segmentWalkable(start.x, start.y, finalGoal.x, finalGoal.y, clearance, map, obstacles)) {
      return [finalGoal];
    }

    const columns = Math.ceil(map.width / gridSize);
    const rows = Math.ceil(map.height / gridSize);
    const nodeCount = columns * rows;
    const nodePoint = (node) => ({
      x: (node % columns) * gridSize + gridSize / 2,
      y: Math.floor(node / columns) * gridSize + gridSize / 2
    });
    const walkable = (column, row) => pointWalkable(
      column * gridSize + gridSize / 2,
      row * gridSize + gridSize / 2,
      clearance,
      map,
      obstacles
    );
    const startNode = findNearestGridNode(
      Math.floor(start.x / gridSize), Math.floor(start.y / gridSize), columns, rows, walkable
    );
    const goalNode = findNearestGridNode(
      Math.floor(finalGoal.x / gridSize), Math.floor(finalGoal.y / gridSize), columns, rows, walkable
    );
    if (startNode < 0 || goalNode < 0) {
      return [finalGoal];
    }

    const scores = new Float64Array(nodeCount);
    scores.fill(Infinity);
    const parents = new Int32Array(nodeCount);
    parents.fill(-1);
    const closed = new Uint8Array(nodeCount);
    const heap = new MinHeap();
    const goalColumn = goalNode % columns;
    const goalRow = Math.floor(goalNode / columns);
    const heuristic = (node) => {
      const dx = Math.abs((node % columns) - goalColumn);
      const dy = Math.abs(Math.floor(node / columns) - goalRow);
      return 10 * (dx + dy) - 6 * Math.min(dx, dy);
    };
    const directions = [
      [0, -1, 10], [1, 0, 10], [0, 1, 10], [-1, 0, 10],
      [1, -1, 14], [1, 1, 14], [-1, 1, 14], [-1, -1, 14]
    ];

    scores[startNode] = 0;
    heap.push({ node: startNode, h: heuristic(startNode), f: heuristic(startNode) });
    let found = false;
    let expanded = 0;
    while (heap.length && expanded < nodeCount * 2) {
      const current = heap.pop();
      if (closed[current.node]) {
        continue;
      }
      closed[current.node] = 1;
      expanded += 1;
      if (current.node === goalNode) {
        found = true;
        break;
      }
      const currentColumn = current.node % columns;
      const currentRow = Math.floor(current.node / columns);
      for (let directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
        const direction = directions[directionIndex];
        const nextColumn = currentColumn + direction[0];
        const nextRow = currentRow + direction[1];
        if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows ||
            !walkable(nextColumn, nextRow)) {
          continue;
        }
        if (direction[0] !== 0 && direction[1] !== 0 &&
            (!walkable(currentColumn + direction[0], currentRow) ||
             !walkable(currentColumn, currentRow + direction[1]))) {
          continue;
        }
        const nextNode = nextRow * columns + nextColumn;
        const tentative = scores[current.node] + direction[2];
        if (tentative >= scores[nextNode]) {
          continue;
        }
        scores[nextNode] = tentative;
        parents[nextNode] = current.node;
        const h = heuristic(nextNode);
        heap.push({ node: nextNode, h, f: tentative + h });
      }
    }

    if (!found) {
      return [finalGoal];
    }

    const reversed = [];
    let cursor = goalNode;
    while (cursor !== startNode && cursor >= 0 && reversed.length < nodeCount) {
      reversed.push(nodePoint(cursor));
      cursor = parents[cursor];
    }
    reversed.reverse();
    reversed.push(finalGoal);

    const smoothed = [];
    let anchor = { x: start.x, y: start.y };
    let index = 0;
    while (index < reversed.length && smoothed.length < CONFIG.LIMITS.pathNodes - 1) {
      let farthest = index;
      for (let candidate = index + 1; candidate < reversed.length; candidate += 1) {
        if (!segmentWalkable(
          anchor.x, anchor.y, reversed[candidate].x, reversed[candidate].y,
          clearance, map, obstacles
        )) {
          break;
        }
        farthest = candidate;
      }
      const point = reversed[farthest];
      smoothed.push({ x: quantize(point.x), y: quantize(point.y) });
      anchor = point;
      index = farthest + 1;
    }
    if (smoothed.length === 0 ||
        distanceSquared(smoothed[smoothed.length - 1].x, smoothed[smoothed.length - 1].y,
          finalGoal.x, finalGoal.y) > 1) {
      smoothed.push(finalGoal);
    }
    return smoothed;
  }

  function formationSlots(count, target, source, spacing) {
    if (count <= 0) {
      return [];
    }
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const facing = normalize(target.x - source.x, target.y - source.y);
    const forwardX = facing.length > EPSILON ? facing.x : 0;
    const forwardY = facing.length > EPSILON ? facing.y : 1;
    const sideX = -forwardY;
    const sideY = forwardX;
    const slots = [];
    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const membersInRow = row === rows - 1 ? count - row * columns : columns;
      const sideOffset = (column - (membersInRow - 1) / 2) * spacing;
      const forwardOffset = (row - (rows - 1) / 2) * spacing;
      slots.push({
        x: quantize(target.x + sideX * sideOffset + forwardX * forwardOffset),
        y: quantize(target.y + sideY * sideOffset + forwardY * forwardOffset)
      });
    }
    return slots;
  }

  function attackRingSlots(target, count, radius, phase) {
    const slots = [];
    if (count <= 0) {
      return slots;
    }
    const startAngle = Number.isFinite(phase) ? phase : -Math.PI / 2;
    for (let index = 0; index < count; index += 1) {
      const angle = startAngle + TAU * index / count;
      slots.push({
        x: quantize(target.x + Math.cos(angle) * radius),
        y: quantize(target.y + Math.sin(angle) * radius),
        angle: quantize(angle)
      });
    }
    return slots;
  }

  function buildSpatialHash(entities, cellSize) {
    const size = Math.max(8, cellSize || 48);
    const buckets = Object.create(null);
    const sorted = entities.slice().sort(stableEntitySort);
    for (let index = 0; index < sorted.length; index += 1) {
      const entity = sorted[index];
      if (entity.dead) {
        continue;
      }
      const column = Math.floor(entity.x / size);
      const row = Math.floor(entity.y / size);
      const key = column + ',' + row;
      (buckets[key] = buckets[key] || []).push(entity);
    }
    return { cellSize: size, buckets };
  }

  function querySpatialHash(index, x, y, radius) {
    const output = [];
    const minimumColumn = Math.floor((x - radius) / index.cellSize);
    const maximumColumn = Math.floor((x + radius) / index.cellSize);
    const minimumRow = Math.floor((y - radius) / index.cellSize);
    const maximumRow = Math.floor((y + radius) / index.cellSize);
    const radiusSquared = radius * radius;
    for (let row = minimumRow; row <= maximumRow; row += 1) {
      for (let column = minimumColumn; column <= maximumColumn; column += 1) {
        const bucket = index.buckets[column + ',' + row];
        if (!bucket) {
          continue;
        }
        for (let entityIndex = 0; entityIndex < bucket.length; entityIndex += 1) {
          const entity = bucket[entityIndex];
          if (distanceSquared(x, y, entity.x, entity.y) <= radiusSquared) {
            output.push(entity);
          }
        }
      }
    }
    output.sort(stableEntitySort);
    return output;
  }

  // Hash new fields by default. Only values proven to be presentation or
  // telemetry are omitted, so an authoritative schema addition cannot silently
  // escape desync detection.
  const ROOT_CHECKSUM_EXCLUSIONS = Object.freeze(new Set(['events', 'stats']));
  const PLAYER_CHECKSUM_EXCLUSIONS = Object.freeze(new Set([
    'name', 'color', 'sitesOwned', 'unitsLost', 'unitsDefeated'
  ]));
  const UNIT_CHECKSUM_EXCLUSIONS = Object.freeze(new Set(['name', 'symbol']));
  const STRUCTURE_CHECKSUM_EXCLUSIONS = Object.freeze(new Set(['name']));

  function checksumExclusions(state) {
    const exclusions = new WeakMap();
    exclusions.set(state, ROOT_CHECKSUM_EXCLUSIONS);
    const collections = [
      [state.players, PLAYER_CHECKSUM_EXCLUSIONS],
      [state.units, UNIT_CHECKSUM_EXCLUSIONS],
      [state.structures, STRUCTURE_CHECKSUM_EXCLUSIONS]
    ];
    for (let collectionIndex = 0; collectionIndex < collections.length; collectionIndex += 1) {
      const collection = collections[collectionIndex][0];
      const excludedFields = collections[collectionIndex][1];
      if (!Array.isArray(collection)) {
        continue;
      }
      for (let itemIndex = 0; itemIndex < collection.length; itemIndex += 1) {
        const item = collection[itemIndex];
        if (item && typeof item === 'object') {
          exclusions.set(item, excludedFields);
        }
      }
    }
    return exclusions;
  }

  function checksumError(path, detail) {
    return new TypeError('Cannot checksum ' + path + ': ' + detail);
  }

  function hashCanonicalValue(value, writer, ancestors, exclusions, path) {
    if (value === null) {
      writer('null');
      return;
    }

    const valueType = typeof value;
    if (valueType === 'string') {
      writer(JSON.stringify(value));
      return;
    }
    if (valueType === 'boolean') {
      writer(value ? 'true' : 'false');
      return;
    }
    if (valueType === 'number') {
      if (!Number.isFinite(value)) {
        throw checksumError(path, 'numbers must be finite');
      }
      writer(JSON.stringify(value));
      return;
    }
    if (valueType !== 'object') {
      throw checksumError(path, 'unsupported ' + valueType + ' value');
    }
    if (ancestors.has(value)) {
      throw checksumError(path, 'cyclic data is unsupported');
    }

    ancestors.add(value);
    if (Object.getOwnPropertySymbols(value).length > 0) {
      ancestors.delete(value);
      throw checksumError(path, 'symbol properties are unsupported');
    }
    if (Array.isArray(value)) {
      writer('[');
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          ancestors.delete(value);
          throw checksumError(path + '[' + index + ']', 'sparse arrays are unsupported');
        }
        if (index > 0) {
          writer(',');
        }
        hashCanonicalValue(value[index], writer, ancestors, exclusions, path + '[' + index + ']');
      }
      const arrayKeys = Object.keys(value);
      if (arrayKeys.length !== value.length) {
        ancestors.delete(value);
        throw checksumError(path, 'array properties outside its indexed values are unsupported');
      }
      writer(']');
      ancestors.delete(value);
      return;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      ancestors.delete(value);
      throw checksumError(path, 'only plain JSON objects are supported');
    }
    const excludedFields = exclusions.get(value);
    const keys = Object.keys(value)
      .filter((key) => !excludedFields || !excludedFields.has(key))
      .sort();
    writer('{');
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (index > 0) {
        writer(',');
      }
      writer(JSON.stringify(key));
      writer(':');
      hashCanonicalValue(value[key], writer, ancestors, exclusions, path + '.' + key);
    }
    writer('}');
    ancestors.delete(value);
  }

  function checksum(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      throw new TypeError('AOK.Core.checksum requires a match state object');
    }
    let hash = 0x811c9dc5;
    const writer = (input) => {
      for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
      }
    };
    hashCanonicalValue(state, writer, new WeakSet(), checksumExclusions(state), '$');
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  AOK.Core = Object.freeze({
    EPSILON,
    TAU,
    clamp,
    quantize,
    distance,
    distanceSquared,
    normalize,
    compareIds,
    stableEntitySort,
    uniqueSortedIds,
    nextRandom,
    randomFloat,
    randomInt,
    pointInsideObstacle,
    pointWalkable,
    segmentWalkable,
    resolveObstacleCollision,
    findPath,
    formationSlots,
    attackRingSlots,
    buildSpatialHash,
    querySpatialHash,
    checksum,
    clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
