# Conversation-derived decision record

Status: **historical rationale reconstructed on 2026-08-21; not a verbatim transcript and not a source of authority**.

This file preserves the product decisions and failure lessons that materially shaped Phase 1A for a contributor with no chat history. Older conversation turns were compacted and are not available as a guaranteed verbatim record. The authoritative rules live in `AGENTS.md`, `PHASE1A_HANDOFF.md`, `REDESIGN.md`, and `PRODUCTION_ART.md`. If this chronology conflicts with those files, the authoritative files win.

## Why this record exists

The Phase 1A direction was reached through several rejected visual and animation methods. A raw transcript would mix obsolete instructions with approved rules and would encourage a future model to repeat discarded work. This reconstruction records the reason for each decision while clearly labeling what was rejected.

## Decision chronology

### 1. Reject the original prototype

The product owner rejected the published `v2026.8.15` gameplay prototype as the future baseline. Its neon/geometric presentation, interface, battlefield, site taxonomy, movement feel, combat interactions, terminology, and AI were not to be incrementally polished. The repository moved to a truthful non-playable redesign status surface and an ordered phase roadmap.

Durable result:

- preserve the prototype only as historical evidence;
- rebuild one approved phase at a time;
- use `entity`, not prototype `unit*`, in redesigned code;
- do not treat implemented prototype behavior as a requirement.

### 2. Keep mood, reject literal realism

Eight high-detail painted frames established useful battlefield composition, faction contrast, combat language, and restrained interface mood. The owner rejected their literal detail and realism as a production sprite target because they did not prove small-screen readability, crowded battles, consistent animation, or a sustainable content budget.

Durable result:

- cartoon-leaning hand-painted 2D tactical miniatures;
- broad silhouette and equipment carry identity;
- detail must survive actual gameplay scale;
- high-detail paintings remain mood references only.

### 3. Reject the mixed feasibility proof

The deployed `v2026.8.20a` proof mixed painted battlefield/entity references with geometric diagrams and therefore failed to communicate one intended visible game. It remained useful for scale and technical discussion but was superseded as an approval surface.

Durable result:

- one coherent painted visual language for environment, entities, and structures;
- technical layer diagrams describe data, not visible art;
- use direct files instead of another large HTML proof.

### 4. Lock environment and structures

The owner approved an environment-only battlefield, the three-category structure model, damage language, and recolorable ownership surfaces. Tiny armies shown in earlier battlefield paintings were composition placeholders only and must not be baked into terrain.

Durable result:

- terrain is a separate environment plate;
- dynamic entities and structures are runtime layers;
- exactly three categories: faction headquarters, shared Resource Point, shared Production Outpost;
- only headquarters vary architecturally by faction;
- shared structures remain one model before/after capture;
- damage progresses from intact to scorched/fire to collapsed;
- healthy structures do not use decorative damage fire.

### 5. Reject generated cutout assembly

Early entity attempts generated separate limbs and equipment, then assembled and rotated them. The results had wrong limb pairings, exposed sockets, open joints, detached weapons, incorrect z-order, malformed defeat poses, and animations that inherited the assembly errors. A later technical bone overlay placed body landmarks incorrectly and was also rejected.

Durable result:

- no visible or runtime limb rig;
- no independently generated body parts;
- every visible animation frame is a coherent complete body;
- equipment is already attached to the correct hand/arm in each authored frame.

### 6. Correct weapon scale and directional logic

Some corrected static entities still used undersized sword, shield, and scythe shapes. The owner required exaggerated equipment that remained readable at RTS scale. The owner also required a single direction that could be mirrored like Unity `scaleX(-1)` rather than separately authored left/right drawings.

Durable result:

- oversized readable weapons and shields;
- canonical right-facing source;
- exact horizontal mirror for left;
- no independently redrawn opposite facing.

### 7. Reject whole-sprite pseudo-animation

A baked-frame candidate used attractive static poses but produced unrealistic movement and action timing. Whole-sprite transforms and unrelated full-body poses looked counterintuitive in motion despite looking good as still images.

Durable result:

- author actual full-body state frames rather than translating or rotating a static illustration;
- review cadence at gameplay scale, not only contact sheets;
- movement, attack, and defeat must preserve one identity and root.

### 8. Accept the late-1990s sprite direction

A fresh Astral Guardian prototype used complete authored sprite frames and was described by the owner as the desired late-1990s-game direction. Its action and defeat worked, but idle and movement visibly drifted and morphed between frames.

Durable result:

- keep the baked-frame method;
- fix frame registration and identity rather than returning to a rig;
- slower, fewer, deliberate frames are preferable to unstable smoothness.

### 9. Discover that alignment alone was insufficient

Center/pivot alignment reduced numerical drift but did not fix the visible problem because the generator had redrawn the helmet, shoulders, shield, leg spacing, and body scale. The owner correctly identified that the art itself changed between frames.

Durable result:

- idle is one stable canonical frame;
- movement is four frames;
- idle equals movement frame zero;
- movement shares one exact upper body and equipment region;
- only the lower-body gait changes;
- world coordinates move the entity; the sprite loop never slides it.

### 10. Approve the production method

The stable Astral Guardian established the accepted method:

- one-frame idle;
- four-frame 8 FPS movement with invariant upper body;
- six-frame 12 FPS action;
- six-frame 10 FPS defeat;
- 384x384 review cells and root `(192,354)`;
- right-facing canonical source and exact mirrored left;
- coherent full-body frames only;
- separate frame-aligned player-color mask.

The owner explicitly asked that these decisions be written into repository instructions so future models would not need memory. `PRODUCTION_ART.md` and the `AGENTS.md` cold-start rules were created for that purpose.

### 11. Expand to the complete Phase 1A representative set

Phase 1A was deliberately bounded to six representatives rather than the eventual full twelve-role opening roster:

- Astral Guardian - melee;
- Starbow - ranged;
- Aegis Titan - signature;
- Gravebound Reaver - melee;
- Hollow String - ranged;
- Ossuary Colossus - signature.

Every representative received the same atlas, mask, metadata, playback, and player-color proof contract. The completed package also added six-player color-plus-symbol ownership and desktop/phone compositions.

### 12. Correct the last Aegis Titan defect

The owner judged the package complete except that Aegis Titan's movement and action mixed a nearly front-facing body with lateral feet and attack direction. This made mirroring semantically wrong even though the static model looked attractive.

The candidate rebuilt Aegis movement and punch so crystal head, torso, hips, knees, feet, and attack direction agree on screen-right. Movement retains a pixel-locked upper body, left remains an exact mirror, and the ownership mask remains separate. After direct review, the owner approved the corrected Aegis Titan and integrated set on 2026-08-21, closing Phase 1A. This historical approval did not authorize publication or gameplay implementation.

### 13. Approve the complete Phase 1B target

The script-free Phase 1B review assembled the previously separate decisions into one target: the owner-retained minimal menu, map-dominant HUD, two opening factions with six permanent public identity contracts each, the complete battlefield and three-structure language, desktop/tablet/phone landscape controls, portrait gate, 4:3–21:9 viewport policy, safe-area rules, and measured 128/96-pixel runtime-art envelope.

On 2026-08-21 the owner explicitly approved the complete Phase 1B candidate and authorized Phase 2 to begin. This closes the visual and interaction lock without claiming a shipping atlas, gameplay, physical-device evidence, tag, GitHub Release, or approval of the Phase 2 result.

### 14. Repair the bounded Astral browser samples

After approving Phase 1B, the owner noticed missing legs in three Astral Guardian movement cells shown by the browser-decode sample. Inspection proved that the approved 384-pixel authoring atlas and aligned mask still contained the complete lower bodies; only the four derived 96/128-pixel sample files were defective.

The samples were repaired deterministically from the approved master. Their already-approved upper regions remained unchanged, only the missing lower regions of movement cells one through three were restored, the mask followed the identical geometry and stayed inside base alpha, and no new art was generated. This was treated as a small derivative/export defect, not a reason to reopen Phase 1B or reinterpret the locked production method.

## Rejected-attempt reference table

| Rejected approach | Visible failure | Binding prevention |
| --- | --- | --- |
| Independent limb atlas | Wrong pairings, sockets, detached anatomy | Complete baked full-body frames only |
| Runtime/visible bone rig | Incorrect landmarks and limited believable angles | No runtime anatomy deformation |
| Independently redrawn idle | Morphing while standing still | One held canonical idle frame |
| Independently redrawn move upper body | Helmet/torso/equipment changes | Pixel-identical upper-body movement region |
| Whole-sprite transforms | Sliding, scale pulses, fake movement | Authored gait with fixed root |
| Separate left/right drawings | Direction and identity drift | Exact X mirror of canonical right |
| High frame count for its own sake | More inconsistent drawings and unclear timing | Intentional `1/4/6/6` baseline |
| Baked battlefield armies | Environment unusable as a runtime layer | Environment-only plate |
| Global recolor | Armor/bone/material identity lost | Restrained aligned player masks |
| Color-only ownership | Poor accessibility and six-player ambiguity | Stable color plus symbol/pattern |
| Decorative fire on healthy structure | Damage state becomes unclear | Fire reserved for damaged/destroyed presentation |
| Heavy HTML review | Slow/broken direct inspection | Direct raster, atlas, mask, and playback files |

## Owner communication preferences learned

- Inspect work before presenting it; do not call a visually flawed export finished because tests pass.
- Show direct files, especially actual-scale animation playback, rather than a large HTML preview.
- Static beauty is insufficient; motion quality, anatomy, equipment continuity, direction, root, and gameplay-scale readability matter.
- Prefer a simple professional method that is repeatable across many entities over a technically ambitious rig that produces errors.
- Preserve approved environment, structures, and player-color work when correcting an entity; do not restart unrelated accepted work.
- Keep player/faction colors adaptable on every controllable entity and ownable structure.
- Document durable decisions in Git so a memoryless future model can continue safely.
- Work one phase at a time and finish the active phase before expanding scope.

## Unresolved decisions intentionally deferred after Phase 1B

Phase 1B does not decide:

- actual map navigation data, blockers, anchors, or occlusion masks;
- implemented asset loading/failure behavior, browser/GPU residency, final layered-map budgets, or complete damage-state bytes;
- movement/combat tuning, balance, AI values, refund table, or networking transport;
- physical-device quality or deployed gameplay evidence.

Those decisions belong to the explicit Phase 2 and later gates in `REDESIGN.md`. The Phase 2 foundation may choose only its two-player map/camera/presentation data under `PHASE2_FOUNDATION.md`; it does not decide Phase 3 movement or later simulation rules.
