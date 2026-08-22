"use strict";

(function exposePhase5StructureAssetManifest(root, factory) {
  const manifest = factory();
  if (typeof module === "object" && module.exports) module.exports = manifest;
  if (root) root.AeonPhase5StructureAssetManifest = manifest;
})(typeof globalThis === "object" ? globalThis : this, function createPhase5StructureAssetManifest() {
  const freeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  };
  return freeze({
  "schema": 1,
  "phase": "5",
  "kind": "structure-damage-runtime-assets",
  "format": "lossless-webp",
  "source": {
    "intactManifest": {
      "path": "phase4/assets/structures/manifest.js",
      "bytes": 14895,
      "sha256": "34732c8026975589e2c93ec5a849b7e9e0accc29d3ee09679b7d10589aa77831"
    },
    "damageDirectory": "concepts/feasibility/phase1a/structures/phase5",
    "flattenedReview": {
      "path": "concepts/feasibility/phase1a/structures/production-outpost-damage.webp",
      "bytes": 83282,
      "sha256": "32d7ee61a97ba3937bc41ffe40944f9b9179ef55610b192bc703a79eb3ae3ee7",
      "runtimeAsset": false,
      "reason": "Flattened RGB review strip only; never cropped, traced, or promoted into Phase 5 runtime art."
    },
    "maximumEdge": 384,
    "resizeRule": "Preserve each Phase 4 full transparent canvas and resize to its exact intact runtime dimensions; never trim, crop, trace, or reframe."
  },
  "toolchain": {
    "exporter": "tools/export-phase5-structures.js",
    "exporterSha256": "dd04a53a49feb83e41f2b57004bb18651c4e1738a4d8d0fcfbc6ac199f7f94f1",
    "imageMagick": "6.9.12-98 Q16 x86_64 18038 https://legacy.imagemagick.org",
    "libwebp": "1.3.2 [020F]",
    "resize": "full transparent canvas; identical Phase 4 Lanczos geometry",
    "damagedMask": "derive only from the intact ownership mask, then clamp alpha to the damaged base and normalize visible RGB to white",
    "encode": "lossless WebP; exact RGBA; method 6; quality 100; metadata stripped; transparent RGB zeroed and round-trip verified"
  },
  "limits": {
    "structureCategories": 3,
    "structureForms": 4,
    "damageStates": 2,
    "generatedFiles": 12,
    "capturableOwnerSeatCap": 2,
    "encodedCeiling": 3145728,
    "decodedSourceCeiling": 13631488,
    "retainedDecodedCeiling": 13631488
  },
  "structures": [
    {
      "id": "astral-headquarters",
      "category": "headquarters",
      "architecture": "astral-concord",
      "faction": "astral-concord",
      "ownerPolicy": "fixed-faction",
      "sourceAnchorIds": [
        "astral-headquarters-anchor"
      ],
      "source": {
        "damaged": {
          "path": "concepts/feasibility/phase1a/structures/phase5/astral-headquarters-damaged.png",
          "dimensions": [
            1024,
            947
          ],
          "bytes": 1115620,
          "sha256": "f4ec0110028982967653a66bff0811cd15534ea7052ceb4d65ba525d2d9a37ed"
        },
        "destroyed": {
          "path": "concepts/feasibility/phase1a/structures/phase5/astral-headquarters-destroyed.png",
          "dimensions": [
            1024,
            947
          ],
          "bytes": 907533,
          "sha256": "e3b4484688b0256b91630f7be8cafb760d917bcaab22859937717b6e8567967c"
        },
        "intactMask": {
          "path": "concepts/feasibility/phase1a/structures/astral-headquarters-player-mask.png",
          "bytes": 53486,
          "sha256": "513828df6e9c36f5244f9a76b5ab7f6d5bc10649cf28fcbe1daca04293674f5a",
          "dimensions": [
            1024,
            947
          ]
        }
      },
      "presentation": {
        "drawSizeWorld": [
          192,
          177.5
        ],
        "sourceGroundRoot": [
          192,
          334
        ],
        "destinationGroundRoot": [
          96,
          167
        ],
        "anchorOffsetsFromGroundWorld": {
          "selection": [
            0,
            -18
          ],
          "health": [
            0,
            -154
          ],
          "owner": [
            70,
            -145
          ],
          "effect": [
            0,
            -94
          ]
        }
      },
      "files": {
        "damagedBase": {
          "path": "assets/structures/astral-headquarters/astral-headquarters-384-damaged-base.webp",
          "dimensions": [
            384,
            355
          ],
          "bytes": 160964,
          "sha256": "3b9360b5fbe0cd3f192e3edb79ffb302ee8f7f2404ca43bf7cad53db92219882",
          "alpha": {
            "visiblePixels": 60402,
            "strongPixels": 53733
          }
        },
        "damagedMask": {
          "path": "assets/structures/astral-headquarters/astral-headquarters-384-damaged-mask.webp",
          "dimensions": [
            384,
            355
          ],
          "bytes": 7268,
          "sha256": "b8c7353729a4978ae7e67f4c431c822bec0177e403fcef92c4978f341a59f51e",
          "alpha": {
            "visiblePixels": 8131,
            "strongPixels": 2916
          }
        },
        "destroyedBase": {
          "path": "assets/structures/astral-headquarters/astral-headquarters-384-destroyed-base.webp",
          "dimensions": [
            384,
            355
          ],
          "bytes": 107812,
          "sha256": "d9bd6fee3dfe363a854fb6c1ceec33cf5262ed5699d0f6865a974a660a66cec4",
          "alpha": {
            "visiblePixels": 52861,
            "strongPixels": 50475
          }
        },
        "encodedBytes": 276044,
        "decodedBytes": 1635840,
        "audit": {
          "borderAlphaPixels": 0,
          "maskEscapePixels": 0,
          "losslessRoundTripDifferences": 0,
          "transparentRgbPixels": 0,
          "clampedMaskPixels": 3615,
          "transparentRgbClearedPixels": 7683
        }
      }
    },
    {
      "id": "gravebound-headquarters",
      "category": "headquarters",
      "architecture": "gravebound-court",
      "faction": "gravebound-court",
      "ownerPolicy": "fixed-faction",
      "sourceAnchorIds": [
        "gravebound-headquarters-anchor"
      ],
      "source": {
        "damaged": {
          "path": "concepts/feasibility/phase1a/structures/phase5/gravebound-headquarters-damaged.png",
          "dimensions": [
            1024,
            933
          ],
          "bytes": 1006337,
          "sha256": "32ca744043e7a07e75e92d45ad9bb962c5e9e99025101bf75d863c94665b044b"
        },
        "destroyed": {
          "path": "concepts/feasibility/phase1a/structures/phase5/gravebound-headquarters-destroyed.png",
          "dimensions": [
            1024,
            933
          ],
          "bytes": 797573,
          "sha256": "dcd92fda86f5b2c971a099f0e79f498c31a544fb704c078d6e8d8f5f603a7b65"
        },
        "intactMask": {
          "path": "concepts/feasibility/phase1a/structures/gravebound-headquarters-player-mask.png",
          "bytes": 61852,
          "sha256": "01bd0630ec618648be20be6674b211d30040aba1b3f61dc0b8c0feca57cc630c",
          "dimensions": [
            1024,
            933
          ]
        }
      },
      "presentation": {
        "drawSizeWorld": [
          192,
          175
        ],
        "sourceGroundRoot": [
          192,
          330
        ],
        "destinationGroundRoot": [
          96,
          165
        ],
        "anchorOffsetsFromGroundWorld": {
          "selection": [
            0,
            -18
          ],
          "health": [
            0,
            -151
          ],
          "owner": [
            70,
            -141
          ],
          "effect": [
            0,
            -90
          ]
        }
      },
      "files": {
        "damagedBase": {
          "path": "assets/structures/gravebound-headquarters/gravebound-headquarters-384-damaged-base.webp",
          "dimensions": [
            384,
            350
          ],
          "bytes": 141366,
          "sha256": "fba403ff5b4eb28929c3bfad5870cd3a760c8eb881e1782a0f0f8b46822a4d9f",
          "alpha": {
            "visiblePixels": 63225,
            "strongPixels": 59340
          }
        },
        "damagedMask": {
          "path": "assets/structures/gravebound-headquarters/gravebound-headquarters-384-damaged-mask.webp",
          "dimensions": [
            384,
            350
          ],
          "bytes": 9358,
          "sha256": "7359f831f823093a0a890630feba056adf8893bb4dd1496296dbabacd65b77b9",
          "alpha": {
            "visiblePixels": 10399,
            "strongPixels": 5687
          }
        },
        "destroyedBase": {
          "path": "assets/structures/gravebound-headquarters/gravebound-headquarters-384-destroyed-base.webp",
          "dimensions": [
            384,
            350
          ],
          "bytes": 94632,
          "sha256": "00c97b9d872dbd3cb92c16e2b1bdcbd98fba8b759b39b30dc7777e901818d399",
          "alpha": {
            "visiblePixels": 47617,
            "strongPixels": 44822
          }
        },
        "encodedBytes": 245356,
        "decodedBytes": 1612800,
        "audit": {
          "borderAlphaPixels": 0,
          "maskEscapePixels": 0,
          "losslessRoundTripDifferences": 0,
          "transparentRgbPixels": 0,
          "clampedMaskPixels": 787,
          "transparentRgbClearedPixels": 7538
        }
      }
    },
    {
      "id": "resource-point",
      "category": "resource-point",
      "architecture": "shared-neutral",
      "faction": null,
      "ownerPolicy": "capturable-shared",
      "sourceAnchorIds": [
        "central-resource-point-anchor"
      ],
      "source": {
        "damaged": {
          "path": "concepts/feasibility/phase1a/structures/phase5/resource-point-damaged.png",
          "dimensions": [
            1024,
            1024
          ],
          "bytes": 1036661,
          "sha256": "3af2d0c2941c650315e95eaba6c8af14b618f3c233db0c89410863daced377c3"
        },
        "destroyed": {
          "path": "concepts/feasibility/phase1a/structures/phase5/resource-point-destroyed.png",
          "dimensions": [
            1024,
            1024
          ],
          "bytes": 920983,
          "sha256": "5bd8427d5e546bd214204128d6e8f9568927de9cb3eabe36372103f51bcb6272"
        },
        "intactMask": {
          "path": "concepts/feasibility/phase1a/structures/resource-point-player-mask.png",
          "bytes": 56248,
          "sha256": "5e26062554c721eafa4a5c5bb0cf53133c4a100f28faba92727c1dc1fc58dded",
          "dimensions": [
            1024,
            1024
          ]
        }
      },
      "presentation": {
        "drawSizeWorld": [
          128,
          128
        ],
        "sourceGroundRoot": [
          192,
          360
        ],
        "destinationGroundRoot": [
          64,
          120
        ],
        "anchorOffsetsFromGroundWorld": {
          "selection": [
            0,
            -18
          ],
          "health": [
            0,
            -108
          ],
          "owner": [
            48,
            -97
          ],
          "effect": [
            0,
            -56
          ]
        }
      },
      "files": {
        "damagedBase": {
          "path": "assets/structures/resource-point/resource-point-384-damaged-base.webp",
          "dimensions": [
            384,
            384
          ],
          "bytes": 153506,
          "sha256": "b6b130de241429511562ce0e8264e8216c038b0404f6f0903de1c8583a80b466",
          "alpha": {
            "visiblePixels": 71245,
            "strongPixels": 66009
          }
        },
        "damagedMask": {
          "path": "assets/structures/resource-point/resource-point-384-damaged-mask.webp",
          "dimensions": [
            384,
            384
          ],
          "bytes": 9150,
          "sha256": "1d04e7efcbd4418c56d0c22328d6f3bf6e281826fc0588332f0b118dfeeaf61b",
          "alpha": {
            "visiblePixels": 11313,
            "strongPixels": 6461
          }
        },
        "destroyedBase": {
          "path": "assets/structures/resource-point/resource-point-384-destroyed-base.webp",
          "dimensions": [
            384,
            384
          ],
          "bytes": 121744,
          "sha256": "74071ddc1bc1283dfc2bb8d0260a6b73393c5d1225f34128cd4f3889c403576a",
          "alpha": {
            "visiblePixels": 63797,
            "strongPixels": 61104
          }
        },
        "encodedBytes": 284400,
        "decodedBytes": 1769472,
        "audit": {
          "borderAlphaPixels": 0,
          "maskEscapePixels": 0,
          "losslessRoundTripDifferences": 0,
          "transparentRgbPixels": 0,
          "clampedMaskPixels": 4809,
          "transparentRgbClearedPixels": 6985
        }
      }
    },
    {
      "id": "production-outpost",
      "category": "production-outpost",
      "architecture": "shared-neutral",
      "faction": null,
      "ownerPolicy": "capturable-shared",
      "sourceAnchorIds": [
        "west-production-outpost-anchor",
        "east-production-outpost-anchor"
      ],
      "source": {
        "damaged": {
          "path": "concepts/feasibility/phase1a/structures/phase5/production-outpost-damaged.png",
          "dimensions": [
            1024,
            810
          ],
          "bytes": 957835,
          "sha256": "4322a84081a615b6aa617ba14aea8063797d8c58e4cd93c905862566626e15e4"
        },
        "destroyed": {
          "path": "concepts/feasibility/phase1a/structures/phase5/production-outpost-destroyed.png",
          "dimensions": [
            1024,
            810
          ],
          "bytes": 863728,
          "sha256": "a82d545ecb25220dbf2a8064dd5a2b15ec3d520aa40b2ec32e5c5225edc69fb1"
        },
        "intactMask": {
          "path": "concepts/feasibility/phase1a/structures/production-outpost-player-mask.png",
          "bytes": 43129,
          "sha256": "2e6595010e6f9ba428c391a3bef7eba6708fd3dac87b1c73096b0bdbabff1b06",
          "dimensions": [
            1024,
            810
          ]
        }
      },
      "presentation": {
        "drawSizeWorld": [
          160,
          126.66666666666667
        ],
        "sourceGroundRoot": [
          192,
          288
        ],
        "destinationGroundRoot": [
          80,
          120
        ],
        "anchorOffsetsFromGroundWorld": {
          "selection": [
            0,
            -18
          ],
          "health": [
            0,
            -108
          ],
          "owner": [
            60,
            -94
          ],
          "effect": [
            0,
            -62
          ]
        }
      },
      "files": {
        "damagedBase": {
          "path": "assets/structures/production-outpost/production-outpost-384-damaged-base.webp",
          "dimensions": [
            384,
            304
          ],
          "bytes": 126130,
          "sha256": "fb7202d0c0827f462684ab97ca6a673251dd25ffbde8c566d53c90644b6ffcfe",
          "alpha": {
            "visiblePixels": 64238,
            "strongPixels": 60964
          }
        },
        "damagedMask": {
          "path": "assets/structures/production-outpost/production-outpost-384-damaged-mask.webp",
          "dimensions": [
            384,
            304
          ],
          "bytes": 6284,
          "sha256": "3af102fefe7c8fbf3980a79ee85c776e53d2e2791014bf51bbfa4eca136b5991",
          "alpha": {
            "visiblePixels": 7304,
            "strongPixels": 3417
          }
        },
        "destroyedBase": {
          "path": "assets/structures/production-outpost/production-outpost-384-destroyed-base.webp",
          "dimensions": [
            384,
            304
          ],
          "bytes": 102078,
          "sha256": "5f76dea92e7e38420f9672deb35ca92c553ca9b64f73b07b68700aa14e659a13",
          "alpha": {
            "visiblePixels": 54873,
            "strongPixels": 52167
          }
        },
        "encodedBytes": 234492,
        "decodedBytes": 1400832,
        "audit": {
          "borderAlphaPixels": 0,
          "maskEscapePixels": 0,
          "losslessRoundTripDifferences": 0,
          "transparentRgbPixels": 0,
          "clampedMaskPixels": 1311,
          "transparentRgbClearedPixels": 7026
        }
      }
    }
  ],
  "totals": {
    "files": 12,
    "encodedBytes": 1040292,
    "decodedSourceBytes": 6418944,
    "stateBasesRetained": 12,
    "preparedOwnerSheetsTwoPlayer": 12,
    "preparedDamagedOwnerSheetsTwoPlayer": 6,
    "retainedDecodedBytesTwoPlayer": 12811776,
    "audit": {
      "borderAlphaPixels": 0,
      "maskEscapePixels": 0,
      "losslessRoundTripDifferences": 0,
      "transparentRgbPixels": 0,
      "clampedMaskPixels": 10522,
      "transparentRgbClearedPixels": 29232
    }
  }
});
});
