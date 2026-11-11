import { assetUrl } from '../lib/files';
import { itemDepth, type PieceReport } from '../lib/geometry';
import { CATEGORY_LABEL, STATUS_LABEL, type Item, type Placement, type Status } from '../lib/types';
import { formatLength } from '../lib/units';
import { LengthInput } from './Controls';
import { IconCopy, IconEdit, IconReturn, IconRotateCcw, IconRotateCw, IconTrash, IconX } from './Icons';
import { Thumb } from './Thumb';

interface Props {
  item: Item;
  placement?: Placement;
  report?: PieceReport;
  onPatch(patch: Partial<Item>): void;
  onRotate(delta: number): void;
  onSetRotation(deg: number): void;
  onRemove(): void;
  onPlace(): void;
  onDuplicate(): void;
  onDelete(): void;
  onEdit(): void;
  onClose(): void;
}

export function Inspector(p: Props) {
  const { item, placement, report } = p;
  const d = itemDepth(item);
  return (
    <aside className="inspector" aria-label="Selected piece">
      <div className="insp-head">
        <h3>{item.name}</h3>
        <button type="button" className="icon-btn" onClick={p.onClose} aria-label="Close">
          <IconX size={16} />
        </button>
      </div>
      <div className="insp-photo">
        {item.image ? <img src={assetUrl(item.image)} alt={item.name} /> : <Thumb item={item} size={140} />}
      </div>
      <div className="insp-tags">
        <span className="tag">{CATEGORY_LABEL[item.category]}</span>
        <select
          className={`tag status s-${item.status}`}
          value={item.status}
          onChange={(e) => p.onPatch({ status: e.target.value as Status })}
          aria-label="Status"
        >
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {item.estimated && <span className="tag est-tag">Size estimated</span>}
      </div>

      {placement && report && (report.issues.length > 0 || report.clearanceIssues.length > 0) && (
        <ul className="insp-issues">
          {report.issues.map((s) => (
            <li key={s} className="bad">{s}</li>
          ))}
          {report.clearanceIssues.map((s) => (
            <li key={s} className="warn">{s}</li>
          ))}
        </ul>
      )}
      {placement && report && report.issues.length === 0 && report.clearanceIssues.length === 0 && (
        <div className="insp-ok">Fits here</div>
      )}

      <div className="insp-section">
        <div className="insp-label">Size</div>
        <div className="insp-grid">
          <label>
            {item.shape === 'circle' ? 'Diameter' : 'Width'}
            <LengthInput value={item.width} onChange={(v) => p.onPatch(item.shape === 'circle' ? { width: v, depth: v } : { width: v })} />
          </label>
          {item.shape !== 'circle' && (
            <label>
              Depth
              <LengthInput value={d} onChange={(v) => p.onPatch({ depth: v })} />
            </label>
          )}
          <label>
            Front clearance
            <LengthInput value={item.clearanceFront} allowZero onChange={(v) => p.onPatch({ clearanceFront: v })} />
          </label>
          {item.height ? (
            <div className="insp-static">
              Height
              <span>{formatLength(item.height)}</span>
            </div>
          ) : null}
        </div>
        {item.estimated && (
          <button type="button" className="link-btn" onClick={() => p.onPatch({ estimated: false })}>
            Mark as measured
          </button>
        )}
      </div>

      {placement ? (
        <div className="insp-section">
          <div className="insp-label">On the plan</div>
          <div className="insp-row">
            <button type="button" className="btn" onClick={() => p.onRotate(-90)} title="Rotate left (Shift+R)">
              <IconRotateCcw size={16} /> 90°
            </button>
            <button type="button" className="btn" onClick={() => p.onRotate(90)} title="Rotate right (R)">
              <IconRotateCw size={16} /> 90°
            </button>
            <label className="deg">
              <input
                type="number"
                value={Math.round(placement.rotation)}
                onChange={(e) => p.onSetRotation(Number(e.target.value) || 0)}
                aria-label="Rotation in degrees"
              />
              °
            </label>
          </div>
          <div className="insp-row">
            <button type="button" className="btn" onClick={p.onRemove} title="Back to inventory (Delete)">
              <IconReturn size={16} /> Back to inventory
            </button>
          </div>
        </div>
      ) : (
        <div className="insp-section">
          <button type="button" className="btn primary wide" onClick={p.onPlace}>
            Place on plan
          </button>
          <p className="muted">Or drag its card from the inventory onto the plan.</p>
        </div>
      )}

      {item.notes && <p className="insp-notes">{item.notes}</p>}

      <div className="insp-actions">
        <button type="button" className="btn" onClick={p.onEdit}>
          <IconEdit size={16} /> Edit
        </button>
        <button type="button" className="btn" onClick={p.onDuplicate} title="Duplicate (Ctrl+D)">
          <IconCopy size={16} /> Duplicate
        </button>
        <button type="button" className="btn danger" onClick={p.onDelete}>
          <IconTrash size={16} /> Delete
        </button>
      </div>
    </aside>
  );
}
