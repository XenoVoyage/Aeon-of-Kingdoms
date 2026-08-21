# Assets and art direction

This file owns the active reference inventory, provenance record, and rejected proof archive. [`PRODUCTION_ART.md`](PRODUCTION_ART.md) owns the approved visible, facing, animation, player-color, structure-damage, and validation method; [`REDESIGN.md`](REDESIGN.md) owns phase scope and approval gates. Final atlas dimensions, loading, licensing, and measured runtime budgets remain Phase 1 decisions before gameplay rendering begins.

## Approved production method

The product owner approved the following opening-production baseline on 2026-08-20:

| Contract | Approved baseline |
| --- | --- |
| Visible entity | Cartoon-leaning painted 2D, coherent baked full body, oversized readable equipment, no runtime limb/bone rig |
| Facing | Canonical right-facing source; left is its exact horizontal X mirror |
| Idle | One stable canonical frame |
| Move | Four gait frames at the reference 8 FPS; frame 1 equals idle and the upper body/equipment remain pixel-identical |
| Attack/cast | Six authored full-body frames at the reference 12 FPS with an explicit contact cue |
| Defeat | Six authored full-body frames at the reference 10 FPS with an authored collapse |
| Ownership | Separate frame-aligned player-color masks on all player-controlled entities and ownable structures; color plus a non-color cue for up to six players |

The Astral Guardian approved this method, not a final runtime atlas. The same contract has now been applied to all six Phase 1A representatives. Exact acceptance and automated/manual validation requirements are in [`PRODUCTION_ART.md`](PRODUCTION_ART.md).

## Complete Phase 1A closing candidate

The direct review package is stored at `concepts/feasibility/phase1a/`. It is a complete **feature-branch candidate** whose corrected Aegis Titan still awaits direct owner confirmation, not gameplay, a final runtime atlas, a published Pages payload, a tag, or a release. Its human review order is in the package `README.md`, and its machine-readable inventory is `manifest.json`. These unpublished paths remain plain text in the staged public asset record until owner approval authorizes publication.

### Review inventory

| File | Dimensions | Bytes | Purpose |
| --- | ---: | ---: | --- |
| `review/opening-entities.webp` | 1800×1080 | 215,230 | Six opening representatives in one coherent visible style |
| `review/six-player-ownership.webp` | 2400×1580 | 488,156 | Six player colors and six non-color symbols across all representatives and structure categories |
| `review/battlefield-desktop.webp` | 1536×1024 | 426,602 | Desktop composition built from separate environment, structure, entity, and ownership assets |
| `review/battlefield-phone.webp` | 844×390 | 114,256 | Compact landscape composition using the same separate assets |
| `review/entity-atlas-audit.jpg` | 1472×1626 | 324,182 | All canonical entity frames together for anatomy, equipment, contact, and background review |
| `environment/battlefield-environment.webp` | 1672×941 | 166,944 | Environment-only painted battlefield plate |
| `structures/production-outpost-damage.webp` | 1800×638 | 83,282 | Accepted intact, damaged/fire, and destroyed structure progression |

### Entity packages

Each directory contains eight files: a 2304×1536 RGBA atlas, aligned RGBA player mask, JSON metadata, static idle preview, animated move/action/defeat previews at 760×240, and a 1024×330 player-color boundary proof.

| Entity directory | Faction/role | Package bytes |
| --- | --- | ---: |
| `entities/astral-guardian/` | Astral Concord melee | 962,810 |
| `entities/starbow/` | Astral Concord ranged | 932,748 |
| `entities/aegis-titan/` | Astral Concord signature | 1,148,336 |
| `entities/gravebound-reaver/` | Gravebound Court melee | 878,729 |
| `entities/hollow-string/` | Gravebound Court ranged | 944,590 |
| `entities/ossuary-colossus/` | Gravebound Court signature | 1,518,884 |

All six atlases use 384×384 master cells, root `(192,354)`, idle/move/action/defeat rows, frame counts `1/4/6/6`, reference cadences `1/8/12/10`, canonical right facing, and exact runtime-mirrored left facing. These are review masters. Phase 1B must derive and measure the final runtime atlas profile rather than loading six 384-pixel master atlases by default.

### Structure packages

| Base | Dimensions | Base bytes | Mask bytes | Boundary |
| --- | ---: | ---: | ---: | --- |
| `structures/astral-headquarters.png` | 1024×947 | 1,196,732 | 53,486 | Faction architecture fixed; owner banners, marks, and restrained accents masked |
| `structures/gravebound-headquarters.png` | 1024×933 | 1,139,685 | 61,852 | Faction architecture fixed; owner banners, marks, and restrained accents masked |
| `structures/resource-point.png` | 1024×1024 | 951,762 | 56,248 | Neutral shared base; flag, capture ring, mark, and bounded light masked |
| `structures/production-outpost.png` | 1024×810 | 977,617 | 43,129 | Neutral shared base; banners, crystals, mark, and bounded light masked |

The complete 65-file direct package totals **12,692,541 bytes**, below its 14 MiB review budget. It intentionally has no HTML, CSS, or JavaScript review application.

### Generation, prompts, and transformations

Direction and review: **XenoVoyage**. Raster generation: project-specific OpenAI image generation through OpenAI Codex. Prompt intent is summarized below because the conversational prompt text is not a stable repository input; the generated source identifiers and deterministic transformations are recorded so the derivation is auditable.

| Asset | Prompt intent summary | Generated source files |
| --- | --- | --- |
| Astral Guardian | Cartoon-leaning late-1990s RTS knight, three-quarter top-down, oversized sword and round shield, coherent right-facing idle/gait, attack, and non-gory collapse | `exec-5b9f7cb0-fceb-4d21-bddc-887432f0ebbf.png`; `exec-5b5c64d6-5dfb-4dd1-80a5-96a77a9bcdc9.png`; `exec-1fcd546f-089f-4d8e-b832-def658c65fe7.png` |
| Starbow | Astral ranged fighter with one readable bow and quiver, same camera/style, lower-body gait, draw/release action, and coherent defeat | `exec-dff030ba-de87-47f6-8e1d-db419fa1b92e.png`; `exec-4feca8a8-5b5a-43f4-9efc-be1b8223e09a.png`; `exec-50084a6d-e0bc-4d87-9248-604b1baa302a.png` |
| Aegis Titan | Broad Astral crystal/stone signature brawler, no separate weapon, coherent screen-right head/torso/hips/feet, heavy gait, readable rightward fist strike, and mass-preserving collapse | `exec-c9d67bd4-44c4-413a-9e17-f7466b6505d0.png`; `exec-4cd64833-081f-471e-9a6a-b0efeffbaabf.png`; approved defeat retained from `exec-bc8ee062-45c2-4cfa-99bc-f53a41444f2e.png` |
| Gravebound Reaver | Skeletal melee fighter with one oversized attached scythe, coherent right-facing gait, sweeping action, and non-gory collapse | `exec-69b6918b-be61-439d-bccf-b73c6a0579b0.png`; `exec-6125a88b-209a-456e-8c9b-8e04a353a648.png`; `exec-b8fdb965-4e6c-46ef-ab2b-bfcb309b32a1.png` |
| Hollow String | Hooded skeletal archer with one large bow and quiver, same camera/style, controlled gait, draw/release action, and coherent defeat | `exec-7fafae76-ec70-46be-ae62-4bc1316d423e.png`; `exec-9e60777a-a4d2-462a-9c3c-243507a08d7a.png`; `exec-e64af89d-4a50-4026-9860-f22b041f646e.png` |
| Ossuary Colossus | Massive skeletal signature entity with one attached tower shield and free striking fist, heavy gait, punch action, and shield-preserving collapse | `exec-a05e660a-3158-4d2d-b1e6-4ae9d62aa6d3.png`; `exec-4bfd1a5d-8525-417a-8782-8f7f40701534.png`; `exec-b1cdf0bb-7be7-4cd5-9088-2af24274b789.png` |
| Structures | Isolated painted Astral HQ, Gravebound HQ, shared Resource Point, and shared Production Outpost in the accepted cartoon-leaning battlefield style | `exec-ec136d59-9706-461b-bb19-57b30c9a3dbf.png`; `exec-c97ba4d3-fee6-476d-a923-3ab3b6066616.png`; `exec-d5c6e6ef-fd2f-465b-9e7d-b49eabd74915.png`; `exec-55e63d5b-ea8d-4206-8a44-f4e5584619a4.png` |

Local processing used Sharp and ImageMagick only after generation: border-connected neutral background removal; component filtering; shared-scale/root normalization; exact idle-to-move-frame-zero reuse; upper-body pixel locking for movement; frame-aligned material masks; atlas and JSON export; exact horizontal mirror in review playback; actual-scale WebP encoding; structure downscaling to a 1024-pixel envelope; mask clamping inside source alpha; narrowed saturated-color selection so cool masonry shadows remain fixed; and code-native review composition. No limb was independently generated, substituted, or runtime-rigged after the approved method was locked.

The workspace visual audit caught and corrected four export defects before this candidate: trapped checker pixels inside closed bow silhouettes, near-white structure highlights incorrectly removed as background, ownership masks that initially captured cool stone shadows, and an Aegis gait/punch whose nearly front-facing anatomy disagreed with lateral motion. The current integrated tests enforce frame identity, stable movement upper bodies, frame counts/cadence/loop metadata, transparent cell edges, mask containment, structure dimensions, direct-file inventory, the corrected Aegis asset hashes, and the 14 MiB review budget.

## Superseded Phase 1A v5 proof inventory

Intermediate `v2026.8.20b` is an unpublished review iteration retained for provenance. Its environment, structures, damage direction, and player-color boundary informed the approved contract, but its v5 entity animation sheets are superseded: they use the wrong authored facing, equal six-frame counts, whole-sprite transforms, and inconsistent anatomy/root behavior. None of these images is an implemented game screenshot, complete shipping sprite set, balanced map, or physical-device result.

| File | Dimensions | Bytes | Purpose |
| --- | ---: | ---: | --- |
| `concepts/feasibility/images/production-battlefield-environment-v4.webp` | 1672×941 | 166,944 | Environment-only battlefield plate with terrain, routes, blockers, river, and vegetation; no baked-in entity, structure, flag, ownership state, or interface |
| `concepts/feasibility/images/structure-atlas-v2.webp` | 1536×1024 | 190,180 | Painted structure language: two faction-unique HQ forms, one shared Resource Point, and one shared Production Outpost |
| `concepts/feasibility/images/entity-team-color-v4.webp` | 1800×900 | 200,218 | Exact neutral reconstruction beside coral and emerald player-color variants; fabric and identity accents change while body materials remain fixed |
| `concepts/feasibility/images/structure-damage-v3.webp` | 1800×638 | 83,282 | One neutral shared Production Outpost at intact, scorched-and-burning, and collapsed health states |
| `concepts/feasibility/images/entity-directional-method-v5.webp` | 1800×1080 | 173,004 | Complete base and strike poses facing left beside their exact X-mirrored right-facing results; no visible or runtime limb rig |
| `concepts/feasibility/images/astral-baked-motion-v5.webp` | 1800×1000 | 466,512 | Six-frame baked Astral idle, move, attack, and defeat timing across left- and right-facing rows |
| `concepts/feasibility/images/gravebound-baked-motion-v5.webp` | 1800×1000 | 300,370 | Six-frame baked Gravebound idle, move, attack, and defeat timing across left- and right-facing rows |
| `concepts/feasibility/images/astral-baked-motion-static-v5.webp` | 1800×1000 | 153,342 | Static reduced-motion summary using the representative Astral frame from each family and both facings |
| `concepts/feasibility/images/gravebound-baked-motion-static-v5.webp` | 1800×1000 | 105,906 | Static reduced-motion summary using the representative Gravebound frame from each family and both facings |
| `concepts/feasibility/images/astral-baked-motion-audit-v5.webp` | 1800×1440 | 253,152 | All 24 left-facing Astral frames for direct anatomy, equipment, clipping, and ground-contact review |
| `concepts/feasibility/images/gravebound-baked-motion-audit-v5.webp` | 1800×1440 | 170,352 | All 24 left-facing Gravebound frames for direct anatomy, equipment, clipping, and ground-contact review |

Total superseded v5 proof-image payload: **2,263,262 bytes**. The two contact sheets are linked for optional direct inspection and are not embedded into the review page.

### Origin, transformation, and distribution

- **Direction:** XenoVoyage.
- **Raster source method/tool:** project-specific OpenAI image generation through OpenAI Codex, using only earlier project-generated work as mood reference. The final prompt set required a cartoon-leaning 2D environment-only battlefield and coherent complete-body base, stride, and strike poses with oversized readable equipment.
- **Raster transformation:** generated PNG outputs remained outside the repository. Local image processing removed metadata and border-connected checkerboard backgrounds, normalized ground contact, created the exact X-mirror, and encoded bounded WebP review copies. It never substituted, rotated, or regenerated an individual limb.
- **Superseded v5 method:** one complete left-facing base, stride, and strike pose per representative supplied the visible body and attached equipment. Idle and defeat used bounded whole-sprite transforms, move alternated complete base and stride poses, and right-facing rows were mirrors. The owner rejected that timing/anchor result; it is not the active method in [`PRODUCTION_ART.md`](PRODUCTION_ART.md).
- **Player color:** blue Astral and violet Gravebound fabric plus small identity accents are isolated into a separate mask. Coral and emerald proofs show the intended ownership recolor boundary; white/gold armor, charcoal body material, and bone armor remain faction material rather than player color.
- **Motion review result:** independently assembled limb boards remain rejected. Inspection of all 48 left-facing v5 timing frames exposed why whole-sprite transforms and separately sourced poses are also insufficient: stable anatomy alone did not guarantee a stable root, correct equipment scale, or convincing idle/movement playback.
- **Distribution decision:** candidate review assets are project material under the repository's MIT license. Generated output may not be unique, and approval of the visible direction will not silently promote every candidate pixel to final shipping art.
- **Delivery:** all eleven active files are local and total 2,263,262 bytes. The environment, entity, structure, player-color, and directional-motion layers remain separate, and all review images stay outside the four-file offline status-shell cache.

### Approved pipeline baseline and provisional budget

These values are a reviewable production hypothesis, not an approved atlas or measured runtime result:

- **Master:** one controlled baked full-body sprite source per combat entity, with stable ground, selection, contact, and effect anchors plus a frame-aligned player-color mask. No limb rig or art tool ships to the browser.
- **Directions:** author the right-facing sequence and use an exact X-mirror for left-facing gameplay. Another depth angle may be proposed only if actual camera play proves two facings insufficient.
- **Animation families and frames:** idle uses one stable frame; move uses four lower-body gait frames at the reference 8 FPS; attack/cast and defeat use six full-body frames at the reference 12 FPS and 10 FPS respectively. Simulation ticks remain authoritative.
- **Frame and atlas envelope:** the current proof master uses 384×384 cells with root `(192, 354)`. Final gameplay-scale cells and atlas dimensions remain measured Phase 1B decisions; every state and mask must preserve the shared root.
- **Encoded budget:** at most 256 KiB per ordinary entity and 384 KiB per signature entity. A two-faction six-role opening roster therefore targets at most 3.25 MiB encoded, loaded by participating faction rather than by the future complete faction library.
- **Decoded budget:** the same opening roster provisionally targets at most 14 MiB of decoded entity-atlas pixels before measurement and browser overhead. Terrain, structures, UI, audio, and effects have separate later budgets.
- **Validation gate:** the closing candidate proves the exact contract across all six representatives. It does not approve the complete set, a final runtime loading strategy, gameplay renderer, later permanent roster, tag, or release; those retain their own measured gates.

## Reviewed redesign mood references

The deployed `v2026.8.20` gallery includes eight raster references. On 2026-08-20 the product owner retained their battlefield composition, faction contrast, combat language, and restrained interface as mood direction, while rejecting their literal realism and detail as the production target. They are not gameplay screenshots, final production assets, implementation evidence, or proof that their detail survives normal RTS zoom.

| File | Dimensions | Bytes | Review-only purpose |
| --- | ---: | ---: | --- |
| `concepts/images/battlefield.webp` | 1672×941 | 244,336 | Battlefield mood, route, blocker, territory, and scale language; not a validated 2/4/6-player layout |
| `concepts/images/astral-concord.webp` | 1672×941 | 112,798 | Living-faction mood, broad silhouette, weapon, and material language; not a sprite-detail target |
| `concepts/images/gravebound-court.webp` | 1672×941 | 106,914 | Undead-faction mood, broad silhouette, weapon, and material language; not a sprite-detail target |
| `concepts/images/structures.webp` | 1536×1024 | 140,124 | Three-category mood reference; only headquarters remain faction-unique in the approved brief |
| `concepts/images/combat-readability.webp` | 1672×941 | 171,102 | Formation spacing, focused target, range, command, impact, and defeat language |
| `concepts/images/minimal-menu.webp` | 1672×941 | 85,924 | Original restrained landscape menu direction without a dashboard-card shell |
| `concepts/images/mobile-landscape.webp` | 1798×875 | 148,910 | Map-dominant landscape touch-control composition without a virtual joystick |
| `concepts/images/production-rally.webp` | 1672×941 | 243,618 | Producing-headquarters selection, queue, progress, cancellation, spawn, and rally interaction direction |

Total review-image payload: **1,253,726 bytes**.

### Origin, transformation, and distribution

- **Direction:** XenoVoyage.
- **Source method/tool:** Generated as project-specific concept references with OpenAI image generation through OpenAI Codex. No third-party stock or rejected-project image was intentionally supplied as source material.
- **Transformation:** Original PNG outputs retained their pixel dimensions, had metadata removed with FFmpeg `-map_metadata -1`, and were lossily encoded with FFmpeg's `libwebp` encoder at quality 78 and compression level 6. The PNG outputs are not shipped in Pages or committed to the repository.
- **Distribution decision:** These review copies are included as project material under the repository's MIT license. This does not approve them as final shipping art; generated output may not be unique, and final asset selection/licensing remains a Phase 1 gate.
- **Delivery:** Each reference is local, below 300 KiB, linked at full size, and excluded from the four-file offline status-shell cache. Seven below-fold images lazy-load; the first is prioritized.

## Phase 1A closing rules

The closing set is intentionally smaller than the later six-role-per-faction library. It proves one sustainable method across melee, ranged, and signature representatives before Phase 1B expands the permanent role contracts.

- **Visual target:** cartoon-leaning, hand-painted 2D fantasy viewed from a consistent three-quarter top-down angle. Silhouette, posture, weapon, and one restrained faction motif carry identity; faces, engravings, layered cloth, and portrait-level surface detail do not carry gameplay meaning.
- **Scale proof:** show ordinary and minimum gameplay zoom on a representative desktop and compact phone-landscape viewport with a crowded fight. Enlarged character sheets alone are insufficient.
- **Entity proof:** melee, ranged, and signature representatives from both opening factions prove faction contrast and the same baked full-body directional method. The remaining permanent six-role contracts expand only after this complete Phase 1A set is approved.
- **Structure proof:** two unique headquarters; one shared Resource Point; one shared Production Outpost. The two shared forms show neutral and multiple owned states using flags, banners, lights, patterns, and player marks rather than model replacement or color alone.
- **Animation proof:** each representative demonstrates one stable idle frame, four lower-body-only movement frames, six full-body attack/cast frames, and six full-body defeat frames. Art is authored facing right and mirrored exactly for left gameplay; every state keeps coherent anatomy, oversized attached equipment, and one shared root. Runtime limb deformation, independently assembled body parts, and independently redrawn idle/movement upper bodies are not accepted.
- **Map proof:** the visible battlefield stays painted and coherent. Ground, non-blocking detail, navigation/blocker mask, anchors, dynamic ordering, and foreground occlusion remain separate map data; mountain pixels never become implicit collision, and technical layer diagrams are not presented as game art.
- **Pipeline decision:** use controlled baked full-body 2D frames plus frame-aligned player-color masks, exported to a local transparent atlas with small metadata. Record master format, exporter, directions, mirroring limits, dimensions, frame rate, bytes, anchors, origin, author/tool, license, transformations, validation, and owner state for every accepted asset.
- **Runtime budget:** the 12,692,541-byte direct package is a bounded review/master set, not the shipping load. Phase 1B must derive, encode, load-test, and approve the final runtime atlas envelope at measured desktop and phone scale.

## Rejected prototype archive

> The sections below record the rejected `v2026.8.15` asset set and visual direction. They must not guide the replacement.

The vertical slice uses procedural Canvas shapes and local interface styling. This keeps unit silhouettes crisp across zoom levels, supports recoloring and animation without sprite duplication, and avoids a runtime download or build pipeline.

### Prototype inventory

| Area | Source | Provenance |
| --- | --- | --- |
| Units, structures, terrain, capture rings, orders, and selection marks | Procedural drawing in `js/render.js` | Original project code |
| Interface, icons, and effects | Local HTML and CSS | Original project code |
| `icons/icon.svg` | 512×512 scalable standard app icon | Original project vector artwork |
| `icons/icon-maskable.svg` | 512×512 scalable maskable app icon with safe-zone composition | Original project vector artwork |
| `icons/icon-192.png`, `icons/icon-512.png` | Rasterized install icons for broad PWA support | Derived locally from `icons/icon.svg` |
| `icons/icon-maskable-512.png` | Rasterized maskable install icon | Derived locally from `icons/icon-maskable.svg` |
| `icons/apple-touch-icon.png` | 180×180 home-screen icon | Derived locally from `icons/icon-maskable.svg` |
| Typography | System font stack | No font asset or third-party request |
| `docs/assets/gameplay.webp` | 1200×675 README gameplay capture | Real six-faction renderer output from manual workflow run `31900358317`, compressed from its verified 1440×810 PNG |

The two local SVG sources and their raster install variants use the same geometric Aeon sigil and cyan/violet deep-space palette as the interface. No generated concept image is presented as an in-game screenshot. The README image comes from the real game through the repository's manual, dependency-free Chrome capture workflow.

### Rejected visual language

Aeon of Kingdoms combines fantasy, mythology, modern technology, and alien civilizations inside one deep-space visual system.

- **Foundation:** near-black navy and blue-violet terrain with sparse depth texture.
- **Information:** electric cyan for selection and readable neutral systems; violet for Aether and high-energy objectives.
- **Danger:** restrained coral or amber accents, reserved for damage, hostile pressure, and irreversible actions.
- **Factions:** distinct outer silhouette and internal motif before palette. Human geometry is ordered and luminous; Undead geometry is broken, bone-like, and void-lit.
- **Hierarchy:** the map is quiet, armies are readable, selected units are unmistakable, and UI remains calmer than combat.

The tone should feel scientific and premium without covering a strategy map in glow. Bloom, particles, trails, and screen movement support state feedback; they do not substitute for shape, labels, or contrast.

### Rejected unit readability

Every role needs a recognizable footprint at normal play zoom:

| Role | Silhouette direction |
| --- | --- |
| Vanguard | Forward-pointing compact body |
| Ranger | Narrow body with visible ranged axis |
| Bulwark | Wide shielded front |
| Breaker | Heavy asymmetry or siege profile |
| Support | Open radial or orbiting motif |
| Ascendant | Large multi-part landmark shape |

Faction-specific names and details may change the motif, but should not erase the role's battlefield read. Selection, ownership, health, capture, disabled, and target states require non-color signals.

### Rejected animation rules

- Authoritative timing lives in simulation state; rendering reads it without changing an outcome.
- Prefer small stateful motions—stance, recoil, cast, impact, death—over perpetual decoration.
- Large units can have layered animation but keep a stable selectable footprint.
- Animation work is bounded. Particle and transient-label collections have hard caps and deterministic cleanup.
- Reduced-motion mode removes nonessential drift, pulse, shake, and parallax while preserving telegraphs and timing.
- Interpolation may smooth fixed simulation steps but must never move a hitbox or capture position independently.

## Adding raster or audio assets

Assets may be added when they materially improve the game and remain local, licensed, compressed, and measurable.

1. Record the file, role, dimensions or duration, source method, author/tool, license, and transformations here.
2. Preserve original prompts or editable sources only when they are safe and useful; never commit credentials or private source material.
3. Prefer SVG for interface vectors and WebP for raster scenes. Avoid embedding large base64 payloads in source.
4. Test the asset at maximum zoom, compact phone landscape, reduced motion/effects, and the Pages repository subpath.
5. Confirm loading failure leaves a functional fallback and does not block the simulation.
6. Search every source and document reference before replacing or deleting a file.

Third-party assets require a license compatible with the MIT-distributed repository and an attribution record when the license requires one. “Free” or generated does not by itself establish redistribution rights.

## Rejected prototype README capture record

The current capture passed this gate on 2026-08-15. Future replacements must preserve the same evidence standard.

The first real README capture should:

- come from the local or deployed game at a 16:9 desktop viewport;
- show selected units, two site types, readable HUD resources/population/objective state, and both faction identities;
- contain no browser chrome, debug overlay, private room code, or unrelated mockup treatment;
- use meaningful alternative text and a repository-local WebP file;
- remain visually clean after GitHub scales it down;
- be checked against the rendered README and referenced by the repository audit.

Automated checks can prove file type, reference integrity, dimensions, and size. They cannot prove composition, clarity, accessibility, or that the capture accurately represents enjoyable play; those require visual review.
