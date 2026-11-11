export type Pt = [number, number];
export type Shape = 'rect' | 'circle' | 'L';
export type Status = 'in-condo' | 'moving-in' | 'considering';
export type Category =
  | 'bed'
  | 'seating'
  | 'table'
  | 'storage'
  | 'desk'
  | 'lighting'
  | 'rug'
  | 'other';

/** A piece of furniture in the inventory. All lengths are inches. */
export interface Item {
  id: string;
  name: string;
  category: Category;
  shape: Shape;
  width: number;
  depth: number;
  /** L-shape only: thickness of the vertical leg (left side). */
  legWidth?: number;
  /** L-shape only: thickness of the horizontal leg (front side). */
  legDepth?: number;
  height?: number;
  color: string;
  image?: string;
  status: Status;
  estimated: boolean;
  /** Space needed in front of the piece (drawers, doors, legroom). */
  clearanceFront: number;
  notes?: string;
  createdAt: number;
}

/** Where an item sits on a layout. x/y are the item's centre, in inches. */
export interface Placement {
  itemId: string;
  x: number;
  y: number;
  rotation: number;
}

export interface Layout {
  id: string;
  name: string;
  placements: Placement[];
}

export interface Doc {
  version: 1;
  items: Item[];
  layouts: Layout[];
  activeLayoutId: string;
}

export const STATUS_LABEL: Record<Status, string> = {
  'in-condo': 'In condo',
  'moving-in': 'Moving in',
  considering: 'Considering',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  bed: 'Bed',
  seating: 'Seating',
  table: 'Table',
  storage: 'Storage',
  desk: 'Desk',
  lighting: 'Lighting',
  rug: 'Rug',
  other: 'Other',
};
