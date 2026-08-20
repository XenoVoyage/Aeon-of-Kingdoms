# Assets and art direction

This file owns the active reference inventory and preserves the rejected prototype asset record below. Phase 1 of [`REDESIGN.md`](REDESIGN.md) still must establish approved shipping art, provenance/licensing, animation, atlas, and size rules before new gameplay rendering begins.

## Reviewed redesign mood references

The deployed `v2026.8.16` gallery includes eight raster references. On 2026-08-20 the product owner retained their battlefield composition, faction contrast, combat language, and restrained interface as mood direction, while rejecting their literal realism and detail as the production target. They are not gameplay screenshots, final production assets, implementation evidence, or proof that their detail survives normal RTS zoom.

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

## Phase 1A production-feasibility rules

The next reference set is intentionally smaller than a full faction asset library. It must prove that one sustainable method works before the project expands it.

- **Visual target:** stylized semi-realistic tactical miniatures viewed from a consistent three-quarter top-down angle. Silhouette, posture, weapon, and one restrained faction motif carry identity; faces, engravings, layered cloth, and portrait-level surface detail do not carry gameplay meaning.
- **Scale proof:** show ordinary and minimum gameplay zoom on a representative desktop and compact phone-landscape viewport with a crowded fight. Enlarged character sheets alone are insufficient.
- **Entity proof:** two factions, three representative roles each—one melee, one ranged, and one large or signature form—plus silhouette-only and ownership-state checks. All six permanent role contracts are expanded only after the method is approved.
- **Structure proof:** two unique headquarters; one shared Resource Point; one shared Production Outpost. The two shared forms show neutral and multiple owned states using flags, banners, lights, patterns, and player marks rather than model replacement or color alone.
- **Animation proof:** one representative combat entity per opening faction demonstrates idle, move, attack or cast, and defeat with stable foot anchors. Wind-up, contact, and recover timing is annotated inside the attack family. Independently generated AI frames are not accepted as a production sequence.
- **Map proof:** show ground, non-blocking detail, navigation/blocker mask, anchors, dynamic ordering, and foreground occlusion as separate authored layers. Mountain pixels never become implicit collision.
- **Pipeline decision:** prefer a controlled layered-vector or tightly authored sprite master exported to a local transparent atlas with small metadata. The proof records master format, exporter, directions, mirroring limits, dimensions, frame rate, bytes, origin, author/tool, license, and transformations before the method is approved.
- **Runtime budget:** no final atlas or total asset limit is approved yet. The proof must supply measured desktop and phone sizes before Phase 1B closes those budgets.

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
