# Aeon of Kingdoms contributor instructions

Read this file in full at the start of every task, before inspecting or changing the project. Re-read it after changing branches or updating this file. It is the canonical handoff for human and AI contributors who do not have earlier conversation context.

## 1. Priorities

Apply these priorities in order:

1. Preserve user intent, working behavior, accessibility, deterministic rules, and player data.
2. Choose the smallest complete solution with a clear owner.
3. Keep simulation and delivery bounded, fast, secure, and inspectable.
4. Reuse the shared rules core across skirmish, campaign, AI, replay, and future networking.
5. Verify honestly and distinguish source, automated, rendered, deployed, and physical-device evidence.

Before editing, inspect `git status`, the connected source path, its tests, and its canonical documentation. Preserve unrelated work. Never infer current behavior from filenames, mockups, roadmap text, or old release notes alone.

## 2. Cold start

Read in this order:

1. This file in full.
2. `docs/STATUS.md` for current maturity, evidence, and active boundary.
3. `docs/GAME_DESIGN.md` for player intent and `docs/ARCHITECTURE.md` for ownership.
4. `tests/README.md` for the verification and manual-acceptance map.
5. `docs/NETCODE.md` only when commands, determinism, networking, lobbies, or servers are involved.
6. The connected source, tests, issue, pull request, and decision owner.

Use `CONTRIBUTING.md` as a public entrypoint, not a substitute for these rules. Ask before selecting material product direction when the goal or acceptance criteria are absent.

## 3. Current product boundary

- The repository currently owns a local playable vertical slice: a capture-focused battlefield, deterministic AI, skirmish, and one authored campaign setup.
- The runtime is plain local HTML, CSS, classic JavaScript, and Canvas. It has no build step or runtime package dependency.
- The game must work by opening `index.html` directly and from the `/Aeon-of-Kingdoms/` GitHub Pages subpath.
- Multiplayer, signaling, TURN, matchmaking, accounts, hosted persistence, and a dedicated server are planned, not shipped. GitHub Pages and Actions are never described as a server.
- The engine and map schema may support 2, 4, or 6 local factions before those layouts have complete multiplayer or balance evidence. Report those categories separately.

Do not expand the slice into an account system, content pipeline, framework migration, live service, or speculative abstraction without explicit scope.

## 4. Non-negotiable engineering boundaries

- Authoritative game rules advance through one fixed-step simulation. Rendering, DOM, audio, and wall-clock frame timing do not decide outcomes.
- Human input, deterministic AI, campaign scripting, replay, and future remote input issue validated commands; they do not mutate battle state through private shortcuts.
- Random authoritative decisions use a seeded project source and stable iteration order.
- Every unit, transient effect, queued command, path search, catch-up loop, cached route, and remote payload needs a real enforced cap and deterministic cleanup.
- Population is a hard rule cap. Recruitment never creates a unit that exceeds resource, population, ownership, or spawn-space requirements.
- Keep all runtime resources local and repository-relative. No CDN, analytics, telemetry, dynamic code, hidden external font, or unreviewed network request.
- Preserve a restrictive Content Security Policy. Any future `connect-src` exception requires a reviewed transport and documented domain/failure/privacy boundary.
- Preserve keyboard, pointer, touch, dialog focus, visible focus, status text, reduced-motion, pause, resize, and lifecycle input cleanup.

## 5. Code quality

- Prefer direct functions and small data contracts over frameworks, managers, event buses, service layers, loaders, inheritance trees, or speculative plugin systems.
- Give every source one understandable responsibility. Split a file only when the new interface is smaller and ownership becomes clearer; line count alone is not a reason.
- Use domain names. Avoid vague names such as `data`, `manager`, `helper`, `thing`, or unexplained abbreviations when a specific game term exists.
- Keep one source of truth for tuning, map definitions, rosters, status, versions, and release evidence. Do not create convenience mirrors without an enforced synchronization test.
- Comments explain intent, units, invariants, protocol fields, or browser constraints. They do not narrate syntax or preserve stale alternatives.
- Keep hot fixed-step and render paths allocation-conscious. Prefer stable arrays, reused buffers, and spatially bounded queries when measurement or scale justifies them.
- Optimize observed work and clear asymptotic risks; do not reduce clarity for unmeasured micro-optimizations.
- Remove code, selectors, assets, tests, or documentation only after searching references and proving they are unused. Do not retain compatibility shims for hypothetical callers.

## 6. Ownership map

| Area | Source of truth |
| --- | --- |
| Factions, roles, maps, balance, timings, fixed limits | `js/config.js` |
| Deterministic primitives, geometry, random and spatial/path utilities | `js/core.js` |
| Battle state, commands, movement, capture, economy, combat, objectives | `js/simulation.js` |
| Computer-player command selection | `js/ai.js` |
| Canvas projection, procedural art, camera, interpolation, visual effects | `js/render.js` |
| Pointer, touch, keyboard, selection, order and camera intent | `js/input.js` |
| Startup, modes, frame scheduling, pause, UI projection and lifecycle | `js/game.js` |
| Design tokens | `css/tokens.css` |
| Responsive component presentation | `css/app.css` |
| Intended experience | `docs/GAME_DESIGN.md` |
| Runtime boundaries | `docs/ARCHITECTURE.md` |
| Multiplayer protocol and infrastructure plan | `docs/NETCODE.md` |
| Current maturity and evidence | `docs/STATUS.md` |
| Asset inventory, provenance and visual rules | `docs/ASSETS.md` |

Put new behavior in its current owner. Shared code must have at least two proven callers or remove a real ownership conflict.

## 7. Gameplay invariants

- Internal roles are stable engine identifiers; faction-specific public unit names and silhouettes remain free to differ.
- Captured sites change income, forward recruitment, or objective state. They do not bypass Aether price, population, ownership, or spawn validation.
- Headquarters elimination remains valid in every mode. Alternate modes add objective wins; they do not make headquarters immortal.
- Group movement uses distributed destinations. Formation slots, separation, attack positions, and large footprints must not send every unit to one coordinate.
- Navigation and local avoidance use stable tie-breaking. A deterministic replay with the same configuration, seed, and commands must reach equivalent authoritative state.
- AI issues legal player commands and observes the information boundary chosen for the mode. It receives no hidden mutation path.
- A mode composes objectives around shared simulation rules; it does not fork economy, combat, pathfinding, or capture into a parallel implementation.
- Essential state is readable outside the Canvas. Color, glow, and animation are never the only indicator of owner, selection, damage, target, or disabled state.

Exact values belong only in `js/config.js`. Product rationale belongs in `docs/GAME_DESIGN.md`.

## 8. Networking boundary

Read `docs/NETCODE.md` before changing a command schema or deterministic rule. The planned first model is a host-authoritative ordered command stream over WebRTC, with periodic hashes and bounded snapshots; a dedicated WebSocket authority may implement the same protocol later.

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

`VERSION.txt` is the only canonical runtime version. Required mirrors are the README badge, current changelog heading, and service-worker cache label; any future visible in-game label becomes another tested mirror.

Calendar version labels use the actual Europe/Zagreb publication date:

- first release that day: `vYYYY.M.D`, without leading zeroes;
- later releases that day: `vYYYY.M.Da`, `vYYYY.M.Db`, and so on;
- inspect tags and history first; never reuse or move a published label.

A **candidate** is tested source. A **deployment** is a Pages publication of a commit. A **release** is an intentional immutable Git tag, optionally with a GitHub Release. A version string or changelog heading alone proves none of the latter two.

For a public runtime release:

1. Choose the unused label for the actual date and update `VERSION.txt` first.
2. Synchronize and test every required mirror.
3. Update player-facing changelog and affected canonical documents.
4. Freeze the candidate and run the complete verification and applicable manual matrix.
5. Publish through the repository's protected workflow.
6. Verify Pages, the live version, console cleanliness, and a real short Play action after deployment.
7. Create an immutable tag only when the owner intends to publish the release.

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
