# Phase 3 entity and movement foundation

Status: **authorized; implementation has not started on this planning branch**

This document owns the exact Phase 3 implementation and evidence contract. [`STATUS.md`](STATUS.md) owns volatile source, merge, deployment, browser, physical-device, Engineering Standard, and owner-gate state. [`REDESIGN.md`](REDESIGN.md) owns the ordered roadmap. [`PHASE2_FOUNDATION.md`](PHASE2_FOUNDATION.md), [`PHASE1B_VISUAL_LOCK.md`](PHASE1B_VISUAL_LOCK.md), and [`PRODUCTION_ART.md`](PRODUCTION_ART.md) remain binding inputs.

The product owner approved the complete Phase 2 candidate on 2026-08-22 and authorized Phase 3. That approval closes the empty-battlefield and camera-feel gate. It authorizes only the entity, selection, movement, replay, snapshot, checksum, and rendered-evidence work below. It does not authorize structures/economy/production/rally, combat, AI, networking code, a tag, a GitHub Release, or a replacement gameplay release.

## Scope and exclusions

Phase 3 may implement:

- one new `phase3/` candidate route that preserves the approved Phase 2 landscape shell, camera, map, and six world-layer owners;
- a new fixed-step authoritative simulation containing bounded combat entities and validated `MOVE` commands;
- click, tap, box, and additive selection plus contextual terrain movement orders;
- deterministic polygon-aware routing, stable formation destinations, footprint-aware separation, and bounded congestion recovery;
- approved representative entity base art and aligned player-color masks at the selected runtime tier, with stable idle and four-frame movement playback;
- canonical snapshots, replay logs, restore-and-continue behavior, and periodic checksums;
- rendered desktop, tablet-landscape, and phone-landscape evidence for the Phase 3 owner gate.

Phase 3 must not implement capture, resources, population, production, queues, rally points, attack orders, combat, health outcomes, projectiles, defeat, AI, rooms, signaling, WebRTC, TURN, accounts, matchmaking, a fourth structure category, or any prototype compatibility API. The preserved prototype source and tests remain historical and excluded from the Pages runtime.

## Authoritative configuration

One immutable Phase 3 configuration is the source of truth for exact values:

| Rule | Candidate value |
| --- | --- |
| Simulation cadence | 20 Hz; 50 ms fixed tick |
| Fixed-point position scale | 100 integer subunits per world unit |
| Maximum catch-up | 4 ticks per rendered frame |
| Opening combat entities | 12 total; 6 per player |
| Combat-entity hard cap | 24 |
| Selection cap | 12 |
| Pending command cap | 64 |
| Accepted command lead | 1–8 ticks |
| Navigation cell | 32 world units |
| Path-search node cap | 2,048 |
| Compressed waypoint cap | 96 |
| Separation solver | 2 stable deterministic passes per tick |
| Congestion check | 20 ticks without material progress |
| Repath cap | 3 attempts per order |
| Checksum cadence | Every 20 ticks |
| Runtime art | 128 px cells by default; 96 px cells only through an explicit pre-battle Compact art setting |
| Logical render cell | 160×160 world units for both tiers; destination root `(80,147.5)` |

The representative movement values begin at 34 world units/second with radius 16 for melee, 31 with radius 14 for ranged, and 24 with radius 24 for signature entities. These are explicit Phase 3 candidate values, not faction balance approval. The owner gate may adjust them without expanding Phase 3.

## Entity and command contract

- The authoritative collection is named `entities`. Runtime gameplay code, state, selectors, commands, tests, and accessibility labels use `entity`, `entityId`, or `entityIds`; no live `unit*` alias or compatibility shim is allowed.
- Every entity has one stable ASCII string identifier, owner seat, approved representative kind, fixed-point position, footprint radius, movement speed, facing, order state, route, route index, formation destination, repath count, and deterministic progress marker. Identifier ordering compares raw code units and never depends on locale.
- The starting roster uses the six approved Phase 1A representatives: Astral Guardian, Starbow, Aegis Titan, Gravebound Reaver, Hollow String, and Ossuary Colossus. Each player receives its faction's melee, ranged, and signature representative twice.
- The only authoritative player command in Phase 3 is `MOVE`. It carries protocol/config identity, issuing player, sequence, target tick, a bounded sorted set of owned `entityIds`, and one quantized terrain destination. The authoritative command receiver assigns one globally increasing sequence; accepted commands execute in total order `(targetTick, sequence)`. A future network host owns that same assignment without changing game rules.
- Command validation rejects unknown fields, invalid types, non-finite or out-of-range values, duplicate identifiers, foreign or missing entities, stale or excessive target ticks, oversized selection, queue overflow, and destinations without static footprint clearance. At the execution tick, route assignment for the whole command is atomic because the world may have changed: if any selected entity has no bounded legal route, every prior order is preserved and a readable `unreachable` result is emitted.
- UI selection, hover, camera, animation time, rendered interpolation, debug display, and telemetry are never authoritative snapshot fields.

## Routing, formation, and congestion contract

- Navigation is derived only from the authored Phase 2 blocker polygons and explicit map bounds. Image pixels never decide walkability.
- Stable A* operates on the 32-unit grid with fixed neighbor order and deterministic tie-breaking. Diagonal movement cannot cut a blocked corner. A footprint's entire clearance, not only its centre, must remain legal.
- A failed bounded search reports `unreachable`; it never fabricates a final destination, silently clamps into blocked terrain, or discards a previously valid state.
- A group order assigns unique formation destinations from stable sorted entity identifiers. Slot spacing incorporates the participating footprints, and large entities receive valid wider clearance.
- Paths are compressed only when the complete straight segment remains legal for that footprint. Route and waypoint counts are capped.
- Local separation considers nearby moving entities in stable identifier order, uses two bounded passes, and cannot move an entity through a hard blocker.
- An entity that makes no material progress for 20 ticks performs at most three deterministic repaths. If it still cannot continue, it stops with readable status rather than spinning, teleporting, overlapping indefinitely, or growing work without bound.

## Art and presentation contract

- Runtime art is derived only from the approved 384 px Phase 1A atlases and aligned masks. Each selected tier is cropped and resized per cell before packing; masks are clamped to base alpha. Phase 3 implementation must add six Standard and six Compact base/mask pairs—24 files—derived from the six masters; the four existing Astral Phase 1B review samples remain untouched and are not promoted as runtime files. The player chooses Standard (128) or Compact (96) in Settings before battle; viewport or device heuristics never switch tiers silently.
- One recorded exporter and codec toolchain creates all six runtime pairs at both tiers. It independently resizes each source cell, re-locks movement rows `0–97` at Standard or `0–73` at Compact, clears the one-pixel border of every resized cell after filtering, clamps mask alpha to the corresponding base alpha, and then packs row-major. The six-representative ceiling is 694,040 encoded bytes and 12 MiB decoded RGBA for Standard, 435,142 bytes and 6.75 MiB for Compact, and 1,129,182 encoded bytes when both tracked tiers ship; actual generated bytes and hashes replace ceilings only after measurement.
- Both tiers draw into the same 160×160-world-unit destination cell, matching the approved actual-scale playback. Standard scales source root `(64,118)` by `5/4`; Compact scales `(48,88.5)` by `5/3`; both land on destination root `(80,147.5)`. Art tier never changes apparent entity scale, ground contact, selection bounds, navigation footprint, or authoritative position. Desktop and 844×390 landscape evidence must still compare minimum, normal, and maximum zoom against the approved compositions.
- The 4×4 runtime layout maps movement to cells 0–3, action to 4–9, and defeat to 10–15; stable idle aliases movement cell 0. Phase 3 loads and plays only idle/move even though the bounded atlas preserves later families.
- Movement cells retain a pixel-identical upper-body/equipment region. Canonical art faces screen-right; screen-left is rendered only by exact horizontal `scaleX(-1)` around the shared ground root.
- Base and mask are frame-aligned and drawn independently. The mask recolors only approved ownership surfaces, and every owner remains identifiable through a non-color seat symbol in the world and accessible status.
- Player color is prepared once per loaded atlas, not recomputed in the hot render loop. For every masked pixel, coverage is `baseAlpha === 0 ? 0 : min(1, maskAlpha / baseAlpha)`. The runtime converts base and target color to HSL, substitutes the target hue and saturation while preserving the base pixel's lightness, mixes that result with the original RGB by normalized coverage, and preserves the original base alpha. Tests cover all six locked colors—Azure, Violet, Coral, Emerald, Amber, and Magenta—including antialiased-edge halo checks; a flat `source-in` fill or raw `maskAlpha / 255` mix is prohibited because either loses approved shading or leaks the source faction hue at translucent edges.
- Before simulation starts, the local loader validates the selected tier's manifest schema, same-origin relative paths, paired base/mask completion, natural dimensions, decoded per-cell border alpha, and `maskAlpha <= baseAlpha` while preparing the ownership variants. Dependency-free Node source and Pages-byte checks freeze encoded SHA-256, bytes, dimensions, manifest/frame/root mapping, and budgets; one recorded exporter decode/round-trip audit proves upper-body identity and pixel invariants. The browser does not claim a cross-browser decoded-RGBA fingerprint. Failure produces a stable text-only preload error and instantiates no entity; no external fallback is requested.
- No limb rig, runtime anatomy deformation, procedural stand-in, geometric placeholder ship, independently drawn left art, or independently redrawn idle/move upper body is permitted.
- Rendering may interpolate the last and current fixed states but may not mutate either. Movement distance and order completion remain simulation-owned.

## Input and lifecycle contract

- Desktop supports click selection, drag-box selection, additive selection, contextual right-click terrain move, keyboard camera movement, and focus-centred wheel/button zoom.
- Touch supports tap selection, an explicit Move mode for terrain destinations, and two-pointer camera pan/pinch. One-finger entity interaction never silently becomes camera drag or a move command.
- Empty selection clears unless additive selection is active. Commands receive visible world feedback, and rejection/unreachable/stop results have readable DOM status outside Canvas.
- Pointer cancellation, lost capture, blur, page hide, portrait entry, resize, menu return, and teardown clear transient input without altering authoritative history.
- The Phase 2 viewport, safe-area, letterbox, orientation, pause, focus, resource-failure, and cleanup contracts remain unchanged.

## Replay, snapshot, and checksum contract

- A replay is the exact configuration/map/seed identity plus the validated, totally ordered command log. Replaying it from the same initial state must reproduce every periodic checksum and final snapshot.
- The canonical snapshot is versioned, detached, JSON-safe, stably ordered, finite, bounded, and complete for every field that can change a future result. Restore validates the same bounds before allocation and must converge after continued execution.
- The checksum consumes one canonical binary/text encoding of that snapshot. Object insertion order, UI selection, camera, animation interpolation, debug state, and wall-clock timing cannot change it; any authoritative field change must.
- `Math.random`, current time, render cadence, network timing, and iteration over unstable collection order never own a result.
- Phase 1A masters do not define authoritative attack contact/effect cues. Phase 3 uses no attack frames; Phase 5 must define simulation-owned contact timing rather than infer damage from an atlas frame index.

## Evidence matrix

| Evidence category | Required evidence | Current state |
| --- | --- | --- |
| Phase 2 owner gate | Explicit approval of empty battlefield and camera feel | Passed by owner message on 2026-08-22 |
| Source contract | Bounded simulation, entity terminology, selected-tier assets, input, presentation, and local-only delivery agree with this document | Pending implementation |
| Focused automation | Entity/command, navigation/movement, replay/snapshot/checksum, input/render/art, and delivery suites | Pending implementation |
| Complete automation | `node tests/run.js` | Pending implementation |
| Pages payload | Exact allowlist and `_site` inspection | Pending implementation |
| Diff hygiene | `git diff --check` and complete branch review | Pending implementation |
| Desktop rendered review | Selection, open-field movement, blocker routing, choke exit, mirroring, masks, and readable status | Pending implementation |
| Tablet/phone landscape | Safe areas, tap/Move mode, two-pointer camera, formation readability, and recovery | Pending implementation |
| Determinism | Same seed/config/commands produce matching hashes and final snapshot; restore converges | Pending implementation |
| Deployed review | Protected merge, Actions/Pages, exact live files, and primary journey | Pending implementation |
| Broad browsers and physical devices | Named browser/device sessions | Pending |
| Owner gate | Selected armies move naturally without stacking, visual drift, or placeholder ships | Pending explicit Phase 3 approval |

Rendered browser emulation is not physical-device evidence. Passing automation does not prove movement feel. Deployment does not approve the phase.

## Owner gate and next boundary

Phase 3 closes only after the frozen candidate has its required source, automated, rendered, and deployed evidence and the product owner explicitly confirms that selected armies move naturally without stacking, visual drift, or placeholder ships. Until then:

- Phase 3 remains active after implementation begins;
- the approved Phase 1A art, Phase 1B target, Phase 2 landscape/camera foundation, exactly three structure categories, environment separation, and player-color-plus-symbol rules remain locked;
- Phase 4 structures, economy, production, and rally remain blocked;
- the future private host/client room-code plan remains documentation only, with `connect-src 'none'` and no networking dependency in Phase 3;
- Engineering Standard v1.0 remains `adopting` while any applicable evidence is pending;
- no tag or GitHub Release is created.
