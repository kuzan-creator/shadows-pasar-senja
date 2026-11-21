// Level data for Shadows of Pasar Senja — Stealth Heist.
// Every level is one top-down screen (1280 x 800). The play area starts below
// the 64px HUD bar. Walls block movement and line of sight. Cover zones are
// shadows and bushes: inside them a sneaking player is much harder to spot.
// Guards patrol waypoints; cameras sweep a fixed cone; dogs smell nearby prey.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 64;

// Rectangle helper: { x, y, w, h }
function wall(x, y, w, h) {
  return { x, y, w, h };
}
function cover(x, y, w, h, kind) {
  return { x, y, w, h, kind: kind || 'shadow' };
}
function guard(x, y, waypoints, speed) {
  return { x, y, waypoints, speed: speed || 55 };
}
function camera(x, y, baseAngle, sweep, speed, range) {
  return { x, y, baseAngle, sweep, speed: speed || 0.5, range: range || 230 };
}
function dog(x, y, waypoints, speed) {
  return { x, y, waypoints, speed: speed || 95 };
}

export const LEVELS = [
  {
    id: 1,
    name: 'Pasar Malam',
    sub: 'Level 1 — Night Market',
    briefing:
      'Slip through the night market, pocket 3 golden lanterns, and reach the green exit gate unseen. Market stalls block sight — bushes and shadows hide you.',
    playerStart: { x: 90, y: 700 },
    exit: { x: 1160, y: 110, w: 70, h: 70 },
    loot: [
      { x: 330, y: 200, taken: false },
      { x: 700, y: 640, taken: false },
      { x: 1080, y: 420, taken: false },
    ],
    walls: [
      wall(200, 140, 180, 46), // stall row 1
      wall(480, 140, 180, 46),
      wall(760, 140, 180, 46),
      wall(200, 330, 180, 46), // stall row 2
      wall(480, 330, 180, 46),
      wall(760, 330, 180, 46),
      wall(200, 520, 180, 46), // stall row 3
      wall(480, 520, 180, 46),
      wall(760, 520, 180, 46),
      wall(1040, 240, 46, 180), // side stall
      wall(1040, 560, 46, 120),
      wall(60, 140, 46, 180),
    ],
    covers: [
      cover(90, 260, 90, 60, 'bush'),
      cover(430, 420, 110, 60, 'bush'),
      cover(700, 210, 110, 60, 'shadow'),
      cover(950, 430, 100, 60, 'bush'),
      cover(180, 620, 120, 60, 'shadow'),
      cover(900, 620, 120, 60, 'shadow'),
      cover(1120, 300, 90, 60, 'bush'),
    ],
    guards: [
      guard(300, 250, [
        { x: 300, y: 250 },
        { x: 900, y: 250 },
        { x: 900, y: 460 },
        { x: 300, y: 460 },
      ]),
      guard(1000, 620, [
        { x: 1000, y: 620 },
        { x: 500, y: 620 },
        { x: 500, y: 700 },
        { x: 1000, y: 700 },
      ]),
      guard(620, 130, [
        { x: 620, y: 130 },
        { x: 620, y: 300 },
      ], 45),
    ],
    cameras: [],
    dogs: [],
  },
  {
    id: 2,
    name: 'Museum Pusaka',
    sub: 'Level 2 — Heritage Museum',
    briefing:
      'The museum keeps its heirlooms under glass — and under cameras. Camera cones sweep the halls; freeze in the shadows when the red light turns your way.',
    playerStart: { x: 90, y: 700 },
    exit: { x: 1160, y: 110, w: 70, h: 70 },
    loot: [
      { x: 300, y: 180, taken: false },
      { x: 640, y: 420, taken: false },
      { x: 1060, y: 640, taken: false },
    ],
    walls: [
      wall(240, 120, 220, 40), // display case
      wall(560, 120, 220, 40),
      wall(880, 120, 220, 40),
      wall(240, 300, 220, 40),
      wall(560, 300, 220, 40),
      wall(880, 300, 220, 40),
      wall(240, 480, 220, 40),
      wall(560, 480, 220, 40),
      wall(880, 480, 220, 40),
      wall(240, 640, 220, 40),
      wall(880, 640, 220, 40),
    ],
    covers: [
      cover(120, 180, 90, 70, 'shadow'),
      cover(500, 380, 100, 60, 'shadow'),
      cover(820, 560, 110, 60, 'shadow'),
      cover(1120, 200, 90, 70, 'bush'),
      cover(120, 560, 100, 60, 'bush'),
      cover(1000, 380, 90, 60, 'shadow'),
    ],
    guards: [
      guard(420, 220, [
        { x: 420, y: 220 },
        { x: 860, y: 220 },
        { x: 860, y: 580 },
        { x: 420, y: 580 },
      ]),
      guard(1080, 300, [
        { x: 1080, y: 300 },
        { x: 1080, y: 680 },
      ], 50),
    ],
    cameras: [
      camera(640, 90, Math.PI / 2, 0.9, 0.45, 240),
      camera(180, 420, 0, 0.9, 0.6, 230),
      camera(1100, 560, Math.PI, 0.9, 0.5, 230),
    ],
    dogs: [],
  },
  {
    id: 3,
    name: 'Pelabuhan Senja',
    sub: 'Level 3 — Dusk Harbour',
    briefing:
      'The last haul waits on the docks. Guard dogs patrol between the containers — they smell you before they see you, so stay low and stay downwind.',
    playerStart: { x: 90, y: 700 },
    exit: { x: 1160, y: 110, w: 70, h: 70 },
    loot: [
      { x: 320, y: 200, taken: false },
      { x: 700, y: 300, taken: false },
      { x: 1040, y: 560, taken: false },
    ],
    walls: [
      wall(220, 140, 160, 90), // container
      wall(520, 140, 160, 90),
      wall(820, 140, 160, 90),
      wall(220, 360, 160, 90),
      wall(520, 360, 160, 90),
      wall(820, 360, 160, 90),
      wall(220, 580, 160, 90),
      wall(820, 580, 160, 90),
      wall(1080, 260, 60, 160),
    ],
    covers: [
      cover(120, 300, 90, 70, 'shadow'),
      cover(440, 250, 90, 60, 'bush'),
      cover(740, 480, 110, 60, 'shadow'),
      cover(1000, 140, 90, 60, 'bush'),
      cover(420, 620, 120, 60, 'shadow'),
      cover(980, 660, 110, 60, 'shadow'),
    ],
    guards: [
      guard(400, 300, [
        { x: 400, y: 300 },
        { x: 880, y: 300 },
        { x: 880, y: 520 },
        { x: 400, y: 520 },
      ]),
      guard(1050, 480, [
        { x: 1050, y: 480 },
        { x: 1050, y: 200 },
      ], 60),
    ],
    cameras: [],
    dogs: [
      dog(300, 520, [
        { x: 300, y: 520 },
        { x: 950, y: 520 },
        { x: 950, y: 660 },
        { x: 300, y: 660 },
      ]),
      dog(700, 150, [
        { x: 700, y: 150 },
        { x: 1100, y: 150 },
        { x: 1100, y: 250 },
        { x: 700, y: 250 },
      ]),
    ],
  },
];

export function cloneLevel(index) {
  const src = LEVELS[index];
  return JSON.parse(JSON.stringify(src));
}
