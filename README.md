<div align="center">

# Aeon of Kingdoms

**An original landscape real-time strategy game, being rebuilt one approved phase at a time.**

[![Source candidate v2026.8.15a](https://img.shields.io/badge/source_candidate-v2026.8.15a-6ef3ff)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-cbd5e1)](LICENSE)

> **Active redesign:** the product owner rejected the `v2026.8.15` prototype and approved the phased replacement plan. Its UI, art, map, controls, terminology, gameplay feel, and AI are not the baseline for future work.

## [Read the approved redesign roadmap](docs/REDESIGN.md)

</div>

The current working tree contains the `v2026.8.15a` transition candidate: a restrained status page, not redesigned gameplay. A source version does not prove that Pages, a tag, or a GitHub Release exists; publication is verified separately. The rejected prototype remains available through the published [historical release `v2026.8.15`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/releases/tag/v2026.8.15), its tag and Git history. Prototype-era source also remains temporarily in the working tree for historical regression evidence, but it is not referenced or included in the Pages payload.

## At a glance

| Detail | Current truth |
| --- | --- |
| Public source candidate | Interim redesign status page only; deployment verification is pending integration |
| Active work | Approved Phase 0 truth-and-cleanup transition |
| Replacement target | One original map, two factions, landscape camera play, three structure categories, production/rally, readable combat, and strategic AI |
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
- [Prototype-era asset record](docs/ASSETS.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)

Directed and reviewed by **XenoVoyage**, with implementation support from **OpenAI Codex**. Released under the [MIT License](LICENSE).
