/* global window */
"use strict";

(function exposePhase2Map() {
  const layerOrder = Object.freeze([
    "ground",
    "detail",
    "navigation",
    "anchors",
    "dynamic",
    "foreground"
  ]);

  const structureCategories = Object.freeze([
    "headquarters",
    "resource-point",
    "production-outpost"
  ]);

  const routeHints = Object.freeze([
    Object.freeze({
      id: "west-to-centre",
      points: Object.freeze([[250, 275], [430, 360], [620, 455], [836, 535]])
    }),
    Object.freeze({
      id: "east-to-centre",
      points: Object.freeze([[1422, 275], [1300, 335], [1120, 410], [980, 470], [836, 535]])
    }),
    Object.freeze({
      id: "southern-flank",
      points: Object.freeze([[240, 690], [420, 610], [620, 560], [836, 535], [1020, 505], [1190, 450], [1430, 425]])
    })
  ]);

  const blockers = Object.freeze([
    Object.freeze({
      id: "north-west-cliffs",
      label: "Cliff blocker",
      polygon: Object.freeze([[0, 0], [545, 0], [500, 90], [330, 110], [175, 165], [0, 190]])
    }),
    Object.freeze({
      id: "river-ridge",
      label: "River and ridge blocker",
      polygon: Object.freeze([[650, 0], [1055, 0], [1030, 145], [955, 235], [920, 375], [850, 465], [770, 405], [720, 260]])
    }),
    Object.freeze({
      id: "north-east-cliffs",
      label: "Cliff blocker",
      polygon: Object.freeze([[1090, 0], [1672, 0], [1672, 125], [1500, 115], [1280, 175], [1060, 175]])
    }),
    Object.freeze({
      id: "south-west-ridge",
      label: "Rock ridge blocker",
      polygon: Object.freeze([[0, 815], [205, 765], [355, 805], [510, 941], [0, 941]])
    }),
    Object.freeze({
      id: "south-centre-ridge",
      label: "Rock ridge blocker",
      polygon: Object.freeze([[625, 735], [770, 675], [925, 705], [1080, 941], [690, 941]])
    }),
    Object.freeze({
      id: "south-east-ridge",
      label: "Rock ridge blocker",
      polygon: Object.freeze([[1240, 565], [1460, 570], [1672, 640], [1672, 941], [1510, 941], [1410, 750], [1285, 670]])
    })
  ]);

  const structures = Object.freeze([
    Object.freeze({
      id: "astral-headquarters-anchor",
      category: "headquarters",
      x: 250,
      y: 275,
      radius: 72,
      seat: 1,
      faction: "astral-concord"
    }),
    Object.freeze({
      id: "gravebound-headquarters-anchor",
      category: "headquarters",
      x: 1422,
      y: 275,
      radius: 72,
      seat: 2,
      faction: "gravebound-court"
    }),
    Object.freeze({
      id: "central-resource-point-anchor",
      category: "resource-point",
      x: 836,
      y: 535,
      radius: 38,
      seat: null
    }),
    Object.freeze({
      id: "west-production-outpost-anchor",
      category: "production-outpost",
      x: 520,
      y: 590,
      radius: 46,
      seat: null
    }),
    Object.freeze({
      id: "east-production-outpost-anchor",
      category: "production-outpost",
      x: 1120,
      y: 505,
      radius: 46,
      seat: null
    })
  ]);

  const map = Object.freeze({
    schemaVersion: 1,
    id: "moonfall-crossing-two-player",
    title: "Moonfall Crossing",
    playerCount: 2,
    layerOrder,
    structureCategories,
    world: Object.freeze({ width: 1672, height: 941 }),
    layers: Object.freeze({
      ground: Object.freeze({
        image: "../concepts/feasibility/phase1a/environment/battlefield-environment.webp",
        width: 1672,
        height: 941
      }),
      detail: Object.freeze({ routeHints }),
      navigation: Object.freeze({ cellSize: 96, blockers }),
      anchors: Object.freeze({
        cameraStarts: Object.freeze([
          Object.freeze({ id: "default-camera", x: 836, y: 470.5, zoom: 1 })
        ]),
        playerSeats: Object.freeze([
          Object.freeze({ id: "astral-seat", seat: 1, x: 315, y: 410, radius: 32, facing: "right" }),
          Object.freeze({ id: "gravebound-seat", seat: 2, x: 1357, y: 410, radius: 32, facing: "left" })
        ]),
        structures
      }),
      dynamic: Object.freeze([]),
      foreground: Object.freeze({
        occluders: Object.freeze([
          Object.freeze({
            id: "south-west-foreground",
            polygon: Object.freeze([[0, 785], [250, 760], [430, 820], [520, 941], [0, 941]])
          }),
          Object.freeze({
            id: "south-east-foreground",
            polygon: Object.freeze([[1240, 770], [1450, 720], [1672, 760], [1672, 941], [1160, 941]])
          })
        ])
      })
    })
  });

  if (typeof module !== "undefined" && module.exports) module.exports = map;
  else window.AeonPhase2Map = map;
}());
