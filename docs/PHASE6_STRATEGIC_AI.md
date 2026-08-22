# Phase 6 strategic AI and local-skirmish contract

Status: **closed on 2026-08-22 after the frozen implementation, protected publication, exact live-byte verification, and available rendered evidence passed; unavailable physical-device and broad-browser observations remain Phase 7 debt**.

This document owns the exact Phase 6 boundary. It extends the closed Phase 5 combat simulation with one deterministic computer command producer and one local human-versus-computer skirmish route. It does not change the approved battle rules, add a mode score, start product hardening, or start networking. When this contract conflicts with prototype AI, prototype tests, informal RTS convention, or a visual mockup, this contract wins.

The owner's standing goal-mode authorization permits implementation, technical and visual audit, protected publication, evidence-backed closure, and immediate progression to Phase 7 when this exact gate passes. Automation never substitutes for an observation that the available environment cannot make.

## Exact playable slice

- Map: the approved `Moonfall Crossing` two-player map.
- Human: seat 1, Astral Concord, `◇ Azure`.
- Computer: seat 2, Gravebound Court, `✕ Violet`.
- Profile: one `Standard` deterministic AI with no resource, population, health, damage, speed, vision, command, routing, timing, or information bonus.
- Victory: the unchanged Phase 5 headquarters-elimination rule, including simultaneous-headquarters draw. “Conquest skirmish” means the existing capture, Resource, production, rally, combat, and headquarters-assault loop; it does **not** add scoring or a new objective mode.
- Content: the existing six approved representatives, five structure instances, three structure categories, nine commands, damage art, map, menu, HUD, and Standard/Compact art tiers only.
- Delivery: one new local `phase6/` route. The approved Phase 5 route remains immutable closure evidence.

No difficulty selector, cheat profile, fog of war, new map, new identity, ability, combat modifier, structure, score, campaign script, account, room, signaling, transport, external request, runtime package, tag, or GitHub Release belongs to Phase 6.

## Identity and enforced bounds

Phase 6 commands retain Phase 5 protocol `3` and battle configuration `phase5-combat-tactics-v1`; every human and computer request passes through the unchanged Phase 5 validator and receives the same global authoritative sequence. The wrapper has its own identity only for AI state and checkpoints.

| Rule | Frozen value |
| --- | ---: |
| AI schema | `1` |
| AI configuration | `phase6-strategic-ai-v1` |
| Strategic cadence | 40 ticks / 2 seconds |
| Urgent-response minimum interval | 10 ticks / 0.5 seconds |
| Minimum force commitment | 80 ticks / 4 seconds |
| Recent-threat lifetime | 120 ticks / 6 seconds |
| Earliest headquarters assault | tick 800 / 40 seconds |
| Headquarters-assault cooldown | 400 ticks / 20 seconds |
| Task-force slots | exactly 3: `reserve`, `front-a`, `front-b` |
| Tactical requests per decision | 2 |
| Production requests per decision | 1 |
| Rally requests per decision | 1 |
| Total requests per decision | 4 |
| Entities in one tactical request | inherited cap of 12 |
| Capture detachment | 6 entities |
| Objective candidates | 24 |
| Route probes per decision | 16 |
| Remembered threats | 8 |
| Accepted observed events per tick | 64 |
| AI-state encoded size | 32 KiB |
| Composite checkpoint encoded size | 1,310,720 bytes |
| Evidence match ceiling | 12,000 ticks / 10 minutes |

All counts are hard caps, not expected averages. Candidate construction, observation, planning, route checks, task-force assignment, request generation, event memory, snapshot validation, and replay append fail closed before exceeding them. AI decisions contain no unbounded retry, search, recursion, collection growth, or render-frame work.

The AI uses no random source in Phase 6. Variety comes from the changing public battlefield, production, threats, commitments, and three disjoint task forces. Stable raw-ASCII identifiers are the final tie-breaker everywhere; object insertion order and render order never affect a plan.

## Information and mutation boundary

`phase6/ai.js` is a pure command planner. It receives a detached, strictly validated observation plus detached AI state and returns detached intents plus the next AI state. It never receives the simulation object, a submitter, DOM state, canvas state, wall-clock time, animation state, or a private reducer.

Because Phase 6 has no fog-of-war system, these public facts are visible to the planner:

- current authoritative tick and public map geometry;
- the computer's Resource, population, owned structures, queues, rally points, living entities, public health, public positions, footprints, kinds, roles, and orders;
- every living hostile combat entity's public identity, owner, position, footprint, kind, role, and health;
- every structure's public category, owner, position, footprint, capture progress, health, damage state, and destruction state;
- filtered recent damage, defeat, capture, production, structure-destruction, and match-result events.

The planner must not receive or infer:

- the human player's Resource, reserved population, production queues, rally points, or selection;
- pending commands, next sequence, future replay entries, or command rejection internals;
- an opponent's routes, formation destinations, reservations, attack cooldowns, pending contact/launch, projectile launch internals, congestion counters, saved orders, or idle/engagement roots;
- private mutation functions, non-public simulation collections, future state, browser timing, renderer data, or network state.

Changing only hidden human economy, queue, pending-command, path, reservation, or cooldown state must not change an AI observation, plan, or checksum. Planning must leave every input byte-identical. Only `phase6/skirmish.js` may retain the simulation reference, submit requests, append accepted receipts, advance the battle, and build a composite checkpoint.

## Strength and threat model

For one living combat entity, current strength is:

`health + floor(damage × 100 / attackCycleTicks) + attackRangeWorld`

At full health this is exactly 392 for melee, 471 for ranged, and 736 for signature representatives. A group is the safe-integer sum of its living members. No faction, ownership color, animation, damage type, armor, counter multiplier, or prototype value changes the score.

Local opposition uses living hostile roots within 320 world units of the objective root. A headquarters emergency exists when a hostile root is within that radius of the computer headquarters or a remembered damage event names that headquarters. An owned Production Outpost is threatened when a hostile root is within 288 world units or its capture state is contested. Threat memories expire exactly 120 ticks after their event tick; when more than eight qualify, keep the newest tick first, then event kind, then source identifier, then target identifier, all with raw-ASCII ties. A Phase 5 aggregate event that exposes no source is recorded with `sourceId: null`; for ordering only, that value compares as the empty ASCII string and is never inferred from private combat state.

## Strategic needs and objective order

Every decision builds no more than 24 candidates, removes invalid/destroyed entries, and sorts lexicographically by:

1. urgent before non-urgent;
2. need rank in this exact order: `defend`, `recover`, `reinforce`, `capture`, `raid`, `pressure`, `assault`;
3. larger objective value;
4. larger projected friendly-minus-hostile strength;
5. an already-valid commitment before a new commitment;
6. smaller reachable route cost;
7. raw-ASCII objective identifier.

Every call to the inherited navigator's `findRoute` counts as one route probe, including per-entity capture-formation validation and producer-to-objective comparison. At most 16 calls may occur in one decision. A candidate that cannot complete all required checks inside the remaining allowance is removed without another search that tick. Route cost is the safe-integer sum of `floor(sqrt(dx² + dy²))` from the start through each returned fixed-point waypoint; an empty successful route costs zero. That derived cost is used only for deterministic ordering and never changes authoritative movement.

| Need | Exact trigger | Objective value | Legal tactical result |
| --- | --- | ---: | --- |
| `defend` | headquarters emergency | 1,000 | reserve uses entity-anchored `DEFEND` on its headquarters; one field force may reinforce |
| `recover` | a committed field force is below 80% of local opposition or has lost at least 40% of its committed strength | 650 | replace its assault/pressure with `DEFEND` at the nearest reachable owned producing structure |
| `reinforce` | owned Production Outpost is threatened or contested | 700 | one field force uses entity-anchored `DEFEND` on that outpost |
| `capture` | a reachable neutral Resource Point or Production Outpost exists | Resource Point 500; Production Outpost 550 | up to six entities use `MOVE` to one validated capture formation |
| `raid` | a reachable hostile-owned shared structure is not covered by stronger local opposition | Resource Point 575; Production Outpost 625 | one field force uses `ATTACK_MOVE` to the approach, then `MOVE` into capture range; it does not focus-fire the shared structure |
| `pressure` | a reachable hostile field concentration or exposed shared-site approach exists | 400 | one field force uses `ATTACK_MOVE` |
| `assault` | the readiness rules below all pass | headquarters 800 | one committed field force uses `ATTACK_ENTITY` on the hostile headquarters |

Capture formations test two rings in this exact order, `captureRadiusWorld - 28` and `captureRadiusWorld - 52`, across east, southeast, south, southwest, west, northwest, north, and northeast. Diagonal rounding uses the Phase 5 fixed-point `floor(R × 7071 / 10000)` convention. Each candidate is passed to the existing formation and navigation validators; no visual pixel chooses a destination. If no complete formation for the selected detachment is valid, the planner emits no capture request and records one bounded result.

A headquarters assault may begin only at or after tick 800, when living computer population is at least 12, the assigned field strength is at least 125% of local opposition, the reserve remains assigned, and the assault cooldown has elapsed. A losing assault retreats when its surviving strength falls below 80% of local opposition or 40% of committed strength has been lost. Any completed, cancelled, or retreated assault sets the next assault eligibility to the current decision tick plus 400.

## Task forces and commitment

The three force slots are always present in AI state, even when empty. Membership identifiers are unique, living, computer-owned, raw-ASCII sorted, and appear in at most one force.

1. Fill `reserve` first with entities nearest the computer headquarters until their living population reaches `max(3, ceil(total living computer population / 4))`, capped by available living population. Distance then raw-ASCII identifier breaks ties.
2. Assign remaining entities one at a time, strongest first and then identifier, to the lower-strength of `front-a` and `front-b`; the force name breaks equal totals.
3. At living population 10 or higher with two reachable non-headquarters fronts, both field forces must remain non-empty and receive distinct objectives when two valid objectives exist.
4. Preserve membership and objective until the 80-tick commitment ends unless an entity is defeated, a spawn changes the roster, the objective becomes invalid, a headquarters emergency begins, or the retreat rule fires.
5. Roster repair removes invalid members once, assigns newly spawned members through the same rules once, and never issues the entire army one destination merely because a plan was recomputed.

The reserve may defend the headquarters or reinforce one threatened owned outpost. It never joins a routine capture, raid, pressure, or headquarters assault. A field force with more than the inherited 12-entity selection cap is deterministically split at the cap; excess members retain their previous legal order until a later bounded decision.

## Production and rally planning

Role targets count living plus queued population and always total the population cap of 18.

| Situation | Melee | Ranged | Signature |
| --- | ---: | ---: | ---: |
| Balanced | 6 | 6 | 6 |
| Hostile melee-heavy | 4 | 8 | 6 |
| Hostile ranged-heavy | 8 | 4 | 6 |
| Headquarters assault | 5 | 4 | 9 |

Ignore signature population when classifying the visible hostile roster. It is melee-heavy only when visible living melee population is at least visible ranged population plus 2; ranged-heavy is the exact inverse; otherwise it is balanced. The assault row applies only while `assault` is the current need.

At most one `QUEUE_PRODUCTION` request is produced per decision. Calculate each role deficit as target population minus computer living-and-queued population. Choose the largest positive deficit, then lower eligible representative cost, then the computer production-roster order. Choose an eligible producing structure by shorter queue, then smaller route cost from spawn anchor to the active objective, then identifier. The unchanged Phase 5 simulation decides ownership, Resource, population, queue, and spawn legality.

At most one rally request is produced per decision, and only when a producing structure's current rally is absent or materially differs from the assigned active objective. `SET_RALLY` uses a validated reachable destination; obsolete rally may use `CLEAR_RALLY`. `CANCEL_PRODUCTION` is legal only for a blocked-complete or now-invalid queue item and retains the unchanged 100% authoritative refund. The AI has no refund, spawn, Resource, or population shortcut.

## Decision, command, replay, and checkpoint order

Before advancing authoritative battle tick `T + 1`, the local skirmish session performs this exact order:

1. fold the previous step's filtered events into bounded threat and force memory;
2. if match state is active and normal cadence or urgent eligibility permits, build one detached observation and one plan;
3. generate no more than four seat-2 requests targeting `T + 1` in tactical, production, then rally order, with raw-ASCII ordering inside each class;
4. check replay and pending-command capacity before submission;
5. submit each request through unchanged `simulation.submitCommand` and append only accepted authoritative receipts through unchanged Phase 5 replay functions;
6. advance the unchanged simulation exactly once;
7. store no more than 64 filtered public events and the validated next AI state.

Human commands accepted before the decision retain their earlier global sequence; later computer receipts follow them. Any decision, normal or urgent, sets `nextDecisionTick` to decision tick plus 40 and `urgentEligibleTick` to decision tick plus 10. Urgent eligibility may bring a decision forward but never produces two plans at one tick. Pause, portrait gate, hidden-page lifecycle suspension, teardown, replay playback, and completed match all suppress live planning and simulation advancement together.

Replay playback disables the planner and consumes the already-recorded mixed human/computer command stream. A strict Phase 6 checkpoint contains exactly the battle snapshot, AI identity, detached AI state, next-decision and eligibility ticks, plan number/current need, three force slots, bounded threat memory, and the last bounded result needed to prevent retry spam. Composite checksums cover the validated battle snapshot plus every future-affecting AI field. Restore-and-continue must reproduce future observations, intents, accepted receipts, periodic composite checksums, and final state; command replay must reproduce the battle state without rerunning live planning.

## Local presentation

- The approved original menu, landscape gate, six layers, map, structures, entity art, damage art, camera, controls, and player-facing terminology remain visually unchanged except for the minimum local-skirmish identity and outcome copy.
- The menu and battlefield identify `You · Astral Concord · ◇ Azure` and `Computer · Gravebound Court · ✕ Violet` in text outside Canvas.
- Public computer entities, structures, health, ownership, orders, targets, damage, and match outcome remain visible under the same rules as seat 1. Internal need scores, hidden economy, queues, route probes, force memory, and planner diagnostics are not exposed as player knowledge.
- Human input still uses the same nine legal commands. The AI does not disable, intercept, rewrite, or race a human command through DOM timing.
- Standard and Compact art tiers load only local approved assets. CSP retains `connect-src 'none'`; Phase 6 performs no external request.
- Reduced motion, pause, focus, touch-target sizing, navigation overlay, fullscreen request, orientation/lifecycle cleanup, and menu return retain the closed behavior. Simulation timing, AI timing, and outcome never depend on animation.

## Required implementation evidence

Before Phase 6 can close:

1. Configuration tests freeze every identity, enum, threshold, table, cap, and deep-freeze boundary without duplicating Phase 5 battle tuning.
2. Observation tests prove detachment, exact visible fields, human-economy/queue/pending-state redaction, stable ordering, size/count caps, and identical plans after changing hidden opponent state.
3. Planner tests prove no mutation; exact cadence/urgent behavior; deterministic results under collection permutation; bounded candidate/route/request work; exact strength; and stable ties.
4. Scenario tests cover headquarters defense, contested-outpost reinforcement, undefended Resource Point capture, hostile shared-site raid/capture, melee-heavy and ranged-heavy composition recovery, retained reserve, two disjoint field forces with distinct objectives, losing-assault retreat, regroup after losses, roster/spawn repair, timed assault, and passive-opponent match completion within 12,000 ticks.
5. Command tests prove every computer action uses the unchanged nine-command validator, seat ownership, `T + 1`, global sequence, pending cap, replay cap, and deterministic rejection; planning alone never changes the battle checksum.
6. Checkpoint/replay tests cover malformed or oversized AI state, invalid cross-references, restore during defense/regroup/production/pre-assault, composite checksum convergence, mixed human/computer replay, and exact future-intent convergence.
7. Lifecycle tests prove pause, portrait, hidden, teardown, playback, and completed matches issue no computer request and do not advance either state machine.
8. Shell tests prove the local opponent and result are readable outside Canvas, internal AI state is not leaked, the route stays local-only under restrictive CSP, and the exact Pages allowlist excludes prototype AI and repository-only sources.
9. The focused Phase 6 suites, every inherited Phase 3–5 focused suite, the complete dependency-free suite, Pages staging, reference/CSP audit, diff hygiene, working-tree review, and an independent branch-to-base review pass on the frozen candidate.
10. Protected publication, deployed tree, exact live-byte identity, page-origin console, and named Standard/Compact rendered journeys across several frozen battle states. The live journey must visibly show separate reserve/front behavior, defense, production, capture, regroup or retreat, a timed assault, readable outcome, pause/lifecycle recovery, and menu return. Physical-device and broad-browser evidence remains Phase 7 debt rather than an inferred Phase 6 result.

## Closure evidence

The closed implementation adds exactly six staged route files: `phase6/index.html`, `phase6/phase6.css`, `phase6/config.js`, `phase6/ai.js`, `phase6/skirmish.js`, and `phase6/app.js`. It reuses the closed Phase 5 configuration, map, navigation, simulation, replay, asset, renderer, and input owners instead of forking battle rules. The planner receives only detached validated observations, returns legal request intents plus detached state, and the skirmish facade alone owns submission, mixed replay, authoritative advancement, suspension, restore, and composite checkpoints.

Four focused dependency-free suites pass **37/37** across the Phase 6 configuration, observation/planning/scenarios, skirmish facade/checkpoint/replay, and local-only shell; the complete dependency-free suite passes **262/262**. The actual passive `createSkirmish` regression with seed `0x4a0e2026` ends in a computer victory at tick **3,715**, below the 12,000-tick evidence ceiling. Exact Pages staging adds only the six route files to the existing allowlist, for **161 public files plus `.nojekyll` (162 staged files total)**. Prototype AI, tests, repository-only sources, networking, external requests, tags, and GitHub Releases remain excluded.

Protected pull request `#28` passed Offline audit run `32588621330` at candidate commit `ab619699fbed11dd10e4d9309e1c79f644925771` and squash-merged as `f713d58bb7a9460bce7f9e4c88cabc999e17a20f`. The merged tree is exactly `e2a556e56b286d1e23d1d0c6b3399db10a6b6fb4`, matching the frozen candidate tree. Main Offline audit run `32588951779` and Pages run `32588951783` succeeded. Every one of the 161 allowlisted live files matched merged source exactly; one transient HTTP 503 was retried successfully before that comparison completed. No tag or GitHub Release was created.

A visible cloud-Chrome review at a 1363×936 desktop viewport loaded all six canvases at 1363×936 with zero warning or error from the Pages origin; browser-extension metadata errors were excluded because they did not originate from the project. The Standard journey observed first paint, production, captures, separate reserve and front behavior, the timed headquarters assault, readable computer victory at exact tick **3,715**, synchronous pause, and menu recovery. A separate active-pressure journey observed defense, recovery, and regroup behavior at the West Production Outpost. The Compact 96-pixel tier visibly passed first paint, Navigation, and menu recovery.

Physical devices, tablet/phone landscape and portrait/rotation behavior, touch hardware, other browser engines, and the broader browser matrix remain explicit Phase 7 evidence debt rather than inferred results. Phase 6 is closed under the owner's standing goal-mode authorization; Phase 7 is active but no Phase 7 implementation is claimed here.

Gate: **passed**. The computer creates varied, credible, bounded pressure through legal player commands without cheating, leaking hidden state, collapsing every entity onto one destination, or creating a deterministic stalemate in the frozen completion scenarios. Closing this gate did not authorize or create a tag or GitHub Release.
