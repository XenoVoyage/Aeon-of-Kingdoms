# Aeon of Kingdoms contributor instructions

**Project Engineering Standard:** v1.0
**Standard Status:** adopting

Read this file in full at the start of every task, before inspecting or changing the project. Re-read it after changing branches or updating this file. It is the canonical engineering contract for human and AI contributors who do not have earlier conversation context. [`docs/STATUS.md`](docs/STATUS.md) is the only owner of the current phase, deployment, evidence, and standard-adoption state.

Keep the standard status `adopting` while any applicable requirement remains failed, deferred, or unavailable. Recording or accepting continuing debt does not permit `verified`; use `verified` only after every applicable requirement passes and non-applicable checks are recorded.

## Active redesign override

The formerly deployed `v2026.8.15` runtime at commit `7f88655` was rejected by the product owner and is historical evidence, not the visual, interaction, gameplay, terminology, or AI baseline for future work. [`docs/REDESIGN.md`](docs/REDESIGN.md) owns the approved replacement sequence and gates; [`docs/PRODUCTION_ART.md`](docs/PRODUCTION_ART.md) owns the enduring visual-production method; [`docs/PHASE1B_VISUAL_LOCK.md`](docs/PHASE1B_VISUAL_LOCK.md) owns the approved complete Phase 1B visual/interaction contract; [`docs/PHASE2_FOUNDATION.md`](docs/PHASE2_FOUNDATION.md) owns the approved landscape foundation; [`docs/PHASE3_ENTITY_MOVEMENT.md`](docs/PHASE3_ENTITY_MOVEMENT.md) owns the closed approved entity/movement contract; [`docs/PHASE4_STRUCTURES_ECONOMY.md`](docs/PHASE4_STRUCTURES_ECONOMY.md) owns the closed approved structures/economy/production/rally contract; [`docs/PHASE5_COMBAT_TACTICS.md`](docs/PHASE5_COMBAT_TACTICS.md) owns the closed approved combat/tactical-command contract; [`docs/PHASE6_STRATEGIC_AI.md`](docs/PHASE6_STRATEGIC_AI.md) owns the closed strategic-AI/local-skirmish contract and evidence; and [`docs/PHASE7_PRODUCT_HARDENING.md`](docs/PHASE7_PRODUCT_HARDENING.md) owns the frozen active product-hardening implementation and evidence gate. Phase approval never grants a Git tag or GitHub Release.

- Aeon of Kingdoms must have an original design. Neon Voyage may demonstrate restraint and clarity but its UI, structure, styles, and gameplay must not be copied.
- Treat the existing runtime as disposable. No menu, renderer, map, site type, tuning value, interaction, AI behavior, or source boundary survives merely because it is implemented or tested.
- Use `entity` as the authoritative code term for identified world objects. Mobile fighters are combat entities; headquarters, Resource Points, and Production Outposts are structure entities. Do not retain prototype `unit*` compatibility names without a real external consumer.
- Gameplay is landscape-only. Unsupported portrait orientation shows a rotate-device gate; it does not receive a compressed portrait game layout.
- The initial design has exactly three structure categories: a faction-unique headquarters, a shared capturable Resource Point, and a shared capturable Production Outpost.
- Production art targets cartoon-leaning painted 2D tactical miniatures with broad silhouettes and restrained detail that remain readable at the smallest approved gameplay scale. High-detail mood art is not a sprite specification.
- The authored map separates ground, non-blocking detail, navigation/blocker data, anchors, dynamic entities, and foreground occlusion. Image pixels never decide walkability, and the redesign does not introduce a height engine or 3D physics.
- Combat-entity art follows `docs/PRODUCTION_ART.md`: one stable idle frame; four movement frames whose upper body and equipment are pixel-identical; six full-body attack/cast and defeat frames; canonical right-facing art; exact X-mirrored left-facing art; and separate player-color masks. Independently assembled limbs, independently redrawn idle frames, and runtime anatomy deformation are prohibited.
- Producing structures require bounded tick-based queues, visible progress, deterministic spawn validation, and rally commands that work through the same future network command boundary.
- Explicit entity targeting, autonomous nearby combat, readable animation states, slow group movement, formation spacing, hard map blockers, and strategic multi-front AI are release requirements.
- Work one approved phase at a time. Passing automation does not replace rendered evidence, physical-device evidence, game-feel review, or explicit owner approval.

## 1. Priorities

Apply these priorities in order:

1. Preserve approved user intent, accessibility, deterministic rules, and player data. Do not preserve rejected prototype behavior against `docs/REDESIGN.md`.
2. Choose the smallest complete solution with a clear owner.
3. Keep simulation and delivery bounded, fast, secure, and inspectable.
4. Build one approved shared rules core across skirmish, campaign, AI, replay, and future networking; do not preserve the rejected core merely to reuse it.
5. Verify honestly and distinguish source, automated, rendered, deployed, and physical-device evidence.

Before editing, inspect `git status`, the connected source path, its tests, and its canonical documentation. Preserve unrelated work. Never infer current behavior from filenames, mockups, roadmap text, or old release notes alone.

## 2. Cold start

Read in this order:

1. This file in full.
2. `docs/STATUS.md` for current maturity, evidence, engineering-standard adoption, and the active boundary.
3. `docs/REDESIGN.md` for the approved product contract, phase sequence, and gates.
4. `docs/PRODUCTION_ART.md` before any visual, entity, structure, terrain, animation, atlas, mask, damage, or effect work.
5. `tests/README.md` for the verification and manual-acceptance map.
6. `docs/PHASE1A_HANDOFF.md` when Phase 1A inputs, approval, direct review paths, or rejected methods are relevant.
7. `docs/PHASE1B_VISUAL_LOCK.md` for the approved menu/HUD, identities, controls, viewport, and runtime-art envelope.
8. `docs/PHASE2_FOUNDATION.md` before changing the approved Phase 2 shell, camera, viewport/orientation behavior, map schema, terrain renderer, navigation debug, or Phase 2 evidence.
9. `docs/PHASE3_ENTITY_MOVEMENT.md` before changing entities, selection, movement, pathfinding, formation, separation, replay, snapshots, checksums, runtime entity art, or Phase 3 evidence.
10. `docs/PHASE4_STRUCTURES_ECONOMY.md` before changing structures, capture, Resource, population, production, spawning, rally, or Phase 4 evidence.
11. `docs/PHASE5_COMBAT_TACTICS.md` before changing combat commands, stances, targeting, range, leashes, projectiles, damage, defeat, structure health/destruction, headquarters outcome, combat feedback, or Phase 5 evidence.
12. `docs/PHASE6_STRATEGIC_AI.md` before changing AI observation, strength, needs, task forces, production planning, cadence, skirmish orchestration, composite checkpoints, or Phase 6 evidence.
13. `docs/PHASE7_PRODUCT_HARDENING.md` before changing the closed local slice for device, lifecycle, accessibility, performance, offline/cache, options, onboarding, audio, or release-readiness work.
14. `docs/GAME_DESIGN.md` and `docs/ARCHITECTURE.md` only with their prototype-era warnings until their later redesign replacements exist.
15. `docs/NETCODE.md` only when commands, determinism, networking, lobbies, or servers are involved.
16. `docs/CONVERSATION_DECISIONS.md` only for historical rationale; it never overrides the files above.
17. The connected source, tests, issue, pull request, and decision owner.

Use `CONTRIBUTING.md` as a public entrypoint, not a substitute for these rules. Ask before selecting material product direction when the goal or acceptance criteria are absent.

## 3. Product and delivery boundaries

- The rejected playable prototype remains at commit `7f88655` in Git history and in temporarily preserved prototype-era source used by historical regression tests. It is not the working-tree product baseline, public entry point, or Pages payload. Its public `v2026.8.15` tag and GitHub Release were retired on 2026-08-21 at the owner's direction while the commit and normal Git history remained reachable. The retired label must never be recreated or reused.
- `docs/STATUS.md` owns the current public runtime, local source boundary, active phase, and observed evidence. Never copy those volatile facts into this file or infer them from a version string.
- The status page, `concepts/` archive, and `concepts/feasibility/` proof must work by opening their HTML entry points directly and from the `/Aeon-of-Kingdoms/` GitHub Pages subpath. The future game inherits that delivery constraint unless an approved phase changes it.
- Multiplayer is planned, not shipped. The owner selected a future private two-player host/client room joined by a short code; signaling, likely TURN, and every provider/security/privacy/CSP choice remain deferred. GitHub Pages and Actions are never described as a server.
- The first replacement release targets a proven two-player local slice. Four- and six-player layouts are later scale work and require separate routing, performance, fairness, and play evidence.

Do not expand the slice into an account system, content pipeline, framework migration, live service, or speculative abstraction without explicit scope.

## 4. Non-negotiable engineering boundaries

- Authoritative game rules advance through one fixed-step simulation. Rendering, DOM, audio, and wall-clock frame timing do not decide outcomes.
- Human input, deterministic AI, campaign scripting, replay, and future remote input issue validated commands; they do not mutate battle state through private shortcuts.
- Random authoritative decisions use a seeded project source and stable iteration order.
- Every entity, transient effect, queued command, production item, path search, catch-up loop, cached route, and remote payload needs a real enforced cap and deterministic cleanup.
- Population is a hard rule cap. Production never creates a combat entity that exceeds resource, population, ownership, queue, or spawn-space requirements.
- Keep all runtime resources local and repository-relative. No CDN, analytics, telemetry, dynamic code, hidden external font, or unreviewed network request.
- Preserve a restrictive Content Security Policy. Any future `connect-src` exception requires a reviewed transport and documented domain/failure/privacy boundary.
- Preserve keyboard, pointer, touch, dialog focus, visible focus, status text, reduced-motion, pause, resize, and lifecycle input cleanup.

## 5. Code quality

- Prefer direct functions and small data contracts over frameworks, managers, event buses, service layers, loaders, inheritance trees, or speculative plugin systems.
- Give every source one understandable responsibility. Split a file only when the new interface is smaller and ownership becomes clearer; line count alone is not a reason.
- Use domain names. Avoid vague names such as `data`, `manager`, `helper`, `thing`, or unexplained abbreviations when a specific game term exists.
- Keep one source of truth for tuning, map definitions, rosters, status, versions, and release evidence. Do not create convenience mirrors without an enforced synchronization test.
- Comments explain intent, measurement units, invariants, protocol fields, or browser constraints. They do not narrate syntax or preserve stale alternatives.
- Keep hot fixed-step and render paths allocation-conscious. Prefer stable arrays, reused buffers, and spatially bounded queries when measurement or scale justifies them.
- Optimize observed work and clear asymptotic risks; do not reduce clarity for unmeasured micro-optimizations.
- Remove code, selectors, assets, tests, or documentation only after searching references and proving they are unused. Do not retain compatibility shims for hypothetical callers.

## 6. Ownership map

Each responsibility has one source of truth. Phase 2 introduced the approved non-authoritative landscape shell, camera, map data, and layered renderer. Phase 3 introduced the approved first replacement authoritative entity/movement simulation, replay boundary, and runtime entity-art loader. Phase 4 introduced the approved structures/economy/production/rally foundation. Phase 5 introduced the approved combat/tactical-command simulation and reproducible damage-state asset pipeline. Phase 6 introduced the approved detached strategic planner and local-skirmish orchestration over that unchanged battle core. Phase 7 adds only a separate product-hardening shell and presentation controller over the byte-locked Phase 2 through Phase 6 owners; it does not own authoritative rules or AI. Prototype-era design documents remain historical until explicitly replaced.

| Area | Source of truth |
| --- | --- |
| Current phase, evidence, deployment, and engineering-standard adoption | `docs/STATUS.md` |
| Interim public content and semantics | `index.html` |
| Interim presentation | `css/status.css` |
| Interim enhancement and service-worker registration | `js/status.js` |
| Reviewed mood-reference content and feasibility boundary | `concepts/index.html` |
| Mood-reference presentation | `concepts/gallery.css` |
| Optimized mood-only visual references | `concepts/images/*.webp` |
| Published approved Phase 1A Pages review | `concepts/feasibility/index.html` and `concepts/feasibility/proof.css` |
| Archived superseded v5 Phase 1A source assets | `concepts/feasibility/images/*.webp` |
| Approved direct-file Phase 1A production-feasibility package | `concepts/feasibility/phase1a/README.md` and `concepts/feasibility/phase1a/manifest.json` |
| Six representative atlases, masks, metadata, and actual-scale playback | `concepts/feasibility/phase1a/entities/*/` |
| Accepted environment, structures, damage, ownership, and viewport compositions | `concepts/feasibility/phase1a/{environment,structures,review}/` |
| Phase 1A closure record and Phase 1B boundary | `docs/PHASE1A_HANDOFF.md` |
| Approved complete Phase 1B visual/interaction/runtime-envelope contract | `docs/PHASE1B_VISUAL_LOCK.md` |
| Published Phase 1B review and presentation | `concepts/phase1b/index.html` and `concepts/phase1b/visual-lock.css` |
| Phase 2 landscape-foundation contract and evidence | `docs/PHASE2_FOUNDATION.md` |
| Phase 2 semantic shell and lifecycle orchestration | `phase2/index.html` and `phase2/app.js` |
| Phase 2 presentation and safe-area/orientation layout | `phase2/phase2.css` |
| Phase 2 bounded camera-input translation and transient cleanup | `phase2/input.js` |
| Phase 2 camera, map, and layered rendering | `phase2/camera.js`, `phase2/map.js`, and `phase2/renderer.js` |
| Phase 3 entity/movement contract and evidence | `docs/PHASE3_ENTITY_MOVEMENT.md` |
| Phase 3 immutable rules, roster, caps, and identity ordering | `phase3/config.js` |
| Phase 3 navigation and authoritative entity/movement state | `phase3/navigation.js` and `phase3/simulation.js` |
| Phase 3 canonical replay, snapshot restore, and checksum | `phase3/replay.js` |
| Phase 3 runtime entity manifest, preload/recolor/residency, and deterministic export | `phase3/assets/entities/manifest.js`, `phase3/assets.js`, and `tools/export-phase3-assets.js` |
| Phase 3 selection/camera command translation and entity presentation | `phase3/input.js` and `phase3/renderer.js` |
| Phase 3 semantic shell, lifecycle, fixed-step orchestration, and presentation | `phase3/index.html`, `phase3/phase3.css`, and `phase3/app.js` |
| Phase 4 structures/economy/production/rally contract and evidence | `docs/PHASE4_STRUCTURES_ECONOMY.md` |
| Phase 4 rules, map geometry, navigation, replay, and authoritative state | `phase4/config.js`, `phase4/map.js`, `phase4/navigation.js`, `phase4/simulation.js`, and `phase4/replay.js` |
| Phase 4 reproducible structure derivatives, manifest, and runtime loader | `tools/export-phase4-structures.js`, `phase4/assets/structures/manifest.js`, and `phase4/assets.js` |
| Phase 4 interaction, dynamic structure/entity ordering, shell, and presentation | `phase4/input.js`, `phase4/renderer.js`, `phase4/index.html`, `phase4/phase4.css`, and `phase4/app.js` |
| Phase 5 combat/tactical-command contract and closure evidence | `docs/PHASE5_COMBAT_TACTICS.md` |
| Phase 5 rules, map overlay, navigation, authoritative combat state, replay, restore, and checksums | `phase5/config.js`, `phase5/map.js`, `phase5/navigation.js`, `phase5/simulation.js`, and `phase5/replay.js` |
| Phase 5 reproducible damage-state sources, derivatives, manifest, and runtime loader | `concepts/feasibility/phase1a/structures/phase5/`, `tools/export-phase5-structures.js`, `phase5/assets/structures/manifest.js`, and `phase5/assets.js` |
| Phase 5 interaction, combat presentation, semantic shell, lifecycle, and fixed-step orchestration | `phase5/input.js`, `phase5/renderer.js`, `phase5/index.html`, `phase5/phase5.css`, and `phase5/app.js` |
| Phase 6 strategic-AI/local-skirmish contract and closure evidence | `docs/PHASE6_STRATEGIC_AI.md` |
| Phase 6 AI tuning, observation, planning, skirmish orchestration, checkpoint, and presentation | `phase6/config.js`, `phase6/ai.js`, `phase6/skirmish.js`, `phase6/index.html`, `phase6/phase6.css`, and `phase6/app.js` |
| Phase 7 product-hardening contract and gate | `docs/PHASE7_PRODUCT_HARDENING.md` |
| Phase 7 semantic shell, responsive presentation, suspension/browser-feature/focus/memory arithmetic, and orchestration | `phase7/index.html`, `phase7/phase7.css`, `phase7/hardening.js`, and `phase7/app.js` |
| Historical conversation rationale and rejected-attempt chronology | `docs/CONVERSATION_DECISIONS.md` |
| Thin cold-start pointer for a new chat | `docs/NEW_CHAT_PROMPT.txt` |
| Explicit Pages delivery allowlist | `.github/scripts/stage-pages.js` |
| Active redesign, phases, and approval gates | `docs/REDESIGN.md` |
| Approved production-art, animation, direction, color, structure, and validation method | `docs/PRODUCTION_ART.md` |
| Intended future experience after its redesign rewrite | `docs/GAME_DESIGN.md` |
| Rejected prototype runtime-boundary archive | `docs/ARCHITECTURE.md` |
| Multiplayer protocol and infrastructure plan | `docs/NETCODE.md` |
| Active review-reference inventory and archived prototype asset record | `docs/ASSETS.md` |

Put redesign behavior in the smallest approved boundary for that phase. Shared code must have at least two proven callers or remove a real ownership conflict. Do not restore rejected prototype source from history to accelerate a redesign phase.

## 7. Gameplay invariants

- Internal roles are stable engine identifiers; faction-specific public entity names and silhouettes remain free to differ.
- Resource Points and Production Outposts use only their approved effects. They do not bypass resource, population, ownership, queue, or spawn validation.
- Headquarters elimination remains valid in every mode. Alternate modes add objective wins; they do not make headquarters immortal.
- Group movement uses distributed destinations. Formation slots, separation, attack positions, and large footprints must not send every combat entity to one coordinate.
- Navigation and local avoidance use stable tie-breaking. A deterministic replay with the same configuration, seed, and commands must reach equivalent authoritative state.
- AI issues legal player commands and observes the information boundary chosen for the mode. It receives no hidden mutation path.
- A mode composes objectives around shared simulation rules; it does not fork economy, combat, pathfinding, or capture into a parallel implementation.
- Essential state is readable outside the Canvas. Color, glow, and animation are never the only indicator of owner, selection, damage, target, or disabled state.

The replacement runtime must introduce one obvious configuration owner for exact values. Do not treat the preserved prototype `js/config.js` or prototype-era `docs/GAME_DESIGN.md` as that owner.

## 8. Networking boundary

Read `docs/NETCODE.md` before changing a command schema or deterministic rule. The owner selected a future private two-player host/client room joined by a short code, using the host-authoritative ordered command stream with periodic hashes and bounded snapshots. Exact transport, signaling, TURN, provider, dependency, privacy, security, and CSP choices remain subject to the approved networking-phase spike; no network code belongs before Phase 9.

- Do not add a networking library until its exact version, license, provenance, signaling/relay behavior, privacy boundary, CSP needs, and failure modes are reviewed.
- Do not put credentials, reusable seat tokens, TURN secrets, or cloud configuration in client source, URLs, logs, screenshots, issues, or commits.
- Treat every remote value as hostile: validate type, range, ownership, sequence, tick, count, and encoded size before allocation or lookup.
- A P2P host can cheat and can end a match. UI and documentation must not imply competitive server authority.
- Host migration, public matchmaking, chat, reconnect, spectators, and join-in-progress are separate features, not incidental additions.

Do not weaken deterministic local behavior to make an early transport demo appear functional.

## 9. Verification

There is no install step, runtime dependency, or build step for the current static source boundary.

| Purpose | Exact command or action |
| --- | --- |
| Direct local preview | Open `index.html` in a modern browser |
| Focused Phase 1A asset check | `node --test tests/phase1a-production-assets.test.js` |
| Focused Phase 1B visual-lock check | `node --test tests/phase1b-visual-lock.test.js` |
| Focused Phase 2 foundation check | `node --test tests/phase2-foundation.test.js` |
| Focused Phase 3 entity/movement checks | `node --test tests/phase3-assets.test.js tests/phase3-interaction-render.test.js tests/phase3-shell.test.js tests/phase3-simulation.test.js` |
| Focused Phase 4 structures/economy checks | `node --test tests/phase4-assets.test.js tests/phase4-interaction-render.test.js tests/phase4-shell.test.js tests/phase4-simulation.test.js` |
| Focused Phase 5 combat/tactics checks | `node --test tests/phase5-assets.test.js tests/phase5-interaction-render.test.js tests/phase5-shell.test.js tests/phase5-simulation.test.js` |
| Focused Phase 6 strategic-AI/skirmish checks | `node --test tests/phase6-config.test.js tests/phase6-ai.test.js tests/phase6-skirmish.test.js tests/phase6-shell.test.js` |
| Focused Phase 7 product-hardening checks | `node --test tests/phase7-product-hardening.test.js` |
| Complete automated verification | `node tests/run.js` |
| Stage the exact Pages payload | `node .github/scripts/stage-pages.js _site` |
| Diff hygiene | `git diff --check` |
| Working-tree review | `git status --short --branch` |

- Add a deterministic regression for every fixed defect or changed rule.
- Use Node.js built-ins only. The verification harness installs no dependency and makes no network request.
- When available, the Phase 3 asset suite invokes the recorded local ImageMagick `convert` executable and its lossless-WebP delegate to reproduce generated files; this is an optional authoring-verification toolchain, not a browser runtime dependency or build step. Runners without it must report one explicit skip while retaining the committed-byte/hash/invariant checks.
- Run focused checks while iterating, then `node tests/run.js` on the frozen candidate.
- Run `git diff --check`, inspect `git status --short`, and review the complete diff against the current base.
- Verify every runtime script appears exactly once and in dependency order; every local reference resolves; Pages stages only its explicit allowlist; and no external runtime resource slipped in.
- Browser-shell and Node VM tests are not rendered browser play. Simulated touch is not a physical phone. A Pages deployment is not proof of a successful match.
- Report automated, rendered, local manual, deployed, cross-network, and physical-device evidence separately. Missing categories are acceptable when accurately marked pending.

Never weaken, skip, or delete a test to hide a defect. Never claim a check, deployment, screenshot source, device, player count, or network condition that was not observed.

### Definition of done

- The authorized observable outcome is complete without unrequested product behavior, external writes, dependencies, or speculative layers.
- Each changed responsibility has one clear owner; affected canonical documents and tested mirrors agree.
- Focused checks and `node tests/run.js` pass on the frozen candidate; Pages staging and diff hygiene pass when applicable.
- The complete diff is reviewed for behavior drift, broken references, data loss, security, accessibility, performance, and unnecessary complexity.
- Automated, rendered, manual, deployed, network, and physical-device evidence are reported separately, with unavailable or non-applicable checks explicit.
- Remaining risk, rollback, deletion, migration, GitHub, and approval state are recorded honestly.

## 10. Documentation and cleanup discipline

- The ownership map in section 6 is canonical. `README.md` is the short human entrypoint; `CONTRIBUTING.md` is the public workflow; durable documents exist only for a distinct owner.
- Update every affected owner in the same coherent change. Do not use durable documents as task logs, duplicate volatile status across files, or turn roadmap text into an implemented claim.
- Search source, tests, templates, styles, configuration, manifests, workflows, documentation, loaders, and delivery paths before deleting. Remove only proven-dead code, assets, flags, dependencies, shims, generated output, and debug residue.
- Preserve unfamiliar or unrelated work. Historical material belongs in Git history when removal is safe; create public tags only for intentional releases and do not restore rejected material to accelerate the redesign.

## 11. Versioning and releases

`VERSION.txt` is the only canonical public-source version. Required mirrors are the README badge, current changelog heading, `docs/STATUS.md`, the visible status/runtime label, and the service-worker cache label; any future visible in-game label becomes another tested mirror.

Calendar version labels use the actual Europe/Zagreb publication date:

- first release that day: `vYYYY.M.D`, without leading zeroes;
- later releases that day: `vYYYY.M.Da`, `vYYYY.M.Db`, and so on;
- inspect tags and history first; never reuse or move a published label.

A **candidate** is frozen source selected for verification. A **verified candidate** has passed its recorded source and manual checks. A **deployment** is a Pages publication of a commit. A **release** is an intentional published Git tag that the project treats as immutable, optionally with a GitHub Release. A version string or changelog heading alone proves none of those evidence states.

For a public runtime release:

1. Choose the unused label for the actual date and update `VERSION.txt` first.
2. Synchronize and test every required mirror.
3. Update player-facing changelog and affected canonical documents.
4. Freeze the candidate and run the complete verification and applicable manual matrix.
5. Publish through the repository's protected workflow.
6. Verify Pages, the live version, console cleanliness, and the release's primary user journey after deployment: roadmap/status navigation for an interim status release, or a real short Play action for gameplay.
7. Create the release tag only when the owner intends to publish it, then never move or reuse it.

Documentation-only maintenance does not change the runtime version unless it changes player-facing runtime behavior.

## 12. GitHub collaboration

After the initial repository bootstrap, treat `main` as protected. Inspect the current default-branch head, working tree, relevant issues, open or draft pull requests, and recent merged work before editing.

- Work on a short-lived `agent/<description>` branch created from the current `main` unless the user explicitly authorizes another strategy.
- Stage only task-related files. Keep commits coherent and record verification and evidence boundaries in the pull request.
- Open pull requests as drafts by default. Do not merge without explicit authority or a repository rule that clearly grants it.
- Do not force-push shared history, bypass required checks, self-approve where independent approval is required, expose credentials, or move/delete published tags and releases. The only exception is an exact owner-authorized retirement after verifying the target, reachability, and recovery boundary; never rewrite shared history or reuse the retired label.
- Before review, compare the complete branch against the current base and rerun required checks on the final candidate.
- Delete a branch only after proving it is not protected or active and its work is reachable from the default branch or an unchanged merged pull request.

If authentication, permissions, branch ownership, or publication state is uncertain, stop and ask instead of guessing.
