/* global window */
"use strict";

(function exposePhase5Input() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const phase3Input = commonJS ? require("../phase3/input.js") : window.AeonPhase3Input;
  const VALID_MODES = new Set([
    "move", "rally", "attack", "attack-move", "defend-point", "defend-entity"
  ]);

  function createInput(options) {
    if (!phase3Input || typeof phase3Input.createInput !== "function") {
      throw new Error("Phase 5 input requires the approved Phase 3 pointer, touch, and camera translator");
    }
    if (!options || typeof options.onContextRequest !== "function") {
      throw new TypeError("Phase 5 input requires one contextual tactical-command callback");
    }

    const { target, camera } = options;
    let contextMode = null;
    let enabled = true;
    let destroyed = false;
    const touchPointers = new Set();

    function localWorldPoint(event) {
      const rect = target.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, Number.isFinite(event.clientX) ? event.clientX - rect.left : 0));
      const y = Math.max(0, Math.min(rect.height, Number.isFinite(event.clientY) ? event.clientY - rect.top : 0));
      const worldPoint = camera.screenToWorld(x, y);
      if (!worldPoint || !Number.isFinite(worldPoint.x) || !Number.isFinite(worldPoint.y)) {
        throw new TypeError("Camera projection returned a non-finite hostile-hover point");
      }
      return Object.freeze({
        source: event.pointerType === "touch" ? "touch" : "mouse",
        screenPoint: Object.freeze({ x, y }),
        worldPoint: Object.freeze({ x: worldPoint.x, y: worldPoint.y })
      });
    }

    const delegate = phase3Input.createInput({
      ...options,
      onMoveRequest(payload) {
        options.onContextRequest(Object.freeze({ ...payload, mode: contextMode }));
      },
      onMoveModeChange(active) {
        if (!active) contextMode = null;
        if (typeof options.onContextModeChange === "function") options.onContextModeChange(contextMode);
      }
    });

    function notifyMode() {
      if (typeof options.onContextModeChange === "function") options.onContextModeChange(contextMode);
    }

    function setContextMode(mode) {
      if (mode !== null && !VALID_MODES.has(mode)) {
        throw new RangeError("context mode must be move, rally, attack, attack-move, defend-point, defend-entity, or null");
      }
      contextMode = mode;
      const active = delegate.setMoveMode(mode !== null);
      if (!active) contextMode = null;
      notifyMode();
      return contextMode;
    }

    function resetTransient() {
      contextMode = null;
      touchPointers.clear();
      delegate.resetTransient();
      notifyMode();
      if (typeof options.onHoverChange === "function") options.onHoverChange(null);
    }

    function setEnabled(nextEnabled) {
      enabled = delegate.setEnabled(nextEnabled);
      if (!enabled) {
        contextMode = null;
        if (typeof options.onHoverChange === "function") options.onHoverChange(null);
      }
      return enabled;
    }

    function onPointerHover(event) {
      if (!enabled || event.pointerType === "touch") return;
      if (event.buttons) {
        if (typeof options.onHoverChange === "function") options.onHoverChange(null);
        return;
      }
      if (typeof options.onHoverChange === "function") options.onHoverChange(localWorldPoint(event));
    }

    function onPointerLeave() {
      if (typeof options.onHoverChange === "function") options.onHoverChange(null);
    }

    function onPointerDown(event) {
      if (!enabled || event.pointerType !== "touch") return;
      touchPointers.add(event.pointerId);
      if (touchPointers.size >= 2 && contextMode !== null) setContextMode(null);
    }

    function onPointerEnd(event) {
      if (event.pointerType === "touch") touchPointers.delete(event.pointerId);
    }

    function guardTouchContextMenu(event) {
      if (event.pointerType !== "touch" && !event.sourceCapabilities?.firesTouchEvents) return;
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    }

    target.addEventListener("contextmenu", guardTouchContextMenu, { capture: true });
    target.addEventListener("pointerdown", onPointerDown);
    target.addEventListener("pointermove", onPointerHover);
    target.addEventListener("pointerleave", onPointerLeave);
    target.addEventListener("pointerup", onPointerEnd);
    target.addEventListener("pointercancel", onPointerEnd);

    function snapshot() {
      return Object.freeze({ ...delegate.snapshot(), contextMode });
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      enabled = false;
      contextMode = null;
      touchPointers.clear();
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerHover);
      target.removeEventListener("pointerleave", onPointerLeave);
      target.removeEventListener("pointerup", onPointerEnd);
      target.removeEventListener("pointercancel", onPointerEnd);
      target.removeEventListener("contextmenu", guardTouchContextMenu, { capture: true });
      delegate.destroy();
    }

    return Object.freeze({ setEnabled, setContextMode, resetTransient, snapshot, destroy });
  }

  const api = Object.freeze({ createInput });
  if (commonJS) module.exports = api;
  else window.AeonPhase5Input = api;
}());
