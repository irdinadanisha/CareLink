import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { ChatConversation, ChatMessage } from "@/src/types";

type ChatConversationRow = {
  id: string;
  user_id: string;
  title: string;
  language: "en" | "ms" | "zh" | "ta";
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
};

function toConversation(row: ChatConversationRow): ChatConversation {
  return {
    id: row.id,
    title: row.title,
    language: row.language,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: Array.isArray(row.messages) ? row.messages : [],
  };
}

function toRow(userId: string, conversation: ChatConversation) {
  return {
    id: conversation.id,
    user_id: userId,
    title: conversation.title,
    language: conversation.language,
    messages: conversation.messages,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  };
}

export function mergeChatConversations(
  local: ChatConversation[],
  remote: ChatConversation[],
) {
  const byId = new Map<string, ChatConversation>();
  [...remote, ...local].forEach((conversation) => {
    const existing = byId.get(conversation.id);
    if (!existing || conversation.updatedAt > existing.updatedAt) {
      byId.set(conversation.id, conversation);
    }
  });
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 50);
}

export async function loadCloudChatConversations(userId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, user_id, title, language, messages, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50)
    .returns<ChatConversationRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(toConversation);
}

export async function syncCloudChatConversations(
  userId: string,
  conversations: ChatConversation[],
) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, pending: conversations.length > 0 };
  const syncable = conversations.filter((conversation) =>
    conversation.messages.some((message) => message.role === "user"),
  );
  if (!syncable.length) return { synced: 0, pending: false };
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("chat_conversations")
    .upsert(syncable.map((conversation) => toRow(userId, conversation)), { onConflict: "id" });
  if (error) return { synced: 0, pending: true };
  return { synced: syncable.length, pending: false };
}
