import { useEffect, useState } from 'react';
import { ago, type Sync } from '../lib/useSync';
import { IconCheck, IconDownload, IconX } from './Icons';

interface Props {
  sync: Sync;
  onExportJson(): void;
  onImportJson(): void;
  onClose(): void;
}

const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

function kb(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function StorageDialog({ sync, onExportJson, onImportJson, onClose }: Props) {
  const { meta, status, error, conflict, persisted, connected } = sync;
  const [token, setToken] = useState('');
  const [usage, setUsage] = useState<number | null>(null);

  useEffect(() => {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith('condo-configure')) n += (localStorage.getItem(k)?.length ?? 0) * 2;
    }
    setUsage(n);
  }, [sync.meta]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const busy = status === 'saving';

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal storage" role="dialog" aria-label="Saving and sync">
        <div className="modal-head">
          <h2>Saving & sync</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
        <div className="modal-body">
          {conflict && (
            <section className="st-conflict">
              <strong>{conflict.reason === 'connect' ? 'Your GitHub account already has saved layouts' : 'Layouts were changed on another device'}</strong>
              <p>
                GitHub copy: saved {ago(Date.parse(conflict.updatedAt))}, {conflict.doc.items.length} pieces, {conflict.doc.layouts.length} layout
                {conflict.doc.layouts.length > 1 ? 's' : ''}. This browser: {meta.dirty ? 'has unsynced changes' : 'unchanged'}. Which do you want to keep?
              </p>
              <div className="st-row">
                <button type="button" className="btn primary" onClick={() => sync.resolve('remote')}>
                  Use the GitHub copy
                </button>
                <button type="button" className="btn" onClick={() => sync.resolve('local')}>
                  Keep this browser's version
                </button>
              </div>
              <p className="muted">
                The other version is overwritten.{' '}
                <button type="button" className="link-btn" onClick={onExportJson}>
                  Download this browser's version first
                </button>
              </p>
            </section>
          )}

          <section className="st-section">
            <h3>This browser</h3>
            <p>Every change saves automatically here{usage !== null && <> ({kb(usage)} used)</>}.</p>
            {persisted === true ? (
              <p className="st-ok">
                <IconCheck size={14} /> Protected: the browser won't clear it on its own.
              </p>
            ) : (
              <div className="st-warn">
                <span>
                  The browser may clear this data when space runs low, and Safari can clear it after 7 days without a visit. Clearing site data or a
                  private window also removes it.
                </span>
                {persisted === false && (
                  <button type="button" className="btn small" onClick={() => void sync.requestPersist()}>
                    Ask browser to keep it
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="st-section">
            <h3>Backup file</h3>
            <p>
              Last backup: <strong>{ago(meta.lastBackupAt)}</strong>
              {connected && ' (GitHub sync counts)'}. A backup file restores everything, including photos, in any browser.
            </p>
            <div className="st-row">
              <button type="button" className="btn" onClick={onExportJson}>
                <IconDownload size={14} /> Download backup
              </button>
              <button type="button" className="btn" onClick={onImportJson}>
                Restore from backup…
              </button>
            </div>
          </section>

          <section className="st-section">
            <h3>Sync with GitHub</h3>
            {connected ? (
              <>
                <p>
                  Saving to a{' '}
                  <a href={meta.gistUrl} target="_blank" rel="noreferrer">
                    private gist
                  </a>{' '}
                  as <strong>@{meta.login}</strong>. Last synced <strong>{ago(meta.lastSyncedAt)}</strong>
                  {busy && ' · syncing…'}. Open this app on another device and connect the same account to get the same layouts.
                </p>
                <div className="st-row">
                  <button type="button" className="btn" disabled={busy || !!conflict} onClick={() => void sync.syncNow()}>
                    Sync now
                  </button>
                  <button type="button" className="btn danger" onClick={() => confirm('Stop syncing? The gist stays on GitHub.') && sync.disconnect()}>
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>Keeps your inventory, photos and layouts in a private gist on your GitHub account, so they survive cleared storage and follow you between devices. Each save is kept in the gist's history.</p>
                <ol className="st-steps">
                  <li>
                    <a href={TOKEN_URL} target="_blank" rel="noreferrer">
                      Create a fine-grained token
                    </a>
                    . Under <em>Account permissions</em>, set <strong>Gists</strong> to <strong>Read and write</strong>. Nothing else is needed.
                  </li>
                  <li>Paste it here. It's stored only in this browser.</li>
                </ol>
                <form
                  className="st-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (token.trim()) void sync.connect(token.trim());
                  }}
                >
                  <input
                    className="st-token"
                    type="password"
                    autoComplete="off"
                    placeholder="github_pat_…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    aria-label="GitHub token"
                  />
                  <button type="submit" className="btn primary" disabled={busy || !token.trim()}>
                    {busy ? 'Connecting…' : 'Connect'}
                  </button>
                </form>
              </>
            )}
            {error && <p className="form-error">{error}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
