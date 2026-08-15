# Project status

This is the current-state handoff. Active redesign phases and acceptance gates belong in [`REDESIGN.md`](REDESIGN.md). Enduring contributor rules remain in `AGENTS.md`, and published history remains in `CHANGELOG.md`, at the repository root; neither file is part of the minimal Pages payload.

## Current truth

| Area | Status |
| --- | --- |
| Canonical source version | `v2026.8.15a` in `VERSION.txt`; deployed status build, with no corresponding tag or GitHub Release claimed |
| Historical runtime | `v2026.8.15` was observed playable at commit `7f88655` on 2026-08-15, but the product owner rejected its UI, art, map, gameplay feel, terminology, and AI as the future direction |
| Active phase | Phase 0 — source and Pages publication complete; final owner/rendered/cache/device evidence pending |
| Redesign gameplay implementation | Not started |
| Current source boundary | Minimal redesign status page plus the approved roadmap/status documents; it contains no playable redesign |
| GitHub Pages | Status page deployed from merge commit `ede6f330181059e264c5e9a5b32eb72189164947`; main audit run `31909014413` and Pages run `31909014335` succeeded on 2026-08-15 |
| Multiplayer | Not shipped; remains a later phase after the local redesign is approved |
| Verification | 59/59 integrated checks passed; six public files returned `200` and matched merged source byte for byte; sampled rejected prototype paths returned `404`; rendered browser, old-cache migration, console, and physical-device evidence remains pending |

Do not describe the current Pages build or the transition page as redesigned gameplay. The recorded workflow and exact HTTPS observations establish this deployment only; they do not establish a tag, GitHub Release, rendered quality, physical-device result, or redesigned gameplay.

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

Draft Phase 1 menu, battlefield, faction, structure, combat, mobile-control, and production/rally concepts were generated and shown to the product owner during Phase 0. They are unapproved previews: they are not versioned shipping assets, do not close any Phase 1 checklist item, and are not evidence of implemented gameplay. No redesigned map, entity, building, movement, combat, AI, touch, or networking runtime evidence exists yet. The interim status page is a communication surface only. Each phase in [`REDESIGN.md`](REDESIGN.md) defines its own required source, automated, rendered, physical-device, and owner-approval evidence.

## Next gate

1. Open the deployed status page in a normal existing browser profile and verify the old prototype is replaced without a stale-cache loop.
2. Record rendered desktop and mobile readability, console cleanliness, link navigation, and rollback readiness without converting those observations into gameplay claims.
3. Close Phase 0 only after the repository, live site, and owner review tell the same truth.
4. Review the draft Phase 1 concept set, revise it where required, and record explicit approval or rejection; begin gameplay renderer work only after the complete visual gate is approved.
