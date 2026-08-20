<div align="center">

# Aeon of Kingdoms

**An original landscape real-time strategy game, being rebuilt one approved phase at a time.**

[![Status build v2026.8.20a](https://img.shields.io/badge/status_build-v2026.8.20a-6ef3ff)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-cbd5e1)](LICENSE)

> **Active redesign:** the product owner rejected the `v2026.8.15` prototype and approved the phased replacement plan. Its UI, art, map, controls, terminology, gameplay feel, and AI are not the baseline for future work.

## [Review the Phase 1A production-feasibility proof](https://xenovoyage.github.io/Aeon-of-Kingdoms/concepts/feasibility/)

[View the current redesign status](https://xenovoyage.github.io/Aeon-of-Kingdoms/) · [Compare the mood-reference archive](https://xenovoyage.github.io/Aeon-of-Kingdoms/concepts/)

</div>

[![Phase 1A crowded battlefield target with small spaced armies, hard terrain blockers, two headquarters, a Resource Point, and a Production Outpost.](concepts/feasibility/images/battlefield-scale.webp)](concepts/feasibility/)

The source-verified `v2026.8.20a` candidate adds a separate, explicitly unapproved Phase 1A proof at practical RTS scale: one crowded battlefield, two three-role faction lineups, the exact three structure categories, a six-layer map diagram, and a four-family animation pose board. The painting above is a visual target, not an in-game screenshot. Its 68/68 integrated checks and exact 24-file Pages stage pass locally; publication and owner review remain separate. The last verified Pages deployment is still the non-playable `v2026.8.20` status and mood-reference build from merge commit `919cc93`. No redesigned gameplay, final art lock, physical-device proof, tag, or GitHub Release is claimed. The rejected prototype remains available through the published [historical release `v2026.8.15`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/releases/tag/v2026.8.15), its tag and Git history.

## At a glance

| Detail | Current truth |
| --- | --- |
| Public Pages payload | Last verified deployment: `v2026.8.20` non-playable status page and eight local mood references at merge commit `919cc93` |
| Current source candidate | Source-verified `v2026.8.20a` adds the unapproved Phase 1A proof; deployment pending, untagged, and not a GitHub Release |
| Active work | Publish and review the Phase 1A production method; redesigned gameplay has not started |
| Replacement target | One original layered map, two factions, landscape camera play, unique headquarters, shared Resource Points and Production Outposts, production/rally, readable combat, and strategic AI |
| Replacement runtime principle | Local HTML, CSS, JavaScript, and Canvas unless an approved phase proves another need |
| Multiplayer | Later phase after the redesigned local simulation is approved; not shipped |

## Preview the transition page locally

Open `index.html` in a modern browser. It intentionally provides redesign status and documentation links only. Node.js 20 or newer is used for the dependency-free source verification suite:

```sh
node tests/run.js
```

## Project documentation

- [Active redesign roadmap](docs/REDESIGN.md)
- [Current status](docs/STATUS.md)
- [Prototype-era game design](docs/GAME_DESIGN.md)
- [Prototype-era architecture](docs/ARCHITECTURE.md)
- [Multiplayer and netcode plan](docs/NETCODE.md)
- [Asset and visual-feasibility record](docs/ASSETS.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)

Directed and reviewed by **XenoVoyage**, with implementation support from **OpenAI Codex**. Released under the [MIT License](LICENSE).
