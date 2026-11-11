import type { Category, Shape } from './types';

export interface Template {
  name: string;
  category: Category;
  shape: Shape;
  width: number;
  depth: number;
  legWidth?: number;
  legDepth?: number;
  clearanceFront: number;
  color: string;
}

/** Common pieces at typical US sizes (inches). */
export const CATALOG: Template[] = [
  { name: 'Twin bed', category: 'bed', shape: 'rect', width: 42, depth: 80, clearanceFront: 24, color: '#b9a48a' },
  { name: 'Full bed', category: 'bed', shape: 'rect', width: 57, depth: 80, clearanceFront: 24, color: '#b9a48a' },
  { name: 'Queen bed', category: 'bed', shape: 'rect', width: 63, depth: 85, clearanceFront: 24, color: '#b9a48a' },
  { name: 'King bed', category: 'bed', shape: 'rect', width: 79, depth: 85, clearanceFront: 24, color: '#b9a48a' },
  { name: 'Sofa', category: 'seating', shape: 'rect', width: 84, depth: 36, clearanceFront: 18, color: '#7d8fa6' },
  { name: 'Loveseat', category: 'seating', shape: 'rect', width: 60, depth: 35, clearanceFront: 18, color: '#7d8fa6' },
  { name: 'Sectional', category: 'seating', shape: 'L', width: 104, depth: 80, legWidth: 36, legDepth: 36, clearanceFront: 0, color: '#7d8fa6' },
  { name: 'Armchair', category: 'seating', shape: 'rect', width: 32, depth: 34, clearanceFront: 18, color: '#8aa39b' },
  { name: 'Ottoman', category: 'seating', shape: 'rect', width: 24, depth: 24, clearanceFront: 0, color: '#8aa39b' },
  { name: 'Dining chair', category: 'seating', shape: 'rect', width: 18, depth: 21, clearanceFront: 0, color: '#a58a6b' },
  { name: 'Bar stool', category: 'seating', shape: 'circle', width: 16, depth: 16, clearanceFront: 0, color: '#a58a6b' },
  { name: 'Coffee table', category: 'table', shape: 'rect', width: 48, depth: 24, clearanceFront: 0, color: '#9c7b58' },
  { name: 'Round coffee table', category: 'table', shape: 'circle', width: 36, depth: 36, clearanceFront: 0, color: '#9c7b58' },
  { name: 'Dining table (4)', category: 'table', shape: 'rect', width: 60, depth: 36, clearanceFront: 0, color: '#9c7b58' },
  { name: 'Round dining table', category: 'table', shape: 'circle', width: 42, depth: 42, clearanceFront: 0, color: '#9c7b58' },
  { name: 'Side table', category: 'table', shape: 'rect', width: 20, depth: 20, clearanceFront: 0, color: '#9c7b58' },
  { name: 'Desk', category: 'desk', shape: 'rect', width: 48, depth: 24, clearanceFront: 30, color: '#8a7560' },
  { name: 'Office chair', category: 'desk', shape: 'circle', width: 26, depth: 26, clearanceFront: 0, color: '#555b66' },
  { name: 'Bookshelf', category: 'storage', shape: 'rect', width: 32, depth: 12, clearanceFront: 18, color: '#8a6a4f' },
  { name: 'Dresser', category: 'storage', shape: 'rect', width: 60, depth: 20, clearanceFront: 30, color: '#8a6a4f' },
  { name: 'TV stand', category: 'storage', shape: 'rect', width: 60, depth: 18, clearanceFront: 0, color: '#5b5048' },
  { name: 'Floor lamp', category: 'lighting', shape: 'circle', width: 14, depth: 14, clearanceFront: 0, color: '#d1b06b' },
  { name: 'Rug 5×8', category: 'rug', shape: 'rect', width: 60, depth: 96, clearanceFront: 0, color: '#c9b6d6' },
  { name: 'Rug 8×10', category: 'rug', shape: 'rect', width: 96, depth: 120, clearanceFront: 0, color: '#c9b6d6' },
  { name: 'Round rug 6′', category: 'rug', shape: 'circle', width: 72, depth: 72, clearanceFront: 0, color: '#c9b6d6' },
  { name: 'Plant', category: 'other', shape: 'circle', width: 18, depth: 18, clearanceFront: 0, color: '#7fa86b' },
];

export const SWATCHES = [
  '#b5653a', '#8e4a2b', '#6b3b25', '#4a2a1a', '#c9a54a', '#9a9a92',
  '#7d8fa6', '#8aa39b', '#7fa86b', '#c9b6d6', '#d98c7a', '#555b66',
];
