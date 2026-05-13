export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type ConversationKind = 'dm' | 'group';

export type Conversation = {
  id: string;
  kind: ConversationKind;
  title: string | null;
  dm_key: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string;
};

export type ConversationMember = {
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type ConversationWithMeta = Conversation & {
  members: Profile[];
  last_message: Message | null;
  unread: boolean;
};
