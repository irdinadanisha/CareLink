import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { ClinicalNote, ClinicalSummary } from "@/src/types";

type ClinicalNoteRow = {
  id: string;
  user_id: string;
  note_date: string;
  doctor_name: string | null;
  title: string;
  raw_text: string;
  summary_sections: ClinicalSummary["sections"];
  created_at: string;
};

export type SaveClinicalNoteInput = {
  userId: string;
  noteDate: string;
  doctorName?: string;
  title?: string;
  rawText: string;
  summary?: ClinicalSummary;
};

function toNote(row: ClinicalNoteRow): ClinicalNote {
  return {
    id: row.id,
    date: row.note_date,
    doctorName: row.doctor_name ?? undefined,
    title: row.title,
    rawText: row.raw_text,
    summary: { sections: row.summary_sections ?? [] },
    createdAt: row.created_at,
  };
}

export function summarizeClinicalNote(rawText: string): ClinicalSummary {
  const sentences = rawText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const first = sentences[0] || rawText.trim() || "The clinician added a new note to your record.";
  const medication = sentences.find((sentence) => /medication|metformin|insulin|prescrib|ubat|药|மருந்து/i.test(sentence));
  const tests = sentences.find((sentence) => /hba1c|glucose|egfr|creatinine|blood|test|renal|kidney/i.test(sentence));
  const plan = sentences.find((sentence) => /plan|continue|follow|review|monitor|appointment|next|advise/i.test(sentence));

  return {
    sections: [
      { title: "Current condition", text: first },
      ...(tests ? [{ title: "Important blood test findings", text: tests }] : []),
      ...(medication ? [{ title: "Medication", text: medication }] : []),
      {
        title: "Recommended actions",
        text: plan || "Continue the agreed care plan and follow up with your care team as scheduled.",
        items: ["Take medication consistently", "Monitor blood glucose", "Attend the next appointment"],
      },
    ],
  };
}

export async function listClinicalNotes(userId: string): Promise<ClinicalNote[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("clinical_notes")
    .select("id,user_id,note_date,doctor_name,title,raw_text,summary_sections,created_at")
    .eq("user_id", userId)
    .order("note_date", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ClinicalNoteRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(toNote);
}

export async function getClinicalSummary(userId: string): Promise<ClinicalSummary | null> {
  const [latest] = await listClinicalNotes(userId);
  return latest?.summary ?? null;
}

export async function saveClinicalNote(input: SaveClinicalNoteInput) {
  const supabase = getSupabaseBrowserClient();
  const { data: user } = await supabase.auth.getUser();
  const summary = input.summary ?? summarizeClinicalNote(input.rawText);
  const { data, error } = await supabase
    .from("clinical_notes")
    .insert({
      user_id: input.userId,
      note_date: input.noteDate,
      doctor_id: user.user?.id,
      doctor_name: input.doctorName,
      title: input.title ?? "Clinical note",
      raw_text: input.rawText,
      summary_sections: summary.sections,
    })
    .select("id,user_id,note_date,doctor_name,title,raw_text,summary_sections,created_at")
    .single<ClinicalNoteRow>();
  if (error) throw new Error(error.message);
  return toNote(data);
}
