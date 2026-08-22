# Assets and art direction

This file owns the active reference inventory, provenance record, and rejected proof archive. [`PRODUCTION_ART.md`](PRODUCTION_ART.md) owns the approved visible, facing, animation, player-color, structure-damage, and validation method; [`PHASE1B_VISUAL_LOCK.md`](PHASE1B_VISUAL_LOCK.md) owns the approved measured runtime envelope; [`PHASE2_FOUNDATION.md`](PHASE2_FOUNDATION.md) owns the approved landscape asset use; [`PHASE3_ENTITY_MOVEMENT.md`](PHASE3_ENTITY_MOVEMENT.md) owns the approved runtime-entity foundation; [`PHASE4_STRUCTURES_ECONOMY.md`](PHASE4_STRUCTURES_ECONOMY.md) owns the approved intact runtime-structure set; [`PHASE5_COMBAT_TACTICS.md`](PHASE5_COMBAT_TACTICS.md) owns the active bounded damage/destroyed asset boundary; and [`REDESIGN.md`](REDESIGN.md) owns phase scope and approval gates. The four Phase 1B browser samples remain untouched review-only evidence and are not promoted as runtime files.

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

The owner's Astral Guardian review approved this method, not a final runtime atlas. The same contract has now been applied to all six Phase 1A representatives. Exact acceptance and automated/manual validation requirements are in [`PRODUCTION_ART.md`](PRODUCTION_ART.md).

## Approved Phase 1A package

The direct review package is stored at `concepts/feasibility/phase1a/`. It is the complete **owner-approved Phase 1A production-feasibility package**, not gameplay, a final runtime atlas, a tag, or a release. Its human review order is in the package `README.md`, and its machine-readable inventory is `manifest.json`. The published Pages review stages an optimized 37-file subset at `concepts/feasibility/`: the five review compositions, all 24 actual-scale state playbacks, six player-color proofs, environment plate, and damage proof. That subset totals **2,503,564 bytes**. Raw atlases, masks, structure masters, metadata, and package documents remain repository-only.

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

All six atlases use 384×384 master cells, root `(192,354)`, idle/move/action/defeat rows, frame counts `1/4/6/6`, reference cadences `1/8/12/10`, canonical right facing, and exact runtime-mirrored left facing. These are review masters. The approved measured Phase 1B two-tier profile is recorded below; loading the 384-pixel masters by default remains forbidden.

### Phase 1B runtime-envelope browser samples

Four derived Astral Guardian files are staged with the non-playable Phase 1B review so an actual browser can decode one representative aligned base/mask pair at both selected tiers. After the lower-body correction described below, they total **192,548 bytes** and remain measurement/review evidence only—not a complete roster, shipping runtime set, or gameplay implementation.

| File | Dimensions | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `concepts/phase1b/runtime/astral-guardian-96-base.webp` | 384×384 | 63,868 | `274eedf06c79735ecde0d03e9fec91129a9ffb63ed42be6a80494c88e6bac52a` |
| `concepts/phase1b/runtime/astral-guardian-96-mask.webp` | 384×384 | 10,284 | `50164172236c283a887e1d3d81905118b11db08687706e665748176e74c2712c` |
| `concepts/phase1b/runtime/astral-guardian-128-base.webp` | 512×512 | 103,164 | `d69451b611fcfb9e0aaafa36333a5a2b752d08157dd8b3002acbb390df36e038` |
| `concepts/phase1b/runtime/astral-guardian-128-mask.webp` | 512×512 | 15,232 | `cc5c4c78bbe52cda91b3c760e83c92d650c5728891c1d8ccd06b3070d5eda976` |

The original derived set used the ImageMagick 6.9.12-98 Q16/libwebp 1.3.2 per-cell procedure recorded in [`PHASE1B_VISUAL_LOCK.md`](PHASE1B_VISUAL_LOCK.md): crop each unique cell, resize independently, restore the invariant movement upper region, pack 4×4, resize and alpha-clamp the aligned mask, and encode lossless WebP. Owner review later exposed that movement cells one through three in those four derived samples lacked their lower-body pixels even though the approved authoring atlas and mask remained complete.

The current files repair only those lower regions from the intact approved master with Sharp 0.35.3, libvips 8.18.3, libwebp 1.6.0, and independent Lanczos3 cell resizing. Rows `0–73` in the 96-pixel cells and `0–97` in the 128-pixel cells remain byte-for-byte unchanged; the aligned mask follows the same repair and is clamped to base alpha. Direct inspection confirms complete legs at both tiers, stable upper regions, transparent cell edges, and zero mask escape pixels. Direction/review remains XenoVoyage; the source art was generated for this project through OpenAI image generation and is distributed under the repository's existing project-material decision. Tests freeze the current dimensions, bytes, and hashes. Browser load/decode observations belong in [`STATUS.md`](STATUS.md).

### Approved Phase 3 runtime entity set

Phase 3 derives a fresh complete runtime set from the six approved 384-pixel masters without changing the four published Phase 1B Astral Guardian samples above. `tools/export-phase3-assets.js` records the ImageMagick/libwebp export, independent cell resize, movement upper-body lock, one-pixel transparent border, aligned-mask clamp, lossless round-trip audit, and manifest generation. The approved set contains one base and one mask at each of two tiers for each of six representatives: **24 local lossless WebPs** under `phase3/assets/entities/`.

| Approved representative | Standard 128 base+mask | Compact 96 base+mask |
| --- | ---: | ---: |
| Astral Guardian | 119,742 | 74,966 |
| Starbow | 114,074 | 71,834 |
| Aegis Titan | 132,808 | 83,142 |
| Gravebound Reaver | 100,810 | 64,214 |
| Hollow String | 111,056 | 69,776 |
| Ossuary Colossus | 155,636 | 95,514 |
| **Measured tier total** | **734,126** | **459,446** |

Both tracked tiers total **1,193,572 encoded bytes**. `phase3/assets/entities/manifest.js` freezes each file's dimensions, byte count, SHA-256, frame map, source/destination roots, invariant audit, and tier budget. Standard is the default; Compact is an explicit pre-battle choice, and the loader never retains both tiers.

The Phase 3 runtime loader fixes Astral Concord to seat 1 and Gravebound Court to seat 2. It validates each selected base/mask pair, precomposes exactly one final owner-colored sheet per entity, releases the decoded mask, and retains only the diagnostic base plus that final owner sheet. The selected-tier retained decoded ceiling is therefore **12 MiB Standard** or **6.75 MiB Compact**. The HSL shading transform and alpha-coverage rule remain tested against all six locked player presentations even though the approved two-player foundation prepares only its two faction-to-seat mappings.

### Approved Phase 4 runtime structure set

Phase 4 derives one complete 384-pixel-maximum-edge base/mask pair for each of the four approved forms without trimming or reframing its transparent canvas. `tools/export-phase4-structures.js` validates the approved Phase 1A source package, resizes base and mask with identical Lanczos geometry, clamps mask alpha, clears transparent RGB, encodes exact lossless WebP with metadata stripped, regenerates the manifest, and supports byte-for-byte `--check` reproduction.

| Runtime form | Dimensions | Base bytes | Mask bytes | Pair bytes |
| --- | ---: | ---: | ---: | ---: |
| Astral headquarters | 384×355 | 176,842 | 9,466 | 186,308 |
| Gravebound headquarters | 384×350 | 156,902 | 9,744 | 166,646 |
| Resource Point | 384×384 | 130,496 | 9,484 | 139,980 |
| Production Outpost | 384×304 | 134,428 | 7,280 | 141,708 |
| **Total** | — | **598,668** | **35,974** | **634,642** |

`phase4/assets/structures/manifest.js` freezes exact source/runtime dimensions, bytes, SHA-256 values, ground roots, draw sizes, selection/health/owner/effect anchors, category/faction policy, and the six color-plus-symbol presentations. The decoded base-plus-mask arithmetic is **4,279,296 bytes**. The two-player loader retains four neutral/base sheets plus six prepared owner sheets, totaling **5,336,064 decoded RGBA bytes** before browser/GPU bookkeeping; it releases masks and temporary canvases and exposes deterministic disposal.

The earlier Phase 1B measurement of **630,706 bytes** used libwebp's non-exact transparent-pixel behavior. Phase 4 corrected that boundary by enabling exact RGBA preservation; the **3,936-byte** increase prevents invisible RGB synthesis and freezes zero transparent RGB plus zero decoded RGBA round-trip differences. This is an authoring correction, not a visible-art change.

Only the approved intact runtime state exists in this set. `production-outpost-damage.webp` remains a flattened RGB review strip with no aligned transparency and is explicitly excluded from runtime loading; it must not be cropped into fake damage states.

### Phase 5 implementation-candidate damage and destroyed set

Phase 5 adds exactly twelve production derivatives for the four approved forms: four damaged bases, four aligned and damaged-base-alpha-clamped ownership masks, and four destroyed bases without ownership masks. `tools/export-phase5-structures.js` accepts only the eight exact transparent repository sources below, preserves each Phase 4 canvas and presentation record, derives the damaged mask only from the intact ownership mask, strips metadata, clears transparent RGB, encodes exact lossless WebP, records the complete provenance/audit, and supports byte-for-byte `--check` reproduction. It never reads the flattened `production-outpost-damage.webp` review strip as a runtime source.

| Form | Runtime canvas | Damaged base | Damaged mask | Destroyed base | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Astral headquarters | 384×355 | 160,964 | 7,268 | 107,812 | 276,044 |
| Gravebound headquarters | 384×350 | 141,366 | 9,358 | 94,632 | 245,356 |
| Resource Point | 384×384 | 153,506 | 9,150 | 121,744 | 284,400 |
| Production Outpost | 384×304 | 126,130 | 6,284 | 102,078 | 234,492 |
| **Total** | — | **581,966** | **32,060** | **426,266** | **1,040,292** |

The twelve-file encoded set is below its 3 MiB ceiling. Decoded-source arithmetic is **6,418,944 bytes**, below 13 MiB. The two-player loader reuses the four intact Phase 4 bases, retains all twelve intact/damaged/destroyed bases plus twelve prepared intact/damaged owner sheets, and totals **12,811,776 decoded RGBA bytes**, also below 13 MiB; it releases all eight decoded masks and every temporary canvas. The aggregate audit records zero border-alpha pixels, mask escapes, transparent-RGB pixels, and lossless round-trip differences. Exactly 10,522 damaged-mask pixels were clamped to damaged alpha, and 29,232 transparent RGB pixels were cleared before encoding.

| Repository-only authored source | Dimensions | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `structures/phase5/astral-headquarters-damaged.png` | 1024×947 | 1,115,620 | `f4ec0110028982967653a66bff0811cd15534ea7052ceb4d65ba525d2d9a37ed` |
| `structures/phase5/astral-headquarters-destroyed.png` | 1024×947 | 907,533 | `e3b4484688b0256b91630f7be8cafb760d917bcaab22859937717b6e8567967c` |
| `structures/phase5/gravebound-headquarters-damaged.png` | 1024×933 | 1,006,337 | `32ca744043e7a07e75e92d45ad9bb962c5e9e99025101bf75d863c94665b044b` |
| `structures/phase5/gravebound-headquarters-destroyed.png` | 1024×933 | 797,573 | `dcd92fda86f5b2c971a099f0e79f498c31a544fb704c078d6e8d8f5f603a7b65` |
| `structures/phase5/resource-point-damaged.png` | 1024×1024 | 1,036,661 | `3af2d0c2941c650315e95eaba6c8af14b618f3c233db0c89410863daced377c3` |
| `structures/phase5/resource-point-destroyed.png` | 1024×1024 | 920,983 | `5bd8427d5e546bd214204128d6e8f9568927de9cb3eabe36372103f51bcb6272` |
| `structures/phase5/production-outpost-damaged.png` | 1024×810 | 957,835 | `4322a84081a615b6aa617ba14aea8063797d8c58e4cd93c905862566626e15e4` |
| `structures/phase5/production-outpost-destroyed.png` | 1024×810 | 863,728 | `a82d545ecb25220dbf2a8064dd5a2b15ec3d520aa40b2ec32e5c5225edc69fb1` |

These eight sources total **7,606,270 bytes** and are never staged to Pages. They were authored after Phase 1A for the Phase 5 implementation candidate, so they are not added to the original approved 65-file Phase 1A package count or its 14 MiB review budget. The staged runtime candidate contains only the twelve derived WebPs and their strict manifest; publication, rendered review, and Phase 5 closure remain pending.

This complete export also exposed why the earlier feasibility totals were too small: the unpublished six-entity survey files behind **694,040 Standard** and **435,142 Compact** had blank lower-body rows in five entities. Those totals and their doubled projections are retained below only as historical Phase 1B feasibility evidence; they are not valid runtime ceilings. The four separately repaired public Astral Guardian samples were not the defective five-entity files and remain unchanged.

### Structure packages

| Base | Dimensions | Base bytes | Mask bytes | Boundary |
| --- | ---: | ---: | ---: | --- |
| `structures/astral-headquarters.png` | 1024×947 | 1,196,732 | 53,486 | Faction architecture fixed; owner banners, marks, and restrained accents masked |
| `structures/gravebound-headquarters.png` | 1024×933 | 1,139,685 | 61,852 | Faction architecture fixed; owner banners, marks, and restrained accents masked |
| `structures/resource-point.png` | 1024×1024 | 951,762 | 56,248 | Neutral shared base; flag, capture ring, mark, and bounded light masked |
| `structures/production-outpost.png` | 1024×810 | 977,617 | 43,129 | Neutral shared base; banners, crystals, mark, and bounded light masked |

The original approved 65-file direct package totals **12,692,541 bytes**, below its 14 MiB review budget. It intentionally has no HTML, CSS, or JavaScript review application. The eight later `structures/phase5/` source PNGs are tracked alongside the masters for provenance but remain outside this historical Phase 1A inventory and budget.

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
| Phase 5 structure damage | The same four approved forms as readable damaged and collapsed transparent full-canvas sources, preserving architecture and ground-root placement | Exact repository sources and SHA-256 values are frozen in the Phase 5 table above and `phase5/assets/structures/manifest.js` |

Local processing used Sharp and ImageMagick only after generation: border-connected neutral background removal; component filtering; shared-scale/root normalization; exact idle-to-move-frame-zero reuse; upper-body pixel locking for movement; frame-aligned material masks; atlas and JSON export; exact horizontal mirror in review playback; actual-scale WebP encoding; structure downscaling to a 1024-pixel envelope; mask clamping inside source alpha; narrowed saturated-color selection so cool masonry shadows remain fixed; and code-native review composition. No limb was independently generated, substituted, or runtime-rigged after the approved method was locked.

The workspace visual audit caught and corrected four export defects before this candidate: trapped checker pixels inside closed bow silhouettes, near-white structure highlights incorrectly removed as background, ownership masks that initially captured cool stone shadows, and an Aegis gait/punch whose nearly front-facing anatomy disagreed with lateral motion. The current integrated tests enforce frame identity, stable movement upper bodies, frame counts/cadence/loop metadata, transparent cell edges, mask containment, structure dimensions, direct-file inventory, the corrected Aegis asset hashes, and the 14 MiB review budget.

## Superseded Phase 1A v5 proof inventory

Intermediate `v2026.8.20b` is an unpublished review iteration retained in source and Git history for provenance but excluded from Pages. Its environment, structures, damage direction, and player-color boundary informed the approved contract, but its v5 entity animation sheets are superseded: they use the wrong authored facing, equal six-frame counts, whole-sprite transforms, and inconsistent anatomy/root behavior. None of these images is an implemented game screenshot, complete shipping sprite set, balanced map, or physical-device result.

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

Total archived superseded v5 proof-image payload: **2,263,262 bytes**. These source records are not staged to Pages or embedded into the approved review page.

### Origin, transformation, and distribution

- **Direction:** XenoVoyage.
- **Raster source method/tool:** project-specific OpenAI image generation through OpenAI Codex, using only earlier project-generated work as mood reference. The final prompt set required a cartoon-leaning 2D environment-only battlefield and coherent complete-body base, stride, and strike poses with oversized readable equipment.
- **Raster transformation:** generated PNG outputs remained outside the repository. Local image processing removed metadata and border-connected checkerboard backgrounds, normalized ground contact, created the exact X-mirror, and encoded bounded WebP review copies. It never substituted, rotated, or regenerated an individual limb.
- **Superseded v5 method:** one complete left-facing base, stride, and strike pose per representative supplied the visible body and attached equipment. Idle and defeat used bounded whole-sprite transforms, move alternated complete base and stride poses, and right-facing rows were mirrors. The owner rejected that timing/anchor result; it is not the active method in [`PRODUCTION_ART.md`](PRODUCTION_ART.md).
- **Player color:** blue Astral and violet Gravebound fabric plus small identity accents are isolated into a separate mask. Coral and emerald proofs show the intended ownership recolor boundary; white/gold armor, charcoal body material, and bone armor remain faction material rather than player color.
- **Motion review result:** independently assembled limb boards remain rejected. Inspection of all 48 left-facing v5 timing frames exposed why whole-sprite transforms and separately sourced poses are also insufficient: stable anatomy alone did not guarantee a stable root, correct equipment scale, or convincing idle/movement playback.
- **Distribution decision:** candidate review assets are project material under the repository's MIT license. Generated output may not be unique, and approval of the visible direction will not silently promote every candidate pixel to final shipping art.
- **Delivery:** all eleven archived files remain local source records totaling 2,263,262 bytes. They are excluded from the staged Pages payload and the four-file offline status-shell cache; the approved 37-file review subset owns the publication boundary.

### Approved pipeline baseline and historical Phase 1B profile

The production method, selected tiers, and budget envelope were approved through the combined Phase 1B owner gate. The approved Phase 3 foundation implements the first six-representative runtime set and loader; the twelve-identity projection, browser/GPU measurements, and every later atlas still require their own evidence:

- **Master:** one controlled baked full-body sprite source per combat entity, with stable ground, selection, contact, and effect anchors plus a frame-aligned player-color mask. No limb rig or art tool ships to the browser.
- **Directions:** author the right-facing sequence and use an exact X-mirror for left-facing gameplay. Another depth angle may be proposed only if actual camera play proves two facings insufficient.
- **Animation families and frames:** idle uses one stable frame; move uses four lower-body gait frames at the reference 8 FPS; attack/cast and defeat use six full-body frames at the reference 12 FPS and 10 FPS respectively. Simulation ticks remain authoritative.
- **Frame and atlas envelope:** the 384×384, root `(192,354)` masters remain repository-only. The approved measured profile packs 16 unique frames into a 4×4 local lossless-WebP base plus separate mask: primary 128×128 cells in a 512×512 sheet with root `(64,118)`; compact 96×96 cells in a 384×384 sheet with rational root `(48,88.5)`. Logical idle aliases the byte-identical movement-frame-zero rectangle, preserving `1/4/6/6` without duplication.
- **Corrected export method:** crop cells before scaling; rescale each independently; reapply the movement-frame-zero upper region to movement frames one through three; pack; process the mask through the same path; clamp mask alpha to base alpha; then lossless encode. The packed-sheet-resize trial is rejected because cross-cell sampling broke the upper-body invariant.
- **Historical encoded survey:** after substituting the separately repaired Astral sample values, the unpublished six-pair feasibility survey appeared to total 435,142 bytes at 96 and 694,040 bytes at 128 and projected 870,284 and 1,388,080 bytes for twelve identities. Phase 3 reproduction proved that the other five survey exports had blank lower-body rows, so those totals and the 2,258,364-byte both-tier projection are historical defective evidence, not runtime ceilings. The fresh six-representative Phase 3 totals are 459,446 Compact, 734,126 Standard, and 1,193,572 combined; every later accepted atlas must still pass its own exact budget and visual checks.
- **Decoded entity pixels:** one selected twelve-identity tier is exactly 13.5 MiB at 96 or 24 MiB at 128. Default to 128; use 96 only when the player explicitly selects **Compact art** in Settings before battle. Load only participating factions and never intentionally retain both tiers decoded. Browser/GPU bookkeeping is measured separately and is not inferred from Resource Timing decoded-body bytes.
- **Structures:** the historical Phase 1B non-exact measurement was 630,706 bytes. The implemented Phase 4 exact-RGBA intact set is 634,642 encoded bytes and 4,279,296 decoded base-plus-mask bytes; the larger 512 alternative remains rejected unless maximum-zoom review proves 384 insufficient. The Phase 5 candidate adds twelve exact-RGBA damage derivatives totaling 1,040,292 encoded bytes, with exact source/retained arithmetic and provenance recorded above.
- **Loading/failure:** the approved Phase 3 foundation validates local base, mask, manifest, dimensions, frame map, root, and hash before battle. A missing required bundle shows a stable text-only local preload error, instantiates no entity, and blocks battle start; it never downloads an external substitute or improvises anatomy/ownership. It retains one selected tier, releases each mask after owner-sheet preparation, and exposes disposal for the remaining decoded sheets. Browser/GPU bookkeeping and menu-resource release remain measured evidence rather than assumptions.
- **Validation gate:** the approved Phase 1A package proves the exact contract across all six representatives. The original ImageMagick 6.9.12-98 Q16/libwebp 1.3.2 survey established a useful per-cell method but produced incomplete lower-body rows in five unpublished entity exports; the separately published Astral derivative was repaired and remains untouched. The fresh Phase 3 exporter reproduces all six complete entities at both tiers, clamps masks, clears cell borders, and records zero upper-region, border, mask-escape, and lossless-round-trip differences. Rendered browser scale/halo/root/mirror checks, GPU/process residency, and physical devices remain separate evidence.

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

## Phase 1A locked rules

The Phase 1A closing set is intentionally smaller than the later six-role-per-faction library. It proves one sustainable method across melee, ranged, and signature representatives; the approved Phase 1B lock expands the identity contracts without pretending that six new shipping atlases exist.

- **Visual target:** cartoon-leaning, hand-painted 2D fantasy viewed from a consistent three-quarter top-down angle. Silhouette, posture, weapon, and one restrained faction motif carry identity; faces, engravings, layered cloth, and portrait-level surface detail do not carry gameplay meaning.
- **Scale proof:** show ordinary and minimum gameplay zoom on a representative desktop and compact phone-landscape viewport with a crowded fight. Enlarged character sheets alone are insufficient.
- **Entity proof:** melee, ranged, and signature representatives from both opening factions prove faction contrast and the same baked full-body directional method. The approved Phase 1B lock retains them and names Comet Lancer, Radiant Cantor, Concord Exemplar, Barrow Warden, Dirge Oracle, and Sepulchral Regent as the remaining public identity contracts; those additions are not approved art, stats, abilities, or balance.
- **Structure proof:** two unique headquarters; one shared Resource Point; one shared Production Outpost. The two shared forms show neutral and multiple owned states using flags, banners, lights, patterns, and player marks rather than model replacement or color alone.
- **Animation proof:** each representative demonstrates one stable idle frame, four lower-body-only movement frames, six full-body attack/cast frames, and six full-body defeat frames. Art is authored facing right and mirrored exactly for left gameplay; every state keeps coherent anatomy, oversized attached equipment, and one shared root. Runtime limb deformation, independently assembled body parts, and independently redrawn idle/movement upper bodies are not accepted.
- **Map proof:** the visible battlefield stays painted and coherent. Ground, non-blocking detail, navigation/blocker mask, anchors, dynamic ordering, and foreground occlusion remain separate map data; mountain pixels never become implicit collision, and technical layer diagrams are not presented as game art.
- **Pipeline decision:** use controlled baked full-body 2D frames plus frame-aligned player-color masks, exported to a local transparent atlas with small metadata. Record master format, exporter, directions, mirroring limits, dimensions, frame rate, bytes, anchors, origin, author/tool, license, transformations, validation, and owner state for every accepted asset.
- **Runtime budget:** the 12,692,541-byte original Phase 1A direct package is a bounded review/master set, not the shipping load; the eight later Phase 5 source PNGs are separate repository-only provenance. The approved measured Phase 1B profile and implemented Phase 3/4/5 candidate bytes are recorded above and in their owner documents. Phase 5 deployed/browser residency and physical-device quality remain open.

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
5. Confirm an optional presentational-asset failure leaves a functional fallback without stopping an already valid simulation. A required combat base/mask/metadata bundle is different: show the stable text-only local preload error and block battle start before simulation rather than instantiate incomplete or substituted art.
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
