# Production art contract

Status: **entity method approved by the product owner on 2026-08-20; corrected Aegis Titan and complete Phase 1A package approved on 2026-08-21; Phase 1A closed**.

This file is the canonical production-art contract for Aeon of Kingdoms. Read it before creating, editing, exporting, reviewing, loading, recoloring, or animating an entity, structure, terrain plate, foreground occluder, or effect. It is written for contributors and agents that have no conversation history. When another document or an older proof conflicts with this file, this file owns the production-art method; [`REDESIGN.md`](REDESIGN.md) still owns phase scope and approval gates, and [`ASSETS.md`](ASSETS.md) owns the asset inventory and provenance record.

## Approved visible direction

- Original cartoon-leaning, hand-painted 2D fantasy for a modern browser RTS, informed by the readability and cadence of late-1990s and early-2000s strategy games.
- A consistent three-quarter top-down battlefield view. The art remains 2D; no 3D model, height engine, or runtime skeletal deformation is implied.
- Strong silhouettes, oversized readable weapons and shields, restrained surface detail, and clear faction motifs that survive ordinary phone gameplay scale and crowded battles.
- The environment, structures, combat entities, player-color layers, damage layers, effects, selection/target feedback, and interface remain separate assets or runtime layers.
- High-detail concept paintings are mood references only. Technical navigation or animation diagrams are never presented as the visible game style.

## Entity terminology and source method

`Entity` is the authoritative code and documentation term. A mobile fighter is a combat entity; a headquarters, Resource Point, or Production Outpost is a structure entity. Do not reintroduce prototype `unit*` terminology into replacement code without a real external compatibility requirement.

Each combat entity uses coherent baked full-body raster frames. A visible frame contains one complete body with its equipment already attached. The browser does not assemble limbs, run a full-body bone rig, or deform anatomy. Independently generated or independently assembled body parts are rejected because they caused changing anatomy, detached equipment, incorrect pivots, and inconsistent animation.

## Facing and anchor contract

- Author one canonical **right-facing** sequence.
- Produce left-facing gameplay with an exact horizontal X mirror of the canonical frame. Do not generate or redraw a second left-facing sequence.
- Every state uses one shared transparent cell size and one shared ground/root anchor for that entity.
- World movement changes the entity's world coordinates. Animation frames never translate the entity across their cells.
- A frame may change pose, silhouette, and occupied bounds, but it must not change the character's apparent scale, identity, equipment hand, or ground convention.
- The current high-resolution proof uses a 384×384 master cell with root `(192, 354)`. This is a review/export profile, not a permanent runtime atlas size. Phase 1B must measure and approve the final runtime cell and atlas envelope without weakening the shared-anchor rule.

## Approved animation baseline

| State | Baseline | Loop | Binding visual rule |
| --- | ---: | --- | --- |
| Idle | 1 canonical frame | Held | A perfectly stable pose is preferable to fake breathing, redraw morphing, scale change, or sub-pixel drift. |
| Move | 4 authored gait frames at the reference cadence of 8 FPS | Yes | The idle and first movement frame are identical. Helmet, torso, belt, sword, shield, scale, player-color surfaces, and upper body remain pixel-identical across the four movement frames; only the lower-body gait changes. |
| Attack or cast | 6 authored full-body frames at the reference cadence of 12 FPS | No | Readable ready, wind-up, travel, contact, follow-through, and recovery; equipment stays attached and the contact frame is explicit metadata. |
| Defeat | 6 authored full-body frames at the reference cadence of 10 FPS | No | Readable loss of balance and collapse; hold the final state as required by presentation, while simulation determines defeat and cleanup. |

These are the approved opening-production defaults, not permission to pad every state to the same frame count. A signature action may request a measured exception during Phase 1B, but it must preserve the same identity, facing, anchor, recolor, and validation rules and receive explicit review.

The one-frame idle is intentional. A later animated idle is allowed only when it is authored from the same controlled master, keeps the root and equipment invariant, passes actual-scale playback review, and receives explicit owner approval. Do not synthesize an idle by cycling independently redrawn full-body images.

Simulation ticks—not animation frames—own movement distance, targeting, damage, production, capture, death, and cleanup. Animation metadata exposes contact or effect cues to presentation; it never becomes the authoritative clock.

## Player-color contract

Every player-controllable entity and every ownable structure ships with a separate, frame-aligned player-color mask. Never bake a single player's blue, violet, red, or other ownership color into the only source.

| Asset | Recolorable ownership surfaces | Fixed identity surfaces |
| --- | --- | --- |
| Combat entity | Cloth, tabard, shield field, banner, small crest/gem/energy accents | Body material, skin or bone, primary armor material, leather, weapon metal, silhouette-defining trim |
| Faction headquarters | Banners, crest field, restrained trim, ownership lights | Faction-specific architecture, masonry/metal/bone material, silhouette |
| Resource Point | Flag, ownership emblem, capture ring/marker, restrained light | Shared neutral platform and world model |
| Production Outpost | Flag/banner, ownership emblem, restrained trim and light | Shared neutral building form and primary materials |

Mask requirements:

- The mask has the same dimensions, frame order, facing, anchor, and transparent bounds as its base sprite or structure state.
- Mask alpha is always contained by the corresponding visible asset alpha unless the approved effect is intentionally additive and separately named.
- Recoloring preserves authored luminance and material shading rather than replacing the surface with a flat fill.
- Neutral ownable structures display neutral treatment before capture and player treatment only after authoritative ownership changes.
- Damage does not silently erase ownership. Surviving flags, marks, or lights continue to identify the owner until authoritative ownership or destruction state changes.

The game supports up to six players. Ownership may never rely on hue alone. Each player receives a stable combination of color plus a non-color cue such as emblem, flag mark, edge pattern, or directional fill. Selection, target, health, disabled, and capture states remain distinct from player color.

## Structure and damage contract

There are exactly three initial structure categories:

1. Faction-unique headquarters.
2. Shared capturable Resource Point.
3. Shared capturable Production Outpost.

Only headquarters change architectural form by faction. Capturing a shared structure changes its ownership layers, not its model category.

Structure health presentation uses one consistent form through bounded states:

- **Intact:** clean readable silhouette; no decorative damage fire.
- **Damaged:** darker/scorched material plus bounded fire, smoke, sparks, or debris effects.
- **Destroyed:** authored collapse/rubble state with its authoritative footprint and interaction state supplied by simulation.

Fire and smoke are separate bounded effects where practical. Health thresholds choose presentation states; animation never decides structure health or destruction.

## Battlefield separation

The battlefield master is environment-only. Do not bake combat entities, structures, ownership flags, capture rings, selection marks, target marks, health bars, interface, or effects into the terrain plate.

One map definition owns separate ground, non-blocking detail, navigation/blocker, anchor, dynamic-order, and foreground-occlusion layers. Visual mountain pixels never decide walkability. Tall terrain may use split back/foreground art or an explicit occlusion mask so entities can pass behind visible edges while remaining outside blocked ground.

## Required review and validation

An entity or structure is not accepted because a large static image looks attractive. Review the exact exported files and actual playback.

For every combat entity:

1. Inspect all canonical frames together at master size.
2. Play every state at the intended cadence at ordinary desktop and compact phone gameplay scale.
3. Verify no changing anatomy, extra/missing limb, hand swap, detached equipment, shield/sword size change, camera-angle change, scale pulse, horizontal/vertical cell drift, clipping, neighboring-cell leakage, or background contamination.
4. Verify idle and movement frame 1 are identical and the approved upper-body region is identical across all movement frames.
5. Verify left playback is the exact X mirror of right playback.
6. Verify the player-color mask matches every frame, remains inside visible alpha, and works with at least two strongly different colors before testing the six-player palette and non-color cues.
7. Verify reduced-motion presentation can hold a representative stable frame.
8. Record source/tool, transformations, dimensions, frame order, cadence, anchors, bytes, license/provenance decision, and owner review state in [`ASSETS.md`](ASSETS.md).

For every structure:

1. Review neutral and at least two owned colors without changing the model category.
2. Review intact, damaged, and destroyed states at gameplay scale.
3. Verify owner, structure category, selection, capture, health, and disabled states remain distinguishable without color alone.
4. Verify base, player mask, damage overlay/state, effects, shadow, footprint, and interaction anchors stay separately owned.

Automated image checks may prove dimensions, alpha containment, frame counts, hashes, mirror identity, and payload limits. They cannot prove animation quality, readability, game feel, or owner approval. Record those categories separately.

## Phase 1A approved package

The complete owner-approved direct-file package lives at `concepts/feasibility/phase1a/`. Its `README.md` is the human review order and its `manifest.json` is the machine-readable inventory. The optimized published Pages review at `concepts/feasibility/` stages the five approved compositions, six player-color proofs, 24 actual-scale state playbacks, environment plate, and damage proof. Raw atlases, masks, structure masters, and metadata remain repository-only authoring evidence. The review is script-free and does not introduce a second runtime or heavyweight approval application.

The six Phase 1A representatives are:

| Faction | Melee | Ranged | Signature |
| --- | --- | --- | --- |
| Astral Concord | Astral Guardian | Starbow | Aegis Titan |
| Gravebound Court | Gravebound Reaver | Hollow String | Ossuary Colossus |

Each package includes a canonical-right atlas, aligned player mask, metadata, one stable idle preview, four-frame movement playback, six-frame action playback, six-frame defeat playback, and a material-boundary color proof. The closing review also includes separate faction headquarters, neutral shared Resource Point and Production Outpost bases, aligned structure ownership masks, the accepted Production Outpost damage progression, a six-player color-plus-symbol proof, and desktop/phone compositions built from the environment, structures, entities, and ownership layers.

The integrated suite verifies all six atlases at pixel level: idle equals movement frame zero; the approved upper-body region is identical across movement frames; unused cells and cell edges remain transparent; masks stay inside visible alpha; state counts, cadence, facing, roots, and loop metadata match this contract; structure masks remain bounded; and the complete direct package remains below its 14 MiB review budget. Those checks do not visually approve the set.

The final Aegis Titan export replaces a rejected nearly front-facing gait and punch. In the approved package, crystal head, torso, hips, knees, feet, and attack travel all agree on canonical screen-right before exact mirroring. Its accepted defeat source and player-color boundary remain intact. `docs/PHASE1A_HANDOFF.md` owns the exact closure record and Phase 1B boundary.

## Review workflow and phase boundary

- Produce and approve one representative at a time before multiplying a flawed method across a roster.
- Provide direct raster, atlas, and animated-preview links for owner review. Do not create a heavyweight HTML preview unless explicitly requested.
- Do not merge, deploy, tag, or describe a review artifact as gameplay merely because its checks pass.
- The Astral Guardian established the approved entity method. The Phase 1A package applies that exact contract to the Gravebound Reaver, Starbow, Hollow String, Aegis Titan, and Ossuary Colossus.
- The owner directly approved the corrected Aegis movement/action and complete entity, player-color, structure, damage, and desktop/phone set on 2026-08-21. Phase 1A is closed; gameplay renderer work begins only at its later approved gate.
