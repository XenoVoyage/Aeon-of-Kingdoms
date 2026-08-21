# Phase 2 landscape battlefield foundation

Status: **active deployed candidate; compact/aspect/physical-device evidence and explicit Phase 2 owner approval pending**

This document owns the exact Phase 2 foundation contract and its evidence record. [`STATUS.md`](STATUS.md) owns the volatile current source, merge, deployment, browser, physical-device, Engineering Standard, and owner-gate state. [`REDESIGN.md`](REDESIGN.md) owns the ordered roadmap and gate. [`PHASE1B_VISUAL_LOCK.md`](PHASE1B_VISUAL_LOCK.md) and [`PRODUCTION_ART.md`](PRODUCTION_ART.md) remain authoritative for the approved visual/interaction target and production-art method.

The product owner explicitly approved the complete Phase 1B candidate on 2026-08-21 and authorized Phase 2 to begin, including autonomous protected publication and visual review of this bounded candidate. That approval permits only the landscape battlefield foundation below. It does not approve this Phase 2 candidate, Phase 3 entity or movement work, a tag, GitHub Release, or replacement release. The owner-retained menu design remains locked.

## Scope and exclusions

Phase 2 may implement:

- a new semantic menu/battlefield shell using the approved original menu composition;
- a landscape-only play surface with a portrait rotate gate and supported-size/aspect handling;
- bounded camera pan, focus-centred zoom, resize, pause, lifecycle cleanup, and input reset;
- one original two-player map definition with separate ground, detail, navigation, anchor, dynamic, and foreground data owners;
- an environment-only terrain renderer, explicit blocker data, structure/objective anchors, and an optional labelled navigation debug view;
- rendered desktop, tablet-landscape, and phone-landscape evidence for the owner gate.

Phase 2 must not implement combat entities, selection, formations, pathfinding, movement simulation, economy, capture, production, rally, combat, AI, networking, a fourth structure category, or any authoritative gameplay outcome. Those remain Phase 3 or later work. The rejected prototype renderer, map data, tuning, terminology, procedural art, and menu shell are not compatibility inputs.

## Semantic shell and menu contract

- The root project status page remains a truthful project handoff; the Phase 2 route is a separate candidate surface.
- The menu preserves the approved visual target in `concepts/images/minimal-menu.webp`: full-bleed illustrated landscape, clear Aeon of Kingdoms title, Begin and Settings as the primary actions, restrained audio/fullscreen controls, and no dashboard-card shell.
- All runtime resources remain local and repository-relative. The Phase 2 surface has a restrictive Content Security Policy, no CDN, analytics, telemetry, font request, dynamic code, or unreviewed network request.
- Menu resources are released before battlefield loading where the browser API permits it; the source does not claim memory release without measurement.
- A missing required environment resource produces a stable text-only local load error and blocks battlefield entry. It never fetches an external substitute.
- Controls use semantic elements, visible keyboard focus, at least 44 CSS pixel pointer targets, readable live status, and reduced-motion-safe presentation.

## Supported viewport contract

The approved Phase 1B policy is binding:

| Rule | Value |
| --- | --- |
| Supported landscape aspect range | 4:3 through 21:9 inclusive |
| Minimum gameplay viewport | 640×360 CSS pixels |
| Outside supported aspect range | Deliberate letterboxing inside the available landscape area |
| Portrait | Rotate-device gate only; battlefield is hidden/inert, transient input clears, and play is paused |
| Safe-area margin | `env(safe-area-inset-*)` plus 12 CSS pixels |
| Render scale | Device-pixel ratio is capped by the foundation configuration and measured later |

For an available area `w × h`, the play rectangle uses these exact rules:

- if `w / h < 4 / 3`, width is `w`, height is `w / (4 / 3)`, left is `0`, and top centres the result;
- if `w / h > 21 / 9`, height is `h`, width is `h × (21 / 9)`, top is `0`, and left centres the result;
- otherwise, the play rectangle fills the available area.

Pointer and touch coordinates subtract the play rectangle offset before camera projection. Gestures that begin in letterbox bars are rejected. A best-effort landscape orientation-lock request may run only after a user gesture; rejection or lack of API support is non-fatal and never bypasses the portrait gate.

## Camera and lifecycle contract

- Camera state is expressed in world coordinates and one bounded zoom scalar.
- Minimum zoom covers the play rectangle without showing world space outside the map. Maximum zoom is bounded by the foundation configuration.
- Panning clamps after keyboard, pointer, touch, resize, reset, and zoom operations.
- Wheel, button, and pinch zoom retain the world point beneath the chosen screen focus as far as map bounds allow.
- Pointer drag, two-pointer pan/pinch, keyboard pan, zoom controls, and reset are presentation inputs only; they do not create simulation commands.
- Resize preserves a legal camera state and recomputes the letterboxed play rectangle.
- Page hiding, loss of focus, portrait entry, and teardown clear held keys, pointers, gesture state, and scheduled work. Pause state is exposed as readable DOM text.
- Event listeners, observers, image references, and canvas backing stores are deterministically released by teardown.

## Map and layer contract

The first foundation map is an original two-player layout. Its schema version, map identifier, world dimensions, camera home, two spawns, routes, blockers, and anchors live in one local map definition. It uses exactly these six ordered data owners:

1. **Ground** — the environment-only battlefield plate.
2. **Detail** — non-blocking route and decorative presentation data.
3. **Navigation** — explicit blocker polygons and debug-grid metadata; pixels never decide walkability.
4. **Anchors** — camera home, two player spawns, and structure/objective placement.
5. **Dynamic** — an empty Phase 2 collection reserved for later authoritative projections; Phase 2 does not populate entities.
6. **Foreground** — explicit occlusion polygons or pieces drawn above later dynamic content.

The map uses exactly three structure-category identifiers: `headquarters`, `resource-point`, and `production-outpost`. Anchor data may identify a seat or faction but does not own a transient player color or symbol. Presentation may render a bounded preview cue using both color and a non-color symbol. Routes, spawns, and anchor footprints must remain outside blocker polygons with the tested clearance required by their radius.

The candidate map contract is deliberately small and inspectable:

| Field | Candidate value |
| --- | --- |
| Schema / identifier | `1` / `moonfall-crossing-two-player` |
| World | 1672×941 world units; ground metadata must match the source image |
| Players | Two stable seat anchors, one per opening faction |
| Camera home | `(836, 470.5)` at zoom `1` |
| Navigation | 96-world-unit debug grid and six labelled blocker polygons |
| Detail | Three non-authoritative route hints |
| Structures | Two headquarters, one shared Resource Point, two shared Production Outposts |
| Dynamic | Empty array |
| Foreground | Two explicit occluder polygons |

This geometry is Phase 2 presentation/navigation-foundation data, not balance or pathfinding approval. Tests must validate finite points, non-self-intersecting bounded polygons, exact counts and identifiers, complete route-segment clearance, spawn clearance, and each structure anchor's full radius against every blocker.

The accepted Phase 1A environment plate contains no baked entity, structure, owner flag, capture state, damage state, selection, target, effect, or interface. Using it as the initial ground source does not convert it into navigation truth or a final layered-map budget.

## Rendering contract

- One Canvas 2D surface per authored world layer keeps draw ownership inspectable; any additional DOM interface remains a separate non-authoritative overlay.
- Drawing order follows the six-layer order exactly. The dynamic surface remains empty in Phase 2.
- The ground image uses camera world-to-screen projection; detail, blockers, anchors, and foreground use the same camera transform.
- Navigation debug is off by default. When enabled it distinguishes blocked ground with pattern plus text, not color alone.
- Structure/objective anchor previews use shape or symbol plus label as well as restrained owner color.
- Canvas resolution follows the CSS play rectangle at a bounded device scale. Resize does not accumulate obsolete backing stores.
- Rendering never changes map data, camera rules, timing, or an authoritative outcome.

## Evidence matrix

The statuses below are intentionally conservative until the frozen source candidate is verified. Replace a pending cell only with the exact observed command, commit, viewport/device, and result in [`STATUS.md`](STATUS.md).

| Evidence category | Required evidence | Current state |
| --- | --- | --- |
| Source contract | Local resources resolve; semantic/CSP/script order and six data owners agree with this document | Passed by the frozen source tests and direct inspection on 2026-08-21 |
| Focused automation | `node --test tests/phase2-foundation.test.js` | 12/12 passed; combined Phase 1B/Phase 2 run passed 18/18 |
| Complete automation | `node tests/run.js` | 90/90 passed |
| Pages payload | `node .github/scripts/stage-pages.js _site` and exact allowlist inspection | 72 allowlisted files plus `.nojekyll` staged exactly |
| Diff hygiene | `git diff --check` and complete branch review | Passed; two independent final audits found no source or diff blocker |
| Desktop rendered review | Named CSS viewport, loaded ground, camera bounds/zoom, labels, no overflow, page-origin console result | Cloud Chrome at 1363×936 passed the retained menu, loaded ground, six 1363×936 canvases, Home, 1.00×→1.18× zoom, keyboard pan, debug, pause/resume, menu-focus recovery, and no-overflow/page-origin-console checks; exact browser version was not exposed |
| Tablet landscape review | Named CSS viewport, safe areas, controls, camera focus/bounds, rotate recovery | Pending |
| Phone landscape review | Named CSS viewport at or above 640×360, safe areas, touch composition, camera focus/bounds | Pending |
| Aspect/portrait review | 4:3, 21:9, outside-range letterboxing, minimum viewport, and portrait gate | Pending |
| Deployed review | Protected merge, Actions/Pages runs, live route/version/resources and primary journey | PR #16 squash-merged as `d17e8c9b4cc00a4beebf03aea443fd514197d608`; main audit `32526203611` and Pages `32526203607` passed; eleven sampled live files matched source byte for byte |
| Broad browsers | Approved current/previous desktop and mobile browser matrix | Pending |
| Physical devices | Named landscape phone and tablet sessions | Pending |
| Owner gate | Empty battlefield resembles the approved concept and camera interaction feels correct | Pending explicit Phase 2 approval |

Rendered desktop emulation is not a physical-device result. Passing automation does not prove camera feel. A deployment does not approve the phase. Unavailable evidence remains named rather than inferred.

## Owner gate and next boundary

Phase 2 closes only when the frozen candidate has the required source/automated/rendered evidence and the product owner explicitly confirms that the empty battlefield resembles the approved concept and camera interaction feels correct. Until then:

- Phase 2 remains active;
- the approved Phase 1B menu, visual/interaction target, and asset envelope stay locked;
- Engineering Standard v1.0 remains `adopting` while any applicable evidence is pending;
- no Phase 3 combat-entity, selection, pathfinding, or movement implementation begins;
- no tag or GitHub Release is created, and publication/merge state is reported only from observed GitHub evidence.
