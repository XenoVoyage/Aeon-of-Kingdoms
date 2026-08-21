/* global window, document */
"use strict";

(function exposePhase2Input() {
  function midpoint(first, second) {
    return Object.freeze({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
  }

  function distance(first, second) {
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function createInput(options) {
    const { target, camera, configuration, onChange, onTransientReset } = options;
    const pointers = new Map();
    let enabled = true;
    let spaceHeld = false;
    let mouseDrag = null;
    let touchGesture = null;

    function localPoint(event) {
      const rect = target.getBoundingClientRect();
      return Object.freeze({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    }

    function notifyChange() {
      if (typeof onChange === "function") onChange(camera.snapshot());
    }

    function editableTarget(eventTarget) {
      return Boolean(eventTarget && eventTarget.closest && eventTarget.closest("button, input, select, textarea, dialog, [contenteditable='true']"));
    }

    function resetTransient() {
      for (const pointerId of pointers.keys()) {
        if (target.hasPointerCapture && target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      }
      if (mouseDrag && target.hasPointerCapture && target.hasPointerCapture(mouseDrag.pointerId)) {
        target.releasePointerCapture(mouseDrag.pointerId);
      }
      pointers.clear();
      mouseDrag = null;
      touchGesture = null;
      spaceHeld = false;
      if (typeof onTransientReset === "function") onTransientReset();
    }

    function setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (!enabled) resetTransient();
    }

    function onKeyDown(event) {
      if (!enabled || editableTarget(event.target)) return;
      if (event.code === "Space") {
        spaceHeld = true;
        event.preventDefault();
        return;
      }

      const distancePixels = configuration.keyboardPanPixels;
      const movement = {
        ArrowLeft: [distancePixels, 0],
        KeyA: [distancePixels, 0],
        ArrowRight: [-distancePixels, 0],
        KeyD: [-distancePixels, 0],
        ArrowUp: [0, distancePixels],
        KeyW: [0, distancePixels],
        ArrowDown: [0, -distancePixels],
        KeyS: [0, -distancePixels]
      }[event.code];
      if (!movement) return;
      event.preventDefault();
      camera.panByScreen(movement[0], movement[1]);
      notifyChange();
    }

    function onKeyUp(event) {
      if (event.code === "Space") spaceHeld = false;
    }

    function onPointerDown(event) {
      if (!enabled || editableTarget(event.target)) return;
      const point = localPoint(event);
      if (event.pointerType === "touch") {
        if (!pointers.has(event.pointerId) && pointers.size >= 2) return;
        pointers.set(event.pointerId, point);
        if (pointers.size >= 2) {
          const pair = Array.from(pointers.values()).slice(0, 2);
          touchGesture = Object.freeze({ midpoint: midpoint(pair[0], pair[1]), distance: distance(pair[0], pair[1]) });
          target.setPointerCapture(event.pointerId);
          event.preventDefault();
        }
        return;
      }

      if (event.button === 1 || (event.button === 0 && spaceHeld)) {
        mouseDrag = Object.freeze({ pointerId: event.pointerId, point });
        target.setPointerCapture(event.pointerId);
        event.preventDefault();
      }
    }

    function onPointerMove(event) {
      if (!enabled) return;
      const point = localPoint(event);
      if (event.pointerType === "touch" && pointers.has(event.pointerId)) {
        pointers.set(event.pointerId, point);
        if (pointers.size < 2) return;
        const pair = Array.from(pointers.values()).slice(0, 2);
        const nextMidpoint = midpoint(pair[0], pair[1]);
        const nextDistance = Math.max(1, distance(pair[0], pair[1]));
        if (touchGesture) {
          camera.panByScreen(
            nextMidpoint.x - touchGesture.midpoint.x,
            nextMidpoint.y - touchGesture.midpoint.y
          );
          camera.zoomAt(
            camera.snapshot().zoom * (nextDistance / Math.max(1, touchGesture.distance)),
            nextMidpoint.x,
            nextMidpoint.y
          );
          notifyChange();
        }
        touchGesture = Object.freeze({ midpoint: nextMidpoint, distance: nextDistance });
        event.preventDefault();
        return;
      }

      if (mouseDrag && mouseDrag.pointerId === event.pointerId) {
        camera.panByScreen(point.x - mouseDrag.point.x, point.y - mouseDrag.point.y);
        mouseDrag = Object.freeze({ pointerId: event.pointerId, point });
        notifyChange();
        event.preventDefault();
      }
    }

    function releasePointer(event) {
      if (event.pointerType === "touch") {
        pointers.delete(event.pointerId);
        if (pointers.size < 2) touchGesture = null;
      }
      if (mouseDrag && mouseDrag.pointerId === event.pointerId) mouseDrag = null;
      if (target.hasPointerCapture && target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    }

    function onWheel(event) {
      if (!enabled || editableTarget(event.target)) return;
      const point = localPoint(event);
      const factor = Math.exp(-event.deltaY * configuration.wheelZoomSensitivity);
      camera.zoomAt(camera.snapshot().zoom * factor, point.x, point.y);
      notifyChange();
      event.preventDefault();
    }

    target.addEventListener("pointerdown", onPointerDown);
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", releasePointer);
    target.addEventListener("pointercancel", releasePointer);
    target.addEventListener("lostpointercapture", releasePointer);
    target.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", resetTransient);

    function destroy() {
      resetTransient();
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", releasePointer);
      target.removeEventListener("pointercancel", releasePointer);
      target.removeEventListener("lostpointercapture", releasePointer);
      target.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", resetTransient);
    }

    return Object.freeze({ setEnabled, resetTransient, destroy });
  }

  const api = Object.freeze({ createInput, distance, midpoint });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.AeonPhase2Input = api;
}());
