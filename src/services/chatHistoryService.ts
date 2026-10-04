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

const deletedChatsKey = (userId: string) => `carelink-deleted-chat-conversations-${userId}`;

export function deletedChatConversationIds(userId: string) {
  if (typeof localStorage === "undefined") return new Set<string>();
  try {
    return new Set(JSON.parse(localStorage.getItem(deletedChatsKey(userId)) || "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function queueDeletedChatConversation(userId: string, id: string) {
  if (typeof localStorage === "undefined") return;
  const next = deletedChatConversationIds(userId);
  next.add(id);
  localStorage.setItem(deletedChatsKey(userId), JSON.stringify([...next]));
}

function clearDeletedChatConversation(userId: string, id: string) {
  if (typeof localStorage === "undefined") return;
  const next = deletedChatConversationIds(userId);
  next.delete(id);
  localStorage.setItem(deletedChatsKey(userId), JSON.stringify([...next]));
}

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
  await syncDeletedChatConversations(userId).catch(() => undefined);
  const deleted = deletedChatConversationIds(userId);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, user_id, title, language, messages, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50)
    .returns<ChatConversationRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(toConversation).filter((conversation) => !deleted.has(conversation.id));
}

export async function syncCloudChatConversations(
  userId: string,
  conversations: ChatConversation[],
) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, pending: conversations.length > 0 };
  const deleteResult = await syncDeletedChatConversations(userId);
  const deleted = deletedChatConversationIds(userId);
  const syncable = conversations.filter((conversation) =>
    !deleted.has(conversation.id) && conversation.messages.some((message) => message.role === "user"),
  );
  if (!syncable.length) return { synced: 0, pending: deleteResult.pending };
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("chat_conversations")
    .upsert(syncable.map((conversation) => toRow(userId, conversation)), { onConflict: "id" });
  if (error) return { synced: 0, pending: true };
  return { synced: syncable.length, pending: deleteResult.pending };
}

export async function deleteCloudChatConversation(userId: string, id: string) {
  queueDeletedChatConversation(userId, id);
  if (typeof navigator !== "undefined" && !navigator.onLine) return { pending: true };
  const result = await syncDeletedChatConversations(userId);
  return { pending: result.pending };
}

export async function syncDeletedChatConversations(userId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { pending: deletedChatConversationIds(userId).size > 0 };
  }
  const ids = [...deletedChatConversationIds(userId)];
  if (!ids.length) return { pending: false };
  const supabase = getSupabaseBrowserClient();
  for (const id of ids) {
    const { error } = await supabase.from("chat_conversations").delete().eq("id", id).eq("user_id", userId);
    if (error) return { pending: true };
    clearDeletedChatConversation(userId, id);
  }
  return { pending: false };
}
