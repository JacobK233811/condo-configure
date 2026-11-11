import {
  DIAGONAL_WALLS,
  FLOOR_BOUNDS,
  GLASS_RECTS,
  OBSTACLES,
  RAILING_RECTS,
  WALL_RECTS,
  ZONES,
  rectPoly,
  type Rect,
} from './floorplan';
import type { Item, Layout, Placement, Pt } from './types';

export const EPS = 0.3;

export function itemDepth(item: Item) {
  return item.shape === 'circle' ? item.width : item.depth;
}

export function legSizes(item: Item) {
  const lw = Math.min(item.legWidth ?? Math.round(item.width / 3), item.width);
  const ld = Math.min(item.legDepth ?? Math.round(item.depth / 3), item.depth);
  return { lw, ld };
}

/** Convex polygons making up the piece, centred on the origin, unrotated. */
export function localPolys(item: Item): Pt[][] {
  const w = item.width;
  const d = itemDepth(item);
  if (item.shape === 'circle') {
    const n = 24;
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([(Math.cos(a) * w) / 2, (Math.sin(a) * w) / 2]);
    }
    return [pts];
  }
  if (item.shape === 'L') {
    const { lw, ld } = legSizes(item);
    const x0 = -w / 2;
    const y0 = -d / 2;
    return [
      rectPoly({ x: x0, y: y0, w: lw, h: d }),
      rectPoly({ x: x0 + lw, y: d / 2 - ld, w: w - lw, h: ld }),
    ];
  }
  return [rectPoly({ x: -w / 2, y: -d / 2, w, h: d })];
}

/** Outline path of the piece in local coordinates (for rendering). */
export function localPath(item: Item): string {
  const w = item.width;
  const d = itemDepth(item);
  if (item.shape === 'circle') {
    const rr = w / 2;
    return `M ${-rr} 0 A ${rr} ${rr} 0 1 0 ${rr} 0 A ${rr} ${rr} 0 1 0 ${-rr} 0 Z`;
  }
  if (item.shape === 'L') {
    const { lw, ld } = legSizes(item);
    const x0 = -w / 2;
    const y0 = -d / 2;
    return `M ${x0} ${y0} H ${x0 + lw} V ${d / 2 - ld} H ${w / 2} V ${d / 2} H ${x0} Z`;
  }
  return `M ${-w / 2} ${-d / 2} H ${w / 2} V ${d / 2} H ${-w / 2} Z`;
}

export function transformPt([x, y]: Pt, p: { x: number; y: number; rotation: number }): Pt {
  const a = (p.rotation * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p.x + x * c - y * s, p.y + x * s + y * c];
}

export function worldPolys(item: Item, p: Placement): Pt[][] {
  return localPolys(item).map((poly) => poly.map((pt) => transformPt(pt, p)));
}

export function localClearanceRect(item: Item): Rect | null {
  if (item.shape === 'circle' || item.clearanceFront <= 0) return null;
  const d = itemDepth(item);
  return { x: -item.width / 2, y: d / 2, w: item.width, h: item.clearanceFront };
}

export function clearancePoly(item: Item, p: Placement): Pt[] | null {
  const rc = localClearanceRect(item);
  return rc ? rectPoly(rc).map((pt) => transformPt(pt, p)) : null;
}

export function polysBounds(polys: Pt[][]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polys)
    for (const [x, y] of poly) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function project(poly: Pt[], ax: number, ay: number): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const [x, y] of poly) {
    const v = x * ax + y * ay;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

/** Separating-axis test for two convex polygons; touching edges don't count. */
export function convexOverlap(a: Pt[], b: Pt[], eps = EPS): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const nx = y1 - y2;
      const ny = x2 - x1;
      const len = Math.hypot(nx, ny);
      if (len === 0) continue;
      const [amin, amax] = project(a, nx / len, ny / len);
      const [bmin, bmax] = project(b, nx / len, ny / len);
      if (amax - bmin <= eps || bmax - amin <= eps) return false;
    }
  }
  return true;
}

export function polysOverlap(a: Pt[][], b: Pt[][], eps = EPS) {
  return a.some((pa) => b.some((pb) => convexOverlap(pa, pb, eps)));
}

type BlockerKind = 'wall' | 'built-in' | 'room';
interface Blocker {
  kind: BlockerKind;
  label: string;
  poly: Pt[];
}

const BLOCKERS: Blocker[] = [
  ...WALL_RECTS.map((rc) => ({ kind: 'wall' as const, label: 'a wall', poly: rectPoly(rc) })),
  ...DIAGONAL_WALLS.map((poly) => ({ kind: 'wall' as const, label: 'a wall', poly })),
  ...GLASS_RECTS.map((rc) => ({ kind: 'wall' as const, label: 'a window', poly: rectPoly(rc) })),
  ...RAILING_RECTS.map((rc) => ({ kind: 'wall' as const, label: 'the railing', poly: rectPoly(rc) })),
  ...OBSTACLES.map((o) => ({
    kind: 'built-in' as const,
    label: o.kind === 'counter' ? 'a counter' : o.kind === 'island' ? 'the island' : `the ${o.kind}`,
    poly: rectPoly(o.rect),
  })),
  ...ZONES.map((z) => ({
    kind: 'room' as const,
    label: z.name === 'P' ? 'the pantry' : `the ${z.name.toLowerCase()}`,
    poly: rectPoly(z.rect),
  })),
];

/** Axis-aligned rects pieces snap flush against. */
export const MAGNET_RECTS: Rect[] = [
  ...WALL_RECTS,
  ...GLASS_RECTS,
  ...RAILING_RECTS,
  ...OBSTACLES.map((o) => o.rect),
  ...ZONES.map((z) => z.rect),
];

function inBounds(polys: Pt[][]) {
  return polys.every((poly) =>
    poly.every(([x, y]) =>
      FLOOR_BOUNDS.some(
        (b) => x >= b.x - EPS && x <= b.x + b.w + EPS && y >= b.y - EPS && y <= b.y + b.h + EPS,
      ),
    ),
  );
}

export interface PieceReport {
  /** Hard problems: hits walls/built-ins, overlaps a piece, or leaves the floor. */
  invalid: boolean;
  issues: string[];
  /** Soft problem: the front clearance is blocked. */
  clearanceIssues: string[];
}

export function analyzeLayout(placements: Placement[], items: Map<string, Item>) {
  const out = new Map<string, PieceReport>();
  const entries = placements
    .map((p) => ({ p, item: items.get(p.itemId) }))
    .filter((e): e is { p: Placement; item: Item } => !!e.item)
    .map((e) => ({ ...e, polys: worldPolys(e.item, e.p), clear: clearancePoly(e.item, e.p) }));

  for (const e of entries) {
    const issues: string[] = [];
    const clearanceIssues: string[] = [];
    const isRug = e.item.category === 'rug';
    if (!inBounds(e.polys)) issues.push('Sits outside the floor');
    const hit = new Set<string>();
    for (const b of BLOCKERS) {
      if (isRug && b.kind === 'built-in') continue;
      if (polysOverlap(e.polys, [b.poly])) hit.add(b.label);
    }
    hit.forEach((l) => issues.push(`Hits ${l}`));
    for (const o of entries) {
      if (o === e || isRug || o.item.category === 'rug') continue;
      if (polysOverlap(e.polys, o.polys)) issues.push(`Overlaps ${o.item.name}`);
    }
    if (e.clear) {
      const cHit = new Set<string>();
      for (const b of BLOCKERS) if (polysOverlap([e.clear], [b.poly])) cHit.add(b.label);
      for (const o of entries) {
        if (o === e || o.item.category === 'rug') continue;
        if (polysOverlap([e.clear], o.polys)) cHit.add(o.item.name);
      }
      cHit.forEach((l) => clearanceIssues.push(`Front clearance blocked by ${l}`));
    }
    out.set(e.p.itemId, { invalid: issues.length > 0, issues, clearanceIssues });
  }
  return out;
}

export function normAngle(a: number) {
  return ((Math.round(a * 100) / 100) % 360 + 360) % 360;
}

/**
 * Snap a piece's position: its bounding box corner to the grid, then flush
 * against nearby walls/built-ins/other pieces (only when square to the walls).
 */
export function snapPosition(
  item: Item,
  rotation: number,
  x: number,
  y: number,
  opts: { grid: number | null; others: Rect[] },
): [number, number] {
  const bounds = polysBounds(worldPolys(item, { itemId: item.id, x: 0, y: 0, rotation }));
  const hw = bounds.w / 2;
  const hh = bounds.h / 2;
  const offX = bounds.x + hw;
  const offY = bounds.y + hh;
  let left = x + offX - hw;
  let top = y + offY - hh;
  if (opts.grid) {
    left = Math.round(left / opts.grid) * opts.grid;
    top = Math.round(top / opts.grid) * opts.grid;
  } else {
    left = Math.round(left * 4) / 4;
    top = Math.round(top * 4) / 4;
  }
  const square = normAngle(rotation) % 90 === 0;
  if (opts.grid && square) {
    const M = 4;
    const rects = [...MAGNET_RECTS, ...opts.others];
    let bestX = M + 1;
    let dx = 0;
    let bestY = M + 1;
    let dy = 0;
    for (const rc of rects) {
      const vOverlap = Math.min(top + bounds.h, rc.y + rc.h) - Math.max(top, rc.y);
      if (vOverlap > 0) {
        for (const d of [left - (rc.x + rc.w), left + bounds.w - rc.x]) {
          if (Math.abs(d) < bestX) {
            bestX = Math.abs(d);
            dx = d;
          }
        }
      }
      const hOverlap = Math.min(left + bounds.w, rc.x + rc.w) - Math.max(left, rc.x);
      if (hOverlap > 0) {
        for (const d of [top - (rc.y + rc.h), top + bounds.h - rc.y]) {
          if (Math.abs(d) < bestY) {
            bestY = Math.abs(d);
            dy = d;
          }
        }
      }
    }
    if (bestX <= M) left -= dx;
    if (bestY <= M) top -= dy;
  }
  return [left + hw - offX, top + hh - offY];
}

export function placedRects(layout: Layout, items: Map<string, Item>, exceptId?: string): Rect[] {
  return layout.placements
    .filter((p) => p.itemId !== exceptId)
    .map((p) => {
      const it = items.get(p.itemId);
      return it && it.category !== 'rug' ? polysBounds(worldPolys(it, p)) : null;
    })
    .filter((x): x is Rect => !!x);
}
