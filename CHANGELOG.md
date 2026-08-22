# Changelog

All notable player-facing changes to Aeon of Kingdoms are recorded here. Runtime labels use Calendar Versioning: `vYYYY.M.D`, followed by `a`, `b`, and so on for additional releases on the same date. `VERSION.txt` is the canonical current version; a changelog heading does not prove that a tag, GitHub Release, or deployment exists.

## [v2026.8.22a] — 2026-08-22 (Phase 3 entity and movement candidate)

### Added

- Added a bounded local Phase 3 route that preserves the approved menu and six-layer landscape while placing the six proven representatives into a deterministic two-player movement scenario.
- Added explicit desktop and touch selection, additive box selection, Move mode, right-click movement, keyboard/pointer camera controls, selection rings, non-color ownership symbols, destination feedback, and readable pause/load/error states.
- Added a 20 Hz integer simulation with globally sequenced `MOVE` commands, footprint-aware deterministic routing, stable formation destinations, local separation, bounded repathing, canonical snapshots, replay logs, and FNV-1a checksums.
- Added a reproducible 24-file lossless-WebP runtime-art package: base and aligned ownership mask pairs for six entities at 128-pixel Standard and 96-pixel Compact tiers.

### Corrected

- Re-exported the complete six-entity runtime set from the intact approved Phase 1A masters after reproducing blank lower-body rows in the unpublished Phase 1B budget survey. The published four-file Astral Guardian review sample remains unchanged.
- Replaced the obsolete survey totals with measured complete-body totals: 734,126 encoded bytes and 12 MiB retained for Standard; 459,446 encoded bytes and 6.75 MiB retained for Compact; 1,193,572 encoded bytes combined.
- Bounded runtime ownership preparation to one fixed faction seat per entity: Astral Concord uses seat 1 and Gravebound Court uses seat 2. Each entity retains one diagnostic base sheet and one final prepared owner sheet; decoded masks are released after validation.

### Verified and bounded

- The source candidate passes 122/122 dependency-free checks, deterministically regenerates every runtime atlas, stages exactly 108 allowlisted public files plus `.nojekyll`, and passes diff hygiene.
- Phase 3 remains an owner-review candidate until explicit approval. Phase 4 structures/economy/production/rally, combat, AI, and networking code stay blocked.
- The selected later multiplayer direction remains one private two-player host/client room joined by a short code. No network connection, signaling, account, matchmaking, chat, reconnect, spectator, or host-migration behavior is added here.
- `v2026.8.22a` is a source/Pages label only. No tag or GitHub Release is created or authorized by this change.

## [v2026.8.22] — 2026-08-22 (Phase 2 closure and Phase 3 authorization)

### Changed

- Recorded the product owner's explicit approval of the complete Phase 2 landscape/camera foundation, closed its owner gate, and authorized bounded Phase 3 entity and movement work.
- Added `docs/PHASE3_ENTITY_MOVEMENT.md` as the exact owner of Phase 3 scope, tuning, entity/command state, routing, formations, separation, runtime art, input, replay, snapshot, checksum, evidence, and owner gate.
- Advanced the public status boundary to Phase 3 authorized while retaining the approved Phase 2 route as the last implemented candidate.
- Recorded the owner-selected future multiplayer direction: one private two-player host/client room joined by a short code, with the creator authoritative and host departure ending the first-version match.
- Clarified that GitHub Pages hosts only the future static client; reviewed signaling and likely TURN remain later infrastructure, and Phase 3 keeps networking absent with `connect-src 'none'`.

### Boundaries

- Phase 3 implementation does not begin in this closure/planning change. Structures/economy/production/rally, combat, AI, networking code, accounts, matchmaking, chat, spectators, host migration, reconnect, and join-in-progress remain excluded.
- Compact/aspect/portrait, broad-browser, and physical-device Phase 2 observations remain evidence debt rather than retroactively claimed results.
- The approved main menu, Phase 1A production art, Phase 1B visual/interaction target, Phase 2 landscape/camera, exactly three structure categories, environment separation, and player-color-plus-symbol rules remain locked.
- `v2026.8.22` is a source/Pages label only. No tag or GitHub Release is created or authorized by this change.

## [v2026.8.21c] — 2026-08-21 (Phase 2 landscape-foundation source candidate)

### Changed

- Recorded the product owner's explicit approval of the complete Phase 1B visual and interaction candidate, closed Phase 1B, and authorized the bounded Phase 2 landscape battlefield foundation.
- Advanced the public status boundary to active Phase 2 while keeping its empty-battlefield/camera owner gate pending and Phase 3 blocked.
- Added `docs/PHASE2_FOUNDATION.md` as the exact owner of the semantic shell, landscape viewport, camera, six-layer map, rendering, evidence, and Phase 2 approval contract.
- Began one non-authoritative two-player landscape foundation using the owner-retained menu, environment-only ground, explicit map layers, blockers, anchors, foreground occlusion, and navigation debug presentation. No simulation or Phase 3 entity/movement work is included.
- Preserved Project Engineering Standard v1.0 at `adopting`; unresolved rendered, browser, deployment, and physical-device evidence remains named.

### Corrected

- Restored the missing lower-body pixels in Astral Guardian movement cells one through three in the 96- and 128-pixel browser-decode base/mask samples from the intact approved Phase 1A master.
- Preserved the existing upper regions byte-for-byte, processed the aligned masks through the same lower-region repair, clamped mask alpha to base alpha, and retained transparent cell edges and zero mask escapes.
- Recorded the exact current hashes, sizes, and honest Sharp 0.35.3/libvips 8.18.3/libwebp 1.6.0 correction provenance. The four files now total 192,548 bytes.

### Evidence and boundaries

- The frozen source passes 4/4 Phase 1A asset checks, 18/18 combined Phase 1B/Phase 2 focused checks, 90/90 integrated checks, exact staging of 72 allowlisted files plus `.nojekyll`, and `git diff --check`.
- Protected pull request `#16` squash-merged as `d17e8c9b4cc00a4beebf03aea443fd514197d608`; pull-request audit `32526124805`, main audit `32526203611`, and Pages `32526203607` completed successfully.
- Eleven sampled deployed files matched source byte for byte. Cloud Chrome at 1363×936 rendered the unchanged menu, six-layer battlefield, repaired Astral samples, camera controls, navigation debug, pause/resume, and menu recovery without horizontal overflow or a page-origin warning/error.
- Compact/tablet/phone/aspect/portrait live reflow, 200% zoom, exact browser version, broad browsers, physical devices, subjective camera feel, and explicit Phase 2 owner approval remain pending.
- The Phase 1B approval does not convert the four browser samples into shipping atlases. The Phase 2 surface does not add combat entities, selection, pathfinding, movement, economy, capture, production, combat, AI, networking, a fourth structure category, or a replacement release.
- The approved main-menu direction remains unchanged. The retired `v2026.8.15` tag and GitHub Release remain absent and must not be recreated.
- `v2026.8.21c` is a source-candidate label only. No tag or GitHub Release is created or authorized by this change.

## [v2026.8.21b] — 2026-08-21 (Phase 1B visual-lock candidate)

### Added

- Added one script-free, non-playable Phase 1B review candidate that preserves the owner-retained minimal menu and approved Phase 1A art direction.
- Added a static map-dominant HUD and annotated battlefield composition covering authored routes, hard blockers, exactly three structure categories, production/blocked-queue/rally feedback, combat readability, and six separate map layers.
- Added six permanent identity contracts per opening faction: the six approved Phase 1A representatives plus six clearly marked candidate public identities derived from accepted broad mood language without importing prototype roles, stats, or balance.
- Added desktop, tablet-landscape, phone-landscape, and portrait rotate-gate compositions with safe-area, explicit target, camera, production, cancellation, and rally interaction contracts.
- Added a measured tiered runtime-art candidate: 128-pixel primary and 96-pixel compact 4×4 lossless-WebP base/mask atlases, logical `1/4/6/6` animation through an idle/movement-frame-zero alias, exact roots, bounded loading/failure behavior, and separately recorded structure/environment budgets.
- Added four exact Astral Guardian base/mask review samples—183,574 bytes total—so a live browser can decode both proposed tiers without presenting them as a complete shipping runtime set.
- Added a focused Phase 1B verification suite and an exact candidate specification at `docs/PHASE1B_VISUAL_LOCK.md`.
- Kept full battlefield compositions visible with non-cropping image treatment, raised small-text contrast, made wide evidence tables keyboard-scrollable, and implemented safe-area-plus-12-pixel inset rules in the review CSS.

### Verified

- Protected pull request `#14` squash-merged as `618d3498c302e08068be99eb7aa585a9a3d162d8`; Offline audit run `32516391298` and Pages run `32516391299` completed successfully with 77/77 integrated checks and 64 allowlisted files plus `.nojekyll`.
- A live cloud Chrome review at 1348×936 rendered the retained menu, battlefield, twelve identities, all four embedded viewport compositions, and all ten local images without horizontal overflow or a page-origin warning/error. The four runtime samples completed at their exact 384×384 and 512×512 natural dimensions.
- Exact cloud-browser version/timing data, compact live-page reflow, 200% rendered zoom, display-cutout emulation, broad browser coverage, and physical-device behavior remain explicitly unverified.

### Boundaries

- This source version is an owner-review candidate. Phase 1B remains open until explicit owner approval, and Phase 2 gameplay renderer work remains blocked.
- The page is a static visual specification, not an implemented HUD, map, interaction system, shipping roster, runtime atlas, gameplay screenshot, physical-device result, tag, GitHub Release, or gameplay release.
- The rejected `v2026.8.15` prototype, mixed `v2026.8.20a` proof, v5 assets, limb rigs, bone rigs, independent left/right art, independently redrawn movement upper bodies, color-only ownership, fourth structure categories, and Neon Voyage assets/layout/style are not reused.
- `v2026.8.21b` is a canonical source/Pages label only. No tag or GitHub Release is created or planned by this change.

## [v2026.8.21a] — 2026-08-21 (Phase 1B planning status)

### Changed

- Advanced the visible project boundary from completed Phase 1A to active Phase 1B planning.
- Marked only Phase 1B as the current roadmap step while stating that implementation has not started.
- Published the owner-approved Phase 1A review matching the visual GDD in place of the superseded v5 feasibility page through protected pull requests `#11` and `#12`.
- Staged the five approved compositions, all six player-color proofs, all 24 actual-scale state playbacks, the environment-only plate, and the accepted damage proof; raw masters and metadata remain repository-only.
- Retired the misleading `v2026.8.15` GitHub Release and tag at the owner's direction while preserving commit `7f88655` and normal Git history; the retired label must not be reused.

### Boundaries

- No gameplay renderer, gameplay rule, Phase 1B asset expansion, dependency, analytics, network request, new tag, new GitHub Release, or physical-device evidence is included or claimed.
- The published Phase 1A review is a bounded, non-playable visual review—not a runtime atlas, implemented game, tag, or release.
- This version string and changelog heading do not independently claim a protected merge, Pages deployment, tag, or GitHub Release; [`docs/STATUS.md`](docs/STATUS.md) owns current publication evidence.

## [v2026.8.21] — 2026-08-21 (deployed Phase 1A approval and standardization build; untagged)

### Changed

- Replaced the visually mixed Phase 1A proof with one cartoon-leaning painted 2D language while separating the immutable environment, runtime structures, entities, player-color layer, and directional animation frames.
- Replaced geometric entity and structure drawings with visible-result artwork; the map-layer contract remains documentation rather than a proposed game appearance.
- Replaced the rejected limb rig and incorrect bone overlay with coherent baked full-body base, stride, and strike poses; runtime selects state and facing without deforming anatomy.
- Enlarged the Guardian sword and shield and the Reaver scythe so equipment remains the primary gameplay-scale silhouette cue.
- Recorded the owner's rejection of the v5 equal-six-frame timing, left-authored facing, whole-sprite idle/move transforms, and unstable roots; those files remain superseded evidence rather than a production template.
- Added the approved production-art contract: canonical right-facing frames with an exact mirrored left facing, one stable idle frame, four lower-body gait frames with invariant upper body and equipment, six-frame action and defeat sequences, shared roots, and direct playback review.
- Added a separate fabric-and-accent mask with default, coral, and emerald ownership proofs while preserving faction materials.
- Required frame-aligned player-color masks for every player-controlled entity and ownable structure, plus non-color ownership cues for up to six players.
- Removed every baked-in entity, headquarters, outpost, capture point, flag, and ownership mark from the battlefield plate; runtime layers will place them later.
- Added intact, scorched-and-burning, and collapsed states for the shared Production Outpost; the healthy state no longer uses decorative fire that could conflict with damage feedback.
- Reclassified the local review page and v5 motion assets as a script-free superseded proof record; new entity review uses direct exported images and playback.
- Added a cold-start regression check so contributor instructions, the roadmap, asset inventory, and canonical production-art contract cannot silently diverge.
- Applied the approved method consistently to six opening representatives: Astral Guardian, Starbow, Aegis Titan, Gravebound Reaver, Hollow String, and Ossuary Colossus.
- Added one atlas, aligned player-color mask, machine-readable metadata file, four actual-scale state previews, and a color-boundary proof for every representative.
- Made idle and movement frame zero byte-identical, locked every movement upper body above the approved gait cutoff, and recorded action/defeat as non-looping states.
- Added neutral shared structure bases, faction-specific headquarters, narrowed ownership masks that exclude cool masonry shadows, a six-player color-plus-symbol proof, and separate desktop/phone battlefield compositions.
- Added a direct-file Phase 1A review package and machine-readable manifest without creating another heavyweight HTML review surface.
- Rebuilt Aegis Titan movement and action so head, torso, hips, knees, feet, and punch consistently face canonical screen-right before exact mirroring; its accepted defeat and player-color behavior remain intact.
- Added a memoryless closure handoff and reconstructed decision record, then reduced the new-chat bootstrap to a thin pointer so the project no longer depends on conversation history or duplicates volatile status.
- Recorded the owner's direct approval of the corrected Aegis Titan and complete integrated set, closing Phase 1A without claiming gameplay or publication.
- Began Project Engineering Standard v1.0 adoption across the contributor contract, current-status ownership, definition of done, pull-request evidence fields, repository audit, and consistency checks.
- Verified the Phase 1A source boundary with exact atlas, mask, frame, anchor, payload, structure, and viewport checks. Automation and owner approval remain separately recorded evidence categories.

### Boundaries

- The production method, corrected Aegis Titan, and complete Phase 1A visual package are owner-approved. The direct package remains outside the Pages allowlist and is not published gameplay; physical-device evidence, gameplay implementation, a tag, and a GitHub Release are not claimed.
- The six representatives prove melee, ranged, and signature production behavior for each opening faction. They do not expand the later permanent role roster or establish final runtime atlas dimensions.
- No gameplay, simulation, AI, networking, dependency, analytics, or external runtime request is added.
- Pull request `#10` merged as commit `0d74dd9174f0db873c1c9ea8cfc824c1ea231660`; main audit run `32496788387` and Pages run `32496788440` completed successfully.
- The merged source passed 72/72 integrated checks on Node.js 20.20.2 and staged the exact 31-file Pages allowlist plus `.nojekyll`. This automation and deployment evidence does not establish rendered quality, physical-device behavior, gameplay, a tag, a GitHub Release, or publication of the direct Phase 1A package.

## [v2026.8.20a] — 2026-08-20 (deployed feasibility-review build; untagged)

### Added

- Added a separate Phase 1A owner-review page with one crowded ordinary-zoom battlefield target and compact desktop/phone scale frames.
- Added simplified Astral Concord and Gravebound Court lineups with melee, ranged, and signature silhouettes, plus non-color-only ownership, selection, and target cues.
- Added deterministic vector diagrams for the exact three structure categories, six authored map layers, and the four core animation families with stable ground anchors.

### Changed

- Made the Phase 1A proof the primary review route while preserving the eight earlier frames as a clearly labelled mood-reference archive.
- Advanced the public status sequence from the completed Phase 0 truth baseline to the active Phase 1A review gate.
- Added the proof's visual target to the README with an explicit non-gameplay caption and recorded its production and asset boundaries.

### Boundaries

- The proof is draft review material, not implemented gameplay, final art, an approved atlas, a balanced map, or physical-device evidence.
- No runtime dependency, gameplay renderer, simulation rule, networking feature, external request, tag, or GitHub Release is included or claimed.
- The frozen source passes 68/68 integrated checks, including five Phase 1A-specific checks, and stages the exact 24-file Pages allowlist. The three SVG diagrams were rasterized and inspected locally; full proof-page rendered and physical-device review remain separate.
- Pull request `#8` merged as commit `75ec47c2bca9ea325f5b9508c06d44f3eb1aff1c`; main audit run `32351430376` and Pages run `32351430306` completed successfully.
- The live status entry, proof entry, proof stylesheet, and all six proof images matched merged source byte for byte over HTTPS. A cloud desktop browser loaded the current status and Phase 1A review route at 1363×936. This does not establish full proof-page rendering, compact-phone quality, cache migration, or physical-device evidence.
- No `v2026.8.20a` tag or GitHub Release is claimed.

## [v2026.8.20] — 2026-08-20 (deployed status/reference build; untagged)

### Changed

- Reclassified the eight published Phase 1 frames as reviewed mood references rather than the production art approval target.
- Recorded the owner-approved Phase 1A feasibility brief: actual desktop/phone scale, two factions with three representative roles each, exactly three simplified structure forms, layered map/navigation/occlusion evidence, and four core animation families.
- Replaced the gallery's obsolete “approve all eight” instruction with the smaller production-feasibility gate.

### Boundaries

- No redesigned gameplay, new image, final sprite, animation sequence, map runtime, dependency, network request, or multiplayer feature is included.
- Pull request `#6` merged as commit `919cc933a4def3a6688208f3e5a2180cc4d4687e`; main audit run `32347611623` and Pages run `32347611618` completed successfully.
- Both live entry routes and all eight local reference images loaded in a cloud desktop browser without a page-origin warning or error. Exact-byte comparison, responsive/keyboard review, cache migration, and physical-device evidence remain separate pending work.
- No `v2026.8.20` tag or GitHub Release is claimed.

## [v2026.8.16] — 2026-08-16 (deployed status/review build; untagged)

### Added

- Added one local, review-only gallery containing eight optimized concept references for the battlefield, two opening factions, three structure categories, combat readability, minimal menu, landscape touch controls, and production/rally interaction.
- Added a visible route from the Phase 0 status page to the concept set and a numbered owner decision checklist.

### Publication and boundaries

- The concepts remain unapproved direction references, not shipping assets, gameplay screenshots, or proof of implementation.
- The gallery does not enter the bounded offline status-shell cache and introduces no script, dependency, tracking, or external request.
- Pull request `#4` merged as commit `27895cca87c1415183500b176e36a9234f6d4e8a`; main audit run `31912225152` and Pages run `31912225209` succeeded.
- All 16 allowlisted files and both directory entry routes were observed over HTTPS and matched merged source byte for byte; sampled rejected prototype paths returned `404`.
- No `v2026.8.16` tag or GitHub Release is claimed. Rendered gallery, keyboard, console, cache-migration, and physical-device observations remain separate pending evidence.

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
