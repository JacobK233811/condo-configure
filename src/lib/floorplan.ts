import type { Pt } from './types';

/**
 * The unit's floor plan, traced from the builder's drawing at ~21 px/ft and
 * reconciled with the labelled room sizes and the 810 sq ft total.
 * Units are inches; origin is the outside top-left corner of the unit,
 * +x to the right (east), +y down (south, towards the front door).
 * Room sizes labelled on the plan are exact; everything else is traced.
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
  r(108.5, 0, 36, 10),
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
  r(113.5, 10, 3, 20),
  r(113.5, 28.5, 23, 2.5),
  r(134, 28.5, 2.5, 11.5),
  // bedroom / living wall (barn door opening is y 40 → 84)
  r(134, 84, 2.5, 68),
  // walk-in closet
  r(6, 150, 49.5, 2.5),
  r(53.5, 150, 2.25, 34),
  r(53.5, 214.5, 2.25, 34.5),
  r(6, 246, 52.5, 3),
  // reach-in closet + pantry
  r(97, 150, 39.5, 2.5),
  r(97, 150, 2.25, 15),
  r(97, 197, 2.25, 8),
  r(123, 152, 2.5, 53),
  // washer / dryer
  r(97, 204.5, 40.5, 3),
  r(97, 204.5, 2.5, 38),
  r(135, 204.5, 2.5, 38),
  r(91.5, 240, 46, 6.5),
  r(103, 246, 2.75, 9),
  // bath / shower / foyer closet
  r(103.5, 287, 2.75, 64),
  r(67, 292.5, 66.5, 2.75),
  r(67, 343, 37, 8),
  r(131.25, 292.5, 2.25, 7.5),
  r(131.25, 345, 2.25, 6),
  // kitchen + den piers
  r(285.5, 150.75, 25.5, 2.75),
  r(297, 227, 14, 23.5),
  r(301, 303, 10, 15),
];

export const DIAGONAL_WALLS: Pt[][] = [
  segPoly([55.75, 214.5], [77, 192], 2.25),
  segPoly([73.5, 187.5], [98.5, 164.75], 2.25),
];

/** Windows and the balcony slider: they block furniture like walls. */
export const GLASS_RECTS: Rect[] = [r(42, 0, 66.5, 10), r(144.5, 0, 65.5, 10), r(244, 0, 30.5, 10)];

/** Balcony railing. */
export const RAILING_RECTS: Rect[] = [r(110, -56, 132, 2), r(110, -56, 2, 56), r(240, -56, 2, 56)];

export type ObstacleKind = 'counter' | 'island' | 'stairs' | 'railing' | 'pantry';
export interface Obstacle {
  kind: ObstacleKind;
  rect: Rect;
  label?: string;
}

/** Built-ins furniture can't overlap. */
export const OBSTACLES: Obstacle[] = [
  { kind: 'island', rect: r(184.5, 149.5, 63.5, 35.5), label: 'Island' },
  { kind: 'counter', rect: r(286.5, 153.5, 24.5, 69) },
  { kind: 'counter', rect: r(183.5, 221.5, 113.5, 28.75) },
  { kind: 'stairs', rect: r(185.5, 250.25, 30.5, 37) },
  { kind: 'railing', rect: r(186.5, 286.5, 40, 2.75) },
  { kind: 'railing', rect: r(185.75, 289, 3, 62) },
  { kind: 'pantry', rect: r(134.5, 152, 2, 53) },
];

/** Areas that aren't floor space for furniture (closets, bath, laundry). */
export interface Zone {
  name: string;
  rect: Rect;
  pattern: 'closet' | 'tile' | 'laundry';
}
export const ZONES: Zone[] = [
  { name: 'Walk-in closet', rect: r(6, 152.5, 47.5, 93.5), pattern: 'closet' },
  { name: 'Closet', rect: r(99.25, 152.5, 23.75, 44.5), pattern: 'closet' },
  { name: 'P', rect: r(125.5, 152.5, 9, 52), pattern: 'closet' },
  { name: 'W/D', rect: r(99.5, 207.5, 35.5, 32.5), pattern: 'laundry' },
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
  { name: 'Bedroom', dims: `10' 6" × 11' 9"`, rect: r(6, 10, 128, 140), floor: 'carpet', label: [70, 80] },
  { name: 'Living / dining', dims: `14' 6" × 12' 0"`, rect: r(136.5, 10, 174.5, 141), floor: 'wood', label: [224, 72] },
  { name: 'Kitchen', rect: r(136.5, 150, 174.5, 72), floor: 'wood', label: [262, 202] },
  { name: 'Den (loft)', dims: `10' 3" × 8' 3"`, rect: r(185.5, 250, 125.5, 101), floor: 'wood', label: [252, 318] },
  { name: 'Foyer', rect: r(106, 205, 80, 146), floor: 'wood', label: [158, 268] },
  { name: '', rect: r(55.75, 152.5, 41.5, 94), floor: 'carpet', label: [0, 0] },
  { name: 'Balcony', dims: '55 sq ft', rect: r(112, -54, 128, 54), floor: 'wood', label: [176, -30] },
];

/** Regions a piece must stay inside. */
export const FLOOR_BOUNDS: Rect[] = [r(6, 10, 305, 341), r(112, -54, 128, 54)];

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
  { hinge: [73.5, 187.5], radius: 26.5, closed: 22, open: -42 }, // reach-in
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
export const BARN_DOOR: Rect = r(137, 76.5, 2.25, 46.5);

/** Where the builder's drawing sits in plan coordinates (for the reference underlay). */
export const REFERENCE_IMAGE = {
  href: 'reference/floor-plan.png',
  x: (-476 * 12) / 21,
  y: (-128 * 12) / 21,
  width: (1290 * 12) / 21,
  height: (847 * 12) / 21,
};

export const VIEW_BOUNDS: Rect = r(-24, -72, UNIT_W + 48, UNIT_H + 96);
