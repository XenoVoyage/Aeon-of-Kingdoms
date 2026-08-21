<div align="center">

# Aeon of Kingdoms

**An original landscape real-time strategy game, being rebuilt one approved phase at a time.**

[![Status build v2026.8.21a](https://img.shields.io/badge/status_build-v2026.8.21a-6ef3ff)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-cbd5e1)](LICENSE)

> **Active redesign:** the product owner rejected the `v2026.8.15` prototype and approved the phased replacement plan. Its UI, art, map, controls, terminology, gameplay feel, and AI are not the baseline for future work.

## Phase 1B visual and interaction lock — planning active

[View the current redesign status](https://xenovoyage.github.io/Aeon-of-Kingdoms/) · [Inspect the approved Phase 1A review](https://xenovoyage.github.io/Aeon-of-Kingdoms/concepts/feasibility/) · [Read the Phase 1A closure handoff](docs/PHASE1A_HANDOFF.md)

</div>

[![Phase 1A desktop battlefield composition showing separate cartoon-leaning painted environment, structure, entity, and ownership layers.](concepts/feasibility/phase1a/review/battlefield-desktop.webp)](concepts/feasibility/phase1a/review/battlefield-desktop.webp)

The owner approved the production method in [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md): cartoon-leaning baked full-body sprites, canonical right-facing art with an exact X-mirrored left facing, one stable idle frame, four movement frames with invariant upper bodies and equipment, six-frame action and defeat sequences, and separate player-color masks for every player-controlled entity and ownable structure. On 2026-08-21 the owner also approved the corrected Aegis Titan and complete six-entity, three-structure-category, environment, damage, ownership, and viewport package, closing Phase 1A. The image above is a non-gameplay composition built from separate assets. Its optimized visual review is the authorized Pages publication candidate, while raw atlases, masks, structure masters, and metadata remain repository-only authoring evidence. Publication will not make the package gameplay, a tag, or a release. Phase 1B planning is active, but implementation has not started. [`docs/STATUS.md`](docs/STATUS.md) owns the exact current source, deployment, evidence, and next-boundary state. The rejected prototype remains available at commit [`7f88655`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/commit/7f88655f10504f44496fbba2e17871b16a5fe115) in Git history; the owner authorized retirement of its misleading public tag and GitHub Release, but deletion remains pending until verified.

## Replacement target

The first replacement release remains one original layered landscape battlefield, two factions, faction-specific headquarters, shared Resource Points and Production Outposts, production and rally commands, readable formation combat, and strategic AI. The local simulation is proved before multiplayer. Phase 1B must lock the complete visual and interaction target before any Phase 2 renderer work begins; the current work is planning, not gameplay implementation.

## Preview the transition page locally

Open `index.html` in a modern browser for project status, or inspect the files under `concepts/feasibility/phase1a/` directly. No new heavyweight review page is required. Node.js 20 or newer is used for the dependency-free source verification suite:

```sh
node tests/run.js
```

## Project documentation

- [Active redesign roadmap](docs/REDESIGN.md)
- [Phase 1A closure handoff](docs/PHASE1A_HANDOFF.md)
- [Approved production-art contract](docs/PRODUCTION_ART.md)
- [Current status](docs/STATUS.md)
- [Prototype-era game design](docs/GAME_DESIGN.md)
- [Prototype-era architecture](docs/ARCHITECTURE.md)
- [Multiplayer and netcode plan](docs/NETCODE.md)
- [Asset and visual-feasibility record](docs/ASSETS.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)

Directed and reviewed by **XenoVoyage**, with implementation support from **OpenAI Codex**. Released under the [MIT License](LICENSE).
