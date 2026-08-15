# Contributing to Aeon of Kingdoms

Aeon of Kingdoms welcomes focused improvements that preserve its deterministic, dependency-free browser runtime and clear strategy-game presentation.

## Before changing code

1. Read [`AGENTS.md`](AGENTS.md) in full; it is the canonical engineering and GitHub workflow contract.
2. Read [`docs/STATUS.md`](docs/STATUS.md) for the implemented boundary and actual evidence.
3. Use [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) for product intent and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for ownership.
4. Read [`tests/README.md`](tests/README.md) before selecting verification.
5. Read [`docs/NETCODE.md`](docs/NETCODE.md) before changing determinism, commands, protocol, transport, lobby, or server behavior.

Inspect the connected source, tests, issues, pull requests, and recent changes. Ask before inventing a material design or infrastructure decision.

## Workflow

- Start from current `main` on a short-lived `agent/<description>` branch.
- Keep the change narrow and preserve unrelated work.
- Add deterministic regression coverage for rule or defect changes.
- Use no runtime or test dependency unless the change explicitly reviews and justifies it.
- Run focused checks while iterating, then `node tests/run.js` on the final candidate.
- Complete the applicable manual rows in [`tests/README.md`](tests/README.md) and label simulated, rendered, deployed, network, and physical-device observations separately.
- Run `git diff --check`, review the complete branch diff, and open a draft pull request with the repository template.

The game itself needs no installation or build. Node.js 20 or newer is used only for local and continuous verification.

## Product changes

Keep stable internal role identifiers separate from faction-facing names. Reuse the authoritative command and simulation path across human, AI, campaign, replay, and future remote players. Do not fork rules by mode or mutate state from presentation code.

When adding art or audio, update [`docs/ASSETS.md`](docs/ASSETS.md) with provenance, license, purpose, and optimization details. When changing player-visible behavior, update the changelog and every affected canonical document in the same change.
