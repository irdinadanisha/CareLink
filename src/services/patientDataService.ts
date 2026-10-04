import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { CareLinkPatientData, PatientRecordData, PatientProfile } from "@/src/types";
import { clearOfflineSession, loadOfflineSession, saveOfflineSession } from "@/src/services/offlineStore";

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
  preferred_language: "en" | "ms" | "zh" | "ta";
  session_revoked_at?: string | null;
};

function calculateAge(dateOfBirth: string) {
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (today < birthdayThisYear) age -= 1;
  return age;
}

function toProfile(row: ProfileRow): PatientProfile {
  return {
    id: row.id,
    patientId: row.patient_id,
    fullName: row.full_name,
    email: row.email,
    dateOfBirth: row.date_of_birth,
    age: calculateAge(row.date_of_birth),
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
  const patient = await loadPatientData(data.user.id);
  const sessionStartedAt = new Date().toISOString();
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(`carelink-session-started-${data.user.id}`, sessionStartedAt);
  }
  await saveOfflineSession({
    userId: data.user.id,
    accessToken: data.session.access_token,
    patient,
    sessionStartedAt,
  });
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    patient,
    sessionStartedAt,
    source: "online" as const,
  };
}

async function isSessionRevoked(userId: string, sessionStartedAt: string) {
  const { data, error } = await getSupabaseBrowserClient()
    .from("profiles")
    .select("session_revoked_at")
    .eq("id", userId)
    .single<{ session_revoked_at: string | null }>();
  if (error) {
    // Keep existing deployments usable until the session-revocation migration is run.
    if (error.code === "42703" || error.message.includes("session_revoked_at")) return false;
    throw new Error(error.message);
  }
  return Boolean(data.session_revoked_at && new Date(data.session_revoked_at).getTime() > new Date(sessionStartedAt).getTime());
}

export async function restorePatientSession() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    const cached = await loadOfflineSession();
    return cached
      ? {
          userId: cached.userId,
          accessToken: cached.accessToken,
          patient: cached.patient,
          sessionStartedAt: cached.sessionStartedAt,
          source: "offline" as const,
        }
      : null;
  }
  try {
    const sessionStartedAt = typeof localStorage !== "undefined"
      ? localStorage.getItem(`carelink-session-started-${data.session.user.id}`) ?? new Date().toISOString()
      : new Date().toISOString();
    if (await isSessionRevoked(data.session.user.id, sessionStartedAt)) {
      await supabase.auth.signOut({ scope: "local" });
      await clearOfflineSession();
      return null;
    }
    const patient = await loadPatientData(data.session.user.id);
    await saveOfflineSession({
      userId: data.session.user.id,
      accessToken: data.session.access_token,
      patient,
      sessionStartedAt,
    });
    return {
      userId: data.session.user.id,
      accessToken: data.session.access_token,
      patient,
      sessionStartedAt,
      source: "online" as const,
    };
  } catch (cause) {
    const cached = await loadOfflineSession();
    if (cached) {
      return {
        userId: cached.userId,
        accessToken: cached.accessToken,
        patient: cached.patient,
        sessionStartedAt: cached.sessionStartedAt,
        source: "offline" as const,
      };
    }
    throw cause;
  }
}

export async function refreshPatientCache(userId: string, accessToken: string, sessionStartedAt: string) {
  if (await isSessionRevoked(userId, sessionStartedAt)) {
    await signOutPatient();
    throw new Error("SESSION_REVOKED");
  }
  const patient = await loadPatientData(userId);
  await saveOfflineSession({ userId, accessToken, patient, sessionStartedAt });
  return {
    userId,
    accessToken,
    patient,
    sessionStartedAt,
    source: "online" as const,
  };
}

export async function signOutPatient() {
  try {
    const { error } = await getSupabaseBrowserClient().auth.signOut();
    if (error && typeof navigator !== "undefined" && navigator.onLine) throw new Error(error.message);
  } finally {
    await clearOfflineSession();
  }
}
