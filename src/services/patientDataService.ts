import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { CareLinkPatientData, PatientRecordData, PatientProfile } from "@/src/types";

type PatientRow = {
  record_date: string;
  record_data: PatientRecordData;
  nephropathy_input: Record<string, number | undefined>;
  neuropathy_input: Record<string, number | undefined>;
};

type ProfileRow = {
  id: string;
  patient_id: string;
  full_name: string;
  email: string;
  date_of_birth: string;
  diabetes_type: string;
  diabetes_duration_years: number;
  preferred_language: "en" | "ms";
};

function toProfile(row: ProfileRow): PatientProfile {
  return {
    id: row.id,
    patientId: row.patient_id,
    fullName: row.full_name,
    email: row.email,
    dateOfBirth: row.date_of_birth,
    diabetesType: row.diabetes_type,
    diabetesDurationYears: row.diabetes_duration_years,
    preferredLanguage: row.preferred_language,
  };
}

export async function loadPatientData(userId: string): Promise<CareLinkPatientData> {
  const supabase = getSupabaseBrowserClient();
  const [profileResult, recordResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single<ProfileRow>(),
    supabase.from("patient_records").select("*").eq("user_id", userId).single<PatientRow>(),
  ]);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (recordResult.error) throw new Error(recordResult.error.message);
  return {
    profile: toProfile(profileResult.data),
    recordDate: recordResult.data.record_date,
    record: recordResult.data.record_data,
    nephropathyInput: recordResult.data.nephropathy_input,
    neuropathyInput: recordResult.data.neuropathy_input,
  };
}

export async function signInPatient(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user || !data.session) throw new Error(error?.message || "Sign in failed.");
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    patient: await loadPatientData(data.user.id),
  };
}

export async function restorePatientSession() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return {
    userId: data.session.user.id,
    accessToken: data.session.access_token,
    patient: await loadPatientData(data.session.user.id),
  };
}

export async function signOutPatient() {
  const { error } = await getSupabaseBrowserClient().auth.signOut();
  if (error) throw new Error(error.message);
}
