import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMeta, readGist, saveMeta, SyncError, type Remote, type SyncMeta, whoAmI, findGist, writeGist } from './sync';
import type { Doc } from './types';

export type SyncStatus = 'off' | 'idle' | 'saving' | 'synced' | 'error' | 'conflict';

export interface Conflict extends Remote {
  doc: Doc;
  reason: 'connect' | 'diverged';
}

const PUSH_DELAY = 2000;

/**
 * Keeps the document in a private GitHub gist. Local changes push after a short
 * pause; the gist is re-read on load and whenever the tab regains focus. If both
 * sides changed, the user picks which version to keep.
 */
export function useSync(doc: Doc, replaceDoc: (d: Doc) => void) {
  const [meta, setMetaState] = useState<SyncMeta>(loadMeta);
  const metaRef = useRef(meta);
  const [status, setStatus] = useState<SyncStatus>(meta.token && meta.gistId ? 'idle' : 'off');
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const seenDoc = useRef(doc);
  const busy = useRef(false);
  const askedPersist = useRef(false);

  const setMeta = useCallback((patch: Partial<SyncMeta>) => {
    const next = { ...metaRef.current, ...patch };
    metaRef.current = next;
    saveMeta(next);
    setMetaState(next);
  }, []);

  const fail = useCallback((e: unknown) => {
    setError(e instanceof SyncError ? e.message : 'Sync failed.');
    setStatus('error');
  }, []);

  const adopt = useCallback(
    (r: Remote & { doc: Doc }) => {
      seenDoc.current = r.doc;
      replaceDoc(r.doc);
      setMeta({ gistId: r.id, gistUrl: r.url, remoteUpdatedAt: r.updatedAt, lastSyncedAt: Date.now(), dirty: false });
      setConflict(null);
      setError(null);
      setStatus('synced');
    },
    [replaceDoc, setMeta],
  );

  const pushRef = useRef<() => Promise<void>>(async () => {});
  const push = useCallback(async () => {
    const m = metaRef.current;
    if (!m.token || !m.gistId) return;
    if (busy.current) {
      setTimeout(() => pushRef.current(), 500);
      return;
    }
    busy.current = true;
    setStatus('saving');
    try {
      const remote = await readGist(m.token, m.gistId);
      if (remote.updatedAt !== m.remoteUpdatedAt) {
        setConflict({ ...remote, reason: 'diverged' });
        setStatus('conflict');
        return;
      }
      const sent = docRef.current;
      const r = await writeGist(m.token, m.gistId, sent);
      const now = Date.now();
      const stillDirty = docRef.current !== sent;
      setMeta({ remoteUpdatedAt: r.updatedAt, gistUrl: r.url, lastSyncedAt: now, lastBackupAt: now, dirty: stillDirty });
      setError(null);
      setStatus('synced');
      if (stillDirty) setTimeout(() => pushRef.current(), PUSH_DELAY);
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
    }
  }, [setMeta, fail]);
  pushRef.current = push;

  const pull = useCallback(async () => {
    const m = metaRef.current;
    if (!m.token || !m.gistId || busy.current || conflict) return;
    busy.current = true;
    setStatus('saving');
    let pushAfter = false;
    try {
      const r = await readGist(m.token, m.gistId);
      if (r.updatedAt === m.remoteUpdatedAt) {
        pushAfter = !!m.dirty;
        setError(null);
        setStatus('synced');
      } else if (!m.dirty) {
        adopt(r);
      } else {
        setConflict({ ...r, reason: 'diverged' });
        setStatus('conflict');
      }
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
    }
    if (pushAfter) await pushRef.current();
  }, [adopt, fail, conflict]);

  const connect = useCallback(
    async (token: string) => {
      setStatus('saving');
      setError(null);
      try {
        const login = await whoAmI(token);
        const found = await findGist(token);
        setMeta({ token, login });
        if (found) {
          const r = await readGist(token, found.id);
          setMeta({ gistId: r.id, gistUrl: r.url });
          if (JSON.stringify(r.doc) === JSON.stringify(docRef.current)) adopt(r);
          else {
            setConflict({ ...r, reason: 'connect' });
            setStatus('conflict');
          }
        } else {
          const r = await writeGist(token, undefined, docRef.current);
          const now = Date.now();
          setMeta({ gistId: r.id, gistUrl: r.url, remoteUpdatedAt: r.updatedAt, lastSyncedAt: now, lastBackupAt: now, dirty: false });
          setStatus('synced');
        }
      } catch (e) {
        fail(e);
        if (!metaRef.current.gistId) setMeta({ token: undefined, login: undefined });
      }
    },
    [adopt, fail, setMeta],
  );

  const resolve = useCallback(
    (keep: 'local' | 'remote') => {
      if (!conflict) return;
      if (keep === 'remote') adopt(conflict);
      else {
        setMeta({ gistId: conflict.id, gistUrl: conflict.url, remoteUpdatedAt: conflict.updatedAt, dirty: true });
        setConflict(null);
        void pushRef.current();
      }
    },
    [conflict, adopt, setMeta],
  );

  const disconnect = useCallback(() => {
    setMeta({ token: undefined, login: undefined, gistId: undefined, gistUrl: undefined, remoteUpdatedAt: undefined, lastSyncedAt: undefined });
    setConflict(null);
    setError(null);
    setStatus('off');
  }, [setMeta]);

  const markBackedUp = useCallback(() => setMeta({ lastBackupAt: Date.now() }), [setMeta]);

  const requestPersist = useCallback(async () => {
    askedPersist.current = true;
    const ok = (await navigator.storage?.persist?.()) ?? false;
    setPersisted(ok);
    return ok;
  }, []);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  // Local edits: mark dirty, ask the browser to keep our storage, and schedule a push.
  useEffect(() => {
    if (doc === seenDoc.current) return;
    seenDoc.current = doc;
    setMeta({ dirty: true, lastChangeAt: Date.now() });
    if (persisted === false && !askedPersist.current) void requestPersist();
    if (!metaRef.current.token || !metaRef.current.gistId) return;
    const t = setTimeout(() => pushRef.current(), PUSH_DELAY);
    return () => clearTimeout(t);
  }, [doc, persisted, requestPersist, setMeta]);

  useEffect(() => {
    if (!metaRef.current.token || !metaRef.current.gistId) return;
    void pull();
    const onVis = () => document.visibilityState === 'visible' && void pull();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.gistId]);

  return {
    meta,
    status,
    error,
    conflict,
    persisted,
    connected: !!(meta.token && meta.gistId),
    connect,
    disconnect,
    syncNow: push,
    resolve,
    markBackedUp,
    requestPersist,
  };
}

export type Sync = ReturnType<typeof useSync>;

export function ago(ts?: number) {
  if (!ts) return 'never';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}
