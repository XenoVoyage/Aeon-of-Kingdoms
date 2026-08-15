/* global window, document */
(function attachRenderer(global) {
  "use strict";

  const AOK = (global.AOK = global.AOK || {});
  const TAU = Math.PI * 2;
  const DEFAULT_WORLD = { width: 2400, height: 1500 };
  const RENDER = AOK.CONFIG?.RENDER || {
    maximumDevicePixelRatio: 2,
    maximumBackingPixels: 5200000,
    starCount: 220,
  };
  const PLAYER_COLORS = [
    "#4de8ff",
    "#a878ff",
    "#ff6e93",
    "#ffc86b",
    "#5ee7a0",
    "#6f98ff",
  ];

  const ROLE_SHAPES = Object.freeze({
    vanguard: 3,
    ranger: 4,
    bulwark: 6,
    breaker: 5,
    support: 8,
    ascendant: 6,
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function seeded(index) {
    let value = (index + 1) * 0x9e3779b1;
    value ^= value >>> 16;
    value = Math.imul(value, 0x21f0aaad);
    value ^= value >>> 15;
    value = Math.imul(value, 0x735a2d97);
    value ^= value >>> 15;
    return (value >>> 0) / 4294967296;
  }

  function rgba(hex, alpha) {
    if (typeof hex !== "string" || hex[0] !== "#") {
      return `rgba(77, 232, 255, ${alpha})`;
    }
    const clean = hex.slice(1);
    const value = clean.length === 3
      ? clean.split("").map((part) => part + part).join("")
      : clean;
    const number = Number.parseInt(value, 16);
    return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
  }

  function unitId(unit) {
    return unit.id == null ? "" : String(unit.id);
  }

  function unitRole(unit) {
    return String(unit.role || unit.type || "vanguard").toLowerCase();
  }

  function unitHealth(unit) {
    return finite(unit.health, finite(unit.hp, 1));
  }

  function unitMaxHealth(unit) {
    return Math.max(1, finite(unit.maxHealth, finite(unit.maxHp, unitHealth(unit))));
  }

  function ownerId(entity) {
    return entity.ownerId == null ? entity.playerId : entity.ownerId;
  }

  function isGraveboundFaction(factionId) {
    const identity = String(factionId || "").toLowerCase();
    return identity.includes("gravebound") || identity.includes("undead");
  }

  function entityRadius(entity, fallback) {
    return Math.max(2, finite(entity.radius, finite(entity.size, fallback)));
  }

  class Renderer {
    constructor(canvas) {
      if (!(canvas instanceof global.HTMLCanvasElement)) {
        throw new TypeError("Renderer requires a canvas element.");
      }

      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!this.ctx) {
        throw new Error("Canvas 2D is not supported by this browser.");
      }

      this.width = 1;
      this.height = 1;
      this.dpr = 1;
      this.world = this.readWorldSize();
      this.camera = {
        x: this.world.width * 0.5,
        y: this.world.height * 0.5,
        zoom: 0.7,
        minZoom: 0.28,
        maxZoom: 2.15,
      };
      this.stars = this.createStars(RENDER.starCount);
      this.nebulae = this.createNebulae();
      this.lastSelection = null;
      this.motionQuery = typeof global.matchMedia === "function"
        ? global.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
      this.reducedMotion = Boolean(this.motionQuery?.matches);
      this.handleMotionChange = (event) => {
        this.reducedMotion = Boolean(event.matches);
      };
      if (typeof this.motionQuery?.addEventListener === "function") {
        this.motionQuery.addEventListener("change", this.handleMotionChange);
      } else {
        this.motionQuery?.addListener?.(this.handleMotionChange);
      }
      this.handleResize = () => this.resize();
      this.resizeObserver = typeof global.ResizeObserver === "function"
        ? new global.ResizeObserver(() => this.resize())
        : null;
      this.resizeObserver?.observe(canvas);
      global.addEventListener("resize", this.handleResize, { passive: true });
      this.resize();
    }

    readWorldSize(state) {
      const config = AOK.CONFIG || {};
      const map = config.MAP || config.map || {};
      const settings = state?.settings || {};
      return {
        width: Math.max(600, finite(settings.mapWidth, finite(map.width, DEFAULT_WORLD.width))),
        height: Math.max(400, finite(settings.mapHeight, finite(map.height, DEFAULT_WORLD.height))),
      };
    }

    setWorldFromState(state) {
      const next = this.readWorldSize(state);
      if (next.width === this.world.width && next.height === this.world.height) return;
      this.world = next;
      this.clampCamera();
    }

    resize() {
      const bounds = this.canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const requestedDpr = Math.min(
        RENDER.maximumDevicePixelRatio,
        Math.max(1, finite(global.devicePixelRatio, 1)),
      );
      const pixelLimitedDpr = Math.sqrt(RENDER.maximumBackingPixels / Math.max(1, width * height));
      const dpr = Math.min(requestedDpr, pixelLimitedDpr);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);

      if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
      }

      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.clampCamera();
    }

    fitWorld(padding) {
      const inset = Math.max(0, finite(padding, 80));
      const zoomX = (this.width - inset * 2) / this.world.width;
      const zoomY = (this.height - inset * 2) / this.world.height;
      this.camera.x = this.world.width * 0.5;
      this.camera.y = this.world.height * 0.5;
      this.camera.zoom = clamp(Math.min(zoomX, zoomY), this.camera.minZoom, 1.1);
      this.clampCamera();
    }

    focus(x, y, zoom) {
      this.camera.x = finite(x, this.camera.x);
      this.camera.y = finite(y, this.camera.y);
      if (Number.isFinite(zoom)) this.camera.zoom = zoom;
      this.clampCamera();
    }

    pan(screenDx, screenDy) {
      this.camera.x -= finite(screenDx, 0) / this.camera.zoom;
      this.camera.y -= finite(screenDy, 0) / this.camera.zoom;
      this.clampCamera();
    }

    zoomAt(screenX, screenY, factor) {
      const before = this.screenToWorld(screenX, screenY);
      this.camera.zoom = clamp(
        this.camera.zoom * finite(factor, 1),
        this.camera.minZoom,
        this.camera.maxZoom,
      );
      const after = this.screenToWorld(screenX, screenY);
      this.camera.x += before.x - after.x;
      this.camera.y += before.y - after.y;
      this.clampCamera();
    }

    clampCamera() {
      const zoom = Math.max(0.01, this.camera.zoom);
      const halfWidth = this.width / (2 * zoom);
      const halfHeight = this.height / (2 * zoom);
      const overflowX = halfWidth >= this.world.width * 0.5;
      const overflowY = halfHeight >= this.world.height * 0.5;
      this.camera.x = overflowX
        ? this.world.width * 0.5
        : clamp(this.camera.x, halfWidth, this.world.width - halfWidth);
      this.camera.y = overflowY
        ? this.world.height * 0.5
        : clamp(this.camera.y, halfHeight, this.world.height - halfHeight);
    }

    screenToWorld(screenX, screenY) {
      return {
        x: this.camera.x + (finite(screenX, 0) - this.width * 0.5) / this.camera.zoom,
        y: this.camera.y + (finite(screenY, 0) - this.height * 0.5) / this.camera.zoom,
      };
    }

    clientToScreen(clientX, clientY) {
      const bounds = this.canvas.getBoundingClientRect();
      return {
        x: finite(clientX, 0) - bounds.left,
        y: finite(clientY, 0) - bounds.top,
      };
    }

    worldToScreen(worldX, worldY) {
      return {
        x: (finite(worldX, 0) - this.camera.x) * this.camera.zoom + this.width * 0.5,
        y: (finite(worldY, 0) - this.camera.y) * this.camera.zoom + this.height * 0.5,
      };
    }

    visibleBounds(margin) {
      const extra = finite(margin, 0) / this.camera.zoom;
      const topLeft = this.screenToWorld(-margin, -margin);
      const bottomRight = this.screenToWorld(this.width + margin, this.height + margin);
      return {
        minX: topLeft.x - extra,
        minY: topLeft.y - extra,
        maxX: bottomRight.x + extra,
        maxY: bottomRight.y + extra,
      };
    }

    createStars(count) {
      const stars = [];
      for (let index = 0; index < count; index += 1) {
        stars.push({
          x: seeded(index * 4) * DEFAULT_WORLD.width,
          y: seeded(index * 4 + 1) * DEFAULT_WORLD.height,
          radius: 0.45 + seeded(index * 4 + 2) * 1.4,
          alpha: 0.12 + seeded(index * 4 + 3) * 0.46,
        });
      }
      return stars;
    }

    createNebulae() {
      return [
        { x: 0.22, y: 0.32, radius: 410, color: "#2146a7", alpha: 0.085 },
        { x: 0.68, y: 0.56, radius: 520, color: "#6e3bc5", alpha: 0.07 },
        { x: 0.83, y: 0.18, radius: 320, color: "#1689aa", alpha: 0.06 },
      ];
    }

    getPlayerColor(state, id) {
      const players = Array.isArray(state?.players) ? state.players : [];
      const index = players.findIndex((player) => String(player.id) === String(id));
      const player = index >= 0 ? players[index] : null;
      return player?.color || PLAYER_COLORS[index >= 0 ? index % PLAYER_COLORS.length : 0];
    }

    hitTestUnit(state, screenX, screenY, options) {
      const point = this.screenToWorld(screenX, screenY);
      const units = Array.isArray(state?.units) ? state.units : [];
      const playerId = options?.playerId;
      let nearest = null;
      let nearestDistance = Infinity;

      for (let index = units.length - 1; index >= 0; index -= 1) {
        const unit = units[index];
        if (unit.dead || unitHealth(unit) <= 0) continue;
        if (playerId != null && String(ownerId(unit)) !== String(playerId)) continue;
        const radius = Math.max(entityRadius(unit, 12), 13 / this.camera.zoom);
        const dx = finite(unit.x, 0) - point.x;
        const dy = finite(unit.y, 0) - point.y;
        const distance = dx * dx + dy * dy;
        if (distance <= radius * radius && distance < nearestDistance) {
          nearest = unit;
          nearestDistance = distance;
        }
      }
      return nearest;
    }

    hitTestSite(state, screenX, screenY) {
      const point = this.screenToWorld(screenX, screenY);
      const sites = [
        ...(Array.isArray(state?.sites) ? state.sites : []),
        ...(Array.isArray(state?.structures) ? state.structures : []),
      ];
      let nearest = null;
      let nearestDistance = Infinity;
      for (const site of sites) {
        const radius = entityRadius(site, 34);
        const dx = finite(site.x, 0) - point.x;
        const dy = finite(site.y, 0) - point.y;
        const distance = dx * dx + dy * dy;
        if (distance < radius * radius && distance < nearestDistance) {
          nearest = site;
          nearestDistance = distance;
        }
      }
      return nearest;
    }

    unitsInScreenRect(state, rectangle, playerId) {
      const first = this.screenToWorld(rectangle.x1, rectangle.y1);
      const second = this.screenToWorld(rectangle.x2, rectangle.y2);
      const minX = Math.min(first.x, second.x);
      const minY = Math.min(first.y, second.y);
      const maxX = Math.max(first.x, second.x);
      const maxY = Math.max(first.y, second.y);
      return (Array.isArray(state?.units) ? state.units : []).filter((unit) => {
        if (unit.dead || unitHealth(unit) <= 0) return false;
        if (playerId != null && String(ownerId(unit)) !== String(playerId)) return false;
        return unit.x >= minX && unit.x <= maxX && unit.y >= minY && unit.y <= maxY;
      });
    }

    render(state, ui) {
      this.setWorldFromState(state);
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = "#03050d";
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawScreenGlow(ctx);

      ctx.save();
      ctx.translate(this.width * 0.5, this.height * 0.5);
      ctx.scale(this.camera.zoom, this.camera.zoom);
      ctx.translate(-this.camera.x, -this.camera.y);

      this.drawWorld(ctx, state, ui || {});
      ctx.restore();

      if (state) this.drawMinimap(ctx, state, ui || {});
      if (ui?.selectionBox) this.drawSelectionBox(ctx, ui.selectionBox);
    }

    drawScreenGlow(ctx) {
      const gradient = ctx.createRadialGradient(
        this.width * 0.63,
        this.height * 0.42,
        0,
        this.width * 0.63,
        this.height * 0.42,
        Math.max(this.width, this.height) * 0.72,
      );
      gradient.addColorStop(0, "#111d42");
      gradient.addColorStop(0.5, "#070b19");
      gradient.addColorStop(1, "#02040b");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    drawWorld(ctx, state, ui) {
      this.drawMapBase(ctx);
      if (!state) {
        this.drawAttractMap(ctx, ui.time || 0);
        return;
      }

      const bounds = this.visibleBounds(90);
      this.drawObstacles(ctx, state.obstacles, bounds);
      this.drawLinks(ctx, state.sites);
      this.drawSites(ctx, state, state.sites, bounds);
      this.drawStructures(ctx, state, state.structures, bounds);
      this.drawOrders(ctx, state, ui.selectedIds);
      this.drawUnits(ctx, state, state.units, bounds, ui);
      this.drawEffects(ctx, state, state.effects, bounds);
    }

    drawMapBase(ctx) {
      const { width, height } = this.world;
      ctx.fillStyle = "#050817";
      ctx.fillRect(0, 0, width, height);

      for (const nebula of this.nebulae) {
        const x = nebula.x * width;
        const y = nebula.y * height;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, nebula.radius);
        gradient.addColorStop(0, rgba(nebula.color, nebula.alpha));
        gradient.addColorStop(1, rgba(nebula.color, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(x - nebula.radius, y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
      }

      ctx.fillStyle = "#9bdfff";
      for (const star of this.stars) {
        const x = (star.x / DEFAULT_WORLD.width) * width;
        const y = (star.y / DEFAULT_WORLD.height) * height;
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(x, y, star.radius / Math.max(0.65, this.camera.zoom), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const grid = 80;
      ctx.beginPath();
      for (let x = 0; x <= width; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.strokeStyle = "rgba(111, 151, 224, 0.045)";
      ctx.lineWidth = 1 / this.camera.zoom;
      ctx.stroke();

      ctx.strokeStyle = "rgba(107, 210, 255, 0.17)";
      ctx.lineWidth = 2 / this.camera.zoom;
      ctx.strokeRect(1, 1, width - 2, height - 2);
    }

    drawAttractMap(ctx, time) {
      const centerX = this.world.width * 0.67;
      const centerY = this.world.height * 0.5;
      const orbit = Math.min(this.world.width, this.world.height) * 0.34;
      const animationTime = this.reducedMotion ? 0 : time;
      const pulse = 0.5 + Math.sin(animationTime * 0.0012) * 0.5;

      ctx.save();
      ctx.globalAlpha = 0.48;
      ctx.setLineDash([12, 18]);
      ctx.lineWidth = 1.5 / this.camera.zoom;
      ctx.strokeStyle = "rgba(90, 182, 255, 0.18)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbit, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let index = 0; index < 6; index += 1) {
        const angle = -Math.PI * 0.5 + (index / 6) * TAU;
        const x = centerX + Math.cos(angle) * orbit;
        const y = centerY + Math.sin(angle) * orbit;
        ctx.strokeStyle = rgba(PLAYER_COLORS[index], 0.18);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();
        this.drawSiteGlyph(ctx, x, y, 26, "hq", PLAYER_COLORS[index], pulse * 0.18);
      }
      this.drawSiteGlyph(ctx, centerX, centerY, 42, "objective", "#c2b3ff", 0.22 + pulse * 0.12);
      ctx.restore();
    }

    drawObstacles(ctx, obstacles, bounds) {
      if (!Array.isArray(obstacles)) return;
      for (const obstacle of obstacles) {
        const x = finite(obstacle.x, 0);
        const y = finite(obstacle.y, 0);
        const radius = entityRadius(obstacle, 28);
        const rectangular = obstacle.shape === "rect";
        const halfWidth = rectangular ? Math.max(1, finite(obstacle.width, radius * 2)) * 0.5 : radius;
        const halfHeight = rectangular ? Math.max(1, finite(obstacle.height, radius * 2)) * 0.5 : radius;
        if (x + halfWidth < bounds.minX || x - halfWidth > bounds.maxX ||
            y + halfHeight < bounds.minY || y - halfHeight > bounds.maxY) continue;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(finite(obstacle.rotation, rectangular ? 0 : seeded(x + y) * TAU));
        ctx.fillStyle = "rgba(9, 16, 35, 0.96)";
        ctx.strokeStyle = "rgba(92, 122, 180, 0.24)";
        ctx.lineWidth = 1.5 / this.camera.zoom;
        ctx.beginPath();
        if (rectangular) {
          ctx.roundRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2, 9);
        } else {
          for (let point = 0; point < 7; point += 1) {
            const angle = (point / 7) * TAU;
            const variation = 0.76 + seeded(point + Math.round(x)) * 0.28;
            const px = Math.cos(angle) * radius * variation;
            const py = Math.sin(angle) * radius * variation;
            if (point === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
        if (rectangular) {
          ctx.beginPath();
          ctx.moveTo(-halfWidth * 0.72, 0);
          ctx.lineTo(halfWidth * 0.72, 0);
          ctx.strokeStyle = "rgba(154, 114, 255, 0.2)";
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    drawLinks(ctx, sites) {
      if (!Array.isArray(sites) || sites.length < 2) return;
      const hub = sites.find((site) => /hill|objective|core/i.test(site.kind || site.type || ""));
      if (!hub) return;
      ctx.save();
      ctx.setLineDash([8, 16]);
      ctx.strokeStyle = "rgba(104, 164, 235, 0.09)";
      ctx.lineWidth = 1 / this.camera.zoom;
      for (const site of sites) {
        if (site === hub) continue;
        ctx.beginPath();
        ctx.moveTo(site.x, site.y);
        ctx.lineTo(hub.x, hub.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawSites(ctx, state, sites, bounds) {
      if (!Array.isArray(sites)) return;
      for (const site of sites) {
        const x = finite(site.x, 0);
        const y = finite(site.y, 0);
        const radius = entityRadius(site, 32);
        if (x + radius < bounds.minX || x - radius > bounds.maxX || y + radius < bounds.minY || y - radius > bounds.maxY) continue;
        const color = ownerId(site) == null ? "#7890b9" : this.getPlayerColor(state, ownerId(site));
        const kind = String(site.kind || site.type || "resource").toLowerCase();
        this.drawSiteGlyph(ctx, x, y, radius, kind, color, 0.12);
        this.drawOwnerBadge(ctx, x, y, radius, ownerId(site), true);

        const progress = finite(site.captureProgress, finite(site.progress, 0));
        if (progress > 0 && progress < 1) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 8, -Math.PI * 0.5, -Math.PI * 0.5 + TAU * progress);
          ctx.strokeStyle = site.capturingPlayerId == null
            ? color
            : this.getPlayerColor(state, site.capturingPlayerId);
          ctx.lineWidth = 3 / this.camera.zoom;
          ctx.stroke();
        }

        if (this.camera.zoom >= 0.56) {
          ctx.fillStyle = "rgba(216, 235, 255, 0.68)";
          ctx.font = `${10 / this.camera.zoom}px ui-monospace, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(this.siteLabel(kind), x, y + radius + 12 / this.camera.zoom);
        }
      }
    }

    siteLabel(kind) {
      if (/recruit|barracks|forge|gate/.test(kind)) return "RELAY FORGE";
      if (/hill|objective|crown|core/.test(kind)) return "AEON CORE";
      if (/hq|head|citadel|base/.test(kind)) return "CITADEL";
      return "AETHER WELL";
    }

    drawSiteGlyph(ctx, x, y, radius, kind, color, glow) {
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowBlur = 30 / Math.max(0.7, this.camera.zoom);
      ctx.shadowColor = rgba(color, glow);

      ctx.beginPath();
      ctx.arc(0, 0, radius + 5, 0, TAU);
      ctx.fillStyle = rgba(color, 0.045);
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.28);
      ctx.lineWidth = 1.5 / this.camera.zoom;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.rotate(Math.PI * 0.25);
      const sides = /hill|objective|core/.test(kind) ? 8 : /recruit|forge|gate/.test(kind) ? 6 : 4;
      this.polygonPath(ctx, sides, radius * 0.58, 0);
      ctx.fillStyle = "rgba(7, 13, 30, 0.94)";
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.86);
      ctx.lineWidth = 2 / this.camera.zoom;
      ctx.stroke();

      ctx.rotate(-Math.PI * 0.25);
      ctx.fillStyle = rgba(color, 0.92);
      if (/recruit|forge|gate/.test(kind)) {
        ctx.fillRect(-radius * 0.28, -2 / this.camera.zoom, radius * 0.56, 4 / this.camera.zoom);
        ctx.fillRect(-2 / this.camera.zoom, -radius * 0.28, 4 / this.camera.zoom, radius * 0.56);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(2, radius * 0.13), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    drawStructures(ctx, state, structures, bounds) {
      if (!Array.isArray(structures)) return;
      for (const structure of structures) {
        const x = finite(structure.x, 0);
        const y = finite(structure.y, 0);
        const radius = entityRadius(structure, 48);
        if (x + radius < bounds.minX || x - radius > bounds.maxX || y + radius < bounds.minY || y - radius > bounds.maxY) continue;
        const color = this.getPlayerColor(state, ownerId(structure));
        const kind = String(structure.kind || structure.type || "hq").toLowerCase();

        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = rgba(color, 0.07);
        ctx.strokeStyle = rgba(color, 0.5);
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 10, 0, TAU);
        ctx.fill();
        ctx.stroke();

        for (let ring = 0; ring < 3; ring += 1) {
          ctx.rotate((ring % 2 ? -1 : 1) * 0.18);
          this.polygonPath(ctx, ring === 1 ? 6 : 4, radius * (0.82 - ring * 0.18), Math.PI * 0.25);
          ctx.fillStyle = ring === 2 ? rgba(color, 0.24) : "rgba(7, 13, 30, 0.97)";
          ctx.fill();
          ctx.strokeStyle = rgba(color, 0.55 - ring * 0.08);
          ctx.stroke();
        }

        if (/hq|citadel|base/.test(kind)) {
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.18, 0, TAU);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 18 / this.camera.zoom;
          ctx.fill();
        }
        ctx.restore();
        this.drawOwnerBadge(ctx, x, y, radius, ownerId(structure));
      }
    }

    drawOrders(ctx, state, selectedIds) {
      if (!(selectedIds instanceof Set) || selectedIds.size === 0) return;
      const units = Array.isArray(state.units) ? state.units : [];
      ctx.save();
      ctx.setLineDash([5, 9]);
      ctx.lineWidth = 1 / this.camera.zoom;
      for (const unit of units) {
        if (!selectedIds.has(unitId(unit))) continue;
        const target = unit.order?.target || unit.order || unit.target || unit.destination;
        const targetX = finite(target?.x, finite(unit.targetX, NaN));
        const targetY = finite(target?.y, finite(unit.targetY, NaN));
        if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) continue;
        const color = this.getPlayerColor(state, ownerId(unit));
        ctx.strokeStyle = rgba(color, 0.22);
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawUnits(ctx, state, units, bounds, ui) {
      if (!Array.isArray(units)) return;
      const selectedIds = ui.selectedIds instanceof Set ? ui.selectedIds : new Set();
      const hoveredId = ui.hoveredId == null ? "" : String(ui.hoveredId);
      const sorted = units.slice().sort((first, second) => finite(first.y, 0) - finite(second.y, 0));

      for (const unit of sorted) {
        if (unit.dead || unitHealth(unit) <= 0) continue;
        const x = finite(unit.x, 0);
        const y = finite(unit.y, 0);
        const radius = entityRadius(unit, unitRole(unit) === "ascendant" ? 20 : 12);
        if (x + radius < bounds.minX || x - radius > bounds.maxX || y + radius < bounds.minY || y - radius > bounds.maxY) continue;
        const id = unitId(unit);
        this.drawUnit(ctx, state, unit, radius, selectedIds.has(id), hoveredId === id, ui.time || 0);
      }
    }

    drawUnit(ctx, state, unit, radius, selected, hovered, time) {
      const role = unitRole(unit);
      const color = this.getPlayerColor(state, ownerId(unit));
      const faction = String(unit.factionId || unit.faction || "human").toLowerCase();
      const gravebound = isGraveboundFaction(faction);
      const health = unitHealth(unit);
      const maxHealth = unitMaxHealth(unit);
      const path = Array.isArray(unit.order?.path) ? unit.order.path : [];
      const waypoint = path[unit.order?.pathIndex || 0] || unit.order;
      const targetX = finite(unit.approachX, finite(waypoint?.x, NaN));
      const targetY = finite(unit.approachY, finite(waypoint?.y, NaN));
      const offsetX = targetX - finite(unit.x, 0);
      const offsetY = targetY - finite(unit.y, 0);
      const fallbackHeading = finite(unit.heading, finite(unit.angle, 0));
      const heading = Number.isFinite(offsetX) && Number.isFinite(offsetY) && Math.hypot(offsetX, offsetY) > 0.01
        ? Math.atan2(offsetY, offsetX)
        : fallbackHeading;
      const animationTime = this.reducedMotion ? 0 : time;
      const bob = role === "ascendant" ? Math.sin(animationTime * 0.0025 + finite(unit.x, 0)) * 0.8 : 0;

      ctx.save();
      ctx.translate(finite(unit.x, 0), finite(unit.y, 0) + bob);

      ctx.beginPath();
      ctx.ellipse(2, radius * 0.5, radius * 0.86, radius * 0.47, 0, 0, TAU);
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.fill();

      if (selected || hovered) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + (selected ? 6 : 3) / this.camera.zoom, 0, TAU);
        ctx.fillStyle = rgba(color, selected ? 0.09 : 0.04);
        ctx.fill();
        ctx.strokeStyle = rgba(color, selected ? 0.94 : 0.48);
        ctx.lineWidth = (selected ? 2 : 1) / this.camera.zoom;
        ctx.stroke();
      }

      ctx.rotate(heading);
      const sides = ROLE_SHAPES[role] || 4;
      const rotation = role === "vanguard" ? Math.PI * 0.5 : Math.PI * 0.25;
      this.polygonPath(ctx, sides, radius, rotation, gravebound ? 0.17 : 0);
      const body = ctx.createLinearGradient(-radius, -radius, radius, radius);
      body.addColorStop(0, rgba(color, faction.includes("undead") ? 0.62 : 0.42));
      body.addColorStop(0.48, "#10172a");
      body.addColorStop(1, "#050914");
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = rgba(color, selected ? 1 : 0.74);
      ctx.lineWidth = (role === "ascendant" ? 2.4 : 1.6) / this.camera.zoom;
      ctx.stroke();

      this.drawRoleMark(ctx, role, radius, color, gravebound);
      ctx.restore();
      this.drawOwnerBadge(ctx, finite(unit.x, 0), finite(unit.y, 0) + bob, radius, ownerId(unit));

      if (selected || health < maxHealth) {
        const width = radius * 1.9;
        const y = finite(unit.y, 0) - radius - 8 / this.camera.zoom;
        ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
        ctx.fillRect(finite(unit.x, 0) - width * 0.5, y, width, 3 / this.camera.zoom);
        ctx.fillStyle = health / maxHealth > 0.35 ? "#5ee7a0" : "#ff668c";
        ctx.fillRect(finite(unit.x, 0) - width * 0.5, y, width * clamp(health / maxHealth, 0, 1), 3 / this.camera.zoom);
      }
    }

    drawRoleMark(ctx, role, radius, color, gravebound) {
      ctx.strokeStyle = gravebound ? "#d8c4ff" : "#d7f8ff";
      ctx.fillStyle = color;
      ctx.lineWidth = 1.3 / this.camera.zoom;
      ctx.lineCap = "round";
      const span = radius * 0.48;

      if (role === "ranger") {
        ctx.beginPath();
        ctx.arc(0, 0, span, -1.05, 1.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-span * 0.2, -span);
        ctx.lineTo(span * 0.78, 0);
        ctx.lineTo(-span * 0.2, span);
        ctx.stroke();
      } else if (role === "bulwark") {
        ctx.beginPath();
        ctx.arc(0, 0, span, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.stroke();
        ctx.fillRect(-span * 0.5, -span, 2 / this.camera.zoom, span * 2);
      } else if (role === "breaker") {
        ctx.beginPath();
        ctx.moveTo(-span, -span);
        ctx.lineTo(span, span);
        ctx.moveTo(-span, span);
        ctx.lineTo(span, -span);
        ctx.stroke();
      } else if (role === "support") {
        ctx.beginPath();
        ctx.arc(0, 0, span * 0.48, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, span, 0, TAU);
        ctx.stroke();
      } else if (role === "ascendant") {
        ctx.beginPath();
        ctx.arc(0, 0, span, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, span * 0.36, 0, TAU);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-span, span * 0.7);
        ctx.lineTo(span, 0);
        ctx.lineTo(-span, -span * 0.7);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawOwnerBadge(ctx, x, y, radius, playerId, alwaysVisible) {
      if (playerId == null || (!alwaysVisible && this.camera.zoom < 0.52)) return;
      const label = String(Number(playerId) + 1);
      const badgeRadius = Math.max(3.6 / this.camera.zoom, radius * 0.24);
      const badgeX = x + radius * 0.62;
      const badgeY = y + radius * 0.62;
      ctx.save();
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, TAU);
      ctx.fillStyle = "rgba(2, 5, 13, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(238, 248, 255, 0.82)";
      ctx.lineWidth = 0.8 / this.camera.zoom;
      ctx.stroke();
      ctx.fillStyle = "#f2f8ff";
      ctx.font = `700 ${Math.max(5.5, 6.5 / this.camera.zoom)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, badgeX, badgeY + 0.2 / this.camera.zoom);
      ctx.restore();
    }

    drawMinimapOwnerBadge(ctx, x, y, playerId) {
      if (playerId == null) return;
      ctx.beginPath();
      ctx.arc(x, y, 4.2, 0, TAU);
      ctx.fillStyle = "rgba(2, 5, 13, 0.94)";
      ctx.fill();
      ctx.strokeStyle = "rgba(238, 248, 255, 0.9)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = "#f2f8ff";
      ctx.font = "700 6px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(Number(playerId) + 1), x, y + 0.35);
    }

    polygonPath(ctx, sides, radius, rotation, jitter) {
      ctx.beginPath();
      for (let point = 0; point < sides; point += 1) {
        const angle = rotation + (point / sides) * TAU;
        const variation = jitter ? 1 - (point % 2) * jitter : 1;
        const x = Math.cos(angle) * radius * variation;
        const y = Math.sin(angle) * radius * variation;
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    drawEffects(ctx, state, effects, bounds) {
      if (!Array.isArray(effects)) return;
      for (const effect of effects) {
        const x = finite(effect.x, 0);
        const y = finite(effect.y, 0);
        if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) continue;
        const life = clamp(finite(effect.life, 0.5), 0, 1);
        const color = effect.color || this.getPlayerColor(state, effect.playerId);
        ctx.beginPath();
        ctx.arc(x, y, finite(effect.radius, 12) * (1.25 - life * 0.25), 0, TAU);
        ctx.strokeStyle = rgba(color, life * 0.7);
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.stroke();
      }
    }

    drawMinimap(ctx, state) {
      if (this.width < 720 || this.height < 520) return;
      const mapWidth = 176;
      const mapHeight = Math.round(mapWidth * (this.world.height / this.world.width));
      const left = this.width - mapWidth - 18;
      const top = 92;
      const scaleX = mapWidth / this.world.width;
      const scaleY = mapHeight / this.world.height;

      ctx.save();
      ctx.fillStyle = "rgba(4, 8, 20, 0.76)";
      ctx.strokeStyle = "rgba(122, 183, 243, 0.24)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(left, top, mapWidth, mapHeight, 7);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(left, top, mapWidth, mapHeight);
      ctx.clip();

      for (const site of Array.isArray(state.sites) ? state.sites : []) {
        const siteOwnerId = ownerId(site);
        const markerX = left + site.x * scaleX;
        const markerY = top + site.y * scaleY;
        ctx.fillStyle = siteOwnerId == null ? "#6e7e9e" : this.getPlayerColor(state, siteOwnerId);
        ctx.beginPath();
        ctx.arc(markerX, markerY, siteOwnerId == null ? 2.2 : 5.2, 0, TAU);
        ctx.fill();
        this.drawMinimapOwnerBadge(ctx, markerX, markerY, siteOwnerId);
      }
      for (const unit of Array.isArray(state.units) ? state.units : []) {
        if (unit.dead || unitHealth(unit) <= 0) continue;
        ctx.fillStyle = this.getPlayerColor(state, ownerId(unit));
        ctx.fillRect(left + unit.x * scaleX - 0.75, top + unit.y * scaleY - 0.75, 1.5, 1.5);
      }
      for (const structure of Array.isArray(state.structures) ? state.structures : []) {
        if (structure.dead || !/hq|citadel|base/.test(String(structure.kind || structure.type || ""))) continue;
        const markerX = left + structure.x * scaleX;
        const markerY = top + structure.y * scaleY;
        ctx.beginPath();
        ctx.arc(markerX, markerY, 5, 0, TAU);
        ctx.fillStyle = this.getPlayerColor(state, ownerId(structure));
        ctx.fill();
        ctx.strokeStyle = "rgba(238, 248, 255, 0.88)";
        ctx.stroke();
        ctx.fillStyle = "#02050d";
        ctx.font = "700 7px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(Number(ownerId(structure)) + 1), markerX, markerY + 0.5);
      }

      const view = this.visibleBounds(0);
      ctx.strokeStyle = "rgba(237, 247, 255, 0.68)";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        left + view.minX * scaleX,
        top + view.minY * scaleY,
        (view.maxX - view.minX) * scaleX,
        (view.maxY - view.minY) * scaleY,
      );
      ctx.restore();
    }

    drawSelectionBox(ctx, rectangle) {
      const x = Math.min(rectangle.x1, rectangle.x2);
      const y = Math.min(rectangle.y1, rectangle.y2);
      const width = Math.abs(rectangle.x2 - rectangle.x1);
      const height = Math.abs(rectangle.y2 - rectangle.y1);
      ctx.fillStyle = "rgba(77, 232, 255, 0.08)";
      ctx.strokeStyle = "rgba(93, 235, 255, 0.82)";
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, height - 1));
    }

    destroy() {
      this.resizeObserver?.disconnect();
      global.removeEventListener("resize", this.handleResize);
      if (typeof this.motionQuery?.removeEventListener === "function") {
        this.motionQuery.removeEventListener("change", this.handleMotionChange);
      } else {
        this.motionQuery?.removeListener?.(this.handleMotionChange);
      }
    }
  }

  AOK.Renderer = Renderer;
})(window);
