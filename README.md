<div align="center">

# Aeon of Kingdoms

**An original landscape real-time strategy game, being rebuilt one approved phase at a time.**

[![Status build v2026.8.21](https://img.shields.io/badge/status_build-v2026.8.21-6ef3ff)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-cbd5e1)](LICENSE)

> **Active redesign:** the product owner rejected the `v2026.8.15` prototype and approved the phased replacement plan. Its UI, art, map, controls, terminology, gameplay feel, and AI are not the baseline for future work.

## Phase 1A closing candidate — ready for review

[View the current redesign status](https://xenovoyage.github.io/Aeon-of-Kingdoms/) · [Inspect the direct Phase 1A package](concepts/feasibility/phase1a/) · [Read the cold-start handoff](docs/PHASE1A_HANDOFF.md)

</div>

[![Phase 1A desktop battlefield composition showing separate cartoon-leaning painted environment, structure, entity, and ownership layers.](concepts/feasibility/phase1a/review/battlefield-desktop.webp)](concepts/feasibility/phase1a/review/battlefield-desktop.webp)

The owner approved the production method in [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md): cartoon-leaning baked full-body sprites, canonical right-facing art with an exact X-mirrored left facing, one stable idle frame, four movement frames with invariant upper bodies and equipment, six-frame action and defeat sequences, and separate player-color masks for every player-controlled entity and ownable structure. The complete Phase 1A candidate applies that method to six opening representatives, the three structure categories, six player color-plus-symbol identities, and desktop/phone battlefield compositions. The last reported defect—Aegis Titan's inconsistent movement/action direction—has been rebuilt in the feature-branch candidate and awaits direct owner confirmation. The image above is a non-gameplay composition built from separate assets. Public Pages remains the deployed `v2026.8.20a` proof until a separately authorized publication step succeeds. No redesigned gameplay has begun, and no merge, complete Phase 1A approval, tag, or GitHub Release is claimed. The rejected prototype remains available through the published [historical release `v2026.8.15`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/releases/tag/v2026.8.15), its tag and Git history.

## At a glance

| Detail | Current truth |
| --- | --- |
| Public Pages payload | `v2026.8.20a` non-playable status, mood archive, and Phase 1A proof at merge commit `75ec47c`; untagged and not a GitHub Release |
| Current source | Unpublished, unmerged Phase 1A feature-branch candidate; six representative entity packages, four structure forms across three categories, environment, damage, ownership, and viewport proofs are complete |
| Active work | Direct owner confirmation of corrected Aegis Titan movement/action; redesigned gameplay has not started |
| Replacement target | One original layered map, two factions, landscape camera play, unique headquarters, shared Resource Points and Production Outposts, production/rally, readable combat, and strategic AI |
| Replacement runtime principle | Local HTML, CSS, JavaScript, and Canvas unless an approved phase proves another need |
| Multiplayer | Later phase after the redesigned local simulation is approved; not shipped |

## Preview the transition page locally

Open `index.html` in a modern browser for project status, or inspect the files under `concepts/feasibility/phase1a/` directly. No new heavyweight review page is required. Node.js 20 or newer is used for the dependency-free source verification suite:

```sh
node tests/run.js
```

## Project documentation

- [Active redesign roadmap](docs/REDESIGN.md)
- [Memoryless Phase 1A handoff](docs/PHASE1A_HANDOFF.md)
- [Approved production-art contract](docs/PRODUCTION_ART.md)
- [Current status](docs/STATUS.md)
- [Prototype-era game design](docs/GAME_DESIGN.md)
- [Prototype-era architecture](docs/ARCHITECTURE.md)
- [Multiplayer and netcode plan](docs/NETCODE.md)
- [Asset and visual-feasibility record](docs/ASSETS.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)

Directed and reviewed by **XenoVoyage**, with implementation support from **OpenAI Codex**. Released under the [MIT License](LICENSE).
