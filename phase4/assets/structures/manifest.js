"use strict";

(function exposePhase4StructureAssetManifest(root, factory) {
  const manifest = factory();
  if (typeof module === "object" && module.exports) module.exports = manifest;
  if (root) root.AeonPhase4StructureAssetManifest = manifest;
})(typeof globalThis === "object" ? globalThis : this, function createPhase4StructureAssetManifest() {
  const freeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  };
  return freeze({
  "schema": 1,
  "phase": "4",
  "kind": "structure-runtime-assets",
  "format": "lossless-webp",
  "source": {
    "package": {
      "path": "concepts/feasibility/phase1a/manifest.json",
      "bytes": 3720,
      "sha256": "03b9a3d0b9cbae6dd7d0bbf5ad8032af65d2fc7d9ff1a550950db1ccdf180d49"
    },
    "map": {
      "path": "phase2/map.js",
      "bytes": 4591,
      "sha256": "3e0a64da499411db0acce2993b0bf91fcf29a8a329d01fa834376fc5ef5be7ab",
      "schemaVersion": 1,
      "id": "moonfall-crossing-two-player"
    },
    "maximumEdge": 384,
    "resizeRule": "Scale each complete transparent base and aligned mask proportionally to a 384px maximum edge; never trim or reframe."
  },
  "toolchain": {
    "exporter": "tools/export-phase4-structures.js",
    "exporterSha256": "88b07dfb72c051ec0993b03e4f97c5a6d200f50c3819830c1b5f7e3e3a1013fa",
    "imageMagick": "6.9.12-98 Q16 x86_64 18038 https://legacy.imagemagick.org",
    "libwebp": "1.3.2 [020F]",
    "resize": "full transparent canvas; identical base/mask Lanczos geometry",
    "encode": "lossless WebP; exact RGBA; method 6; quality 100; metadata stripped; transparent RGB zeroed and round-trip verified; visible mask RGB normalized to white"
  },
  "players": [
    {
      "id": 1,
      "name": "Azure",
      "rgb": [
        47,
        169,
        255
      ],
      "symbol": "diamond"
    },
    {
      "id": 2,
      "name": "Violet",
      "rgb": [
        165,
        92,
        255
      ],
      "symbol": "cross"
    },
    {
      "id": 3,
      "name": "Coral",
      "rgb": [
        229,
        83,
        74
      ],
      "symbol": "triangle"
    },
    {
      "id": 4,
      "name": "Emerald",
      "rgb": [
        38,
        190,
        124
      ],
      "symbol": "circle"
    },
    {
      "id": 5,
      "name": "Amber",
      "rgb": [
        236,
        169,
        47
      ],
      "symbol": "bars"
    },
    {
      "id": 6,
      "name": "Magenta",
      "rgb": [
        222,
        78,
        174
      ],
      "symbol": "chevron"
    }
  ],
  "limits": {
    "structureCategories": 3,
    "runtimeStructures": 4,
    "capturableOwnerSeatCap": 2,
    "encodedCeiling": 634642
  },
  "damageEvidence": {
    "path": "concepts/feasibility/phase1a/structures/production-outpost-damage.webp",
    "dimensions": [
      1800,
      638
    ],
    "bytes": 83282,
    "sha256": "32d7ee61a97ba3937bc41ffe40944f9b9179ef55610b192bc703a79eb3ae3ee7",
    "runtimeAsset": false,
    "alpha": false,
    "reason": "Flattened RGB review strip only; it is not aligned transparent runtime damage art and must not be cropped or loaded.",
    "source": {
      "path": "concepts/feasibility/phase1a/structures/production-outpost-damage.webp",
      "bytes": 83282,
      "sha256": "32d7ee61a97ba3937bc41ffe40944f9b9179ef55610b192bc703a79eb3ae3ee7"
    },
    "runtimeStates": [
      "intact"
    ]
  },
  "encodingCorrection": {
    "reason": "The earlier 630,706-byte survey used libwebp's default non-exact transparent-RGB cleanup. The runtime export preserves exact zero RGB under alpha=0 for deterministic decoded bytes.",
    "obsoleteNonExactBytes": 630706,
    "exactRgbaBytes": 634642,
    "deltaBytes": 3936
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
        "base": {
          "path": "concepts/feasibility/phase1a/structures/astral-headquarters.png",
          "bytes": 1196732,
          "sha256": "6f0e90ac8b60ff618cadc1238d67438b7b9952fbc0400c477f3621393f0e4ed3",
          "dimensions": [
            1024,
            947
          ]
        },
        "mask": {
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
        "base": {
          "path": "assets/structures/astral-headquarters/astral-headquarters-384-base.webp",
          "dimensions": [
            384,
            355
          ],
          "bytes": 176842,
          "sha256": "9dbcebeb3e905e7d62fc23bae1a9167ea7357b1c0390c132b4c13b0873edd591",
          "alpha": {
            "visiblePixels": 71324,
            "strongPixels": 66176
          }
        },
        "mask": {
          "path": "assets/structures/astral-headquarters/astral-headquarters-384-mask.webp",
          "dimensions": [
            384,
            355
          ],
          "bytes": 9466,
          "sha256": "57d9d34f2c7770f1fc06d3b9badb88fdc75c90b319dfe96c75be9cdbddd91dd7",
          "alpha": {
            "visiblePixels": 10748,
            "strongPixels": 4592
          }
        },
        "pairBytes": 186308,
        "decodedBytes": 1090560,
        "audit": {
          "borderAlphaPixels": 0,
          "maskEscapePixels": 0,
          "losslessRoundTripDifferences": 0,
          "transparentRgbPixels": 0,
          "clampedMaskPixels": 169,
          "transparentRgbClearedPixels": 7240
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
        "base": {
          "path": "concepts/feasibility/phase1a/structures/gravebound-headquarters.png",
          "bytes": 1139685,
          "sha256": "f45bd5d814c06cb5c5c7d49d4e600a2cf938fe8417746619e9d229a753c43c28",
          "dimensions": [
            1024,
            933
          ]
        },
        "mask": {
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
        "base": {
          "path": "assets/structures/gravebound-headquarters/gravebound-headquarters-384-base.webp",
          "dimensions": [
            384,
            350
          ],
          "bytes": 156902,
          "sha256": "9f3927607d837e7de3a70110835ea8caed8c4b58d4768bf042a7251921b347e4",
          "alpha": {
            "visiblePixels": 68935,
            "strongPixels": 64516
          }
        },
        "mask": {
          "path": "assets/structures/gravebound-headquarters/gravebound-headquarters-384-mask.webp",
          "dimensions": [
            384,
            350
          ],
          "bytes": 9744,
          "sha256": "94c4b2b5cb81590da96fc0724b37165b5b232e1dc88bd3ea03c5314be36d2125",
          "alpha": {
            "visiblePixels": 10894,
            "strongPixels": 5937
          }
        },
        "pairBytes": 166646,
        "decodedBytes": 1075200,
        "audit": {
          "borderAlphaPixels": 0,
          "maskEscapePixels": 0,
          "losslessRoundTripDifferences": 0,
          "transparentRgbPixels": 0,
          "clampedMaskPixels": 128,
          "transparentRgbClearedPixels": 6352
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
        "base": {
          "path": "concepts/feasibility/phase1a/structures/resource-point.png",
          "bytes": 951762,
          "sha256": "b17c2d77a3c324b88c221968458295acda55b5091a4479a5fade46dc70ba5596",
          "dimensions": [
            1024,
            1024
          ]
        },
        "mask": {
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
        "base": {
          "path": "assets/structures/resource-point/resource-point-384-base.webp",
          "dimensions": [
            384,
            384
          ],
          "bytes": 130496,
          "sha256": "a4422892e14d8b04c55af2e4a9cc050282edb93a5bd398b691bc0ab389abfc85",
          "alpha": {
            "visiblePixels": 67277,
            "strongPixels": 64219
          }
        },
        "mask": {
          "path": "assets/structures/resource-point/resource-point-384-mask.webp",
          "dimensions": [
            384,
            384
          ],
          "bytes": 9484,
          "sha256": "71065c745e3ce0048bcdca8d2f2ea8ad8915c38d88253ac170d805cbdbad7f2f",
          "alpha": {
            "visiblePixels": 12513,
            "strongPixels": 7589
          }
        },
        "pairBytes": 139980,
        "decodedBytes": 1179648,
        "audit": {
          "borderAlphaPixels": 0,
          "maskEscapePixels": 0,
          "losslessRoundTripDifferences": 0,
          "transparentRgbPixels": 0,
          "clampedMaskPixels": 292,
          "transparentRgbClearedPixels": 5785
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
        "base": {
          "path": "concepts/feasibility/phase1a/structures/production-outpost.png",
          "bytes": 977617,
          "sha256": "c035de8218de98180bc6ab137481041df4df2e75b5c7ff4fb6dc1daffe5dcd13",
          "dimensions": [
            1024,
            810
          ]
        },
        "mask": {
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
        "base": {
          "path": "assets/structures/production-outpost/production-outpost-384-base.webp",
          "dimensions": [
            384,
            304
          ],
          "bytes": 134428,
          "sha256": "e69d06dccc9d6747b96f42fc67ef66016e4f735a391e8de3a23894a4f4b77183",
          "alpha": {
            "visiblePixels": 62614,
            "strongPixels": 59979
          }
        },
        "mask": {
          "path": "assets/structures/production-outpost/production-outpost-384-mask.webp",
          "dimensions": [
            384,
            304
          ],
          "bytes": 7280,
          "sha256": "d1fac85914afc80b2949d510d8e76d85d084860b23e61ba386b420dd2198c084",
          "alpha": {
            "visiblePixels": 8334,
            "strongPixels": 4177
          }
        },
        "pairBytes": 141708,
        "decodedBytes": 933888,
        "audit": {
          "borderAlphaPixels": 0,
          "maskEscapePixels": 0,
          "losslessRoundTripDifferences": 0,
          "transparentRgbPixels": 0,
          "clampedMaskPixels": 97,
          "transparentRgbClearedPixels": 5290
        }
      }
    }
  ],
  "totals": {
    "files": 8,
    "encodedBytes": 634642,
    "encodedCeiling": 634642,
    "decodedSourceBytes": 4279296,
    "preparedOwnerSheetsTwoPlayer": 6,
    "retainedDecodedBytesTwoPlayer": 5336064,
    "audit": {
      "borderAlphaPixels": 0,
      "maskEscapePixels": 0,
      "losslessRoundTripDifferences": 0,
      "transparentRgbPixels": 0,
      "clampedMaskPixels": 686,
      "transparentRgbClearedPixels": 24667
    }
  }
});
});
