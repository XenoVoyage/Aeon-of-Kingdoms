# Game design

> **Prototype-era document:** everything below describes the rejected `v2026.8.15` direction as frozen history. Do not extend or implement its prescriptive language during the redesign. [`REDESIGN.md`](REDESIGN.md) is the active roadmap; [`PHASE1B_VISUAL_LOCK.md`](PHASE1B_VISUAL_LOCK.md) owns the approved visual/interaction target, [`PHASE2_FOUNDATION.md`](PHASE2_FOUNDATION.md) owns the approved landscape foundation, and [`PHASE3_ENTITY_MOVEMENT.md`](PHASE3_ENTITY_MOVEMENT.md) owns the approved entity/movement rules. Phase 4 structures/economy/production/rally is authorized next but remains unresolved until its exact replacement contract is frozen.

Aeon of Kingdoms is a compact 2D real-time strategy game about control, reinforcement, and decisive movement. It removes worker queues and free-form base construction so the player can read the map, choose a force, and act quickly on desktop or touch.

This document records the prototype's intended player experience. Current redesign intent and evidence belong in [`REDESIGN.md`](REDESIGN.md) and [`STATUS.md`](STATUS.md).

## Design pillars

1. **Control creates strength.** Territory produces Aether, forward recruitment, or objective pressure; passive waiting should lose to purposeful expansion.
2. **Small armies, readable decisions.** A population cap and distinct silhouettes keep fights legible. More units are useful, but composition and position decide equal-sized battles.
3. **One command language.** Selection, move, attack, capture, and recruit use the same concepts on mouse, touch, and future multiplayer clients.
4. **Many worlds, one rules core.** Medieval, modern, mythic, undead, and alien factions can look and sound unique without duplicating simulation rules.
5. **Fast, fair, bounded.** Sessions start quickly, deterministic systems are testable, and unit counts, searches, effects, and network messages have enforced limits.

## Core loop

1. Begin at a protected headquarters with a small force.
2. Capture nearby Aether Wells to improve income.
3. Take a Relay Forge to recruit closer to the front.
4. Spend Aether and population capacity on a deliberate role mix.
5. Contest the centre, defend supply, and create a safe approach to the opposing headquarters.
6. Eliminate every opposing headquarters, or satisfy the active mode's earlier objective condition.

There is no free-form building placement in the initial design. Strategic sites replace construction and make the important positions visible before a battle begins.

## Strategic sites

| Site | Function | Counterplay |
| --- | --- | --- |
| Headquarters | Starting anchor and primary recruitment point; losing the last headquarters eliminates that faction | Strong position, long capture/attack commitment, limited exits |
| Aether Well | Adds recurring Aether income while controlled | Distributed around the map so greed stretches an army |
| Relay Forge | Unlocks paid recruitment at a forward fixed location | Valuable but exposed; ownership can change |
| Aeon Core or Seal | Scores or completes mode-specific objectives | Central or otherwise contestable; never required by Total Domination |

Capturing is a timed, interruptible presence check. Rules must define ties explicitly; hidden progress and instant ownership flips are avoided.

## Shared roles, faction names

The engine uses six stable role identifiers. Players see faction-specific unit names, silhouettes, effects, and descriptions. A role is a balance and UI contract, not a requirement that every faction share identical statistics or abilities.

| Internal role | Battlefield purpose | Astral Concord unit | Gravebound Court unit |
| --- | --- | --- | --- |
| Vanguard | Accessible melee line | Astral Legionnaire | Hollowblade |
| Ranger | Ranged pressure | Starbow Ranger | Wraithbow |
| Bulwark | Durable protection | Aegis Sentinel | Bone Colossus |
| Breaker | Anti-structure or anti-heavy pressure | Sunforged Lancer | Crypt Reaver |
| Support | Sustain, control, or amplification | Luminary | Veil Binder |
| Ascendant | Expensive population-heavy signature unit | Solar Titan | Dread Sovereign |

The first slice defines all twelve units, while exact play balance still needs hands-on evidence. New factions map their own units to the same role language only where the role fits; the engine must not expose these internal labels as mandatory public names.

## Battlefields for 2, 4, and 6 players

The simulation and map schema are designed around even spawn sets. A map may support one or several of these layouts, but every enabled layout needs equal travel cost, mirrored access to early economy, and more than one viable route.

| Layout | Spawn geometry | Strategic structure | Primary use |
| --- | --- | --- | --- |
| Duel | Two opposite anchors | Mirrored Wells and Forges with a contested central Core | 1v1, tutorial, campaign |
| Crossroads | Four cardinal or corner anchors | Four local economies, flank lanes, and one readable centre | Free-for-all or 2v2 |
| Convergence | Six anchors on a ring | Six equal opening sectors feeding multiple inner routes and a central objective | Free-for-all, 3v3, asymmetric alliances later |

Aeon Convergence preserves opposite-seat mirroring in every enabled player-count set. Automated geometry checks keep each headquarters equally distant from its nearest Aether Well and Relay Forge, require clear opening lanes for a large-unit footprint, and protect headquarters from arena, obstacle, and capture-area overlap. Those checks establish opening geometry, not whole-map travel parity or match balance.

The first map is a vertical-slice battlefield, not proof that 4- or 6-player balance is complete. Future layouts should reuse the same site definitions, spawn validation, and deterministic navigation graph rather than branching the simulation by player count.

## Modes

Elimination remains a universal victory rule: destroying a faction's final headquarters eliminates it, even when another objective is active.

| Mode | Additional win condition | Status |
| --- | --- | --- |
| Total Domination | Last surviving headquarters wins | Selectable candidate; balance unverified |
| King of the Hill | Hold the Aeon Core long enough to fill a visible score clock | Selectable candidate; balance unverified |
| Conquest | Reach a score target through controlled sites | Selectable candidate; balance unverified |
| Domination | Control every objective site for an uninterrupted countdown | Selectable candidate; balance unverified |

Campaign scenarios may add authored objectives, dialogue, restricted rosters, or starting conditions, but should continue to use the same deterministic commands and combat rules as skirmish.

## Population and economy

- Aether is the single spendable resource in the initial design.
- Every unit has a population cost. Ascendants and other large units consume several slots.
- Population is a hard cap, not a soft performance suggestion; recruitment cannot exceed it.
- Site income and prices use integer or fixed-point values so replays and future peers remain deterministic.
- Captured Relay Forges change where a unit can enter, not whether the owner can ignore cost or population rules.

Exact tuning belongs in `js/config.js`, never in this document.

## Movement without unit piles

Orders target a squad anchor, not one identical destination for every unit. The intended movement stack is deliberately layered:

1. A bounded strategic path search finds a route for the selected group.
2. Stable formation slots distribute units around the moving anchor.
3. Local separation resolves nearby overlap without turning the simulation into a full physics engine.
4. Attack-ring reservations allocate reachable positions around a target; overflow waits or selects a second ring.
5. Large units use hard footprints that narrow or block routes that smaller units may still traverse.

Units may briefly overlap during recovery, spawning, or unavoidable congestion, but a hundred attackers must never converge on one coordinate. Tie-breaking, slot assignment, and neighborhood iteration must remain deterministic for replay and networking.

## Presentation

The world combines ancient silhouettes and science-fiction energy within a restrained deep-space palette: near-black blue terrain, cool cyan information, violet energy, and sparse warm danger accents. The map remains darker and quieter than units, capture boundaries, orders, and status UI.

- Camera and UI preserve clear target sizes on phones and tablets.
- Faction identity uses shape before color so ownership survives color-vision differences.
- Selected, ordered, capturing, damaged, and unavailable states require more than glow alone.
- Animation supports state readability and feedback; it must not hide hit timing or consume simulation authority.
- Reduced-motion presentation removes nonessential drift, pulses, and shake without changing rules.

## Vertical-slice boundary

The first slice proves the loop with one map, local 2/4/6-faction setups, one short campaign scenario, deterministic AI, two six-role rosters, capture sites, population, and headquarters victory. It does not claim production multiplayer, final 4–6-player balance, matchmaking, persistence, progression, or a complete campaign.
