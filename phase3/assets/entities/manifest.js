"use strict";

(function exposePhase3AssetManifest(root, factory) {
  const manifest = factory();
  if (typeof module === "object" && module.exports) module.exports = manifest;
  if (root) root.AeonPhase3AssetManifest = manifest;
})(typeof globalThis === "object" ? globalThis : this, function createPhase3AssetManifest() {
  const freeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  };
  return freeze({
  "schema": 1,
  "phase": "3",
  "kind": "entity-runtime-assets",
  "format": "lossless-webp",
  "source": {
    "package": {
      "path": "concepts/feasibility/phase1a/manifest.json",
      "bytes": 3720,
      "sha256": "03b9a3d0b9cbae6dd7d0bbf5ad8032af65d2fc7d9ff1a550950db1ccdf180d49"
    },
    "profile": {
      "sheet": [
        2304,
        1536
      ],
      "cell": [
        384,
        384
      ],
      "root": [
        192,
        354
      ],
      "canonicalFacing": "right",
      "mirroredFacing": "left"
    }
  },
  "toolchain": {
    "exporter": "tools/export-phase3-assets.js",
    "exporterSha256": "8aa6c52d75afe5f5c17257bfc696865f8e3ad4089f7657a17ce09cef729c93c8",
    "imageMagick": "6.9.12-98 Q16 x86_64 18038 https://legacy.imagemagick.org",
    "libwebp": "1.3.2 [020F]",
    "resize": "independent 384px cells; ImageMagick Lanczos",
    "encode": "lossless WebP; method 6; quality 100; metadata stripped"
  },
  "layout": {
    "grid": [
      4,
      4
    ],
    "frames": [
      {
        "index": 0,
        "state": "move",
        "frame": 0,
        "row": 1,
        "column": 0
      },
      {
        "index": 1,
        "state": "move",
        "frame": 1,
        "row": 1,
        "column": 1
      },
      {
        "index": 2,
        "state": "move",
        "frame": 2,
        "row": 1,
        "column": 2
      },
      {
        "index": 3,
        "state": "move",
        "frame": 3,
        "row": 1,
        "column": 3
      },
      {
        "index": 4,
        "state": "action",
        "frame": 0,
        "row": 2,
        "column": 0
      },
      {
        "index": 5,
        "state": "action",
        "frame": 1,
        "row": 2,
        "column": 1
      },
      {
        "index": 6,
        "state": "action",
        "frame": 2,
        "row": 2,
        "column": 2
      },
      {
        "index": 7,
        "state": "action",
        "frame": 3,
        "row": 2,
        "column": 3
      },
      {
        "index": 8,
        "state": "action",
        "frame": 4,
        "row": 2,
        "column": 4
      },
      {
        "index": 9,
        "state": "action",
        "frame": 5,
        "row": 2,
        "column": 5
      },
      {
        "index": 10,
        "state": "defeat",
        "frame": 0,
        "row": 3,
        "column": 0
      },
      {
        "index": 11,
        "state": "defeat",
        "frame": 1,
        "row": 3,
        "column": 1
      },
      {
        "index": 12,
        "state": "defeat",
        "frame": 2,
        "row": 3,
        "column": 2
      },
      {
        "index": 13,
        "state": "defeat",
        "frame": 3,
        "row": 3,
        "column": 3
      },
      {
        "index": 14,
        "state": "defeat",
        "frame": 4,
        "row": 3,
        "column": 4
      },
      {
        "index": 15,
        "state": "defeat",
        "frame": 5,
        "row": 3,
        "column": 5
      }
    ],
    "animations": {
      "idle": {
        "indices": [
          0
        ],
        "fps": 1,
        "loop": true,
        "aliases": "move:0"
      },
      "move": {
        "indices": [
          0,
          1,
          2,
          3
        ],
        "fps": 8,
        "loop": true
      },
      "action": {
        "indices": [
          4,
          5,
          6,
          7,
          8,
          9
        ],
        "fps": 12,
        "loop": false
      },
      "defeat": {
        "indices": [
          10,
          11,
          12,
          13,
          14,
          15
        ],
        "fps": 10,
        "loop": false
      }
    },
    "canonicalFacing": "right",
    "mirroredFacing": "left",
    "logicalRenderCell": [
      160,
      160
    ],
    "destinationRoot": [
      80,
      147.5
    ]
  },
  "tiers": {
    "standard": {
      "label": "Standard",
      "cellSize": 128,
      "sheet": [
        512,
        512
      ],
      "sourceRoot": [
        64,
        118
      ],
      "upperLockRows": [
        0,
        97
      ],
      "encodedBytes": 734126,
      "encodedCeiling": 734126,
      "decodedBytes": 12582912,
      "audit": {
        "movementUpperDifferences": 0,
        "borderAlphaPixels": 0,
        "maskEscapePixels": 0,
        "losslessRoundTripDifferences": 0,
        "clampedMaskPixels": 6972
      }
    },
    "compact": {
      "label": "Compact",
      "cellSize": 96,
      "sheet": [
        384,
        384
      ],
      "sourceRoot": [
        48,
        88.5
      ],
      "upperLockRows": [
        0,
        73
      ],
      "encodedBytes": 459446,
      "encodedCeiling": 459446,
      "decodedBytes": 7077888,
      "audit": {
        "movementUpperDifferences": 0,
        "borderAlphaPixels": 0,
        "maskEscapePixels": 0,
        "losslessRoundTripDifferences": 0,
        "clampedMaskPixels": 6142
      }
    }
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
  "entities": [
    {
      "id": "astral-guardian",
      "faction": "astral-concord",
      "role": "melee",
      "source": {
        "atlas": {
          "path": "concepts/feasibility/phase1a/entities/astral-guardian/atlas.png",
          "bytes": 797348,
          "sha256": "2a7003c9841d73c0a28a521dbd49e417ef1598f9a27c8b6076e7bb7a66f879da"
        },
        "mask": {
          "path": "concepts/feasibility/phase1a/entities/astral-guardian/player-mask.png",
          "bytes": 45818,
          "sha256": "4f327bd7cc3ef5e6f50e1f00ea6415a53c2843f5def75fc3c4c1c090785bf8c9"
        },
        "metadata": {
          "path": "concepts/feasibility/phase1a/entities/astral-guardian/atlas.json",
          "bytes": 4712,
          "sha256": "1c22ddb256427afe436b02e9c27b96fd3e4e0b5f9e99ef975edd56c5c98e0f63"
        }
      },
      "files": {
        "standard": {
          "base": {
            "path": "assets/entities/astral-guardian/astral-guardian-128-base.webp",
            "bytes": 104492,
            "sha256": "96233dcd6c36a83c9afb7b4e58dc86d420a8de18e357e07666e8deac057fb929",
            "dimensions": [
              512,
              512
            ]
          },
          "mask": {
            "path": "assets/entities/astral-guardian/astral-guardian-128-mask.webp",
            "bytes": 15250,
            "sha256": "4fd66d6ede3ddf36dc9851f35ddfbf31ad5d5c8f2054d6a9fda2b4f225aebb80",
            "dimensions": [
              512,
              512
            ]
          },
          "pairBytes": 119742,
          "decodedBytes": 2097152,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 1257
          }
        },
        "compact": {
          "base": {
            "path": "assets/entities/astral-guardian/astral-guardian-96-base.webp",
            "bytes": 64686,
            "sha256": "e09f8af34c98edff71dbc3aabd9c86436cd403fa7af627d16718ca32dcdf613a",
            "dimensions": [
              384,
              384
            ]
          },
          "mask": {
            "path": "assets/entities/astral-guardian/astral-guardian-96-mask.webp",
            "bytes": 10280,
            "sha256": "a380ebe6293dd6d7389b7528721f20e54876cc4d3ef46b8f81833de27a1bb8a3",
            "dimensions": [
              384,
              384
            ]
          },
          "pairBytes": 74966,
          "decodedBytes": 1179648,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 1159
          }
        }
      }
    },
    {
      "id": "starbow",
      "faction": "astral-concord",
      "role": "ranged",
      "source": {
        "atlas": {
          "path": "concepts/feasibility/phase1a/entities/starbow/atlas.png",
          "bytes": 785097,
          "sha256": "29dc0d2bc7e21364508eb2f9b261dc931316fcf23174721f8dacbd4a91c95fe2"
        },
        "mask": {
          "path": "concepts/feasibility/phase1a/entities/starbow/player-mask.png",
          "bytes": 36904,
          "sha256": "ee52cc315fc0f9e20a7e2cdedfae394c083ca225e8eaffa280eb5e4be237a9f3"
        },
        "metadata": {
          "path": "concepts/feasibility/phase1a/entities/starbow/atlas.json",
          "bytes": 4709,
          "sha256": "b4a2c4de3455b909f5f2f34a5fa6c33acfb73e6d57fe6742ef2804d36902ac18"
        }
      },
      "files": {
        "standard": {
          "base": {
            "path": "assets/entities/starbow/starbow-128-base.webp",
            "bytes": 101570,
            "sha256": "0a0450c7f8e5dbba3d9a45b6e4664526101ee270df7278a9b93e50bc74fb2ed8",
            "dimensions": [
              512,
              512
            ]
          },
          "mask": {
            "path": "assets/entities/starbow/starbow-128-mask.webp",
            "bytes": 12504,
            "sha256": "25af9df72e5ae8a0586cfead220cc242c221a4174d2eaf6ccc86a82ae3280d81",
            "dimensions": [
              512,
              512
            ]
          },
          "pairBytes": 114074,
          "decodedBytes": 2097152,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 1230
          }
        },
        "compact": {
          "base": {
            "path": "assets/entities/starbow/starbow-96-base.webp",
            "bytes": 62984,
            "sha256": "05ff5505ece16b736d64a93a0c0e7f33896e5e591ac4955553892351c95af0e8",
            "dimensions": [
              384,
              384
            ]
          },
          "mask": {
            "path": "assets/entities/starbow/starbow-96-mask.webp",
            "bytes": 8850,
            "sha256": "da31c42793e4002f5508702f1052680e65a6f5b85d386cf4da0602df0461e7fc",
            "dimensions": [
              384,
              384
            ]
          },
          "pairBytes": 71834,
          "decodedBytes": 1179648,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 1179
          }
        }
      }
    },
    {
      "id": "aegis-titan",
      "faction": "astral-concord",
      "role": "signature",
      "source": {
        "atlas": {
          "path": "concepts/feasibility/phase1a/entities/aegis-titan/atlas.png",
          "bytes": 978372,
          "sha256": "634a43b6282c238acfae1f6df8d797e3c3c6abc1aeb51eef10894f05f14ba6ad"
        },
        "mask": {
          "path": "concepts/feasibility/phase1a/entities/aegis-titan/player-mask.png",
          "bytes": 46837,
          "sha256": "1916738ea9cc13a241d55eb92cd16b5d39afbf1153b47def1c042c55ccd8e562"
        },
        "metadata": {
          "path": "concepts/feasibility/phase1a/entities/aegis-titan/atlas.json",
          "bytes": 4709,
          "sha256": "f89fd7c3eef3563cc186e969821939ff76cb8686fa012d8e329edda07504b142"
        }
      },
      "files": {
        "standard": {
          "base": {
            "path": "assets/entities/aegis-titan/aegis-titan-128-base.webp",
            "bytes": 118192,
            "sha256": "036be06953e686eb49b2f30d106cf2185e829bc7cc1a5572170f134f79e76569",
            "dimensions": [
              512,
              512
            ]
          },
          "mask": {
            "path": "assets/entities/aegis-titan/aegis-titan-128-mask.webp",
            "bytes": 14616,
            "sha256": "3d4dd5e37b79cc5c40d3a27a1427a0c603b636b0fcebfefe974c83d26593f154",
            "dimensions": [
              512,
              512
            ]
          },
          "pairBytes": 132808,
          "decodedBytes": 2097152,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 1421
          }
        },
        "compact": {
          "base": {
            "path": "assets/entities/aegis-titan/aegis-titan-96-base.webp",
            "bytes": 72758,
            "sha256": "c179c7e6394a7004f3d7bfd2d492c60c265994a6c9783ab836018129d59779d4",
            "dimensions": [
              384,
              384
            ]
          },
          "mask": {
            "path": "assets/entities/aegis-titan/aegis-titan-96-mask.webp",
            "bytes": 10384,
            "sha256": "d0c6facbd63b1b3ccb4f4e544d1f98a42badc775e8742a8a385ac4d918d703ea",
            "dimensions": [
              384,
              384
            ]
          },
          "pairBytes": 83142,
          "decodedBytes": 1179648,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 1192
          }
        }
      }
    },
    {
      "id": "gravebound-reaver",
      "faction": "gravebound-court",
      "role": "melee",
      "source": {
        "atlas": {
          "path": "concepts/feasibility/phase1a/entities/gravebound-reaver/atlas.png",
          "bytes": 733042,
          "sha256": "8e669ad0014e1261ff23d2b1fad5f04ca61e8b968b1bdf021cb612f4f47c0f32"
        },
        "mask": {
          "path": "concepts/feasibility/phase1a/entities/gravebound-reaver/player-mask.png",
          "bytes": 37378,
          "sha256": "1926c4ee25eee290617b0dd0a769a25a9eceb26cd209426509c98c61c8862f83"
        },
        "metadata": {
          "path": "concepts/feasibility/phase1a/entities/gravebound-reaver/atlas.json",
          "bytes": 4717,
          "sha256": "0ec4042ea18e737de86b279788989d40d529530130836d35a865c2baf2acff9a"
        }
      },
      "files": {
        "standard": {
          "base": {
            "path": "assets/entities/gravebound-reaver/gravebound-reaver-128-base.webp",
            "bytes": 88932,
            "sha256": "2a4dc1393760ea0164b37472b128b21fbc5b62298737656c926217a7e68667b3",
            "dimensions": [
              512,
              512
            ]
          },
          "mask": {
            "path": "assets/entities/gravebound-reaver/gravebound-reaver-128-mask.webp",
            "bytes": 11878,
            "sha256": "8543d48c5de76ea786d14ae87d7c626689df19c6c0fd4d850e0f4963a0e58062",
            "dimensions": [
              512,
              512
            ]
          },
          "pairBytes": 100810,
          "decodedBytes": 2097152,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 952
          }
        },
        "compact": {
          "base": {
            "path": "assets/entities/gravebound-reaver/gravebound-reaver-96-base.webp",
            "bytes": 56070,
            "sha256": "b2594ac69cada32e67a1e0982a07e95f9c6d802db11cb15b4a0a5d060eb0ec50",
            "dimensions": [
              384,
              384
            ]
          },
          "mask": {
            "path": "assets/entities/gravebound-reaver/gravebound-reaver-96-mask.webp",
            "bytes": 8144,
            "sha256": "55b907293042ef6f1cb72cb7c3a876524244d790501664287c1851b0da4dbf13",
            "dimensions": [
              384,
              384
            ]
          },
          "pairBytes": 64214,
          "decodedBytes": 1179648,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 932
          }
        }
      }
    },
    {
      "id": "hollow-string",
      "faction": "gravebound-court",
      "role": "ranged",
      "source": {
        "atlas": {
          "path": "concepts/feasibility/phase1a/entities/hollow-string/atlas.png",
          "bytes": 787936,
          "sha256": "5a3752d78066518075fc26caba88ba5bf48afd63195c2b906d521cd1173f841a"
        },
        "mask": {
          "path": "concepts/feasibility/phase1a/entities/hollow-string/player-mask.png",
          "bytes": 51222,
          "sha256": "d19bf681265b3430989f2c998995c53ec9c631f4d60d09de00ca27011561e158"
        },
        "metadata": {
          "path": "concepts/feasibility/phase1a/entities/hollow-string/atlas.json",
          "bytes": 4714,
          "sha256": "047335e2aee69121a806a1c39ed0e913ebb42dabd68e91f839fa111b1a5e690a"
        }
      },
      "files": {
        "standard": {
          "base": {
            "path": "assets/entities/hollow-string/hollow-string-128-base.webp",
            "bytes": 93776,
            "sha256": "fb15ae5b1acc83114249f25ec5a79f3e1d806ac0e34d067742e78dd3e91d1eef",
            "dimensions": [
              512,
              512
            ]
          },
          "mask": {
            "path": "assets/entities/hollow-string/hollow-string-128-mask.webp",
            "bytes": 17280,
            "sha256": "a94535c76bbc7930b6d58c1a26cf38c526027c1e68ac15795d6b9efc7af8e2ea",
            "dimensions": [
              512,
              512
            ]
          },
          "pairBytes": 111056,
          "decodedBytes": 2097152,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 1572
          }
        },
        "compact": {
          "base": {
            "path": "assets/entities/hollow-string/hollow-string-96-base.webp",
            "bytes": 58288,
            "sha256": "3fac1d9943554c0ee1baf4d42d9e25c82bbb4ba0ade973c3da0faf1596d2cd41",
            "dimensions": [
              384,
              384
            ]
          },
          "mask": {
            "path": "assets/entities/hollow-string/hollow-string-96-mask.webp",
            "bytes": 11488,
            "sha256": "7cb9239a8ba6ffc6ccfadf0b225004596f175ff584d36b44085a79a81cb431e1",
            "dimensions": [
              384,
              384
            ]
          },
          "pairBytes": 69776,
          "decodedBytes": 1179648,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 1190
          }
        }
      }
    },
    {
      "id": "ossuary-colossus",
      "faction": "gravebound-court",
      "role": "signature",
      "source": {
        "atlas": {
          "path": "concepts/feasibility/phase1a/entities/ossuary-colossus/atlas.png",
          "bytes": 1334271,
          "sha256": "b40664c706387c38e55f4525236def23f980ab856cd839ffdcc6b16f106b4506"
        },
        "mask": {
          "path": "concepts/feasibility/phase1a/entities/ossuary-colossus/player-mask.png",
          "bytes": 38696,
          "sha256": "1492c7a1d3d25b3a89cb16865cffbcc32079338f393f25b2c096b86389af6611"
        },
        "metadata": {
          "path": "concepts/feasibility/phase1a/entities/ossuary-colossus/atlas.json",
          "bytes": 4703,
          "sha256": "6dbab8ffdedf32964928c28031620bc036b385a2830bd158f38b0bd7ecf3c938"
        }
      },
      "files": {
        "standard": {
          "base": {
            "path": "assets/entities/ossuary-colossus/ossuary-colossus-128-base.webp",
            "bytes": 142522,
            "sha256": "95098fa45a261b345c656828429633d9999e1e4dd52b05c8b4f3fd623877d277",
            "dimensions": [
              512,
              512
            ]
          },
          "mask": {
            "path": "assets/entities/ossuary-colossus/ossuary-colossus-128-mask.webp",
            "bytes": 13114,
            "sha256": "3a409538d040d845fffae65e7d10e9dd4ca33e13218fd0ca07a8bb20b020e928",
            "dimensions": [
              512,
              512
            ]
          },
          "pairBytes": 155636,
          "decodedBytes": 2097152,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 540
          }
        },
        "compact": {
          "base": {
            "path": "assets/entities/ossuary-colossus/ossuary-colossus-96-base.webp",
            "bytes": 86216,
            "sha256": "2e2bce7642f855818394b96d720d209c9bd44b165d5b8a08351d305d079f1520",
            "dimensions": [
              384,
              384
            ]
          },
          "mask": {
            "path": "assets/entities/ossuary-colossus/ossuary-colossus-96-mask.webp",
            "bytes": 9298,
            "sha256": "c364eba3f5895784b1d4dcf6523ad3d03e5df99b6385c1bd8484df963a731888",
            "dimensions": [
              384,
              384
            ]
          },
          "pairBytes": 95514,
          "decodedBytes": 1179648,
          "audit": {
            "movementUpperDifferences": 0,
            "borderAlphaPixels": 0,
            "maskEscapePixels": 0,
            "losslessRoundTripDifferences": 0,
            "clampedMaskPixels": 490
          }
        }
      }
    }
  ],
  "budgetCorrection": {
    "reason": "The unpublished survey totals retained blank lower bodies in movement cells 1-3; Phase 3 freezes complete full-body exports instead.",
    "obsoleteSurvey": {
      "compact": 435142,
      "standard": 694040,
      "combined": 1129182
    },
    "correctedFullBody": {
      "compact": 459446,
      "standard": 734126,
      "combined": 1193572
    },
    "reproduction": {
      "entity": "starbow",
      "tier": "standard",
      "affectedMovementCells": [
        1,
        2,
        3
      ],
      "blankedRows": [
        98,
        127
      ],
      "reproducedPairBytes": 106870,
      "obsoleteRecordedPairBytes": 106870
    }
  },
  "totals": {
    "files": 24,
    "encodedBytes": 1193572,
    "encodedCeiling": 1193572,
    "selectedTierDecodedBytes": {
      "standard": 12582912,
      "compact": 7077888
    }
  }
});
});
