/* global window */
"use strict";

(function exposePhase4Input() {
  const commonJS = typeof module !== "undefined" && module.exports;
  const phase3Input = commonJS ? require("../phase3/input.js") : window.AeonPhase3Input;
  const VALID_MODES = new Set(["move", "rally"]);

  function createInput(options) {
    if (!phase3Input || typeof phase3Input.createInput !== "function") {
      throw new Error("Phase 4 input requires the approved Phase 3 pointer, touch, and camera translator");
    }
    if (!options || typeof options.onContextRequest !== "function") {
      throw new TypeError("Phase 4 input requires one contextual terrain-command callback");
    }

    let contextMode = null;
    let destroyed = false;
    const delegate = phase3Input.createInput({
      ...options,
      onMoveRequest(payload) {
        options.onContextRequest(Object.freeze({ ...payload, mode: contextMode }));
      },
      onMoveModeChange(enabled) {
        if (!enabled) contextMode = null;
        if (typeof options.onContextModeChange === "function") {
          options.onContextModeChange(contextMode);
        }
      }
    });

    function setContextMode(mode) {
      if (mode !== null && !VALID_MODES.has(mode)) {
        throw new RangeError("context mode must be move, rally, or null");
      }
      contextMode = mode;
      const active = delegate.setMoveMode(mode !== null);
      if (!active) contextMode = null;
      if (typeof options.onContextModeChange === "function") {
        options.onContextModeChange(contextMode);
      }
      return contextMode;
    }

    function resetTransient() {
      contextMode = null;
      delegate.resetTransient();
      if (typeof options.onContextModeChange === "function") options.onContextModeChange(null);
    }

    function setEnabled(enabled) {
      const result = delegate.setEnabled(enabled);
      if (!result) contextMode = null;
      return result;
    }

    function snapshot() {
      const base = delegate.snapshot();
      return Object.freeze({ ...base, contextMode });
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      contextMode = null;
      delegate.destroy();
    }

    return Object.freeze({ setEnabled, setContextMode, resetTransient, snapshot, destroy });
  }

  const api = Object.freeze({ createInput });
  if (commonJS) module.exports = api;
  else window.AeonPhase4Input = api;
}());
