# StockTraderV5 — Messaging

Direct messages and group chats for StockTraderV5, built on top of the existing
OpenGate Supabase project (so messages are scoped to real trader accounts).

## Stack

- Vite + React + TypeScript + Tailwind
- Supabase: Auth (email + password), Postgres, RLS, Realtime, RPCs

## Run it

```bash
npm install
npm run dev
```

`.env.local` is already pointed at the shared OpenGate Supabase project. Sign in
with an existing OpenGate user, or sign up with a new username.

## Features

- **Private messages** — pick a user, get a 1:1 DM (idempotent via `start_dm` RPC).
- **Group chats** — name the group, add members, optionally add more later.
- **Realtime** — incoming messages stream in over Supabase Realtime; the
  sidebar reorders and unread dots update live.
- **Read receipts** — `mark_conversation_read` tracks per-member `last_read_at`.
- **Leave / hide** — anyone can remove themselves from a conversation.

## Schema (added to `gugyewzbcyjlstokzowo`)

- `conversations(id, kind, title, dm_key, created_by, created_at, last_message_at)`
  - `kind ∈ {'dm','group'}`, partial unique index on `dm_key` keeps DMs idempotent
- `conversation_members(conversation_id, user_id, role, joined_at, last_read_at)`
  - `role ∈ {'owner','admin','member'}`
- `messages(id, conversation_id, sender_id, body, created_at, edited_at, deleted_at)`

RLS: members-only `SELECT`; senders can write/edit/delete their own messages;
admins update group titles; helper `is_conversation_member` / `is_conversation_admin`
are `SECURITY DEFINER` so policies don't recurse into RLS.

RPCs: `start_dm(other_user)`, `create_group(p_title, p_members)`,
`mark_conversation_read(conv_id)`.
