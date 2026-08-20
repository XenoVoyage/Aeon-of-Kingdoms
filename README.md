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

The `v2026.8.20` source candidate reclassifies the eight published frames as mood references and records the approved Phase 1A production-feasibility brief; it is not yet claimed as deployed. The last verified Pages deployment remains `v2026.8.16`, whose exact 16-file payload and both directory entry routes matched source. Neither surface is redesigned gameplay, and no new tag or GitHub Release is claimed. The rejected prototype remains available through the published [historical release `v2026.8.15`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/releases/tag/v2026.8.15), its tag and Git history. Prototype-era source also remains temporarily in the working tree for historical regression evidence, but it is not referenced or included in the Pages payload.

## At a glance

| Detail | Current truth |
| --- | --- |
| Public Pages payload | Last verified deployment: `v2026.8.16` interim status page and eight local references at merge commit `27895cc`; neither is redesigned gameplay |
| Current source candidate | `v2026.8.20` truth update: mood-reference classification and the owner-approved Phase 1A feasibility brief; deployment pending |
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
