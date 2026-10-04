import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RequestBody = {
  patientId?: string;
  email?: string;
};

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    return NextResponse.json({ error: "Server-side Supabase security is not configured." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "A doctor access token is required." }, { status: 401 });

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  if (!body.patientId && !body.email) {
    return NextResponse.json({ error: "Provide patientId or email." }, { status: 400 });
  }

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const caller = await admin.auth.getUser(token);
  if (caller.error || !caller.data.user) {
    const reason = caller.error?.message ?? "no user returned";
    return NextResponse.json({error: "The doctor session is invalid or expired. Reason: " + reason }, { status: 401 });
  }

  const doctor = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", caller.data.user.id)
    .single<{ id: string; role: string | null }>();
  if (doctor.error || doctor.data?.role !== "doctor") {
    return NextResponse.json({ error: "Only an authenticated doctor can revoke patient sessions." }, { status: 403 });
  }

  const patientQuery = admin.from("profiles").select("id, role, patient_id, email");
  const patient = body.patientId
    ? await patientQuery.eq("patient_id", body.patientId).maybeSingle<{ id: string; role: string | null; patient_id: string; email: string }>()
    : await patientQuery.eq("email", body.email!.trim().toLowerCase()).maybeSingle<{ id: string; role: string | null; patient_id: string; email: string }>();
  if (patient.error || !patient.data || patient.data.role === "doctor") {
    return NextResponse.json({ error: "The patient profile could not be found." }, { status: 404 });
  }

  const revokedAt = new Date().toISOString();
  const update = await admin
    .from("profiles")
    .update({ session_revoked_at: revokedAt })
    .eq("id", patient.data.id);
  if (update.error) {
    return NextResponse.json({ error: update.error.message }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    doctor_id: caller.data.user.id,
    patient_id: patient.data.id,
    action: "revoke_patient_session",
    details: { revokedAt, patientId: patient.data.patient_id },
  });

  return NextResponse.json({ ok: true, patientId: patient.data.patient_id, revokedAt });
}
