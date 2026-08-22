# Phase 1A closure handoff

Status date: **2026-08-21 (Europe/Zagreb)**

Repository: `XenoVoyage/Aeon-of-Kingdoms`

Origin branch: `agent/phase1a-unified-production-proof` (automatically deleted after merge)

Merge provenance: pull request `#10`, squash commit `0d74dd9174f0db873c1c9ea8cfc824c1ea231660`

Public transition: **protected pull requests `#11` and `#12` published the optimized approved Phase 1A visual review as `v2026.8.21a`; raw masters remain repository-only; no new tag, GitHub Release, or gameplay was created; the rejected `v2026.8.15` tag and Release were retired without rewriting history**

This document is the authoritative Phase 1A closure record for a contributor or model with no access to the design conversation. [`STATUS.md`](STATUS.md) owns the current active boundary. The repository must be sufficient by itself; do not ask a future contributor to infer approved intent from chat memory, filenames, old screenshots, or the rejected prototype.

## Authority and required reading

Read these sources in order before changing the project:

1. [`../AGENTS.md`](../AGENTS.md) - enduring contributor, evidence, Git, and publication rules.
2. [`STATUS.md`](STATUS.md) - current maturity, evidence boundary, and engineering-standard adoption state.
3. [`REDESIGN.md`](REDESIGN.md) - active product contract and ordered phase gates.
4. [`PRODUCTION_ART.md`](PRODUCTION_ART.md) - binding art, facing, animation, mask, structure, and validation rules.
5. This handoff - exact Phase 1A closure, review paths, rejected approaches, and next boundary.
6. [`PHASE1B_VISUAL_LOCK.md`](PHASE1B_VISUAL_LOCK.md) - the later owner-approved complete non-playable Phase 1B target.
7. [`PHASE2_FOUNDATION.md`](PHASE2_FOUNDATION.md) - the approved and closed landscape-foundation contract and retained evidence debt.
8. [`PHASE3_ENTITY_MOVEMENT.md`](PHASE3_ENTITY_MOVEMENT.md) - the later authorized entity/movement contract and current owner gate.
9. [`../concepts/feasibility/phase1a/README.md`](../concepts/feasibility/phase1a/README.md) and [`manifest.json`](../concepts/feasibility/phase1a/manifest.json) - direct review order and machine-readable inventory.
10. [`CONVERSATION_DECISIONS.md`](CONVERSATION_DECISIONS.md) - historical rationale only; it never overrides the files above.

`GAME_DESIGN.md` and `ARCHITECTURE.md` are explicitly prototype-era historical documents until later redesign phases replace them. Do not restore their rejected names, structure taxonomy, tuning, UI, runtime layout, or art direction.

## Executive state

- The product owner rejected the formerly deployed `v2026.8.15` gameplay prototype at commit `7f88655` as the future product baseline. Its misleading public tag and GitHub Release were retired on 2026-08-21 without rewriting Git history; the commit remains reachable and the label must not be reused.
- Phase 0 truth/cleanup is complete. The live site truthfully shows a non-playable redesign status surface.
- Phase 1A produced a complete production-feasibility package for two opening factions, six representative combat entities, three structure categories, a separate environment plate, damage language, six-player ownership treatment, and desktop/phone scale compositions. Pull request `#10` merged it into source.
- The owner approved the baked full-body directional-sprite method, one-frame idle, four-frame locked-upper-body movement, six-frame action and defeat, exact horizontal mirroring, separate player-color masks, environment-only battlefield, structure taxonomy, structure damage language, and six-player color-plus-symbol principle.
- On 2026-08-21 the owner judged the complete package ready except that Aegis Titan's movement and action had inconsistent directional anatomy. The candidate replaced those states with a coherent right-facing gait and punch while retaining the approved identity, root, mask, and defeat behavior.
- After direct review, the owner approved the corrected Aegis Titan and complete integrated package on 2026-08-21. Phase 1A is closed as a non-playable production-feasibility and visual-direction proof.
- The owner then authorized the standardization and closure change to merge and deploy. Protected pull request `#10` squash-merged as `0d74dd9174f0db873c1c9ea8cfc824c1ea231660`; its origin branch was automatically deleted. That deployment intentionally excluded the direct package. Protected pull requests `#11` and `#12` later published the bounded public review containing the five approved compositions, all 24 actual-scale state playbacks, all six player-color proofs, the environment plate, and the damage proof; raw masters stay repository-only.
- The later script-free Phase 1B target fixed the complete menu/HUD, twelve identities, landscape controls, viewport policy, and measured runtime-art envelope without creating shipping atlases or gameplay. The owner explicitly approved that complete target on 2026-08-21 and authorized Phase 2.
- At the time of this handoff, Phase 2 could build only the semantic landscape shell, bounded camera, six-layer two-player map, terrain renderer, blockers, and navigation debug surface defined in [`PHASE2_FOUNDATION.md`](PHASE2_FOUNDATION.md). The owner later approved Phase 2 on 2026-08-22 and authorized the separate Phase 3 contract; [`STATUS.md`](STATUS.md) owns that current boundary.

## Game being built

Aeon of Kingdoms is an original landscape-only 2D browser RTS centered on readable territorial control, deliberate reinforcement, slow formation-aware army movement, explicit tactical commands, and deterministic rules. It avoids free-form base construction in the first replacement release. The world uses fixed strategic structures and a map larger than the viewport.

The first correct replacement release targets:

- one approved illustrated battlefield with hard authored blockers and separate navigation data;
- two visually distinct opening factions;
- faction-unique headquarters plus shared capturable Resource Points and Production Outposts;
- deterministic economy, population, production queues, spawn validation, and rally commands;
- slow readable formations, explicit target attacks, attack-move, defend, stop, and nearby autonomous combat;
- strategic two-player AI using the same command boundary as humans;
- desktop and physical landscape-touch evidence;
- no multiplayer claim until later real cross-network matches are observed.

## Locked Phase 1A product contracts

| Area | Binding decision |
| --- | --- |
| Visible style | Cartoon-leaning hand-painted 2D fantasy tactical miniatures, informed by late-1990s/early-2000s RTS readability, with broad silhouettes and restrained detail |
| Camera language | Consistent three-quarter top-down battlefield view; 2D only |
| Gameplay orientation | Landscape only; portrait gameplay later receives a rotate-device gate rather than a compressed layout |
| Battlefield | Environment-only painted plate; entities, structures, flags, ownership, damage, selection, effects, and interface remain separate |
| Structure taxonomy | Exactly three categories: faction headquarters, shared Resource Point, shared Production Outpost |
| Headquarters | One faction-specific architectural form per opening faction |
| Shared structures | One neutral reusable form per category; capture changes ownership layers, never the structure category |
| Damage | Intact, damaged/scorched with bounded fire/smoke, destroyed/collapsed; healthy structures do not use decorative damage fire |
| Entity source | Coherent baked full-body raster frames; no runtime limb assembly, bone rig, or anatomy deformation |
| Facing | Author canonical right-facing art; render left by exact horizontal `scaleX(-1)` mirror |
| Ownership | Separate frame-aligned color masks plus stable non-color player symbols; hue is never the only cue |
| Simulation boundary | Simulation ticks own movement, hits, damage, death, capture, production, and cleanup; animation only communicates state |

## Phase 1A entity set

| Faction | Role proved in Phase 1A | Combat entity | Directory |
| --- | --- | --- | --- |
| Astral Concord | Melee | Astral Guardian | `concepts/feasibility/phase1a/entities/astral-guardian/` |
| Astral Concord | Ranged | Starbow | `concepts/feasibility/phase1a/entities/starbow/` |
| Astral Concord | Signature | Aegis Titan | `concepts/feasibility/phase1a/entities/aegis-titan/` |
| Gravebound Court | Melee | Gravebound Reaver | `concepts/feasibility/phase1a/entities/gravebound-reaver/` |
| Gravebound Court | Ranged | Hollow String | `concepts/feasibility/phase1a/entities/hollow-string/` |
| Gravebound Court | Signature | Ossuary Colossus | `concepts/feasibility/phase1a/entities/ossuary-colossus/` |

These six are production-method representatives, not the final permanent twelve-entity opening roster. Phase 1B owns the complete six-role-per-faction identity lock and may refine public names. Do not silently revive the prototype roster or treat these six representatives as proof of final balance.

## Entity export and animation contract

Every Phase 1A entity directory contains:

- `atlas.png` - 2304x1536 RGBA review-master atlas;
- `player-mask.png` - frame-aligned RGBA ownership mask;
- `atlas.json` - frame count, row, cadence, root, bounds, loop, and facing metadata;
- `idle.webp`, `move.webp`, `attack.webp`, `defeat.webp` - actual-scale right/mirrored-left playback;
- `player-colors.webp` - base, mask, coral, and emerald recolor proof.

The current review-master profile is:

| State | Frames | Reference cadence | Loop | Required behavior |
| --- | ---: | ---: | --- | --- |
| Idle | 1 | held at 1 FPS metadata | Yes/held | One perfectly stable frame; no fake breathing, morphing, scale pulse, or pivot drift |
| Move | 4 | 8 FPS | Yes | Frame zero equals idle; pixels above the approved lower-body cutoff are identical; world coordinates provide translation |
| Attack/cast | 6 | 12 FPS | No | Ready, wind-up, travel, contact, follow-through, recovery; coherent full body and attached equipment |
| Defeat | 6 | 10 FPS | No | Loss of balance and collapse; simulation owns defeat and cleanup |

All states use 384x384 cells and root `(192, 354)` in the review master. This profile is not automatically the shipping atlas. Phase 1B later approved the measured 128-pixel primary and 96-pixel compact envelope without weakening shared roots, exact mirroring, or mask alignment; implementation and each eventual atlas still require separate validation.

### Aegis Titan correction

The rejected Aegis Titan candidate faced almost directly toward the camera while its legs and punch implied lateral motion. Horizontal mirroring therefore did not produce credible left/right movement. The current package corrects that defect:

- crystal head, chest, hips, knees, feet, and punch agree on canonical screen-right movement;
- the movement upper body is pixel-locked while only the lower-body gait changes;
- the punch travels toward screen-right and mirrors exactly toward screen-left;
- identity remains the broad ivory/gold stone construct with blue crystal head and accents, black stone joints, oversized fists, and no weapon or shield;
- player-color surfaces remain separately masked;
- the approved defeat source remains unchanged.

The direct owner-review files are `entities/aegis-titan/move.webp`, `entities/aegis-titan/attack.webp`, `entities/aegis-titan/atlas.png`, and `entities/aegis-titan/player-mask.png`.

## Structures, environment, and ownership

| Asset | Binding role |
| --- | --- |
| `environment/battlefield-environment.webp` | Environment only; no baked dynamic entity, structure, flag, ownership mark, capture ring, selection, effect, or interface |
| `structures/astral-headquarters.png` | Astral-specific headquarters architecture with separate ownership mask |
| `structures/gravebound-headquarters.png` | Gravebound-specific headquarters architecture with separate ownership mask |
| `structures/resource-point.png` | Shared neutral Resource Point with separate capture/ownership mask |
| `structures/production-outpost.png` | Shared neutral Production Outpost with separate capture/ownership mask |
| `structures/production-outpost-damage.webp` | Intact, scorched/burning, and collapsed language for one unchanged structure category |

The six player treatments are Azure/diamond, Violet/cross, Coral/triangle, Emerald/circle, Amber/bars, and Magenta/chevron. Runtime ownership must combine recolorable surfaces with the stable symbol or another approved non-color cue.

## Required direct review order

1. `concepts/feasibility/phase1a/review/opening-entities.webp`
2. `concepts/feasibility/phase1a/review/six-player-ownership.webp`
3. `concepts/feasibility/phase1a/review/battlefield-desktop.webp`
4. `concepts/feasibility/phase1a/review/battlefield-phone.webp`
5. `concepts/feasibility/phase1a/review/entity-atlas-audit.jpg`
6. Each entity's four actual-scale playback files, with special attention to corrected Aegis Titan movement and attack
7. Every base/mask pair and the Production Outpost damage progression

These files are review compositions or assets. They are not screenshots of implemented gameplay and do not prove game feel, physical-device quality, balance, or runtime performance.

## Explicitly rejected approaches

Do not reintroduce any of the following:

- the `v2026.8.15` prototype UI, procedural neon/geometric battlefield art, map/site taxonomy, AI behavior, movement feel, or `unit*` compatibility names;
- the mixed painted/geometric `v2026.8.20a` feasibility proof as the production target;
- independently generated limb boards, visible bone overlays, runtime skeletal deformation, or body-part assembly;
- undersized weapons or equipment that loses readability at gameplay scale;
- separately redrawn idle frames or separately redrawn movement upper bodies;
- whole-sprite idle/move transforms that create root sliding, scale pulses, or frame morphing;
- separately authored left/right sequences;
- baked battlefield armies or structures;
- player ownership that recolors anatomy, bone, primary armor, weapon metal, or the entire structure;
- a fourth structure disguised by a new name;
- a heavyweight HTML approval page unless the owner explicitly requests one.

## Evidence boundary

The repository's pixel tests can prove file inventory, dimensions, cell transparency, frame counts, root metadata, idle/move identity, movement upper-body identity, mask containment, structure-mask alignment, and package budgets. Manual workspace inspection establishes only that the rendered files were inspected. The product owner's direct approval and later publication authorization are separately recorded above; neither implies physical-device evidence, gameplay quality, or runtime validation.

For any future change to this package, run from the repository root:

```sh
node tests/run.js
node .github/scripts/stage-pages.js _site
git diff --check
git status --short
```

Inspect the exact staged allowlist and complete branch diff. Pull request `#10` historically passed 72/72 checks on Node.js 20.20.2 and deployed the earlier 31-file allowlist plus `.nojekyll`; protected pull requests `#11` and `#12` published the owner-authorized review with 57 allowlisted files plus `.nojekyll`. [`STATUS.md`](STATUS.md) owns final deployment evidence. Do not expand the bounded public subset, tag, release, or begin gameplay merely because checks pass.

## Closure and next boundary

Phase 1A closed on 2026-08-21 when the product owner directly approved the corrected Aegis Titan and complete integrated set. The standardization and closure record subsequently merged and deployed through pull request `#10`; the optimized approved review then published through pull requests `#11` and `#12` while authoring masters remained repository-only. Closure and publication do not authorize a tag, release, gameplay renderer, or later-phase implementation.

The later target in [`PHASE1B_VISUAL_LOCK.md`](PHASE1B_VISUAL_LOCK.md) and [`concepts/phase1b/`](../concepts/phase1b/) presented all seven required Phase 1B decisions for explicit owner review:

1. original minimal menu and map-dominant gameplay HUD;
2. complete battlefield target with routes, blockers, structures, production/rally feedback, and combat readability;
3. complete two-faction identity language and all six permanent role contracts per faction;
4. landscape phone/tablet/desktop interaction mockups and safe areas;
5. final runtime atlas dimensions, loading/fallback behavior, encoded/decoded budgets, and browser measurement;
6. supported landscape aspect range, minimum viewport, letterboxing/safe-area rules, and test matrix;
7. explicit confirmation that rejected prototype and Neon Voyage assets/layouts were not reused.

The owner explicitly approved the combined candidate on 2026-08-21, closing every Phase 1B checklist item and authorizing the bounded Phase 2 foundation. The later correction of missing lower-body pixels in three derived Astral Guardian browser-sample movement cells restored them from the intact approved master and did not change or reopen the Phase 1B decisions. That was the boundary at Phase 1B closure; the owner subsequently approved Phase 2 on 2026-08-22 and authorized Phase 3 under [`PHASE3_ENTITY_MOVEMENT.md`](PHASE3_ENTITY_MOVEMENT.md).

## Cold-start procedure

A future contributor must begin with read-only verification:

```sh
git status --short --branch
git log -5 --oneline --decorate
node --test tests/phase1a-production-assets.test.js
```

Then read the authority chain above, inspect the direct review files, and report its understanding of the active boundary, locked constraints, pending evidence, and intended next change before editing. Begin current work from `main` on a new short-lived branch. The Phase 1A origin branch was deleted after merge; use pull request `#10` and commit `0d74dd9174f0db873c1c9ea8cfc824c1ea231660` for provenance rather than recreating assets from memory.
