# Project status

This is the current-state handoff. Active redesign phases and acceptance gates belong in [`REDESIGN.md`](REDESIGN.md). Enduring contributor rules remain in `AGENTS.md`, and published history remains in `CHANGELOG.md`, at the repository root; neither file is part of the minimal Pages payload.

## Current truth

| Area | Status |
| --- | --- |
| Canonical source version | `v2026.8.16` in `VERSION.txt`; concept-gallery source candidate, with no deployment, tag, or GitHub Release claimed by this change alone |
| Historical runtime | `v2026.8.15` was observed playable at commit `7f88655` on 2026-08-15, but the product owner rejected its UI, art, map, gameplay feel, terminology, and AI as the future direction |
| Active phase | Phase 0 — the status-only deployment is verified; final owner/landscape/cache/console evidence remains pending; `v2026.8.16` makes unapproved Phase 1 drafts reviewable in source |
| Redesign gameplay implementation | Not started |
| Current source boundary | Minimal redesign status page, review-only concept gallery, and the approved roadmap/status documents; they contain no playable redesign |
| GitHub Pages | Status page deployed from merge commit `ede6f330181059e264c5e9a5b32eb72189164947`; main audit run `31909014413` and Pages run `31909014335` succeeded on 2026-08-15 |
| Multiplayer | Not shipped; remains a later phase after the local redesign is approved |
| Candidate source verification | 63/63 integrated checks passed; the stage contains 16 explicit files plus generated `.nojekyll`; gallery rendering, deployment, navigation, and live bytes remain pending |
| Last verified deployment | For `v2026.8.15a`, six public files returned `200` and matched merged source byte for byte; sampled rejected prototype paths returned `404`; one owner-supplied portrait mobile render is recorded; landscape, desktop/tablet, old-cache migration, navigation, and console evidence remains pending |

Do not describe the current Pages build or the transition page as redesigned gameplay. The recorded workflow and exact HTTPS observations establish this deployment. The owner-supplied capture establishes only the visible portrait mobile state described below; neither category establishes a tag, GitHub Release, other viewport/device behavior, cache migration, console cleanliness, or redesigned gameplay.

## Approval record

On 2026-08-15, the product owner approved Phase 0 and authorized its implementation. That approval locks the phased process and permits the truth-and-cleanup transition; it does not approve Phase 1 visuals, later gameplay implementation, a tag, or publication without their own evidence and gates.

## Owner-locked redesign requirements

- Original design made for Aeon of Kingdoms; Neon Voyage is only an example of restraint and simplicity.
- Landscape-only gameplay with pan, zoom, and a rotate-device gate in portrait.
- Illustrated map terrain with meaningful impassable mountains, cliffs, structures, and routes.
- `Entity` is the authoritative code term; faction-specific names remain player-facing.
- Exactly three structure categories: faction headquarters, checkpoint, and recruitment structure.
- Producing structures use authoritative queues, visible progress bars, spawn validation, and rally points.
- Combat supports explicit entity targeting and autonomous nearby engagement with readable states.
- Movement is slower, grouped, formation-aware, and non-stacking.
- AI plans production, defense, objectives, task forces, and attack timing rather than ordering one global pile.
- Human, AI, replay, campaign, and future networking share one deterministic command boundary.

## Evidence boundary

Draft Phase 1 menu, battlefield, faction, structure, combat, mobile-control, and production/rally concepts are versioned in the `v2026.8.16` source candidate for a [review-only concept gallery](../concepts/). They remain unapproved: they are not shipping game assets, do not close any Phase 1 checklist item, and are not evidence of implemented gameplay. Gallery rendering and publication have not yet been observed. No redesigned map, entity, building, movement, combat, AI, touch, or networking runtime evidence exists yet. The interim status page and gallery are communication surfaces only. Each phase in [`REDESIGN.md`](REDESIGN.md) defines its own required source, automated, rendered, physical-device, and owner-approval evidence.

### Owner-supplied portrait mobile observation

On 2026-08-15 the product owner supplied a 945×2048 portrait mobile-browser screenshot of the live `xenovoyage.github.io` status page. The capture visibly shows the Aeon of Kingdoms wordmark, redesign status, Phase 0 label, rebuilding statement, explanatory copy, and current-boundary section. The content is readable, remains inside the visible browser safe area, and does not show the rejected gameplay shell. The screenshot does not prove the unseen remainder of the page, link activation, landscape behavior, another device or viewport, console state, offline reopening, or migration from an existing prototype service-worker cache.

## Next gate

1. Verify replacement of an existing prototype service-worker cache in a previously used browser profile without a stale-cache loop.
2. Record landscape and desktop/tablet readability, console cleanliness, link navigation, and rollback readiness without converting those observations into gameplay claims.
3. Close Phase 0 only after the repository, live site, and owner review tell the same truth.
4. Review the [draft Phase 1 concept set](../concepts/), revise it where required, and record explicit approval or rejection; begin gameplay renderer work only after the complete visual gate is approved.
