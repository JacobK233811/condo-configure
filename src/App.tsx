import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { Inspector } from './components/Inspector';
import { ItemEditor } from './components/ItemEditor';
import { PlanCanvas, type CanvasHandle, type Measure, type Tool, type ViewSettings } from './components/PlanCanvas';
import { Thumb } from './components/Thumb';
import { TopBar } from './components/TopBar';
import { Tray } from './components/Tray';
import { download, exportSvgPng } from './lib/files';
import { analyzeLayout, normAngle, placedRects, snapPosition } from './lib/geometry';
import { seedDoc } from './lib/seed';
import { isDoc, uid, useDocStore } from './lib/store';
import type { Doc, Item, Layout, Placement, Pt } from './lib/types';

const VIEW_KEY = 'condo-configure:view';
const DEFAULT_VIEW: ViewSettings = { snap: true, showClearance: true, showPhotos: false, showReference: false, showGrid: true };

function loadView(): ViewSettings {
  try {
    return { ...DEFAULT_VIEW, ...JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') };
  } catch {
    return DEFAULT_VIEW;
  }
}

interface TrayPress {
  itemId: string;
  sx: number;
  sy: number;
  pointerType: string;
  active: boolean;
  x: number;
  y: number;
}

export default function App() {
  const { doc, apply, undo, redo, canUndo, canRedo, saveError } = useDocStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [settings, setSettingsState] = useState<ViewSettings>(loadView);
  const [editor, setEditor] = useState<{ item: Item | null } | null>(null);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [zoomPct, setZoomPct] = useState(100);
  const [press, setPress] = useState<TrayPress | null>(null);
  const [ghostRot, setGhostRot] = useState(0);
  const [ghost, setGhost] = useState<Placement | null>(null);
  const canvasRef = useRef<CanvasHandle>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const setSettings = (s: ViewSettings) => {
    setSettingsState(s);
    localStorage.setItem(VIEW_KEY, JSON.stringify(s));
  };

  const layout = doc.layouts.find((l) => l.id === doc.activeLayoutId) ?? doc.layouts[0];
  const itemsById = useMemo(() => new Map(doc.items.map((i) => [i.id, i])), [doc.items]);
  const placedIds = useMemo(() => new Set(layout.placements.map((p) => p.itemId)), [layout]);
  const reports = useMemo(() => analyzeLayout(layout.placements, itemsById), [layout, itemsById]);
  const conflicts = [...reports.values()].filter((r) => r.invalid).length;
  const clearanceWarnings = [...reports.values()].filter((r) => !r.invalid && r.clearanceIssues.length).length;

  const updateLayout = useCallback(
    (fn: (l: Layout) => Layout) =>
      apply((d) => ({ ...d, layouts: d.layouts.map((l) => (l.id === d.activeLayoutId ? fn(l) : l)) })),
    [apply],
  );

  const snap = useCallback(
    (itemId: string, rotation: number, x: number, y: number, free: boolean): Pt => {
      const item = itemsById.get(itemId);
      if (!item) return [x, y];
      return snapPosition(item, rotation, x, y, {
        grid: free ? null : 3,
        others: free ? [] : placedRects(layout, itemsById, itemId),
      });
    },
    [itemsById, layout],
  );

  const place = useCallback(
    (itemId: string, x: number, y: number, rotation: number) =>
      updateLayout((l) => ({
        ...l,
        placements: [...l.placements.filter((p) => p.itemId !== itemId), { itemId, x, y, rotation }],
      })),
    [updateLayout],
  );

  const patchPlacement = useCallback(
    (itemId: string, patch: Partial<Placement>) =>
      updateLayout((l) => ({ ...l, placements: l.placements.map((p) => (p.itemId === itemId ? { ...p, ...patch } : p)) })),
    [updateLayout],
  );

  const rotateTo = useCallback(
    (itemId: string, rotation: number) => {
      const p = layout.placements.find((q) => q.itemId === itemId);
      if (!p) return;
      const r = normAngle(rotation);
      const [x, y] = settings.snap && r % 90 === 0 ? snap(itemId, r, p.x, p.y, false) : [p.x, p.y];
      patchPlacement(itemId, { rotation: r, x, y });
    },
    [layout, settings.snap, snap, patchPlacement],
  );

  const removeFromPlan = useCallback(
    (itemId: string) => updateLayout((l) => ({ ...l, placements: l.placements.filter((p) => p.itemId !== itemId) })),
    [updateLayout],
  );

  const placeInView = (itemId: string) => {
    const c = canvasRef.current?.center() ?? [160, 180];
    const [x, y] = snap(itemId, 0, c[0], c[1], !settings.snap);
    place(itemId, x, y, 0);
    setSelectedId(itemId);
  };

  const patchItem = (id: string, patch: Partial<Item>) =>
    apply((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const duplicate = useCallback(
    (id: string) => {
      const src = itemsById.get(id);
      if (!src) return;
      const base = src.name.replace(/ \(\d+\)$/, '');
      let n = 2;
      while (doc.items.some((i) => i.name === `${base} (${n})`)) n++;
      const copy: Item = { ...src, id: uid('item'), name: `${base} (${n})`, createdAt: Date.now() };
      const p = layout.placements.find((q) => q.itemId === id);
      apply((d) => ({
        ...d,
        items: [...d.items, copy],
        layouts: p
          ? d.layouts.map((l) =>
              l.id === d.activeLayoutId ? { ...l, placements: [...l.placements, { ...p, itemId: copy.id, x: p.x + 12, y: p.y + 12 }] } : l,
            )
          : d.layouts,
      }));
      setSelectedId(copy.id);
    },
    [itemsById, doc.items, layout, apply],
  );

  const deleteItem = (id: string) => {
    const it = itemsById.get(id);
    if (!it || !confirm(`Delete "${it.name}" from your inventory and every layout?`)) return;
    apply((d) => ({
      ...d,
      items: d.items.filter((i) => i.id !== id),
      layouts: d.layouts.map((l) => ({ ...l, placements: l.placements.filter((p) => p.itemId !== id) })),
    }));
    setSelectedId(null);
  };

  const saveItem = (item: Item) => {
    apply((d) =>
      d.items.some((i) => i.id === item.id)
        ? { ...d, items: d.items.map((i) => (i.id === item.id ? item : i)) }
        : { ...d, items: [...d.items, item] },
    );
    setEditor(null);
    setSelectedId(item.id);
  };

  // --- layouts ---
  const switchLayout = (id: string) => {
    apply((d) => ({ ...d, activeLayoutId: id }));
    setSelectedId(null);
  };
  const newLayout = (copyFrom?: Layout) => {
    const name = prompt('Name for the new layout', copyFrom ? `${copyFrom.name} copy` : `Layout ${String.fromCharCode(65 + doc.layouts.length)}`);
    if (!name) return;
    const l: Layout = { id: uid('layout'), name, placements: copyFrom ? copyFrom.placements.map((p) => ({ ...p })) : [] };
    apply((d) => ({ ...d, layouts: [...d.layouts, l], activeLayoutId: l.id }));
  };
  const renameLayout = () => {
    const name = prompt('Rename layout', layout.name);
    if (name) updateLayout((l) => ({ ...l, name }));
  };
  const deleteLayout = () => {
    if (doc.layouts.length < 2 || !confirm(`Delete "${layout.name}"? Your furniture stays in the inventory.`)) return;
    apply((d) => {
      const layouts = d.layouts.filter((l) => l.id !== d.activeLayoutId);
      return { ...d, layouts, activeLayoutId: layouts[0].id };
    });
  };

  // --- import / export ---
  const exportJson = () =>
    download(`condo-configure-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
  const importJson = async (f: File | undefined) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!isDoc(d)) throw new Error('bad');
      apply(() => d as Doc);
      setSelectedId(null);
    } catch {
      alert('That file is not a Condo Configure backup.');
    }
  };
  const exportPng = () => {
    const svg = canvasRef.current?.svg();
    if (svg) exportSvgPng(svg, `${layout.name.replace(/[^\w-]+/g, '-').toLowerCase()}.png`);
  };

  // --- tray drag ---
  const onCardPointerDown = (itemId: string, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const placed = layout.placements.find((p) => p.itemId === itemId);
    setGhostRot(placed?.rotation ?? 0);
    setPress({ itemId, sx: e.clientX, sy: e.clientY, pointerType: e.pointerType, active: false, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!press) return;
    const move = (e: PointerEvent) => {
      const dx = e.clientX - press.sx;
      const dy = e.clientY - press.sy;
      let active = press.active;
      if (!active) {
        const far = press.pointerType === 'mouse' ? Math.hypot(dx, dy) > 6 : -dy > 12 && Math.abs(dy) > Math.abs(dx);
        if (!far) return;
        active = true;
      }
      setPress({ ...press, active, x: e.clientX, y: e.clientY });
      const w = canvasRef.current?.clientToWorld(e.clientX, e.clientY);
      if (w) {
        const [x, y] = snap(press.itemId, ghostRot, w[0], w[1], e.altKey || !settings.snap);
        setGhost({ itemId: press.itemId, x, y, rotation: ghostRot });
      } else setGhost(null);
    };
    const up = () => {
      if (!press.active) setSelectedId(press.itemId);
      else if (ghost) {
        place(ghost.itemId, ghost.x, ghost.y, ghost.rotation);
        setSelectedId(ghost.itemId);
      }
      setPress(null);
      setGhost(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [press, ghost, ghostRot, snap, settings.snap, place]);

  useEffect(() => {
    if (ghost && ghost.rotation !== ghostRot) {
      const [x, y] = snap(ghost.itemId, ghostRot, ghost.x, ghost.y, !settings.snap);
      setGhost({ ...ghost, x, y, rotation: ghostRot });
    }
  }, [ghostRot, ghost, snap, settings.snap]);

  // --- keyboard ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (editor || t.closest('input, textarea, select')) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && k === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (press?.active && k === 'r') {
        setGhostRot((r) => normAngle(r + (e.shiftKey ? -90 : 90)));
        return;
      }
      if (k === 'v') setTool('select');
      if (k === 'm') setTool('measure');
      if (k === 'escape') {
        if (press) {
          setPress(null);
          setGhost(null);
        } else if (tool !== 'select') setTool('select');
        else setSelectedId(null);
      }
      if (!selectedId) return;
      const p = layout.placements.find((q) => q.itemId === selectedId);
      if (mod && k === 'd') {
        e.preventDefault();
        duplicate(selectedId);
        return;
      }
      if (!p) return;
      if (k === 'r' && !mod) rotateTo(selectedId, p.rotation + (e.shiftKey ? -90 : 90));
      if (k === 'delete' || k === 'backspace') {
        e.preventDefault();
        removeFromPlan(selectedId);
      }
      const step = e.shiftKey ? 6 : 1;
      const nudge: Record<string, Pt> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
      if (nudge[k]) {
        e.preventDefault();
        patchPlacement(selectedId, { x: p.x + nudge[k][0], y: p.y + nudge[k][1] });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, press, tool, selectedId, layout, undo, redo, duplicate, rotateTo, removeFromPlan, patchPlacement]);

  const selItem = selectedId ? itemsById.get(selectedId) : undefined;
  const selPlacement = selectedId ? layout.placements.find((p) => p.itemId === selectedId) : undefined;
  const dragItem = press?.active ? itemsById.get(press.itemId) : undefined;

  return (
    <div className={`app ${press?.active ? 'is-dragging' : ''}`}>
      <TopBar
        layouts={doc.layouts}
        activeId={layout.id}
        onSwitch={switchLayout}
        onNewLayout={() => newLayout()}
        onDuplicateLayout={() => newLayout(layout)}
        onRenameLayout={renameLayout}
        onDeleteLayout={deleteLayout}
        tool={tool}
        setTool={setTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        settings={settings}
        setSettings={setSettings}
        zoomPct={zoomPct}
        onZoom={(f) => canvasRef.current?.zoom(f)}
        onFit={() => canvasRef.current?.fit()}
        measureCount={measures.length}
        onClearMeasures={() => setMeasures([])}
        onExportPng={exportPng}
        onExportJson={exportJson}
        onImportJson={() => importRef.current?.click()}
        onReset={() => {
          if (confirm('Replace your inventory and layouts with the sample data? Back up first if you want to keep them.')) {
            apply(() => seedDoc());
            setSelectedId(null);
          }
        }}
      />
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => (importJson(e.target.files?.[0]), (e.target.value = ''))} />
      {saveError && <div className="banner">{saveError}</div>}
      <main className="main">
        <div className="plan-area">
          <PlanCanvas
            ref={canvasRef}
            items={itemsById}
            layout={layout}
            selectedId={selectedId}
            onSelect={setSelectedId}
            snap={snap}
            onMove={(id, x, y) => patchPlacement(id, { x, y })}
            onRotate={rotateTo}
            tool={tool}
            settings={settings}
            ghost={ghost}
            measures={measures}
            onAddMeasure={(a, b) => setMeasures((m) => [...m, { id: uid('m'), a, b }])}
            onRemoveMeasure={(id) => setMeasures((m) => m.filter((x) => x.id !== id))}
            onZoomChange={setZoomPct}
          />
          <div className="plan-status">
            <span>{layout.placements.length} placed</span>
            {conflicts > 0 ? (
              <span className="pill bad">{conflicts} not fitting</span>
            ) : (
              layout.placements.length > 0 && <span className="pill ok">Everything fits</span>
            )}
            {clearanceWarnings > 0 && settings.showClearance && <span className="pill warn">{clearanceWarnings} clearance blocked</span>}
          </div>
          <div className="plan-hints">
            {tool === 'measure'
              ? 'Drag to measure · Shift for a straight line · click a label to remove it'
              : 'Drag to move · R rotate · Alt for free move · arrows nudge · scroll to zoom · drag empty space to pan'}
          </div>
        </div>
        {selItem && (
          <Inspector
            key={selItem.id}
            item={selItem}
            placement={selPlacement}
            report={reports.get(selItem.id)}
            onPatch={(patch) => patchItem(selItem.id, patch)}
            onRotate={(dlt) => selPlacement && rotateTo(selItem.id, selPlacement.rotation + dlt)}
            onSetRotation={(deg) => rotateTo(selItem.id, deg)}
            onRemove={() => removeFromPlan(selItem.id)}
            onPlace={() => placeInView(selItem.id)}
            onDuplicate={() => duplicate(selItem.id)}
            onDelete={() => deleteItem(selItem.id)}
            onEdit={() => setEditor({ item: selItem })}
            onClose={() => setSelectedId(null)}
          />
        )}
      </main>
      <Tray
        items={doc.items}
        placed={placedIds}
        reports={reports}
        selectedId={selectedId}
        draggingId={press?.active ? press.itemId : null}
        onSelect={setSelectedId}
        onEdit={(id) => setEditor({ item: itemsById.get(id) ?? null })}
        onAdd={() => setEditor({ item: null })}
        onCardPointerDown={onCardPointerDown}
      />
      {dragItem && !ghost && press && (
        <div className="drag-chip" style={{ left: press.x, top: press.y }}>
          <Thumb item={dragItem} size={48} />
          <span>{dragItem.name}</span>
        </div>
      )}
      {editor && <ItemEditor initial={editor.item} onSave={saveItem} onCancel={() => setEditor(null)} />}
    </div>
  );
}
