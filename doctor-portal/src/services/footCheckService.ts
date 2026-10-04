import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

export type FootCheckRecord = {
  id: string;
  redness: boolean;
  swelling: boolean;
  warmth: boolean;
  symptomCount: number;
  recommendation: "monitor" | "doctor_attention";
  createdAt: string;
  imageUrl: string;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function saveFootCheck(
  userId: string,
  answers: { redness: boolean; swelling: boolean; warmth: boolean },
  file: File,
) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Please upload a JPEG, PNG, or WebP image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("The image must be smaller than 8 MB.");
  const supabase = getSupabaseBrowserClient();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const imagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("foot-check-images").upload(imagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);
  const symptomCount = Number(answers.redness) + Number(answers.swelling) + Number(answers.warmth);
  const recommendation = symptomCount > 0 ? "doctor_attention" as const : "monitor" as const;
  const insert = await supabase.from("foot_checks").insert({
    user_id: userId,
    redness: answers.redness,
    swelling: answers.swelling,
    warmth: answers.warmth,
    image_path: imagePath,
    recommendation,
  });
  if (insert.error) {
    await supabase.storage.from("foot-check-images").remove([imagePath]);
    throw new Error(insert.error.message);
  }
  return { symptomCount, recommendation };
}

export async function listFootChecks(): Promise<FootCheckRecord[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("foot_checks")
    .select("id, redness, swelling, warmth, symptom_count, recommendation, created_at, image_path")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return Promise.all((data || []).map(async (row) => {
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
    } as FootCheckRecord;
  }));
}
