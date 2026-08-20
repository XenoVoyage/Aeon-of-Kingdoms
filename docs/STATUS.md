# Project status

This is the current-state handoff. Active redesign phases and acceptance gates belong in [`REDESIGN.md`](REDESIGN.md). Enduring contributor rules remain in `AGENTS.md`, and published history remains in `CHANGELOG.md`, at the repository root; neither file is part of the minimal Pages payload.

## Current truth

| Area | Status |
| --- | --- |
| Canonical source version | `v2026.8.20` in `VERSION.txt`; deployed reviewed-reference and Phase 1A boundary update, with no tag or GitHub Release claimed |
| Historical runtime | `v2026.8.15` was observed playable at commit `7f88655` on 2026-08-15, but the product owner rejected its UI, art, map, gameplay feel, terminology, and AI as the future direction |
| Active phase | Phase 0 implementation evidence remains open; the Phase 1A production-feasibility brief is owner-approved for reference creation only, while the production visual target remains unapproved |
| Redesign gameplay implementation | Not started |
| Current source boundary | Minimal redesign status page, reviewed mood-reference gallery, and the approved roadmap/status documents; they contain no playable redesign |
| GitHub Pages | `v2026.8.20` is deployed from merge commit `919cc933a4def3a6688208f3e5a2180cc4d4687e`; main audit run `32347611623` and Pages run `32347611618` completed successfully on 2026-08-20 |
| Multiplayer | Not shipped; remains a later phase after the local redesign is approved |
| Verification | For `v2026.8.20`, 63/63 integrated checks passed and the 16-file allowlist is preserved. Both live routes, current boundary text, and all eight local images loaded in a cloud desktop browser with no page-origin warning or error. Exact-byte comparison, responsive/keyboard review, cache migration, and physical-device evidence remain pending |

Do not describe the current Pages build or the transition page as redesigned gameplay. The recorded workflows and live browser observation establish this deployment and its loaded public resources. The owner-supplied capture establishes only the visible portrait mobile state described below; neither category establishes a tag, GitHub Release, responsive or keyboard quality, cache migration, physical-device gallery behavior, or redesigned gameplay.

## Approval record

On 2026-08-15, the product owner approved Phase 0 and authorized its implementation. That approval locks the phased process and permits the truth-and-cleanup transition; it does not approve Phase 1 visuals, later gameplay implementation, a tag, or publication without their own evidence and gates.

On 2026-08-20, the product owner reviewed the published concept set. The battlefield, faction contrast, combat language, and interface were accepted as mood direction. The literal entity detail and realism were rejected as the production target because they do not prove readability on compact screens, consistency across crowded battles, affordable animation, or a sustainable six-faction scope. The owner approved the smaller Phase 1A production-feasibility brief and authorized replacement references, but did not approve final art or gameplay implementation.

## Owner-locked redesign requirements

- Original design made for Aeon of Kingdoms; Neon Voyage is only an example of restraint and simplicity.
- Landscape-only gameplay with pan, zoom, and a rotate-device gate in portrait.
- Illustrated map terrain with meaningful impassable mountains, cliffs, structures, and routes.
- `Entity` is the authoritative code term; faction-specific names remain player-facing.
- Exactly three structure categories: faction-unique headquarters, shared Resource Points, and shared Production Outposts.
- Stylized semi-realistic tactical miniatures with broad silhouettes and restrained detail, proven at actual desktop and phone gameplay scale before roster expansion.
- Data-driven map layers for ground, decoration, navigation/blockers, anchors, dynamic entities, and foreground occlusion; visual pixels never determine walkability.
- Four core authored animation families: idle, move, attack or cast, and defeat, with simulation-owned contact timing.
- Producing structures use authoritative queues, visible progress bars, spawn validation, and rally points.
- Combat supports explicit entity targeting and autonomous nearby engagement with readable states.
- Movement is slower, grouped, formation-aware, and non-stacking.
- AI plans production, defense, objectives, task forces, and attack timing rather than ordering one global pile.
- Human, AI, replay, campaign, and future networking share one deterministic command boundary.

## Evidence boundary

The published menu, battlefield, faction, structure, combat, mobile-control, and production/rally frames remain available in the [mood-reference gallery](../concepts/). They are useful composition references, not shipping assets or the Phase 1 production approval target. Exact HTTPS bytes establish publication, not rendered quality, browser interaction, or implementation. No redesigned map, entity, structure, movement, combat, AI, touch, or networking runtime evidence exists yet. The interim status page and gallery are communication surfaces only. Each phase in [`REDESIGN.md`](REDESIGN.md) defines its own source, automated, rendered, physical-device, and owner-approval evidence.

### v2026.8.20 deployment observation

On 2026-08-20, protected pull request `#6` merged as `919cc933a4def3a6688208f3e5a2180cc4d4687e`. Main audit run `32347611623` and Pages run `32347611618` completed successfully. A cloud desktop browser then loaded the canonical status and `concepts/` routes, observed the `v2026.8.20` label and revised Phase 1 boundary, and loaded all eight local WebP references at their recorded natural dimensions. No warning or error from the Pages origin appeared in that session. Browser-extension diagnostics were excluded because they are not emitted by the site. This observation does not establish pixel-level visual approval, responsive or keyboard behavior, a pre-existing-cache upgrade, another browser/device, or a physical-device result.

### Owner-supplied portrait mobile observation

On 2026-08-15 the product owner supplied a 945×2048 portrait mobile-browser screenshot of the live `xenovoyage.github.io` status page. The capture visibly shows the Aeon of Kingdoms wordmark, redesign status, Phase 0 label, rebuilding statement, explanatory copy, and current-boundary section. The content is readable, remains inside the visible browser safe area, and does not show the rejected gameplay shell. The screenshot does not prove the unseen remainder of the page, link activation, landscape behavior, another device or viewport, console state, offline reopening, or migration from an existing prototype service-worker cache.

## Next gate

1. Verify replacement of an existing prototype service-worker cache in a previously used browser profile without a stale-cache loop.
2. Record landscape and desktop/tablet readability, console cleanliness, link navigation, and rollback readiness without converting those observations into gameplay claims.
3. Close Phase 0 only after the repository, live site, and owner review tell the same truth.
4. Produce the Phase 1A proof at actual desktop and phone scale: two factions with three representative roles each, the exact three structures, the layered map contract, four core animation families, and non-color-only ownership/readability cues.
5. Record explicit owner approval or revision of that feasibility proof; do not create gameplay renderer code until the complete Phase 1B visual gate is approved.
