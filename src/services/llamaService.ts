type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type PatientContext = {
  conversation?: ConversationMessage[];
  language?: "en" | "ms" | "zh" | "ta";
  accessToken?: string;
  patientName?: string;
  hba1c?: string;
  glucose?: string;
  kidneyFunction?: string;
  medication?: string;
  nextAppointment?: string;
};

type ChatApiResponse = {
  answer?: string;
  error?: string;
  model?: string;
};

function offlineResponse(message: string, context: PatientContext) {
  const language = context.language ?? "en";
  const lower = message.toLowerCase();
  const hba1c = context.hba1c ?? "your latest HbA1c";
  const glucose = context.glucose ?? "your latest glucose result";
  const kidney = context.kidneyFunction ?? "your kidney function";
  const medication = context.medication ?? "your prescribed medication";
  const appointment = context.nextAppointment ?? "your next appointment";
  const topic = lower.includes("kidney") || lower.includes("egfr")
    ? "kidney"
    : lower.includes("food") || lower.includes("eat") || lower.includes("diet")
      ? "food"
      : lower.includes("low") || lower.includes("hypo")
        ? "low"
        : lower.includes("hba1c") || lower.includes("sugar") || lower.includes("glucose")
          ? "hba1c"
          : "general";

  const copy = {
    en: {
      offline: "Offline answer",
      hba1c: [
        `${hba1c} reflects average blood sugar over the previous two to three months.`,
        `${glucose} can change day to day, so trends matter more than one reading.`,
        `Keep taking ${medication} unless your clinician tells you otherwise.`,
        `Discuss this again at ${appointment}.`,
      ],
      kidney: [
        `${kidney} helps show how well your kidneys filter blood.`,
        "Diabetes can affect kidney blood vessels over time, so regular checks matter.",
        "Do not change medicines based on this app alone.",
        `Bring this result up at ${appointment}.`,
      ],
      food: [
        "Sugary drinks, large rice portions, desserts, and refined snacks can raise blood sugar.",
        "Balanced meals with fibre, protein, and smaller carbohydrate portions usually help.",
        "Keep a simple food and glucose log if you can.",
      ],
      low: [
        "Low blood sugar can cause sweating, shaking, hunger, dizziness, or confusion.",
        "If symptoms feel severe, seek urgent medical help.",
        "Ask your care team for a personal low-sugar action plan.",
      ],
      general: [
        "I can still use your saved CareLink record while offline.",
        "For urgent symptoms, contact emergency care immediately.",
        "Reconnect when possible so CareLink can sync and use the online assistant.",
      ],
    },
    ms: {
      offline: "Jawapan luar talian",
      hba1c: [`${hba1c} menunjukkan purata gula darah untuk dua hingga tiga bulan lepas.`, `${glucose} boleh berubah setiap hari, jadi trend lebih penting daripada satu bacaan.`, `Teruskan ${medication} kecuali doktor menasihatkan sebaliknya.`, `Bincangkan semula semasa ${appointment}.`],
      kidney: [`${kidney} membantu menunjukkan sebaik mana buah pinggang menapis darah.`, "Diabetes boleh menjejaskan salur darah buah pinggang dari masa ke masa.", "Jangan ubah ubat berdasarkan aplikasi ini sahaja.", `Bawa keputusan ini semasa ${appointment}.`],
      food: ["Minuman manis, nasi berlebihan, pencuci mulut dan snek halus boleh menaikkan gula darah.", "Hidangan seimbang dengan serat, protein dan karbohidrat sederhana biasanya membantu.", "Catat makanan dan bacaan gula jika boleh."],
      low: ["Gula rendah boleh menyebabkan berpeluh, menggigil, lapar, pening atau keliru.", "Jika gejala teruk, dapatkan bantuan perubatan segera.", "Minta pelan tindakan gula rendah peribadi daripada pasukan penjagaan."],
      general: ["Saya masih boleh menggunakan rekod CareLink yang disimpan semasa luar talian.", "Untuk gejala kecemasan, hubungi bantuan kecemasan segera.", "Sambung semula internet apabila boleh supaya CareLink boleh menyegerak dan menggunakan pembantu dalam talian."],
    },
    zh: {
      offline: "离线回答",
      hba1c: [`${hba1c} 反映过去两到三个月的平均血糖。`, `${glucose} 每天可能变化，所以趋势比单次读数更重要。`, `除非医生另有指示，请继续服用 ${medication}。`, `请在 ${appointment} 再讨论这个结果。`],
      kidney: [`${kidney} 可帮助了解肾脏过滤血液的情况。`, "糖尿病长期可能影响肾脏血管，所以定期检查很重要。", "不要只根据这个应用自行更改药物。", `请在 ${appointment} 带上这个结果讨论。`],
      food: ["含糖饮料、大量米饭、甜点和精制零食可能升高血糖。", "含纤维、蛋白质和适量碳水的均衡饮食通常有帮助。", "可以记录饮食和血糖，方便复诊讨论。"],
      low: ["低血糖可能导致出汗、发抖、饥饿、头晕或意识混乱。", "如果症状严重，请立即寻求紧急医疗帮助。", "请向护理团队询问个人低血糖处理计划。"],
      general: ["离线时我仍可使用已保存的 CareLink 记录。", "如有紧急症状，请立即联系急救服务。", "恢复网络后，CareLink 会同步并使用在线助手。"],
    },
    ta: {
      offline: "இணையமில்லா பதில்",
      hba1c: [`${hba1c} கடந்த இரண்டு முதல் மூன்று மாத சராசரி இரத்த சர்க்கரையை காட்டுகிறது.`, `${glucose} தினமும் மாறலாம்; அதனால் ஒரு அளவை விட போக்கு முக்கியம்.`, `மருத்துவர் வேறு சொல்லாவிட்டால் ${medication} தொடருங்கள்.`, `${appointment} இல் இதை மீண்டும் பேசுங்கள்.`],
      kidney: [`${kidney} சிறுநீரகம் இரத்தத்தை எவ்வாறு வடிகட்டுகிறது என்பதை காட்ட உதவும்.`, "நீரிழிவு காலப்போக்கில் சிறுநீரக இரத்த நாளங்களை பாதிக்கலாம்.", "இந்த செயலியை மட்டும் வைத்து மருந்தை மாற்ற வேண்டாம்.", `${appointment} இல் இந்த முடிவை பேசுங்கள்.`],
      food: ["இனிப்பு பானங்கள், அதிக அரிசி, இனிப்புகள் மற்றும் சுத்திகரிக்கப்பட்ட சிற்றுண்டிகள் சர்க்கரையை உயர்த்தலாம்.", "நார்ச்சத்து, புரதம் மற்றும் அளவான கார்போஹைட்ரேட் கொண்ட உணவு உதவும்.", "முடிந்தால் உணவு மற்றும் சர்க்கரை பதிவை வைத்திருங்கள்."],
      low: ["குறைந்த சர்க்கரை வியர்வை, நடுக்கம், பசி, தலைச்சுற்றல் அல்லது குழப்பம் தரலாம்.", "அறிகுறிகள் கடுமையாக இருந்தால் அவசர மருத்துவ உதவி பெறுங்கள்.", "தனிப்பட்ட குறைந்த சர்க்கரை திட்டத்தை பராமரிப்பு குழுவிடம் கேளுங்கள்."],
      general: ["இணையமில்லாதபோதும் சேமிக்கப்பட்ட CareLink பதிவை பயன்படுத்த முடியும்.", "அவசர அறிகுறிகள் இருந்தால் உடனே அவசர உதவியை தொடர்புகொள்ளுங்கள்.", "இணையம் கிடைக்கும் போது CareLink ஒத்திசைத்து ஆன்லைன் உதவியாளரை பயன்படுத்தும்."],
    },
  }[language];
  return `## ${copy.offline}\n\n${copy[topic].map((point) => `- ${point}`).join("\n")}`;
}

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

  let response: Response;
  try {
    response = await fetch("/api/chat", {
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
  } catch {
    return offlineResponse(message, patientContext);
  }

  const data = (await response.json()) as ChatApiResponse;
  if (!response.ok || !data.answer) {
    if (typeof navigator !== "undefined" && !navigator.onLine) return offlineResponse(message, patientContext);
    throw new Error(data.error ?? "The health assistant could not respond.");
  }

  return data.answer;
}
