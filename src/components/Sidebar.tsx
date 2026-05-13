import clsx from 'clsx';
import type { ConversationWithMeta } from '../types';
import { Avatar, GroupAvatar } from './Avatar';
import { conversationSubtitle, conversationTitle, relativeTime } from '../lib/format';

type Props = {
  conversations: ConversationWithMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSignOut: () => void;
  meLabel: string;
  meId: string;
};

export function Sidebar({ conversations, activeId, onSelect, onNew, onSignOut, meLabel, meId }: Props) {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-panel">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Signed in as</p>
          <p className="truncate text-sm font-semibold">{meLabel}</p>
        </div>
        <button
          onClick={onSignOut}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-zinc-900 hover:text-zinc-200"
        >
          Sign out
        </button>
      </header>

      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <h2 className="text-sm font-semibold">Messages</h2>
        <button
          onClick={onNew}
          className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-semibold text-black hover:bg-emerald-400"
        >
          <span className="text-base leading-none">+</span> New
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <li className="px-4 py-6 text-center text-xs text-muted">
            No conversations yet. Tap{' '}
            <span className="font-semibold text-accent">+ New</span> to start one.
          </li>
        ) : (
          conversations.map((c) => (
            <ConversationItem
              key={c.id}
              conv={c}
              meId={meId}
              active={c.id === activeId}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </ul>
    </aside>
  );
}

function ConversationItem({
  conv,
  meId,
  active,
  onClick,
}: {
  conv: ConversationWithMeta;
  meId: string;
  active: boolean;
  onClick: () => void;
}) {
  const title = conversationTitle(conv, meId);
  const subtitle = conversationSubtitle(conv, meId);
  const preview = conv.last_message?.body ?? 'No messages yet';
  const time = conv.last_message ? relativeTime(conv.last_message.created_at) : relativeTime(conv.created_at);

  return (
    <li>
      <button
        onClick={onClick}
        className={clsx(
          'flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition',
          active ? 'bg-zinc-900/80' : 'hover:bg-zinc-900/50',
        )}
      >
        {conv.kind === 'group' ? (
          <GroupAvatar members={conv.members} />
        ) : (
          <Avatar profile={conv.members.find((m) => m.id !== meId) ?? conv.members[0]} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-semibold">{title}</p>
            <span className="shrink-0 text-[10px] text-muted">{time}</span>
          </div>
          <p className={clsx('truncate text-xs', conv.unread ? 'font-medium text-zinc-100' : 'text-muted')}>
            {preview}
          </p>
          {conv.kind === 'group' && (
            <p className="mt-0.5 truncate text-[10px] text-muted">{subtitle}</p>
          )}
        </div>
        {conv.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
      </button>
    </li>
  );
}
