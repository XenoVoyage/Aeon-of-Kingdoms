# Phase 7 product-hardening contract

Status: **frozen contract on 2026-08-22; the bounded implementation candidate is published and one named cloud-Chrome desktop review is recorded, while corrected-artifact/direct-byte evidence, material owner decisions, unavailable browser/device evidence, root promotion, and closure remain pending**.

This document owns the exact Phase 7 boundary after Phase 6 closes. It hardens the approved one-map, two-faction, local human-versus-computer skirmish without changing its authoritative rules or adding later content. [`STATUS.md`](STATUS.md) remains the sole owner of the active phase, commit, deployment, observed evidence, and Engineering Standard adoption state. [`REDESIGN.md`](REDESIGN.md) remains the owner of the phase sequence and final gate.

Phase 7 may execute every bounded source, automated, staged, deployed, and cloud-rendered check available to the agent. It may not convert cloud emulation into a physical-device claim, infer an unavailable browser result, or select the material product decisions listed below. The complete local slice is not promoted over the repository root status page until the product owner explicitly approves that promotion.

## Entry boundary and inherited locks

Phase 7 starts from the exact closed Phase 6 local skirmish. The volatile closure commit and evidence belong only in [`STATUS.md`](STATUS.md); this contract does not duplicate them.

- Map: the approved two-player `Moonfall Crossing` battlefield.
- Players: `You · Astral Concord · ◇ Azure` and `Computer · Gravebound Court · ✕ Violet`.
- Rules: the unchanged fixed 20 Hz Phase 5 combat/economy simulation, nine-command validator, replay, snapshot, checksum, and headquarters-elimination outcome.
- AI: the unchanged deterministic no-cheating Phase 6 Standard planner, observation boundary, three task forces, legal-command facade, and composite checkpoint.
- Content: the six approved representatives, five structure instances, exactly three structure categories, Standard and Compact art tiers, approved menu, map-dominant HUD, and six ordered battlefield layers.
- Viewport: landscape only, 4:3 through 21:9 inclusive, minimum 640×360 CSS pixels, deliberate letterboxing outside the supported ratio, `env(safe-area-inset-*)` plus 12 CSS pixels, and a portrait rotate gate rather than a portrait game layout.
- Assets: local repository-relative resources only, canonical baked full-body entity art, exact mirrored left facing, frame-aligned player-color masks, and the closed loading/failure boundaries.
- Security: no dependency, external resource, telemetry, analytics, dynamic code, account, or network request. `connect-src 'none'`, `media-src 'none'`, and the other restrictive CSP owners remain in force unless a separately approved later contract changes them.

Closed Phase 2 through Phase 6 routes remain closure evidence and must not be rewritten merely to make Phase 7 easier. Product-hardening source belongs on a separate local `phase7/` route and may reuse the closed modules. Any authoritative snapshot or checksum difference from Phase 6 is a regression unless an earlier approved rule owner is explicitly amended; this contract authorizes no such amendment.

## Exact Phase 7 scope

The implementation scope is limited to these responsibilities:

1. Harden semantic state, focus, keyboard operation, readable feedback, color-independent cues, reduced-motion presentation, zoom/reflow, safe areas, and minimum control sizing around the unchanged match.
2. Harden portrait, resize, orientation-lock, fullscreen-failure, visibility, focus-loss, BFCache, teardown, and menu-return behavior so the human input facade, AI state machine, and authoritative simulation suspend and resume together.
3. Exercise the unchanged rules at their existing population, structure, projectile, queue, command, path, AI, replay, checkpoint, and presentation caps; repair unbounded growth or cleanup defects without increasing a cap to hide one.
4. Record exact decoded-image and canvas-backing-store arithmetic separately from observed browser/GPU memory, and verify that loading one art tier does not retain the other tier or the menu artwork during battle.
5. Complete the source, cloud-rendered, deployed, browser-family, and physical-input evidence rows that are actually observable, with every unavailable row kept explicit.
6. Present an owner-ready complete local slice on its direct Phase 7 route. Root promotion is a later, explicit owner gate rather than an automatic side effect of source completion or deployment.

Phase 7 does not rebalance combat, economy, production, movement, or AI; add a difficulty; create a new objective mode; add a map, faction, representative, ability, structure, score, campaign mission, tutorial story, account, room, server, signaling service, relay, transport, or matchmaking path; weaken CSP; add a runtime dependency; or create a Git tag or GitHub Release.

## Material decisions that remain with the owner

The following choices materially affect the product and are not inferred from a disabled control, an RTS convention, or an implementation convenience. Autonomous work may prepare no hidden substitute for them.

| Decision | Frozen boundary until the owner decides |
| --- | --- |
| Audio identity and assets | Audio stays truthfully unavailable and `media-src 'none'` remains. No music, ambience, voice, effect, generated placeholder, asset provenance, mix, mute default, or volume model is selected. An owner decision must either approve an audio contract or explicitly defer audio beyond this slice before Phase 7 closure is claimed. |
| Onboarding | Existing labels and control help may be clarified for accessibility, but no tutorial narrative, campaign framing, guided sequence, mandatory prompt, character voice, or new mechanic is invented. The owner must approve an onboarding contract or explicitly defer it. |
| Options persistence | No cookie, Web Storage, IndexedDB, URL-state, service-worker data store, account storage, or server storage is added. The owner must decide whether any option persists, for how long, and how it is reset before persistence work begins. |
| Keyboard-only spatial play | Existing semantic controls, camera keys, and tactical shortcuts are hardened and tested. Phase 1B approved pointer/touch spatial selection and targeting; it did not choose an alternate keyboard-only entity-selection and map-destination model. That interaction requires an explicit owner decision rather than a hidden key scheme. |
| Reference physical devices | The browser-family matrix is locked, but exact desktop, phone, and tablet hardware, OS versions, and available input peripherals are not. The owner must designate or supply the named physical sessions; cloud viewport emulation is not a substitute. |
| Thermal and sustained-performance thresholds | No numeric temperature, battery, frame-time, power, or throttling budget is invented without reference hardware and an approved measurement method. Source caps and deterministic timing remain exact; physical observations record actual values and symptoms without relabelling them as an approved budget. |

A later owner decision changes this document explicitly before its implementation. Merely leaving one of these rows pending cannot be reported as passing it.

## Dependency-free executable checks

Phase 7 adds one focused Node built-in suite, `tests/phase7-product-hardening.test.js`. It may use the existing browser-shell fakes and Node VM fixtures, but it installs no package, starts no network service, and makes no external request. The focused suite, inherited Phase 3 through Phase 6 suites, and `node tests/run.js` must all pass on the same frozen tree.

### Semantic accessibility and color-independent state

Source and VM checks must prove the following source-owned semantic and state relationships. Actual CSS layout and the browser's native sequential-focus algorithm are explicitly routed to rendered-browser evidence below rather than simulated in Node.

- Begin, Settings, fullscreen, art tier, camera, tactical commands, structure inspection, production, queue cancellation, rally, pause, navigation, menu return, load failure, viewport gates, and match result have semantic DOM text or accessible names outside Canvas.
- Live selection, command rejection, queue/progress/blocked state, Resource, population, objective, pause, and match outcome use appropriate readable status text; Canvas pixels are never their only representation.
- Owner uses faction/player text plus the stable `◇` or `✕` symbol; selection uses its own outline and Selected text; hostile target uses its own target geometry/text; health and damage use numeric/text state plus the approved damage treatment; disabled controls use native disabled state and readable reason/state; queue and objective state are not color- or animation-only.
- Replacing or suppressing ownership hue in a renderer fixture does not remove the owner symbols, labels, selection geometry, target geometry, health state, objective, or disabled state.
- Every interactive control is covered by an authored minimum target box of 44×44 CSS pixels unless it is a native text/select control whose containing labelled target owns that minimum. Source checks resolve the applicable authored rules; rendered-browser journeys measure actual computed rectangles at every supported cloud viewport.
- Heading, landmark, label/control, dialog-title, described-by, live-region, progress, pressed-state, disabled-state, and hidden/inert relationships resolve to unique identifiers. No decorative Canvas or image enters the accessibility tree.
- Asset-load failure blocks match creation, exposes a stable alert and menu recovery, and never substitutes external, wrong-tier, maskless, geometric, or rigged art.

Automated semantics do not prove a screen-reader session, contrast under a physical display, or subjective legibility. Those remain rendered or physical observations.

### Reduced motion

- `prefers-reduced-motion: reduce` removes optional CSS transitions/animations and suppresses or shortens optional trails, flashes, and camera-only motion without hiding target, health, damage, queue, outcome, selection, or ownership cues.
- Changing the media query at runtime updates presentation only. It cannot submit a command, advance or pause authoritative time, alter AI cadence, reseed state, change hit/contact timing, change a replay receipt, or change a composite checksum.
- A fixed seed and command log produce byte-equivalent authoritative snapshots and composite checksums with reduced motion both off and on.
- Reduced-motion listeners are installed once, removed at teardown, and not multiplied by three consecutive Begin → Menu cycles.

### Keyboard and focus

- Source checks preserve native DOM order by rejecting positive `tabindex`, verify semantic control relationships, and prove visible programmatic recovery never chooses a hidden gate, hidden tray, hidden screen, or disabled control. Actual Tab and Shift+Tab sequencing, native Enter/Space activation, and native dialog focus trapping are rendered-browser evidence.
- Opening and closing Settings traps focus only while the native dialog is open and returns focus to its invoker. Begin focuses the battlefield application; Menu and load failure return focus to a visible recovery control.
- Arrow keys remain the collision-free required camera-pan path. Existing `M`, `F`, `X`, `D`, `G`, and `S` tactical shortcuts retain their labelled intent when the battlefield owns focus and their action is legal. Existing W/A/S/D camera aliases may act only when that same key was not consumed by a tactical shortcut; one key event may cause at most one camera or tactical action.
- Escape clears transient pointer/touch/context mode without submitting a command. Blur, portrait entry, pause, visibility loss, and teardown clear held keys and cannot replay a stale key after resume.
- Keyboard activation of production, queue cancellation, structure inspection, camera buttons, pause, navigation, fullscreen, and menu return is covered in the VM journey. Full keyboard-only spatial selection/destination remains the explicit owner decision above.

### Viewport, zoom, and safe areas

The pure viewport/camera functions retain exact checks at 1440×900 desktop, 1024×768 tablet landscape, 844×390 phone landscape, the 640×360 minimum, 640×480 at the 4:3 boundary, 1680×720 at the 21:9 boundary, 3000×1000 outside the maximum ratio, 639×360 and 640×359 below minimum, 390×844 portrait, and 640×640 square/portrait. Tests verify play-rectangle arithmetic, letterbox offsets, camera bounds, focus-centred wheel/button/pinch zoom, reset, coordinate translation, gesture rejection in bars, and the portrait/size gates.

Rendered browser evidence then repeats the primary journey at 1440×900, 1024×768, 844×390, 640×360, 1680×720, 3000×1000, and 390×844 CSS pixels in both art tiers where the viewport is playable. It verifies:

- no horizontal document overflow, clipped essential control, or control drawn inside a letterbox bar;
- every visible interactive target has an actual computed rectangle of at least 44×44 CSS pixels at each named viewport, using its labelled container for the documented native-control exception;
- Tab and Shift+Tab traverse enabled controls in DOM order, skip disabled/hidden/inert controls, preserve visible focus, and remain trapped by the open native Settings dialog; Enter and Space activate the focused native control;
- safe-area variables remain `env(safe-area-inset-*)` plus 12 CSS pixels and the observable inset, when the environment exposes one, is recorded rather than guessed;
- entity/structure/selection/target/health/queue text remains readable at minimum, authored-home, and maximum camera zoom;
- an actual 200% browser-zoom journey beginning from a 1440×900 browser viewport remains operable at its resulting CSS viewport, without using a CSS transform as evidence;
- portrait hides and makes the battlefield inert, shows only the rotate gate, and exposes no working hidden command control.

Cloud emulation proves only the named browser and CSS viewport. It does not prove a tablet, phone, display cutout, touch digitizer, operating-system zoom, or physical rotation.

### Orientation, lifecycle, and fullscreen failure

The source harness must exercise unsupported APIs, synchronous throws, Promise rejection/user denial, and successful settlement for fullscreen and orientation lock.

- Requests occur only after a user gesture. When fullscreen-on-begin is selected, landscape lock is attempted only after the fullscreen request settles; otherwise it is attempted directly after Begin.
- Unsupported or rejected fullscreen/orientation lock is non-fatal in a supported landscape viewport, produces no unhandled rejection, leaves semantic controls operable, and never bypasses the portrait gate.
- Entering portrait, an undersized viewport, Pause, `document.hidden`, window blur, BFCache `pagehide`, or teardown clears transient input and suspends human command submission, AI planning, authoritative advancement, and presentation work according to the closed lifecycle owner.
- BFCache `pageshow` restores only a persisted session, installs no duplicate listener or animation loop, recomputes the viewport, and remains paused if the page is still portrait/hidden. Ordinary `pagehide` performs teardown and cannot resume a destroyed match.
- Returning to valid landscape resumes only from the exact stored state after transient reset. A checksum taken before suspension matches the first checksum before the next deliberate authoritative tick.
- Completed matches, replay playback, asset failure, and Menu state cannot leave a live AI planner, simulation loop, pointer capture, held key, decoded asset reference, fullscreen/orientation lock, or scheduled animation frame behind.

Cloud browser journeys cover resize/portrait emulation, visibility where the surface exposes it, fullscreen grant or denial where the surface exposes it, console cleanliness, and menu recovery. Actual operating-system rotation, mobile browser chrome, background eviction, hardware gesture cancellation, and installed/fullscreen recovery remain physical-device evidence.

### Long-match, caps, cleanup, and memory arithmetic

- Retain the Phase 6 passive-opponent regression: seed `0x4a0e2026` ends in a computer victory at tick 3,715, below the existing 12,000-tick / 10-minute evidence ceiling.
- Add a test-only 12,000-tick soak using the unchanged public simulation/command/checkpoint APIs and unchanged runtime configuration. It may construct a seeded fixture, but cannot add a shipping mode, invulnerability rule, alternate cap, private mutation path, or Phase 8 objective. At every sampled tick, every authoritative and AI collection remains at or below its canonical configuration cap and every identifier/reference validates.
- Exercise exact-at-cap and one-over-cap cases wherever the approved public data contract can validly reach both sides: population, structures, production queues, pending commands, tactical selection, projectiles, event/threat collections, path/navigation work, AI request batches, and replay command count. For internal AI candidate/probe loop guards and the legacy-named `*ByteCap` encoded-length ceilings on snapshots, replay, AI state, and composite checkpoints, record observed valid maxima in the owning JavaScript canonical-string code units, prove the guard remains in source, and reject bounded ordinary oversized data through the earliest applicable public schema/count/field guard before state mutation. If valid schema-bounded data cannot reach the later encoded-length guard, do not use getters, proxies, alternate caps, semantically meaningless padding, or private mutation merely to fire it.
- Restore and continue representative early, production, defense, regroup, pre-assault, and completed states. Future accepted receipts, checksums, outcomes, and cleanup converge with uninterrupted play.
- Three Begin → active match → Menu cycles leave exactly one listener set during a match and none of the match-owned listeners, animation frames, pointer captures, transient collections, menu image, decoded masks, non-selected art tier, battle images, or canvas backing stores retained after final teardown.
- Composite checkpoint encoding remains at or below the inherited legacy-named `checkpointByteCap` value of 1,310,720 canonical-string code units. Encoded length and collection counts are deterministic pass/fail evidence; Node heap usage is not.

Decoded source-image arithmetic is checked separately from browser memory:

| Selected art tier | Retained entity sheets | Retained two-player structure sheets | Ground image | Tracked decoded source-image total |
| --- | ---: | ---: | ---: | ---: |
| Standard | 12,582,912 bytes (12 MiB) | 12,811,776 bytes | 6,293,408 bytes | 31,688,096 bytes |
| Compact | 7,077,888 bytes (6.75 MiB) | 12,811,776 bytes | 6,293,408 bytes | 26,183,072 bytes |

These totals deliberately exclude Canvas backing stores, browser/GPU texture duplication, effects, DOM, JavaScript heap, and browser bookkeeping. The menu image has another 6,293,408 decoded source pixels and must not remain loaded during battle. For each rendered viewport, record each of the six Canvas backing dimensions and compute `width × height × 4 bytes` per Canvas and the exact six-Canvas sum; use the existing render-scale cap rather than assuming device-pixel ratio. Browser memory APIs, if exposed, are recorded as a separate observation and never replaced by this arithmetic.

No numeric frame-time, heap, temperature, battery, or thermal pass budget is introduced here. A crash, unbounded collection, cap breach, failure to dispose, authoritative tick loss, or checksum divergence is still an objective failure. Sustained physical performance and thermal acceptance await the owner-designated hardware and threshold decision.

## Evidence categories and required record

Every result records the exact commit, route, configuration, seed where applicable, browser and exposed version, CSS viewport, physical device/OS when applicable, input method, command or journey, result, console origin, and evidence category. A result satisfies only its own row.

| Category | What may satisfy it | Required Phase 7 record |
| --- | --- | --- |
| Source inspection | Complete diff and direct source review | Closed-module byte identity; one owner per new responsibility; local references; CSP; no Phase 8/9 runtime; no hidden storage/audio/network path |
| Focused automation | `node --test tests/phase7-product-hardening.test.js` | All exact semantic, lifecycle, viewport, checksum, cap, soak, cleanup, and arithmetic assertions pass |
| Inherited/complete automation | Phase 3–6 focused suites and `node tests/run.js` | Same frozen tree passes without weakening or omitting a historical/current suite |
| Staged delivery | `node .github/scripts/stage-pages.js _site` | Exact allowlist and count; only approved local Phase 7 files added; repository-only sources/tests remain excluded |
| Diff hygiene | `git diff --check`, `git status --short --branch`, complete branch-to-base review | Clean frozen candidate with unrelated work preserved |
| Local manual | Direct-file and repository-subpath journeys | Menu, local assets, settings, both art tiers, primary match, failures, focus, pause, teardown, and no external request observed locally |
| Cloud rendered | A named remotely controlled browser and exact CSS viewport | Standard/Compact primary journeys plus the viewport, 200% zoom, reduced-motion, color-independent, lifecycle, console, and fullscreen checks the surface actually exposes |
| Protected/deployed | Pull request, required Actions, Pages deployment, cache-busted HTTP | Exact merged tree, successful required checks, exact live-byte identity, restrictive CSP, local resources, clean Pages-origin console, and primary live journey |
| Browser matrix | Actual browser family and exposed version | Current and previous major Chrome/Edge and Firefox on desktop; current and previous Safari on macOS; current and previous Chrome on Android phone/tablet; current and previous Safari on iPhone/iPad. Unavailable versions remain pending. |
| Physical desktop | Named hardware, OS, browser/version, keyboard and pointer | Full primary journey, focus, keyboard, resize/fullscreen failure/recovery, sustained match, and actual observed performance |
| Physical phone/tablet | Named hardware, OS, browser/version, touch input | Phone-landscape and tablet-landscape selection, contextual attack, two-finger pan, pinch, production/rally, safe area, rotation, fullscreen/background recovery, sustained match, and actual observed performance/thermal behavior |
| Cross-network | Real separate networks | Not applicable to Phase 7; no network runtime exists and no connectivity claim is made |
| Owner decisions | Explicit recorded owner choices | Audio, onboarding, options persistence, keyboard-only spatial interaction, reference hardware, and thermal/performance thresholds are approved or explicitly deferred |
| Root owner gate | Explicit review of the complete local slice | Owner approves replacing the interim root status page; no automation, deployment, or standing technical authorization substitutes for this decision |

Cloud Chrome at a desktop viewport is one rendered row, not the browser matrix. A simulated touch event is one source/browser-input observation, not physical touch. An HTTP 200 or successful Pages workflow is deployment evidence, not a successful match. Arithmetic is not measured browser memory. Missing rows remain `pending` or `unavailable`, never `passed by inference`.

## Frozen journeys

The same candidate tree must complete these named journeys without a Pages-origin warning/error or external request:

1. **Keyboard and failure recovery:** open the direct Phase 7 route, navigate menu and Settings by keyboard, choose each art tier in separate reloads, exercise fullscreen unsupported/rejected behavior, Begin, camera pan/zoom/Home, pause/resume, navigation, producer/queue controls, Menu, asset-load failure recovery, and focus return.
2. **Standard local skirmish:** load Standard art, verify first paint and semantic You/Computer state, exercise human selection/movement/combat/production/rally, observe legal AI production, reserve plus disjoint fronts, capture/raid, defense/recovery, qualified headquarters assault, readable result, pause/lifecycle suspension, and Menu teardown.
3. **Compact local skirmish:** repeat the primary readable-state and lifecycle path with Compact art while proving Standard sheets are not retained.
4. **Viewport and motion:** run the named landscape/letterbox/minimum/portrait viewports, actual 200% browser zoom, reduced motion on/off checksum equivalence, identical-color diagnostic ownership review, portrait suspension, and landscape recovery.
5. **Sustained bounded play:** run the deterministic 12,000-tick source soak and an available real-time rendered match; record configured collection maxima, checkpoint size, source-image/canvas arithmetic, cleanup, and only the performance/thermal observations the environment exposes.
6. **Physical input matrix:** repeat the approved desktop, phone-landscape, and tablet-landscape paths on owner-designated hardware and browser versions. This journey cannot be completed by cloud emulation.

## Implementation candidate record

The `v2026.8.22i` source candidate implements only the authorized product-hardening layer on a separate `phase7/` route:

- `index.html` owns the semantic menu, battlefield controls/status, viewport and load-recovery gates, local-only CSP, and unchanged dependency order through the closed Phase 6 modules.
- `phase7.css` owns safe-area spacing, visible focus, 44-pixel targets, compact reflow that retains enabled controls, and reduced-motion presentation.
- `hardening.js` owns composed suspension reasons, settled app-owned fullscreen/orientation lifecycle, safe focus recovery, decoded-source arithmetic, and exact six-Canvas backing arithmetic without touching simulation or AI state.
- `app.js` owns the hardened shell orchestration: no scheduled frame while suspended, synchronized human/AI/simulation suspension, failure/completion/menu teardown, one selected art tier, semantic target/command/progress state, and zeroed Canvas backing stores after runtime retirement.

The focused dependency-free suite passes 19/19 and the complete dependency-free suite passes 281/281 on the source candidate. It byte-locks the closed Phase 2 through Phase 6 implementation and complete Phase 6 evidence suites; exercises unsupported, synchronous-throw, rejected-Promise, successful, released, and cancelled browser-feature paths for both feature owners; proves reduced-motion authoritative equivalence and ownership cues with ownership hue suppressed; reaches exactly 12,000 active authoritative ticks with pure bounded Phase 6 planner observation; reaches the public 8,192-command replay cap; checks honest reachable limits and encoded-length guards; restores and converges checkpoints; verifies three input lifecycle teardown cycles; and executes the real `phase7/app.js` in a bounded VM across keyboard control, production/cancellation, lifecycle and viewport gates, failure recovery, completion, and teardown. The VM cannot establish decoded-image pixels, actual CSS layout, native sequential focus/dialog trapping, real fullscreen, physical-device, or thermal evidence. Exact staging contains 166 public files plus `.nojekyll`, adding only these four Phase 7 files.

The source candidate passed protected pull request `#30` audit `32598168338` and squash-merged as `461c100eb48d83d2ba960a300313c19848d89f41` with exact candidate tree `1c2240fc097893c2099a7eb19602a641fa5a093d`. Main audit `32598490594` and Pages run `32598490580` succeeded. Downloaded artifact `9482284342` (digest `sha256:ec946b392f45e6f33bc979c34bef3a15373278cc43744b757641fb1193a29a08`) contained all 166 public files byte-identical to the merged staged tree. It omitted only the empty `.nojekyll` marker because the upload action's hidden-file input defaulted off; `v2026.8.22j` opts the pinned v5 action into hidden files only for the freshly recreated explicit `_site` directory and regression-locks that boundary.

One visible cloud-Chrome session at CSS viewport 1363×936 and DPR 1 completed the available Standard and Compact paths. It established zero horizontal overflow, minimum 44-pixel enabled authored targets, native Tab/Shift+Tab order, native dialog focus containment and Escape return, full-body entity rendering, the six environment/dynamic layers, three structure categories, color-plus-symbol ownership, production/cancellation with refund and focus recovery, tick-exact pause, Navigation, selection and movement, safe fullscreen-denial recovery, menu teardown with six zeroed Canvas stores, the Compact 96-pixel tier, and no Pages-origin warning or error. Browser-extension diagnostics were excluded from the origin result.

This record is published and available-browser evidence, not Phase 7 closure. The corrected 167-file artifact, direct HTTP live-byte identity, browser-family matrix, physical devices, actual 200% browser zoom, browser/GPU memory, thermal behavior, material owner decisions, root promotion, and Phase 7 closure remain pending until separately observed or explicitly resolved. No tag or GitHub Release is authorized.

## Gate and next boundary

Phase 7 closes only when the complete local slice meets the source, deterministic, accessibility, rendered, deployed, approved browser, and owner-designated physical-input evidence required above; every material owner decision is resolved or explicitly deferred; and observed defects are repaired on the same protected candidate. The Engineering Standard remains `adopting` while any applicable row remains pending or unavailable.

The interim root redesign/status page stays in place throughout implementation and candidate review. Replacing it with the local skirmish requires explicit product-owner approval after direct review of the complete slice, then a separate protected change with exact root-route, service-worker, stale-cache, rollback, Pages, live-byte, console, and primary-Play verification. Phase 7 closure alone does not silently grant that promotion, a tag, or a GitHub Release.

Phase 8 mode/campaign runtime and Phase 9 network runtime remain prohibited. Their product, protocol, infrastructure, privacy, security, CSP, provider, cross-network, and physical-device gates are not pre-approved by this contract.
