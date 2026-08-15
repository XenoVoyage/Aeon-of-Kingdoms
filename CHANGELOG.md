# Changelog

All notable player-facing changes to Aeon of Kingdoms are recorded here. Runtime labels use Calendar Versioning: `vYYYY.M.D`, followed by `a`, `b`, and so on for additional releases on the same date. `VERSION.txt` is the canonical current version; a changelog heading does not prove that a tag, GitHub Release, or deployment exists.

## [v2026.8.15a] — 2026-08-15 (deployed status build; untagged)

### Changed

- Replaced the current public-runtime source with a restrained redesign status page while the game is rebuilt.
- Removed the rejected prototype's gameplay instructions and presentation from the current public entry point.
- Recorded the owner-approved phased redesign contract in this candidate, including the landscape battlefield, entity terminology, three-structure model, production queues, rally commands, tactical combat, strategic AI, and later networking gates.

### Publication status

- Pull request `#1` merged as commit `ede6f330181059e264c5e9a5b32eb72189164947`; the main audit and Pages deployment both completed successfully.
- The six deployed public files were observed over HTTPS and matched the merged source byte for byte; rejected prototype runtime paths returned `404`.
- The owner supplied a real portrait mobile-browser capture showing the deployed status shell readable inside safe areas with no rejected gameplay visible on that load.
- No `v2026.8.15a` tag or GitHub Release is claimed. Landscape, desktop/tablet, link-navigation, pre-existing-cache, and console observations remain separate pending evidence.

## [v2026.8.15] — 2026-08-15

### Added

- Added the initial playable browser vertical slice with skirmish and campaign entry points, a capture-driven battlefield, faction recruitment, population limits, deterministic AI, and headquarters elimination.
- Added six faction-named roles for the Astral Concord and Gravebound Court on one shared internal role model.
- Added selectable 2-, 4-, and 6-faction skirmishes with Total Domination, Conquest, King of the Hill, and Domination rules on one shared battlefield.
- Added responsive pointer and touch presentation, procedural Canvas art, and the deep-space cyan and violet interface direction.
- Added dependency-free verification, an explicit Pages deployment allowlist, project documentation, and contribution and security policies.

### Planned, not included

- WebRTC host/client multiplayer, public matchmaking, dedicated server authority, additional factions and maps, campaign progression, and hands-on balance validation remain roadmap work.
