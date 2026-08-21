# Phase 1A closing candidate

Status: **complete feature-branch review candidate; the corrected Aegis Titan awaits direct product-owner confirmation; unpublished and unmerged**.

This directory is the direct-file Phase 1A handoff. It intentionally has no HTML review application. Start with the four files in [`review/`](review/), then inspect the actual-scale animated WebP files in each entity directory. These are production-art and composition proofs, not gameplay screenshots.

The canonical contract is [`docs/PRODUCTION_ART.md`](../../../docs/PRODUCTION_ART.md). The machine-readable inventory is [`manifest.json`](manifest.json).

## Review order

1. [`review/opening-entities.webp`](review/opening-entities.webp) — all six opening representatives at one visible style and scale.
2. [`review/six-player-ownership.webp`](review/six-player-ownership.webp) — six player colors plus six non-color symbols across every representative entity and all three structure categories.
3. [`review/battlefield-desktop.webp`](review/battlefield-desktop.webp) — desktop composition made from the separate environment, entity, structure, and ownership layers.
4. [`review/battlefield-phone.webp`](review/battlefield-phone.webp) — compact landscape crop using those same separate assets.
5. [`review/entity-atlas-audit.jpg`](review/entity-atlas-audit.jpg) — all canonical entity frames together for anatomy, equipment, contact, and background inspection.

## Entity packages

| Faction | Role | Entity | Direct package |
| --- | --- | --- | --- |
| Astral Concord | Melee | Astral Guardian | [`entities/astral-guardian/`](entities/astral-guardian/) |
| Astral Concord | Ranged | Starbow | [`entities/starbow/`](entities/starbow/) |
| Astral Concord | Signature | Aegis Titan | [`entities/aegis-titan/`](entities/aegis-titan/) |
| Gravebound Court | Melee | Gravebound Reaver | [`entities/gravebound-reaver/`](entities/gravebound-reaver/) |
| Gravebound Court | Ranged | Hollow String | [`entities/hollow-string/`](entities/hollow-string/) |
| Gravebound Court | Signature | Ossuary Colossus | [`entities/ossuary-colossus/`](entities/ossuary-colossus/) |

Every entity directory contains the same contract:

- `atlas.png`: canonical right-facing master frames in idle, move, attack/cast, and defeat rows;
- `player-mask.png`: frame-aligned ownership mask;
- `atlas.json`: cell, root, row, frame-count, cadence, facing, loop, and per-frame bounds metadata;
- `idle.webp`, `move.webp`, `attack.webp`, and `defeat.webp`: direct actual-scale playback showing canonical right and exact mirrored left;
- `player-colors.webp`: base, mask, coral, and emerald material-boundary proof.

Idle is one stable frame. Movement has four frames at the reference 8 FPS and uses the exact idle frame as movement frame zero; pixels above the approved lower-body cutoff remain identical across the row. Attack/cast and defeat each use six coherent full-body frames. Left facing is not separately authored: it is the exact horizontal mirror of canonical right.

The Aegis Titan package is the final corrected export. Its gait and punch now use one coherent screen-right body direction before exact mirroring. Review `entities/aegis-titan/move.webp` and `entities/aegis-titan/attack.webp` directly; the earlier nearly front-facing movement/action source is rejected and is not part of this package.

## Structure and environment packages

- [`environment/battlefield-environment.webp`](environment/battlefield-environment.webp) is environment-only. It contains no baked entity, structure, flag, ownership cue, selection mark, effect, or interface.
- `structures/astral-headquarters.png` and `structures/gravebound-headquarters.png` retain faction-specific architecture. Their paired masks recolor ownership banners, marks, lights, and restrained accents.
- `structures/resource-point.png` and `structures/production-outpost.png` are the neutral shared bases. Their paired masks apply captured ownership without changing structure category.
- [`structures/production-outpost-damage.webp`](structures/production-outpost-damage.webp) records the accepted intact, damaged/fire, and destroyed progression. Fire and smoke remain separate runtime effects when implemented.

Player color never owns anatomy, armor material, bone, leather, weapon metal, or a structure's category silhouette. Ownership also uses the stable diamond, cross, triangle, circle, bars, and chevron symbols defined in the manifest; hue is never the only signal.

## Boundary

Direct confirmation of the corrected Aegis Titan would close the remaining Phase 1A owner gate and lock this visible production direction and asset method. It would not approve gameplay, balance, the eventual full six-role-per-faction roster, final runtime atlas dimensions, controls, UI, AI, networking, a merge, deployment, tag, or release. Those remain later gated work.
