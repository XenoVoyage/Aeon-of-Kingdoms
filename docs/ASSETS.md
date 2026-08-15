# Assets and art direction

> **Prototype-era document:** everything below records the rejected `v2026.8.15` asset set and visual direction. It must not guide the replacement. Phase 1 of [`REDESIGN.md`](REDESIGN.md) will establish original approved art, recorded provenance/licensing, animation, atlas, and size rules before new gameplay rendering begins.

The vertical slice uses procedural Canvas shapes and local interface styling. This keeps unit silhouettes crisp across zoom levels, supports recoloring and animation without sprite duplication, and avoids a runtime download or build pipeline.

## Current inventory

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

## Visual language

Aeon of Kingdoms combines fantasy, mythology, modern technology, and alien civilizations inside one deep-space visual system.

- **Foundation:** near-black navy and blue-violet terrain with sparse depth texture.
- **Information:** electric cyan for selection and readable neutral systems; violet for Aether and high-energy objectives.
- **Danger:** restrained coral or amber accents, reserved for damage, hostile pressure, and irreversible actions.
- **Factions:** distinct outer silhouette and internal motif before palette. Human geometry is ordered and luminous; Undead geometry is broken, bone-like, and void-lit.
- **Hierarchy:** the map is quiet, armies are readable, selected units are unmistakable, and UI remains calmer than combat.

The tone should feel scientific and premium without covering a strategy map in glow. Bloom, particles, trails, and screen movement support state feedback; they do not substitute for shape, labels, or contrast.

## Unit readability

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

## Animation rules

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

## README capture gate

The current capture passed this gate on 2026-08-15. Future replacements must preserve the same evidence standard.

The first real README capture should:

- come from the local or deployed game at a 16:9 desktop viewport;
- show selected units, two site types, readable HUD resources/population/objective state, and both faction identities;
- contain no browser chrome, debug overlay, private room code, or unrelated mockup treatment;
- use meaningful alternative text and a repository-local WebP file;
- remain visually clean after GitHub scales it down;
- be checked against the rendered README and referenced by the repository audit.

Automated checks can prove file type, reference integrity, dimensions, and size. They cannot prove composition, clarity, accessibility, or that the capture accurately represents enjoyable play; those require visual review.
