# Phase 4 structures, economy, production, and rally contract

Status: **implemented and frozen as the Phase 4 candidate on 2026-08-22; integrated, publication, and live evidence remain pending**.

This document owns the exact Phase 4 rules and acceptance evidence. It extends the approved Phase 2 landscape and Phase 3 entity/movement foundation without starting combat, strategic AI, campaign logic, or networking. When this document conflicts with prototype-era source or mood-reference numbers, this document wins.

## Scope

Phase 4 adds only:

- the two faction-specific headquarters, one shared Resource Point form, and one shared Production Outpost form;
- deterministic shared-structure capture and ownership presentation;
- one spendable resource named **Resource** in code and interface until later lore approves a permanent name;
- a hard population cap, bounded production queues, progress, cancellation, spawn validation, and rally commands;
- canonical snapshot, restore, replay, and checksum coverage for every new authoritative value;
- an accessible landscape HUD and structure interaction layer using the approved local art.

Combat damage, combat commands, defeat, strategic AI, modes, rooms, signaling, and transport code are excluded. Structure destruction settlement is implemented as an internal authoritative reducer for the next combat phase; Phase 4 exposes no player destruction command and makes no claim that combat already destroys structures.

## Deterministic identity and bounds

| Rule | Frozen value |
| --- | ---: |
| Schema / protocol | `2` / `2` |
| Configuration | `phase4-structures-economy-v1` |
| Simulation rate | 20 ticks per second; 50 ms per tick |
| Position scale | 100 fixed units per world unit |
| Seats | 2 |
| Opening combat entities | 12 total; 6 per seat |
| Global combat-entity cap | 36 |
| Population cap | 18 per seat |
| Opening population used | 10 per seat |
| Queue length | 5 items per producing structure |
| Pending commands | 64 |
| Ordered spawn slots | 6 per producing structure |

All identifiers, collections, command payloads, routes, snapshots, replays, and encoded sizes retain explicit caps. Structures, combat entities, players, pending commands, queue items, and spawn identifiers use stable raw-ASCII ordering. Rendering and wall-clock time never decide a capture, payment, completion, spawn, or rally outcome.

## Map structures

The approved two-player map contains exactly five structure entities:

| Structure | Category | Opening owner | Capture radius |
| --- | --- | --- | ---: |
| Astral headquarters | Headquarters | Seat 1 | Not capturable |
| Gravebound headquarters | Headquarters | Seat 2 | Not capturable |
| Central Resource Point | Resource Point | Neutral | 112 world units |
| West Production Outpost | Production Outpost | Neutral | 124 world units |
| East Production Outpost | Production Outpost | Neutral | 124 world units |

The map owns immutable placement, footprint, capture radius, spawn slots, and presentation anchors. The simulation owns transient owner, capture, queue, rally, and destroyed state. Intact and destroyed footprints remain hard navigation obstacles; visual pixels never determine clearance.

## Capture

- Headquarters are never captured.
- A living combat entity contributes only to the shared structure whose capture radius contains its ground root.
- Exactly one non-owner seat present advances that seat by one capture tick.
- Both seats present makes the structure **contested** and freezes progress.
- No contributing seat, or only the current owner defending, unwinds hostile progress by two ticks per simulation tick.
- Capture requires 120 progress ticks: six seconds of uncontested control.
- If the challenging seat changes, the old challenge must unwind completely before the new challenger begins at zero. Progress never transfers between players.
- On completion, ownership changes at the capture step, capture state resets, the prior owner's production queue is fully settled, and the rally point clears.
- Neutral and owned states show category plus owner name, color, and symbol. Hue alone is never the ownership cue.

## Economy and population

- Each seat begins with 240 Resource.
- An owned Resource Point grants 12 Resource every 20 ticks. No headquarters or Production Outpost grants passive income.
- Population is `used + reserved` against a hard cap of 18. The opening roster uses 10.
- Queue execution reserves population and spends Resource. Completion converts reserved population to used population; cancellation or loss releases the reservation.
- No queue, capture, rally, or spawn path may exceed the population or global entity cap.

## Production

Both owned headquarters and owned Production Outposts use the same bounded queue. They produce only the current owner's three approved faction representatives.

| Internal role | Resource | Ticks | Seconds | Population |
| --- | ---: | ---: | ---: | ---: |
| Melee representative | 60 | 80 | 4 | 1 |
| Ranged representative | 80 | 100 | 5 | 1 |
| Signature representative | 180 | 180 | 9 | 3 |

Only the queue head advances. At completion the simulation searches the producer's six authored spawn slots in order. A slot must be inside the world, statically reachable for the entity footprint, clear of every structure footprint, and unoccupied by another combat entity. A fully progressed item with no valid slot remains once at the head as **blocked complete**, makes no further progress, and retries on later ticks. It never duplicates.

New combat and queue identifiers are monotonic. A spawned entity is inserted into the canonical combat collection by raw-ASCII identifier order.

## Refund and loss table

Phase 4 deliberately uses one transparent rule: every unsettled item returns all of its Resource and releases all reserved population.

| Outcome | Resource refund | Reserved population | Queue result | Rally result |
| --- | ---: | --- | --- | --- |
| Ordinary cancellation | 100% | Fully released | Selected item removed | Unchanged |
| Blocked-complete cancellation | 100% | Fully released | Head removed | Unchanged |
| Ownership change | 100% to prior owner | Fully released | Entire prior queue cleared | Cleared |
| Structure destruction | 100% to prior owner | Fully released | Entire queue cleared | Cleared |

Destruction also disables capture, income, production, and rally for that structure. Headquarters destruction remains the universal elimination anchor, but health, attacks, victory resolution, and visible destroyed-state transitions begin in Phase 5.

## Rally

- `SET_RALLY` is valid only for a living producer owned by the issuing seat.
- Static placement and reachability are validated with the largest eligible current footprint: 24 world units.
- Validation begins from the producer's first authored spawn slot and uses the same navigation contract as ordinary movement.
- Invalid, blocked, or unreachable placement is rejected without changing the current rally.
- `CLEAR_RALLY` sets the rally to null.
- On a successful spawn, a non-null rally assigns that entity an ordinary validated `MOVE` route through the same movement primitive. This consumes no external player-command sequence.
- Later congestion or obstruction follows the ordinary bounded repath/stop rule.

## Command boundary

Every command carries protocol version, configuration identifier, issuing player, target tick, and an authoritative contiguous sequence assigned on acceptance. Unknown or missing keys are rejected.

| Kind | Exact kind-specific payload |
| --- | --- |
| `MOVE` | sorted `entityIds`, fixed-point `destination` |
| `QUEUE_PRODUCTION` | `structureId`, faction-valid `entityKind` |
| `CANCEL_PRODUCTION` | `structureId`, `queueItemId` |
| `SET_RALLY` | `structureId`, fixed-point `destination` |
| `CLEAR_RALLY` | `structureId` |

Receipt validation bounds identity, ownership references, types, ordering, tick lead, and payload size. Resource, population, ownership, queue availability, and spawn-sensitive effects are final-validated in sequence at the target tick so same-tick outcomes replay identically.

## Tick order

Every authoritative tick uses this fixed order:

1. increment the tick and execute due external commands by sequence;
2. advance combat-entity movement and bounded congestion handling;
3. resolve capture presence, progress, ownership changes, and queue settlement;
4. settle Resource Point income on its exact interval;
5. advance production heads and retry blocked-complete spawns in structure-ID order;
6. assign a successful spawn's ordinary rally movement.

This means an entity arriving this tick can contribute to capture, a capture completed on an income boundary pays the new owner, ownership loss settles a queue before it advances, and a command queued this tick receives one production tick during the same authoritative step.

## Presentation and access

- The approved menu remains unchanged. Phase 4 is a separate route so earlier evidence stays inspectable.
- Real structure sheets replace Phase 2 anchor placeholders. Structures and combat entities share one dynamic ground-root sort; the environment plate remains entity-free.
- A semantic top strip shows Resource, population used/reserved/cap, and the current objective summary.
- Selecting a structure replaces combat selection. Box selection remains combat-only.
- Owned producers expose a compact non-modal tray with entity name, cost, population, time, availability reason, ordered queue, progress, blocked state, and cancellation.
- Desktop contextual right-click issues combat `MOVE` or producer `SET_RALLY` according to the current selection. Touch uses explicit mutually exclusive one-shot Move and Rally modes.
- Capture, selection, owner, rally, blocked production, rejection, and completion use text or shape plus color. Progress bars are not live regions; transition announcements are bounded and separate from the 20 Hz debug readout.
- Pause, lifecycle loss, orientation gates, resize, menu return, and teardown clear transient interaction modes safely.

## Required candidate evidence

Before Phase 4 closes:

1. Focused tests cover strict commands; capture/contest/unwind/switch; income; population; queue bounds and timing; every refund row; blocked retry without duplication; spawn ordering and occupancy; ownership and destruction settlement; rally set/reject/preserve/clear; spawned movement; snapshot validation; restore-and-continue; replay convergence; and checksums.
2. Asset checks reproduce and verify the eight approved lossless structure base/mask derivatives, exact dimensions/bytes/hashes, alpha containment, local paths, and decoded bounds.
3. Shell/input/render tests cover semantic HUD state, keyboard-operable production controls, combat-versus-structure selection, contextual mouse/touch modes, dynamic sorting, non-color cues, lifecycle cleanup, CSP, and the exact Pages allowlist.
4. The complete dependency-free suite, asset reproduction, Pages staging, diff hygiene, and working-tree review pass.
5. Named rendered desktop and compact-landscape journeys inspect first paint, both art tiers, all three categories, neutral and owned cues, capture, queue/progress/cancel, blocked spawn recovery, rally set/reject/clear, spawned movement, pause/orientation recovery, and menu return. Physical-device and unavailable-browser observations remain named debt rather than inferred.
6. Protected publication and live-byte verification are recorded separately from source and rendered review.

Gate: a player can expand, produce, redirect reinforcements, lose shared structures, and recover through deterministic readable interactions. The owner's 2026-08-22 authorization permits autonomous technical/visual review and protected publication of a correct candidate; it does not create a Git tag or GitHub Release.
