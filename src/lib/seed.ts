import type { Doc, Item } from './types';

const t = Date.UTC(2026, 10, 11);

const base = { status: 'in-condo' as const, estimated: true, createdAt: t };

/** Jacob's furniture from the photos. Sizes are estimates until measured. */
export const SEED_ITEMS: Item[] = [
  { ...base, id: 'seed-queen-bed', name: 'Queen bed (cherry)', category: 'bed', shape: 'rect', width: 64, depth: 88, color: '#b5653a', image: 'furniture/queen-bed.jpg', clearanceFront: 24, notes: 'Mission-style cherry frame with slatted headboard. Front = foot of the bed.' },
  { ...base, id: 'seed-dresser', name: 'Cherry dresser', category: 'storage', shape: 'rect', width: 44, depth: 20, height: 32, color: '#b5653a', image: 'furniture/dresser.jpg', clearanceFront: 30, notes: '2 small + 2 large drawers.' },
  { ...base, id: 'seed-nightstand', name: 'Cherry nightstand', category: 'storage', shape: 'rect', width: 24, depth: 18, height: 26, color: '#b5653a', image: 'furniture/nightstand.jpg', clearanceFront: 16, notes: '1 drawer + open shelf.' },
  { ...base, id: 'seed-armoire', name: 'Stepped walnut armoire', category: 'storage', shape: 'rect', width: 48, depth: 21, height: 66, color: '#6b3b25', image: 'furniture/armoire.jpg', clearanceFront: 30, notes: 'Footprint = 4-drawer base; cabinet and 2-drawer box stack on top.' },
  { ...base, id: 'seed-sideboard', name: 'Dark pine sideboard', category: 'storage', shape: 'rect', width: 40, depth: 18, height: 34, color: '#4a2a1a', image: 'furniture/sideboard.jpg', clearanceFront: 24, notes: '2 drawers over 2 doors.' },
  { ...base, id: 'seed-console', name: 'Gold glass console', category: 'table', shape: 'rect', width: 24, depth: 12, height: 24, color: '#c9a54a', image: 'furniture/glass-console.jpg', clearanceFront: 0 },
  { ...base, id: 'seed-teak-table', name: 'Teak side table', category: 'table', shape: 'rect', width: 20, depth: 20, height: 16, color: '#9a9a92', image: 'furniture/teak-side-table.jpg', clearanceFront: 0 },
  { ...base, id: 'seed-floor-lamp', name: 'Plant-stand floor lamp', category: 'lighting', shape: 'circle', width: 14, depth: 14, color: '#3a3f4a', image: 'furniture/floor-lamp.jpg', clearanceFront: 0 },
];

export function seedDoc(): Doc {
  return {
    version: 1,
    items: SEED_ITEMS.map((i) => ({ ...i })),
    layouts: [
      {
        id: 'layout-a',
        name: 'Layout A',
        placements: [
          { itemId: 'seed-queen-bed', x: 50, y: 70, rotation: 270 },
          { itemId: 'seed-nightstand', x: 15, y: 114, rotation: 270 },
          { itemId: 'seed-dresser', x: 117.5, y: 120, rotation: 90 },
        ],
      },
    ],
    activeLayoutId: 'layout-a',
  };
}
