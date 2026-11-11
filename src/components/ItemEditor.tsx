import { useEffect, useRef, useState } from 'react';
import { CATALOG, SWATCHES } from '../lib/catalog';
import { assetUrl, imageFileToDataUrl } from '../lib/files';
import { uid } from '../lib/store';
import { CATEGORY_LABEL, STATUS_LABEL, type Category, type Item, type Shape, type Status } from '../lib/types';
import { LengthInput } from './Controls';
import { IconImage, IconX } from './Icons';
import { Thumb } from './Thumb';

const blank = (): Item => ({
  id: uid('item'),
  name: '',
  category: 'other',
  shape: 'rect',
  width: 36,
  depth: 18,
  color: SWATCHES[0],
  status: 'in-condo',
  estimated: true,
  clearanceFront: 0,
  createdAt: Date.now(),
});

export function ItemEditor({ initial, onSave, onCancel }: { initial: Item | null; onSave(item: Item): void; onCancel(): void }) {
  const [it, setIt] = useState<Item>(() => initial ?? blank());
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !initial;
  const set = (patch: Partial<Item>) => setIt((x) => ({ ...x, ...patch }));

  const takeFile = async (f: File | undefined | null) => {
    if (!f || !f.type.startsWith('image/')) return;
    try {
      set({ image: await imageFileToDataUrl(f) });
    } catch {
      setErr('Could not read that image.');
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'));
      if (f) takeFile(f);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    if (!it.name.trim()) {
      setErr('Give the piece a name.');
      return;
    }
    const out: Item = { ...it, name: it.name.trim() };
    if (out.shape === 'circle') out.depth = out.width;
    if (out.shape !== 'L') {
      delete out.legWidth;
      delete out.legDepth;
    }
    onSave(out);
  };

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="dialog" aria-modal aria-label={isNew ? 'Add furniture' : 'Edit furniture'}>
        <div className="modal-head">
          <h2>{isNew ? 'Add furniture' : `Edit ${initial?.name}`}</h2>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
        <div className="modal-body">
          {isNew && (
            <label className="field full">
              <span>Start from a template (optional)</span>
              <select
                value=""
                onChange={(e) => {
                  const t = CATALOG[Number(e.target.value)];
                  if (!t) return;
                  set({ ...t, estimated: false, status: 'considering' });
                }}
              >
                <option value="">Choose a common piece…</option>
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => {
                  const list = CATALOG.map((t, i) => ({ t, i })).filter((x) => x.t.category === c);
                  if (!list.length) return null;
                  return (
                    <optgroup key={c} label={CATEGORY_LABEL[c]}>
                      {list.map(({ t, i }) => (
                        <option key={i} value={i}>
                          {t.name} — {t.shape === 'circle' ? `${t.width}" round` : `${t.width}" × ${t.depth}"`}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
          )}

          <div className="editor-grid">
            <div
              className="photo-drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                takeFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              {it.image ? <img src={assetUrl(it.image)} alt="" /> : <Thumb item={it} size={110} />}
              <span className="photo-cta">
                <IconImage size={14} /> {it.image ? 'Replace photo' : 'Add photo'}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  takeFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="editor-fields">
              {it.image && (
                <button type="button" className="link-btn" onClick={() => set({ image: undefined })}>
                  Remove photo
                </button>
              )}
              <label className="field full">
                <span>Name</span>
                <input autoFocus value={it.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Blue velvet sofa" />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Category</span>
                  <select value={it.category} onChange={(e) => set({ category: e.target.value as Category })}>
                    {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Status</span>
                  <select value={it.status} onChange={(e) => set({ status: e.target.value as Status })}>
                    {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="field full">
            <span>Shape</span>
            <div className="seg light">
              {(
                [
                  ['rect', 'Rectangle'],
                  ['circle', 'Round'],
                  ['L', 'L-shape'],
                ] as [Shape, string][]
              ).map(([s, l]) => (
                <button key={s} type="button" className={it.shape === s ? 'on' : ''} onClick={() => set({ shape: s })}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <label className="field">
              <span>{it.shape === 'circle' ? 'Diameter' : 'Width (side to side)'}</span>
              <LengthInput value={it.width} onChange={(v) => set({ width: v })} />
            </label>
            {it.shape !== 'circle' && (
              <label className="field">
                <span>Depth (front to back)</span>
                <LengthInput value={it.depth} onChange={(v) => set({ depth: v })} />
              </label>
            )}
            <label className="field">
              <span>Height (optional)</span>
              <LengthInput value={it.height ?? 0} allowZero onChange={(v) => set({ height: v || undefined })} />
            </label>
          </div>
          {it.shape === 'L' && (
            <div className="field-row">
              <label className="field">
                <span>Left arm width</span>
                <LengthInput value={it.legWidth ?? Math.round(it.width / 3)} onChange={(v) => set({ legWidth: v })} />
              </label>
              <label className="field">
                <span>Front arm depth</span>
                <LengthInput value={it.legDepth ?? Math.round(it.depth / 3)} onChange={(v) => set({ legDepth: v })} />
              </label>
            </div>
          )}
          <div className="field-row">
            <label className="field">
              <span>Front clearance</span>
              <LengthInput value={it.clearanceFront} allowZero onChange={(v) => set({ clearanceFront: v })} />
              <small>Room to open drawers or doors, or pull out a chair. 0 for none.</small>
            </label>
            <label className="field check">
              <input type="checkbox" checked={it.estimated} onChange={(e) => set({ estimated: e.target.checked })} />
              <span>Size is an estimate</span>
            </label>
          </div>
          <small className="muted">Type sizes as 64, 64", 5'4", 5 ft 4 in or 160cm.</small>

          <div className="field full">
            <span>Colour on the plan</span>
            <div className="swatches">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch ${it.color === c ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => set({ color: c })}
                  aria-label={`Colour ${c}`}
                />
              ))}
              <input type="color" value={it.color} onChange={(e) => set({ color: e.target.value })} aria-label="Custom colour" />
            </div>
          </div>

          <label className="field full">
            <span>Notes</span>
            <textarea rows={2} value={it.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} />
          </label>
          {err && <div className="form-error">{err}</div>}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={save}>
            {isNew ? 'Add to inventory' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
