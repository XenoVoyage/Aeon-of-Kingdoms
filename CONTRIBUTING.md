# Contributing to Aeon of Kingdoms

Aeon of Kingdoms is undergoing a gated redesign. Contributions must preserve the approved redesign contract and enduring deterministic, accessible, secure browser boundaries; they must not preserve the rejected prototype presentation or gameplay by default.

Phase 1A through Phase 6 are approved and closed. Phase 7 product hardening has an exact frozen contract and a separate implementation candidate under audit; networking remains later work until its own phase. Read [`docs/STATUS.md`](docs/STATUS.md) for the exact current source, deployment, evidence, and Engineering Standard v1.0 adoption state rather than copying those volatile facts here.

## Before changing code

1. Read [`AGENTS.md`](AGENTS.md) in full; it is the canonical engineering and GitHub workflow contract.
2. Read [`docs/STATUS.md`](docs/STATUS.md) for the current boundary, evidence, and standard-adoption state.
3. Read [`docs/REDESIGN.md`](docs/REDESIGN.md) for the active phase sequence, requirements, unresolved decisions, and gates.
4. Read [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md) before changing visual art, animation, facing, atlases, masks, player color, structures, terrain, damage, or effects.
5. Read [`docs/PHASE1A_HANDOFF.md`](docs/PHASE1A_HANDOFF.md) when the approved Phase 1A package or rejected methods are relevant.
6. Read [`docs/PHASE1B_VISUAL_LOCK.md`](docs/PHASE1B_VISUAL_LOCK.md) before changing the approved menu/HUD, battlefield, opening identity contracts, landscape controls, viewport support, or runtime-art envelope.
7. Read [`docs/PHASE2_FOUNDATION.md`](docs/PHASE2_FOUNDATION.md) before changing the approved Phase 2 shell, camera, viewport/orientation behavior, map schema, terrain renderer, blockers, navigation debug view, or evidence record.
8. Read [`docs/PHASE3_ENTITY_MOVEMENT.md`](docs/PHASE3_ENTITY_MOVEMENT.md) before changing entities, selection, movement, navigation, formation, separation, replay, snapshots, checksums, runtime entity art, or the Phase 3 evidence record.
9. Read [`docs/PHASE4_STRUCTURES_ECONOMY.md`](docs/PHASE4_STRUCTURES_ECONOMY.md) before changing structures, capture, Resource, population, production, spawning, rally, or Phase 4 evidence.
10. Read [`docs/PHASE5_COMBAT_TACTICS.md`](docs/PHASE5_COMBAT_TACTICS.md) before changing combat commands, stances, targeting, range, leashes, projectiles, damage, defeat, structure destruction, headquarters outcome, combat presentation, or Phase 5 evidence.
11. Read [`docs/PHASE6_STRATEGIC_AI.md`](docs/PHASE6_STRATEGIC_AI.md) before changing computer observation, planning, task forces, local-skirmish orchestration, AI checkpoints, or Phase 6 evidence.
12. Read [`docs/PHASE7_PRODUCT_HARDENING.md`](docs/PHASE7_PRODUCT_HARDENING.md) before changing device, lifecycle, accessibility, performance, offline/cache, options, onboarding, audio, or release-readiness behavior.
13. Treat [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) as prototype-era records until their approved redesign replacements exist. [`docs/ASSETS.md`](docs/ASSETS.md) owns the active review-reference inventory and keeps the old asset record in a clearly marked archive. Use [`tests/README.md`](tests/README.md) for the active verification boundary.
14. Read [`docs/NETCODE.md`](docs/NETCODE.md) before changing determinism, commands, protocol, transport, lobby, or server behavior.

Inspect the connected source, tests, issues, pull requests, and recent changes. Ask before inventing a material design or infrastructure decision.

## Workflow

- Start from current `main` on a short-lived `agent/<description>` branch.
- Keep the change narrow and preserve unrelated work.
- Add deterministic regression coverage for rule or defect changes.
- Use no runtime or test dependency unless the change explicitly reviews and justifies it.
- Run focused checks while iterating, then `node tests/run.js` on the final candidate.
- Complete the applicable manual rows in [`tests/README.md`](tests/README.md) and label simulated, rendered, deployed, network, and physical-device observations separately.
- Run `git diff --check`, review the complete branch diff, and open a draft pull request with the repository template.

The transition page, concept reviews, approved Phase 2 through Phase 6 routes, and the separate Phase 7 candidate need no installation or runtime build. Node.js 20 or newer is used only for local and continuous verification and deterministic authoring checks. A successful local check does not establish rendered quality, a Pages deployment, phase approval, or a release.

## Product changes

Use `entity` as the authoritative replacement code term and keep internal categories separate from faction-facing names. Reuse the authoritative command and simulation path across human, AI, campaign, replay, and future remote players. Do not fork rules by mode or mutate state from presentation code.

When adding art, follow [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md) and update [`docs/ASSETS.md`](docs/ASSETS.md) with provenance, license, purpose, validation, and optimization details. When adding audio, record the same inventory details in `docs/ASSETS.md`. When changing player-visible behavior, update the changelog and every affected canonical document in the same change.
