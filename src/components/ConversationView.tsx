import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import type { ConversationWithMeta, Message, Profile } from '../types';
import { supabase } from '../lib/supabase';
import {
  fetchMessages,
  leaveConversation,
  markConversationRead,
  sendMessage,
} from '../lib/messaging';
import { Avatar, GroupAvatar } from './Avatar';
import {
  conversationSubtitle,
  conversationTitle,
  messageTimestamp,
  profileLabel,
} from '../lib/format';

type Props = {
  conversation: ConversationWithMeta;
  meId: string;
  onLeft: () => void;
};

export function ConversationView({ conversation, meId, onLeft }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const profilesById = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const m of conversation.members) map.set(m.id, m);
    return map;
  }, [conversation.members]);

  // Initial load + mark read
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMessages(conversation.id)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load messages.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    markConversationRead(conversation.id).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

  // Realtime subscription for new / changed messages in this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((cur) => (cur.some((m) => m.id === incoming.id) ? cur : [...cur, incoming]));
          if (incoming.sender_id !== meId) {
            markConversationRead(conversation.id).catch(() => {});
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, meId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    setDraft('');
    try {
      await sendMessage(conversation.id, meId, body);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e as unknown as FormEvent);
    }
  }

  async function handleLeave() {
    if (!confirm('Leave this conversation?')) return;
    try {
      await leaveConversation(conversation.id, meId);
      onLeft();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not leave.');
    }
  }

  const title = conversationTitle(conversation, meId);
  const subtitle = conversationSubtitle(conversation, meId);
  const visibleMessages = messages.filter((m) => !m.deleted_at);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-3">
        <div className="flex items-center gap-3">
          {conversation.kind === 'group' ? (
            <GroupAvatar members={conversation.members} />
          ) : (
            <Avatar profile={conversation.members.find((m) => m.id !== meId) ?? conversation.members[0]} />
          )}
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={handleLeave}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-zinc-900 hover:text-red-300"
        >
          {conversation.kind === 'group' ? 'Leave group' : 'Hide'}
        </button>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-xs text-muted">Loading messages…</p>
        ) : visibleMessages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-muted">
            <div>
              <p className="mb-1 font-semibold text-zinc-300">Say hi 👋</p>
              <p className="text-xs">No messages yet — start the conversation.</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleMessages.map((m, idx) => {
              const sender = profilesById.get(m.sender_id);
              const mine = m.sender_id === meId;
              const prev = visibleMessages[idx - 1];
              const grouped =
                prev &&
                prev.sender_id === m.sender_id &&
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
              return (
                <li key={m.id} className={clsx('flex gap-3', mine && 'flex-row-reverse')}>
                  <div className="w-9 shrink-0">
                    {!grouped && <Avatar profile={sender} size="md" />}
                  </div>
                  <div className={clsx('max-w-[70%]', mine && 'items-end text-right')}>
                    {!grouped && (
                      <p className={clsx('mb-1 text-xs text-muted', mine && 'text-right')}>
                        {sender ? profileLabel(sender) : 'Unknown'} ·{' '}
                        <span>{messageTimestamp(m.created_at)}</span>
                      </p>
                    )}
                    <div
                      className={clsx(
                        'inline-block whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm',
                        mine
                          ? 'rounded-br-sm bg-accent text-black'
                          : 'rounded-bl-sm bg-zinc-800 text-zinc-100',
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <p className="mx-4 mb-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="border-t border-border bg-panel p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Message ${title}…`}
            rows={1}
            className="max-h-40 min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-zinc-600 focus:ring-2"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
