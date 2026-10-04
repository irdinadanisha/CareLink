import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { BloodTestPanel, BloodTestResult } from "@/src/types";

type BloodTestPanelRow = {
  id: string;
  user_id: string;
  panel_date: string;
  doctor_name: string | null;
  notes: string | null;
  tests: BloodTestResult[];
  systolic_bp: number | null;
  diastolic_bp: number | null;
  bmi: number | null;
  medication: string | null;
  model_input: Record<string, number | undefined> | null;
  created_at: string;
};

export type SaveBloodTestPanelInput = {
  userId: string;
  panelDate: string;
  doctorName?: string;
  notes?: string;
  tests: BloodTestResult[];
  systolicBp?: number;
  diastolicBp?: number;
  bmi?: number;
  medication?: string;
  modelInput?: Record<string, number | undefined>;
};

function toPanel(row: BloodTestPanelRow): BloodTestPanel {
  return {
    id: row.id,
    date: row.panel_date,
    doctorName: row.doctor_name ?? undefined,
    notes: row.notes ?? undefined,
    tests: row.tests ?? [],
    systolicBp: row.systolic_bp ?? undefined,
    diastolicBp: row.diastolic_bp ?? undefined,
    bmi: row.bmi ?? undefined,
    medication: row.medication ?? undefined,
    modelInput: row.model_input ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listBloodTestPanels(userId: string): Promise<BloodTestPanel[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("clinical_test_panels")
    .select("id,user_id,panel_date,doctor_name,notes,tests,systolic_bp,diastolic_bp,bmi,medication,model_input,created_at")
    .eq("user_id", userId)
    .order("panel_date", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<BloodTestPanelRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(toPanel);
}

export const getBloodTests = listBloodTestPanels;

export async function saveBloodTestPanel(input: SaveBloodTestPanelInput) {
  const supabase = getSupabaseBrowserClient();
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("clinical_test_panels")
    .insert({
      user_id: input.userId,
      panel_date: input.panelDate,
      doctor_id: user.user?.id,
      doctor_name: input.doctorName,
      notes: input.notes,
      tests: input.tests,
      systolic_bp: input.systolicBp,
      diastolic_bp: input.diastolicBp,
      bmi: input.bmi,
      medication: input.medication,
      model_input: input.modelInput ?? {},
    })
    .select("id,user_id,panel_date,doctor_name,notes,tests,systolic_bp,diastolic_bp,bmi,medication,model_input,created_at")
    .single<BloodTestPanelRow>();
  if (error) throw new Error(error.message);
  return toPanel(data);
}
