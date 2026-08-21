"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const exists = (relativePath) => fs.statSync(path.join(ROOT, relativePath), { throwIfNoEntry: false })?.isFile();
const map = require(path.join(ROOT, "phase2/map.js"));
const cameraApi = require(path.join(ROOT, "phase2/camera.js"));
const rendererApi = require(path.join(ROOT, "phase2/renderer.js"));
const inputApi = require(path.join(ROOT, "phase2/input.js"));
const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));

const LAYERS = Object.freeze([
  "ground",
  "detail",
  "navigation",
  "anchors",
  "dynamic",
  "foreground"
]);
const STRUCTURE_CATEGORIES = Object.freeze([
  "headquarters",
  "resource-point",
  "production-outpost"
]);
const PHASE2_RUNTIME = Object.freeze([
  "phase2/index.html",
  "phase2/phase2.css",
  "phase2/map.js",
  "phase2/camera.js",
  "phase2/renderer.js",
  "phase2/input.js",
  "phase2/app.js"
]);

function nearlyEqual(actual, expected, epsilon = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be within ${epsilon} of ${expected}`);
}

function pointOnSegment(point, start, end, epsilon = 1e-8) {
  const [x, y] = point;
  const [startX, startY] = start;
  const [endX, endY] = end;
  const cross = (x - startX) * (endY - startY) - (y - startY) * (endX - startX);
  if (Math.abs(cross) > epsilon) return false;
  return (
    x >= Math.min(startX, endX) - epsilon
    && x <= Math.max(startX, endX) + epsilon
    && y >= Math.min(startY, endY) - epsilon
    && y <= Math.max(startY, endY) + epsilon
  );
}

function pointInOrOnPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const start = polygon[previous];
    const end = polygon[index];
    if (pointOnSegment(point, start, end)) return true;
    const crossesRay = (end[1] > point[1]) !== (start[1] > point[1]);
    if (crossesRay) {
      const edgeX = ((start[0] - end[0]) * (point[1] - end[1])) / (start[1] - end[1]) + end[0];
      if (point[0] < edgeX) inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(point, start, end) {
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const projection = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (point[0] - start[0]) * deltaX + (point[1] - start[1]) * deltaY
    ) / lengthSquared));
  return Math.hypot(
    point[0] - (start[0] + projection * deltaX),
    point[1] - (start[1] + projection * deltaY)
  );
}

function orientation(start, end, point) {
  return (end[0] - start[0]) * (point[1] - start[1]) - (end[1] - start[1]) * (point[0] - start[0]);
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const firstA = orientation(firstStart, firstEnd, secondStart);
  const firstB = orientation(firstStart, firstEnd, secondEnd);
  const secondA = orientation(secondStart, secondEnd, firstStart);
  const secondB = orientation(secondStart, secondEnd, firstEnd);
  if (
    ((firstA > 0 && firstB < 0) || (firstA < 0 && firstB > 0))
    && ((secondA > 0 && secondB < 0) || (secondA < 0 && secondB > 0))
  ) return true;
  return (
    pointOnSegment(secondStart, firstStart, firstEnd)
    || pointOnSegment(secondEnd, firstStart, firstEnd)
    || pointOnSegment(firstStart, secondStart, secondEnd)
    || pointOnSegment(firstEnd, secondStart, secondEnd)
  );
}

function assertSimplePolygon(polygon, label) {
  const encodedVertices = polygon.map((point) => point.join(","));
  assert.equal(new Set(encodedVertices).size, polygon.length, `${label} repeats a polygon vertex`);
  for (let firstEdge = 0; firstEdge < polygon.length; firstEdge += 1) {
    const firstStart = polygon[firstEdge];
    const firstEnd = polygon[(firstEdge + 1) % polygon.length];
    for (let secondEdge = firstEdge + 1; secondEdge < polygon.length; secondEdge += 1) {
      const adjacent = (
        secondEdge === firstEdge + 1
        || (firstEdge === 0 && secondEdge === polygon.length - 1)
      );
      if (adjacent) continue;
      const secondStart = polygon[secondEdge];
      const secondEnd = polygon[(secondEdge + 1) % polygon.length];
      assert.equal(
        segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd),
        false,
        `${label} edges ${firstEdge} and ${secondEdge} self-intersect`
      );
    }
  }
}

function assertCircleClearOfBlockers(circle, blockers, label) {
  assert.ok(Number.isFinite(circle.radius) && circle.radius > 0, `${label} needs a positive radius`);
  assertWorldPoint([circle.x, circle.y], label);
  assert.ok(circle.x - circle.radius >= 0 && circle.x + circle.radius <= map.world.width, `${label} radius exceeds horizontal bounds`);
  assert.ok(circle.y - circle.radius >= 0 && circle.y + circle.radius <= map.world.height, `${label} radius exceeds vertical bounds`);
  for (const blocker of blockers) {
    assert.equal(pointInOrOnPolygon([circle.x, circle.y], blocker.polygon), false, `${label} centre enters ${blocker.id}`);
    const edgeDistance = Math.min(...blocker.polygon.map((point, index) => distanceToSegment(
      [circle.x, circle.y],
      point,
      blocker.polygon[(index + 1) % blocker.polygon.length]
    )));
    assert.ok(edgeDistance >= circle.radius, `${label} radius overlaps ${blocker.id}`);
  }
}

function assertWorldPoint(point, label) {
  assert.ok(Array.isArray(point) && point.length === 2, `${label} must be an [x, y] pair`);
  assert.ok(point.every(Number.isFinite), `${label} coordinates must be finite`);
  assert.ok(point[0] >= 0 && point[0] <= map.world.width, `${label} x must be in map bounds`);
  assert.ok(point[1] >= 0 && point[1] <= map.world.height, `${label} y must be in map bounds`);
}

function functionBody(source, name) {
  const signature = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  assert.ok(signature, `missing function ${name}`);
  const openingBrace = signature.index + signature[0].lastIndexOf("{");
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openingBrace; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
  }
  assert.fail(`unterminated function ${name}`);
}

function matchingBrace(source, openingBrace) {
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  assert.fail("unterminated CSS block");
}

function mediaMatches(query, width, height) {
  if (/prefers-/i.test(query)) return false;
  for (const match of query.matchAll(/\(\s*(min|max)-(width|height)\s*:\s*([0-9.]+)px\s*\)/gi)) {
    const actual = match[2].toLowerCase() === "width" ? width : height;
    const threshold = Number(match[3]);
    if (match[1].toLowerCase() === "min" && actual < threshold) return false;
    if (match[1].toLowerCase() === "max" && actual > threshold) return false;
  }
  const orientation = query.match(/\(\s*orientation\s*:\s*(portrait|landscape)\s*\)/i)?.[1].toLowerCase();
  if (orientation === "portrait" && width > height) return false;
  if (orientation === "landscape" && width <= height) return false;
  return true;
}

function computedCss(cssSource, selector, width, height) {
  const declarations = {};
  const source = cssSource.replace(/\/\*[\s\S]*?\*\//g, "");

  function visit(segment, enabled) {
    let cursor = 0;
    while (cursor < segment.length) {
      const openingBrace = segment.indexOf("{", cursor);
      if (openingBrace === -1) break;
      const prelude = segment.slice(cursor, openingBrace).trim();
      const closingBrace = matchingBrace(segment, openingBrace);
      const body = segment.slice(openingBrace + 1, closingBrace);
      if (/^@media\b/i.test(prelude)) {
        if (enabled && mediaMatches(prelude, width, height)) visit(body, true);
      } else if (enabled && !prelude.startsWith("@")) {
        const selectors = prelude.split(",").map((entry) => entry.trim());
        if (selectors.includes(selector)) {
          for (const match of body.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/gi)) {
            declarations[match[1].toLowerCase()] = match[2].trim();
          }
        }
      }
      cursor = closingBrace + 1;
    }
  }

  visit(source, true);
  return declarations;
}

function cssLength(value, axisLength) {
  assert.equal(typeof value, "string", "expected a CSS length");
  const tokens = [];
  const pattern = /\s*(?:([0-9]*\.?[0-9]+)(px|%)|([a-z]+)|([()+\-,]))/giy;
  let cursor = 0;
  while (cursor < value.length) {
    pattern.lastIndex = cursor;
    const match = pattern.exec(value);
    assert.ok(match, `unsupported CSS length ${value}`);
    if (match[1]) tokens.push({ type: "length", value: Number(match[1]), unit: match[2].toLowerCase() });
    else if (match[3]) tokens.push({ type: "identifier", value: match[3].toLowerCase() });
    else tokens.push({ type: match[4] });
    cursor = pattern.lastIndex;
  }

  let index = 0;
  function parsePrimary() {
    const token = tokens[index];
    assert.ok(token, `incomplete CSS length ${value}`);
    if (token.type === "+" || token.type === "-") {
      index += 1;
      const result = parsePrimary();
      return token.type === "-" ? -result : result;
    }
    if (token.type === "length") {
      index += 1;
      return token.unit === "%" ? (token.value / 100) * axisLength : token.value;
    }
    if (token.type === "identifier") {
      const functionName = token.value;
      index += 1;
      assert.equal(tokens[index]?.type, "(", `expected ( after ${functionName}`);
      index += 1;
      const values = [parseExpression()];
      while (tokens[index]?.type === ",") {
        index += 1;
        values.push(parseExpression());
      }
      assert.equal(tokens[index]?.type, ")", `expected ) after ${functionName}`);
      index += 1;
      if (functionName === "calc") return values[0];
      if (functionName === "max") return Math.max(...values);
      if (functionName === "min") return Math.min(...values);
      assert.fail(`unsupported CSS function ${functionName}`);
    }
    assert.fail(`unsupported CSS token in ${value}`);
  }

  function parseExpression() {
    let result = parsePrimary();
    while (tokens[index]?.type === "+" || tokens[index]?.type === "-") {
      const operator = tokens[index].type;
      index += 1;
      const next = parsePrimary();
      result = operator === "+" ? result + next : result - next;
    }
    return result;
  }

  const result = parseExpression();
  assert.equal(index, tokens.length, `unexpected CSS tokens in ${value}`);
  return result;
}

function containedMenuRect(width, height) {
  const playRect = cameraApi.inspectViewport(width, height).playRect;
  const aspect = map.world.width / map.world.height;
  if (playRect.width / playRect.height > aspect) {
    const containedWidth = playRect.height * aspect;
    return {
      left: playRect.left + (playRect.width - containedWidth) / 2,
      top: playRect.top,
      width: containedWidth,
      height: playRect.height
    };
  }
  const containedHeight = playRect.width / aspect;
  return {
    left: playRect.left,
    top: playRect.top + (playRect.height - containedHeight) / 2,
    width: playRect.width,
    height: containedHeight
  };
}

function hotspotRect(css, selector, viewportWidth, viewportHeight) {
  const menu = containedMenuRect(viewportWidth, viewportHeight);
  const style = {
    ...computedCss(css, ".menu-hit", viewportWidth, viewportHeight),
    ...computedCss(css, selector, viewportWidth, viewportHeight)
  };
  const width = Math.max(
    cssLength(style.width, menu.width),
    cssLength(style["min-width"], menu.width)
  );
  const height = Math.max(
    cssLength(style.height, menu.height),
    cssLength(style["min-height"], menu.height)
  );
  const left = style.left === undefined
    ? menu.width - cssLength(style.right, menu.width) - width
    : cssLength(style.left, menu.width);
  const top = style.top === undefined
    ? menu.height - cssLength(style.bottom, menu.height) - height
    : cssLength(style.top, menu.height);
  return Object.freeze({ left, top, width, height, right: left + width, bottom: top + height });
}

function rectanglesOverlap(first, second, epsilon = 1e-6) {
  return (
    first.left < second.right - epsilon
    && first.right > second.left + epsilon
    && first.top < second.bottom - epsilon
    && first.bottom > second.top + epsilon
  );
}

test("Phase 2 map owns exactly six authored layers and three structure categories", () => {
  assert.equal(map.schemaVersion, 1);
  assert.match(map.id, /two-player/i);
  assert.deepEqual(map.layerOrder, LAYERS);
  assert.deepEqual(Object.keys(map.layers), LAYERS);
  assert.deepEqual(map.structureCategories, STRUCTURE_CATEGORIES);
  assert.deepEqual(map.world, { width: 1672, height: 941 });
  assert.deepEqual(
    { width: map.layers.ground.width, height: map.layers.ground.height },
    map.world,
    "ground dimensions must mirror the canonical world dimensions"
  );
  assert.equal(
    map.layers.ground.image,
    "../concepts/feasibility/phase1a/environment/battlefield-environment.webp"
  );
  assert.equal(map.layers.detail.routeHints.length, 3);
  assert.ok(Number.isFinite(map.layers.navigation.cellSize) && map.layers.navigation.cellSize > 0);
  assert.equal(map.layers.navigation.blockers.length, 6);
  assert.equal(map.layers.anchors.cameraStarts.length, 1);
  assert.equal(map.layers.anchors.playerSeats.length, 2);
  assert.equal(map.layers.anchors.structures.length, 5);
  assert.equal(map.layers.foreground.occluders.length, 2);
  assert.deepEqual(map.layers.dynamic, [], "Phase 2 is an empty battlefield with no entity layer content");

  const identified = [
    ...map.layers.detail.routeHints,
    ...map.layers.navigation.blockers,
    ...map.layers.anchors.cameraStarts,
    ...map.layers.anchors.playerSeats,
    ...map.layers.anchors.structures,
    ...map.layers.foreground.occluders
  ];
  assert.ok(identified.every((entry) => typeof entry.id === "string" && /^[a-z0-9-]+$/.test(entry.id)));
  assert.equal(new Set(identified.map((entry) => entry.id)).size, identified.length, "every authored map object needs a globally unique id");

  for (const layer of LAYERS) assert.ok(Object.isFrozen(map.layers[layer]), `${layer} layer must be immutable`);
  assert.equal(Object.hasOwn(map, "groundImage"), false, "ground has one data owner");
  assert.equal(Object.hasOwn(map, "routes"), false, "route hints have one data owner");
  assert.equal(Object.hasOwn(map, "blockers"), false, "blockers have one data owner");
  assert.equal(Object.hasOwn(map, "anchors"), false, "anchors have one data owner");
});

test("two-player seats, camera homes, and structures are complete without transient ownership state", () => {
  const anchorLayer = map.layers.anchors;
  assert.deepEqual(anchorLayer.playerSeats.map((entry) => entry.seat), [1, 2]);
  assert.equal(new Set(anchorLayer.playerSeats.map((entry) => entry.id)).size, 2);
  assert.equal(anchorLayer.cameraStarts.length, 1);
  assert.ok(anchorLayer.cameraStarts.every((entry) => Number.isFinite(entry.x) && Number.isFinite(entry.y)));

  const categories = anchorLayer.structures.map((entry) => entry.category);
  assert.ok(categories.every((category) => STRUCTURE_CATEGORIES.includes(category)));
  assert.equal(categories.filter((category) => category === "headquarters").length, 2);
  assert.equal(categories.filter((category) => category === "resource-point").length, 1);
  assert.equal(categories.filter((category) => category === "production-outpost").length, 2);
  const headquartersSeats = anchorLayer.structures
    .filter((entry) => entry.category === "headquarters")
    .map((entry) => entry.seat);
  assert.deepEqual(headquartersSeats, [1, 2]);
  assert.ok(anchorLayer.structures
    .filter((entry) => entry.category !== "headquarters")
    .every((entry) => entry.seat === null));

  const encoded = JSON.stringify(map);
  assert.doesNotMatch(encoded, /owner(?:Color|Symbol|Seat)|shortLabel/i);
});

test("map geometry is bounded and route hints plus structure footprints stay clear of blockers", () => {
  const blockers = map.layers.navigation.blockers;
  for (const blocker of blockers) {
    assert.match(blocker.id, /^[a-z0-9-]+$/);
    assert.ok(blocker.polygon.length >= 3, `${blocker.id} needs a polygon`);
    blocker.polygon.forEach((point, index) => assertWorldPoint(point, `${blocker.id}[${index}]`));
    assertSimplePolygon(blocker.polygon, blocker.id);
  }

  for (const route of map.layers.detail.routeHints) {
    assert.ok(route.points.length >= 2, `${route.id} needs at least two points`);
    route.points.forEach((point, index) => {
      assertWorldPoint(point, `${route.id}[${index}]`);
      for (const blocker of blockers) {
        assert.equal(pointInOrOnPolygon(point, blocker.polygon), false, `${route.id}[${index}] enters ${blocker.id}`);
      }
    });
    for (let pointIndex = 1; pointIndex < route.points.length; pointIndex += 1) {
      const routeStart = route.points[pointIndex - 1];
      const routeEnd = route.points[pointIndex];
      for (const blocker of blockers) {
        for (let edgeIndex = 0; edgeIndex < blocker.polygon.length; edgeIndex += 1) {
          const edgeStart = blocker.polygon[edgeIndex];
          const edgeEnd = blocker.polygon[(edgeIndex + 1) % blocker.polygon.length];
          assert.equal(
            segmentsIntersect(routeStart, routeEnd, edgeStart, edgeEnd),
            false,
            `${route.id} segment ${pointIndex - 1} intersects ${blocker.id}`
          );
        }
      }
    }
  }

  for (const anchor of map.layers.anchors.structures) {
    assertCircleClearOfBlockers(anchor, blockers, anchor.id);
  }

  for (const cameraStart of map.layers.anchors.cameraStarts) assertWorldPoint([cameraStart.x, cameraStart.y], `seat ${cameraStart.seat} camera`);
  for (const seat of map.layers.anchors.playerSeats) assertCircleClearOfBlockers(seat, blockers, seat.id);
  for (const occluder of map.layers.foreground.occluders) {
    assert.ok(occluder.polygon.length >= 3);
    occluder.polygon.forEach((point, index) => assertWorldPoint(point, `${occluder.id}[${index}]`));
    assertSimplePolygon(occluder.polygon, occluder.id);
  }
});

test("viewport policy gates portrait and undersized layouts and letterboxes only outside 4:3–21:9", () => {
  const { configuration, computePlayRect, inspectViewport } = cameraApi;
  assert.equal(configuration.minimumAspect, 4 / 3);
  assert.equal(configuration.maximumAspect, 21 / 9);
  assert.equal(configuration.minimumViewportWidth, 640);
  assert.equal(configuration.minimumViewportHeight, 360);
  assert.equal(configuration.minimumControlPixels, 44);
  assert.equal(configuration.renderScaleCap, 1.5);

  assert.deepEqual(computePlayRect(800, 600), { left: 0, top: 0, width: 800, height: 600, letterboxed: false });
  const narrow = computePlayRect(400, 400);
  nearlyEqual(narrow.left, 0);
  nearlyEqual(narrow.top, 50);
  nearlyEqual(narrow.width, 400);
  nearlyEqual(narrow.height, 300);
  assert.equal(narrow.letterboxed, true);
  const wide = computePlayRect(3000, 1000);
  nearlyEqual(wide.left, 1000 / 3);
  nearlyEqual(wide.top, 0);
  nearlyEqual(wide.width, 7000 / 3);
  nearlyEqual(wide.height, 1000);
  assert.equal(wide.letterboxed, true);

  assert.deepEqual(inspectViewport(640, 360).playable, true);
  assert.equal(inspectViewport(639, 360).tooSmall, true);
  assert.equal(inspectViewport(640, 359).tooSmall, true);
  assert.equal(inspectViewport(390, 844).portrait, true);
  assert.equal(inspectViewport(390, 844).playable, false);
  assert.equal(inspectViewport(640, 640).portrait, true, "a square viewport must use the portrait gate");
  assert.equal(inspectViewport(640, 640).playable, false);
  assert.equal(inspectViewport(844, 390).playable, true);
  assert.equal(inspectViewport(640, 480).playable, true);
});

test("camera preserves a screen focus through zoom, clamps pan, and resets to its authored home", () => {
  const home = map.layers.anchors.cameraStarts[0];
  const camera = cameraApi.createCamera(map.world.width, map.world.height, home);
  camera.resize(1000, 400);
  const initial = camera.snapshot();
  nearlyEqual(initial.centerX, home.x);
  nearlyEqual(initial.centerY, home.y);
  nearlyEqual(initial.zoom, cameraApi.configuration.minimumZoom);

  const focusScreen = { x: 680, y: 245 };
  const before = camera.screenToWorld(focusScreen.x, focusScreen.y);
  camera.zoomAt(2, focusScreen.x, focusScreen.y);
  const after = camera.screenToWorld(focusScreen.x, focusScreen.y);
  nearlyEqual(after.x, before.x);
  nearlyEqual(after.y, before.y);

  const roundTrip = camera.worldToScreen(after.x, after.y);
  nearlyEqual(roundTrip.x, focusScreen.x);
  nearlyEqual(roundTrip.y, focusScreen.y);

  camera.panByScreen(1e9, 1e9);
  const minimum = camera.snapshot();
  const halfWidth = minimum.viewportWidth / (2 * minimum.scale);
  const halfHeight = minimum.viewportHeight / (2 * minimum.scale);
  assert.ok(minimum.centerX >= halfWidth && minimum.centerY >= halfHeight);
  camera.panByScreen(-2e9, -2e9);
  const maximum = camera.snapshot();
  assert.ok(maximum.centerX <= map.world.width - maximum.viewportWidth / (2 * maximum.scale));
  assert.ok(maximum.centerY <= map.world.height - maximum.viewportHeight / (2 * maximum.scale));

  camera.zoomAt(1e6, 500, 200);
  assert.equal(camera.snapshot().zoom, cameraApi.configuration.maximumZoom);
  camera.zoomAt(-1e6, 500, 200);
  assert.equal(camera.snapshot().zoom, cameraApi.configuration.minimumZoom);
  const reset = camera.reset();
  nearlyEqual(reset.centerX, home.x);
  nearlyEqual(reset.centerY, home.y);
  nearlyEqual(reset.zoom, cameraApi.configuration.minimumZoom);
});

test("Phase 2 shell is semantic, local-only, restrictive, and loads classic scripts once in order", () => {
  for (const relativePath of PHASE2_RUNTIME) assert.ok(exists(relativePath), `missing ${relativePath}`);
  const html = read("phase2/index.html");
  assert.match(html, /<html\b[^>]*\blang=["']en["']/i);
  assert.match(html, /<meta\b[^>]*name=["']viewport["']/i);
  assert.match(html, /<main\b/i);
  assert.match(html, /aria-live=["'](?:polite|assertive)["']|role=["']status["']/i);
  assert.match(html, /Rotate (?:your )?device|landscape/i);
  assert.match(html, /640\s*[×x]\s*360/i);
  assert.match(html, /navigation|blocker/i);
  assert.match(html, /pause/i);

  const policy = (
    html.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"/i)?.[1]
    ?? html.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content='([^']+)'/i)?.[1]
  );
  assert.ok(policy, "Phase 2 needs a Content Security Policy");
  for (const directive of [
    /default-src 'self'/i,
    /script-src 'self'/i,
    /style-src 'self'/i,
    /img-src 'self'/i,
    /connect-src 'none'/i,
    /object-src 'none'/i,
    /base-uri 'none'/i
  ]) assert.match(policy, directive);
  assert.doesNotMatch(policy, /unsafe-(?:inline|eval)/i);
  assert.doesNotMatch(html, /<(?:script|link|img|source)\b[^>]+(?:src|href|srcset)=["'](?:https?:|\/)/i);
  assert.doesNotMatch(html, /<style\b|<script\b(?![^>]*\bsrc=)/i);

  const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1]);
  assert.deepEqual(scripts, ["map.js", "camera.js", "renderer.js", "input.js", "app.js"]);
  assert.equal(new Set(scripts).size, scripts.length);
  for (const script of scripts) {
    assert.ok(exists(path.posix.join("phase2", script)), `missing ${script}`);
    assert.doesNotThrow(() => new vm.Script(read(path.posix.join("phase2", script)), { filename: script }));
  }
  assert.match(html, /href=["']phase2\.css(?:\?[^"']*)?["']/i);
  assert.match(html, /(?:data-src|src)=["']\.\.\/concepts\/images\/minimal-menu\.webp["']/i);
  assert.doesNotMatch(html, /(?:manifest\.webmanifest|css\/(?:tokens|app)\.css|js\/(?:config|core|simulation|ai|render|input|game)\.js)/i);

  const canvasLayers = Array.from(html.matchAll(/<canvas\b[^>]*\bdata-layer=["']([^"']+)["'][^>]*>/gi), (match) => match[1]);
  assert.deepEqual(canvasLayers, LAYERS, "the six authored world layers need six ordered canvases");
});

test("Phase 2 input and lifecycle source preserve focus, touch, pause, and cleanup boundaries", () => {
  const input = read("phase2/input.js");
  const app = read("phase2/app.js");
  const css = read("phase2/phase2.css");
  const combined = `${input}\n${app}`;

  for (const eventName of [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "lostpointercapture",
    "wheel",
    "keydown",
    "blur",
    "visibilitychange",
    "pagehide",
    "pageshow"
  ]) assert.match(combined, new RegExp(eventName, "i"), `missing ${eventName} lifecycle handling`);
  assert.match(combined, /setPointerCapture/i);
  assert.match(combined, /releasePointerCapture/i);
  assert.match(combined, /preventDefault\(\)/i);
  assert.match(combined, /passive:\s*false/i);
  assert.match(combined, /AbortController|removeEventListener/i);
  assert.match(combined, /ResizeObserver/i);
  assert.match(combined, /screen\.orientation\.lock\(["']landscape["']\)/i);
  assert.match(combined, /clientX\s*-\s*[^;\n]*\.left/i);
  assert.match(combined, /clientY\s*-\s*[^;\n]*\.top/i);
  assert.match(combined, /pointer[sS]|activePointers/i, "input must retain bounded multi-pointer state");
  assert.match(combined, /pinch|distance/i);
  assert.match(combined, /zoomAt/i);
  assert.match(combined, /panByScreen/i);
  assert.match(combined, /hidden|portrait/i);
  assert.match(combined, /paused/i);
  assert.match(combined, /destroy|dispose/i);
  assert.match(app, /battlefieldScreen\.inert/i);
  assert.match(app, /groundImage\.onerror/i);
  assert.match(app, /groundImage\.naturalWidth/i);
  assert.match(app, /menuArt\.removeAttribute\(["']src["']\)/i);
  assert.match(app, /groundImage\.removeAttribute\(["']src["']\)/i);
  assert.match(app, /cancelAnimationFrame/i);

  const updateViewport = functionBody(app, "updateViewport");
  const pageHide = functionBody(app, "onPageHide");
  const pageShow = functionBody(app, "onPageShow");
  const playFramePointerDown = functionBody(app, "onPlayFramePointerDown");
  const startBattlefield = functionBody(app, "startBattlefield");
  const requestFullscreen = functionBody(app, "requestFullscreen");
  assert.match(updateViewport, /settingsDialog\.inert\s*=\s*!playableViewport/i, "a gated viewport must make the settings dialog inert");
  assert.match(updateViewport, /!playableViewport[\s\S]*settingsDialog\.open[\s\S]*(?:\.close\(\)|removeAttribute\(["']open["']\))/i, "a gated viewport must close an open settings dialog");
  assert.match(pageHide, /event\.persisted/i);
  assert.match(pageHide, /event\.persisted[\s\S]*resetTransient\(\)[\s\S]*return[\s\S]*destroy\(\)/i, "BFCache pagehide must pause without destroying; ordinary pagehide must destroy");
  assert.match(app, /function\s+onPageShow\s*\(\s*event\s*\)/i);
  assert.match(pageShow, /event\.persisted/i, "pageshow recovery must be scoped to a BFCache restore");
  assert.match(pageShow, /updateViewport\(\)[\s\S]*renderCamera\(\)/i);
  assert.match(app, /addEventListener\(["']pagehide["']\s*,\s*onPageHide\)/i);
  assert.match(app, /removeEventListener\(["']pagehide["']\s*,\s*onPageHide\)/i);
  assert.match(app, /addEventListener\(["']pageshow["']\s*,\s*onPageShow\)/i);
  assert.match(app, /removeEventListener\(["']pageshow["']\s*,\s*onPageShow\)/i);
  assert.match(playFramePointerDown, /event\.target\.closest/i);
  assert.match(playFramePointerDown, /!interactive[\s\S]*playFrame\.focus/i, "play-frame focus must not steal an interactive UI descendant's pointer event");
  assert.match(requestFullscreen, /return\s+Promise\.(?:resolve|reject)|return\s+new\s+Promise/i, "fullscreen negotiation must return a settlement that can be sequenced");
  assert.match(startBattlefield, /fullscreenOnBegin\.checked\s*\)\s*requestFullscreen\(\)\.then\(\s*requestLandscapeLock\s*\)/i, "orientation lock must follow fullscreen settlement");
  assert.match(startBattlefield, /else\s+requestLandscapeLock\(\)/i, "orientation lock must be requested directly when fullscreen is not requested");

  assert.match(css, /100dvh/i);
  assert.match(css, /100svh/i);
  assert.match(css, /env\(safe-area-inset-top\)[^;]*12px|12px[^;]*env\(safe-area-inset-top\)/i);
  assert.match(css, /env\(safe-area-inset-right\)[^;]*12px|12px[^;]*env\(safe-area-inset-right\)/i);
  assert.match(css, /env\(safe-area-inset-bottom\)[^;]*12px|12px[^;]*env\(safe-area-inset-bottom\)/i);
  assert.match(css, /env\(safe-area-inset-left\)[^;]*12px|12px[^;]*env\(safe-area-inset-left\)/i);
  assert.match(css, /:focus-visible/i);
  assert.match(css, /prefers-reduced-motion:\s*reduce/i);
  assert.match(css, /touch-action:\s*none/i);
  assert.doesNotMatch(css, /(?:html|body|button)[^{,]*\{[^}]*touch-action:\s*none/is, "touch suppression belongs only on the play surface");
  assert.match(css, /min-(?:width|height):\s*(?:44px|2\.75rem)/i);
  assert.doesNotMatch(css, /@import|url\(\s*["']?https?:/i);
});

test("compact menu targets remain 44px and non-overlapping, and control help clears 640×480", () => {
  const css = read("phase2/phase2.css");
  const selectors = [
    ".menu-hit-begin",
    ".menu-hit-settings",
    ".menu-hit-audio",
    ".menu-hit-fullscreen"
  ];

  for (const [viewportWidth, viewportHeight] of [[640, 360], [800, 600], [844, 390], [1024, 768]]) {
    const rectangles = selectors.map((selector) => ({
      selector,
      rectangle: hotspotRect(css, selector, viewportWidth, viewportHeight)
    }));
    for (const { selector, rectangle } of rectangles) {
      assert.ok(rectangle.width >= 44, `${selector} is narrower than 44px at ${viewportWidth}×${viewportHeight}`);
      assert.ok(rectangle.height >= 44, `${selector} is shorter than 44px at ${viewportWidth}×${viewportHeight}`);
      assert.ok(rectangle.left >= 0 && rectangle.right <= containedMenuRect(viewportWidth, viewportHeight).width, `${selector} leaves the menu horizontally at ${viewportWidth}×${viewportHeight}`);
      assert.ok(rectangle.top >= 0 && rectangle.bottom <= containedMenuRect(viewportWidth, viewportHeight).height, `${selector} leaves the menu vertically at ${viewportWidth}×${viewportHeight}`);
    }
    for (let firstIndex = 0; firstIndex < rectangles.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < rectangles.length; secondIndex += 1) {
        const first = rectangles[firstIndex];
        const second = rectangles[secondIndex];
        assert.equal(
          rectanglesOverlap(first.rectangle, second.rectangle),
          false,
          `${first.selector} overlaps ${second.selector} at ${viewportWidth}×${viewportHeight}`
        );
      }
    }
  }

  assert.equal(
    computedCss(css, ".control-help", 640, 480).display,
    "none",
    "the control-help copy must be hidden at 640×480 so it cannot collide with controls"
  );
});

test("input behavior maps local coordinates, caps touch state, and releases every listener", () => {
  function eventTarget(rect) {
    const listeners = new Map();
    const captures = [];
    const releases = [];
    return {
      listeners,
      captures,
      releases,
      addEventListener(type, listener, options) {
        listeners.set(type, { listener, options });
      },
      removeEventListener(type, listener) {
        if (listeners.get(type)?.listener === listener) listeners.delete(type);
      },
      dispatch(type, properties = {}) {
        let prevented = false;
        const event = {
          type,
          target: this,
          pointerType: "mouse",
          pointerId: 0,
          button: 0,
          clientX: 0,
          clientY: 0,
          deltaY: 0,
          code: "",
          preventDefault() { prevented = true; },
          ...properties
        };
        listeners.get(type)?.listener(event);
        return prevented;
      },
      closest() { return null; },
      getBoundingClientRect() { return rect; },
      setPointerCapture(pointerId) { captures.push(pointerId); },
      hasPointerCapture(pointerId) { return captures.includes(pointerId) && !releases.includes(pointerId); },
      releasePointerCapture(pointerId) { releases.push(pointerId); }
    };
  }

  const target = eventTarget({ left: 10, top: 20, width: 640, height: 360 });
  const fakeWindow = eventTarget({ left: 0, top: 0, width: 0, height: 0 });
  const pans = [];
  const zooms = [];
  let zoom = 1;
  let transientResets = 0;
  const camera = {
    snapshot() { return { zoom }; },
    panByScreen(deltaX, deltaY) { pans.push([deltaX, deltaY]); },
    zoomAt(nextZoom, x, y) {
      zoom = nextZoom;
      zooms.push([nextZoom, x, y]);
    }
  };

  const originalWindow = global.window;
  global.window = fakeWindow;
  try {
    const input = inputApi.createInput({
      target,
      camera,
      configuration: cameraApi.configuration,
      onTransientReset() { transientResets += 1; }
    });

    assert.equal(target.listeners.get("wheel").options.passive, false);
    const interactiveDescendant = {
      closest(selector) { return /button/.test(selector) ? this : null; }
    };
    const capturesBeforeUi = target.captures.length;
    const pansBeforeUi = pans.length;
    const zoomsBeforeUi = zooms.length;
    assert.equal(target.dispatch("pointerdown", {
      target: interactiveDescendant,
      pointerType: "mouse",
      pointerId: 99,
      button: 1,
      clientX: 30,
      clientY: 50
    }), false, "an interactive descendant pointer must retain its default behavior");
    assert.equal(target.dispatch("wheel", {
      target: interactiveDescendant,
      clientX: 30,
      clientY: 50,
      deltaY: -100
    }), false, "an interactive descendant wheel must retain its default behavior");
    assert.equal(target.captures.length, capturesBeforeUi, "an interactive descendant must not start camera capture");
    assert.equal(pans.length, pansBeforeUi, "an interactive descendant must not pan the camera");
    assert.equal(zooms.length, zoomsBeforeUi, "an interactive descendant must not zoom the camera");
    assert.equal(fakeWindow.dispatch("keydown", { code: "KeyW" }), true);
    assert.deepEqual(pans.pop(), [0, cameraApi.configuration.keyboardPanPixels]);
    assert.equal(target.dispatch("wheel", { clientX: 30, clientY: 50, deltaY: -100 }), true);
    assert.deepEqual(zooms.at(-1).slice(1), [20, 30], "wheel focus must subtract the play-frame offset");

    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 1, clientX: 110, clientY: 120 });
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 2, clientX: 210, clientY: 120 });
    assert.deepEqual(target.captures, [2], "the completed two-touch gesture should request capture");
    target.dispatch("pointermove", { pointerType: "touch", pointerId: 1, clientX: 130, clientY: 120 });
    assert.ok(pans.length > 0 && zooms.length > 1, "two-touch movement must pan and focus-zoom");

    const panCount = pans.length;
    const zoomCount = zooms.length;
    target.dispatch("pointerdown", { pointerType: "touch", pointerId: 3, clientX: 300, clientY: 140 });
    target.dispatch("pointermove", { pointerType: "touch", pointerId: 3, clientX: 340, clientY: 140 });
    assert.deepEqual(target.captures, [2], "touch state must be capped at two pointers");
    assert.equal(pans.length, panCount, "a third touch must not mutate camera state");
    assert.equal(zooms.length, zoomCount, "a third touch must not mutate zoom state");

    target.dispatch("pointerup", { pointerType: "touch", pointerId: 2 });
    assert.ok(target.releases.includes(2));
    target.dispatch("lostpointercapture", { pointerType: "touch", pointerId: 1 });
    fakeWindow.dispatch("keydown", { code: "Space" });
    target.dispatch("pointerdown", { pointerType: "mouse", pointerId: 10, button: 0, clientX: 150, clientY: 120 });
    assert.ok(target.captures.includes(10));
    fakeWindow.dispatch("blur");
    assert.ok(target.releases.includes(10), "blur must release a captured drag before clearing transient state");
    assert.ok(transientResets >= 1);

    input.destroy();
    assert.equal(target.listeners.size, 0);
    assert.equal(fakeWindow.listeners.size, 0);
  } finally {
    global.window = originalWindow;
  }
});

test("terrain renderer reads authored layers and provides color-plus-symbol debug ownership cues", () => {
  const renderer = read("phase2/renderer.js");
  const detailLayer = functionBody(renderer, "drawDetail");
  assert.match(renderer, /map\.layers\.detail\.routeHints/i);
  assert.match(detailLayer, /contexts\.detail/i);
  assert.match(detailLayer, /map\.layers\.detail\.routeHints[\s\S]*drawRoute/i, "route hints must be authored on the visible detail canvas");
  assert.match(renderer, /map\.layers\.navigation/i);
  assert.match(renderer, /navigation\.blockers/i);
  assert.match(renderer, /map\.layers\.anchors\.structures/i);
  assert.match(renderer, /drawDynamic/i);
  assert.match(renderer, /contexts\.dynamic/i);
  assert.match(renderer, /map\.layers\.foreground\.occluders/i);
  assert.match(renderer, /navigationVisible/i);
  assert.match(renderer, /BLOCKER/i);
  assert.match(renderer, /setLineDash/i);
  assert.match(renderer, /renderScaleCap/i);
  assert.match(renderer, /diamond/i);
  assert.match(renderer, /cross/i);
  assert.match(renderer, /bars|ring/i);
  assert.match(renderer, /#[0-9a-f]{6}|rgba?\(/i, "ownership presentation needs a visible color treatment");
  assert.doesNotMatch(renderer, /(?:atlas|sprite|entity|combat|projectile)/i, "Phase 2 must stay an empty battlefield foundation");
});

test("renderer clears and draws all six world canvases in authored order", () => {
  const clearOrder = [];
  const strokeCounts = Object.fromEntries(LAYERS.map((layer) => [layer, 0]));
  function contextFor(layer) {
    const context = {
      setTransform() {},
      clearRect() { clearOrder.push(layer); },
      save() {},
      restore() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      setLineDash() {},
      stroke() { strokeCounts[layer] += 1; },
      fill() {},
      clip() {},
      arc() {},
      fillText() {},
      drawImage() {}
    };
    return context;
  }
  const canvases = Object.fromEntries(LAYERS.map((layer) => [layer, {
    width: 0,
    height: 0,
    getContext() { return contextFor(layer); }
  }]));
  const camera = cameraApi.createCamera(map.world.width, map.world.height, map.layers.anchors.cameraStarts[0]);
  const renderer = rendererApi.createRenderer({
    canvases,
    map,
    camera,
    groundImage: { complete: true, naturalWidth: map.world.width },
    renderScaleCap: cameraApi.configuration.renderScaleCap
  });
  renderer.resize(800, 450, 3);
  assert.deepEqual(clearOrder, LAYERS);
  assert.equal(strokeCounts.detail, map.layers.detail.routeHints.length, "every route hint must stroke the detail canvas even when navigation debug is hidden");
  assert.equal(strokeCounts.navigation, 0, "navigation debug must remain empty while disabled");
  assert.equal(renderer.snapshot().renderScale, cameraApi.configuration.renderScaleCap);
  for (const canvas of Object.values(canvases)) {
    assert.equal(canvas.width, 1200);
    assert.equal(canvas.height, 675);
  }
  renderer.destroy();
  for (const canvas of Object.values(canvases)) {
    assert.equal(canvas.width, 1);
    assert.equal(canvas.height, 1);
  }
});

test("Pages allowlist publishes only the bounded Phase 2 foundation and its local dependencies", () => {
  const files = staging.verifyRuntimeFiles();
  const stagedPhase2 = files.filter((entry) => entry.startsWith("phase2/"));
  assert.deepEqual(stagedPhase2, PHASE2_RUNTIME);
  assert.ok(files.includes("docs/PHASE2_FOUNDATION.md"));
  assert.ok(files.includes(map.layers.ground.image.replace(/^\.\.\//, "")));
  assert.ok(files.includes("concepts/images/minimal-menu.webp"));
  assert.doesNotMatch(files.join("\n"), /concepts\/feasibility\/images\//i);
  assert.doesNotMatch(files.join("\n"), /^(?:manifest\.webmanifest|icons\/|css\/(?:tokens|app)\.css|js\/(?:config|core|simulation|ai|render|input|game)\.js)$/mi);

  const html = read("phase2/index.html");
  for (const reference of staging.localReferences(html)) {
    const resolved = staging.resolvedPublicPath("phase2/index.html", reference);
    assert.ok(files.includes(resolved), `${reference} resolves to unstaged ${resolved}`);
  }
});
