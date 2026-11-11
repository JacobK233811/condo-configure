import type { Doc } from './types';
import { isDoc } from './store';

const META_KEY = 'condo-configure:sync';
export const GIST_FILE = 'condo-configure.json';
const API = 'https://api.github.com';

export interface SyncMeta {
  token?: string;
  login?: string;
  gistId?: string;
  gistUrl?: string;
  /** Gist `updated_at` as of our last pull/push; a different value means another device saved. */
  remoteUpdatedAt?: string;
  lastSyncedAt?: number;
  lastBackupAt?: number;
  lastChangeAt?: number;
  /** Local changes not yet pushed to the gist. */
  dirty?: boolean;
}

export function loadMeta(): SyncMeta {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as SyncMeta;
  } catch {
    return {};
  }
}

export function saveMeta(m: SyncMeta) {
  localStorage.setItem(META_KEY, JSON.stringify(m));
}

export class SyncError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new SyncError("Can't reach GitHub. Check your connection.");
  }
  if (!res.ok) {
    const msg =
      res.status === 401
        ? 'GitHub rejected the token. It may be expired or revoked.'
        : res.status === 403 || res.status === 404
          ? "The token can't access gists. Give it the Gists (read and write) permission."
          : `GitHub error ${res.status}.`;
    throw new SyncError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

interface GistFile {
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}
interface Gist {
  id: string;
  html_url: string;
  updated_at: string;
  files: Record<string, GistFile>;
}

export interface Remote {
  id: string;
  url: string;
  updatedAt: string;
}

export async function whoAmI(token: string) {
  return (await gh<{ login: string }>(token, '/user')).login;
}

export async function findGist(token: string): Promise<Remote | null> {
  for (let page = 1; page <= 5; page++) {
    const list = await gh<Gist[]>(token, `/gists?per_page=100&page=${page}`);
    const g = list.find((x) => x.files[GIST_FILE]);
    if (g) return { id: g.id, url: g.html_url, updatedAt: g.updated_at };
    if (list.length < 100) break;
  }
  return null;
}

export async function readGist(token: string, id: string): Promise<Remote & { doc: Doc }> {
  let g: Gist;
  try {
    g = await gh<Gist>(token, `/gists/${id}`);
  } catch (e) {
    if (e instanceof SyncError && e.status === 404)
      throw new SyncError('The synced gist is gone. Disconnect, then connect again to create a new one.', 404);
    throw e;
  }
  const f = g.files[GIST_FILE];
  if (!f) throw new SyncError(`The gist no longer has ${GIST_FILE}.`, 404);
  let text = f.content ?? '';
  if (f.truncated && f.raw_url) {
    const r = await fetch(f.raw_url, { cache: 'no-store' });
    if (!r.ok) throw new SyncError(`Couldn't download the gist (${r.status}).`, r.status);
    text = await r.text();
  }
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    doc = null;
  }
  if (!isDoc(doc)) throw new SyncError("The gist's contents aren't a Condo Configure save.");
  return { id: g.id, url: g.html_url, updatedAt: g.updated_at, doc };
}

export async function writeGist(token: string, id: string | undefined, doc: Doc): Promise<Remote> {
  const body = JSON.stringify({
    description: 'Condo Configure furniture layouts (synced by the app)',
    ...(id ? {} : { public: false }),
    files: { [GIST_FILE]: { content: JSON.stringify(doc) } },
  });
  const g = await gh<Gist>(token, id ? `/gists/${id}` : '/gists', { method: id ? 'PATCH' : 'POST', body });
  return { id: g.id, url: g.html_url, updatedAt: g.updated_at };
}
