import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const MODEL = "llama-3.3-70b-versatile";
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4_000;
const SYSTEM_PROMPT = `You are CareLink's patient-facing diabetes health assistant.
Explain information clearly, calmly, and in plain language. Use the supplied patient record when relevant.
Nephropathy means kidney damage. Neuropathy means nerve damage. Never confuse kidneys with the liver or other organs.
Risk percentages are Random Forest estimates, not diagnoses. Never diagnose, prescribe, or advise changing medicines.
Refer important decisions to the clinician. For chest pain, severe breathing difficulty, fainting, seizures, confusion,
unconsciousness, or a dangerous glucose emergency, advise urgent medical help. Never invent missing results. Protect privacy.`;

type IncomingMessage = { role: "user" | "assistant"; content: string };
function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" && message.content.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!apiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "The health assistant is not configured." }, { status: 503 });
    }
    if (!accessToken) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const [profileResult, recordResult] = await Promise.all([
      supabase.from("profiles").select("full_name, patient_id, diabetes_type, diabetes_duration_years").eq("id", authData.user.id).single(),
      supabase.from("patient_records").select("record_date, record_data").eq("user_id", authData.user.id).single(),
    ]);
    if (profileResult.error || recordResult.error) {
      return NextResponse.json({ error: "Your health record could not be retrieved." }, { status: 500 });
    }

    const body = await request.json() as { messages?: unknown; language?: unknown };
    if (!Array.isArray(body.messages)) return NextResponse.json({ error: "A conversation is required." }, { status: 400 });
    const messages = body.messages.filter(isIncomingMessage).slice(-MAX_MESSAGES).map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }));
    if (!messages.length || messages.at(-1)?.role !== "user") {
      return NextResponse.json({ error: "The latest conversation message must be from the patient." }, { status: 400 });
    }
    const language = body.language === "ms"
      ? "Answer only in natural Bahasa Melayu used in Malaysia. Avoid Indonesian vocabulary."
      : "Answer only in clear English.";
    const completion = await new Groq({ apiKey }).chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_completion_tokens: 700,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: `CARELINK RECORD SNAPSHOT:\n${JSON.stringify({ profile: profileResult.data, ...recordResult.data })}` },
        { role: "system", content: language },
        ...messages,
      ],
    });
    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) throw new Error("Groq returned an empty response.");
    return NextResponse.json({ answer, model: MODEL });
  } catch (error) {
    console.error("CareLink chat request failed", error);
    return NextResponse.json({ error: "The health assistant is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
