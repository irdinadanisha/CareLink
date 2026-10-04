import { NextResponse } from "next/server";

// Relays the doctor's request to the patient portal server-to-server (avoids browser CORS).
export async function POST(request: Request) {
  try {
    let base = process.env.CARELINK_PATIENT_PORTAL_URL?.trim().replace(/\/+$/, "");
    const auth = request.headers.get("authorization");
    if (!base) return NextResponse.json({ error: "CARELINK_PATIENT_PORTAL_URL is not set on this site." }, { status: 503 });
    if (!/^https?:\/\//.test(base)) base = `https://${base}`;
    if (!auth) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const body = (await request.json()) as { email?: string; patientId?: string };
    if (!body.email && !body.patientId) return NextResponse.json({ error: "A patient is required." }, { status: 400 });
    const res = await fetch(`${base}/api/doctor/revoke-patient-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body.email ? { email: body.email } : { patientId: body.patientId }),
    });
    const j = await res.json().catch(() => ({}));
    return NextResponse.json(res.ok ? j : { error: j.error ?? "The patient portal could not revoke the session." }, { status: res.status });
  } catch (e) {
    console.error("revoke-session relay failed", e);
    return NextResponse.json({ error: "Could not reach the patient portal." }, { status: 502 });
  }
}
