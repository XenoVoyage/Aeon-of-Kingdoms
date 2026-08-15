# Project status

This is the current-state handoff. It records maturity, evidence, and active limits; enduring engineering rules belong in [`AGENTS.md`](../AGENTS.md), player intent in [`GAME_DESIGN.md`](GAME_DESIGN.md), and history in [`CHANGELOG.md`](../CHANGELOG.md).

## Current state

| Area | Status |
| --- | --- |
| Runtime | Integrated, automated-test-clean local vertical-slice candidate |
| Canonical version | `v2026.8.15` in `VERSION.txt` |
| Hosting | Direct `file://` and GitHub Pages repository-subpath targets |
| Installable shell | Local manifest, icons, and exact-allowlist service worker are present; installed/offline browser evidence is pending |
| Runtime dependencies | None; no build step |
| Content | Aeon Convergence, two six-role factions, deterministic AI, local skirmish, and the authored **First Light** campaign setup |
| Player layouts | Source and setup UI target 2, 4, and 6 local factions; mirrored seats and equal nearest-site opening distances are regression-tested, while hands-on balance remains pending |
| Multiplayer | Planned architecture only; no WebRTC, signaling, relay, matchmaking, or dedicated server is shipped |
| Verification | Frozen dependency-free suite passes 56/56 on Node.js 24.19.0; rendered-browser, deployment, and physical-device evidence remain separate gates |

The repository is a first vertical slice, not a production-complete RTS. It demonstrates the intended control/economy/combat loop and establishes the boundaries for later factions, maps, modes, campaign content, and multiplayer.

## Candidate scope

- A local start flow exposes skirmish and the single authored **First Light** campaign preset. Campaign is currently a scenario configuration, not a narrative progression or saved mission system.
- Players select and command squads, capture Aether and recruitment sites, recruit under a population cap, fight deterministic computer factions, and pursue headquarters or configured objective victory.
- The map/setup model arranges 2-, 4-, and 6-faction matches with mirrored opposite seats, distance-matched nearest Aether Well and Relay Forge access, and obstacle-clear opening lanes. These geometry invariants are not evidence that every composition, team shape, full route, or device has been balanced.
- Astral Concord and Gravebound Court each define all six shared roles with faction-specific names. Balance evidence for the full twelve-unit roster remains pending.
- Canvas presentation, semantic HUD, desktop controls, and touch-oriented interaction are present as source targets. Real browser and physical-device acceptance remain separate gates.
- GitHub Actions audits source and deploys only the explicit static runtime allowlist after `main` updates.

## Evidence boundary

| Evidence category | Current record |
| --- | --- |
| Source inspection | Integrated runtime, ownership documents, PWA shell, and explicit Pages allowlist reviewed on 2026-08-15 |
| Automated Node checks | 56/56 passed with Node.js 24.19.0 on 2026-08-15; `git diff --check` clean |
| Simulated browser delivery | Passed repository-subpath delivery of all 18 staged runtime files on 2026-08-15 |
| Rendered local browser play | Not yet recorded |
| Deployed GitHub Pages play | Not yet recorded |
| Physical phone/tablet | Not yet recorded |
| 2/4/6-player balance | Not yet recorded |
| Cross-network multiplayer | Not applicable; feature is not shipped |

Update this table only with observed evidence. A passing static audit does not prove rendered layout, game feel, difficulty, thermals, input comfort, or a successful deployment.

## Known limits

- Only one battlefield and two opening factions are in scope.
- First Light is one preset local scenario; there is no mission sequence, narrative persistence, or campaign save.
- Alternate objective modes and 4–6-player setups need hands-on balance and edge-case review; equal opening-site geometry does not prove whole-match parity.
- Deterministic regressions cover simultaneous combat, large footprints, living-structure exclusion, and a 48-attacker multi-ring approach; hands-on visual judgment under long dense matches remains pending.
- No online rooms, join codes, reconnection, host migration, chat, spectators, matchmaking, accounts, cloud saves, or dedicated authority exist.
- Generated concept art is not shipped as gameplay. The README deliberately waits for a real verified capture.

## Next task boundary

Perform a real desktop playthrough of skirmish and First Light, inspect representative compact touch layouts, deploy through Pages, and replace the README capture placeholder only with a real gameplay image from the verified renderer. Keep physical phone/tablet acceptance and longer 2/4/6-player balance passes explicitly separate.
