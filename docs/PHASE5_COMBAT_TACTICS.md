# Phase 5 combat and tactical-command contract

Status: **approved and closed on 2026-08-22 under the owner's standing goal-mode authorization**.

This document owns the exact Phase 5 combat rules and candidate evidence. It extends the closed Phase 4 structures, economy, production, rally, movement, replay, and snapshot rules without starting strategic AI, modes, campaign scripting, networking, or product-hardening work. When this contract conflicts with prototype-era source, mood-reference numbers, or informal RTS conventions, this contract wins.

The owner's standing authorization permitted implementation, technical and visual audit, protected publication, and evidence-backed closure without another routine approval request. Source completion alone did not establish closure; the protected merge, deployed-byte proof, and named rendered journey recorded below closed the phase and authorized the separately frozen Phase 6 boundary.

## Scope

Phase 5 adds only:

- health, deterministic damage, defeat, structure damage/destruction, headquarters outcomes, and the exact tactical orders below;
- explicit hostile targeting plus bounded automatic acquisition, chase, leash, return, and resume behavior;
- deterministic melee/signature contact reservations and bounded ranged projectile entities;
- simultaneous same-tick damage packets and canonical combat snapshot, restore, replay, and checksum state;
- runtime use of the six already-approved representative action and defeat rows;
- production-ready damaged and destroyed structure derivatives plus accessible combat presentation.

Phase 4's map, five structure instances, capture, Resource, population, production, spawn, rally, navigation, and refund rules remain binding unless this document explicitly orders their interaction with combat. No rejected prototype value or implementation is a compatibility input.

## Deterministic identity and bounds

| Rule | Frozen value |
| --- | ---: |
| Schema / protocol | `3` / `3` |
| Configuration | `phase5-combat-tactics-v1` |
| Simulation rate | 20 ticks per second; 50 ms per tick |
| Simulation tick cap | `Number.MAX_SAFE_INTEGER - 32` |
| Position scale | 100 fixed units per world unit |
| Seats | 2 |
| Combat-entity cap | 36 |
| Selection cap | 12 combat entities |
| Pending external commands | 64 |
| Authoritative projectiles | 96 |
| Contact reservations | 24 per target |
| Presentational combat effects | 96 |
| Replay commands | 8,192 |
| Snapshot encoded size | 1 MiB |
| Replay encoded size | 4 MiB |
| Defeat presentation | 12 ticks; 600 ms |

The Phase 4 command lead, route, path-search, congestion, identifier, world, queue, structure, capture, economy, and population caps remain unchanged. Phase 5 lowers only the inherited simulation-tick cap from `Number.MAX_SAFE_INTEGER - 16` to `Number.MAX_SAFE_INTEGER - 32`, so the longest 32-tick cooldown written at the final executable tick remains a safe integer. New projectile identifiers use exactly `projectile-` plus a 12-digit zero-padded decimal counter beginning at `projectile-000000000001`; the counter is monotonic, and a launch that would exceed `projectile-999999999999` is withheld with stable `projectile-id-limit` feedback while consuming its attack cycle. The authoritative projectile collection is kept in raw-ASCII identifier order. Combat entities, structures, projectiles, reservations, commands, damage targets, and same-tick events always use explicit stable ordering.

Snapshots and checksums include every value that can change a future outcome: health, maximum health, order, target, command/engagement/idle/defend roots, saved attack-move route, route progress, reservation, attack-start/contact/launch timing, cooldown eligibility, projectiles, next projectile identifier, match outcome, and the inherited Phase 4 state. Presentational effect and defeat-playback objects are bounded but non-authoritative and are excluded from checksums.

Rendering, animation frames, audio, wall-clock time, and frame rate never acquire a target, complete a chase, create a projectile, apply damage, remove population, destroy a structure, or decide a match.

## Combat statistics

The two factions remain mechanically symmetric in this first combat slice. Each public identity uses the exact shared-role row below; faction names, silhouettes, weapons, masks, and effects remain visually distinct.

| Role and representatives | Health | Damage | Attack cycle | Contact / launch offset | Range or preferred gap | Awareness | Idle leash |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| Melee — Astral Guardian / Gravebound Reaver | 240 | 28 | 20 ticks / 1.0 s | 5 ticks | contact at no more than 12 world units of target-edge gap | 180 | 240 |
| Ranged — Starbow / Hollow String | 160 | 22 | 24 ticks / 1.2 s | 5 ticks | seeks 160; maximum target-edge range 220 | 260 | 300 |
| Signature — Aegis Titan / Ossuary Colossus | 520 | 64 | 32 ticks / 1.6 s | 5 ticks | contact at no more than 16 world units of target-edge gap | 200 | 260 |

Health and damage are non-negative safe integers. Every distance uses integer fixed-point coordinates and the inherited `floor(hypot(deltaX, deltaY))` centre distance. Target-edge distance is `max(0, centreDistanceFixed - attackerRadiusFixed - targetRadiusFixed)`. Awareness, preferred gap, and attack range compare that edge distance inclusively against their world-unit value multiplied by 100. Leashes and return thresholds compare ground-root centre distance inclusively against their value multiplied by 100; they never subtract a footprint radius. Damage subtracts directly from health and clamps at zero.

There is no armor, evasion, critical hit, random damage, splash damage, friendly fire, healing, aura, counter table, damage type, elevation modifier, or faction-stat asymmetry in Phase 5. Structures do not attack.

## Structure health and outcomes

| Structure form | Maximum health | Damaged presentation | Destroyed presentation |
| --- | ---: | --- | --- |
| Astral headquarters | 1,800 | health at or below 50% and above zero | health equals zero |
| Gravebound headquarters | 1,800 | health at or below 50% and above zero | health equals zero |
| Shared Resource Point | 800 | health at or below 50% and above zero | health equals zero |
| Shared Production Outpost | 1,200 | health at or below 50% and above zero | health equals zero |

Only a living structure owned by the opposing seat is hostile and damageable. Neutral shared structures are captured, not attacked. An ownership change immediately changes hostility; an already-launched projectile rechecks hostility at impact and dissipates if its target is no longer hostile.

Structure destruction calls the inherited internal authoritative settlement reducer exactly once. It clears ownership, capture, queue, and rally, refunds every unsettled queue item to its prior owner under the Phase 4 100% rule, releases reserved population, and permanently disables capture, income, production, and rally. Intact and destroyed footprints remain hard navigation blockers. No browser-exposed player command or immediate mutation hook may destroy a structure.

After all damage for a tick has been aggregated and all resulting destructions are known:

- one destroyed headquarters completes the match, awards `winnerSeat` to the surviving opposing seat, and records `completedTick` as the current tick;
- both headquarters destroyed in the same aggregate stage complete the match as a draw with `winnerSeat: null` and the current `completedTick`;
- the result is evaluated after both headquarters, so collection or identifier order cannot choose the winner.

Once the match becomes complete, the remaining capture, income, production, and rally-spawn stages of that tick are skipped. Later `step` calls leave authoritative state unchanged and new commands are rejected with stable match-complete feedback.

## Command boundary

Every request retains the Phase 4 common fields: protocol version, configuration identifier, issuing player, target tick, and an authoritative contiguous sequence assigned on acceptance. Unknown, additional, missing, mistyped, unsorted, duplicate, oversized, stale, or out-of-window fields are rejected before allocation. The five Phase 4 commands keep their exact payloads and adopt protocol/configuration identity `3` / `phase5-combat-tactics-v1`.

| Kind | Exact kind-specific payload |
| --- | --- |
| `MOVE` | sorted `entityIds`, fixed-point `destination` |
| `ATTACK_ENTITY` | sorted `entityIds`, hostile combat-or-structure `targetId` |
| `ATTACK_MOVE` | sorted `entityIds`, fixed-point `destination` |
| `STOP` | sorted `entityIds` |
| `DEFEND` | sorted `entityIds`, exact `anchor` union described below |
| `QUEUE_PRODUCTION` | `structureId`, faction-valid `entityKind` |
| `CANCEL_PRODUCTION` | `structureId`, `queueItemId` |
| `SET_RALLY` | `structureId`, fixed-point `destination` |
| `CLEAR_RALLY` | `structureId` |

`DEFEND.anchor` has exactly one of these two shapes:

- `{ kind: "point", destination: { x, y } }` for a statically valid reachable fixed-point location;
- `{ kind: "entity", entityId }` for one living friendly combat entity or structure entity.

All selected combat entities must be living, owned by the issuer, unique, raw-ASCII sorted, and within the selection cap when the command executes. Tactical commands replace the current tactical order; there is no general prior-order stack or hidden command queue.

`ATTACK_ENTITY` is an atomic group focus command. At execution, every selected attacker must have a valid route to one reachable role-appropriate reservation for the hostile target within its focus leash. If any selected attacker cannot satisfy that requirement, the entire command is rejected without changing any member. Target death, destruction, ownership change, or later bounded-route failure is a deterministic runtime outcome rather than partial command acceptance.

`MOVE`, `ATTACK_MOVE`, and point `DEFEND` retain the existing atomic distributed-destination and navigation validation. An entity-anchored `DEFEND` validates the friendly anchor and a reachable position inside its defend area. Same-tick due commands execute by contiguous sequence; a later command for the same entity replaces the earlier result before contacts or launches are resolved.

## Orders, stance, leash, and resume

| Order / stance | Acquisition and response | Chase boundary | Invalid target / return | Completion |
| --- | --- | --- | --- | --- |
| `MOVE` | Passive: never acquires, attacks, or returns fire | None | Inherited bounded repath or stop feedback | Enters `IDLE` at destination |
| `ATTACK_ENTITY` | Keeps the explicit combat or hostile owned-structure target; nearby entities and attackers do not override it | Target root remains within 1,200 world units of that attacker's command root | Bounded repath; on target invalid, unreachable, or outside leash, releases combat state and enters `IDLE` | Enters `IDLE`; never resumes a replaced order |
| `ATTACK_MOVE` | Acquires a hostile combat entity or hostile owned structure inside role awareness | Target root remains within 240 world units of the root recorded for that engagement | Releases target and reservation, returns to within 96 world units of the saved engagement root, then resumes the unchanged saved route; inherited unreachable-destination feedback ends in `IDLE` | Enters `IDLE` at destination |
| `DEFEND` | Acquires hostile combat entities whose roots are inside both role awareness and the 224-world-unit defended area; never attacks a structure autonomously | Target root remains within 224 world units of the current defend anchor | Releases target and returns to within 96 world units of the current anchor; the order then holds and persists until replaced or stopped | Persists after return |
| `STOP` | Holds position, acquires nothing, and cannot fire or return fire | None | Remains stopped | Persists until replaced |
| `IDLE` | Acquires hostile combat entities only inside role awareness; never attacks structures autonomously | Target root remains within the role-specific idle leash of the root recorded on entering idle | Releases target and returns to within 96 world units of that idle root | Remains idle after return |

An entity-targeted defend anchor follows the friendly entity's current ground root. If that anchor is defeated or destroyed, the last valid ground root becomes a permanent point anchor; the defend order does not vanish or jump. Defend return routing is bounded by the inherited route/repath caps. An unavailable return route leaves the defender holding at its nearest valid root with one stable `defend-return-unreachable` result; it is not searched every tick.

An attack-move engagement root is recorded when a target is acquired, not moved during the chase. The saved route and destination remain unchanged while fighting. An idle root is recorded whenever the entity enters `IDLE`; automatic combat does not drift that root.

The current target is sticky. A valid target is never replaced merely because a closer target appears or another attacker deals damage. When acquisition or reacquisition is required, valid candidates sort first by target-edge distance and then by raw-ASCII target identifier. A direct attacker receives no hidden priority. Focus attacks ignore awareness but not the inclusive 1,200-world-unit target-root-to-command-root leash. Attack-move, defend, and idle acquisition use inclusive target-edge awareness; all three also require the target root inside their inclusive order leash described above. The defend area is exactly the same 224-world-unit root-centred leash, not an additional inferred radius.

## Contact reservations and spacing

Each target exposes exactly 24 logical reservation slots: eight ordered directions on each of three ordered role-specific rings. Direction order is screen-east, southeast, south, southwest, west, northwest, north, northeast. A slot lies at the target radius plus attacker radius plus the ring's target-edge gap. Existing fixed-point navigation resolves the final integer point and rejects blocked or unreachable candidates; image pixels never provide geometry.

For a ring radius `R` in fixed units, the exact ordered offsets are `(R, 0)`, `(D, D)`, `(0, R)`, `(-D, D)`, `(-R, 0)`, `(-D, -D)`, `(0, -R)`, `(D, -D)`, where screen Y increases downward and `D = floor(R * 7071 / 10000)`. No floating-point sine, cosine, square-root normalization, or alternate diagonal rounding enters reservation geometry.

| Attacker role | Ring gap order, in world units |
| --- | --- |
| Melee | 8, 64, 120 |
| Ranged | 160, 104, 216 |
| Signature | 12, 68, 124 |

The 24 logical indices are shared across roles, not multiplied per role; an occupied ring/direction index is unavailable to every other attacker even though each role maps that index through its own gap table. Allocation is one bounded canonical pass per target after invalid reservations release. First, valid first-ring reservations held by melee/signature attackers retain in raw-ASCII attacker-ID order. Second, remaining melee/signature attackers take reachable unreserved first-ring slots in direction order. Third, valid ranged reservations retain when their logical slot was not claimed by either prior pass, then remaining ranged attackers scan all unreserved slots in ring/direction order. Fourth, remaining melee/signature waiters retain a still-free outer-ring reservation or scan the outer rings in ring/direction order. A higher-priority claim deterministically displaces a ranged or outer-waiting incumbent, which immediately participates in its later pass. With an unchanged target and attacker set, this pass produces unchanged reservations; moving combat targets move slot centres while logical identities remain stable.

Only the first melee ring is inside the melee contact gap, only the first signature ring is inside the signature contact gap, and all three ranged rings are inside the 220-world-unit ranged maximum. Outer melee/signature reservations provide non-stacking waiting positions; they do not extend attack range. Because the canonical pass runs after releases, an outer waiter is promoted on the same tick that a reachable first-ring slot becomes free and ranged attackers cannot permanently occupy every contact-capable logical index. No target may hold more than 24 reservations. The legal single-hostile-seat maximum is 18 combat entities, so count overflow beyond 24 cannot occur. An attacker may still remain reservation-less when candidate slots are blocked, unreachable, or otherwise unavailable; it keeps its tactical order at a distinct ordinary separation destination and retries on the same stable release/material-target-change triggers rather than running an unbounded per-tick path search.

A reservation releases on order replacement, target invalidation, leash break, route failure, attacker defeat, target defeat/destruction, or match completion. Reservations are authoritative because they affect movement and later attacks, and therefore are restored and checksummed.

## Attack cycles, projectiles, and damage

Every opening or newly spawned combat entity has no pending contact/launch and initializes `nextAttackStartTick` to its creation tick. An opening entity can therefore first start on authoritative tick 1; an entity spawned after combat stage on tick `T` can first start on tick `T + 1`. After movement on tick `T` and before any due contact, launch, or arrival is collected, a living attacker with a valid target, attack-capable reservation, inclusive range, valid geometry, no pending contact/launch, and `T >= nextAttackStartTick` starts an attack. Eligible attackers start in raw-ASCII attacker-ID order and set `nextAttackStartTick = T + cycleTicks`. Its direct contact or ranged launch is due on `T + 5`, even when that contact or launch later misses. Moving into range during stage 3 can therefore start on that same tick; leaving range before `T + 5` causes the defined miss.

At the due contact or launch tick, the simulation revalidates that attacker and target are living and hostile and that the target is inside the role's exact attack range with valid authored navigation/line geometry. A failed recheck produces a miss, clears the pending contact/launch, and still consumes the cycle. `STOP`, any replacing command, or match completion cancels a pending contact/launch before it can produce a damage packet. An attacker defeated only later in the same damage stage still contributes a packet already collected that tick.

Melee and signature contacts create bounded damage packets immediately. Ranged contacts launch authoritative target-locked projectile entities with these exact rules:

- speed is 16 world units, or 1,600 fixed units, per tick;
- travel ticks are `ceil(targetEdgeDistanceFixedAtLaunch / 1600)`, clamped to 1 through 14; the maximum is exactly `ceil(220 / 16) = 14` at the frozen ranged attack limit and speed;
- the projectile stores its source seat, target identifier, damage, launch tick, arrival tick, and launch geometry; it has no collision, splash, retarget, capture, selection, or navigation behavior;
- at arrival it rechecks that the target is living and hostile to the source seat; if so it creates one damage packet, otherwise it dissipates without damage;
- later target movement, range, intervening entities, and a defeated source do not alter an already-valid launch;
- due ranged launches are attempted in raw-ASCII attacker-ID order; when all 96 projectile slots are occupied, each later launch is withheld, its full attack cycle remains consumed, and one bounded accessible projectile-limit result is produced. No deferred launch queue is created.

Within the combat-resolution stage, eligible new attacks start first, due direct contacts are collected second, due ranged launches are attempted third, and already-due projectile arrivals are collected and removed fourth. All resulting packets then aggregate by raw-ASCII target identifier. Each target receives the sum once, so mutual lethal hits and multiple same-tick attackers resolve simultaneously rather than by attacker, packet, or target collection order.

## Defeat and population

Health reaching zero removes a combat entity from authoritative play in the same tick. It immediately stops blocking, moving, reserving, acquiring, attacking, capturing, and receiving commands. Its owner's used population is reduced exactly once by that representative's population cost, every reservation it owns or targets is released, and future pending contacts from it disappear. Already-launched projectiles remain valid.

The simulation emits one bounded defeat event and never emits it again for that identifier. Presentation retains a non-interactive visual shell for exactly 12 presentation ticks and maps the six authored defeat frames at two ticks per frame. While an active simulation runs, presentation ticks follow its 20 Hz cadence. After a match-completing authoritative tick, a separate bounded presentation-only 20 Hz clock may advance existing defeat/effect ages through their remaining ticks; it cannot run commands, simulation stages, checksums, or any authoritative mutation. That shell is not an authoritative entity, has no owner interaction, footprint, health, target, or capture presence, and is removed deterministically from the bounded presentation collection.

## Authoritative tick order

After incrementing the current tick, every active match uses this exact order:

1. execute due external commands by contiguous sequence;
2. acquire or validate sticky targets and allocate/release contact reservations;
3. advance ordinary movement, chase, return, saved attack-move routes, and bounded separation;
4. start eligible attacks, collect due direct contacts, attempt due ranged launches, then collect and remove projectile arrivals;
5. aggregate all packets by target identifier and apply simultaneous clamped damage;
6. settle combat-entity defeat, population release, structure destruction/refunds, and headquarters outcome;
7. resolve capture using only surviving combat entities;
8. settle Resource Point income on its exact inherited interval;
9. advance production heads and retry blocked-complete spawns in structure-ID order;
10. assign a successful spawn's ordinary rally movement.

If stage 6 completes the match, stages 7 through 10 are skipped. Thus a defeated entity cannot capture in its defeat tick, a destroyed Resource Point cannot pay income, a destroyed producer settles before it advances, and no spawn occurs after a headquarters outcome. Animation never changes this sequence.

## Structure damage assets

Phase 5 adds exactly twelve lossless local WebP derivatives for the four approved structure forms:

- four damaged bases: Astral headquarters, Gravebound headquarters, shared Resource Point, and shared Production Outpost;
- four frame-aligned damaged player-color masks, each clamped so mask alpha never escapes its damaged base alpha;
- four destroyed bases for those same forms, with no destroyed ownership masks because destruction clears ownership.

Each sibling derivative preserves its intact form's exact canvas dimensions, ground root, footprint, selection anchor, health anchor, capture/rally anchors where applicable, and overall architectural identity. Damage removes material, adds readable scorching/fire only to damaged states, and collapses the same structure at zero health; it does not redraw a different building, shift the root, alter navigation geometry, add a structure category, bake entities, or rely on hue alone.

The twelve-file damage package has a hard combined encoded ceiling of 3 MiB and a hard decoded-source RGBA ceiling of 13 MiB. The loader validates all approved local files, prepares exactly the same six two-seat ownership sheets for intact forms and six for damaged forms, then releases all eight decoded intact/damaged masks. Retained structure residency is exactly twelve neutral/state bases (intact, damaged, and destroyed for four forms) plus those twelve prepared ownership sheets, with a hard combined decoded ceiling of 13 MiB; no destroyed owner sheet exists. A reproducible exporter records tool versions, source-to-output mapping, exact dimensions, bytes, hashes, alpha bounds, mask containment, prepared-sheet count, and retained bytes. The flattened `production-outpost-damage.webp` review strip is never cropped, traced, or promoted into runtime art. Damage derivatives come from proper transparent structure sources; no invented review crop, external URL, or runtime asset generator ships to the browser.

## Presentation and accessibility

- The approved menu, landscape shell, camera, environment-only battlefield, dynamic ground-root ordering, semantic economy strip, production tray, and three structure categories remain intact on a separate Phase 5 route.
- Desktop enemy hover shows a shape-and-symbol hostile cue; contextual right-click on that cue issues `ATTACK_ENTITY`, while contextual terrain behavior remains move or rally according to selection. Touch exposes an explicit one-shot Attack mode and requires a hostile target tap.
- `ATTACK_MOVE`, `DEFEND`, and `STOP` are visible keyboard-operable controls with readable active/disabled state and touch targets. Point versus friendly-entity defend intent is explicit before placement; transient modes are mutually exclusive and clear on command, cancellation, pause, orientation loss, menu return, or teardown.
- Selection detail exposes public identity, numeric current/maximum health, order, target or anchor, and stable rejection/limit feedback outside the canvas. Health, target, damage, disabled, damaged, destroyed, and match-result states use text or symbol/shape in addition to color.
- The six action frames play from authoritative attack elapsed ticks using `min(5, floor(elapsedTicks * 6 / cycleTicks))`; the authoritative contact/launch cue is emitted at tick offset 5 regardless of the displayed frame. Defeat uses exactly two ticks per authored frame. Idle and movement retain their approved Phase 3 playback.
- Canonical right-facing baked full bodies, exact runtime `scaleX(-1)` for left, stable ground roots, aligned player-color masks, and restrained separate impact/projectile effects remain mandatory. The renderer never rigs limbs, deforms anatomy, stores independent left art, or infers damage from an animation frame.
- Reduced motion may hold a representative action/defeat frame and remove optional trails or flashes, but it cannot hide target, health, damage, projectile-limit, destroyed, or match-result information and never changes simulation timing.
- Presentational attack, impact, miss, target, and defeat objects share the 96-effect cap, use deterministic replacement/cleanup rules, and may be omitted under pressure without affecting authoritative packets. Live-region announcements are transition-based and bounded; neither 20 Hz health changes nor animation progress spam assistive technology.
- Pause, portrait gate, lifecycle loss, resize, and teardown stop presentation safely and clear transient input. Authoritative pause behavior remains inherited; resuming cannot replay a stale attack or placement gesture.

## Explicit exclusions

Phase 5 does not add:

- strategic AI, difficulty rules, objective modes, campaign logic, onboarding, final audio, networking, rooms, signaling, transport, accounts, matchmaking, telemetry, analytics, or external requests;
- a support ability, heal, aura, crowd control, activated ability, new faction mechanic, or any mechanic inferred from candidate identity names;
- the six Phase 1B candidate additions or any invented combat-entity atlas. Runtime combat remains the six approved representatives already loaded in Phase 3/4;
- fog of war, line-of-sight concealment, terrain height, physics, projectile collision bodies, armor, random combat, status effects, resurrection, veterancy, or a fourth structure category;
- generated limb atlases, bone rigs, runtime anatomy deformation, independent left/right art, independently redrawn idle/move upper bodies, color-only ownership, or a cropped flattened damage strip;
- prototype combat code, values, tests as acceptance evidence, a framework, a runtime dependency, a network permission, a Git tag, a GitHub Release, or a shipping-game claim.

Candidate support and champion identities remain visual language only until a later separately approved production and rules phase. Phase 6 owns strategic AI; Phase 7 owns product-hardening and physical-device release evidence; Phase 9 owns private host/client networking.

## Implementation-candidate source evidence

The `v2026.8.22e` source candidate implements the nine-command protocol, deterministic combat state, acquisition/leash/return orders, 24-slot reservations, bounded projectiles and effects, simultaneous damage, combat-entity defeat, structure damage/destruction, headquarters outcomes, replay/snapshot/checksum coverage, and the corresponding accessible interaction and presentation on the separate `phase5/` route.

Candidate review corrected the natural ranged-flight upper-bound arithmetic from 16 to **14 ticks**: `ceil(220 / 16) = 14`. Runtime, configuration, stored launch geometry, restore validation, and focused fixtures use the exact 1–14 range; no natural 16-tick projectile evidence is claimed.

The four focused Phase 5 suites pass **57/57** locally, and the complete dependency-free suite passes **225/225**. The deterministic exporter reproduces exactly twelve new lossless WebPs totaling **1,040,292 bytes**: four damaged bases, four aligned and damaged-alpha-clamped ownership masks, and four destroyed bases with no destroyed masks. The package records **6,418,944 decoded source bytes**, **12,811,776 retained two-player decoded bytes**, twelve retained state bases, twelve prepared ownership sheets, and zero border-alpha, mask-escape, transparent-RGB, or lossless-round-trip violations. Eight exact transparent damaged/destroyed PNG sources remain repository-only beneath `concepts/feasibility/phase1a/structures/phase5/`; the flattened review strip remains excluded.

The explicit Pages candidate allowlist contains **154 public files plus `.nojekyll` (155 staged files total)**, including exactly 24 Phase 5 route files: twelve shell/source/manifest files and twelve WebPs. These facts were frozen before protected publication and then independently reproduced against the merged tree.

## Publication, live review, and closure evidence

Protected pull request [`#26`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/pull/26) passed Offline audit run `32582567751` and squash-merged as `4c94369888911e7ff9c06ca53836fb6903b8e304`. Main Offline audit run `32582619287` and Pages deployment run `32582619288` completed successfully. The remote merge tree `2c9dbe220bdf1e621eee395e998dab74aac16ccb` exactly equals the frozen local candidate tree. A connector upload had first truncated eight large source PNG blobs; the failed protected audit caught the mismatch, all eight blobs were re-uploaded in bounded chunks, every remote blob hash and the complete tree were rechecked against local Git objects, and only the corrected candidate was merged.

Cache-busted live requests returned HTTP 200 and matched merged source byte for byte for the root status page and all **24** allowlisted Phase 5 route files, including all twelve damage WebPs. GitHub Pages advertised a ten-minute HTTP cache; a repeated WebP changed from cache miss to hit without changing bytes. The status-shell service worker does not retain Phase 5 route resources. No warning or error from the Pages origin appeared during the live review; cloud-browser extension metadata errors were excluded because they did not originate from the project.

Fresh visible cloud-Chrome journeys at a `1363×936` desktop viewport loaded both Standard 128-pixel and Compact 96-pixel entity tiers, the environment-only battlefield, all six ordered canvas layers, all three structure categories, all six full-body representatives, restrained ownership masks, and color-plus-symbol ownership cues. The exercised journey covered single and six-entity selection; explicit focus attack; accepted attack-move; point and friendly-entity defend; STOP before contact; ranged travel, automatic hostile response, casualties, and defeat cleanup; survivor-only Resource Point capture; a six-entity headquarters assault that reduced the hostile headquarters from `1800` to `1624`; completed production; immediate full-refund cancellation; synchronous pause/resume with an unchanged paused tick; navigation overlay; menu/settings return; and choosing the Compact tier through the actual menu before Begin. Bounded congestion recovery and target release remained readable rather than trapping the simulation.

Deterministic automation separately establishes the exact cases that are impractical to force through an unprivileged live UI: STOP after contact, attack-move resume, defend-anchor loss, all reservation permutations, projectile cap/arrival edges, simultaneous defeat, every damaged/destroyed threshold, destruction settlement and queue refund, single-headquarters victory, simultaneous-headquarters draw, strict restore, and replay convergence. The browser journey did not claim those unobserved states. Tablet/phone landscape, portrait/rotation recovery, physical touch, another browser family, 200% rendered zoom, reduced-motion preference emulation, fullscreen recovery, long-match performance/thermal behavior, generalized stale-cache/rollback, and physical devices remain explicit Phase 7 evidence debt.

## Required candidate evidence

Before Phase 5 can close:

1. Focused simulation tests cover every strict command shape; ownership and atomic group validation; every order-table row; sticky targets; target-edge/ASCII acquisition; focus, attack-move, defend, and role-idle leashes; anchor loss; bounded unreachable outcomes; saved-route resume; STOP cancellation; and no hidden prior-order stack.
2. Deterministic fixtures cover all 24 role-ordered reservation positions, moving targets, slot retention/release, mixed footprints, blocked/unreachable slots, the legal 18-attacker maximum with no count overflow, unavailable-slot waiting, and invariant results under input collection permutation.
3. Damage tests cover each role's health, range, start/contact/launch/cycle ticks, miss-and-consume behavior, replacement cancellation, the 96-projectile boundary, exact 1/14/intermediate travel ticks, hostility recheck, no retarget, simultaneous packets, mutual defeat, population release once, already-launched source defeat, and snapshot restore during active attacks and flight.
4. Structure fixtures cover every maximum-health and 50% threshold, neutral non-hostility, ownership changes before projectile impact, all Phase 4 destruction refunds, survivor-only capture, income/production suppression, single-headquarters victory, simultaneous-headquarters draw, completed-tick freeze, and post-match command rejection.
5. Replay, restore-and-continue, periodic checksum, malformed snapshot/replay, cap, size, raw-ASCII ordering, command-sequence, and final-state convergence tests include every new authoritative field and each order kind.
6. Asset checks reproducibly verify all twelve damaged/destroyed files, exact dimensions/bytes/hashes, lossless round trips, transparent bounds, aligned/clamped damaged masks, absent destroyed masks, stable roots/anchors, encoded and decoded ceilings, local-only paths, and explicit exclusion of the flattened review strip.
7. Shell/input/render tests cover desktop hostile hover/right-click, touch Attack mode, keyboard/touch attack-move/defend/stop, selection exclusivity, health/order/target semantics, structure damage states, owner-independent destroyed art, exact left mirror, action/defeat timing, reduced motion, effect/projectile-cap fallback, pause/orientation/lifecycle cleanup, restrictive CSP, and the exact Pages allowlist.
8. The focused suite, full dependency-free suite, structure-damage export check, Pages staging, local-reference/CSP audit, diff hygiene, working-tree review, and a complete branch-to-base review pass on the frozen candidate.
9. Named rendered desktop and compact-landscape journeys inspect first paint in both art tiers; focus attack; automatic idle combat and return; attack-move engagement/resume; point and friendly-entity defend including anchor loss; STOP before and after contact; melee/signature reservations; ranged spacing/projectiles; simultaneous defeat; capture after casualties; intact/damaged/destroyed structures; queue refund; single-headquarters victory; draw; pause/orientation recovery; readable touch controls; reduced motion; and menu return.
10. Protected publication, deployed commit, live-byte identity, local-resource loading, page-origin console, and primary short-battle journey are recorded separately. Browser emulation, unavailable browser families, physical phone/tablet, performance/thermal, and real-device touch observations remain explicitly named evidence debt rather than inferred from automation.

Gate: **complete on 2026-08-22** under the owner's standing goal-mode authorization after source, automated, protected-publication, exact live-byte, page-origin console, Standard/Compact first-paint, and named desktop combat evidence passed. Unavailable device/browser rows remain named debt. No tag or GitHub Release was created or authorized by closing this gate.
