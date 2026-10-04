import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { BloodTestPanel, BloodTestResult, CareLinkPatientData, ClinicalNote, PatientRecordData, PatientProfile } from "@/src/types";
import { clearOfflineSession, loadOfflineSession, saveOfflineSession } from "@/src/services/offlineStore";
import { listBloodTestPanels } from "@/src/services/bloodTestService";
import { listClinicalNotes } from "@/src/services/clinicalNotesService";

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

function numericResult(tests: BloodTestResult[], name: string) {
  const found = tests.find((test) => test.name.toLowerCase() === name.toLowerCase());
  if (!found) return undefined;
  const parsed = Number.parseFloat(String(found.value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toMgDl(value: number | undefined, unit?: string) {
  if (!Number.isFinite(value)) return undefined;
  return /mmol/i.test(unit ?? "") ? Math.round(Number(value) * 18 * 10) / 10 : value;
}

function monthLabel(date: string) {
  return new Intl.DateTimeFormat("en-MY", { month: "short" }).format(new Date(`${date}T00:00:00`));
}

function attachPanelTrends(tests: BloodTestResult[], panels: BloodTestPanel[]) {
  return tests.map((test) => {
    const trend = panels
      .slice()
      .reverse()
      .map((panel) => {
        const point = panel.tests.find((candidate) => candidate.name === test.name);
        const value = point ? numericResult([point], point.name) : undefined;
        return Number.isFinite(value) ? { month: monthLabel(panel.date), value: Number(value) } : null;
      })
      .filter(Boolean) as { month: string; value: number }[];
    return trend.length ? { ...test, date: test.date || panels[0]?.date || "", trend } : test;
  });
}

function latestDate(dates: string[]) {
  return dates.filter(Boolean).sort((a, b) => b.localeCompare(a))[0];
}

function definedNumbers(input: Record<string, number | undefined>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => Number.isFinite(value)),
  ) as Record<string, number>;
}

function deriveRecord(
  base: PatientRecordData,
  baseDate: string,
  profile: PatientProfile,
  panels: BloodTestPanel[],
  notes: ClinicalNote[],
) {
  const basePanel: BloodTestPanel = {
    id: "patient-record",
    date: baseDate,
    doctorName: base.appointments[0]?.doctor,
    tests: base.bloodTests,
  };
  const allPanels = [...panels, basePanel].sort((a, b) => b.date.localeCompare(a.date));
  const latestPanel = allPanels[0];
  const latestNote = notes[0];
  const latestTests = attachPanelTrends(latestPanel.tests, allPanels);
  const egfr = numericResult(latestTests, "eGFR");
  const medication = latestPanel.medication || base.medication;
  const clinicalSummary = latestNote?.summary.sections.length ? latestNote.summary : base.clinicalSummary;
  const appointmentDoctor = latestNote?.doctorName || latestPanel.doctorName || base.appointments[0]?.doctor || "Your clinician";
  const appointments = base.appointments.length
    ? [{ ...base.appointments[0], doctor: appointmentDoctor }]
    : [{ type: "Diabetes follow-up", doctor: appointmentDoctor, date: "", time: "" }];

  const record: PatientRecordData = {
    ...base,
    medication,
    bloodPressure: latestPanel.systolicBp && latestPanel.diastolicBp
      ? `${latestPanel.systolicBp}/${latestPanel.diastolicBp}`
      : base.bloodPressure,
    kidneyFunction: Number.isFinite(egfr) ? Number(egfr) : base.kidneyFunction,
    bloodTests: latestTests,
    trendData: latestTests.find((test) => test.name === "HbA1c")?.trend ?? base.trendData,
    clinicalSummary,
    appointments,
  };

  const hba1c = numericResult(latestTests, "HbA1c");
  const fasting = latestTests.find((test) => test.name === "Fasting blood glucose");
  const fps = toMgDl(fasting ? numericResult([fasting], fasting.name) : undefined, fasting?.unit);
  const bloodPressure = record.bloodPressure.match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/);
  const sp = latestPanel.systolicBp ?? (bloodPressure ? Number(bloodPressure[1]) : undefined);
  const bp = latestPanel.diastolicBp ?? (bloodPressure ? Number(bloodPressure[2]) : undefined);
  const onsetAge = Number.isFinite(profile.age) ? Number(profile.age) - profile.diabetesDurationYears : undefined;
  const sharedInput = definedNumbers({
    AGE: profile.age,
    BMI: latestPanel.bmi,
    SP: sp,
    BP: bp,
    HbA1c: hba1c,
    FPS: fps,
    "ONSET AGE": onsetAge,
    "MED USE": medication ? 1 : undefined,
    ...latestPanel.modelInput,
  });

  return {
    record,
    recordDate: latestDate([latestPanel.date, latestNote?.date ?? "", baseDate]) ?? baseDate,
    modelInput: sharedInput,
    allPanels,
  };
}

export async function loadPatientData(userId: string): Promise<CareLinkPatientData> {
  const supabase = getSupabaseBrowserClient();
  const [profileResult, recordResult, panelsResult, notesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single<ProfileRow>(),
    supabase.from("patient_records").select("*").eq("user_id", userId).single<PatientRow>(),
    listBloodTestPanels(userId).catch(() => []),
    listClinicalNotes(userId).catch(() => []),
  ]);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (recordResult.error) throw new Error(recordResult.error.message);
  const profile = toProfile(profileResult.data);
  const derived = deriveRecord(
    recordResult.data.record_data,
    recordResult.data.record_date,
    profile,
    panelsResult,
    notesResult,
  );
  return {
    profile,
    recordDate: derived.recordDate,
    record: derived.record,
    nephropathyInput: { ...recordResult.data.nephropathy_input, ...derived.modelInput },
    neuropathyInput: { ...recordResult.data.neuropathy_input, ...derived.modelInput },
    testPanels: derived.allPanels,
    clinicalNotes: notesResult,
  };
}

export async function signInPatient(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user || !data.session) throw new Error(error?.message || "Sign in failed.");
  const patient = await loadPatientData(data.user.id);
  await saveOfflineSession({
    userId: data.user.id,
    accessToken: data.session.access_token,
    patient,
  });
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    patient,
    source: "online" as const,
  };
}

export async function restorePatientSession() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    const cached = await loadOfflineSession();
    return cached
      ? { userId: cached.userId, accessToken: cached.accessToken, patient: cached.patient, source: "offline" as const }
      : null;
  }
  try {
    const patient = await loadPatientData(data.session.user.id);
    await saveOfflineSession({
      userId: data.session.user.id,
      accessToken: data.session.access_token,
      patient,
    });
    return {
      userId: data.session.user.id,
      accessToken: data.session.access_token,
      patient,
      source: "online" as const,
    };
  } catch (cause) {
    const cached = await loadOfflineSession();
    if (cached) {
      return { userId: cached.userId, accessToken: cached.accessToken, patient: cached.patient, source: "offline" as const };
    }
    throw cause;
  }
}

export async function refreshPatientCache(userId: string, accessToken: string) {
  const patient = await loadPatientData(userId);
  await saveOfflineSession({ userId, accessToken, patient });
  return {
    userId,
    accessToken,
    patient,
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
