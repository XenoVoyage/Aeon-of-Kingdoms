# Contributing to Aeon of Kingdoms

Aeon of Kingdoms is undergoing a gated redesign. Contributions must preserve the approved redesign contract and enduring deterministic, accessible, secure browser boundaries; they must not preserve the rejected prototype presentation or gameplay by default.

Phase 0's truth-and-cleanup product gate is complete. Public Pages remains the non-playable `v2026.8.20a` status, mood archive, and superseded Phase 1A proof. The production-art method in [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md) is approved, and the complete feature-branch Phase 1A candidate is assembled under [`concepts/feasibility/phase1a/`](concepts/feasibility/phase1a/). The corrected Aegis Titan is the remaining direct owner confirmation; the set remains unpublished and unmerged. Redesigned gameplay begins only after Phase 1A and the complete Phase 1B gate are explicitly approved.

## Before changing code

1. Read [`AGENTS.md`](AGENTS.md) in full; it is the canonical engineering and GitHub workflow contract.
2. Read [`docs/PHASE1A_HANDOFF.md`](docs/PHASE1A_HANDOFF.md) for the exact current candidate, remaining gate, rejected methods, and next boundary.
3. Read [`docs/REDESIGN.md`](docs/REDESIGN.md) for the active phase, requirements, unresolved decisions, and gate.
4. Read [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md) before changing visual art, animation, facing, atlases, masks, player color, structures, terrain, damage, or effects.
5. Read [`docs/STATUS.md`](docs/STATUS.md) for the implemented boundary and actual evidence.
6. Treat [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) as prototype-era records until their approved redesign phases replace them. [`docs/ASSETS.md`](docs/ASSETS.md) owns the active review-reference inventory and keeps the old asset record in a clearly marked archive. Use [`tests/README.md`](tests/README.md) for the active verification boundary.
7. Read [`docs/NETCODE.md`](docs/NETCODE.md) before changing determinism, commands, protocol, transport, lobby, or server behavior.

Inspect the connected source, tests, issues, pull requests, and recent changes. Ask before inventing a material design or infrastructure decision.

## Workflow

- Start from current `main` on a short-lived `agent/<description>` branch.
- Keep the change narrow and preserve unrelated work.
- Add deterministic regression coverage for rule or defect changes.
- Use no runtime or test dependency unless the change explicitly reviews and justifies it.
- Run focused checks while iterating, then `node tests/run.js` on the final candidate.
- Complete the applicable manual rows in [`tests/README.md`](tests/README.md) and label simulated, rendered, deployed, network, and physical-device observations separately.
- Run `git diff --check`, review the complete branch diff, and open a draft pull request with the repository template.

The transition page and concept gallery need no installation or build. Node.js 20 or newer is used only for local and continuous verification. A successful local check does not establish a Pages deployment or release.

## Product changes

Use `entity` as the authoritative replacement code term and keep internal categories separate from faction-facing names. Reuse the authoritative command and simulation path across human, AI, campaign, replay, and future remote players. Do not fork rules by mode or mutate state from presentation code.

When adding art, follow [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md) and update [`docs/ASSETS.md`](docs/ASSETS.md) with provenance, license, purpose, validation, and optimization details. When adding audio, record the same inventory details in `docs/ASSETS.md`. When changing player-visible behavior, update the changelog and every affected canonical document in the same change.
