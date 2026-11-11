import { useMemo, useState } from 'react';
import type { PieceReport } from '../lib/geometry';
import { CATEGORY_LABEL, STATUS_LABEL, type Item, type Status } from '../lib/types';
import { formatDims } from '../lib/units';
import { itemDepth } from '../lib/geometry';
import { IconCheck, IconPlus, IconSearch } from './Icons';
import { Thumb } from './Thumb';

type Filter = 'all' | 'unplaced' | 'placed';

interface Props {
  items: Item[];
  placed: Set<string>;
  reports: Map<string, PieceReport>;
  selectedId: string | null;
  draggingId: string | null;
  onSelect(id: string): void;
  onEdit(id: string): void;
  onAdd(): void;
  onCardPointerDown(id: string, e: React.PointerEvent): void;
}

export function Tray({ items, placed, reports, selectedId, draggingId, onSelect, onEdit, onAdd, onCardPointerDown }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [status, setStatus] = useState<Status | 'any'>('any');
  const [q, setQ] = useState('');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((i) => (filter === 'all' ? true : filter === 'placed' ? placed.has(i.id) : !placed.has(i.id)))
      .filter((i) => status === 'any' || i.status === status)
      .filter((i) => !needle || i.name.toLowerCase().includes(needle) || CATEGORY_LABEL[i.category].toLowerCase().includes(needle))
      .sort((a, b) => Number(placed.has(a.id)) - Number(placed.has(b.id)) || a.createdAt - b.createdAt);
  }, [items, filter, status, q, placed]);

  const unplaced = items.filter((i) => !placed.has(i.id)).length;

  return (
    <section className="tray" aria-label="Inventory">
      <div className="tray-head">
        <h2>Inventory</h2>
        <span className="tray-count">
          {items.length} pieces · {unplaced} not placed
        </span>
        <div className="seg" role="tablist">
          {(['all', 'unplaced', 'placed'] as Filter[]).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'unplaced' ? 'Not placed' : 'Placed'}
            </button>
          ))}
        </div>
        <select className="tray-select" value={status} onChange={(e) => setStatus(e.target.value as Status | 'any')} aria-label="Status filter">
          <option value="any">Any status</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <label className="tray-search">
          <IconSearch size={14} />
          <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="tray-hint">Drag a card onto the plan to place it</span>
      </div>
      <div className="tray-cards">
        <button type="button" className="card add-card" onClick={onAdd}>
          <span className="add-icon">
            <IconPlus size={26} />
          </span>
          <span>Add furniture</span>
        </button>
        {visible.map((item) => {
          const isPlaced = placed.has(item.id);
          const rep = reports.get(item.id);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className={`card ${isPlaced ? 'placed' : ''} ${selectedId === item.id ? 'selected' : ''} ${draggingId === item.id ? 'dragging' : ''}`}
              onPointerDown={(e) => onCardPointerDown(item.id, e)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(item.id)}
              onDoubleClick={() => onEdit(item.id)}
              title={isPlaced ? 'On the plan. Drag to move it, double-click to edit.' : 'Drag onto the plan. Double-click to edit.'}
            >
              <div className="card-thumb">
                <Thumb item={item} size={64} />
                {isPlaced && (
                  <span className={`placed-badge ${rep?.invalid ? 'bad' : ''}`}>
                    {rep?.invalid ? '!' : <IconCheck size={12} />}
                  </span>
                )}
              </div>
              <div className="card-name">{item.name}</div>
              <div className="card-dims">
                {item.shape === 'circle' ? `${item.width}" round` : formatDims(item.width, itemDepth(item))}
                {item.estimated && <span className="est">est.</span>}
              </div>
              <div className={`card-status s-${item.status}`}>{STATUS_LABEL[item.status]}</div>
            </div>
          );
        })}
        {visible.length === 0 && <div className="tray-empty">No pieces match these filters.</div>}
      </div>
    </section>
  );
}
