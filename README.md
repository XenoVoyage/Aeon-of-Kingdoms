<div align="center">

# Aeon of Kingdoms

**An original landscape real-time strategy game, being rebuilt one approved phase at a time.**

[![Status build v2026.8.20](https://img.shields.io/badge/status_build-v2026.8.20-6ef3ff)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-cbd5e1)](LICENSE)

> **Active redesign:** the product owner rejected the `v2026.8.15` prototype and approved the phased replacement plan. Its UI, art, map, controls, terminology, gameplay feel, and AI are not the baseline for future work.

## [View the current redesign status](https://xenovoyage.github.io/Aeon-of-Kingdoms/)

[Review the eight Phase 1 mood references](https://xenovoyage.github.io/Aeon-of-Kingdoms/concepts/)

</div>

The deployed `v2026.8.20` status build reclassifies the eight published frames as mood references and records the approved Phase 1A production-feasibility brief. It was published from merge commit `919cc93`; the main audit and Pages workflows completed successfully, and both live entry routes plus all eight local images loaded in a cloud desktop browser without a page-origin warning or error. Neither surface is redesigned gameplay, a final art lock, physical-device proof, a tag, or a GitHub Release. The rejected prototype remains available through the published [historical release `v2026.8.15`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/releases/tag/v2026.8.15), its tag and Git history. Prototype-era source also remains temporarily in the working tree for historical regression evidence, but it is not referenced or included in the Pages payload.

## At a glance

| Detail | Current truth |
| --- | --- |
| Public Pages payload | Verified deployment: `v2026.8.20` non-playable status page and eight local mood references at merge commit `919cc93` |
| Current source | `v2026.8.20` truth update with the owner-approved Phase 1A feasibility brief; untagged and not a GitHub Release |
| Active work | Remaining Phase 0 evidence plus a production-scale Phase 1A visual proof; redesigned gameplay has not started |
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
