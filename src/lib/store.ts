import { useCallback, useEffect, useRef, useState } from 'react';
import { seedDoc } from './seed';
import type { Doc } from './types';

const KEY = 'condo-configure:v1';
const MAX_HISTORY = 100;

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isDoc(x: unknown): x is Doc {
  const d = x as Doc;
  return (
    !!d &&
    d.version === 1 &&
    Array.isArray(d.items) &&
    Array.isArray(d.layouts) &&
    d.layouts.length > 0 &&
    typeof d.activeLayoutId === 'string'
  );
}

function load(): Doc {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (isDoc(d)) return d;
    }
  } catch {
    /* fall through to the sample data */
  }
  return seedDoc();
}

interface History {
  past: Doc[];
  present: Doc;
  future: Doc[];
}

/** Document state with undo/redo, saved to localStorage on every change. */
export function useDocStore() {
  const [hist, setHist] = useState<History>(() => ({ past: [], present: load(), future: [] }));
  const [saveError, setSaveError] = useState<string | null>(null);
  const first = useRef(true);

  const apply = useCallback((fn: (d: Doc) => Doc) => {
    setHist((h) => {
      const next = fn(h.present);
      if (next === h.present) return h;
      return { past: [...h.past, h.present].slice(-MAX_HISTORY), present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHist((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
        : h,
    );
  }, []);

  const redo = useCallback(() => {
    setHist((h) =>
      h.future.length
        ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
        : h,
    );
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(hist.present));
      setSaveError(null);
    } catch {
      setSaveError('Browser storage is full, so recent changes are not saved. Remove some photos or export a backup.');
    }
  }, [hist.present]);

  return {
    doc: hist.present,
    apply,
    undo,
    redo,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    saveError,
  };
}
