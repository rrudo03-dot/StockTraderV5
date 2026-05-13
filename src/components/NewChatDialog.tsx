import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Profile } from '../types';
import { createGroup, searchProfiles, startDm } from '../lib/messaging';
import { Avatar } from './Avatar';
import { profileLabel } from '../lib/format';

type Mode = 'dm' | 'group';

type Props = {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  onCreated: (conversationId: string) => void;
};

export function NewChatDialog({ open, onClose, currentUserId, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>('dm');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode('dm');
      setQuery('');
      setResults([]);
      setSelected([]);
      setTitle('');
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const found = await searchProfiles(query, [currentUserId]);
        setResults(found);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open, currentUserId]);

  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);

  function toggleSelect(p: Profile) {
    if (mode === 'dm') {
      setSelected([p]);
    } else {
      setSelected((cur) =>
        cur.some((x) => x.id === p.id) ? cur.filter((x) => x.id !== p.id) : [...cur, p],
      );
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'dm') {
        if (selected.length !== 1) throw new Error('Pick someone to message.');
        const id = await startDm(selected[0].id);
        onCreated(id);
      } else {
        const t = title.trim();
        if (!t) throw new Error('Give the group a name.');
        if (selected.length === 0) throw new Error('Add at least one other member.');
        const id = await createGroup(
          t,
          selected.map((p) => p.id),
        );
        onCreated(id);
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create conversation.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">New conversation</h2>
          <button onClick={onClose} className="text-muted hover:text-zinc-200" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex border-b border-border">
          <TabButton active={mode === 'dm'} onClick={() => { setMode('dm'); setSelected([]); }}>
            Direct message
          </TabButton>
          <TabButton active={mode === 'group'} onClick={() => { setMode('group'); }}>
            Group chat
          </TabButton>
        </div>

        <div className="space-y-3 p-4">
          {mode === 'group' && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Group name (e.g. AI Stocks 2026)"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-zinc-600 focus:ring-2"
            />
          )}

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleSelect(p)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-bg py-1 pl-1 pr-2 text-xs hover:bg-zinc-900"
                >
                  <Avatar profile={p} size="sm" />
                  <span>{profileLabel(p)}</span>
                  <span className="text-muted">✕</span>
                </button>
              ))}
            </div>
          )}

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name…"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-zinc-600 focus:ring-2"
            autoFocus
          />

          <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-bg">
            {searching && <p className="px-3 py-2 text-xs text-muted">Searching…</p>}
            {!searching && query && results.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted">No matches.</p>
            )}
            {!query && (
              <p className="px-3 py-2 text-xs text-muted">
                Start typing to find {mode === 'dm' ? 'someone to message' : 'people to add'}.
              </p>
            )}
            <ul>
              {results.map((p) => {
                const picked = selectedIds.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => toggleSelect(p)}
                      className={clsx(
                        'flex w-full items-center gap-3 border-t border-border px-3 py-2 text-left text-sm hover:bg-zinc-900',
                        picked && 'bg-emerald-950/30',
                      )}
                    >
                      <Avatar profile={p} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{profileLabel(p)}</p>
                        <p className="truncate text-xs text-muted">@{p.username}</p>
                      </div>
                      {picked && <span className="text-accent">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {error && (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || (mode === 'dm' ? selected.length !== 1 : selected.length === 0 || !title.trim())}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Creating…' : mode === 'dm' ? 'Start chat' : 'Create group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 px-4 py-2.5 text-sm font-medium transition',
        active ? 'border-b-2 border-accent text-zinc-100' : 'text-muted hover:text-zinc-200',
      )}
    >
      {children}
    </button>
  );
}
