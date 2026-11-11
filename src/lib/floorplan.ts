import type { Pt } from './types';

/**
 * The unit's floor plan, traced from the builder's drawing at ~21 px/ft and
 * corrected to Jacob's field measurements (bedroom 100" to the balcony jog ×
 * 136", living 181" × 130", den 105" × 102" to the railing, stairs 29" + 94").
 * The outer shell is unchanged (~810 sq ft).
 * Units are inches; origin is the outside top-left corner of the unit,
 * +x to the right (east), +y down (south, towards the front door).
 * Field-measured spans are exact; everything else is traced.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export const rectPoly = ({ x, y, w, h }: Rect): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/** A straight wall of thickness `t` between two points (used for diagonals). */
function segPoly(a: Pt, b: Pt, t: number): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * (t / 2);
  const ny = (dx / len) * (t / 2);
  return [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ];
}

export const UNIT_W = 317;
export const UNIT_H = 367;

/** Solid walls (exterior + interior). */
export const WALL_RECTS: Rect[] = [
  // exterior: north piers (between windows), corner notches
  r(0, 0, 42, 10),
  r(0, 10, 23, 12),
  r(101, 0, 36, 10),
  r(210, 0, 34, 10),
  r(274.5, 0, 42.5, 10),
  r(296.5, 10, 14.5, 12),
  // exterior: east / west
  r(0, 0, 6, UNIT_H),
  r(311, 0, 6, UNIT_H),
  // exterior: south (front door opening between x=147 and x=183)
  r(0, 351, 133, 16),
  r(133, 351, 14, 8),
  r(183, 351, 17, 8),
  r(200, 351, 117, 16),
  // bedroom jog by the balcony
  r(106, 10, 3, 20),
  r(106, 28.5, 24, 2.5),
  r(127.5, 28.5, 2.5, 11.5),
  // bedroom / living wall (barn door opening is y 40 → 82)
  r(127.5, 82, 2.5, 66.5),
  // walk-in closet
  r(6, 146, 49.5, 2.5),
  r(53.5, 146, 2.25, 38),
  r(53.5, 214.5, 2.25, 34.5),
  r(6, 246, 52.5, 3),
  // reach-in closet + pantry
  r(90.5, 146, 39.5, 2.5),
  r(90.5, 146, 2.25, 19),
  r(90.5, 197, 2.25, 8),
  r(116.5, 148.5, 2.5, 56.5),
  // washer / dryer
  r(90.5, 204.5, 40.5, 3),
  r(97, 204.5, 2.5, 38),
  r(128.5, 204.5, 2.5, 38),
  r(91.5, 240, 39.5, 6.5),
  r(103, 246, 2.75, 9),
  // bath / shower / foyer closet
  r(103.5, 287, 2.75, 64),
  r(67, 292.5, 66.5, 2.75),
  r(67, 343, 37, 8),
  r(131.25, 292.5, 2.25, 7.5),
  r(131.25, 345, 2.25, 6),
  // kitchen + den piers
  r(285.5, 140, 25.5, 2.75),
  r(297, 227, 14, 22),
  r(301, 303, 10, 15),
];

export const DIAGONAL_WALLS: Pt[][] = [
  segPoly([55.75, 214.5], [77, 192], 2.25),
  segPoly([73.5, 187.5], [92, 164.75], 2.25),
];

/** Windows and the balcony slider: they block furniture like walls. */
export const GLASS_RECTS: Rect[] = [r(42, 0, 59, 10), r(137, 0, 73, 10), r(244, 0, 30.5, 10)];

/** Balcony railing. */
export const RAILING_RECTS: Rect[] = [r(102.5, -56, 132, 2), r(102.5, -56, 2, 56), r(232.5, -56, 2, 56)];

export type ObstacleKind = 'counter' | 'island' | 'stairs' | 'railing' | 'pantry';
export interface Obstacle {
  kind: ObstacleKind;
  rect: Rect;
  label?: string;
}

/** Built-ins furniture can't overlap. */
export const OBSTACLES: Obstacle[] = [
  { kind: 'island', rect: r(184.5, 149.5, 63.5, 35.5), label: 'Island' },
  { kind: 'counter', rect: r(286.5, 142.75, 24.5, 78.75) },
  { kind: 'counter', rect: r(183.5, 221.5, 113.5, 27.5) },
  { kind: 'stairs', rect: r(188, 249, 29, 21.25) },
  { kind: 'railing', rect: r(188, 270.25, 29, 2.75) },
  { kind: 'railing', rect: r(203, 273, 3, 78) },
  { kind: 'pantry', rect: r(128, 150, 2, 52) },
];

/** Areas that aren't floor space for furniture (closets, bath, laundry). */
export interface Zone {
  name: string;
  rect: Rect;
  pattern: 'closet' | 'tile' | 'laundry';
}
export const ZONES: Zone[] = [
  { name: 'Walk-in closet', rect: r(6, 148.5, 47.5, 97.5), pattern: 'closet' },
  { name: 'Closet', rect: r(92.75, 148.5, 23.75, 48.5), pattern: 'closet' },
  { name: 'P', rect: r(119, 148.5, 8.5, 56), pattern: 'closet' },
  { name: 'W/D', rect: r(99.5, 207.5, 29, 32.5), pattern: 'laundry' },
  { name: 'Bath', rect: r(6, 249, 97.5, 102), pattern: 'tile' },
  { name: 'Closet', rect: r(106.25, 295.25, 25, 55.75), pattern: 'closet' },
];

export interface Room {
  name: string;
  dims?: string;
  rect: Rect;
  floor: 'wood' | 'carpet';
  label: Pt;
}
export const ROOMS: Room[] = [
  { name: 'Bedroom', dims: `10' 1½" × 11' 4"`, rect: r(6, 10, 121.5, 136), floor: 'carpet', label: [66, 80] },
  { name: 'Living / dining', dims: `15' 1" × 10' 10"`, rect: r(130, 10, 181, 130), floor: 'wood', label: [220, 68] },
  { name: 'Kitchen', rect: r(130, 140, 181, 82), floor: 'wood', label: [262, 202] },
  { name: 'Den (loft)', dims: `8' 9" × 8' 6"`, rect: r(206, 249, 105, 102), floor: 'wood', label: [258, 312] },
  { name: 'Foyer', rect: r(106, 205, 100, 146), floor: 'wood', label: [158, 268] },
  { name: '', rect: r(55.75, 148.5, 41.25, 98), floor: 'carpet', label: [0, 0] },
  { name: 'Balcony', dims: '55 sq ft', rect: r(104.5, -54, 128, 54), floor: 'wood', label: [168.5, -30] },
];

/** Regions a piece must stay inside. */
export const FLOOR_BOUNDS: Rect[] = [r(6, 10, 305, 341), r(104.5, -54, 128, 54)];

export interface Door {
  hinge: Pt;
  radius: number;
  /** Angle of the closed leaf, degrees (0 = +x, 90 = +y). */
  closed: number;
  /** Angle of the open leaf. */
  open: number;
}
export const DOORS: Door[] = [
  { hinge: [183, 353], radius: 36, closed: 180, open: 225 }, // front door
  { hinge: [91.5, 247.5], radius: 31, closed: 180, open: 225 }, // bath (from bedroom hall)
  { hinge: [104.75, 287], radius: 32, closed: 270, open: 225 }, // bath (from foyer)
  { hinge: [77, 192], radius: 22.5, closed: 201, open: 133 }, // walk-in
  { hinge: [73.5, 187.5], radius: 19.5, closed: 29, open: -35 }, // reach-in
];

/** Bifold foyer closet doors and the barn door panel (parked open). */
export const BIFOLD_LINES: [Pt, Pt][] = [
  [
    [133, 300],
    [148.5, 318],
  ],
  [
    [133, 346],
    [148.5, 331],
  ],
];
export const BARN_DOOR: Rect = r(130.5, 76.5, 2.25, 46.5);

/** Where the builder's drawing sits in plan coordinates (for the reference underlay). */
export const REFERENCE_IMAGE = {
  href: 'reference/floor-plan.png',
  x: (-476 * 12) / 21,
  y: (-128 * 12) / 21,
  width: (1290 * 12) / 21,
  height: (847 * 12) / 21,
};

export const VIEW_BOUNDS: Rect = r(-24, -72, UNIT_W + 48, UNIT_H + 96);
