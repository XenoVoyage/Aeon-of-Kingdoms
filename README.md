<div align="center">

# Aeon of Kingdoms

**An original landscape real-time strategy game, being rebuilt one approved phase at a time.**

[![Status build v2026.8.16](https://img.shields.io/badge/status_build-v2026.8.16-6ef3ff)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Aeon-of-Kingdoms/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-cbd5e1)](LICENSE)

> **Active redesign:** the product owner rejected the `v2026.8.15` prototype and approved the phased replacement plan. Its UI, art, map, controls, terminology, gameplay feel, and AI are not the baseline for future work.

## [View the current redesign status](https://xenovoyage.github.io/Aeon-of-Kingdoms/)

[Review the eight unapproved Phase 1 draft concepts](https://xenovoyage.github.io/Aeon-of-Kingdoms/concepts/)

</div>

The deployed `v2026.8.16` transition includes the restrained status page and an unapproved concept-review gallery; neither surface is redesigned gameplay. Its exact 16-file Pages payload and both directory entry routes were verified after deployment; no new tag or GitHub Release is claimed. The rejected prototype remains available through the published [historical release `v2026.8.15`](https://github.com/XenoVoyage/Aeon-of-Kingdoms/releases/tag/v2026.8.15), its tag and Git history. Prototype-era source also remains temporarily in the working tree for historical regression evidence, but it is not referenced or included in the Pages payload.

## At a glance

| Detail | Current truth |
| --- | --- |
| Public Pages payload | Deployed interim status page plus an unapproved review-only concept gallery at merge commit `27895cc`; neither is redesigned gameplay |
| Active work | Phase 0 publication review and an unapproved Phase 1 concept review; redesigned gameplay has not started |
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
