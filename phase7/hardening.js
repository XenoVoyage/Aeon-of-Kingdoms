/* global globalThis */
"use strict";

(function exposePhase7Hardening(root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AeonPhase7Hardening = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createPhase7Hardening(root) {
  // This module owns only Phase 7 presentation hardening: suspension reasons,
  // browser-feature settlement, safe focus routing, and memory arithmetic. It
  // never owns or mutates authoritative battle, AI, replay, or asset state.

  function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
    if (seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  const SUSPENSION_REASONS = deepFreeze([
    "manual",
    "viewport",
    "hidden",
    "blur",
    "bfcache"
  ]);

  const CANVAS_LAYERS = deepFreeze([
    "ground",
    "detail",
    "navigation",
    "anchors",
    "dynamic",
    "foreground"
  ]);

  const BYTES_PER_RGBA_PIXEL = 4;
  const GROUND_DECODED_BYTES = 6_293_408;
  const STRUCTURE_DECODED_BYTES = 12_811_776;
  const MENU_DECODED_BYTES = 6_293_408;

  const DECODED_SOURCE_IMAGES = deepFreeze({
    standard: {
      tier: "standard",
      entitySheets: 12_582_912,
      structureSheets: STRUCTURE_DECODED_BYTES,
      groundImage: GROUND_DECODED_BYTES,
      totalBytes: 31_688_096
    },
    compact: {
      tier: "compact",
      entitySheets: 7_077_888,
      structureSheets: STRUCTURE_DECODED_BYTES,
      groundImage: GROUND_DECODED_BYTES,
      totalBytes: 26_183_072
    },
    menuImage: MENU_DECODED_BYTES
  });

  const RESULT_MESSAGES = deepFreeze({
    "fullscreen:request:not-requested": "Fullscreen was not requested.",
    "fullscreen:request:unsupported": "Fullscreen is unavailable; supported landscape play can continue.",
    "fullscreen:request:already-active": "Fullscreen is already active.",
    "fullscreen:request:succeeded": "Fullscreen started.",
    "fullscreen:request:rejected": "Fullscreen was declined or unavailable; supported landscape play can continue.",
    "fullscreen:request:cancelled": "The stale fullscreen request was cancelled.",
    "fullscreen:release:not-owned": "This page does not own the active fullscreen session.",
    "fullscreen:release:not-active": "Fullscreen is not active.",
    "fullscreen:release:unsupported": "Fullscreen release is unavailable.",
    "fullscreen:release:succeeded": "Fullscreen ended.",
    "fullscreen:release:rejected": "Fullscreen could not be ended.",
    "orientation:request:unsupported": "Landscape lock is unavailable; the rotate-device gate remains authoritative.",
    "orientation:request:succeeded": "Landscape lock started.",
    "orientation:request:rejected": "Landscape lock was declined or unavailable; the rotate-device gate remains authoritative.",
    "orientation:request:cancelled": "The stale landscape-lock request was cancelled.",
    "orientation:release:not-owned": "This page does not own an orientation lock.",
    "orientation:release:unsupported": "Orientation unlock is unavailable.",
    "orientation:release:succeeded": "Landscape lock ended.",
    "orientation:release:rejected": "Landscape lock could not be ended.",
    "browser-features:begin:completed": "Browser feature requests settled.",
    "browser-features:begin:cancelled": "Stale browser feature requests were cancelled.",
    "browser-features:release:completed": "App-owned browser features were released.",
    "browser-features:release:partial": "One or more app-owned browser features could not be released."
  });

  function plainObject(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`${label} must be an object`);
    }
    return value;
  }

  function suspensionPatch(value, label) {
    const patch = plainObject(value, label);
    for (const key of Object.keys(patch)) {
      if (!SUSPENSION_REASONS.includes(key)) throw new RangeError(`unknown suspension reason: ${key}`);
      if (typeof patch[key] !== "boolean") throw new TypeError(`${key} suspension must be boolean`);
    }
    return patch;
  }

  function createSuspensionController(initial = {}) {
    const state = Object.fromEntries(SUSPENSION_REASONS.map((reason) => [reason, false]));
    Object.assign(state, suspensionPatch(initial, "initial suspension state"));
    const listeners = new Set();
    let destroyed = false;

    function snapshot() {
      const active = Object.fromEntries(SUSPENSION_REASONS.map((reason) => [reason, state[reason]]));
      const reasons = SUSPENSION_REASONS.filter((reason) => state[reason]);
      return deepFreeze({ effective: reasons.length > 0, reasons, active });
    }

    function assertLive() {
      if (destroyed) throw new Error("suspension controller is destroyed");
    }

    function setMany(nextValues) {
      assertLive();
      const patch = suspensionPatch(nextValues, "suspension update");
      let changed = false;
      for (const reason of SUSPENSION_REASONS) {
        if (!Object.hasOwn(patch, reason) || state[reason] === patch[reason]) continue;
        state[reason] = patch[reason];
        changed = true;
      }
      const next = snapshot();
      if (changed) {
        for (const listener of [...listeners]) listener(next);
      }
      return next;
    }

    function set(reason, active) {
      return setMany({ [reason]: active });
    }

    function subscribe(listener) {
      assertLive();
      if (typeof listener !== "function") throw new TypeError("suspension listener must be a function");
      listeners.add(listener);
      let subscribed = true;
      return function unsubscribe() {
        if (!subscribed) return false;
        subscribed = false;
        return listeners.delete(listener);
      };
    }

    function destroy() {
      if (destroyed) return false;
      destroyed = true;
      listeners.clear();
      return true;
    }

    return Object.freeze({ snapshot, set, setMany, subscribe, destroy });
  }

  function stableResult(feature, action, status) {
    const key = `${feature}:${action}:${status}`;
    const message = RESULT_MESSAGES[key];
    if (!message) throw new RangeError(`unsupported browser-feature result: ${key}`);
    return Object.freeze({ feature, action, status, message });
  }

  function createBrowserFeatureController(options = {}) {
    const source = plainObject(options, "browser feature options");
    const documentRef = source.document || root.document || null;
    const screenRef = source.screen || root.screen || null;
    const onResult = source.onResult;
    if (onResult !== undefined && typeof onResult !== "function") {
      throw new TypeError("browser feature result listener must be a function");
    }

    let generation = 0;
    let ownsFullscreen = false;
    let ownsOrientation = false;
    let destroyed = false;
    let destroyPromise = null;
    let pendingRequest = null;
    let releasePromise = null;

    function publish(result) {
      if (onResult) {
        try { onResult(result); } catch { /* Presentation listeners cannot change settlement. */ }
      }
      return result;
    }

    function result(feature, action, status) {
      return publish(stableResult(feature, action, status));
    }

    function assertLive() {
      if (destroyed) throw new Error("browser feature controller is destroyed");
    }

    function snapshot() {
      return Object.freeze({
        generation,
        ownsFullscreen,
        ownsOrientation,
        fullscreenActive: Boolean(documentRef?.fullscreenElement)
      });
    }

    function trackRequest(start) {
      let resolveRequest;
      let rejectRequest;
      const request = new Promise((resolve, reject) => {
        resolveRequest = resolve;
        rejectRequest = reject;
      });
      pendingRequest = request;
      const clear = () => {
        if (pendingRequest === request) pendingRequest = null;
      };
      request.then(clear, clear);
      try {
        Promise.resolve(start()).then(resolveRequest, rejectRequest);
      } catch (error) {
        rejectRequest(error);
      }
      return request;
    }

    function requestBlocked() {
      return Boolean(pendingRequest || releasePromise || destroyPromise);
    }

    function cancelledBegin(token) {
      const fullscreen = result("fullscreen", "request", "cancelled");
      const orientation = result("orientation", "request", "cancelled");
      return deepFreeze({
        feature: "browser-features",
        action: "begin",
        status: "cancelled",
        message: RESULT_MESSAGES["browser-features:begin:cancelled"],
        generation: token,
        fullscreen,
        orientation
      });
    }

    async function undoStaleFullscreen(target) {
      if (!documentRef?.fullscreenElement || documentRef.fullscreenElement !== target) return true;
      if (typeof documentRef.exitFullscreen !== "function") return false;
      try {
        await Promise.resolve(documentRef.exitFullscreen());
        return documentRef.fullscreenElement !== target;
      } catch {
        return false;
      }
    }

    async function undoStaleOrientation() {
      if (!screenRef?.orientation || typeof screenRef.orientation.unlock !== "function") return false;
      try {
        await Promise.resolve(screenRef.orientation.unlock());
        return true;
      } catch {
        return false;
      }
    }

    async function requestFullscreenFor(token) {
      if (token !== generation) return result("fullscreen", "request", "cancelled");
      const target = documentRef?.documentElement || null;
      if (documentRef?.fullscreenElement) return result("fullscreen", "request", "already-active");
      if (!target || typeof target.requestFullscreen !== "function") {
        return result("fullscreen", "request", "unsupported");
      }
      let request;
      try { request = target.requestFullscreen({ navigationUI: "hide" }); }
      catch { return result("fullscreen", "request", token === generation ? "rejected" : "cancelled"); }
      try { await Promise.resolve(request); }
      catch { return result("fullscreen", "request", token === generation ? "rejected" : "cancelled"); }
      if (token !== generation || destroyed) {
        const released = await undoStaleFullscreen(target);
        if (!released && documentRef?.fullscreenElement === target) ownsFullscreen = true;
        return result("fullscreen", "request", "cancelled");
      }
      ownsFullscreen = true;
      return result("fullscreen", "request", "succeeded");
    }

    async function requestOrientationFor(token) {
      if (token !== generation) return result("orientation", "request", "cancelled");
      const orientation = screenRef?.orientation || null;
      if (!orientation || typeof orientation.lock !== "function") {
        return result("orientation", "request", "unsupported");
      }
      let request;
      try { request = orientation.lock("landscape"); }
      catch { return result("orientation", "request", token === generation ? "rejected" : "cancelled"); }
      try { await Promise.resolve(request); }
      catch { return result("orientation", "request", token === generation ? "rejected" : "cancelled"); }
      if (token !== generation || destroyed) {
        if (!(await undoStaleOrientation())) ownsOrientation = true;
        return result("orientation", "request", "cancelled");
      }
      ownsOrientation = true;
      return result("orientation", "request", "succeeded");
    }

    function requestForBegin(requestOptions = {}) {
      assertLive();
      const request = plainObject(requestOptions, "begin browser feature options");
      if (request.fullscreen !== undefined && typeof request.fullscreen !== "boolean") {
        throw new TypeError("begin fullscreen preference must be boolean");
      }
      if (requestBlocked()) return Promise.resolve(cancelledBegin(generation));
      const token = ++generation;
      return trackRequest(async () => {
        const fullscreen = request.fullscreen
          ? await requestFullscreenFor(token)
          : result("fullscreen", "request", "not-requested");
        const orientation = token === generation
          ? await requestOrientationFor(token)
          : result("orientation", "request", "cancelled");
        const cancelled = token !== generation || fullscreen.status === "cancelled" || orientation.status === "cancelled";
        return deepFreeze({
          feature: "browser-features",
          action: "begin",
          status: cancelled ? "cancelled" : "completed",
          message: RESULT_MESSAGES[`browser-features:begin:${cancelled ? "cancelled" : "completed"}`],
          generation: token,
          fullscreen,
          orientation
        });
      });
    }

    function requestFullscreen() {
      assertLive();
      if (requestBlocked()) return Promise.resolve(result("fullscreen", "request", "cancelled"));
      const token = ++generation;
      return trackRequest(() => requestFullscreenFor(token));
    }

    function requestLandscape() {
      assertLive();
      if (requestBlocked()) return Promise.resolve(result("orientation", "request", "cancelled"));
      const token = ++generation;
      return trackRequest(() => requestOrientationFor(token));
    }

    async function releaseOrientation() {
      if (!ownsOrientation) return result("orientation", "release", "not-owned");
      const orientation = screenRef?.orientation || null;
      if (!orientation || typeof orientation.unlock !== "function") {
        return result("orientation", "release", "unsupported");
      }
      try {
        await Promise.resolve(orientation.unlock());
        ownsOrientation = false;
        return result("orientation", "release", "succeeded");
      } catch {
        return result("orientation", "release", "rejected");
      }
    }

    async function releaseFullscreen() {
      if (!ownsFullscreen) return result("fullscreen", "release", "not-owned");
      const target = documentRef?.documentElement || null;
      const active = documentRef?.fullscreenElement || null;
      if (!active) {
        ownsFullscreen = false;
        return result("fullscreen", "release", "not-active");
      }
      if (active !== target) {
        ownsFullscreen = false;
        return result("fullscreen", "release", "not-owned");
      }
      if (typeof documentRef.exitFullscreen !== "function") {
        return result("fullscreen", "release", "unsupported");
      }
      try {
        await Promise.resolve(documentRef.exitFullscreen());
        ownsFullscreen = false;
        return result("fullscreen", "release", "succeeded");
      } catch {
        return result("fullscreen", "release", "rejected");
      }
    }

    function release() {
      assertLive();
      if (releasePromise) return releasePromise;
      ++generation;
      const request = pendingRequest;
      let resolveRelease;
      let rejectRelease;
      const operation = new Promise((resolve, reject) => {
        resolveRelease = resolve;
        rejectRelease = reject;
      });
      releasePromise = operation;
      (async () => {
        if (request) await request.catch(() => null);
        const orientation = await releaseOrientation();
        const fullscreen = await releaseFullscreen();
        const partial = orientation.status === "rejected" || orientation.status === "unsupported"
          || fullscreen.status === "rejected" || fullscreen.status === "unsupported";
        const summary = deepFreeze({
          feature: "browser-features",
          action: "release",
          status: partial ? "partial" : "completed",
          message: RESULT_MESSAGES[`browser-features:release:${partial ? "partial" : "completed"}`],
          generation,
          fullscreen,
          orientation
        });
        publish(summary);
        return summary;
      })().then(resolveRelease, rejectRelease);
      const clear = () => {
        if (releasePromise === operation) releasePromise = null;
      };
      operation.then(clear, clear);
      return operation;
    }

    function cancel() {
      assertLive();
      generation += 1;
      return snapshot();
    }

    function synchronizeFullscreen() {
      assertLive();
      if (ownsFullscreen && documentRef?.fullscreenElement !== documentRef?.documentElement) {
        ownsFullscreen = false;
      }
      return snapshot();
    }

    function destroy() {
      if (destroyPromise) return destroyPromise;
      let resolveDestroy;
      let rejectDestroy;
      const operation = new Promise((resolve, reject) => {
        resolveDestroy = resolve;
        rejectDestroy = reject;
      });
      destroyPromise = operation;
      (async () => {
        const released = await release();
        destroyed = true;
        generation += 1;
        return deepFreeze({ ...released, generation });
      })().then(resolveDestroy, rejectDestroy);
      return operation;
    }

    return Object.freeze({
      snapshot,
      requestForBegin,
      requestFullscreen,
      requestLandscape,
      release,
      cancel,
      synchronizeFullscreen,
      destroy
    });
  }

  function attributeIs(element, name, expected) {
    if (!element || typeof element.getAttribute !== "function") return false;
    return element.getAttribute(name) === expected;
  }

  function canReceiveProgrammaticFocus(element, options = {}) {
    if (!element || typeof element.focus !== "function" || element.isConnected === false) return false;
    const source = options && typeof options === "object" ? options : {};
    const styleFor = source.getComputedStyle || root.getComputedStyle;
    let current = element;
    while (current) {
      if (current.hidden === true || current.inert === true || current.disabled === true
        || attributeIs(current, "aria-hidden", "true") || attributeIs(current, "aria-disabled", "true")
        || (typeof current.hasAttribute === "function" && (current.hasAttribute("hidden") || current.hasAttribute("inert")))) {
        return false;
      }
      if (typeof styleFor === "function") {
        let style;
        try { style = styleFor.call(root, current); } catch { style = null; }
        if (style && (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse")) {
          return false;
        }
      }
      current = current.parentElement || current.parentNode || null;
    }
    if (typeof element.matches === "function") {
      try { if (element.matches(":disabled")) return false; } catch { /* A minimal test DOM may not parse selectors. */ }
    }
    return true;
  }

  function focusFirstAvailable(candidates, options = {}) {
    if (!candidates || typeof candidates[Symbol.iterator] !== "function") {
      throw new TypeError("focus candidates must be iterable");
    }
    const source = options && typeof options === "object" ? options : {};
    for (const candidate of candidates) {
      if (!canReceiveProgrammaticFocus(candidate, source)) continue;
      try {
        candidate.focus({ preventScroll: source.preventScroll !== false });
        return candidate;
      } catch { /* Continue to the next valid recovery target. */ }
    }
    return null;
  }

  function decodedSourceImageProfile(tier) {
    if (tier !== "standard" && tier !== "compact") {
      throw new RangeError("decoded source-image tier must be standard or compact");
    }
    return DECODED_SOURCE_IMAGES[tier];
  }

  function nonnegativeFinite(value, label) {
    if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
      throw new TypeError(`${label} must be a nonnegative finite safe number`);
    }
    return value;
  }

  function roundedPlayRect(rectValue, configurationValue) {
    const rect = plainObject(rectValue, "play rectangle");
    const configuration = plainObject(configurationValue, "play rectangle configuration");
    const leftValue = nonnegativeFinite(rect.left, "play rectangle left");
    const topValue = nonnegativeFinite(rect.top, "play rectangle top");
    const widthValue = nonnegativeFinite(rect.width, "play rectangle width");
    const heightValue = nonnegativeFinite(rect.height, "play rectangle height");
    const minimumAspect = nonnegativeFinite(configuration.minimumAspect, "minimum play aspect");
    const maximumAspect = nonnegativeFinite(configuration.maximumAspect, "maximum play aspect");
    if (minimumAspect === 0 || maximumAspect < minimumAspect) {
      throw new RangeError("play aspect limits must be positive and ordered");
    }

    const left = Math.round(leftValue);
    const top = Math.round(topValue);
    if (widthValue === 0 || heightValue === 0) {
      return deepFreeze({ left, top, width: 0, height: 0, letterboxed: Boolean(rect.letterboxed) });
    }

    let width = Math.max(1, Math.round(widthValue));
    let height = Math.max(1, Math.round(heightValue));
    const sourceAspect = widthValue / heightValue;
    const tolerance = Number.EPSILON * 16 * Math.max(1, sourceAspect, minimumAspect, maximumAspect);
    if (sourceAspect >= maximumAspect - tolerance) {
      width = Math.max(1, Math.min(width, Math.floor(height * maximumAspect)));
    } else if (sourceAspect <= minimumAspect + tolerance) {
      height = Math.max(1, Math.min(height, Math.floor(width / minimumAspect)));
    }
    return deepFreeze({ left, top, width, height, letterboxed: Boolean(rect.letterboxed) });
  }

  function positiveSafeInteger(value, label) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${label} must be a positive safe integer`);
    return value;
  }

  function safeProduct(values, label) {
    let product = 1;
    for (const value of values) {
      product *= value;
      if (!Number.isSafeInteger(product)) throw new RangeError(`${label} exceeds safe-integer arithmetic`);
    }
    return product;
  }

  function canvasBackingBytes(canvases) {
    const source = plainObject(canvases, "canvas backing record");
    const keys = Object.keys(source).sort();
    const expected = [...CANVAS_LAYERS].sort();
    if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
      throw new RangeError(`canvas backing record must contain exactly: ${CANVAS_LAYERS.join(", ")}`);
    }
    const layers = [];
    let totalBytes = 0;
    for (const layer of CANVAS_LAYERS) {
      const canvas = plainObject(source[layer], `${layer} canvas`);
      const width = positiveSafeInteger(canvas.width, `${layer} canvas width`);
      const height = positiveSafeInteger(canvas.height, `${layer} canvas height`);
      const bytes = safeProduct([width, height, BYTES_PER_RGBA_PIXEL], `${layer} canvas bytes`);
      totalBytes += bytes;
      if (!Number.isSafeInteger(totalBytes)) throw new RangeError("six-canvas backing total exceeds safe-integer arithmetic");
      layers.push(Object.freeze({ layer, width, height, bytes }));
    }
    return deepFreeze({ canvasCount: CANVAS_LAYERS.length, bytesPerPixel: BYTES_PER_RGBA_PIXEL, layers, totalBytes });
  }

  return Object.freeze({
    SUSPENSION_REASONS,
    CANVAS_LAYERS,
    DECODED_SOURCE_IMAGES,
    createSuspensionController,
    createBrowserFeatureController,
    canReceiveProgrammaticFocus,
    focusFirstAvailable,
    decodedSourceImageProfile,
    roundedPlayRect,
    canvasBackingBytes
  });
}));
