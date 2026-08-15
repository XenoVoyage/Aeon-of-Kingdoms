/* global window, document */
(function attachInput(global) {
  "use strict";

  const AOK = (global.AOK = global.AOK || {});
  const MOUSE_DRAG_SLOP = 5;
  const TOUCH_DRAG_SLOP = 14;

  function distance(first, second) {
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function midpoint(first, second) {
    return { x: (first.x + second.x) * 0.5, y: (first.y + second.y) * 0.5 };
  }

  function isEditable(target) {
    return target instanceof global.HTMLElement && Boolean(
      target.closest("button, input, select, textarea, dialog, [contenteditable='true']"),
    );
  }

  class InputController {
    constructor(canvas, renderer, callbacks) {
      if (!canvas || !renderer) throw new TypeError("InputController requires a canvas and renderer.");
      this.canvas = canvas;
      this.renderer = renderer;
      this.callbacks = callbacks || {};
      this.enabled = false;
      this.pointers = new Map();
      this.keys = new Set();
      this.selectionBox = null;
      this.spaceHeld = false;
      this.pinch = null;
      this.lastHoverAt = 0;

      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerUp = this.handlePointerUp.bind(this);
      this.handlePointerCancel = this.handlePointerCancel.bind(this);
      this.handleWheel = this.handleWheel.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      this.handleBlur = this.handleBlur.bind(this);

      canvas.addEventListener("pointerdown", this.handlePointerDown);
      canvas.addEventListener("pointermove", this.handlePointerMove);
      canvas.addEventListener("pointerup", this.handlePointerUp);
      canvas.addEventListener("pointercancel", this.handlePointerCancel);
      canvas.addEventListener("contextmenu", (event) => event.preventDefault());
      canvas.addEventListener("wheel", this.handleWheel, { passive: false });
      global.addEventListener("keydown", this.handleKeyDown);
      global.addEventListener("keyup", this.handleKeyUp);
      global.addEventListener("blur", this.handleBlur);
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      if (!this.enabled) this.resetTransient();
    }

    pointFromEvent(event) {
      return this.renderer.clientToScreen(event.clientX, event.clientY);
    }

    handlePointerDown(event) {
      if (!this.enabled) return;
      const point = this.pointFromEvent(event);
      const pointer = {
        id: event.pointerId,
        type: event.pointerType,
        button: event.button,
        start: point,
        current: point,
        previous: point,
        startedAt: global.performance.now(),
        moved: false,
        mode: "pending",
        additive: event.shiftKey,
      };

      if (event.pointerType !== "touch" && (event.button === 1 || (event.button === 0 && this.spaceHeld))) {
        pointer.mode = "pan";
      } else if (event.pointerType !== "touch" && event.button === 2) {
        pointer.mode = "command";
        this.callbacks.onCommand?.({ screen: point, world: this.renderer.screenToWorld(point.x, point.y), source: "mouse" });
      }

      this.pointers.set(event.pointerId, pointer);
      this.canvas.setPointerCapture?.(event.pointerId);
      if (event.pointerType === "touch" && this.touchPointers().length >= 2) this.beginPinch();
      this.syncInputMode();
      event.preventDefault();
    }

    handlePointerMove(event) {
      const point = this.pointFromEvent(event);
      const pointer = this.pointers.get(event.pointerId);
      if (!pointer) {
        if (this.enabled && event.pointerType !== "touch") this.emitHover(point);
        return;
      }

      pointer.previous = pointer.current;
      pointer.current = point;
      const travelled = distance(pointer.start, point);
      const dragSlop = pointer.type === "touch" ? TOUCH_DRAG_SLOP : MOUSE_DRAG_SLOP;
      if (travelled > dragSlop) pointer.moved = true;

      const touches = this.touchPointers();
      if (pointer.type === "touch" && touches.length >= 2) {
        this.updatePinch(touches[0], touches[1]);
        event.preventDefault();
        return;
      }

      if (pointer.type === "touch" && pointer.moved) pointer.mode = "pan";
      if (pointer.mode === "pending" && pointer.type !== "touch" && pointer.button === 0 && pointer.moved) {
        pointer.mode = "box";
      }

      if (pointer.mode === "pan") {
        this.renderer.pan(point.x - pointer.previous.x, point.y - pointer.previous.y);
        this.callbacks.onCameraChange?.(this.renderer.camera);
      } else if (pointer.mode === "box") {
        this.selectionBox = {
          x1: pointer.start.x,
          y1: pointer.start.y,
          x2: point.x,
          y2: point.y,
        };
        this.callbacks.onSelectionBox?.(this.selectionBox);
      } else if (pointer.type !== "touch") {
        this.emitHover(point);
      }

      this.syncInputMode();
      event.preventDefault();
    }

    handlePointerUp(event) {
      const pointer = this.pointers.get(event.pointerId);
      if (!pointer) return;
      const point = this.pointFromEvent(event);
      pointer.current = point;
      const elapsed = global.performance.now() - pointer.startedAt;

      if (pointer.mode === "box" && this.selectionBox) {
        this.callbacks.onBoxSelect?.({ rectangle: this.selectionBox, additive: pointer.additive || event.shiftKey });
      } else if (
        pointer.mode === "pending" &&
        pointer.button === 0 &&
        distance(pointer.start, point) <= (pointer.type === "touch" ? TOUCH_DRAG_SLOP : 8) &&
        elapsed < (pointer.type === "touch" ? 750 : 650)
      ) {
        this.callbacks.onPrimary?.({
          screen: point,
          world: this.renderer.screenToWorld(point.x, point.y),
          additive: pointer.additive || event.shiftKey,
          source: pointer.type === "touch" ? "touch" : "mouse",
        });
      }

      this.pointers.delete(event.pointerId);
      this.canvas.releasePointerCapture?.(event.pointerId);
      this.selectionBox = null;
      this.callbacks.onSelectionBox?.(null);
      if (this.touchPointers().length < 2) this.pinch = null;
      this.syncInputMode();
      event.preventDefault();
    }

    handlePointerCancel(event) {
      if (!this.pointers.has(event.pointerId)) return;
      this.pointers.delete(event.pointerId);
      this.canvas.releasePointerCapture?.(event.pointerId);
      this.selectionBox = null;
      this.callbacks.onSelectionBox?.(null);
      if (this.touchPointers().length < 2) this.pinch = null;
      this.syncInputMode();
      event.preventDefault();
    }

    touchPointers() {
      return Array.from(this.pointers.values()).filter((pointer) => pointer.type === "touch");
    }

    beginPinch() {
      const touches = this.touchPointers();
      if (touches.length < 2) return;
      const first = touches[0].current;
      const second = touches[1].current;
      this.pinch = {
        distance: Math.max(1, distance(first, second)),
        center: midpoint(first, second),
      };
      touches[0].mode = "pinch";
      touches[1].mode = "pinch";
      this.selectionBox = null;
    }

    updatePinch(firstPointer, secondPointer) {
      const first = firstPointer.current;
      const second = secondPointer.current;
      const nextDistance = Math.max(1, distance(first, second));
      const nextCenter = midpoint(first, second);
      if (!this.pinch) {
        this.pinch = { distance: nextDistance, center: nextCenter };
        return;
      }

      this.renderer.pan(nextCenter.x - this.pinch.center.x, nextCenter.y - this.pinch.center.y);
      this.renderer.zoomAt(nextCenter.x, nextCenter.y, nextDistance / this.pinch.distance);
      this.pinch.distance = nextDistance;
      this.pinch.center = nextCenter;
      this.callbacks.onCameraChange?.(this.renderer.camera);
    }

    handleWheel(event) {
      if (!this.enabled) return;
      const point = this.pointFromEvent(event);
      const normalized = event.deltaMode === 1 ? event.deltaY * 18 : event.deltaY;
      this.renderer.zoomAt(point.x, point.y, Math.exp(-normalized * 0.00125));
      this.callbacks.onCameraChange?.(this.renderer.camera);
      event.preventDefault();
    }

    handleKeyDown(event) {
      if (isEditable(event.target)) return;
      if (event.code === "Space") {
        this.spaceHeld = true;
        if (this.enabled) event.preventDefault();
      }
      if (!this.enabled) return;

      this.keys.add(event.code);
      if (event.code === "Escape") {
        this.callbacks.onEscape?.();
        event.preventDefault();
      } else if (/^Digit[1-6]$/.test(event.code) && !event.repeat) {
        this.callbacks.onRecruitShortcut?.(Number(event.code.slice(-1)) - 1);
        event.preventDefault();
      } else if (event.code === "KeyF" && !event.repeat) {
        this.callbacks.onFocusSelection?.();
        event.preventDefault();
      } else if (event.code === "KeyQ" && !event.repeat) {
        this.callbacks.onSelectArmy?.();
        event.preventDefault();
      } else if (event.code === "Enter" && !event.repeat) {
        this.callbacks.onCommandAtFocus?.();
        event.preventDefault();
      }
    }

    handleKeyUp(event) {
      this.keys.delete(event.code);
      if (event.code === "Space") this.spaceHeld = false;
    }

    handleBlur() {
      this.keys.clear();
      this.spaceHeld = false;
      this.resetTransient();
    }

    emitHover(point) {
      const now = global.performance.now();
      if (now - this.lastHoverAt < 32) return;
      this.lastHoverAt = now;
      this.callbacks.onHover?.({ screen: point, world: this.renderer.screenToWorld(point.x, point.y) });
    }

    update(deltaSeconds) {
      if (!this.enabled || this.keys.size === 0) return;
      const horizontal = Number(this.keys.has("KeyD") || this.keys.has("ArrowRight"))
        - Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
      const vertical = Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"))
        - Number(this.keys.has("KeyW") || this.keys.has("ArrowUp"));
      if (horizontal === 0 && vertical === 0) return;

      const length = Math.hypot(horizontal, vertical) || 1;
      const speed = Math.min(this.renderer.width, this.renderer.height) * 0.72;
      this.renderer.pan(
        -(horizontal / length) * speed * deltaSeconds,
        -(vertical / length) * speed * deltaSeconds,
      );
      this.callbacks.onCameraChange?.(this.renderer.camera);
    }

    syncInputMode() {
      const panning = Array.from(this.pointers.values()).some((pointer) => pointer.mode === "pan" || pointer.mode === "pinch");
      document.body.dataset.inputMode = panning ? "pan" : "command";
    }

    resetTransient() {
      this.pointers.clear();
      this.keys.clear();
      this.spaceHeld = false;
      this.pinch = null;
      this.selectionBox = null;
      this.callbacks.onSelectionBox?.(null);
      this.syncInputMode();
    }

    destroy() {
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      this.canvas.removeEventListener("pointermove", this.handlePointerMove);
      this.canvas.removeEventListener("pointerup", this.handlePointerUp);
      this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
      this.canvas.removeEventListener("wheel", this.handleWheel);
      global.removeEventListener("keydown", this.handleKeyDown);
      global.removeEventListener("keyup", this.handleKeyUp);
      global.removeEventListener("blur", this.handleBlur);
    }
  }

  AOK.InputController = InputController;
})(window);
