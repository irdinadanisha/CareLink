import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const MODEL = "openai/gpt-oss-20b";
const NOTE_PROMPT = `You turn a doctor's visit note into a patient-friendly summary for a diabetes patient portal.
Use plain, calm language a 12-year-old could follow. Use ONLY facts in the doctor's note and the supplied results. Never invent values, medicines or advice. Never diagnose.
Reply with JSON only, no other text, in exactly this shape:
{"currentCondition":"1-2 sentences","medication":"1-2 sentences; say no change was recorded if the note has none","bloodTestFindings":"1-2 sentences quoting the latest relevant values from the note or results","recommendedActions":"one short sentence","actionItems":["2 to 5 short imperative steps, each under 10 words"]}`;
const CHAT_PROMPT = `You help a doctor follow up on what a diabetes patient asked CareLink's AI assistant.
Report only what the patient said. Do not diagnose or give medical advice. Put anything possibly urgent first, starting with "URGENT:".
Use exactly these headings, each followed by up to 4 short lines starting with "- ":
Main concerns:
Questions asked:
Suggested follow-up:
Keep it under 150 words.`;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!apiKey || !url || !key) return NextResponse.json({ error: "The AI summary is not configured." }, { status: 503 });
    if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

    const sb = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: u, error: ue } = await sb.auth.getUser(token);
    if (ue || !u.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const { data: me } = await sb.from("profiles").select("role").eq("id", u.user.id).single();
    if (me?.role !== "doctor") return NextResponse.json({ error: "Doctors only." }, { status: 403 });

    const body = (await request.json()) as { kind?: string; patientId?: string; note?: string };
    if (!body.patientId) return NextResponse.json({ error: "A patient is required." }, { status: 400 });
    const groq = new Groq({ apiKey });
    const ask = async (system: string, user: string) => {
      const c = await groq.chat.completions.create({ model: MODEL, temperature: 0.2, max_completion_tokens: 900, messages: [{ role: "system", content: system }, { role: "user", content: user }] });
      const t = c.choices[0]?.message?.content?.trim();
      if (!t) throw new Error("Empty AI response");
      return t;
    };

    if (body.kind === "note") {
      const note = body.note?.trim().slice(0, 6000) ?? "";
      if (note.length < 20) return NextResponse.json({ error: "Write the visit notes first." }, { status: 400 });
      const { data: rec } = await sb.from("patient_records").select("record_date, record_data").eq("user_id", body.patientId).single();
      const rd = rec?.record_data;
      const results = { date: rec?.record_date, bloodPressure: rd?.bloodPressure, tests: (rd?.bloodTests ?? []).map((t: Record<string, unknown>) => ({ name: t.name, value: t.value, unit: t.unit, status: t.status })) };
      const text = await ask(NOTE_PROMPT, `DOCTOR NOTE:\n${note}\n\nLATEST RESULTS:\n${JSON.stringify(results)}`);
      const m = /\{[\s\S]*\}/.exec(text);
      const j = m ? JSON.parse(m[0]) : null;
      const items = Array.isArray(j?.actionItems) ? j.actionItems.map(str).filter(Boolean) : [];
      const [a, b, c, d] = [str(j?.currentCondition), str(j?.medication), str(j?.bloodTestFindings), str(j?.recommendedActions)];
      if (!a || !b || !c || !d || !items.length) throw new Error("Unexpected AI format");
      return NextResponse.json({ sections: [
        { title: "Current condition", text: a }, { title: "Medication", text: b },
        { title: "Important blood test findings", text: c }, { title: "Recommended actions", text: d, items },
      ] });
    }

    if (body.kind === "chat") {
      const { data: last } = await sb.from("chat_summaries").select("covers_until").eq("patient_id", body.patientId).order("created_at", { ascending: false }).limit(1);
      const { data: msgs } = await sb.from("chat_messages").select("role, content, created_at").eq("user_id", body.patientId).gt("created_at", last?.[0]?.covers_until ?? "1970-01-01").order("created_at").limit(200);
      if (!msgs?.length) return NextResponse.json({ error: "There are no new conversations to summarise." }, { status: 400 });
      const transcript = msgs.map((x) => `${x.role === "user" ? "Patient" : "Assistant"}: ${String(x.content).slice(0, 600)}`).join("\n");
      const summary = await ask(CHAT_PROMPT, transcript);
      const { data: row, error } = await sb.from("chat_summaries").insert({ patient_id: body.patientId, doctor_id: u.user.id, summary, message_count: msgs.length, covers_until: msgs[msgs.length - 1].created_at }).select("id, summary, message_count, created_at").single();
      if (error) throw error;
      return NextResponse.json({ row });
    }
    return NextResponse.json({ error: "Unknown request." }, { status: 400 });
  } catch (e) {
    console.error("doctor-ai failed", e);
    return NextResponse.json({ error: "The AI summary is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
