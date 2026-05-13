import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthGate } from './components/AuthGate';
import { Sidebar } from './components/Sidebar';
import { ConversationView } from './components/ConversationView';
import { NewChatDialog } from './components/NewChatDialog';
import { fetchConversations } from './lib/messaging';
import { supabase } from './lib/supabase';
import type { ConversationWithMeta } from './types';
import { profileLabel } from './lib/format';

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!user) return <AuthGate />;

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-muted">
        <div>
          <p>We couldn't find a profile for your account.</p>
          <p className="mt-2 text-xs">Sign out and sign up again with a username.</p>
          <button
            onClick={signOut}
            className="mt-4 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-zinc-900"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <Messenger />;
}

function Messenger() {
  const { user, profile, signOut } = useAuth();
  const meId = user!.id;
  const meLabel = profile ? profileLabel(profile) : user!.email ?? 'You';

  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchConversations(meId);
      setConversations(list);
    } catch (e) {
      console.error('Failed to load conversations', e);
    }
  }, [meId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live updates: refresh list whenever messages/members/conversations change for me.
  useEffect(() => {
    const channel = supabase
      .channel(`inbox:${meId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${meId}` },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, refresh]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={() => setShowNew(true)}
        onSignOut={signOut}
        meLabel={meLabel}
        meId={meId}
      />
      {active ? (
        <ConversationView
          conversation={active}
          meId={meId}
          onLeft={() => {
            setActiveId(null);
            refresh();
          }}
        />
      ) : (
        <EmptyState onNew={() => setShowNew(true)} />
      )}
      <NewChatDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        currentUserId={meId}
        onCreated={(id) => {
          setActiveId(id);
          refresh();
        }}
      />
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <section className="grid flex-1 place-items-center bg-bg">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <h2 className="mb-1 text-base font-semibold">Pick a conversation</h2>
        <p className="mb-4 text-sm text-muted">
          Or start a private message or group chat with someone.
        </p>
        <button
          onClick={onNew}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
        >
          + New conversation
        </button>
      </div>
    </section>
  );
}
