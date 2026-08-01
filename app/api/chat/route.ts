import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { assistantPatientContext } from "@/src/data/assistantContext";

const MODEL = "llama-3.3-70b-versatile";
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4_000;

const SYSTEM_PROMPT = `
You are CareLink's patient-facing diabetes health assistant.

Explain information clearly, calmly, and in plain language. You may answer
questions about diabetes, blood glucose, HbA1c, medicines, diet, lifestyle,
blood tests, clinical notes, diabetic nephropathy, diabetic neuropathy, and the
patient's care plan.

Important safety requirements:
- Provide general educational information, not a diagnosis.
- Do not claim certainty about a patient's condition, prognosis, or treatment.
- Never prescribe treatment or tell a patient to start, stop, or change medicine.
- Clearly distinguish model-generated risk estimates from diagnoses.
- Encourage the patient to verify important information with their clinician.
- Use short paragraphs and define medical terms in everyday language.
- If the patient asks for a simpler explanation, use shorter sentences and
  avoid technical language.
- Protect privacy. Do not ask for names, IDs, addresses, or unnecessary health data.
- For severe breathing difficulty, chest pain, confusion, fainting, seizures,
  unconsciousness, or signs of dangerously low or high blood sugar, tell the
  patient to seek urgent medical assistance immediately.

CareLink currently shows Random Forest estimates for nephropathy and neuropathy.
These percentages must always be described as estimates rather than diagnoses.

You receive a read-only CARELINK RECORD SNAPSHOT after these instructions.
When the patient asks about "my results", "my tests", "my medication", "my
summary", "my risks", or "my appointment", answer using that snapshot. State
the relevant date and values. Never say that you cannot access the results when
they are present in the snapshot. Do not invent a value that is absent. If a
requested result is not present, say which result is unavailable. Keep the
explanation concise and prioritize abnormal or noteworthy results before normal
ones.
`;

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "replace_with_your_groq_api_key") {
      return NextResponse.json(
        { error: "The Groq API key has not been configured." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { messages?: unknown };
    if (!Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "A conversation is required." },
        { status: 400 },
      );
    }

    const messages = body.messages
      .filter(isIncomingMessage)
      .slice(-MAX_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content.trim().slice(0, MAX_MESSAGE_LENGTH),
      }));

    if (messages.length === 0 || messages.at(-1)?.role !== "user") {
      return NextResponse.json(
        { error: "The latest conversation message must be from the patient." },
        { status: 400 },
      );
    }

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content: `CARELINK RECORD SNAPSHOT:\n${JSON.stringify(assistantPatientContext)}`,
        },
        ...messages,
      ],
      temperature: 0.3,
      max_completion_tokens: 700,
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) throw new Error("Groq returned an empty response.");

    return NextResponse.json({ answer, model: MODEL });
  } catch (error) {
    console.error("CareLink Groq request failed", error);
    return NextResponse.json(
      { error: "The health assistant is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
