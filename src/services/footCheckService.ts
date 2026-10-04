import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import {
  deleteOfflineFootCheck,
  listOfflineFootChecks,
  markOfflineFootCheckSynced,
  pendingOfflineFootChecks,
  saveOfflineFootCheck,
  type StoredFootCheck,
} from "@/src/services/offlineStore";

export type FootCheckRecord = {
  id: string;
  redness: boolean;
  swelling: boolean;
  warmth: boolean;
  symptomCount: number;
  recommendation: "monitor" | "doctor_attention";
  createdAt: string;
  imageUrl: string;
  imagePath?: string;
  syncStatus?: "pending" | "synced";
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const deletedFootChecksKey = (userId: string) => `carelink-deleted-foot-checks-${userId}`;

function deletedFootCheckIds(userId: string) {
  if (typeof localStorage === "undefined") return new Set<string>();
  try {
    return new Set(JSON.parse(localStorage.getItem(deletedFootChecksKey(userId)) || "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function queueDeletedFootCheck(userId: string, id: string) {
  if (typeof localStorage === "undefined") return;
  const next = deletedFootCheckIds(userId);
  next.add(id);
  localStorage.setItem(deletedFootChecksKey(userId), JSON.stringify([...next]));
}

function clearDeletedFootCheck(userId: string, id: string) {
  if (typeof localStorage === "undefined") return;
  const next = deletedFootCheckIds(userId);
  next.delete(id);
  localStorage.setItem(deletedFootChecksKey(userId), JSON.stringify([...next]));
}

export async function saveFootCheck(
  userId: string,
  answers: { redness: boolean; swelling: boolean; warmth: boolean },
  file: File,
) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Please upload a JPEG, PNG, or WebP image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("The image must be smaller than 8 MB.");
  const local = await saveOfflineFootCheck(userId, answers, file);
  void syncPendingFootChecks(userId).catch(() => undefined);
  return {
    symptomCount: local.symptomCount,
    recommendation: local.recommendation,
    syncStatus: local.syncStatus,
  };
}

async function uploadFootCheck(userId: string, record: StoredFootCheck) {
  const supabase = getSupabaseBrowserClient();
  const extension = record.imageType === "image/png" ? "png" : record.imageType === "image/webp" ? "webp" : "jpg";
  const imagePath = `${userId}/${record.id}.${extension}`;
  const file = new File([record.imageBlob], record.imageName || `wound-${record.id}.${extension}`, {
    type: record.imageType || "image/jpeg",
  });
  const upload = await supabase.storage.from("foot-check-images").upload(imagePath, file, {
    contentType: record.imageType,
    upsert: true,
  });
  if (upload.error) throw new Error(upload.error.message);
  const insert = await supabase.from("foot_checks").upsert({
    id: record.id,
    user_id: userId,
    redness: record.redness,
    swelling: record.swelling,
    warmth: record.warmth,
    image_path: imagePath,
    recommendation: record.recommendation,
    created_at: record.createdAt,
  }, { onConflict: "id" });
  if (insert.error) {
    await supabase.storage.from("foot-check-images").remove([imagePath]);
    throw new Error(insert.error.message);
  }
  const signed = await supabase.storage.from("foot-check-images").createSignedUrl(imagePath, 60 * 60);
  await markOfflineFootCheckSynced(record.id, signed.data?.signedUrl || "");
}

export async function syncPendingFootChecks(userId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, pending: true };
  for (const id of deletedFootCheckIds(userId)) {
    try {
      await deleteFootCheckFromCloud(userId, id);
      clearDeletedFootCheck(userId, id);
    } catch {
      return { synced: 0, pending: true };
    }
  }
  const pending = await pendingOfflineFootChecks(userId);
  let synced = 0;
  for (const record of pending) {
    try {
      await uploadFootCheck(userId, record);
      synced += 1;
    } catch {
      return { synced, pending: true };
    }
  }
  return { synced, pending: false };
}

export async function listFootChecks(userId: string): Promise<FootCheckRecord[]> {
  const offline = await listOfflineFootChecks(userId);
  const deleted = deletedFootCheckIds(userId);
  if (typeof navigator !== "undefined" && navigator.onLine) {
    await syncPendingFootChecks(userId).catch(() => undefined);
  }
  const supabase = getSupabaseBrowserClient();
  try {
    const { data, error } = await supabase
      .from("foot_checks")
      .select("id, redness, swelling, warmth, symptom_count, recommendation, created_at, image_path")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const remote = await Promise.all((data || []).map(async (row) => {
      const signed = await supabase.storage.from("foot-check-images").createSignedUrl(row.image_path, 60 * 60);
      return {
        id: row.id,
        redness: row.redness,
        swelling: row.swelling,
        warmth: row.warmth,
        symptomCount: row.symptom_count,
        recommendation: row.recommendation,
        createdAt: row.created_at,
        imageUrl: signed.data?.signedUrl || "",
        imagePath: row.image_path,
        syncStatus: "synced",
      } as FootCheckRecord;
    }));
    const remoteIds = new Set(remote.map((record) => record.id));
    return [...offline.filter((record) => !remoteIds.has(record.id)), ...remote]
      .filter((record) => !deleted.has(record.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return offline.filter((record) => !deleted.has(record.id));
  }
}

async function deleteFootCheckFromCloud(userId: string, id: string, imagePath?: string) {
  const supabase = getSupabaseBrowserClient();
  let storedImagePath = imagePath;
  if (!storedImagePath) {
    const { data } = await supabase
      .from("foot_checks")
      .select("image_path")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle<{ image_path: string }>();
    storedImagePath = data?.image_path;
  }
  const paths = new Set([
    storedImagePath,
    `${userId}/${id}.jpg`,
    `${userId}/${id}.png`,
    `${userId}/${id}.webp`,
  ].filter(Boolean) as string[]);
  await supabase.storage.from("foot-check-images").remove([...paths]);
  const { error } = await supabase.from("foot_checks").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteFootCheck(userId: string, record: FootCheckRecord) {
  await deleteOfflineFootCheck(record.id);
  queueDeletedFootCheck(userId, record.id);
  if (typeof navigator !== "undefined" && !navigator.onLine) return { pending: true };
  try {
    await deleteFootCheckFromCloud(userId, record.id, record.imagePath);
    clearDeletedFootCheck(userId, record.id);
    return { pending: false };
  } catch {
    return { pending: true };
  }
}
