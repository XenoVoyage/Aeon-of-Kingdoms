<div align="center">

# Aeon of Kingdoms

**An original landscape real-time strategy game, being rebuilt one approved phase at a time.**

[![Status build v2026.8.22i](https://img.shields.io/badge/status_build-v2026.8.22i-6ef3ff)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-cbd5e1)](LICENSE)

> **Active redesign:** the product owner rejected the `v2026.8.15` prototype and approved the phased replacement plan. Its UI, art, map, controls, terminology, gameplay feel, and AI are not the baseline for future work.

## Phase 6 approved · Phase 7 implementation candidate active

[Review the Phase 7 product-hardening candidate](phase7/) · [Play the approved Phase 6 Standard local skirmish](phase6/) · [Read the active Phase 7 contract](docs/PHASE7_PRODUCT_HARDENING.md)

</div>

[![Phase 1A desktop battlefield composition showing separate cartoon-leaning painted environment, structure, entity, and ownership layers.](concepts/feasibility/phase1a/review/battlefield-desktop.webp)](concepts/feasibility/phase1a/review/battlefield-desktop.webp)

The owner approved the production method in [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md): cartoon-leaning baked full-body sprites, canonical right-facing art with an exact X-mirrored left facing, one stable idle frame, four movement frames with invariant upper bodies and equipment, six-frame action and defeat sequences, and separate player-color masks for every player-controlled entity and ownable structure. On 2026-08-21 the owner approved the corrected Aegis Titan and complete Phase 1A package, then explicitly approved the complete Phase 1B menu/HUD, battlefield, twelve-identity language, landscape controls, viewport policy, and measured runtime-art envelope. The four derived Astral Guardian browser samples were subsequently corrected from the intact approved master after three movement cells were found to be missing their lower-body pixels.

The owner approved the complete Phase 3 entity/movement foundation on 2026-08-22 and authorized autonomous completion and publication of later verified phases. The approved Phase 4 foundation extends the same fixed 20 Hz simulation with exactly five instances of the three locked structure categories, deterministic capture, one Resource, population, five-item production queues, full refunds, ordered spawn validation, rally commands, and canonical replay/snapshot/checksum coverage. The approved deployed Phase 5 foundation adds focus attack, attack-move, defend, stop, bounded acquisition/reservations/projectiles, simultaneous damage, defeat, structure destruction, headquarters outcomes, and twelve damage-state WebPs. The approved deployed Phase 6 foundation adds a detached no-cheating Standard planner, three bounded task forces, legal-command local-skirmish orchestration, composite checkpoints, and mixed replay without changing Phase 5 rules. Its 37/37 focused and 262/262 complete checks, protected merge, all-file deployed-byte identity, Standard/Compact desktop journeys, and exact tick-3,715 passive completion passed before closure. Phase 7 now has a separate product-hardening implementation candidate that preserves those closed bytes while hardening semantic state, lifecycle suspension, fullscreen/orientation failure, focus, safe-area/reflow behavior, reduced motion, bounded long-match evidence, and cleanup. Its 19/19 focused and 281/281 complete source checks pass, including a bounded real-app VM lifecycle journey; publication, named rendered/browser/device evidence, unresolved product decisions, root promotion, and Phase 7 closure remain separate gates. Rooms, signaling, and networking transport remain absent. The selected future multiplayer direction remains a private two-player host/client room joined by a short code; GitHub Pages is only the static client host. The image above remains Phase 1A review evidence rather than a runtime screenshot. [`docs/STATUS.md`](docs/STATUS.md) owns exact source, deployment, evidence, and next-boundary state. The rejected prototype remains available at commit [`7f88655`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/commit/7f88655f10504f44496fbba2e17871b16a5fe115) in Git history; its retired `v2026.8.15` tag and GitHub Release must not be recreated.

## Replacement target

The first replacement release remains one original layered landscape battlefield, two factions, faction-specific headquarters, shared Resource Points and Production Outposts, production and rally commands, readable formation combat, and strategic AI. The local simulation is proved before multiplayer. The [approved Phase 1B review](concepts/phase1b/) defines the visual and interaction target; the closed [Phase 2](docs/PHASE2_FOUNDATION.md), [Phase 3](docs/PHASE3_ENTITY_MOVEMENT.md), [Phase 4](docs/PHASE4_STRUCTURES_ECONOMY.md), [Phase 5](docs/PHASE5_COMBAT_TACTICS.md), and [Phase 6](docs/PHASE6_STRATEGIC_AI.md) contracts own the deployed foundation; and the [frozen Phase 7 contract](docs/PHASE7_PRODUCT_HARDENING.md) owns the active implementation and release-evidence boundary.

## Preview the transition page locally

Open `index.html` in a modern browser for project status, `phase7/index.html` for the active product-hardening candidate, `phase6/index.html` for the approved Phase 6 Standard local skirmish, `phase5/index.html` for the approved combat foundation, `phase4/index.html` for the approved structures/economy foundation, `phase3/index.html` for the approved movement foundation, `phase2/index.html` for the approved landscape foundation, or `concepts/phase1b/index.html` for the approved script-free target. Node.js 20 or newer is used for the dependency-free source verification suite:

```sh
node tests/run.js
```

## Project documentation

- [Active redesign roadmap](docs/REDESIGN.md)
- [Phase 1A closure handoff](docs/PHASE1A_HANDOFF.md)
- [Approved Phase 1B visual and interaction lock](docs/PHASE1B_VISUAL_LOCK.md)
- [Closed Phase 2 landscape foundation](docs/PHASE2_FOUNDATION.md)
- [Closed Phase 3 entity and movement contract](docs/PHASE3_ENTITY_MOVEMENT.md)
- [Closed Phase 4 structures and economy contract](docs/PHASE4_STRUCTURES_ECONOMY.md)
- [Closed Phase 5 combat contract and evidence](docs/PHASE5_COMBAT_TACTICS.md)
- [Closed Phase 6 strategic AI and local-skirmish contract](docs/PHASE6_STRATEGIC_AI.md)
- [Active Phase 7 product-hardening contract and candidate boundary](docs/PHASE7_PRODUCT_HARDENING.md)
- [Approved production-art contract](docs/PRODUCTION_ART.md)
- [Current status](docs/STATUS.md)
- [Prototype-era game design](docs/GAME_DESIGN.md)
- [Prototype-era architecture](docs/ARCHITECTURE.md)
- [Multiplayer and netcode plan](docs/NETCODE.md)
- [Asset and visual-feasibility record](docs/ASSETS.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)

Directed and reviewed by **XenoVoyage**, with implementation support from **OpenAI Codex**. Released under the [MIT License](LICENSE).
