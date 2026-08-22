# Aeon of Kingdoms redesign roadmap

Status: **approved baseline; Phase 0 through Phase 3 complete; Phase 4 structures, economy, production, and rally authorized next**.

This document is the active source of truth for replacing the rejected `v2026.8.15` prototype. It records the full sequence, acceptance gates, terminology, and future boundaries so work can proceed one verified phase at a time. [`PHASE3_ENTITY_MOVEMENT.md`](PHASE3_ENTITY_MOVEMENT.md) owns the exact closed Phase 3 contract and evidence record, with [`PHASE2_FOUNDATION.md`](PHASE2_FOUNDATION.md) retained as its approved landscape/camera input. Phase 4 is authorized as the next boundary but has no frozen contract or runtime implementation yet; roadmap authorization alone never turns future work into implemented behavior.

The prototype remains in Git history as evidence. Its menu, battlefield presentation, art, map vocabulary, portrait behavior, movement feel, combat interaction, AI behavior, and public product claims are not design precedents for the replacement.

## Approval record

The product owner approved Phase 0 and this roadmap baseline on 2026-08-15 and authorized the truth-and-cleanup implementation. This approval does not claim that the transition candidate is verified, deployed, tagged, or released, and it does not pre-approve Phase 1 visual choices or any gameplay phase.

On 2026-08-20, the product owner reviewed the eight published Phase 1 references. Their battlefield composition, faction contrast, combat language, and restrained interface were accepted as useful mood direction, but their literal realism and entity detail were rejected as the production target because they would not honestly prove small-screen readability, crowded-battle clarity, animation consistency, or a sustainable six-faction asset budget. The owner approved the production-feasibility brief below and authorized a replacement visual proof. This is not an art lock and does not authorize gameplay implementation.

Later on 2026-08-20, the owner accepted the environment-only battlefield direction, the three-structure taxonomy and damage language, and recolorable ownership surfaces. After rejecting mixed art styles, bone/limb rigs, misassembled anatomy, undersized equipment, independently redrawn motion, and drifting frame roots, the owner approved the narrower combat-entity production method recorded in [`PRODUCTION_ART.md`](PRODUCTION_ART.md). That approval locked the method—not every candidate file or the complete roster—and authorized applying it to the remaining opening representatives. On 2026-08-21 the complete Phase 1A candidate was assembled under that method. The owner judged the integrated set ready except for Aegis Titan's nearly front-facing gait and punch; the feature-branch package corrected both to canonical screen-right. After direct review, the owner approved the corrected Aegis Titan and complete integrated set on 2026-08-21, closing Phase 1A. The owner then authorized the standardization and closure change to merge and deploy; protected pull request `#10` squash-merged as `0d74dd9174f0db873c1c9ea8cfc824c1ea231660`. The owner subsequently authorized a bounded Pages review of the approved compositions and actual-scale playback, while raw masters remain repository-only.

The later script-free Phase 1B candidate assembled the menu/HUD, battlefield, complete opening identity language, landscape controls, viewport policy, and measured runtime-art decisions. After reviewing the integrated candidate, the owner explicitly approved complete Phase 1B on 2026-08-21 and authorized Phase 2 to begin. The owner then identified a small lower-body omission in three Astral Guardian movement cells in the derived browser samples; the approved authoring master remained intact, and the bounded samples were repaired from that master without changing the Phase 1B target. On 2026-08-22 the owner explicitly approved the complete Phase 2 landscape/camera candidate and authorized Phase 3. Later that day, after reviewing the repaired deployed entity/movement candidate, the owner explicitly approved Phase 3 and authorized Phase 4. This approval does not authorize combat, AI, networking, a tag, or a GitHub Release.

## Working rules

1. Complete one phase at a time.
2. Treat the owner-locked requirements below as fixed. Close the remaining phase-specific choices at each gate before implementing them.
3. Build the replacement on short-lived branches; do not use `main` as a visual experiment.
4. Do not merge a phase because tests pass. Source checks, rendered evidence, game feel, and owner approval are independent requirements.
5. Preserve rejected prototype evidence at commit `7f88655` in normal Git history. Its misleading public release and tag were retired on 2026-08-21 at the owner's direction; the commit remains reachable, and the retired label must never be recreated or reused. Never move another tag onto the commit or rewrite shared history.
6. Keep the implementation small and direct. Rebuilding from scratch does not justify a framework, generic engine, ECS library, asset pipeline, or networking abstraction without proven need.
7. Neon Voyage is evidence of the owner's preference for restraint and clarity only. Aeon of Kingdoms must not copy its layout, styling, structure, assets, or gameplay.
8. Keep this roadmap as a versioned approved baseline. Later decisions change it explicitly with rationale; “frozen” never means hiding unresolved choices.

## Owner-locked requirements

- Original 2D RTS identity created for this game.
- Landscape gameplay only on desktop, phone, and tablet.
- A battlefield larger than the viewport with deliberate pan and zoom.
- Illustrated terrain with mountains, cliffs, ruins, or other clearly impassable features.
- Two visually distinct opening factions, each with unique public entity names, silhouettes, weapons, effects, and animation.
- Slower armies that move in readable groups and maintain spacing.
- Explicit focus attacks plus autonomous nearby combat, attack-move, defend, stop, and rally behavior.
- Exactly three structure categories: faction headquarters, Resource Point, and Production Outpost.
- Tick-based production queues, visible progress, bounded queue capacity, cancellation rules, spawn validation, and rally points.
- Strategic AI that evaluates threats, strength, objectives, economy, attack timing, and defense instead of sending every entity to one target.
- One deterministic command language shared by human input, AI, replay, campaign scripting, host/client multiplayer, and a possible dedicated server.
- No multiplayer claim until real cross-network matches are observed.

## Terminology and world model

`Entity` is the authoritative code term for an identified world object. The replacement uses one entity identifier that remains stable for the lifetime of a match, replay, or restored snapshot, plus one bounded authoritative collection. It does not imply permanent identity between matches. This is a naming contract, not permission to introduce an ECS framework.

| Term | Meaning |
| --- | --- |
| Entity | Any authoritative identified world object that can be referenced by a command or rule |
| Combat entity | A selectable mobile fighter, support character, creature, machine, or future equivalent |
| Structure entity | A headquarters, Resource Point, or Production Outpost |
| Projectile entity | A bounded authoritative missile only when its travel affects rules |
| Visual effect | Non-authoritative presentation; not an entity unless gameplay can target or simulate it |
| Formation | Stable destinations and spacing for a commanded set of combat entities |
| Task force | An AI-owned strategic grouping; it uses normal entity commands and grants no special rules |

Public UI should prefer each faction's actual names rather than exposing generic engine categories. Existing `unit`, `units`, `unitId`, and `unitIds` contracts are removed during the entity-foundation phase; compatibility aliases are not retained unless a real external consumer exists.

## Structure and economy contract

| Structure | Ownership | Core function | Production |
| --- | --- | --- | --- |
| Faction headquarters | Begins owned | The only faction-unique structure form; faction anchor and elimination condition | Produces that faction's eligible combat entities through the shared queue rules |
| Resource Point | Begins neutral and is capturable | Shared world form with a flag or beacon; provides the single spendable resource while owned | None |
| Production Outpost | Begins neutral and is capturable | Shared world form with owner banners, lights, patterns, and player marks; provides forward reinforcement | Produces the current owner's eligible faction entities through the shared queue rules |

Only headquarters receive faction-specific structure art. Resource Points and Production Outposts reuse one neutral readable form per category and change explicit ownership treatment after capture. No checkpoint, recruitment building, Aether Well, Relay Forge, Aeon Core, Seal, or fourth disguised structure category survives by default. Any future structure type is a later product decision, not an implementation convenience.

### Production queue

- Selecting a producing structure opens one compact production bar anchored to the gameplay HUD.
- Every option shows the faction-specific entity, cost, population use, production time, availability, and shortcut where applicable.
- Accepted production spends resources under one documented refund rule and appends to a bounded queue.
- The active queue item advances in authoritative simulation ticks, never wall-clock or animation time.
- The UI shows active progress, remaining queue order, blocked state, and cancellation feedback.
- Completion validates ownership, population, and an unoccupied spawn position through a bounded ordered spawn-slot search. If every slot is blocked, the completed item remains at the queue head without duplication or further progress until space opens, the player cancels it, ownership changes, or the structure is destroyed.
- Phase 4 must approve one explicit deterministic refund table for ordinary cancellation, blocked-complete cancellation, ownership change, and structure destruction before implementation.
- Queue, cancellation, completion, refund, ownership-change, and destruction outcomes require deterministic tests.

### Rally point

- Selecting a producing structure and contextual-right-clicking valid terrain issues `SET_RALLY`.
- Touch uses the same contextual command through an explicit rally mode rather than a hidden gesture.
- The battlefield shows the selected structure's rally marker and path preview.
- A newly spawned combat entity receives an ordinary validated movement order toward the rally point.
- Invalid or unreachable rally placement is rejected without changing the current rally. A route that later becomes blocked follows the ordinary bounded repath/stop rule.
- Rally points never bypass obstacles, ownership, visibility rules, command bounds, or networking validation.

## Battlefield and camera contract

- Gameplay presentation is landscape-first across an approved aspect range, not a responsive portrait dashboard. Phase 1 concepts use 16:9 as the reference frame; wider or narrower landscape screens expand safe world view or use deliberate letterboxing without moving essential controls outside safe areas.
- The world extends beyond the current view. Camera bounds prevent exposing empty space.
- Wheel or pinch zooms around the pointer/finger focus; pan supports keyboard, edge or drag intent as approved during the interaction phase.
- On supported installed/fullscreen browsers, make a best-effort `screen.orientation.lock("landscape")` request after a player gesture.
- When a browser cannot lock orientation, portrait shows only a rotate-device gate, pauses authoritative play, clears transient input, and resumes safely after returning to landscape; it does not run or rearrange gameplay.
- Mountains, cliffs, walls, deep water, ruins, and structures may create hard navigation blockers. Decorative terrain never silently blocks movement.
- Walkability, blocker clearance, spawn clearance, capture bounds, formation width, and camera bounds share one authored map definition.
- The opening map must support fair tested layouts incrementally: approve 2-player play first, then validate 4-player and 6-player layouts rather than assuming that rotational symmetry proves balance.

The first map is data-driven rather than one inseparable painting. Its authored definition owns these layers without introducing a height engine or 3D physics:

1. Ground color and broad terrain.
2. Roads, decals, territory hints, and other non-blocking detail.
3. An invisible authoritative navigation grid or mask plus footprint clearance.
4. Spawn, structure, objective, camera, and blocker anchors.
5. Dynamic structure and combat entities ordered by their ground contact point.
6. Foreground and occlusion pieces for ridges, cliffs, ruins, or vegetation.
7. Non-authoritative selection, command, combat-effect, and interface presentation.

Mountain and ridge footprints block the navigation layer even when their artwork extends beyond it. Tall art is split into back and foreground pieces, or uses an explicit occlusion mask, so an entity can appear behind an edge without entering blocked ground. A selected or targeted entity hidden by foreground art receives a restrained outline or local fade. Maps remain replaceable through local data and local assets; visual pixels never decide walkability.

## Movement, formations, and animation

- Combat entities move at deliberately readable speeds calibrated through rendered play, not only numeric tests.
- A group order produces distributed formation destinations and preserves stable entity ordering.
- Strategic routing avoids hard blockers; local avoidance and separation resolve congestion without a full physics engine.
- Large entities receive larger footprints and may require wider routes.
- Melee attackers reserve reachable contact positions; ranged attackers retain appropriate distance; overflow waits or selects another valid ring.
- No group order, focused attack, rally completion, or spawn may intentionally send every entity to the same coordinate.
- Authored combat-entity art follows [`PRODUCTION_ART.md`](PRODUCTION_ART.md): one stable idle frame; four right-facing movement frames whose upper body, equipment, scale, and root remain invariant; six full-body attack/cast frames; and six full-body defeat frames. Left-facing playback is the exact horizontal X mirror of the canonical right-facing frames.
- Every player-controlled entity and ownable structure has a separate player-color mask. Independently assembled limbs, runtime anatomy deformation, independently redrawn idle frames, and unrelated generated motion frames are not an acceptable production pipeline.
- Simulation ticks own hit timing. Animation communicates the result without becoming authority.

## Player command contract

| Player intent | Authoritative command |
| --- | --- |
| Move selected combat entities to terrain | `MOVE` |
| Focus a specific hostile entity | `ATTACK_ENTITY` |
| Move while engaging encountered hostiles | `ATTACK_MOVE` |
| Stop current orders | `STOP` |
| Guard an area or friendly entity | `DEFEND` |
| Queue faction-specific production | `QUEUE_PRODUCTION` |
| Cancel a queued production item | `CANCEL_PRODUCTION` |
| Set or clear a producing structure's destination | `SET_RALLY` / `CLEAR_RALLY` |

Desktop requires left-click selection, drag selection, additive selection, enemy hover highlighting, contextual right-click move or focused attack, and camera zoom/pan. Mobile requires readable tap selection, contextual enemy attack, explicit rally placement, two-finger camera movement, pinch zoom, and feedback before a destructive or ambiguous action.

Combat entities automatically acquire valid hostiles inside a configured awareness range, evaluate attack range separately, chase within a bounded leash, retarget deterministically, and resume or finish their current command according to explicit rules. A focus attack has priority until invalid, cancelled, or constrained by the leash/order contract.

### Order priority and interruption

| Current order | Nearby hostile | Directly attacked | Target invalid or unreachable | Completion |
| --- | --- | --- | --- | --- |
| `MOVE` | Does not initiate or detour | May return fire only under the approved stance, then resumes | Repath within bounds or stop with feedback | Idle at destination |
| `ATTACK_ENTITY` | Keeps explicit target | Keeps explicit target unless unable to respond | Bounded repath, then stop or resume the queued prior order according to the approved queue rule | Idle or resume queued order |
| `ATTACK_MOVE` | Acquires by stable threat/priority rules | May reprioritize the immediate attacker deterministically | Return to route after bounded engagement; stop with feedback if destination is unreachable | Idle at destination |
| `DEFEND` | Engages only inside the defended area's/entity's leash | Responds within the same leash | Returns to the defend anchor when pursuit ends | Persists until replaced or stopped |
| `STOP` / idle | May acquire only under the approved idle stance | May defend itself without starting an unlimited pursuit | Remains stopped | Persists until replaced |

Phase 5 must close stance, leash, prior-order queue, and target-priority values before implementation. Tests cover every row rather than relying on informal “nearby combat” behavior.

## Strategic AI contract

AI is a deterministic command producer with no privileged mutation path and no hidden resource advantage unless an explicitly named difficulty allows it.

The AI decision stack is intentionally small:

1. Observe owned structures, visible hostile entities, recent threats, resources, population, production, travel cost, and objective state.
2. Maintain bounded strategic needs: recover, defend, reinforce, capture, raid, pressure, or assault.
3. Estimate local friendly and hostile strength with faction-aware composition weights.
4. Form several bounded task forces when the map and population justify it; retain a defensive reserve instead of collapsing the entire army onto one destination.
5. Choose reachable targets using value, threat, distance, current commitments, and expected strength rather than identifier order alone.
6. Issue only the same move, attack, defend, production, and rally commands available to a human.
7. Re-evaluate on a configured strategic cadence and on bounded urgent events, not every render frame.

Required AI scenarios include defending a threatened headquarters, reinforcing a contested Production Outpost, cancelling a losing assault, exploiting an undefended Resource Point, producing a missing counter-role, splitting pressure between fronts, regrouping after losses, and completing a match without deterministic stalemate.

## Networking compatibility

Networking is a later transport over the already-approved simulation, never a separate rules implementation.

- Commands carry stable entity identifiers, issuing player, sequence, target tick, kind, and bounded payload.
- Authoritative checksum/snapshot state includes protocol and configuration version, tick, seed and RNG/event state, entity identifiers/kinds/positions/health/ownership/orders/paths/cooldowns/targets, resources, population, production queues/progress, rally points, capture progress, objective state, AI strategy state, and every other value that can change a future result.
- A host validates entity ownership, target legality, command rate, queue capacity, resources, population, and encoded size before ordering commands.
- Local AI and remote humans remain indistinguishable at the simulation boundary.
- The networking phase begins with a transport/topology spike. Private host-authoritative WebRTC is the leading candidate for casual rooms, while a dedicated WebSocket authority remains a later candidate; neither is approved merely by this roadmap.
- If WebRTC is chosen, signaling and TURN are external infrastructure and GitHub Pages remains only the static client host. Ranked or trusted competition is not promised by a player-hosted room.

## Performance and accessibility gates

- Fixed-step authoritative simulation with render interpolation and bounded catch-up.
- Configured caps for combat entities, structures, projectiles, effects, queues, commands, path searches, AI candidates, snapshots, and remote payloads.
- Spatial queries and route reuse are measured before optimization; no unbounded whole-world work in hot loops.
- Landscape phone, landscape tablet, and desktop browser budgets are measured independently.
- Ownership, selection, target, queue state, damage, disabled state, and objectives never rely on color or animation alone.
- Reduced motion changes presentation only. Keyboard focus, pause, lifecycle cleanup, readable status, and touch target size remain release requirements.

## Repeatable evidence matrix

Every gate records the exact commit, configuration, seed, viewport/device, commands, result, and evidence category. Values such as speed, leash, spacing, timing, and caps live in the approved configuration; the scenarios below test behavior against those values.

| Area | Repeatable acceptance scenario |
| --- | --- |
| Landscape shell | Reference desktop, phone-landscape, and tablet-landscape viewports keep map and essential controls inside safe areas; portrait pauses and shows only the rotate gate; returning to landscape clears stale input and resumes safely |
| Blocker routing | The same selected formation crosses an open field, routes around an authored mountain, traverses a minimum-width choke, and reports an unreachable destination without entering blocked cells |
| Formation and congestion | A capped group moves, turns, passes a choke, exits, and surrounds a structure with unique destinations, bounded overlap, stable ordering, and no permanent jam |
| Focus and autonomous combat | Seeded fixtures separately prove move, explicit attack, attack-move, defend, stop/idle, leash, target death, unreachable target, and resume behavior from the order table |
| Production and rally | Queue, progress, cancel/refund, population failure, ownership change, destruction, blocked spawn, rally set/reject/clear, and spawned-entity movement replay identically |
| AI strategy | Seeded scenarios prove headquarters defense, reserve retention, multi-front task forces, composition response, retreat/regroup, objective pressure, and bounded match progress without privileged mutation |
| Determinism | Identical map/config/seed/command logs produce matching periodic checksums and final snapshots in the supported browser matrix; any mismatch blocks the phase |
| Performance | The approved population/structure/projectile caps sustain measured simulation and render budgets on the reference desktop, phone, and tablet without unbounded queue, path, AI, or effect growth |
| Visual approval | Captures and short recordings match the approved menu, map, factions, structures, animation states, selection, target, production, and rally references; owner approval is recorded separately from automated checks |

## Phase roadmap

### Phase 0 — Truth and cleanup

- [x] Mark `v2026.8.15` as a rejected historical prototype in current documentation.
- [x] Stop presenting the prototype as the current approved game in the current source.
- [x] Integrate a restrained redesign/status-page source candidate after owner approval.
- [x] Replace the live Pages prototype with that status page through the protected publication path and verify the deployed commit and exact public content.
- [x] Version the interim page as the `v2026.8.15a` source candidate and record its player-visible intent in the changelog.
- [x] Record the owner's review of the transition and authorization to proceed into the Phase 1A proof.
- [ ] Complete the remaining landscape, responsive/keyboard, link-navigation, pre-existing-cache, physical-device gallery, and rollback observations as operational evidence; source, staged delivery, deployment, the current live boundary and image-resource load, page-origin console, and one owner-supplied portrait mobile render are complete. These observations do not reopen the completed product-truth gate or authorize gameplay.
- [x] Retire the misleading `v2026.8.15` public tag and GitHub Release at the owner's direction while preserving commit `7f88655` and normal Git history; never recreate or reuse the label.
- [x] Approve and version this roadmap baseline and contributor rules before redesigned gameplay work begins.

Gate: **complete**. The repository and live site tell the same non-gameplay truth, the transition evidence and remaining limitations are recorded, and the owner-approved roadmap is the active contract.

### Phase 1 — Visual and interaction lock

The eight published frames remain in the [reviewed mood-reference gallery](../concepts/). They are not production approval candidates and cannot close the gate by themselves. Phase 1 now has two ordered checkpoints.

#### Phase 1A — Production-feasibility proof

- [x] Owner approved the simplified production-feasibility brief on 2026-08-20; this authorizes reference creation only.
- [x] The first deployed proof at `v2026.8.20a` established practical scale and technical contracts but was superseded as an approval surface after the owner found its mixture of painted and geometric styles ambiguous.
- [x] Merged `v2026.8.21` source replaces it with one cartoon-leaning painted 2D direction while keeping the environment plate, representative entities, player-color masks, and exactly two faction-unique headquarters plus one shared Resource Point and one shared Production Outpost as separate assets. Its rejected v5 entity motion remains evidence, not the approved animation specification.
- [x] Desktop and compact phone-landscape frames show the same ordinary battlefield target without claiming that a rendered game or physical-device session exists.
- [x] The Astral Guardian establishes the approved method: coherent baked full-body frames with oversized attached equipment, one stable idle frame, four lower-body-only movement frames, six action frames, six defeat frames, one canonical right facing, and an exact X-mirrored left facing.
- [x] Apply that exact method to the Gravebound Reaver, Starbow, Hollow String, Aegis Titan, and Ossuary Colossus so both opening factions prove melee, ranged, and signature behavior.
- [x] Player color is a separate mask on every player-controlled entity and ownable structure; cloth, shield fields, flags, crests, restrained trim, and ownership lights may recolor while faction body, armor, bone, weapon, and architectural identity stay fixed.
- [x] Prove the six-player color-plus-symbol system across the completed opening entity and structure set; hue alone is never sufficient.
- [x] The battlefield proof is an environment-only plate. Entities, headquarters, Resource Points, Production Outposts, flags, capture state, damage, selection, and interface remain separate runtime layers.
- [x] The neutral shared Production Outpost shows one fixed structure at intact, scorched-and-burning, and collapsed health states; fire is reserved for damage rather than decoration on the healthy state.
- [x] Map navigation, blocker, anchor, dynamic-order, and foreground-occlusion layers remain binding technical data contracts but are no longer presented as the visible art style.
- [x] `docs/ASSETS.md` records exact candidate dimensions, bytes, provenance, transformations, scope, and provisional runtime envelopes.
- [x] The merged candidate passed the integrated repository suite and exact Pages allowlist without adding gameplay, runtime dependencies, tracking, or external requests; the owner later authorized the optimized approved review subset for Pages while raw masters remain repository-only.
- [x] Inspect the direct master atlases, masks, animation rows, six-player ownership sheet, and separate desktop/phone compositions without creating another heavyweight HTML review surface.
- [x] Replace Aegis Titan's rejected nearly front-facing gait and punch with one coherent canonical-right movement/action source while preserving its root, mask, identity, and accepted defeat behavior.
- [x] Complete direct product-owner review of the corrected Aegis Titan and integrated files; automation and workspace inspection did not substitute for this approval.
- [x] Record explicit owner approval of the baked directional-sprite and player-color method in [`PRODUCTION_ART.md`](PRODUCTION_ART.md).
- [x] Record explicit owner approval of the complete opening Phase 1A visual set now that all six required representatives use that method.
- [x] Record actual-scale playback on a named physical device as unobserved and separate evidence debt; Phase 1A closure does not fabricate this evidence category.
- [x] Merge the approved package and Engineering Standard v1.0 adoption record through protected pull request `#10`.
- [x] Publish the bounded approved review through protected pull requests `#11` and `#12` without staging raw authoring masters.

These checks establish the approved production method, the owner-approved corrected Phase 1A package, and its bounded Pages review. They do not establish a final runtime atlas, the later full six-role-per-faction roster, gameplay renderer, physical-device quality, tag, or release.

Checkpoint: **complete on 2026-08-21**. Direct owner approval of the corrected Aegis Titan and integrated set closed Phase 1A, and pull request `#10` merged the closure record. The later Phase 1B approval does not reopen this checkpoint.

#### Phase 1B — Complete visual and interaction lock

The complete script-free visual target is defined in [`PHASE1B_VISUAL_LOCK.md`](PHASE1B_VISUAL_LOCK.md) and presented at [`concepts/phase1b/`](../concepts/phase1b/). The product owner explicitly approved the combined target on 2026-08-21. That approval locks these decisions and authorizes Phase 2; it does not turn the four browser samples into a shipping runtime atlas or approve implementation, balance, a tag, or a release.

- [x] Original minimal menu and map-dominant gameplay HUD.
- [x] Full opening battlefield target with routes, blockers, the three structure categories, production/rally feedback, and combat readability.
- [x] Complete identity language for the two opening factions and all six permanent role contracts, using faction-specific public names.
- [x] Landscape phone/tablet control mockups with safe areas, contextual attack, camera movement, zoom, production, and rally interaction.
- [x] Final local asset, sprite/atlas, animation, loading-fallback, and size-budget decision.
- [x] Explicitly confirm that no rejected prototype or Neon Voyage visual asset, layout, or style was reused.
- [x] Approve supported landscape aspect range, minimum viewport, safe areas or letterboxing, and the desktop/phone/tablet browser-device matrix.

Gate: **complete on 2026-08-21** through explicit owner approval of the combined visual and interaction target. The corrected derived Astral browser samples preserve the approved master and do not reopen the gate.

### Phase 2 — Landscape battlefield foundation

The exact closed contract and evidence matrix live in [`PHASE2_FOUNDATION.md`](PHASE2_FOUNDATION.md). The owner approved the integrated candidate on 2026-08-22; unobserved compact/aspect/physical-device evidence remains recorded rather than fabricated.

- [x] New semantic shell and original menu from scratch.
- [x] Landscape orientation gate and supported-browser lock request.
- [x] Camera pan, focus-centred zoom, bounds, resize, pause, and lifecycle behavior.
- [x] New map schema, terrain renderer, blockers, navigation debug view, and two-player layout.
- [x] Rendered cloud-desktop evidence; compact/aspect/portrait, broad-browser, and physical-device observations remain separately recorded evidence debt.

Gate: **complete on 2026-08-22** through explicit owner approval that the integrated Phase 2 candidate looks and feels correct.

### Phase 3 — Entity and movement foundation

The exact closed scope, values, exclusions, and evidence record live in [`PHASE3_ENTITY_MOVEMENT.md`](PHASE3_ENTITY_MOVEMENT.md). The approved foundation implements selection and movement only through a fixed 20 Hz integer simulation and canonical replay/snapshot/checksum path; no combat, structure/economy, AI, or networking code is included.

- [x] Replace prototype unit terminology and state with the approved entity contract.
- [x] Audit authoritative state, commands, tests, selectors, and current UI so no live `unit*` compatibility contract remains; historical prototype documents may retain the old word.
- [x] Add click/tap/box/additive selection, contextual terrain movement, formation destinations, hard blocker routing, local separation, large footprints, and bounded congestion recovery.
- [x] Add the six approved representative atlases, aligned ownership masks, preload validation, exact mirroring, and idle/move state animation at explicit Standard and Compact tiers.
- [x] Add deterministic source scenarios for slow group movement through open terrain, blockers, and chokepoints; the 1363×936 desktop movement journey passed, while an explicit rendered blocker-route/choke-exit journey and named viewport/browser/device rows remain pending evidence.
- [x] Establish replay, canonical snapshot, restore-and-continue, and periodic checksum tests now; maintain them through every later phase and supported browser.

Gate: **complete on 2026-08-22** through explicit owner approval that selected armies move naturally without stacking, visual drift, or placeholder ships. Pending viewport/browser/device rows remain named evidence debt rather than fabricated results.

### Phase 4 — Structures, economy, production, and rally

- [ ] Implement only headquarters, Resource Point, and Production Outpost structure entities.
- [ ] Implement capture, ownership treatment, economy/population effects, queue rules, progress UI, spawn validation, and rally commands.
- [ ] Close and test the refund, blocked-complete, ownership-change, destruction, and invalid/unreachable rally outcomes.
- [ ] Make production and rally deterministic, replayable, AI-usable, and network-ready.

Gate: a player can expand, produce, redirect reinforcements, lose structures, and recover through clear readable interactions.

### Phase 5 — Combat and tactical commands

- [ ] Focus attack with desktop enemy hover/right-click and mobile contextual attack.
- [ ] Autonomous acquire, attack range, chase/leash, retarget, defend, stop, and attack-move.
- [ ] Melee contact positions, ranged spacing, projectiles where required, simultaneous damage, support behavior, defeat, and structure assault.
- [ ] Complete combat animation and feedback states.

Gate: short battles are tactically understandable, visually faithful, deterministic, and satisfying on desktop and touch.

### Phase 6 — Strategic AI and local skirmish

- [ ] Threat assessment, production planning, defensive reserve, task forces, objective value, retreat/regroup, and timed assaults.
- [ ] Scenario tests for defense, multi-front behavior, composition, recovery, and match completion.
- [ ] Finish and tune the first two-player Conquest skirmish.

Gate: AI presents varied credible pressure without cheating or issuing every entity the same destination.

### Phase 7 — Product hardening

- [ ] Physical desktop, phone, and tablet input testing.
- [ ] Landscape rotation/fullscreen/background recovery.
- [ ] Accessibility, reduced motion, color-independent state, audio, options, and onboarding.
- [ ] Long-match performance, thermal, memory, congestion, queue, and population-cap tests.
- [ ] Replace the interim redesign/status page only after owner approval of the complete local slice.

Gate: one polished map, two factions, and local skirmish meet the release evidence matrix.

### Phase 8 — Modes and campaign

- [ ] Add only approved objective modes around the same combat/economy core.
- [ ] Build a real first campaign mission with authored pacing, objectives, and completion state.
- [ ] Keep elimination, production, AI, and commands shared rather than forking scenario rules.

Gate: additional content expands the approved game without weakening the core slice.

### Phase 9 — Networked multiplayer

- [ ] Preserve the owner-selected private two-player host/client topology and compare only viable transport, signaling, and relay candidates against the approved simulation, browser constraints, infrastructure, privacy, failure, and cost requirements.
- [ ] Extend the already-running replay, snapshot, and checksum harness with protocol and hostile-input tests offline.
- [ ] Exercise two local clients through simulated delay, jitter, duplication, reordering, loss, disconnect, and resync.
- [ ] Implement one host and one client behind the deterministic command boundary, joined by a short private room code, with a compatibility handshake, honest connectivity UI, and an explicit match-ending host-loss outcome.
- [ ] If the approved transport is WebRTC, add separately reviewed signaling and TURN boundaries before claiming general connectivity.
- [ ] Verify real matches across different networks and physical devices.

Gate: multiplayer is advertised only after complete real cross-network matches.

### Phase 10 — Future enhancements

Candidates, not commitments: validated 4- and 6-player layouts, additional factions and maps, further campaign missions, team modes, alliances, replay, reconnect, join-in-progress, spectators, host migration, fog of war, richer abilities, optional dedicated authority, and public matchmaking. Each requires a separate scope, threat model, performance budget, and acceptance gate.

## First replacement release definition

The first correct replacement release contains one approved map, two approved factions, a minimal original menu, landscape-only play, camera pan/zoom, faction-unique headquarters, shared Resource Points and Production Outposts, deterministic production/rally, readable formations, complete focused/automatic combat, strategic two-player AI, and verified desktop/physical-touch evidence. Multiplayer, a campaign sequence, public matchmaking, and additional factions are not prerequisites for that release.
