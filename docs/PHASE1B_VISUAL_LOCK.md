# Phase 1B visual and interaction lock

Status: **complete non-playable target approved by the product owner on 2026-08-21; Phase 1B closed; Phase 2 authorized**

This document owns the exact approved Phase 1B decisions and closure record. The static Pages review at [`concepts/phase1b/`](../concepts/phase1b/) presents the same target visually. [`STATUS.md`](STATUS.md) owns current merge, deployment, browser, physical-device, and later owner-gate evidence. [`REDESIGN.md`](REDESIGN.md) owns the phase sequence and acceptance gates. [`PRODUCTION_ART.md`](PRODUCTION_ART.md) remains authoritative for the approved baked-frame method, [`PHASE2_FOUNDATION.md`](PHASE2_FOUNDATION.md) owns the approved landscape implementation, and [`PHASE3_ENTITY_MOVEMENT.md`](PHASE3_ENTITY_MOVEMENT.md) owns the current runtime-entity candidate.

The approved lock defines appearance and interaction intent only. It does not itself add a gameplay renderer, simulation rule, balance value, shipping or runtime-loaded atlas set, external dependency, tag, GitHub Release, or Phase 2 approval. Four bounded atlas files exist only as published review/browser-decode samples. The owner explicitly approved the complete target on 2026-08-21 and authorized Phase 2 to begin; that approval is not permission to begin Phase 3.

## Inherited locks

- Gameplay is landscape-only. Portrait presents a rotate-device gate, pauses authoritative play, clears transient input, and resumes only after returning to landscape.
- Gameplay uses a map-dominant HUD over an environment-only battlefield whose ground, detail, navigation/blockers, anchors, dynamic entities, and foreground occlusion are separate layers.
- There are exactly three structure categories: faction headquarters, shared Resource Point, and shared Production Outpost. Only headquarters use faction-unique structure art.
- Combat entities use coherent baked full-body frames: canonical screen-right art, exact runtime X mirror for screen-left, one stable idle, four movement frames with a pixel-identical upper body/equipment region, six action/cast frames, six defeat frames, and one shared ground root.
- Every player-controlled entity and ownable structure uses a separate frame-aligned player-color mask on restrained surfaces plus one stable non-color owner cue. Selection, target, health, damage, disabled, capture, and queue states remain distinct from owner color.
- Simulation owns authoritative production, contact, damage, capture, defeat, and outcomes. Art, animation, and effects only present simulation state.
- The rejected `v2026.8.15` prototype, mixed `v2026.8.20a` proof, v5 motion/directional files, limb atlases, bone rigs, independent left/right art, independently redrawn idle/move upper bodies, color-only ownership, a fourth structure category, and Neon Voyage assets/layout/style are not reused.

## Menu and gameplay HUD

The owner-retained `concepts/images/minimal-menu.webp` remains the menu target: one full-bleed illustrated landscape, strong Aeon of Kingdoms title, Begin and Settings as the two primary actions, restrained audio/fullscreen controls, and no dashboard-card shell.

The gameplay HUD keeps these fixed responsibilities:

1. A compact persistent edge strip shows the single spendable resource, population, and objective state without covering authored routes.
2. Identity, health/state, and commands appear only for the current selection.
3. Selection, hostile target, group destination, queue state, and rally use shape plus text/symbol treatment rather than hue alone.
4. A selected producing structure opens one compact production bar with the available roster, active progress, bounded queue order, blocked-complete state, cancellation feedback, and rally state.
5. Pointer, keyboard, tap, drag, two-finger pan, and focus-centred zoom preserve battlefield area. There is no virtual joystick.

The static overlay in the review is an information-hierarchy mockup. Its placeholder counts are not approved economy, population, objective, timing, cost, or balance values.

## Battlefield composition

The opening target retains the approved Phase 1A environment and compositions while making runtime separation explicit:

- multiple readable army routes, flanking/regrouping space, and explicit hard blockers;
- one faction-unique headquarters form per opening faction;
- one shared neutral Resource Point form and one shared neutral Production Outpost form;
- selection and explicit hostile-target cues that remain readable beside ownership marks;
- bounded attack/support effects, formation spacing, contact, and defeat language;
- producer progress, blocked queue state, spawn feedback, rally marker, and ordinary routed rally path;
- no baked entity, structure, flag, ownership treatment, selection, target, effect, or HUD in the environment source.

Map pixels never determine walkability. The authored map definition owns ground, non-blocking detail, navigation/blockers, structure/objective anchors, dynamic ordering, and foreground occlusion.

## Permanent opening identity contracts

The three approved Phase 1A representatives per faction are retained. The six candidate additions derive only from the accepted broad lancer, mystic, champion, sword-and-shield, necromancer, and sovereign mood language recorded in `concepts/index.html`; costume-level realism/detail, prototype roles, prototype public names, and prototype rules do not carry forward. **Dirge Oracle** is a new candidate public name for the accepted necromancer silhouette/mood, not a claim that “oracle” appeared in the earlier source.

| Shared visual contract | Astral Concord public identity | Gravebound Court public identity | Battlefield read |
| --- | --- | --- | --- |
| Melee — proven representative | **Astral Guardian:** compact armored knight; oversized sword and round shield; restrained blue slash | **Gravebound Reaver:** lean fractured skeletal fighter; oversized attached scythe; restrained violet crescent | Close-contact line fighter |
| Ranged — proven representative | **Starbow:** upright hooded archer; one large bow and quiver; clean blue-white arrow trace | **Hollow String:** ragged hooded skeletal archer; one large bow and quiver; thin violet/ash arrow trace | Readable distance fighter |
| Signature — proven representative | **Aegis Titan:** broad ivory/gold stone-and-crystal brawler; oversized fists; compact crystal impact | **Ossuary Colossus:** massive bone/charcoal heavy; attached tower shield and free fist; bounded bone-dust impact | Massive signature presence |
| Line control — candidate | **Comet Lancer:** tall narrow forward-pointing silhouette; oversized star-headed lance; short cyan comet-line trail | **Barrow Warden:** low wide skeletal guard; ribbed round shield and hooked short blade; brief violet shield-edge dust | Astral contests an approach by reach; Gravebound arrests it by guard posture |
| Support — candidate | **Radiant Cantor:** open robes; circular halo staff held clear of the body; bounded cyan star-lattice pulse | **Dirge Oracle:** ragged hood and cloth gaps; crooked reliquary staff; bounded violet grave-sigil wisps | Formation support/control remains visible without prescribing an ability |
| Champion — candidate | **Concord Exemplar:** tall human-scale plate and vertical crest; two-handed crystal blade; short blue-white flare arc | **Sepulchral Regent:** crowned skeleton and split mantle; two-handed black-bone blade; short violet crescent/ground dust | Decisive close-range formation focal point |

“Line control” is a candidate shared semantic pairing, not an approved mechanic. “Champion” describes a visible fight role, not command authority, an aura, or a rule exception. No row chooses costs, health, damage, cooldowns, range, production time, population use, target priority, ability logic, or balance. Names are collision-free in this repository; that is not global trademark clearance. All effects remain bounded and non-authoritative.

## Landscape controls and viewport policy

The candidate supports landscape aspect ratios from **4:3 through 21:9** with a minimum gameplay viewport of **640×360 CSS pixels**. Outside that range, the game deliberately letterboxes rather than moving essential controls outside the supported safe frame. HUD edges use `env(safe-area-inset-*)` plus a 12 CSS pixel inner control margin.

| Input/view | Selection and command intent | Camera | Production and rally |
| --- | --- | --- | --- |
| Desktop landscape | Pointer selection/group box; contextual right-click focus attack; visible Move, Focus target, Defend, and Stop actions | Keyboard, edge, or drag pan candidate; wheel zoom around pointer focus | Selecting a producer opens its compact bar; contextual right-click valid terrain sets rally |
| Tablet landscape | Tap selection; explicit Attack mode followed by hostile target | Two-finger pan; pinch zoom around finger focus | Producer tray exposes queue/cancel/blocked feedback; explicit Rally mode selects valid terrain |
| Phone landscape | Tap selection and compact context tray; explicit Attack mode | Two-finger pan; pinch zoom; no virtual joystick | Safe-area tray exposes queue, cancellation, and Rally mode without covering most of the map |
| Portrait | No gameplay layout; rotate-device gate only | Authoritative pause and transient-input clear | No hidden production/rally command continues; safe resume after landscape returns |

The target browser/device matrix is current and previous major Chrome/Edge and Firefox on desktop; current and previous Safari on macOS; current and previous Chrome on Android phone/tablet; and current and previous Safari on iPhone/iPad. Reduced-motion behavior applies to every supported class. Cloud emulation is rendered evidence only; named physical-device observations remain separately pending.

## Runtime asset envelope

### Selected approved profile

| Field | Decision |
| --- | --- |
| Authoring master | 384×384 cell, root `(192,354)`, repository-only |
| Primary runtime tier | 128×128 cell, root `(64,118)`, 512×512 sheet |
| Compact runtime tier | 96×96 cell, rational root `(48,88.5)`, 384×384 sheet |
| Packed atlas | 4×4 grid with 16 unique frames; metadata aliases idle to the exact movement-frame-zero rectangle |
| Frame order | move 0–3; action/cast 0–5; defeat 0–5; logical idle aliases move 0 |
| Files | one local lossless WebP base plus one separate frame-aligned lossless WebP player-color mask per combat entity |
| Facing | canonical right stored; exact runtime `scaleX(-1)` left |
| Loading boundary | default to the 128 tier on every target; use 96 only when the player explicitly selects **Compact art** in Settings before battle; do not auto-switch from device heuristics until profiling establishes a separate approved rule; load only the two participating factions; later faction libraries stay absent; never intentionally retain both tiers decoded |
| Required failure behavior | show a stable text-only local preload error, do not instantiate the affected entity, and block battle start with a readable message; never substitute a rig, geometric body, wrong-facing frame, missing ownership mask, or external resource |
| Encoded entity ceiling | retain the existing 256 KiB ordinary, 384 KiB signature, and 3.25 MiB full-roster hard caps; the two measured tiers may ship together only while their combined encoded set remains below that roster cap |
| Decoded RGBA pixel ceiling | 24 MiB for the complete twelve-contract primary tier or 13.5 MiB for the compact tier; browser texture bookkeeping is measured separately and may not silently enlarge the selected art profile |

The 128-pixel scale preserves the approved root exactly because 384→128 maps `(192,354)` to integer `(64,118)`. The compact tier records the exact normalized root `(0.5,59/64)`, which maps to `(48,88.5)` at 96 pixels; it must not silently round differently per frame. Packing 16 unique frames preserves the logical `1/4/6/6` contract because idle and movement frame zero are already byte-identical and reference the same atlas rectangle.

### Reproducible measurement and sample correction

On 2026-08-21, the six approved Phase 1A base/mask masters were first sampled with **ImageMagick 6.9.12-98 Q16** and **libwebp 1.3.2**. The intended per-cell procedure crops each of the 16 unique 384×384 cells before resizing, resizes each cell independently, reapplies the scaled movement-frame-zero upper region to movement frames one through three, packs a 4×4 sheet, processes the mask through the same cell path, clamps final mask alpha to final base alpha, and writes lossless WebP. Its automated survey reported zero movement upper-region differences, zero mask escape pixels, and zero lossless round-trip pixel differences. Later full-set reproduction showed why those invariants were insufficient: the unpublished survey exports for five entities contained blank lower-body rows. Resizing the already-packed master as one bitmap remains rejected because cross-cell sampling can break the movement upper-body invariant.

After the owner-approved Phase 1B review was published, direct visual inspection found that the three derived Astral Guardian movement cells after frame zero had lost their lower-body pixels in both tiers. The approved 384-pixel authoring atlas and mask retained the complete legs, so this was a bounded derivative/export defect rather than missing source art or a change to the approved animation. The four browser samples were repaired deterministically with **Sharp 0.35.3**, **libvips 8.18.3**, and **libwebp 1.6.0**: keep rows `0–73` at the 96-pixel tier and `0–97` at the 128-pixel tier byte-for-byte, restore only the lower region of movement cells one through three from the approved master through independent Lanczos3 cell resizing, apply the same operation to the aligned mask, clamp mask alpha to base alpha, and encode lossless WebP. Direct image inspection confirms complete lower bodies at both tiers; invariant upper regions remained unchanged, mask escapes remain zero, and unaffected pixels remain unchanged. This correction does not promote the files into shipping atlases.

| Approved representative | Historical 96-pixel pair bytes | Historical 128-pixel pair bytes |
| --- | ---: | ---: |
| Astral Guardian | 74,152 | 118,396 |
| Starbow † | 67,418 | 106,870 |
| Aegis Titan † | 78,284 | 124,878 |
| Gravebound Reaver † | 59,740 | 93,574 |
| Hollow String † | 64,932 | 103,048 |
| Ossuary Colossus † | 90,616 | 147,274 |
| **Historical six-pair total** | **435,142** | **694,040** |
| **Historical twelve-contract projection** | **870,284** | **1,388,080** |
| **Historical both-tier projection** | — | **2,258,364** |

† Phase 3 reproduction proved that these five unpublished survey exports had blank lower-body rows. The Astral Guardian row is the separately repaired four-file public sample and remains untouched. The historical six-pair records totalled **435,142 bytes** at Compact and **694,040 bytes** at Standard. Those totals and their doubled projections remain historical feasibility evidence only; they are not valid runtime ceilings.

The historical projection doubled the recorded six-representative byte table rather than inventing unseen candidate-art compression results. Its later defect does not reopen the approved Phase 1B visual/interaction choices, but every runtime atlas must use a complete fresh export and pass its own exact encoded ceiling, transparency, mask containment, frame/root, normal/minimum zoom, and browser-load measurements.

Decoded RGBA pixels are exact for each chosen tier:

`512 × 512 × 4 bytes × 2 sheets × 12 entities = 25,165,824 bytes = 24 MiB`.

`384 × 384 × 4 bytes × 2 sheets × 12 entities = 14,155,776 bytes = 13.5 MiB`.

The four current structure base/mask pairs use a **384-pixel maximum-edge** candidate: 630,706 measured encoded bytes (0.601 MiB) and 4,279,296 decoded RGBA bytes (4.081 MiB). A 512-pixel alternative measured 1,044,878 encoded bytes (0.996 MiB) and 7,610,368 decoded bytes (7.258 MiB), so it is rejected unless maximum-zoom owner review proves 384 inadequate. Damage-state transparent masters are not yet complete for every structure; those future bytes are not fabricated into this measurement.

The current 1672×941 environment plate is 166,944 encoded bytes and 6,293,408 decoded RGBA bytes, but it remains a Phase 1A review plate rather than proof of the final layered runtime map. The menu image has the same decoded pixel arithmetic; the runtime must release its decoded resource before match loading and measure whether the selected browser actually drops residency rather than assuming it. Effects, layered terrain, damage states, UI, audio, browser bookkeeping, and renderer surfaces keep separate Phase 2+ budgets. They do not consume or redefine the entity-atlas ceiling.

The published sample gate requires the browser family, exposed version (or an explicit note that the inspection surface withholds it), and viewport to load and render all four exact review files, report their natural dimensions and completion, report Resource Timing only when the inspection surface exposes it, and retain the exact decoded RGBA arithmetic as bounded pixel-memory evidence. The Phase 3 loader now enforces source-level decoded-sheet bounds, while browser/GPU bookkeeping and observed resource-release behavior remain separately unmeasured; arithmetic is not mislabeled as a browser heap measurement.

### Phase 3 implementation addendum

Phase 3 creates a separate complete six-representative runtime set from the same approved masters; it does not overwrite or promote the four Phase 1B browser samples. Its 24 lossless WebPs measure **734,126 bytes Standard**, **459,446 bytes Compact**, and **1,193,572 bytes combined**. The fresh exporter preserves complete lower bodies, the locked movement upper regions, transparent cell borders, aligned masks, and lossless round trips.

The implemented two-player loader fixes Astral Concord to seat 1 and Gravebound Court to seat 2. For each of the six entities it validates the chosen base/mask pair, precomposes one final owner-colored sheet, releases the decoded mask, and retains only that final sheet plus the base. This enforces the selected-tier **12 MiB Standard** or **6.75 MiB Compact** retained decoded ceiling. All six color-plus-symbol presentations remain transform-tested even though only the two participating seat mappings are resident in this candidate. Current owner-gate and rendered/deployed evidence remain in [`STATUS.md`](STATUS.md); this addendum does not reopen or change the closed Phase 1B target.

## Evidence and approval boundary

Before protected publication, the source candidate must pass the focused Phase 1B source test, full dependency-free suite, exact Pages allowlist, diff hygiene, and direct-file review. After protected merge, the live Pages route, version, local resources, page-origin console, representative atlas rendering, and all four embedded desktop/tablet/phone/portrait compositions must be checked before the candidate is handed to the owner. Actual compact-page reflow, zoom, emulation, and physical-device observations remain separate named evidence. A failed live check requires a corrective protected pull request; it is not waived by a successful deployment.

These checks established a verified and deployed **candidate**, not physical-device quality, gameplay interaction, performance, balance, a tag, or a release. Physical-device evidence remains pending and named. The product owner explicitly approved the complete candidate on 2026-08-21, closing Phase 1B and authorizing the bounded Phase 2 work in [`PHASE2_FOUNDATION.md`](PHASE2_FOUNDATION.md). The later lower-body repair corrects only four derived review/browser-decode samples from the intact approved master. Phase 2 subsequently passed its owner gate on 2026-08-22; current Phase 3 authority lives in [`PHASE3_ENTITY_MOVEMENT.md`](PHASE3_ENTITY_MOVEMENT.md), while these four files remain unchanged review samples rather than runtime assets. Phase 3 owner approval is still pending.
