<div align="center">

# Aeon of Kingdoms

**An original landscape real-time strategy game, being rebuilt one approved phase at a time.**

[![Status build v2026.8.21b](https://img.shields.io/badge/status_build-v2026.8.21b-6ef3ff)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-cbd5e1)](LICENSE)

> **Active redesign:** the product owner rejected the `v2026.8.15` prototype and approved the phased replacement plan. Its UI, art, map, controls, terminology, gameplay feel, and AI are not the baseline for future work.

## Phase 1B visual and interaction lock — candidate ready

[Review the Phase 1B candidate](https://xenovoyage.github.io/Aeon-of-Kingdoms/concepts/phase1b/) · [Inspect the approved Phase 1A review](https://xenovoyage.github.io/Aeon-of-Kingdoms/concepts/feasibility/) · [Read the exact Phase 1B specification](docs/PHASE1B_VISUAL_LOCK.md)

</div>

[![Phase 1A desktop battlefield composition showing separate cartoon-leaning painted environment, structure, entity, and ownership layers.](concepts/feasibility/phase1a/review/battlefield-desktop.webp)](concepts/feasibility/phase1a/review/battlefield-desktop.webp)

The owner approved the production method in [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md): cartoon-leaning baked full-body sprites, canonical right-facing art with an exact X-mirrored left facing, one stable idle frame, four movement frames with invariant upper bodies and equipment, six-frame action and defeat sequences, and separate player-color masks for every player-controlled entity and ownable structure. On 2026-08-21 the owner also approved the corrected Aegis Titan and complete six-entity, three-structure-category, environment, damage, ownership, and viewport package, closing Phase 1A. The image above is a non-gameplay composition built from separate assets. Its optimized visual review is published on Pages, while raw atlases, masks, structure masters, and metadata remain repository-only authoring evidence. The non-playable Phase 1B candidate now assembles the retained menu, map-dominant HUD, complete twelve-identity contract, landscape controls, viewport matrix, and measured two-tier runtime-art envelope for explicit owner review. Publication does not make either package gameplay, a tag, or a release, and Phase 2 remains blocked until the complete Phase 1B target is approved. [`docs/STATUS.md`](docs/STATUS.md) owns the exact current source, deployment, evidence, and next-boundary state. The rejected prototype remains available at commit [`7f88655`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/commit/7f88655f10504f44496fbba2e17871b16a5fe115) in Git history; its misleading `v2026.8.15` tag and GitHub Release were retired without rewriting history, and that label must not be reused.

## Replacement target

The first replacement release remains one original layered landscape battlefield, two factions, faction-specific headquarters, shared Resource Points and Production Outposts, production and rally commands, readable formation combat, and strategic AI. The local simulation is proved before multiplayer. The [Phase 1B review candidate](concepts/phase1b/) defines the complete visual and interaction target; explicit owner approval remains the gate before any Phase 2 renderer work begins.

## Preview the transition page locally

Open `index.html` in a modern browser for project status, `concepts/phase1b/index.html` for the script-free static candidate, or the files under `concepts/feasibility/phase1a/` for approved masters. Node.js 20 or newer is used for the dependency-free source verification suite:

```sh
node tests/run.js
```

## Project documentation

- [Active redesign roadmap](docs/REDESIGN.md)
- [Phase 1A closure handoff](docs/PHASE1A_HANDOFF.md)
- [Phase 1B visual-lock candidate](docs/PHASE1B_VISUAL_LOCK.md)
- [Approved production-art contract](docs/PRODUCTION_ART.md)
- [Current status](docs/STATUS.md)
- [Prototype-era game design](docs/GAME_DESIGN.md)
- [Prototype-era architecture](docs/ARCHITECTURE.md)
- [Multiplayer and netcode plan](docs/NETCODE.md)
- [Asset and visual-feasibility record](docs/ASSETS.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)

Directed and reviewed by **XenoVoyage**, with implementation support from **OpenAI Codex**. Released under the [MIT License](LICENSE).
