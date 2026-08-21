# Project status

This is the current-state handoff and the sole owner of the current phase, evidence, deployment, and engineering-standard adoption state. Active redesign phases and acceptance gates belong in [`REDESIGN.md`](REDESIGN.md). Enduring contributor rules remain in `AGENTS.md`, and published history remains in `CHANGELOG.md`, at the repository root; neither file is part of the minimal Pages payload.

## Current truth

| Area | Status |
| --- | --- |
| Canonical source version | `v2026.8.21` in `VERSION.txt`; owner-approved Phase 1A feature-branch package, still unpublished, unmerged, untagged, and unreleased |
| Historical runtime | `v2026.8.15` was observed playable at commit `7f88655` on 2026-08-15, but the product owner rejected its UI, art, map, gameplay feel, terminology, and AI as the future direction |
| Active phase | Engineering Standard v1.0 adoption checkpoint after Phase 1A closure; Phase 1B is the next product boundary and has not started |
| Redesign gameplay implementation | Not started |
| Current source boundary | Minimal redesign status page, mood-reference archive, superseded v5 proof record, approved production-art contract, and the approved direct-file Phase 1A package; none contains a playable redesign |
| GitHub Pages | `v2026.8.20a` is deployed from merge commit `75ec47c2bca9ea325f5b9508c06d44f3eb1aff1c`; main audit run `32351430376` and Pages run `32351430306` completed successfully on 2026-08-20 |
| Multiplayer | Not shipped; remains a later phase after the local redesign is approved |
| Engineering standard | v1.0 is `adopting`; repository structure, dependencies, security, assets, delivery, documentation ownership, GitHub state, and dead files were audited, but unavailable or separate rendered/manual/platform evidence prevents a `verified` claim |
| Verification | The pre-standardization baseline and final post-change working tree each pass 72/72 integrated checks. The focused Phase 1A asset suite passes 4/4, Pages staging verifies the exact 31-file allowlist plus `.nojekyll`, and `git diff --check` passes on Node.js 24.19.0. Automation proves source and data boundaries, not rendered quality, physical-device behavior, publication, or gameplay; the documented Node.js 20 floor was not reproduced locally |

Phase 0's product-truth gate is complete: the rejected runtime is historical, the public source is non-playable, and the owner authorized Phase 1A. Its remaining cache, responsive, keyboard, physical-device gallery, and rollback observations stay recorded as operational evidence debt. Do not describe the current Pages build or the transition page as redesigned gameplay. The recorded workflows and live browser observation establish this deployment and its loaded public resources. The owner-supplied capture establishes only the visible portrait mobile state described below; neither category establishes a tag, GitHub Release, responsive or keyboard quality, cache migration, physical-device gallery behavior, or redesigned gameplay.

## Approval record

On 2026-08-15, the product owner approved Phase 0 and authorized its implementation. That approval locks the phased process and permits the truth-and-cleanup transition; it does not approve Phase 1 visuals, later gameplay implementation, a tag, or publication without their own evidence and gates.

On 2026-08-20, the product owner reviewed the published concept set. The battlefield, faction contrast, combat language, and interface were accepted as mood direction. The literal entity detail and realism were rejected as the production target because they do not prove readability on compact screens, consistency across crowded battles, affordable animation, or a sustainable six-faction scope. The owner approved the smaller Phase 1A production-feasibility brief and authorized replacement references, but did not approve final art or gameplay implementation.

The deployed `v2026.8.20a` proof implements that brief as a review surface: one crowded battlefield, compact desktop and phone frames, two three-role faction lineups, the exact three structure categories, a six-layer map diagram, a four-family animation pose board, and non-color-only state cues. Source completeness and deployment are not owner approval. No full roster, shipping sprite, gameplay renderer, implementation phase, tag, or release is authorized by its existence.

The owner then rejected that proof as an approval surface because it mixed detailed painted targets with geometric structure, map, and animation diagrams, leaving the intended visible game unclear. The owner authorized a direct replacement that moves further toward cartoon-leaning painted 2D, shows one coherent battlefield/entity/structure language, simplifies representative entities, and proves a practical animation method.

During review of the local replacement, the owner identified misassembled limbs, an incorrect bone overlay, unclear attack direction, undersized weapons, and unstable idle/movement roots. The owner accepted the environment-only battlefield, three structures, damage progression, and player-color boundary. After further correction, the owner approved the production method recorded in [`PRODUCTION_ART.md`](PRODUCTION_ART.md): coherent baked full-body frames; canonical right-facing art and an exact X-mirrored left facing; one stable idle frame; four movement frames whose upper body and equipment remain invariant; six-frame action and defeat sequences; and separate frame-aligned player-color masks. The Astral Guardian established this method.

On 2026-08-21 the same method was applied to the Gravebound Reaver, Starbow, Hollow String, Aegis Titan, and Ossuary Colossus. The complete direct package includes six atlases and masks, actual-scale state playback, neutral shared structures and faction headquarters with bounded ownership masks, six player colors plus six symbols, the accepted damage progression, and separate desktop/phone battlefield compositions. The owner first found the set ready except that Aegis Titan's body direction disagreed with its gait and punch. The feature-branch candidate replaced those two states with coherent canonical-right art and exact mirrored-left playback. After directly reviewing the corrected Aegis Titan and integrated set, the owner approved both on 2026-08-21. Phase 1A is therefore closed as a non-playable production-feasibility and visual-direction proof. That approval does not authorize publication, merge, gameplay implementation, Phase 2, a tag, or a release.

## Engineering Standard v1.0 adoption

The existing-project cleanup standard supplied by the owner governs this repository. The companion new-project standard was used as a compatible baseline, not copied into the repository as a competing instruction source.

| Disposition | Evidence |
| --- | --- |
| Completed in this pass | Added the exact standard markers; consolidated instruction and status ownership; recorded exact run, test, staging, and diff commands plus definition of done; audited tracked files, dependencies, secrets, local/external resources, CSP, service worker, Actions, Pages staging, assets, provenance, licenses, branch/PR/issue state, and repository settings visible through GitHub; removed six proven-dead feasibility assets totaling 639,220 bytes; updated the pull-request template and consistency tests |
| Deferred or unavailable | Reproduce the suite on the documented Node.js 20 floor; render and interact with the changed status surface in supported browsers; physical-device, keyboard, responsive, reduced-motion, stale-cache, rollback, and deployed verification; verify protection/ruleset settings that the GitHub connection could not expose; preserve exact image-authoring tool versions/exporter masters when Phase 1B selects the runtime art pipeline |
| Not applicable now | Package installation, dependency lockfile and dependency advisory scan because the repository has zero runtime/test packages; account, payment, analytics, telemetry, server, database, personal-data migration, and scientific/data-reproducibility gates because none exists in the active static source boundary |

The rejected prototype source remains intentionally preserved for historical regression coverage in this pass. Removing that larger archive is a separate consequential cleanup, not a hidden part of standard adoption.

## Owner-locked redesign requirements

- Original design made for Aeon of Kingdoms; Neon Voyage is only an example of restraint and simplicity.
- Landscape-only gameplay with pan, zoom, and a rotate-device gate in portrait.
- Illustrated map terrain with meaningful impassable mountains, cliffs, structures, and routes.
- `Entity` is the authoritative code term; faction-specific names remain player-facing.
- Exactly three structure categories: faction-unique headquarters, shared Resource Points, and shared Production Outposts.
- Cartoon-leaning painted 2D tactical miniatures with broad silhouettes and restrained detail, proven at actual desktop and phone gameplay scale before roster expansion.
- Data-driven map layers for ground, decoration, navigation/blockers, anchors, dynamic entities, and foreground occlusion; visual pixels never determine walkability.
- Four authored animation families under [`PRODUCTION_ART.md`](PRODUCTION_ART.md): one-frame idle, four-frame lower-body gait, six-frame attack/cast, and six-frame defeat; canonical right facing, exact X-mirrored left facing, shared root, and simulation-owned contact timing.
- Separate frame-aligned player-color masks on all player-controlled entities and ownable structures, with color plus non-color ownership cues for up to six players.
- Producing structures use authoritative queues, visible progress bars, spawn validation, and rally points.
- Combat supports explicit entity targeting and autonomous nearby engagement with readable states.
- Movement is slower, grouped, formation-aware, and non-stacking.
- AI plans production, defense, objectives, task forces, and attack timing rather than ordering one global pile.
- Human, AI, replay, campaign, and future networking share one deterministic command boundary.

## Evidence boundary

The published menu, battlefield, faction, structure, combat, mobile-control, and production/rally frames remain available in the [mood-reference gallery](../concepts/). The deployed [Phase 1A proof](../concepts/feasibility/) is now a superseded review record, not the approved production method. The current method is defined in [`PRODUCTION_ART.md`](PRODUCTION_ART.md), and the approved but unpublished review package is stored at `concepts/feasibility/phase1a/` with its own `README.md` and `manifest.json`. Its direct paths remain outside the staged Pages allowlist until a separate publication action is explicitly authorized. These are communication or asset-review surfaces, not gameplay screenshots or implementation evidence. Exact source bytes and automated checks establish availability and data contracts, not physical-device readability, interaction, game feel, or runtime quality. No redesigned map, entity, structure, movement, combat, AI, touch, or networking runtime evidence exists yet.

### v2026.8.20 deployment observation

On 2026-08-20, protected pull request `#6` merged as `919cc933a4def3a6688208f3e5a2180cc4d4687e`. Main audit run `32347611623` and Pages run `32347611618` completed successfully. A cloud desktop browser then loaded the canonical status and `concepts/` routes, observed the `v2026.8.20` label and revised Phase 1 boundary, and loaded all eight local WebP references at their recorded natural dimensions. No warning or error from the Pages origin appeared in that session. Browser-extension diagnostics were excluded because they are not emitted by the site. This observation does not establish pixel-level visual approval, responsive or keyboard behavior, a pre-existing-cache upgrade, another browser/device, or a physical-device result.

### v2026.8.20a deployment observation

On 2026-08-20, protected pull request `#8` merged as `75ec47c2bca9ea325f5b9508c06d44f3eb1aff1c`. Main audit run `32351430376` and Pages run `32351430306` completed successfully. That frozen source passed 68/68 integrated checks and staged the exact 24-file Pages allowlist. The canonical status route and `concepts/feasibility/` returned HTTP 200. SHA-256 checks confirmed that the live status entry, proof entry, proof stylesheet, three WebP targets, and three SVG diagrams match merged source byte for byte. A cloud desktop browser at 1363×936 loaded the `v2026.8.20a` status, Phase 0 complete state, Phase 1A in-review state, and direct proof route. The proof page's full rendered length, compact-phone layout, keyboard flow, page-origin console, stale-cache migration, and physical-device readability remain unobserved; exact bytes do not establish those qualities or owner approval.

### Owner-supplied portrait mobile observation

On 2026-08-15 the product owner supplied a 945×2048 portrait mobile-browser screenshot of the live `xenovoyage.github.io` status page. The capture visibly shows the Aeon of Kingdoms wordmark, redesign status, Phase 0 label, rebuilding statement, explanatory copy, and current-boundary section. The content is readable, remains inside the visible browser safe area, and does not show the rejected gameplay shell. The screenshot does not prove the unseen remainder of the page, link activation, landscape behavior, another device or viewport, console state, offline reopening, or migration from an existing prototype service-worker cache.

## Next boundary

1. Complete and review this Engineering Standard v1.0 adoption pass. Keep the status `adopting` while any applicable evidence remains failed, deferred, or unavailable; recording continuing debt does not permit a `verified` claim.
2. Commit, push, update pull request `#10`, or publish only with separate explicit authorization; require a fresh successful `audit` check after any push.
3. Phase 1B planning is the next product boundary. Its implementation checklist remains entirely open, and no Phase 1B asset expansion has started.
4. Do not create a Phase 2 gameplay renderer before the complete Phase 1B visual and interaction gate receives explicit owner approval.
