import { formatDistanceToNowStrict, format, isToday, isYesterday } from 'date-fns';
import type { ConversationWithMeta, Profile } from '../types';

export function profileLabel(p: Profile): string {
  return p.display_name?.trim() || p.username;
}

export function initials(label: string): string {
  const parts = label.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function conversationTitle(c: ConversationWithMeta, currentUserId: string): string {
  if (c.kind === 'group') return c.title ?? 'Untitled group';
  const other = c.members.find((m) => m.id !== currentUserId);
  return other ? profileLabel(other) : 'Direct message';
}

export function conversationSubtitle(c: ConversationWithMeta, currentUserId: string): string {
  if (c.kind === 'group') {
    const others = c.members.filter((m) => m.id !== currentUserId).map(profileLabel);
    return `${c.members.length} members · ${others.slice(0, 3).join(', ')}${others.length > 3 ? '…' : ''}`;
  }
  const other = c.members.find((m) => m.id !== currentUserId);
  return other ? `@${other.username}` : '';
}

export function relativeTime(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: false });
}

export function messageTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'p');
  if (isYesterday(d)) return `Yesterday ${format(d, 'p')}`;
  return format(d, 'MMM d, p');
}
