# Phase 1A approved production-feasibility package

Status: **approved by the product owner on 2026-08-21; merged into source through pull request `#10`; optimized visual review published through pull requests `#11` and `#12`; non-playable and not a runtime atlas**.

This directory is the direct-file Phase 1A closure package. It intentionally has no HTML review application. Start with the five files in [`review/`](review/), then inspect the actual-scale animated WebP files in each entity directory. These are production-art and composition proofs, not gameplay screenshots.

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

The product owner directly approved the corrected Aegis Titan and complete integrated package on 2026-08-21, closing Phase 1A and locking this visible production direction and asset method. The owner then authorized the standardization and closure change to merge and deploy. Protected pull request `#10` squash-merged as `0d74dd9174f0db873c1c9ea8cfc824c1ea231660`, and its origin branch `agent/phase1a-unified-production-proof` was automatically deleted.

The owner subsequently authorized publication of the approved visual review at `concepts/feasibility/`. Protected pull request `#11` published the bounded review as merge commit `b68dad6c611e9885967d866b776af38c776acd75`; pull request `#12` published the cache-safe stylesheet reference as merge commit `d6ca16927e9dfef4551323d66f6d96930e6e2f38`. The Pages payload contains the five review compositions, all 24 actual-scale state playbacks, all six player-color proofs, the environment plate, and the damage proof. Raw atlas, mask, structure-master, and metadata files remain repository-only authoring evidence. Publication does not turn any asset into gameplay or approve balance, the eventual full six-role-per-faction roster, final runtime atlas dimensions, controls, UI, AI, networking, a tag, or a release. The owner approved the complete later Phase 1B identity, control, UI, viewport, and measured runtime-envelope target on 2026-08-21, authorizing the bounded Phase 2 landscape foundation without reopening this Phase 1A package.
