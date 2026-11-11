import type { Layout } from '../lib/types';
import { Dropdown, Toggle } from './Controls';
import {
  IconChevronDown,
  IconDownload,
  IconFit,
  IconLayers,
  IconMenu,
  IconPointer,
  IconRedo,
  IconRuler,
  IconUndo,
  IconZoomIn,
  IconZoomOut,
} from './Icons';
import type { Tool, ViewSettings } from './PlanCanvas';

interface Props {
  layouts: Layout[];
  activeId: string;
  onSwitch(id: string): void;
  onNewLayout(): void;
  onDuplicateLayout(): void;
  onRenameLayout(): void;
  onDeleteLayout(): void;
  tool: Tool;
  setTool(t: Tool): void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  settings: ViewSettings;
  setSettings(s: ViewSettings): void;
  zoomPct: number;
  onZoom(f: number): void;
  onFit(): void;
  measureCount: number;
  onClearMeasures(): void;
  onExportPng(): void;
  onExportJson(): void;
  onImportJson(): void;
  onReset(): void;
}

export function TopBar(p: Props) {
  const s = p.settings;
  const set = (patch: Partial<ViewSettings>) => p.setSettings({ ...s, ...patch });
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M3 11 12 4l9 7v9H3z" fill="#f2b134" stroke="#7a4f0a" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="9.5" y="13" width="5" height="7" fill="#7a4f0a" />
          </svg>
        </span>
        <span className="brand-name">Condo Configure</span>
      </div>

      <nav className="layout-tabs" aria-label="Layouts">
        {p.layouts.map((l) => (
          <button key={l.id} type="button" className={`layout-tab ${l.id === p.activeId ? 'on' : ''}`} onClick={() => p.onSwitch(l.id)} onDoubleClick={p.onRenameLayout}>
            {l.name}
          </button>
        ))}
        <Dropdown label={<IconChevronDown size={16} />} title="Layout options" className="ghost small">
          {(close) => (
            <div className="menu">
              <button type="button" onClick={() => (p.onNewLayout(), close())}>New empty layout</button>
              <button type="button" onClick={() => (p.onDuplicateLayout(), close())}>Duplicate this layout</button>
              <button type="button" onClick={() => (p.onRenameLayout(), close())}>Rename…</button>
              <button type="button" className="danger" disabled={p.layouts.length < 2} onClick={() => (p.onDeleteLayout(), close())}>
                Delete this layout
              </button>
            </div>
          )}
        </Dropdown>
      </nav>

      <div className="tools">
        <div className="seg dark" role="toolbar" aria-label="Tools">
          <button type="button" className={p.tool === 'select' ? 'on' : ''} onClick={() => p.setTool('select')} title="Move (V)">
            <IconPointer size={16} /> Move
          </button>
          <button type="button" className={p.tool === 'measure' ? 'on' : ''} onClick={() => p.setTool('measure')} title="Tape measure (M). Shift = straight line.">
            <IconRuler size={16} /> Measure
          </button>
        </div>
        {p.measureCount > 0 && (
          <button type="button" className="btn ghost small" onClick={p.onClearMeasures}>
            Clear {p.measureCount} measurement{p.measureCount > 1 ? 's' : ''}
          </button>
        )}
        <button type="button" className="btn ghost icon" onClick={p.onUndo} disabled={!p.canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
          <IconUndo size={18} />
        </button>
        <button type="button" className="btn ghost icon" onClick={p.onRedo} disabled={!p.canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
          <IconRedo size={18} />
        </button>
        <div className="zoom">
          <button type="button" className="btn ghost icon" onClick={() => p.onZoom(1 / 1.25)} aria-label="Zoom out">
            <IconZoomOut size={18} />
          </button>
          <span className="zoom-pct">{p.zoomPct}%</span>
          <button type="button" className="btn ghost icon" onClick={() => p.onZoom(1.25)} aria-label="Zoom in">
            <IconZoomIn size={18} />
          </button>
          <button type="button" className="btn ghost icon" onClick={p.onFit} title="Fit plan" aria-label="Fit plan">
            <IconFit size={18} />
          </button>
        </div>
        <Dropdown label={<><IconLayers size={16} /> View</>} align="right" className="ghost">
          {() => (
            <div className="menu toggles">
              <Toggle checked={s.snap} onChange={(v) => set({ snap: v })}>Snap to 3" grid and walls (hold Alt to skip)</Toggle>
              <Toggle checked={s.showGrid} onChange={(v) => set({ showGrid: v })}>Show grid</Toggle>
              <Toggle checked={s.showClearance} onChange={(v) => set({ showClearance: v })}>Show front clearances</Toggle>
              <Toggle checked={s.showPhotos} onChange={(v) => set({ showPhotos: v })}>Photos on the plan</Toggle>
              <Toggle checked={s.showReference} onChange={(v) => set({ showReference: v })}>Overlay builder's floor plan</Toggle>
            </div>
          )}
        </Dropdown>
        <Dropdown label={<IconMenu size={18} />} align="right" title="Export and data" className="ghost icon">
          {(close) => (
            <div className="menu">
              <button type="button" onClick={() => (p.onExportPng(), close())}>
                <IconDownload size={14} /> Save plan as PNG
              </button>
              <button type="button" onClick={() => (p.onExportJson(), close())}>Back up everything (JSON)</button>
              <button type="button" onClick={() => (p.onImportJson(), close())}>Restore from backup…</button>
              <hr />
              <button type="button" className="danger" onClick={() => (p.onReset(), close())}>Reset to sample data</button>
            </div>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
