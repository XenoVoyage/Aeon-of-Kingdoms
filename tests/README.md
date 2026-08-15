# Aeon of Kingdoms test suite

Run the complete dependency-free verification from the repository root:

```sh
node tests/run.js
```

The browser game does not need Node.js. Node.js 20 or newer is used only for local and continuous verification; the suite installs no package and performs no external network request.

## Suite map

| Suite | Responsibility |
| --- | --- |
| `ai-completion.test.js` | JSON-safe AI strategy state, stable target selection, objective recovery, and bounded 2-/4-player match progress |
| `audit.test.js` | Required files, canonical version mirrors, zero dependencies, CSP and local resources, script order, documentation links, least-privilege workflows, explicit Pages allowlist, and honest multiplayer status |
| `browser-smoke.test.js` | Semantic shell hooks, classic-script syntax, responsive/focus/reduced-motion contracts, and local delivery from the `/Aeon-of-Kingdoms/` Pages subpath |
| `checksum.test.js` | Canonical authoritative-state hashing, configuration/command sensitivity, replay stability, cosmetic exclusions, and invalid-state rejection |
| `combat-navigation.test.js` | Simultaneous combat fairness, tie attribution, dense multi-ring attack approaches, and living-structure exclusion |
| `core.test.js` | Deterministic math, seeded random behavior, geometry, paths, spatial primitives, and fixed utility contracts |
| `hud.test.js` | Rival objective warnings and non-overlapping compact HUD control regions |
| `input.test.js` | Touch slop, drag/pinch safety, pointer cancellation, keyboard commands, and lifecycle cleanup |
| `map-balance.test.js` | Equal nearest-site opening geometry, mirrored player sets, inward headings, and obstacle/site clearance |
| `simulation.test.js` | Commands, fixed-step state, population/economy, capture, recruitment, combat, AI-facing rules, victory, limits, and reproducibility |
| `site-ownership-render.test.js` | Persistent numbered ownership cues for captured sites on the battlefield and minimap |

`tests/run.js` discovers every `*.test.js` file in stable filename order and runs them with Node's built-in test runner. Add a focused suite when a new responsibility cannot fit an existing owner; never silently omit a test from a hand-maintained list.

## Final candidate checks

1. Run focused tests while iterating.
2. Freeze the complete candidate and run `node tests/run.js`.
3. Run `node .github/scripts/stage-pages.js _site` and inspect the staged file list when delivery changes.
4. Run `git diff --check`, inspect `git status --short`, and review the complete diff against the current base.
5. Complete applicable manual rows below and record only what was observed.

The `_site` directory is generated delivery output and must not be committed.

## Manual acceptance matrix

| Area | Required observation |
| --- | --- |
| Direct-file baseline | Open `index.html` through `file://`; start Skirmish, select, box-select, move/attack, recruit, capture, pause/resume, finish or restart, and confirm no failed local resource or console error |
| Pages subpath | Open the candidate or deployed `/Aeon-of-Kingdoms/` URL and repeat a short Play action without root-relative resource failures |
| Desktop controls | Exercise click, drag selection, Shift additive selection, right-click order, WASD/arrows, wheel zoom, Space/middle pan, Escape, dialogs, and visible focus |
| Touch controls | On a physical phone/tablet in landscape, exercise tap selection/order, one-finger pan, pinch zoom, on-screen zoom/home, pause, rotation, background/foreground, and capture-loss cleanup |
| Accessibility | Navigate start and pause UI by keyboard; verify dialog focus, live resources/population/objective text, non-color faction/state cues, zoom behavior, and reduced-motion preference |
| First Light | Complete the authored preset and verify its setup/objective is distinct and returns cleanly to the menu; do not describe it as a campaign sequence |
| Dense movement | Send a capped force through narrow routes and around a target; inspect formation stability, recovery from congestion, large footprints, and absence of one-coordinate attack piles |
| Sites and economy | Contest each site type, tie/interrupt capture, lose and retake ownership, recruit from an eligible forward site, and verify Aether/population restrictions |
| Modes | For each actually exposed mode, verify objective progress, headquarters elimination, simultaneous/tie handling, and a single deterministic outcome |
| Player layouts | Start 2-, 4-, and 6-faction local setups; inspect spawn fairness, early economy access, AI activity, UI ownership colors, sustained performance, and end conditions separately |
| Long run | Play a population-capped match through repeated captures and combat; inspect memory, frame pacing, collection cleanup, AI, and path-search stability |
| Published runtime | After deployment, open the exact Pages URL on desktop and touch where available, select **Play**, issue orders, and record the deployed commit and observed result |

## Evidence boundary

The browser smoke uses Node parsing and a local HTTP server; it does not render Canvas, execute layout, simulate a real browser event stack, or judge game feel. Core and simulation tests can prove deterministic contracts under their fixtures, not whether the art is clear or the balance is enjoyable. Simulated pointer or viewport checks never count as physical-device acceptance.

Report these categories separately:

- source/static audit;
- deterministic Node simulation;
- simulated browser shell or delivery;
- rendered local browser;
- deployed Pages browser;
- physical desktop/touch device;
- real cross-network multiplayer, once that feature exists.

An unobserved category is pending, not passed. Never infer live evidence from a successful workflow badge.
