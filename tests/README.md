# Aeon of Kingdoms verification

The active source boundary is a non-playable redesign status page, a reviewed mood-reference archive, and a separate Phase 1A production-feasibility proof awaiting owner approval. Verification proves that these communication surfaces are truthful, local, bounded, accessible, and staged exactly; exact live bytes establish deployment but do not validate redesigned gameplay, approve a production visual method, or replace physical-device review. The rejected `v2026.8.15` prototype and its old tests remain historical evidence only.

Run the complete dependency-free verification from the repository root:

```sh
node tests/run.js
```

Node.js 20 or newer is used only for local and continuous verification. The suite installs no package and performs no external network request.

## Active suite map

| Suite | Current responsibility |
| --- | --- |
| `audit.test.js` | Required project files, canonical version mirrors, status-page CSP and local resources, documentation truth, zero dependencies, workflow permissions, and the exact Pages allowlist |
| `browser-smoke.test.js` | Status-page semantics, enhancement safety, responsive/focus/reduced-motion contracts, service-worker lifecycle, and local delivery from the `/Aeon-of-Kingdoms/` Pages subpath |
| `concept-gallery.test.js` | Superseded mood/production-target boundaries, semantic image review, optimized local WebP budgets, gallery CSP, and exclusion from the offline service-worker shell |
| `feasibility-gallery.test.js` | Phase 1A gate language, exact structures and representative roles, practical viewport cues, raster/SVG integrity and budgets, diagram safety, and staged delivery |

## Historical regression suites

The following suites still exercise preserved prototype source so its history remains inspectable during cleanup: `ai-completion.test.js`, `checksum.test.js`, `combat-navigation.test.js`, `core.test.js`, `hud.test.js`, `input.test.js`, `map-balance.test.js`, `simulation.test.js`, and `site-ownership-render.test.js`. A pass is not evidence for the redesign and must never be reported as current gameplay acceptance.

The old six-faction visual-capture fixture and manually triggered workflow are also historical. They are not a capture path for the Phase 0 page or an approved visual reference. Later phases add new focused suites and rendered fixtures only after their product gate is approved.

`tests/run.js` discovers every `*.test.js` file in stable filename order and runs them with Node's built-in test runner. Never omit an active test to hide a failure; remove a historical suite only in the approved phase that replaces or deletes its source owner.

## Final transition-candidate checks

1. Run focused active tests while integrating the status page.
2. Freeze the complete candidate and run `node tests/run.js`.
3. Run `node .github/scripts/stage-pages.js _site` and verify the stage contains only `.nojekyll`, the four-file status shell, the two public status documents, and the explicitly allowlisted mood and Phase 1A review surfaces: 24 public files total.
4. Confirm no prototype script, style, manifest, icon, gameplay capture, release file, test, or repository configuration enters `_site`.
5. Run `git diff --check`, inspect `git status --short`, and review the complete diff against the current base.
6. Complete the applicable observations below. Keep source, simulated, rendered, deployed, and physical-device evidence separate.

The `_site` directory is generated delivery output and must not be committed.

## Current manual acceptance

| Area | Required observation |
| --- | --- |
| Direct-file baseline | Open `index.html` through `file://`; confirm the title, rejected-prototype notice, phase status, roadmap/status links, and repository link remain readable without a failed local resource or console error |
| Local Pages subpath | Serve the candidate under `/Aeon-of-Kingdoms/`; confirm both documentation links, focus behavior, status enhancement, and service-worker registration use the repository subpath correctly |
| Responsive status | Inspect representative narrow, wide, portrait, and landscape viewports; confirm the informational page remains readable without claiming that portrait gameplay is supported |
| Mood-reference gallery | Follow the visible status-page route; load all eight references; open one full-size image; use the back link; and inspect 320 px reflow, 200% zoom, desktop, phone portrait/landscape, keyboard focus, captions, and image-loading failures without treating the result as gameplay evidence or production-target approval |
| Phase 1A proof | Open `concepts/feasibility/` at desktop and compact phone widths; inspect all six proof assets, section links, keyboard focus, 200% zoom/reflow, minimum silhouettes, structure labels, map layers, animation poses, and non-color state cues. Record rendered and physical-device observations separately; this is not gameplay or an atlas measurement |
| Accessibility | Navigate every link by keyboard; verify semantic headings, visible focus, sufficient contrast, motion preference, zoom/reflow, and understandable status without color or animation |
| Offline/cache | After one successful local or deployed load, verify the bounded status shell can reopen offline and activation removes older `aok-shell-*` prototype caches without deleting unrelated origins' caches |
| Staged delivery | Inspect generated `_site`; verify its exact allowlist and open that staged copy before publication |
| Published transition | After Pages deployment, open the exact URL, record the deployed commit, verify the canonical `VERSION.txt` value, follow the concept and documentation links, inspect the console, and confirm no rejected gameplay shell or stale service-worker view appears |
| Rollback readiness | Record the last known-good commit and confirm the protected workflow can redeploy it without moving or deleting the published `v2026.8.15` historical tag, which project policy treats as immutable |

## Future gameplay evidence

The repeatable landscape, map, entity movement, production/rally, combat, AI, determinism, performance, visual, and physical-device scenarios live in [`../docs/REDESIGN.md`](../docs/REDESIGN.md). They become active only in their approved phases. Cross-network multiplayer remains unimplemented and untested.

## Evidence boundary

Static audits and Node/browser-smoke fixtures cannot prove rendered quality, browser cache replacement, live Pages content, a physical device, game feel, or networking. A workflow badge, source version, or changelog heading does not establish a deployment, published tag, or GitHub Release. Record unobserved categories as pending, not passed.
