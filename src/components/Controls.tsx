import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatLength, parseLength } from '../lib/units';

/** Text field for lengths: accepts 64, 64", 5'4", 5 ft 4 in, 160cm. */
export function LengthInput({
  value,
  onChange,
  allowZero,
  ariaLabel,
  id,
}: {
  value: number;
  onChange(v: number): void;
  allowZero?: boolean;
  ariaLabel?: string;
  id?: string;
}) {
  const fmt = (v: number) => (allowZero && v === 0 ? '0' : `${v}"`);
  const [text, setText] = useState(fmt(value));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(fmt(value));
    setBad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const commit = () => {
    const t = text.trim();
    const v = allowZero && t === '' ? 0 : parseLength(t, allowZero);
    if (v === null) {
      setBad(true);
      return;
    }
    setBad(false);
    if (v !== value) onChange(v);
    else setText(fmt(value));
  };
  return (
    <span className={`length-input ${bad ? 'bad' : ''}`}>
      <input
        id={id}
        aria-label={ariaLabel}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'Escape') {
            setText(fmt(value));
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <span className="length-hint">{value >= 12 ? formatLength(value) : ''}</span>
    </span>
  );
}

export function Dropdown({
  label,
  children,
  align = 'left',
  title,
  className = '',
}: {
  label: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className={`btn ${className} ${open ? 'pressed' : ''}`} title={title} onClick={() => setOpen((o) => !o)}>
        {label}
      </button>
      {open && <div className={`dropdown-panel ${align}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, children }: { checked: boolean; onChange(v: boolean): void; children: ReactNode }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-switch" />
      <span>{children}</span>
    </label>
  );
}
