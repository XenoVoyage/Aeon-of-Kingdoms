/* global window, document */
"use strict";

(function exposePhase3Input() {
  const DEFAULT_SELECTION_DRAG_PIXELS = 6;

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function midpoint(first, second) {
    return Object.freeze({
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2
    });
  }

  function distance(first, second) {
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function createInput(options) {
    if (!options || !options.target || !options.camera || !options.configuration) {
      throw new TypeError("Phase 3 input requires target, camera, and camera configuration.");
    }

    const {
      target,
      camera,
      configuration,
      onCameraChange,
      onSelectPoint,
      onSelectBox,
      onSelectionPreview,
      onMoveRequest,
      onMoveModeChange,
      onTransientReset
    } = options;
    if (
      typeof camera.snapshot !== "function"
      || typeof camera.screenToWorld !== "function"
      || typeof camera.panByScreen !== "function"
      || typeof camera.zoomAt !== "function"
    ) {
      throw new TypeError("Phase 3 input requires the approved Phase 2 camera API.");
    }
    if (
      !Number.isFinite(configuration.keyboardPanPixels)
      || !Number.isFinite(configuration.wheelZoomSensitivity)
    ) {
      throw new TypeError("Phase 3 input requires the injected Phase 2 camera configuration.");
    }

    const selectionDragPixels = Math.max(
      1,
      finite(options.selectionDragPixels, DEFAULT_SELECTION_DRAG_PIXELS)
    );
    const touchPointers = new Map();
    const capturedPointers = new Set();
    let enabled = true;
    let destroyed = false;
    let moveMode = false;
    let spaceHeld = false;
    let mouseGesture = null;
    let touchGesture = null;
    let previewVisible = false;

    function editableTarget(eventTarget) {
      return Boolean(
        eventTarget
        && eventTarget.closest
        && eventTarget.closest("button, input, select, textarea, dialog, [contenteditable='true']")
      );
    }

    function localPoint(event) {
      const rect = target.getBoundingClientRect();
      const rawX = finite(event.clientX, rect.left) - rect.left;
      const rawY = finite(event.clientY, rect.top) - rect.top;
      return Object.freeze({
        x: clamp(rawX, 0, Math.max(0, rect.width)),
        y: clamp(rawY, 0, Math.max(0, rect.height)),
        inside: rawX >= 0 && rawY >= 0 && rawX <= rect.width && rawY <= rect.height
      });
    }

    function screenPoint(point) {
      return Object.freeze({ x: point.x, y: point.y });
    }

    function worldPoint(point) {
      const world = camera.screenToWorld(point.x, point.y);
      if (!world || !Number.isFinite(world.x) || !Number.isFinite(world.y)) {
        throw new TypeError("Camera projection returned a non-finite world point.");
      }
      return Object.freeze({ x: world.x, y: world.y });
    }

    function normalizeBox(start, end) {
      const left = Math.min(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const right = Math.max(start.x, end.x);
      const bottom = Math.max(start.y, end.y);
      return Object.freeze({
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top
      });
    }

    function selectionPayload(source, point, additive) {
      return Object.freeze({
        source,
        additive: Boolean(additive),
        screenPoint: screenPoint(point),
        worldPoint: worldPoint(point)
      });
    }

    function selectionBoxPayload(source, start, end, additive) {
      const screenRect = normalizeBox(start, end);
      const firstWorld = worldPoint({ x: screenRect.left, y: screenRect.top });
      const secondWorld = worldPoint({ x: screenRect.right, y: screenRect.bottom });
      return Object.freeze({
        source,
        additive: Boolean(additive),
        screenRect,
        worldBounds: Object.freeze({
          minX: Math.min(firstWorld.x, secondWorld.x),
          minY: Math.min(firstWorld.y, secondWorld.y),
          maxX: Math.max(firstWorld.x, secondWorld.x),
          maxY: Math.max(firstWorld.y, secondWorld.y)
        })
      });
    }

    function movePayload(source, point) {
      return Object.freeze({
        source,
        screenPoint: screenPoint(point),
        worldPoint: worldPoint(point)
      });
    }

    function notifyCameraChange() {
      if (typeof onCameraChange === "function") onCameraChange(camera.snapshot());
    }

    function setSelectionPreview(rectangle) {
      previewVisible = Boolean(rectangle);
      if (typeof onSelectionPreview === "function") onSelectionPreview(rectangle);
    }

    function setMoveMode(nextEnabled) {
      const nextMode = enabled && Boolean(nextEnabled);
      if (moveMode === nextMode) return moveMode;
      moveMode = nextMode;
      if (typeof onMoveModeChange === "function") onMoveModeChange(moveMode);
      return moveMode;
    }

    function capturePointer(pointerId) {
      if (!target.setPointerCapture || capturedPointers.has(pointerId)) return;
      target.setPointerCapture(pointerId);
      capturedPointers.add(pointerId);
    }

    function releasePointer(pointerId) {
      if (!capturedPointers.delete(pointerId)) return;
      if (target.hasPointerCapture && target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    }

    function resetTransient() {
      const pointerIds = Array.from(capturedPointers);
      capturedPointers.clear();
      touchPointers.clear();
      mouseGesture = null;
      touchGesture = null;
      spaceHeld = false;
      if (previewVisible) setSelectionPreview(null);
      setMoveMode(false);
      for (const pointerId of pointerIds) {
        if (target.hasPointerCapture && target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      }
      if (typeof onTransientReset === "function") onTransientReset();
    }

    function setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled) && !destroyed;
      if (!enabled) resetTransient();
      return enabled;
    }

    function additiveSelection(event) {
      return Boolean(event.shiftKey || event.ctrlKey || event.metaKey);
    }

    function issueTouchTap(point) {
      if (moveMode) {
        if (typeof onMoveRequest === "function") onMoveRequest(movePayload("touch", point));
        setMoveMode(false);
      } else if (typeof onSelectPoint === "function") {
        onSelectPoint(selectionPayload("touch", point, false));
      }
    }

    function onKeyDown(event) {
      if (!enabled || editableTarget(event.target)) return;
      if (event.code === "Space") {
        spaceHeld = true;
        event.preventDefault();
        return;
      }
      if (event.code === "Escape") {
        resetTransient();
        event.preventDefault();
        return;
      }

      const panPixels = configuration.keyboardPanPixels;
      const movement = {
        ArrowLeft: [panPixels, 0],
        KeyA: [panPixels, 0],
        ArrowRight: [-panPixels, 0],
        KeyD: [-panPixels, 0],
        ArrowUp: [0, panPixels],
        KeyW: [0, panPixels],
        ArrowDown: [0, -panPixels],
        KeyS: [0, -panPixels]
      }[event.code];
      if (!movement) return;
      camera.panByScreen(movement[0], movement[1]);
      notifyCameraChange();
      event.preventDefault();
    }

    function onKeyUp(event) {
      if (event.code === "Space") spaceHeld = false;
    }

    function beginTouch(event, point) {
      if (!touchPointers.has(event.pointerId) && touchPointers.size >= 2) return;
      touchPointers.set(event.pointerId, {
        start: point,
        point,
        moved: false,
        gesture: false
      });
      capturePointer(event.pointerId);

      if (touchPointers.size === 2) {
        const pair = Array.from(touchPointers.values());
        pair[0].gesture = true;
        pair[1].gesture = true;
        touchGesture = Object.freeze({
          midpoint: midpoint(pair[0].point, pair[1].point),
          distance: Math.max(1, distance(pair[0].point, pair[1].point))
        });
      }
      event.preventDefault();
    }

    function onPointerDown(event) {
      if (!enabled || editableTarget(event.target)) return;
      const point = localPoint(event);
      if (!point.inside) return;
      if (event.pointerType === "touch") {
        beginTouch(event, point);
        return;
      }

      if (event.button === 1 || (event.button === 0 && spaceHeld)) {
        mouseGesture = {
          type: "camera",
          pointerId: event.pointerId,
          point
        };
      } else if (event.button === 0) {
        mouseGesture = {
          type: "selection",
          pointerId: event.pointerId,
          start: point,
          point,
          additive: additiveSelection(event),
          dragged: false
        };
      } else {
        return;
      }
      capturePointer(event.pointerId);
      event.preventDefault();
    }

    function moveTouch(event, point) {
      const pointer = touchPointers.get(event.pointerId);
      if (!pointer) return;
      pointer.point = point;
      if (distance(pointer.start, point) >= selectionDragPixels) pointer.moved = true;
      if (touchPointers.size < 2 || !touchGesture) return;

      const pair = Array.from(touchPointers.values());
      const nextMidpoint = midpoint(pair[0].point, pair[1].point);
      const nextDistance = Math.max(1, distance(pair[0].point, pair[1].point));
      camera.panByScreen(
        nextMidpoint.x - touchGesture.midpoint.x,
        nextMidpoint.y - touchGesture.midpoint.y
      );
      camera.zoomAt(
        camera.snapshot().zoom * (nextDistance / touchGesture.distance),
        nextMidpoint.x,
        nextMidpoint.y
      );
      touchGesture = Object.freeze({ midpoint: nextMidpoint, distance: nextDistance });
      notifyCameraChange();
      event.preventDefault();
    }

    function moveMouse(event, point) {
      if (!mouseGesture || mouseGesture.pointerId !== event.pointerId) return;
      if (mouseGesture.type === "camera") {
        camera.panByScreen(point.x - mouseGesture.point.x, point.y - mouseGesture.point.y);
        mouseGesture.point = point;
        notifyCameraChange();
      } else {
        mouseGesture.point = point;
        if (!mouseGesture.dragged && distance(mouseGesture.start, point) >= selectionDragPixels) {
          mouseGesture.dragged = true;
        }
        if (mouseGesture.dragged) {
          setSelectionPreview(normalizeBox(mouseGesture.start, point));
        }
      }
      event.preventDefault();
    }

    function onPointerMove(event) {
      if (!enabled) return;
      const point = localPoint(event);
      if (event.pointerType === "touch") moveTouch(event, point);
      else moveMouse(event, point);
    }

    function finishTouch(event, cancelled) {
      const pointer = touchPointers.get(event.pointerId);
      if (!pointer) return;
      touchPointers.delete(event.pointerId);
      releasePointer(event.pointerId);
      if (touchPointers.size < 2) touchGesture = null;
      if (!cancelled && !pointer.gesture && !pointer.moved && pointer.point.inside) {
        issueTouchTap(pointer.point);
      }
      if (!cancelled) event.preventDefault();
    }

    function finishMouse(event, cancelled) {
      if (!mouseGesture || mouseGesture.pointerId !== event.pointerId) return;
      const gesture = mouseGesture;
      const point = localPoint(event);
      mouseGesture = null;
      releasePointer(event.pointerId);
      if (gesture.type === "selection") {
        if (previewVisible) setSelectionPreview(null);
        if (!cancelled && point.inside) {
          if (gesture.dragged && typeof onSelectBox === "function") {
            onSelectBox(selectionBoxPayload("mouse", gesture.start, point, gesture.additive));
          } else if (!gesture.dragged && typeof onSelectPoint === "function") {
            onSelectPoint(selectionPayload("mouse", point, gesture.additive));
          }
        }
      }
      if (!cancelled) event.preventDefault();
    }

    function onPointerUp(event) {
      if (event.pointerType === "touch") finishTouch(event, false);
      else finishMouse(event, false);
    }

    function onPointerCancel(event) {
      if (event.pointerType === "touch") finishTouch(event, true);
      else finishMouse(event, true);
    }

    function onContextMenu(event) {
      if (!enabled || editableTarget(event.target)) return;
      if (event.pointerType === "touch") {
        event.preventDefault();
        return;
      }
      const point = localPoint(event);
      if (!point.inside) return;
      if (typeof onMoveRequest === "function") onMoveRequest(movePayload("mouse", point));
      event.preventDefault();
    }

    function onWheel(event) {
      if (!enabled || editableTarget(event.target)) return;
      const point = localPoint(event);
      if (!point.inside) return;
      const factor = Math.exp(-event.deltaY * configuration.wheelZoomSensitivity);
      camera.zoomAt(camera.snapshot().zoom * factor, point.x, point.y);
      notifyCameraChange();
      event.preventDefault();
    }

    function onVisibilityChange() {
      if (document.hidden) resetTransient();
    }

    target.addEventListener("pointerdown", onPointerDown);
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", onPointerUp);
    target.addEventListener("pointercancel", onPointerCancel);
    target.addEventListener("lostpointercapture", onPointerCancel);
    target.addEventListener("contextmenu", onContextMenu);
    target.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", resetTransient);
    window.addEventListener("pagehide", resetTransient);
    window.addEventListener("resize", resetTransient);
    document.addEventListener("visibilitychange", onVisibilityChange);

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      enabled = false;
      resetTransient();
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("pointercancel", onPointerCancel);
      target.removeEventListener("lostpointercapture", onPointerCancel);
      target.removeEventListener("contextmenu", onContextMenu);
      target.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", resetTransient);
      window.removeEventListener("pagehide", resetTransient);
      window.removeEventListener("resize", resetTransient);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }

    function snapshot() {
      return Object.freeze({
        enabled,
        moveMode,
        touchPointerCount: touchPointers.size,
        mouseGesture: mouseGesture ? mouseGesture.type : null
      });
    }

    return Object.freeze({ setEnabled, setMoveMode, resetTransient, snapshot, destroy });
  }

  const api = Object.freeze({ createInput });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.AeonPhase3Input = api;
}());
