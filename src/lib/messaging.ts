import { supabase } from './supabase';
import type { Conversation, ConversationWithMeta, Message, Profile } from '../types';

export async function fetchConversations(currentUserId: string): Promise<ConversationWithMeta[]> {
  const { data: memberRows, error: memErr } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at')
    .eq('user_id', currentUserId);
  if (memErr) throw memErr;
  if (!memberRows || memberRows.length === 0) return [];

  const convIds = memberRows.map((r) => r.conversation_id);
  const lastReadByConv = new Map(memberRows.map((r) => [r.conversation_id, r.last_read_at]));

  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('*')
    .in('id', convIds)
    .order('last_message_at', { ascending: false });
  if (convErr) throw convErr;
  if (!convs) return [];

  const { data: allMembers, error: allMemErr } = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id')
    .in('conversation_id', convIds);
  if (allMemErr) throw allMemErr;

  const profileIds = Array.from(new Set((allMembers ?? []).map((m) => m.user_id)));
  const profiles = await fetchProfiles(profileIds);
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const membersByConv = new Map<string, Profile[]>();
  for (const m of allMembers ?? []) {
    const p = profileById.get(m.user_id);
    if (!p) continue;
    const arr = membersByConv.get(m.conversation_id) ?? [];
    arr.push(p);
    membersByConv.set(m.conversation_id, arr);
  }

  const lastMessages = await fetchLastMessagesFor(convIds);

  return convs.map((c) => {
    const lastMsg = lastMessages.get(c.id) ?? null;
    const lastRead = lastReadByConv.get(c.id);
    const unread =
      lastMsg !== null &&
      lastMsg.sender_id !== currentUserId &&
      (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead));
    return {
      ...(c as Conversation),
      members: membersByConv.get(c.id) ?? [],
      last_message: lastMsg,
      unread,
    };
  });
}

async function fetchLastMessagesFor(convIds: string[]): Promise<Map<string, Message>> {
  if (convIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .in('conversation_id', convIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const byConv = new Map<string, Message>();
  for (const m of (data ?? []) as Message[]) {
    if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, m);
  }
  return byConv;
}

export async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function searchProfiles(query: string, excludeIds: string[] = []): Promise<Profile[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as Profile[]).filter((p) => !excludeIds.includes(p.id));
}

export async function fetchMessages(conversationId: string, limit = 200): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Message[]).reverse();
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed });
  if (error) throw error;
}

export async function startDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_dm', { other_user: otherUserId });
  if (error) throw error;
  return data as string;
}

export async function createGroup(title: string, memberIds: string[]): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', {
    p_title: title,
    p_members: memberIds,
  });
  if (error) throw error;
  return data as string;
}

export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc('mark_conversation_read', { conv_id: conversationId });
  if (error) throw error;
}

export async function leaveConversation(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;
}
