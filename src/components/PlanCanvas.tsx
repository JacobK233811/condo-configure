import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  BARN_DOOR,
  BIFOLD_LINES,
  DIAGONAL_WALLS,
  DOORS,
  FLOOR_BOUNDS,
  GLASS_RECTS,
  OBSTACLES,
  RAILING_RECTS,
  REFERENCE_IMAGE,
  ROOMS,
  UNIT_H,
  UNIT_W,
  VIEW_BOUNDS,
  WALL_RECTS,
  ZONES,
  type Rect,
} from '../lib/floorplan';
import {
  analyzeLayout,
  itemDepth,
  localClearanceRect,
  localPath,
  normAngle,
  polysBounds,
  transformPt,
  worldPolys,
} from '../lib/geometry';
import type { Item, Layout, Placement, Pt } from '../lib/types';
import { formatDims, formatLength } from '../lib/units';
import { assetUrl } from '../lib/files';

export type Tool = 'select' | 'measure';

export interface ViewSettings {
  snap: boolean;
  showClearance: boolean;
  showPhotos: boolean;
  showReference: boolean;
  showGrid: boolean;
}

export interface Measure {
  id: string;
  a: Pt;
  b: Pt;
}

export interface CanvasHandle {
  clientToWorld(cx: number, cy: number): Pt | null;
  svg(): SVGSVGElement | null;
  zoom(factor: number): void;
  fit(): void;
  center(): Pt;
}

interface Props {
  items: Map<string, Item>;
  layout: Layout;
  selectedId: string | null;
  onSelect(id: string | null): void;
  snap(itemId: string, rotation: number, x: number, y: number, free: boolean): Pt;
  onMove(itemId: string, x: number, y: number): void;
  onRotate(itemId: string, rotation: number): void;
  tool: Tool;
  settings: ViewSettings;
  ghost: Placement | null;
  measures: Measure[];
  onAddMeasure(a: Pt, b: Pt): void;
  onRemoveMeasure(id: string): void;
  onZoomChange(pct: number): void;
}

type Interaction =
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number; moved: boolean }
  | { kind: 'move'; itemId: string; offX: number; offY: number; sx: number; sy: number; moved: boolean }
  | { kind: 'rotate'; itemId: string }
  | { kind: 'measure'; a: Pt };

interface View {
  cx: number;
  cy: number;
  s: number;
}

const MIN_S = 0.6;
const MAX_S = 24;

function luminance(hex: string) {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.replace(/./g, '$&$&') : m, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function shade(hex: string, k: number) {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.replace(/./g, '$&$&') : m, 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

const rectProps = (rc: Rect) => ({ x: rc.x, y: rc.y, width: rc.w, height: rc.h });

const polar = (p: Pt, r: number, deg: number): Pt => [
  p[0] + r * Math.cos((deg * Math.PI) / 180),
  p[1] + r * Math.sin((deg * Math.PI) / 180),
];

function StaticPlan({ showGrid }: { showGrid: boolean }) {
  return (
    <g>
      <rect x={-400} y={-400} width={UNIT_W + 800} height={UNIT_H + 800} fill="url(#grass)" />
      {ROOMS.map((rm, i) => (
        <rect key={i} {...rectProps(rm.rect)} fill={rm.floor === 'carpet' ? 'url(#carpet)' : 'url(#wood)'} />
      ))}
      {ZONES.map((z, i) => (
        <rect
          key={i}
          {...rectProps(z.rect)}
          fill={z.pattern === 'tile' ? 'url(#tile)' : z.pattern === 'laundry' ? '#e6e8ea' : 'url(#closet)'}
        />
      ))}
      {showGrid && (
        <g>
          {FLOOR_BOUNDS.map((b, i) => (
            <rect key={i} {...rectProps(b)} fill="url(#grid)" />
          ))}
        </g>
      )}
      {/* bath fixtures */}
      <g fill="#ffffff" stroke="#8d8a85" strokeWidth={0.6}>
        <ellipse cx={17} cy={280} rx={7} ry={9.5} />
        <rect x={6.5} y={318} width={6} height={22} rx={1.5} />
        <ellipse cx={20} cy={329} rx={8.5} ry={7} />
        <rect x={69.5} y={295.5} width={33.5} height={47} fill="none" strokeDasharray="1.5 1.5" />
      </g>
      {/* laundry + closet rods */}
      <rect x={97} y={211} width={27} height={25} fill="#fff" stroke="#8d8a85" strokeWidth={0.6} rx={1} />
      <g stroke="#a59d91" strokeWidth={0.6} strokeDasharray="2 1.5">
        <line x1={14} y1={156} x2={14} y2={240} />
        <line x1={104} y1={152} x2={104} y2={196} />
        <line x1={118} y1={298} x2={118} y2={348} />
      </g>
      {ZONES.map((z, i) => (
        <text
          key={i}
          x={z.rect.x + z.rect.w / 2}
          y={z.rect.y + z.rect.h / 2}
          fontSize={z.rect.w < 15 ? 5 : 6}
          fill="#7a7268"
          textAnchor="middle"
          dominantBaseline="middle"
          fontStyle="italic"
        >
          {z.name}
        </text>
      ))}
      {/* built-ins */}
      {OBSTACLES.map((o, i) => (
        <rect
          key={i}
          {...rectProps(o.rect)}
          rx={o.kind === 'island' ? 2 : 0}
          fill={o.kind === 'stairs' ? '#e2cfac' : o.kind === 'railing' || o.kind === 'pantry' ? '#a39a8e' : '#dcd7ce'}
          stroke={o.kind === 'railing' || o.kind === 'pantry' ? 'none' : '#8f877b'}
          strokeWidth={0.6}
        />
      ))}
      <g stroke="#8f877b" strokeWidth={0.5} fill="none">
        {[195.25, 202.5, 209.75].map((x) => (
          <line key={x} x1={x} y1={249} x2={x} y2={270.25} />
        ))}
        <line x1={189} y1={264} x2={215} y2={264} />
        <path d="M 211 261.75 L 215 264 L 211 266.25" />
        <line x1={187} y1={158} x2={246} y2={158} strokeDasharray="1.5 1.5" />
        <rect x={188} y={224} width={37} height={26} fill="#f4f2ee" />
        <rect x={227} y={224} width={27} height={25} strokeDasharray="1.2 1.2" />
        <rect x={258} y={226.5} width={24} height={18} rx={3} fill="#f4f2ee" />
        {[
          [293, 175],
          [304, 175],
          [293, 190],
          [304, 190],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={4.5} />
        ))}
      </g>
      <g fontSize={5} fill="#6f675c" textAnchor="middle" dominantBaseline="middle">
        <text x={206.5} y={237}>Ref.</text>
        <text x={240.5} y={236.5}>DW</text>
        <text x={216} y={167}>Island</text>
        <text x={199} y={256} fontSize={4.5}>Up</text>
      </g>
      {/* walls */}
      <g fill="#2d2a26">
        {WALL_RECTS.map((rc, i) => (
          <rect key={i} {...rectProps(rc)} />
        ))}
        {DIAGONAL_WALLS.map((poly, i) => (
          <polygon key={i} points={poly.map((p) => p.join(',')).join(' ')} />
        ))}
      </g>
      {GLASS_RECTS.map((rc, i) => (
        <g key={i}>
          <rect {...rectProps(rc)} fill="#d6ebf7" stroke="#5f7f94" strokeWidth={0.6} />
          <line x1={rc.x} y1={rc.y + rc.h / 2} x2={rc.x + rc.w} y2={rc.y + rc.h / 2} stroke="#5f7f94" strokeWidth={0.5} />
        </g>
      ))}
      {RAILING_RECTS.map((rc, i) => (
        <rect key={i} {...rectProps(rc)} fill="#7d7973" />
      ))}
      {/* doors */}
      <g fill="none" stroke="#5e574e">
        {DOORS.map((d, i) => {
          const c = polar(d.hinge, d.radius, d.closed);
          const o = polar(d.hinge, d.radius, d.open);
          const sweep = (d.open - d.closed + 720) % 360 < 180 ? 1 : 0;
          return (
            <g key={i}>
              <path d={`M ${c[0]} ${c[1]} A ${d.radius} ${d.radius} 0 0 ${sweep} ${o[0]} ${o[1]}`} strokeWidth={0.5} strokeDasharray="1.5 1" />
              <line x1={d.hinge[0]} y1={d.hinge[1]} x2={o[0]} y2={o[1]} strokeWidth={1.4} />
            </g>
          );
        })}
        {BIFOLD_LINES.map(([a, b], i) => (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={1.2} />
        ))}
      </g>
      <rect {...rectProps(BARN_DOOR)} fill="#8b6a4a" />
      <text x={134.5} y={100} fontSize={4} fill="#6f675c" transform="rotate(90 134.5 100)" textAnchor="middle">
        barn door
      </text>
      {/* room labels */}
      {ROOMS.filter((rm) => rm.name).map((rm, i) => (
        <g key={i} textAnchor="middle" fill="#6b6255" pointerEvents="none">
          <text x={rm.label[0]} y={rm.label[1]} fontSize={7.5} fontWeight={600} letterSpacing={0.2}>
            {rm.name}
          </text>
          {rm.dims && (
            <text x={rm.label[0]} y={rm.label[1] + 7.5} fontSize={5.5}>
              {rm.dims}
            </text>
          )}
        </g>
      ))}
      {/* scale bar + north arrow */}
      <g transform={`translate(6 ${UNIT_H + 14})`} fontSize={5} fill="#4b463f">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={i * 12} y={0} width={12} height={3} fill={i % 2 ? '#fff' : '#4b463f'} stroke="#4b463f" strokeWidth={0.4} />
        ))}
        <text x={0} y={10}>0</text>
        <text x={60} y={10} textAnchor="middle">
          5 ft
        </text>
      </g>
      <g transform={`translate(${UNIT_W - 4} -50)`} fill="#4b463f">
        <path d="M 0 -9 L 4 3 L 0 0 L -4 3 Z" />
        <text y={11} fontSize={6} textAnchor="middle" fontWeight={600}>
          N
        </text>
      </g>
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <pattern id="grass" width={24} height={24} patternUnits="userSpaceOnUse">
        <rect width={24} height={24} fill="#d3e5bd" />
        <path d="M3 5 l1 -2 l1 2 M15 14 l1 -2 l1 2 M8 20 l1 -2 l1 2 M20 3 l1 -2 l1 2" stroke="#b8d39c" strokeWidth={0.6} fill="none" />
      </pattern>
      <pattern id="wood" width={48} height={5} patternUnits="userSpaceOnUse">
        <rect width={48} height={5} fill="#ead4ad" />
        <line x1={0} y1={5} x2={48} y2={5} stroke="#dcc196" strokeWidth={0.5} />
        <line x1={30} y1={0} x2={30} y2={5} stroke="#dcc196" strokeWidth={0.4} />
      </pattern>
      <pattern id="carpet" width={3} height={3} patternUnits="userSpaceOnUse">
        <rect width={3} height={3} fill="#e8e3d8" />
        <circle cx={1.5} cy={1.5} r={0.35} fill="#d8d1c2" />
      </pattern>
      <pattern id="tile" width={12} height={12} patternUnits="userSpaceOnUse">
        <rect width={12} height={12} fill="#f1f3f4" />
        <path d="M0 0 L12 12 M12 0 L0 12" stroke="#d1d7db" strokeWidth={0.5} />
      </pattern>
      <pattern id="closet" width={6} height={6} patternUnits="userSpaceOnUse">
        <rect width={6} height={6} fill="#eeebe5" />
        <path d="M0 6 L6 0" stroke="#ddd6cb" strokeWidth={0.5} />
      </pattern>
      <pattern id="grid" width={12} height={12} patternUnits="userSpaceOnUse">
        <path d="M3 0 V12 M6 0 V12 M9 0 V12 M0 3 H12 M0 6 H12 M0 9 H12" stroke="#000" strokeOpacity={0.06} strokeWidth={0.2} />
        <path d="M0 0 V12 M0 0 H12" stroke="#000" strokeOpacity={0.14} strokeWidth={0.3} />
      </pattern>
      <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx={0.6} dy={1} stdDeviation={0.8} floodOpacity={0.35} />
      </filter>
      <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx={2} dy={6} stdDeviation={2.5} floodOpacity={0.35} />
      </filter>
    </defs>
  );
}

export const PlanCanvas = forwardRef<CanvasHandle, Props>(function PlanCanvas(props, ref) {
  const {
    items,
    layout,
    selectedId,
    onSelect,
    snap,
    onMove,
    onRotate,
    tool,
    settings,
    ghost,
    measures,
    onAddMeasure,
    onRemoveMeasure,
    onZoomChange,
  } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<View | null>(null);
  const inter = useRef<Interaction | null>(null);
  const [dragPos, setDragPos] = useState<{ itemId: string; x: number; y: number } | null>(null);
  const [rotPreview, setRotPreview] = useState<{ itemId: string; rotation: number } | null>(null);
  const [draft, setDraft] = useState<{ a: Pt; b: Pt } | null>(null);

  const fitView = useCallback((w: number, h: number): View => {
    const b = VIEW_BOUNDS;
    const s = Math.max(0.05, Math.min(w / b.w, h / b.h));
    return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, s };
  }, []);

  useEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      setSize({ w, h });
      setView((v) => v ?? fitView(w, h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitView]);

  const v = view ?? fitView(size.w, size.h);
  const vb = { x: v.cx - size.w / (2 * v.s), y: v.cy - size.h / (2 * v.s), w: size.w / v.s, h: size.h / v.s };

  useEffect(() => {
    onZoomChange(Math.round((v.s / fitView(size.w, size.h).s) * 100));
  }, [v.s, size.w, size.h, fitView, onZoomChange]);

  const toWorld = useCallback(
    (cx: number, cy: number): Pt => {
      const r = svgRef.current!.getBoundingClientRect();
      return [vb.x + (cx - r.left) / v.s, vb.y + (cy - r.top) / v.s];
    },
    [vb.x, vb.y, v.s],
  );

  const zoomAt = useCallback(
    (clientX: number | null, clientY: number | null, f: number) => {
      setView((cur) => {
        const c = cur ?? fitView(size.w, size.h);
        const s = Math.min(MAX_S, Math.max(MIN_S, c.s * f));
        if (clientX === null || clientY === null) return { ...c, s };
        const r = svgRef.current!.getBoundingClientRect();
        const px = c.cx + (clientX - r.left - size.w / 2) / c.s;
        const py = c.cy + (clientY - r.top - size.h / 2) / c.s;
        const k = c.s / s;
        return { cx: px - (px - c.cx) * k, cy: py - (py - c.cy) * k, s };
      });
    },
    [fitView, size.w, size.h],
  );

  useImperativeHandle(
    ref,
    () => ({
      clientToWorld(cx, cy) {
        const r = svgRef.current?.getBoundingClientRect();
        if (!r || cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
        return toWorld(cx, cy);
      },
      svg: () => svgRef.current,
      zoom: (f) => zoomAt(null, null, f),
      fit: () => setView(fitView(size.w, size.h)),
      center: () => [v.cx, v.cy],
    }),
    [toWorld, zoomAt, fitView, size.w, size.h, v.cx, v.cy],
  );

  useEffect(() => {
    const el = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 0.5 || e.deltaMode !== 0) {
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
      } else {
        setView((c) => (c ? { ...c, cx: c.cx + e.deltaX / c.s, cy: c.cy + e.deltaY / c.s } : c));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const placementOf = (id: string) => layout.placements.find((p) => p.itemId === id);

  const effective: Placement[] = useMemo(() => {
    const list = layout.placements.map((p) => {
      let q = p;
      if (dragPos?.itemId === p.itemId) q = { ...q, x: dragPos.x, y: dragPos.y };
      if (rotPreview?.itemId === p.itemId) q = { ...q, rotation: rotPreview.rotation };
      return q;
    });
    if (ghost) {
      const i = list.findIndex((p) => p.itemId === ghost.itemId);
      if (i >= 0) list[i] = ghost;
      else list.push(ghost);
    }
    return list;
  }, [layout.placements, dragPos, rotPreview, ghost]);

  const report = useMemo(() => analyzeLayout(effective, items), [effective, items]);

  // --- pointer handling ---------------------------------------------------
  const onSvgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    svgRef.current!.setPointerCapture(e.pointerId);
    if (tool === 'measure') {
      const a = toWorld(e.clientX, e.clientY);
      inter.current = { kind: 'measure', a };
      setDraft({ a, b: a });
      return;
    }
    inter.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: v.cx, cy: v.cy, moved: false };
  };

  const onPiecePointerDown = (e: React.PointerEvent, p: Placement) => {
    if (tool !== 'select') return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    svgRef.current!.setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    onSelect(p.itemId);
    inter.current = { kind: 'move', itemId: p.itemId, offX: w[0] - p.x, offY: w[1] - p.y, sx: e.clientX, sy: e.clientY, moved: false };
  };

  const onRotatePointerDown = (e: React.PointerEvent, p: Placement) => {
    e.stopPropagation();
    svgRef.current!.setPointerCapture(e.pointerId);
    inter.current = { kind: 'rotate', itemId: p.itemId };
    setRotPreview({ itemId: p.itemId, rotation: p.rotation });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const it = inter.current;
    if (!it) return;
    if (it.kind === 'pan') {
      const dx = e.clientX - it.sx;
      const dy = e.clientY - it.sy;
      if (!it.moved && Math.hypot(dx, dy) < 4) return;
      it.moved = true;
      setView((c) => (c ? { ...c, cx: it.cx - dx / c.s, cy: it.cy - dy / c.s } : c));
    } else if (it.kind === 'move') {
      if (!it.moved && Math.hypot(e.clientX - it.sx, e.clientY - it.sy) < 3) return;
      it.moved = true;
      const p = placementOf(it.itemId);
      if (!p) return;
      const w = toWorld(e.clientX, e.clientY);
      const [x, y] = snap(it.itemId, p.rotation, w[0] - it.offX, w[1] - it.offY, e.altKey || !settings.snap);
      setDragPos({ itemId: it.itemId, x, y });
    } else if (it.kind === 'rotate') {
      const p = placementOf(it.itemId);
      if (!p) return;
      const w = toWorld(e.clientX, e.clientY);
      let a = (Math.atan2(w[1] - p.y, w[0] - p.x) * 180) / Math.PI + 90;
      a = e.altKey || !settings.snap ? Math.round(a) : Math.round(a / 15) * 15;
      setRotPreview({ itemId: it.itemId, rotation: normAngle(a) });
    } else if (it.kind === 'measure') {
      let b = toWorld(e.clientX, e.clientY);
      if (e.shiftKey) {
        b = Math.abs(b[0] - it.a[0]) > Math.abs(b[1] - it.a[1]) ? [b[0], it.a[1]] : [it.a[0], b[1]];
      }
      setDraft({ a: it.a, b });
    }
  };

  const onPointerUp = () => {
    const it = inter.current;
    inter.current = null;
    if (!it) return;
    if (it.kind === 'pan' && !it.moved) onSelect(null);
    if (it.kind === 'move' && it.moved && dragPos) onMove(dragPos.itemId, dragPos.x, dragPos.y);
    if (it.kind === 'rotate' && rotPreview) onRotate(rotPreview.itemId, rotPreview.rotation);
    if (it.kind === 'measure' && draft && Math.hypot(draft.b[0] - draft.a[0], draft.b[1] - draft.a[1]) >= 1)
      onAddMeasure(draft.a, draft.b);
    setDragPos(null);
    setRotPreview(null);
    setDraft(null);
  };

  // --- render ---------------------------------------------------------------
  const ordered = [...effective].sort((a, b) => {
    const rank = (p: Placement) => {
      const it = items.get(p.itemId);
      if (p.itemId === dragPos?.itemId || p.itemId === ghost?.itemId) return 3;
      if (p.itemId === selectedId) return 2;
      return it?.category === 'rug' ? 0 : 1;
    };
    return rank(a) - rank(b);
  });

  const renderPiece = (p: Placement) => {
    const item = items.get(p.itemId);
    if (!item) return null;
    const rep = report.get(p.itemId);
    const invalid = !!rep?.invalid;
    const lifted = p.itemId === dragPos?.itemId || p.itemId === ghost?.itemId || p.itemId === rotPreview?.itemId;
    const selected = p.itemId === selectedId;
    const d = itemDepth(item);
    const polys = worldPolys(item, p);
    const bounds = polysBounds(polys);
    const isRug = item.category === 'rug';
    const clear = localClearanceRect(item);
    const dark = luminance(item.color) < 0.55;
    const fs = Math.max(3, Math.min(7, Math.min(bounds.h * 0.3, bounds.w * 0.22)));
    const lines = wrap(item.name, Math.max(4, Math.floor(bounds.w / (fs * 0.56))));
    const showDims = selected || lifted;
    const textLines = showDims ? [...lines, formatDims(item.width, d)] : lines;
    const badge = transformPt([item.width / 2 - 4, -d / 2 + 4], p);
    const handle = transformPt([0, -d / 2 - 12], p);
    const top = transformPt([0, -d / 2], p);
    return (
      <g key={p.itemId}>
        {lifted && (
          <g pointerEvents="none">
            {polys.map((poly, i) => (
              <polygon
                key={i}
                points={poly.map((q) => q.join(',')).join(' ')}
                fill={invalid ? '#e5484d' : '#30a46c'}
                fillOpacity={0.35}
                stroke={invalid ? '#e5484d' : '#30a46c'}
                strokeWidth={1}
              />
            ))}
          </g>
        )}
        <g transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`}>
          {settings.showClearance && clear && (
            <rect
              {...rectProps(clear)}
              fill={rep?.clearanceIssues.length ? '#f5a524' : '#3e8ed0'}
              fillOpacity={rep?.clearanceIssues.length ? 0.28 : 0.12}
              stroke={rep?.clearanceIssues.length ? '#d9850b' : '#3e8ed0'}
              strokeWidth={0.5}
              strokeDasharray="2 1.5"
              pointerEvents="none"
            />
          )}
          <g
            onPointerDown={(e) => onPiecePointerDown(e, p)}
            style={{ cursor: tool === 'select' ? (lifted ? 'grabbing' : 'grab') : undefined }}
            filter={isRug ? undefined : lifted ? 'url(#lift)' : 'url(#drop)'}
            transform={lifted && !rotPreview ? 'translate(0 -2.5) scale(1.03)' : undefined}
          >
            <path
              d={localPath(item)}
              fill={item.color}
              fillOpacity={isRug ? 0.55 : 1}
              stroke={invalid ? '#e5484d' : shade(item.color, 0.65)}
              strokeWidth={invalid ? 1.6 : 0.7}
            />
            {settings.showPhotos && item.image && (
              <>
                <clipPath id={`clip-${p.itemId}`}>
                  <path d={localPath(item)} />
                </clipPath>
                <g clipPath={`url(#clip-${p.itemId})`}>
                  <image
                    href={assetUrl(item.image)}
                    x={-Math.max(item.width, d) / 2}
                    y={-Math.max(item.width, d) / 2}
                    width={Math.max(item.width, d)}
                    height={Math.max(item.width, d)}
                    preserveAspectRatio="xMidYMid slice"
                    opacity={0.92}
                    transform={`rotate(${-p.rotation})`}
                  />
                </g>
              </>
            )}
            {item.shape !== 'circle' && !isRug && (
              <line
                x1={-item.width / 2 + 1.5}
                y1={d / 2 - 1.5}
                x2={item.width / 2 - 1.5}
                y2={d / 2 - 1.5}
                stroke={dark ? '#fff' : '#000'}
                strokeOpacity={0.35}
                strokeWidth={1}
              />
            )}
            {invalid && <path d={localPath(item)} fill="#e5484d" fillOpacity={0.3} />}
            {selected && !lifted && (
              <path d={localPath(item)} fill="none" stroke="#2f80ed" strokeWidth={1.4} data-export-ignore />
            )}
          </g>
        </g>
        <text
          x={p.x}
          y={p.y - ((textLines.length - 1) * fs * 1.15) / 2}
          fontSize={fs}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={settings.showPhotos && item.image ? '#fff' : dark ? '#fff' : '#2a2520'}
          stroke={settings.showPhotos && item.image ? 'rgba(0,0,0,.65)' : dark ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.6)'}
          strokeWidth={fs * 0.18}
          paintOrder="stroke"
          fontWeight={600}
          pointerEvents="none"
        >
          {textLines.map((l, i) => (
            <tspan key={i} x={p.x} dy={i === 0 ? 0 : fs * 1.15} fontWeight={i === lines.length ? 400 : 600} fontSize={i === lines.length ? fs * 0.85 : fs}>
              {l}
            </tspan>
          ))}
        </text>
        {item.image && !settings.showPhotos && bounds.w > 14 && (
          <g transform={`translate(${badge[0]} ${badge[1]})`} pointerEvents="none" data-export-ignore>
            <circle r={3} fill="#fff" stroke="#6b6255" strokeWidth={0.4} />
            <rect x={-1.6} y={-1.1} width={3.2} height={2.3} rx={0.4} fill="none" stroke="#6b6255" strokeWidth={0.4} />
            <circle r={0.6} fill="#6b6255" />
          </g>
        )}
        {selected && tool === 'select' && !dragPos && (
          <g data-export-ignore>
            <line x1={top[0]} y1={top[1]} x2={handle[0]} y2={handle[1]} stroke="#2f80ed" strokeWidth={0.6} />
            <circle
              cx={handle[0]}
              cy={handle[1]}
              r={3.4}
              fill="#fff"
              stroke="#2f80ed"
              strokeWidth={1}
              style={{ cursor: 'alias' }}
              onPointerDown={(e) => onRotatePointerDown(e, p)}
            >
              <title>Drag to rotate (15° steps, hold Alt for free)</title>
            </circle>
            {rotPreview && (
              <text x={handle[0]} y={handle[1] - 6} fontSize={5} textAnchor="middle" fill="#2f80ed" fontWeight={600}>
                {Math.round(rotPreview.rotation)}°
              </text>
            )}
          </g>
        )}
      </g>
    );
  };

  const renderMeasure = (m: { a: Pt; b: Pt }, id?: string) => {
    const len = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]);
    const mx = (m.a[0] + m.b[0]) / 2;
    const my = (m.a[1] + m.b[1]) / 2;
    const label = formatLength(len);
    const ang = Math.atan2(m.b[1] - m.a[1], m.b[0] - m.a[0]);
    const nx = -Math.sin(ang) * 2.5;
    const ny = Math.cos(ang) * 2.5;
    return (
      <g key={id ?? 'draft'}>
        <line x1={m.a[0]} y1={m.a[1]} x2={m.b[0]} y2={m.b[1]} stroke="#d6336c" strokeWidth={0.8} />
        {[m.a, m.b].map((q, i) => (
          <line key={i} x1={q[0] - nx} y1={q[1] - ny} x2={q[0] + nx} y2={q[1] + ny} stroke="#d6336c" strokeWidth={0.8} />
        ))}
        <g
          transform={`translate(${mx} ${my})`}
          style={{ cursor: id ? 'pointer' : undefined }}
          onPointerDown={(e) => {
            if (!id) return;
            e.stopPropagation();
            onRemoveMeasure(id);
          }}
        >
          {id && <title>Click to remove</title>}
          <rect x={-label.length * 1.55 - 2} y={-4} width={label.length * 3.1 + 4} height={8} rx={2} fill="#d6336c" />
          <text fontSize={5.2} fill="#fff" textAnchor="middle" dominantBaseline="central" fontWeight={600}>
            {label}
          </text>
        </g>
      </g>
    );
  };

  return (
    <div ref={wrapRef} className={`plan-wrap tool-${tool}`}>
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        data-export-viewbox={`${VIEW_BOUNDS.x} ${VIEW_BOUNDS.y} ${VIEW_BOUNDS.w} ${VIEW_BOUNDS.h}`}
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        onPointerDown={onSvgPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Defs />
        <StaticPlan showGrid={settings.showGrid} />
        {settings.showReference && (
          <image
            {...REFERENCE_IMAGE}
            href={assetUrl(REFERENCE_IMAGE.href)}
            opacity={0.5}
            style={{ mixBlendMode: 'multiply' }}
            pointerEvents="none"
            data-export-ignore
          />
        )}
        {ordered.map(renderPiece)}
        {measures.map((m) => renderMeasure(m, m.id))}
        {draft && renderMeasure(draft)}
      </svg>
    </div>
  );
});
