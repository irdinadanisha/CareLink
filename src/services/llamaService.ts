type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type PatientContext = {
  conversation?: ConversationMessage[];
  language?: "en" | "ms";
  accessToken?: string;
};

type ChatApiResponse = {
  answer?: string;
  error?: string;
  model?: string;
};

/**
 * Sends conversation text to CareLink's server route. API credentials and the
 * authenticated patient-record lookup remain on the server.
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
    headers: {
      "Content-Type": "application/json",
      ...(patientContext.accessToken ? { Authorization: `Bearer ${patientContext.accessToken}` } : {}),
    },
    body: JSON.stringify({
      messages,
      language: patientContext.language ?? "en",
    }),
  });

  const data = (await response.json()) as ChatApiResponse;
  if (!response.ok || !data.answer) {
    throw new Error(data.error ?? "The health assistant could not respond.");
  }

  return data.answer;
}
