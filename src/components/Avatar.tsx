import clsx from 'clsx';
import type { Profile } from '../types';
import { initials, profileLabel } from '../lib/format';

type Props = {
  profile?: Profile | null;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({ profile, label, size = 'md', className }: Props) {
  const text = label ?? (profile ? profileLabel(profile) : '?');
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={text}
        className={clsx('rounded-full object-cover', sizeMap[size], className)}
      />
    );
  }
  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 font-semibold text-white',
        sizeMap[size],
        className,
      )}
    >
      {initials(text)}
    </div>
  );
}

export function GroupAvatar({ members, size = 'md' }: { members: Profile[]; size?: 'sm' | 'md' | 'lg' }) {
  const first = members[0];
  return (
    <div
      className={clsx(
        'relative shrink-0',
        size === 'sm' && 'h-7 w-7',
        size === 'md' && 'h-9 w-9',
        size === 'lg' && 'h-12 w-12',
      )}
    >
      <Avatar profile={first} size={size} />
      {members.length > 1 && (
        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-zinc-800 text-[10px] font-semibold ring-2 ring-bg">
          {Math.min(members.length, 9)}
        </span>
      )}
    </div>
  );
}
