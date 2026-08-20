# Project status

This is the current-state handoff. Active redesign phases and acceptance gates belong in [`REDESIGN.md`](REDESIGN.md). Enduring contributor rules remain in `AGENTS.md`, and published history remains in `CHANGELOG.md`, at the repository root; neither file is part of the minimal Pages payload.

## Current truth

| Area | Status |
| --- | --- |
| Canonical source version | `v2026.8.20a` in `VERSION.txt`; deployed Phase 1A production-feasibility review build, untagged, unreleased, and owner-unapproved |
| Historical runtime | `v2026.8.15` was observed playable at commit `7f88655` on 2026-08-15, but the product owner rejected its UI, art, map, gameplay feel, terminology, and AI as the future direction |
| Active phase | Phase 1A production feasibility; publication is complete, while full proof-page rendered and physical-device review plus explicit owner approval remain open |
| Redesign gameplay implementation | Not started |
| Current source boundary | Minimal redesign status page, mood-reference archive, separate Phase 1A proof gallery, and approved roadmap/status documents; none contains a playable redesign |
| GitHub Pages | `v2026.8.20a` is deployed from merge commit `75ec47c2bca9ea325f5b9508c06d44f3eb1aff1c`; main audit run `32351430376` and Pages run `32351430306` completed successfully on 2026-08-20 |
| Multiplayer | Not shipped; remains a later phase after the local redesign is approved |
| Verification | The frozen `v2026.8.20a` source passes 68/68 integrated checks, including five Phase 1A-specific checks, and stages the exact 24-file Pages allowlist. All three SVGs were rasterized and visually inspected locally. The status entry, proof entry, proof stylesheet, and six proof images match merged live bytes; a 1363×936 cloud desktop load confirmed the current status and review route. Full proof-page rendered, cache-profile, responsive/keyboard, and physical-device observations remain pending. The historical gameplay suites remain historical evidence, not redesign acceptance |

Phase 0's product-truth gate is complete: the rejected runtime is historical, the public source is non-playable, and the owner authorized Phase 1A. Its remaining cache, responsive, keyboard, physical-device gallery, and rollback observations stay recorded as operational evidence debt. Do not describe the current Pages build or the transition page as redesigned gameplay. The recorded workflows and live browser observation establish this deployment and its loaded public resources. The owner-supplied capture establishes only the visible portrait mobile state described below; neither category establishes a tag, GitHub Release, responsive or keyboard quality, cache migration, physical-device gallery behavior, or redesigned gameplay.

## Approval record

On 2026-08-15, the product owner approved Phase 0 and authorized its implementation. That approval locks the phased process and permits the truth-and-cleanup transition; it does not approve Phase 1 visuals, later gameplay implementation, a tag, or publication without their own evidence and gates.

On 2026-08-20, the product owner reviewed the published concept set. The battlefield, faction contrast, combat language, and interface were accepted as mood direction. The literal entity detail and realism were rejected as the production target because they do not prove readability on compact screens, consistency across crowded battles, affordable animation, or a sustainable six-faction scope. The owner approved the smaller Phase 1A production-feasibility brief and authorized replacement references, but did not approve final art or gameplay implementation.

The deployed `v2026.8.20a` proof implements that brief as a review surface: one crowded battlefield, compact desktop and phone frames, two three-role faction lineups, the exact three structure categories, a six-layer map diagram, a four-family animation pose board, and non-color-only state cues. Source completeness and deployment are not owner approval. No full roster, shipping sprite, gameplay renderer, implementation phase, tag, or release is authorized by its existence.

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

The published menu, battlefield, faction, structure, combat, mobile-control, and production/rally frames remain available in the [mood-reference gallery](../concepts/). The separate [Phase 1A proof](../concepts/feasibility/) is the new owner-review candidate. Both are communication surfaces, not shipping assets, gameplay screenshots, or implementation evidence. Exact source or HTTPS bytes establish availability, not rendered quality, physical-device readability, interaction, game feel, or owner approval. No redesigned map, entity, structure, movement, combat, AI, touch, or networking runtime evidence exists yet.

### v2026.8.20 deployment observation

On 2026-08-20, protected pull request `#6` merged as `919cc933a4def3a6688208f3e5a2180cc4d4687e`. Main audit run `32347611623` and Pages run `32347611618` completed successfully. A cloud desktop browser then loaded the canonical status and `concepts/` routes, observed the `v2026.8.20` label and revised Phase 1 boundary, and loaded all eight local WebP references at their recorded natural dimensions. No warning or error from the Pages origin appeared in that session. Browser-extension diagnostics were excluded because they are not emitted by the site. This observation does not establish pixel-level visual approval, responsive or keyboard behavior, a pre-existing-cache upgrade, another browser/device, or a physical-device result.

### v2026.8.20a deployment observation

On 2026-08-20, protected pull request `#8` merged as `75ec47c2bca9ea325f5b9508c06d44f3eb1aff1c`. Main audit run `32351430376` and Pages run `32351430306` completed successfully. The canonical status route and `concepts/feasibility/` returned HTTP 200. SHA-256 checks confirmed that the live status entry, proof entry, proof stylesheet, three WebP targets, and three SVG diagrams match merged source byte for byte. A cloud desktop browser at 1363×936 loaded the `v2026.8.20a` status, Phase 0 complete state, Phase 1A in-review state, and direct proof route. The proof page's full rendered length, compact-phone layout, keyboard flow, page-origin console, stale-cache migration, and physical-device readability remain unobserved; exact bytes do not establish those qualities or owner approval.

### Owner-supplied portrait mobile observation

On 2026-08-15 the product owner supplied a 945×2048 portrait mobile-browser screenshot of the live `xenovoyage.github.io` status page. The capture visibly shows the Aeon of Kingdoms wordmark, redesign status, Phase 0 label, rebuilding statement, explanatory copy, and current-boundary section. The content is readable, remains inside the visible browser safe area, and does not show the rejected gameplay shell. The screenshot does not prove the unseen remainder of the page, link activation, landscape behavior, another device or viewport, console state, offline reopening, or migration from an existing prototype service-worker cache.

## Next gate

1. Review the deployed `v2026.8.20a` Phase 1A proof at practical desktop and phone-landscape scale without converting publication into visual approval.
2. Record explicit owner approval, revision, or rejection of the feasibility proof.
3. If Phase 1A is approved, build one measured representative production-atlas prototype and complete the Phase 1B visual and interaction lock; do not create gameplay renderer code before the complete Phase 1B gate is approved.
4. Complete the remaining transition cache, responsive/keyboard, physical-device gallery, and rollback observations in parallel without reopening the Phase 0 product decision or blocking visual review.
