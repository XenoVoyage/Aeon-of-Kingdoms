# Aeon of Kingdoms contributor instructions

Read this file in full at the start of every task, before inspecting or changing the project. Re-read it after changing branches or updating this file. It is the canonical handoff for human and AI contributors who do not have earlier conversation context.

## Active redesign override

The published `v2026.8.15` runtime was rejected by the product owner and is historical evidence, not the visual, interaction, gameplay, terminology, or AI baseline for future work. Read [`docs/REDESIGN.md`](docs/REDESIGN.md) before any task. During the redesign it takes precedence over prototype-era product and architecture descriptions when they conflict.

Phase 0 and the roadmap baseline were approved by the product owner on 2026-08-15. The current non-playable `v2026.8.20` status and mood-reference site is deployed from merge commit `919cc93`; main audit run `32347611623` and Pages run `32347611618` completed successfully. A cloud desktop-browser observation loaded both entry routes, the current boundary text, and all eight local reference images without a page-origin warning or error. This establishes publication and resource loading only; exact-byte comparison, responsive/keyboard review, a previously cached profile, and physical-device evidence remain pending. On 2026-08-20 the owner accepted the eight frames as mood references, rejected their literal detail and realism as the production target, and approved the smaller Phase 1A feasibility brief. That approval authorizes a replacement visual proof only; it does not approve an art lock, gameplay work, a tag, or a release.

- Aeon of Kingdoms must have an original design. Neon Voyage may demonstrate restraint and clarity but its UI, structure, styles, and gameplay must not be copied.
- Treat the existing runtime as disposable. No menu, renderer, map, site type, tuning value, interaction, AI behavior, or source boundary survives merely because it is implemented or tested.
- Use `entity` as the authoritative code term for identified world objects. Mobile fighters are combat entities; headquarters, Resource Points, and Production Outposts are structure entities. Do not retain prototype `unit*` compatibility names without a real external consumer.
- Gameplay is landscape-only. Unsupported portrait orientation shows a rotate-device gate; it does not receive a compressed portrait game layout.
- The initial design has exactly three structure categories: a faction-unique headquarters, a shared capturable Resource Point, and a shared capturable Production Outpost.
- Production art targets stylized semi-realistic tactical miniatures with broad silhouettes and restrained detail that remain readable at the smallest approved gameplay scale. High-detail mood art is not a sprite specification.
- The authored map separates ground, non-blocking detail, navigation/blocker data, anchors, dynamic entities, and foreground occlusion. Image pixels never decide walkability, and the redesign does not introduce a height engine or 3D physics.
- Combat-entity art has four core animation families: idle, move, attack or cast, and defeat. Independently generated AI frames are not an acceptable final animation pipeline.
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
2. `docs/REDESIGN.md` for the active product contract, phase, and approval gates.
3. `docs/STATUS.md` for current maturity, evidence, and active boundary.
4. `docs/GAME_DESIGN.md` and `docs/ARCHITECTURE.md` only with their prototype-era warnings until their redesign phases replace them.
5. `tests/README.md` for the verification and manual-acceptance map.
6. `docs/NETCODE.md` only when commands, determinism, networking, lobbies, or servers are involved.
7. The connected source, tests, issue, pull request, and decision owner.

Use `CONTRIBUTING.md` as a public entrypoint, not a substitute for these rules. Ask before selecting material product direction when the goal or acceptance criteria are absent.

## 3. Current product boundary

- The rejected playable prototype remains in the published tag/release `v2026.8.15`, Git history, and temporarily preserved prototype-era source used by historical regression tests. It is not the working-tree product baseline, public entry point, or Pages payload. Treat the published tag and release as immutable by project policy; do not imply that the hosting platform has technically locked them.
- The current public runtime is a minimal HTML/CSS/JavaScript redesign status page plus a script-free mood-reference gallery with eight local WebP references. It has no gameplay, Canvas renderer, build step, or runtime package dependency.
- The active implementation deliverable remains Phase 0 in `docs/REDESIGN.md`; the approved Phase 1A brief permits replacement reference creation only. No redesigned gameplay feature is implemented or shipped yet.
- The status page and `concepts/` gallery must work by opening their HTML entry points directly and from the `/Aeon-of-Kingdoms/` GitHub Pages subpath. The future game inherits that delivery constraint unless an approved phase changes it.
- Multiplayer, signaling, TURN, matchmaking, accounts, hosted persistence, and a dedicated server are planned, not shipped. GitHub Pages and Actions are never described as a server.
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

The Phase 0 entries below own the current transition and review candidate. No gameplay source boundary is approved yet; each later phase must record the smallest actual ownership map when it introduces replacement code. Prototype-era design documents remain historical until explicitly replaced.

| Area | Source of truth |
| --- | --- |
| Interim public content and semantics | `index.html` |
| Interim presentation | `css/status.css` |
| Interim enhancement and service-worker registration | `js/status.js` |
| Reviewed mood-reference content and feasibility boundary | `concepts/index.html` |
| Mood-reference presentation | `concepts/gallery.css` |
| Optimized mood-only visual references | `concepts/images/*.webp` |
| Explicit Pages delivery allowlist | `.github/scripts/stage-pages.js` |
| Active redesign, phases, and approval gates | `docs/REDESIGN.md` |
| Intended future experience after its redesign rewrite | `docs/GAME_DESIGN.md` |
| Future runtime boundaries after redesign | `docs/ARCHITECTURE.md` |
| Multiplayer protocol and infrastructure plan | `docs/NETCODE.md` |
| Current maturity and evidence | `docs/STATUS.md` |
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

Exact values belong only in `js/config.js`. Product rationale belongs in `docs/GAME_DESIGN.md`.

## 8. Networking boundary

Read `docs/NETCODE.md` before changing a command schema or deterministic rule. A host-authoritative ordered command stream with periodic hashes and bounded snapshots is the leading research model, but transport and topology remain subject to the approved networking-phase spike.

- Do not add a networking library until its exact version, license, provenance, signaling/relay behavior, privacy boundary, CSP needs, and failure modes are reviewed.
- Do not put credentials, reusable seat tokens, TURN secrets, or cloud configuration in client source, URLs, logs, screenshots, issues, or commits.
- Treat every remote value as hostile: validate type, range, ownership, sequence, tick, count, and encoded size before allocation or lookup.
- A P2P host can cheat and can end a match. UI and documentation must not imply competitive server authority.
- Host migration, public matchmaking, chat, reconnect, spectators, and join-in-progress are separate features, not incidental additions.

Do not weaken deterministic local behavior to make an early transport demo appear functional.

## 9. Verification

- Add a deterministic regression for every fixed defect or changed rule.
- Use Node.js built-ins only. The verification harness installs no dependency and makes no network request.
- Run focused checks while iterating, then `node tests/run.js` on the frozen candidate.
- Run `git diff --check`, inspect `git status --short`, and review the complete diff against the current base.
- Verify every runtime script appears exactly once and in dependency order; every local reference resolves; Pages stages only its explicit allowlist; and no external runtime resource slipped in.
- Browser-shell and Node VM tests are not rendered browser play. Simulated touch is not a physical phone. A Pages deployment is not proof of a successful match.
- Report automated, rendered, local manual, deployed, cross-network, and physical-device evidence separately. Missing categories are acceptable when accurately marked pending.

Never weaken, skip, or delete a test to hide a defect. Never claim a check, deployment, screenshot source, device, player count, or network condition that was not observed.

## 10. Documentation ownership

| File | Purpose |
| --- | --- |
| `README.md` | Short public introduction, real visuals, controls, local run, links |
| `CONTRIBUTING.md` | Concise contributor workflow |
| `docs/REDESIGN.md` | Active redesign contract, phases, gates, and deferred enhancements |
| `docs/STATUS.md` | Current maturity, evidence, known limits, next boundary |
| `docs/ARCHITECTURE.md` | Runtime data flow and file ownership |
| `docs/GAME_DESIGN.md` | Vision, loop, roles, maps, sites, modes, presentation |
| `docs/NETCODE.md` | Planned protocol, authority, transport, infrastructure and threat boundary |
| `docs/ASSETS.md` | Inventory, provenance, art rules and capture gate |
| `tests/README.md` | Stable suite map and manual evidence matrix |
| `AGENTS.md` | Enduring contributor and publication contracts |
| `SECURITY.md` | Supported boundary and responsible reporting |
| `CHANGELOG.md` | Player-visible runtime history |

Update every affected owner in the same coherent change. Do not use durable documents as task logs, duplicate the same status across several files, or turn roadmap text into an implemented claim.

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
- Do not force-push shared history, bypass required checks, self-approve where independent approval is required, expose credentials, or move/delete published tags and releases.
- Before review, compare the complete branch against the current base and rerun required checks on the final candidate.
- Delete a branch only after proving it is not protected or active and its work is reachable from the default branch or an unchanged merged pull request.

If authentication, permissions, branch ownership, or publication state is uncertain, stop and ask instead of guessing.
