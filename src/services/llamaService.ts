type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type PatientContext = {
  conversation?: ConversationMessage[];
};

type ChatApiResponse = {
  answer?: string;
  error?: string;
  model?: string;
};

/**
 * Sends conversation text to CareLink's server route. The Groq API key remains
 * server-side and is never exposed to this browser service.
 */
export async function sendMessageToLlama(
  message: string,
  patientContext: PatientContext,
): Promise<string> {
  const existingConversation = patientContext.conversation ?? [];
  const messages: ConversationMessage[] = existingConversation.length
    ? existingConversation.map(({ role, content }) => ({ role, content }))
    : [{ role: "user", content: message }];

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = (await response.json()) as ChatApiResponse;
  if (!response.ok || !data.answer) {
    throw new Error(data.error ?? "The health assistant could not respond.");
  }

  return data.answer;
}
