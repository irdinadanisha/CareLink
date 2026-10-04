"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  Bell,
  Bot,
  Camera,
  CalendarDays,
  Cloud,
  CloudOff,
  ClipboardList,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FileText,
  HeartPulse,
  History,
  Home,
  Info,
  Languages,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Pill,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TestTube2,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  healthMetrics,
} from "@/src/data/mockData";
import { predictNephropathyRisk } from "@/src/services/randomForestNephropathyService";
import { predictNeuropathyRisk } from "@/src/services/randomForestNeuropathyService";
import { sendMessageToLlama } from "@/src/services/llamaService";
import type { BloodTestResult, ChatConversation, ChatMessage, Page } from "@/src/types";
import { KidneysIcon } from "@/src/components/KidneysIcon";
import { NeuropathyIcon } from "@/src/components/NeuropathyIcon";
import {
  applyLanguage,
  getLanguageLabel,
  isLanguage,
  languageOptions,
  translate,
  type Language,
} from "@/src/i18n/malay";
import {
  refreshPatientCache,
  restorePatientSession,
  signInPatient,
  signOutPatient,
} from "@/src/services/patientDataService";
import type { CareLinkPatientData } from "@/src/types";
import { deleteFootCheck, listFootChecks, saveFootCheck, syncPendingFootChecks, type FootCheckRecord } from "@/src/services/footCheckService";
import {
  deleteCloudChatConversation,
  loadCloudChatConversations,
  mergeChatConversations,
  syncCloudChatConversations,
} from "@/src/services/chatHistoryService";
import {
  createPin,
  hasPin,
  isDeviceActivityExpired,
  isPinUnlocked,
  loadDeviceMode,
  lockPinForThisSession,
  saveDeviceMode,
  touchDeviceActivity,
  unlockPinForThisSession,
  verifyPin,
} from "@/src/services/deviceSecurityService";

const initials = (name: string) =>
  name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

const displayDate = (date: string) =>
  new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );

const normalizeTrendData = (
  trend: BloodTestResult["trend"] | number[] | undefined,
  language: Language,
) =>
  (trend ?? []).map((point, index) =>
    typeof point === "number"
      ? {
          month: translate(["Feb", "May"][index] ?? String(index + 1), language),
          value: point,
        }
      : {
          month: translate(point.month, language),
          value: point.value,
        },
  );

const languageLocale: Record<Language, string> = {
  en: "en-MY",
  ms: "ms-MY",
  zh: "zh-MY",
  ta: "ta-MY",
};

const displayDateTime = (date: string, language: Language) =>
  new Intl.DateTimeFormat(languageLocale[language], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

const formatAssistantText = (value: string) =>
  value
    .replace(/\\\*/g, "•")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(?:^|\s)•\s+/g, "\n• ")
    .trim();

function AssistantResponse({ content }: { content: string }) {
  const normalized = formatAssistantText(content)
    .replace(/\s+-\s+/g, "\n- ")
    .replace(/\n{3,}/g, "\n\n");
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {bullets.map((bullet) => (
          <li key={`${blocks.length}-${bullet}`}>{bullet}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((line) => {
    const bullet = line.match(/^[-•]\s*(.+)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flushBullets();
    const heading = line.replace(/^#{1,3}\s*/, "");
    const isHeading = /^#{1,3}\s+/.test(line) || /:$/.test(line);
    blocks.push(
      isHeading ? (
        <h4 key={`heading-${blocks.length}`}>{heading}</h4>
      ) : (
        <p key={`text-${blocks.length}`}>{heading}</p>
      ),
    );
  });
  flushBullets();
  return <div className="assistant-response">{blocks}</div>;
}

const chatHistoryStorageKey = (patientId: string) => `carelink-chat-history-${patientId}`;

const hasPatientMessages = (messages: ChatMessage[]) => messages.some((message) => message.role === "user");

const conversationTitle = (messages: ChatMessage[], fallback: string) => {
  const firstQuestion = messages.find((message) => message.role === "user")?.content.trim();
  if (!firstQuestion) return fallback;
  return firstQuestion.length > 58 ? `${firstQuestion.slice(0, 55)}...` : firstQuestion;
};

const summaryLabels: Record<Language, { discussed: string; messages: string; keyQuestions: string; takeaway: string; actions: string; noActions: string; transcript: string; patient: string; assistant: string }> = {
  en: {
    discussed: "Conversation summary",
    messages: "Messages",
    keyQuestions: "Main questions",
    takeaway: "Main takeaway",
    actions: "Possible follow-up points",
    noActions: "No specific follow-up point was detected.",
    transcript: "Transcript",
    patient: "Patient",
    assistant: "Care Assistant",
  },
  ms: {
    discussed: "Ringkasan perbualan",
    messages: "Mesej",
    keyQuestions: "Soalan utama",
    takeaway: "Inti utama",
    actions: "Perkara susulan yang mungkin",
    noActions: "Tiada perkara susulan khusus dikesan.",
    transcript: "Transkrip",
    patient: "Pesakit",
    assistant: "Pembantu Penjagaan",
  },
  zh: {
    discussed: "对话摘要",
    messages: "消息",
    keyQuestions: "主要问题",
    takeaway: "主要要点",
    actions: "可能的跟进事项",
    noActions: "未检测到具体跟进事项。",
    transcript: "完整记录",
    patient: "患者",
    assistant: "护理助手",
  },
  ta: {
    discussed: "உரையாடல் சுருக்கம்",
    messages: "செய்திகள்",
    keyQuestions: "முக்கிய கேள்விகள்",
    takeaway: "முக்கிய கருத்து",
    actions: "சாத்தியமான பின்தொடர்பு குறிப்புகள்",
    noActions: "குறிப்பிட்ட பின்தொடர்பு எதுவும் கண்டறியப்படவில்லை.",
    transcript: "உரைப்பதிவு",
    patient: "நோயாளர்",
    assistant: "பராமரிப்பு உதவியாளர்",
  },
};

function summarizeConversation(conversation: ChatConversation, language: Language) {
  const labels = summaryLabels[language];
  const userMessages = conversation.messages.filter((message) => message.role === "user");
  const assistantMessages = conversation.messages.filter((message) => message.role === "assistant" && message.id !== "1");
  const questions = userMessages.map((message) => formatAssistantText(message.content)).slice(0, 4);
  const assistantText = assistantMessages.map((message) => formatAssistantText(message.content)).join(" ");
  const followUps = assistantText
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) =>
      /(doctor|clinician|care team|appointment|monitor|continue|metformin|medication|follow|discuss|contact|doktor|klinik|temu janji|pantau|teruskan|医生|护理团队|复诊|继续|监测|联系|மருத்துவர்|பராமரிப்பு|சந்திப்பு|தொடர்ந்து|கண்காணிக்க)/i.test(sentence),
    )
    .slice(0, 3);
  const assistantWordCount = assistantText.split(/\s+/).filter(Boolean).length;
  const takeaway =
    assistantWordCount > 0
      ? formatAssistantText(assistantMessages[assistantMessages.length - 1]?.content ?? "").split(/\n+/).find(Boolean)?.slice(0, 180)
      : "";

  return {
    labels,
    questions,
    followUps,
    takeaway,
    messageCount: userMessages.length + assistantMessages.length,
  };
}

function downloadConversation(conversation: ChatConversation, language: Language) {
  const summary = summarizeConversation(conversation, language);
  const transcript = conversation.messages
    .filter((message) => message.id !== "1" || hasPatientMessages(conversation.messages))
    .map((message) => `${message.role === "user" ? summary.labels.patient : summary.labels.assistant} (${message.time})\n${formatAssistantText(message.content)}`)
    .join("\n\n");
  const content = [
    conversation.title,
    `${summary.labels.discussed} - ${new Date(conversation.updatedAt).toLocaleString()}`,
    "",
    `${summary.labels.messages}: ${summary.messageCount}`,
    "",
    summary.labels.keyQuestions,
    ...(summary.questions.length ? summary.questions.map((question) => `- ${question}`) : ["- -"]),
    "",
    summary.labels.takeaway,
    summary.takeaway || "-",
    "",
    summary.labels.actions,
    ...(summary.followUps.length ? summary.followUps.map((point) => `- ${point}`) : [`- ${summary.labels.noActions}`]),
    "",
    summary.labels.transcript,
    transcript,
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${conversation.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "carelink-chat"}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

const nav = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "summary", label: "Health Summary", icon: ClipboardList },
  { id: "assistant", label: "AI Assistant", icon: MessageCircle },
  { id: "ckd", label: "Possible Risks", icon: ShieldCheck },
  { id: "results", label: "Test Results", icon: TestTube2 },
  { id: "footcheck", label: "Wound Health Check", icon: Camera },
  { id: "profile", label: "Profile", icon: User },
] as const;

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark">
        <HeartPulse size={22} />
      </span>
      {!compact && (
        <div>
          <strong>CareLink</strong>
          <small>AI health companion</small>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status || "Unknown";
  const tone = /good|stable|low|normal/i.test(label)
    ? "good"
    : /high|attention|above/i.test(label)
      ? "warn"
      : "info";
  return (
    <span className={`badge ${tone}`}>
      <span aria-hidden="true">●</span>
      {label}
    </span>
  );
}

function Notice({
  children,
  kind = "info",
}: {
  children: React.ReactNode;
  kind?: "info" | "warning";
}) {
  return (
    <div className={`notice ${kind}`}>
      <Info size={18} />
      <p>{children}</p>
    </div>
  );
}

function Header({
  title,
  onMenu,
  language,
  onLanguageChange,
  patientName,
  online,
  pendingSync,
}: {
  title: string;
  onMenu: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  patientName: string;
  online: boolean;
  pendingSync: boolean;
}) {
  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu />
      </button>
      <div>
        <p className="eyebrow">PATIENT PORTAL</p>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">
        <span className={`connection-pill ${online ? "online" : "offline"} ${pendingSync ? "pending" : ""}`}>
          {online ? <Cloud size={16} /> : <CloudOff size={16} />}
          {translate(pendingSync ? "Sync pending" : online ? "Online" : "Offline ready", language)}
        </span>
        <label className="language-button" aria-label="Preferred language">
          <Languages size={18} />
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as Language)}
          >
            {languageOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.shortLabel}
              </option>
            ))}
          </select>
        </label>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={21} />
          <i />
        </button>
        <div className="avatar">{initials(patientName)}</div>
      </div>
    </header>
  );
}

function Login({
  onLogin,
  language,
  onLanguageChange,
}: {
  onLogin: (email: string, password: string, personalDevice: boolean) => Promise<void>;
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [personalDevice, setPersonalDevice] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="login-page">
      <section className="login-side">
        <Brand />
        <div className="login-copy">
          <span className="hero-icon">
            <HeartPulse />
          </span>
          <p className="eyebrow light">YOUR HEALTH, MADE CLEARER</p>
          <h1>Feel informed at every step of your care.</h1>
          <p>
            A calm, secure place to understand your results, prepare for
            appointments, and ask better questions.
          </p>
          <div className="trust-list">
            <span>
              <ShieldCheck />
              Private & secure
            </span>
            <span>
              <Stethoscope />
              Built around your care
            </span>
          </div>
        </div>
        <p className="side-note">
          For educational support only. Always follow advice from your care
          team.
        </p>
      </section>
      <section className="login-panel">
        <div className="mobile-brand">
          <Brand />
        </div>
        <label className="language-button login-language-button" aria-label="Preferred language">
          <Languages size={18} />
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as Language)}
          >
            {languageOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.shortLabel}
              </option>
            ))}
          </select>
        </label>
        <form
          className="login-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true); setError("");
            try { await onLogin(email, password, personalDevice); }
            catch (cause) { setError(cause instanceof Error ? cause.message : "Sign in failed."); }
            finally { setSubmitting(false); }
          }}
        >
          <div>
            <p className="eyebrow">WELCOME BACK</p>
            <h2>Sign in to your account</h2>
            <p>Understand your health. Ask questions. Stay informed.</p>
          </div>
          <label>
            Email or patient ID
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <div className="password">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={show ? "text" : "password"}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          <div className="form-row">
            <label className="check">
              <input type="checkbox" checked={personalDevice} onChange={(event) => setPersonalDevice(event.target.checked)} /> Personal device
            </label>
            <button className="link" type="button">
              Forgot password?
            </button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary wide" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in securely"}
          </button>
          <p className="support">
            Need help?{" "}
            <button type="button" className="link">
              Contact your clinic
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

function PinGate({
  userId,
  language,
  onUnlocked,
  onLogout,
}: {
  userId: string;
  language: Language;
  onUnlocked: () => void;
  onLogout: () => Promise<void>;
}) {
  const existingPin = hasPin(userId);
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (existingPin) {
        if (!(await verifyPin(userId, pin))) throw new Error(translate("That PIN is incorrect.", language));
      } else {
        if (pin !== confirmation) throw new Error(translate("The PINs do not match.", language));
        await createPin(userId, pin);
      }
      unlockPinForThisSession(userId);
      onUnlocked();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate("The PIN could not be saved.", language));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="pin-gate-page">
      <section className="pin-gate card">
        <span className="hero-icon"><ShieldCheck /></span>
        <p className="eyebrow">{translate("OFFLINE RECORDS LOCKED", language)}</p>
        <h1>{translate(existingPin ? "Enter your CareLink PIN" : "Create an offline PIN", language)}</h1>
        <p>{translate(existingPin
          ? "Enter your PIN to open your saved health records on this device."
          : "This PIN protects your saved health records when you return to CareLink.", language)}</p>
        <form onSubmit={submit}>
          <label>
            {translate("PIN", language)}
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              minLength={4}
              maxLength={8}
              autoFocus
              type="password"
              required
            />
          </label>
          {!existingPin && (
            <label>
              {translate("Confirm PIN", language)}
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                pattern="[0-9]{4,8}"
                minLength={4}
                maxLength={8}
                type="password"
                required
              />
            </label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary wide" type="submit" disabled={saving}>
            {saving ? translate("Checking…", language) : translate(existingPin ? "Unlock records" : "Save PIN", language)}
          </button>
        </form>
        <button className="link pin-logout" type="button" onClick={() => void onLogout()}>
          {translate("Sign out", language)}
        </button>
      </section>
    </main>
  );
}

function Dashboard({ go, data, language }: { go: (p: Page) => void; data: CareLinkPatientData; language: Language }) {
  const [nephropathyRisk, setNephropathyRisk] = useState<Awaited<
    ReturnType<typeof predictNephropathyRisk>
  > | null>(null);
  const [neuropathyRisk, setNeuropathyRisk] = useState<Awaited<
    ReturnType<typeof predictNeuropathyRisk>
  > | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      predictNephropathyRisk(data.nephropathyInput),
      predictNeuropathyRisk(data.neuropathyInput),
    ])
      .then(([nephropathy, neuropathy]) => {
        if (active) {
          setNephropathyRisk(nephropathy);
          setNeuropathyRisk(neuropathy);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [data.nephropathyInput, data.neuropathyInput]);
  const hba1c = data.record.bloodTests.find((test) => test.name === "HbA1c");
  const fasting = data.record.bloodTests.find((test) => test.name === "Fasting blood glucose");
  const recordDate = displayDate(data.recordDate);
  const hba1cNumber = Number(hba1c?.value ?? 0);
  const overallStatus = hba1cNumber >= 9 ? "Needs prompt review" : hba1cNumber > 7 ? "Needs attention" : "Stable";
  const overallMessage = hba1cNumber >= 9
    ? "Your latest glucose results are well above target. Please follow up with your care team."
    : hba1cNumber > 7
      ? "Some results are above target. Keep following your care plan and discuss them at review."
      : "Your latest glucose result is within its usual target range. Keep following your care plan.";
  const metrics = healthMetrics.map((metric) => {
    const base = { ...metric, date: recordDate };
    if (metric.name === "HbA1c" && hba1c) return { ...base, value: `${hba1c.value}${hba1c.unit}`, status: hba1c.status };
    if (metric.name === "Fasting glucose" && fasting) return { ...base, value: `${fasting.value} ${fasting.unit}`, status: fasting.status };
    if (metric.name === "Blood pressure") return { ...base, value: data.record.bloodPressure };
    if (metric.name === "Kidney function") return { ...base, value: `${data.record.kidneyFunction} eGFR`, status: data.record.kidneyFunction > 60 ? "Good" : "Needs attention" };
    return metric.name === "Nephropathy risk" && nephropathyRisk
      ? {
          ...base,
          value: `${nephropathyRisk.probability}%`,
          status: nephropathyRisk.category,
        }
      : metric.name === "Neuropathy risk" && neuropathyRisk
        ? {
          ...base,
            value: `${neuropathyRisk.probability}%`,
            status: neuropathyRisk.category,
          }
        : base;
  });
  const firstName = data.profile.fullName.split(" ")[0];
  const conditionText = `Your condition currently ${overallStatus === "Stable" ? "appears stable" : "needs attention"}.`;
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">SATURDAY, 1 AUGUST 2026</p>
          <h2>
            {translate(`Good morning, ${firstName}`, language)} <span>👋</span>
          </h2>
          <p>Here’s a clear look at how you’re doing today.</p>
        </div>
        <button className="secondary" onClick={() => go("assistant")}>
          <Sparkles size={18} /> Ask your health assistant
        </button>
      </section>
      <section className="status-banner">
        <span className="status-icon">
          <ShieldCheck />
        </span>
        <div>
          <p className="eyebrow">YOUR HEALTH AT A GLANCE</p>
          <h3>{translate(conditionText, language)}</h3>
          <p>{translate(overallMessage, language)}</p>
        </div>
        <StatusBadge status={overallStatus} />
      </section>
      <Notice>
        This summary is for informational purposes and does not replace advice
        from your healthcare provider.
      </Notice>
      <section className="metric-grid">
        {metrics.map((m, i) => {
          const risk =
            m.name === "Nephropathy risk"
              ? nephropathyRisk
              : m.name === "Neuropathy risk"
                ? neuropathyRisk
                : null;
          return (
            <article
              className={`metric-card ${risk ? `risk-highlight ${risk.category.toLowerCase().split(" ")[0]}` : ""}`}
              key={m.name}
            >
              <div className="metric-top">
                <span className={`metric-icon c${i}`}>
                  <m.icon />
                </span>
                <StatusBadge status={m.status} />
              </div>
              <p>{translate(m.name, language)}</p>
              <h3>{m.value}</h3>
              <small>{translate(m.range, language)}</small>
              <div className="divider" />
              <p className="explain">{translate(m.explanation, language)}</p>
              <time>{translate(m.date, language)}</time>
            </article>
          );
        })}
      </section>
      <section className="dashboard-grid">
        <article className="card summary-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">FROM YOUR CLINICAL NOTES</p>
              <h3>Recent health summary</h3>
            </div>
            <span className="soft-icon">
              <ClipboardList />
            </span>
          </div>
          <blockquote>“{translate(data.record.clinicalSummary.sections[0]?.text ?? "", language)}”</blockquote>
          <p>{translate(data.record.clinicalSummary.sections[1]?.text ?? "", language)}</p>
          <div className="button-row">
            <button className="primary" onClick={() => go("summary")}>
              View full summary
            </button>
            <button className="secondary" onClick={() => go("assistant")}>
              <MessageCircle /> Ask AI about this
            </button>
          </div>
        </article>
        <article className="card chart-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">6-MONTH TREND</p>
              <h3>HbA1c is moving down</h3>
            </div>
            <StatusBadge status="Improving" />
          </div>
          <TrendChart data={data.record.trendData} />
          <p className="chart-foot">
            <span /> Your latest reading is 0.4% lower than February.
          </p>
        </article>
      </section>
      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">CARE PLAN</p>
            <h2>Your next steps</h2>
          </div>
          <button className="link" onClick={() => go("summary")}>
            View care plan →
          </button>
        </div>
        <div className="steps-grid">
          {[
            {
              icon: Pill,
              title: "Take your medication",
              text: data.record.medication,
              done: true,
            },
            {
              icon: TestTube2,
              title: "Complete your blood test",
              text: "Due before 15 August",
              done: false,
            },
            {
              icon: CalendarDays,
              title: "Attend your appointment",
              text: "20 August · 10:30 AM",
              done: false,
            },
            {
              icon: Activity,
              title: "Know low sugar signs",
              text: "Review the warning signs",
              done: false,
            },
          ].map((s) => (
            <article className="step" key={s.title}>
              <span className={s.done ? "step-done" : ""}>
                {s.done ? "✓" : <s.icon />}
              </span>
              <div>
                <h4>{s.title}</h4>
              <p>{translate(s.text, language)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <article className="appointment">
        <span>
          <CalendarDays />
        </span>
        <div>
          <p className="eyebrow">UPCOMING APPOINTMENT</p>
          <h3>{translate(data.record.appointments[0]?.type ?? "", language)}</h3>
          <p>{data.record.appointments[0]?.doctor} · {translate("Diabetes Clinic", language)}</p>
        </div>
        <div className="appointment-date">
          <strong>20</strong>
          <span>AUG 2026</span>
        </div>
        <button className="secondary">View details</button>
      </article>
    </>
  );
}

function TrendChart({ data }: { data: { month: string; value: number }[] }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 8, left: -24, bottom: 0 }}
        >
          <defs>
            <linearGradient id="careFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#168fe8" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#168fe8" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#dce7f0"
          />
          <XAxis
            dataKey="month"
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#647b8d", fontSize: 12 }}
          />
          <YAxis
            domain={[6.5, 8]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#647b8d", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #dce7f0" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#168fe8"
            strokeWidth={3}
            fill="url(#careFill)"
            dot={{ r: 4, fill: "#fff", stroke: "#168fe8", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SummaryPage({ go, data, language }: { go: (p: Page) => void; data: CareLinkPatientData; language: Language }) {
  const [original, setOriginal] = useState(false);
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">LAST UPDATED {displayDate(data.recordDate).toUpperCase()}</p>
          <h2>Your Clinical Notes, Explained Simply</h2>
          <p>{translate(`A patient-friendly explanation of your latest visit with ${data.record.appointments[0]?.doctor}.`, language)}</p>
        </div>
        <button className="secondary" onClick={() => setOriginal(!original)}>
          <Eye size={18} />
          {original ? "Hide" : "View"} original notes
        </button>
      </div>
      <Notice kind="warning">
        AI-generated summaries may contain errors. Please verify important
        information with your healthcare provider.
      </Notice>
      {original && (
        <article className="card original">
          <p className="eyebrow">ORIGINAL CLINICAL NOTES</p>
          <p>{data.record.clinicalSummary.sections.map((section) => section.text).join(" ")}</p>
        </article>
      )}
      <div className="summary-layout">
        <div className="summary-sections">
          {data.record.clinicalSummary.sections.map((s, i) => (
            <article className="card summary-section" key={s.title}>
              <span className={`number n${i}`}>{i + 1}</span>
              <div>
                <h3>{translate(s.title, language)}</h3>
                <p>{translate(s.text, language)}</p>
                {s.items && (
                  <ul>
                    {s.items.map((x) => (
                      <li key={x}>{translate(x, language)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
        <aside>
          <article className="card sticky-card">
            <span className="hero-icon small">
              <Sparkles />
            </span>
            <h3>Have a question?</h3>
            <p>
              Ask the health assistant to explain any part of your summary in
              simpler words.
            </p>
            <button className="primary wide" onClick={() => go("assistant")}>
              <MessageCircle /> Ask AI about this summary
            </button>
          </article>
          <article className="card care-contact">
            <p className="eyebrow">YOUR CARE TEAM</p>
            <h3>{data.record.appointments[0]?.doctor}</h3>
            <p>Diabetes Clinic · Klinik Kesihatan</p>
            <button className="link">View clinic details →</button>
          </article>
        </aside>
      </div>
    </>
  );
}

const starters = [
  "What does my HbA1c result mean?",
  "Is my kidney function normal?",
  "What foods can affect my blood sugar?",
  "What should I ask my doctor?",
  "Explain my latest health summary",
  "What are symptoms of low blood sugar?",
  "What is my exact diagnosis, and what does it mean?",
  "What caused this condition, and are there other possible causes?",
  "Is it contagious? Could it affect other parts of my body?",
  "What is the long-term outlook, and what are the possible complications?",
  "What are my treatment options, and what are the pros and cons?",
  "What are the possible side effects, and how can I manage them?",
];
const offlineStarters = [
  "What does my HbA1c result mean?",
  "Is my kidney function normal?",
  "What foods can affect my blood sugar?",
  "What should I ask my doctor?",
  "Explain my latest health summary",
  "What are symptoms of low blood sugar?",
] as const;
const offlineStarterTopics: Record<string, "hba1c" | "kidney" | "food" | "doctor" | "summary" | "low"> = {
  "What does my HbA1c result mean?": "hba1c",
  "Is my kidney function normal?": "kidney",
  "What foods can affect my blood sugar?": "food",
  "What should I ask my doctor?": "doctor",
  "Explain my latest health summary": "summary",
  "What are symptoms of low blood sugar?": "low",
};
const sameConversationList = (left: ChatConversation[], right: ChatConversation[]) =>
  JSON.stringify(left) === JSON.stringify(right);
function AssistantPage({
  language,
  data,
  accessToken,
  online,
  onSyncPendingChange,
}: {
  language: Language;
  data: CareLinkPatientData;
  accessToken: string;
  online: boolean;
  onSyncPendingChange: (pending: boolean) => void;
}) {
  const firstName = data.profile.fullName.split(" ")[0];
  const storageKey = chatHistoryStorageKey(data.profile.patientId);
  const userId = data.profile.id;
  const availableStarters = online ? starters : offlineStarters;
  const initial = useMemo<ChatMessage[]>(() => {
    const greetings: Record<Language, string> = {
      en: `Hello ${firstName} — I can help explain your diabetes results and care plan in clear, everyday language. What would you like to understand?`,
      ms: `Hai ${firstName} — saya boleh membantu menerangkan keputusan diabetes dan pelan penjagaan anda dalam bahasa yang mudah. Apakah yang ingin anda fahami?`,
      zh: `你好 ${firstName} — 我可以用清楚、日常的语言解释您的糖尿病结果和护理计划。您想了解什么？`,
      ta: `வணக்கம் ${firstName} — உங்கள் நீரிழிவு முடிவுகள் மற்றும் பராமரிப்பு திட்டத்தை எளிய மொழியில் விளக்க உதவுகிறேன். நீங்கள் என்ன புரிந்துகொள்ள விரும்புகிறீர்கள்?`,
    };
    return [
      {
        id: "1",
        role: "assistant",
        content: greetings[language],
        time: language === "en" ? "9:41 AM" : "9:41 AM",
      },
    ];
  }, [firstName, language]);
  const [activeConversationId, setActiveConversationId] = useState(() => crypto.randomUUID()),
    [history, setHistory] = useState<ChatConversation[]>([]),
    [historyReady, setHistoryReady] = useState(false),
    [showHistory, setShowHistory] = useState(true),
    [messages, setMessages] = useState(initial),
    [text, setText] = useState(""),
    [typing, setTyping] = useState(false);
  const activeConversation = useMemo(
    () =>
      history.find((conversation) => conversation.id === activeConversationId) ?? {
        id: activeConversationId,
        title: conversationTitle(messages, translate("New conversation", language)),
        language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages,
      },
    [activeConversationId, history, language, messages],
  );
  const visibleHistory = history.filter((conversation) => hasPatientMessages(conversation.messages));
  const activeSummary = summarizeConversation(activeConversation, language);

  useEffect(() => {
    let cancelled = false;
    try {
      const raw = localStorage.getItem(storageKey);
      const finishWithCloud = (localConversations: ChatConversation[], activeId: string) => {
        if (!online) {
          setHistoryReady(true);
          onSyncPendingChange(localConversations.some((conversation) => hasPatientMessages(conversation.messages)));
          return;
        }
        loadCloudChatConversations(userId)
          .then((remote) => {
            if (cancelled) return;
            const merged = mergeChatConversations(localConversations, remote);
            const nextActive = merged.find((conversation) => conversation.id === activeId) ?? merged[0];
            setHistory(merged);
            if (nextActive?.messages.length) {
              setActiveConversationId(nextActive.id);
              setMessages(nextActive.messages);
            }
            localStorage.setItem(storageKey, JSON.stringify({
              activeConversationId: nextActive?.id ?? activeId,
              conversations: merged,
            }));
            onSyncPendingChange(false);
          })
          .catch(() => onSyncPendingChange(localConversations.some((conversation) => hasPatientMessages(conversation.messages))))
          .finally(() => {
            if (!cancelled) setHistoryReady(true);
          });
      };
      if (!raw) {
        setHistory([]);
        const nextActiveId = crypto.randomUUID();
        setActiveConversationId(nextActiveId);
        setMessages(initial);
        finishWithCloud([], nextActiveId);
        return;
      }
      const parsed = JSON.parse(raw) as { activeConversationId?: string; conversations?: ChatConversation[] };
      const savedConversations = Array.isArray(parsed.conversations) ? parsed.conversations : [];
      const savedActiveId = parsed.activeConversationId ?? savedConversations[0]?.id ?? crypto.randomUUID();
      const savedActive = savedConversations.find((conversation) => conversation.id === savedActiveId);
      setHistory(savedConversations);
      setActiveConversationId(savedActiveId);
      setMessages(savedActive?.messages?.length ? savedActive.messages : initial);
      finishWithCloud(savedConversations, savedActiveId);
    } catch {
      setHistory([]);
      setActiveConversationId(crypto.randomUUID());
      setMessages(initial);
      setHistoryReady(true);
    }
    return () => { cancelled = true; };
  }, [initial, online, onSyncPendingChange, storageKey, userId]);

  useEffect(() => {
    setMessages((current) =>
      current.length === 1 && current[0]?.id === "1" ? initial : current,
    );
  }, [initial]);

  useEffect(() => {
    if (!historyReady) return;
    const now = new Date().toISOString();
    setHistory((current) => {
      const existing = current.find((conversation) => conversation.id === activeConversationId);
      const updated: ChatConversation = {
        id: activeConversationId,
        title: conversationTitle(messages, translate("New conversation", language)),
        language,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        messages,
      };
      const next = [
        updated,
        ...current.filter((conversation) => conversation.id !== activeConversationId),
      ].slice(0, 50);
      localStorage.setItem(storageKey, JSON.stringify({ activeConversationId, conversations: next }));
      if (online) {
        void syncCloudChatConversations(userId, next)
          .then((result) => onSyncPendingChange(result.pending))
          .catch(() => onSyncPendingChange(next.some((conversation) => hasPatientMessages(conversation.messages))));
      } else {
        onSyncPendingChange(next.some((conversation) => hasPatientMessages(conversation.messages)));
      }
      return next;
    });
  }, [activeConversationId, historyReady, language, messages, onSyncPendingChange, online, storageKey, userId]);

  useEffect(() => {
    if (!historyReady || !online) return;
    let cancelled = false;
    syncCloudChatConversations(userId, history)
      .then((result) => {
        if (!cancelled) onSyncPendingChange(result.pending);
        return loadCloudChatConversations(userId);
      })
      .then((remote) => {
        if (cancelled) return;
        const merged = mergeChatConversations(history, remote);
        if (!sameConversationList(history, merged)) {
          setHistory(merged);
          localStorage.setItem(storageKey, JSON.stringify({ activeConversationId, conversations: merged }));
        }
      })
      .catch(() => {
        if (!cancelled) onSyncPendingChange(history.some((conversation) => hasPatientMessages(conversation.messages)));
      });
    return () => { cancelled = true; };
  }, [activeConversationId, history, historyReady, onSyncPendingChange, online, storageKey, userId]);

  function startNewConversation() {
    setActiveConversationId(crypto.randomUUID());
    setMessages(initial);
    setText("");
  }

  function openConversation(conversation: ChatConversation) {
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
    setText("");
  }

  function deleteConversation(conversation: ChatConversation) {
    if (!window.confirm(translate("Delete this chat history?", language))) return;
    const next = history.filter((item) => item.id !== conversation.id);
    const nextActive = conversation.id === activeConversationId ? next[0] : activeConversation;
    const nextActiveId = nextActive?.id ?? crypto.randomUUID();
    setHistory(next);
    if (conversation.id === activeConversationId) {
      setActiveConversationId(nextActiveId);
      setMessages(nextActive?.messages ?? initial);
    }
    localStorage.setItem(storageKey, JSON.stringify({
      activeConversationId: conversation.id === activeConversationId ? nextActiveId : activeConversationId,
      conversations: next,
    }));
    void deleteCloudChatConversation(userId, conversation.id)
      .then((result) => onSyncPendingChange(result.pending))
      .catch(() => onSyncPendingChange(true));
  }

  async function send(value = text, starterKey?: string) {
    if (!value.trim() || typing) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
      time: "Now",
    };
    const conversation = [...messages, msg];
    setMessages(conversation);
    setText("");
    setTyping(true);
    try {
      const reply = await sendMessageToLlama(value, {
        conversation,
        language,
        accessToken,
        patientName: data.profile.fullName,
        hba1c: data.record.bloodTests.find((test) => test.name === "HbA1c")?.value,
        glucose: data.record.bloodTests.find((test) => test.name === "Fasting blood glucose")?.value,
        kidneyFunction: String(data.record.kidneyFunction),
        medication: data.record.medication,
        nextAppointment: data.record.appointments[0]
          ? `${data.record.appointments[0].date} ${data.record.appointments[0].time}`
          : undefined,
        offlineTopic: starterKey ? offlineStarterTopics[starterKey] : undefined,
      });
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          time: "Now",
        },
      ]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The health assistant is temporarily unavailable. Please try again.",
          time: "Now",
        },
      ]);
    } finally {
      setTyping(false);
    }
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">GROQ · GPT-OSS 20B</p>
          <h2>AI Health Assistant</h2>
          <p>{translate(online ? "Ask questions about your diabetes, results, and care plan." : "Offline mode: suggested questions use your saved CareLink record.", language)}</p>
        </div>
        <div className="button-row compact-actions">
          <button className="secondary" onClick={() => setShowHistory((current) => !current)}>
            <History size={17} /> {translate("Chat history", language)}
          </button>
          <button className="secondary" onClick={startNewConversation}>
            <Plus size={17} /> {translate("New conversation", language)}
          </button>
        </div>
      </div>
      <Notice kind="warning">
        This AI provides general educational information. It does not diagnose,
        prescribe treatment, or replace your doctor.
      </Notice>
      <Notice kind="warning">
        {translate("Your AI conversations are recorded and may be shared with your doctor for clinical follow-up and diagnosis. Do not use this assistant for emergencies.", language)}
      </Notice>
      <div className={`assistant-layout ${showHistory ? "" : "history-hidden"}`}>
        {showHistory && (
          <aside className="chat-history-panel card">
            <div className="card-head">
              <div>
                <p className="eyebrow">{translate("Saved locally", language)}</p>
                <h3>{translate("Chat history", language)}</h3>
              </div>
              <span className="soft-icon">
                <History />
              </span>
            </div>
            {visibleHistory.length ? (
              <div className="history-list">
                {visibleHistory.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`history-item ${conversation.id === activeConversationId ? "selected" : ""}`}
                  >
                    <button type="button" onClick={() => openConversation(conversation)}>
                      <strong>{conversation.title}</strong>
                      <small>{displayDateTime(conversation.updatedAt, language)}</small>
                    </button>
                    <button
                      type="button"
                      className="delete-history"
                      onClick={() => deleteConversation(conversation)}
                      aria-label={translate("Delete chat", language)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="history-empty">{translate("Your saved conversations will appear here.", language)}</p>
            )}
            {hasPatientMessages(activeConversation.messages) && (
              <div className="conversation-summary">
                <div className="summary-mini-head">
                  <FileText size={17} />
                  <strong>{translate("Conversation summary", language)}</strong>
                </div>
                <small>{activeSummary.labels.messages}: {activeSummary.messageCount}</small>
                <h4>{activeSummary.labels.keyQuestions}</h4>
                <ul>
                  {activeSummary.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
                <h4>{activeSummary.labels.takeaway}</h4>
                <p>{activeSummary.takeaway || "-"}</p>
                <h4>{activeSummary.labels.actions}</h4>
                <ul>
                  {(activeSummary.followUps.length ? activeSummary.followUps : [activeSummary.labels.noActions]).map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <button className="secondary wide" onClick={() => downloadConversation(activeConversation, language)}>
                  <Download size={16} /> {translate("Download conversation", language)}
                </button>
              </div>
            )}
          </aside>
        )}
        <div className="chat-shell">
          <div className="chat-head">
            <div className="bot-avatar">
              <Bot />
            </div>
            <div>
              <h3>Care Assistant</h3>
              <p>
                <span /> Powered by GPT-OSS 20B
              </p>
            </div>
            <button
              className="icon-button"
              onClick={startNewConversation}
              aria-label="New conversation"
            >
              +
            </button>
          </div>
          <div className="chat-body">
            {messages.map((m) => (
              <div className={`message-row ${m.role}`} key={m.id}>
                {m.role === "assistant" && (
                  <div className="mini-bot">
                    <Sparkles />
                  </div>
                )}
                <div>
                  <div className="bubble">
                    {m.role === "assistant" ? (
                      <AssistantResponse content={m.content} />
                    ) : (
                      formatAssistantText(m.content)
                    )}
                  </div>
                  <time>{m.time}</time>
                </div>
              </div>
            ))}
            {typing && (
              <div className="message-row assistant">
                <div className="mini-bot">
                  <Sparkles />
                </div>
                <div className="bubble typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
          </div>
          <div className="suggestions" aria-label="Suggested questions">
            {availableStarters.map((s) => (
              <button
                key={s}
                onClick={() => send(translate(s, language), s)}
                disabled={typing}
              >
                {translate(s, language)}
              </button>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={translate("Ask about your health records…", language)}
              aria-label={translate("Message", language)}
              disabled={typing}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={typing || !text.trim()}
            >
              <Send />
            </button>
          </form>
          <p className="chat-disclaimer">
            AI can make mistakes. Check important information with your care team.
          </p>
        </div>
      </div>
    </>
  );
}

type RiskResult = Awaited<ReturnType<typeof predictNephropathyRisk>>;

function RiskCard({
  title,
  kind,
  result,
  recordDate,
  language,
}: {
  title: string;
  kind: "nephropathy" | "neuropathy";
  result: RiskResult;
  recordDate: string;
  language: Language;
}) {
  const Icon = kind === "nephropathy" ? KidneysIcon : NeuropathyIcon;
  const recommendation =
    kind === "nephropathy"
      ? "Discuss this estimate and your kidney test trends with your doctor."
      : "Discuss this estimate and any tingling, burning, numbness, pain, or loss of sensation with your doctor.";
  const description =
    kind === "nephropathy"
      ? "Nephropathy is kidney damage that can develop when diabetes affects the kidneys’ tiny blood-filtering vessels."
      : "Neuropathy is nerve damage that can cause tingling, burning, pain, or numbness, especially in the feet and legs.";
  return (
    <article
      className={`risk-result automatic risk-box ${result.category.toLowerCase().split(" ")[0]}`}
    >
      <div className="risk-title">
        <span className="soft-icon">
          <Icon />
        </span>
        <div>
          <p className="eyebrow">RANDOM FOREST ESTIMATE</p>
          <h3>{translate(title, language)}</h3>
        </div>
        <StatusBadge status={result.category} />
      </div>
      <p className="risk-description">{translate(description, language)}</p>
      <div className="severity prominent">
        <div className="severity-label">
          <span>{translate("Risk progression", language)}</span>
          <strong>{result.probability}%</strong>
        </div>
        <div
          className="severity-track"
          role="meter"
          aria-label={`${title} progression`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={result.probability}
        >
          <span style={{ width: `${result.probability}%` }} />
        </div>
        <div className="severity-scale">
          <span>{translate("0% · Low", language)}</span>
          <span>{translate("30% · Moderate", language)}</span>
          <span>{translate("60% · High", language)}</span>
          <span>100%</span>
        </div>
      </div>
      <div className="risk-value">
        <strong>{result.probability}%</strong>
        <span>{translate("estimated probability", language)}</span>
      </div>
      <p>{translate(result.explanation, language)}</p>
      <div className="divider" />
      <h4>{translate("Information used by the model", language)}</h4>
      <ul>
        {result.factors.map((x) => (
          <li key={x}>
            <span>✓</span>
            {translate(x, language)}
          </li>
        ))}
      </ul>
      <h4>{translate("Recommended next step", language)}</h4>
      <p>
        {translate(`${recommendation} Do not change medication or care based on this result.`, language)}
      </p>
      <time>{translate(`Blood test record · ${displayDate(recordDate)}`, language)}</time>
      <div className="model-performance">
        <span>
          {translate("Model test accuracy", language)} <b>{(result.modelAccuracy * 100).toFixed(2)}%</b>
        </span>
        <span>
          {translate("Model ROC-AUC", language)} <b>{result.rocAuc.toFixed(4)}</b>
        </span>
      </div>
    </article>
  );
}

function PossibleRisksPage({ data, language }: { data: CareLinkPatientData; language: Language }) {
  const [nephropathy, setNephropathy] = useState<RiskResult | null>(null);
  const [neuropathy, setNeuropathy] = useState<Awaited<
    ReturnType<typeof predictNeuropathyRisk>
  > | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      predictNephropathyRisk(data.nephropathyInput),
      predictNeuropathyRisk(data.neuropathyInput),
    ])
      .then(([neph, neuro]) => {
        if (active) {
          setNephropathy(neph);
          setNeuropathy(neuro);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "The Random Forest models could not be loaded. Please refresh and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [data.nephropathyInput, data.neuropathyInput]);
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">AUTOMATIC COMPLICATION ESTIMATES</p>
          <h2>Possible Risks</h2>
          <p>
            Two Random Forest models calculate possible diabetes-related
            complication risks from your latest record.
          </p>
        </div>
        <StatusBadge status="Random Forest only" />
      </div>
      <Notice kind="warning">
        These probabilities are model estimates, not diagnoses. They should be
        reviewed by a qualified healthcare professional.
      </Notice>
      {error ? (
        <article className="card empty-result">
          <span>
            <Info />
          </span>
          <h3>Unable to calculate risks</h3>
          <p>{error}</p>
        </article>
      ) : !nephropathy || !neuropathy ? (
        <article className="card empty-result">
          <span>
            <Activity />
          </span>
          <h3>Calculating possible risks…</h3>
          <p>
            Loading both fitted Random Forest models. No manual input is needed.
          </p>
        </article>
      ) : (
        <div className="possible-risks-grid">
          <RiskCard
            title="Nephropathy risk"
            kind="nephropathy"
            result={nephropathy}
            recordDate={data.recordDate}
            language={language}
          />
          <RiskCard
            title="Neuropathy risk"
            kind="neuropathy"
            result={neuropathy}
            recordDate={data.recordDate}
            language={language}
          />
        </div>
      )}
    </>
  );
}

function ResultsPage({ data, language }: { data: CareLinkPatientData; language: Language }) {
  const bloodTests = data.record.bloodTests;
  const recordDate = displayDate(data.recordDate);
  const [filter, setFilter] = useState("Latest results"),
    [selectedName, setSelectedName] = useState(bloodTests[0]?.name ?? "");
  const visible = bloodTests.filter((t) =>
    filter === "Abnormal results"
      ? t.status !== "Normal"
      : filter === "Kidney-related"
        ? t.category === "Kidney"
        : filter === "Diabetes-related"
          ? t.category === "Diabetes"
          : true,
  );
  const selected =
    visible.find((test) => test.name === selectedName) ??
    bloodTests.find((test) => test.name === selectedName) ??
    visible[0] ??
    bloodTests[0];

  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">LATEST PANEL · {displayDate(data.recordDate).toUpperCase()}</p>
          <h2>Blood Test Results</h2>
          <p>Your lab results, explained in patient-friendly language.</p>
        </div>
        <button className="secondary">Download report</button>
      </div>
      <div className="filter-row">
        {[
          "Latest results",
          "Abnormal results",
          "Diabetes-related",
          "Kidney-related",
        ].map((x) => (
          <button
            className={filter === x ? "active" : ""}
            onClick={() => setFilter(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="results-layout">
        <div className="results-table">
          <div className="table-head">
            <span>Test</span>
            <span>Result</span>
            <span>Reference range</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          {visible.map((t) => (
            <button
              className={`table-row ${selected?.name === t.name ? "selected" : ""}`}
              onClick={() => setSelectedName(t.name)}
              key={t.name}
            >
              <span>
                <b>{translate(t.name, language)}</b>
                <small>{translate(t.category, language)}</small>
              </span>
              <span>
                <strong>{t.value}</strong> {t.unit}
              </span>
              <span>{translate(t.range, language)}</span>
              <span>
                <StatusBadge status={t.status} />
              </span>
              <span>{translate(t.date ?? recordDate, language)}</span>
            </button>
          ))}
        </div>
        {selected ? (
          <aside className="card result-detail">
            <p className="eyebrow">RESULT EXPLAINED</p>
            <span className="soft-icon">
              <Droplets />
            </span>
            <h3>{translate(selected.name, language)}</h3>
            <div className="detail-value">
              <strong>{selected.value}</strong>
              <span>{selected.unit}</span>
            </div>
            <StatusBadge status={selected.status} />
            <p>{translate(selected.explanation, language)}</p>
            <div className="mini-chart">
              <TrendChart data={normalizeTrendData(selected.trend, language)} />
            </div>
            <Notice>
              One result alone does not tell the full story. Your doctor will
              consider this alongside your overall health.
            </Notice>
          </aside>
        ) : (
          <aside className="card result-detail">
            <p className="eyebrow">RESULT EXPLAINED</p>
            <span className="soft-icon">
              <Droplets />
            </span>
            <h3>No test results available</h3>
            <p>There are no blood test results to show for this record.</p>
          </aside>
        )}
      </div>
    </>
  );
}

type FootAnswers = { redness: boolean | null; swelling: boolean | null; warmth: boolean | null };

function FootHealthPage({ userId, language }: { userId: string; language: Language }) {
  const [answers, setAnswers] = useState<FootAnswers>({ redness: null, swelling: null, warmth: null });
  const [image, setImage] = useState<File | null>(null);
  const [history, setHistory] = useState<FootCheckRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [result, setResult] = useState<{ symptomCount: number; recommendation: "monitor" | "doctor_attention" } | null>(null);
  const answered = Object.values(answers).every((value) => value !== null);
  const preview = useMemo(() => image ? URL.createObjectURL(image) : "", [image]);

  useEffect(() => {
    listFootChecks(userId).then(setHistory).catch(() => {});
  }, [userId]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    const openCamera = async () => {
      setCameraError("");
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Live camera access requires HTTPS, or CareLink must be opened as localhost on this device.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (cause) {
        setCameraError(
          cause instanceof DOMException && cause.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser settings and try again."
            : "CareLink could not start this device’s camera. Check that a camera is connected and available.",
        );
      }
    };
    void openCamera();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [cameraOpen]);

  const chooseImage = (file?: File) => {
    setError("");
    if (file) setImage(file);
  };
  const captureImage = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is still starting. Wait a moment and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("CareLink could not capture the photograph. Please try again.");
        return;
      }
      chooseImage(new File([blob], `wound-camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      setCameraOpen(false);
    }, "image/jpeg", 0.9);
  };
  const submit = async () => {
    if (!answered || !image) return;
    setSubmitting(true); setError("");
    try {
      const saved = await saveFootCheck(userId, answers as Record<keyof FootAnswers, boolean>, image);
      setResult(saved);
      setHistory(await listFootChecks(userId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The wound check could not be saved.");
    } finally { setSubmitting(false); }
  };
  const reset = () => {
    setAnswers({ redness: null, swelling: null, warmth: null });
    setImage(null); setResult(null); setError("");
  };
  const removeCheck = async (check: FootCheckRecord) => {
    if (!window.confirm(translate("Delete this wound check?", language))) return;
    setHistory((current) => current.filter((item) => item.id !== check.id));
    const deleted = await deleteFootCheck(userId, check);
    if (deleted.pending) setError(translate("Deleted locally. It will sync when internet returns.", language));
  };
  const questions: { key: keyof FootAnswers; title: string; hint: string }[] = [
    { key: "redness", title: "Is the wound or surrounding skin redder than usual?", hint: "Look for new redness, spreading redness, or a noticeable change from your usual skin colour." },
    { key: "swelling", title: "Is there new swelling around the wound or affected area?", hint: "Look for new puffiness, tight-looking skin, or a clear difference from the surrounding area." },
    { key: "warmth", title: "Does the area feel unusually warm?", hint: "Compare it gently with nearby unaffected skin or the same area on the other side of your body. A photo cannot measure warmth." },
  ];
  return <>
    <div className="page-intro"><div><p className="eyebrow">{translate("SKIN & WOUND MONITORING", language)}</p><h2>{translate("Wound Health Check", language)}</h2><p>{translate("Record warning signs around a wound or affected skin area and save a photograph for your care history.", language)}</p></div></div>
    <Notice kind="warning">{translate("This checklist does not analyse or diagnose the photograph. If you have an open wound, pus, fever, black or blue skin, rapidly spreading redness, or severe swelling, seek urgent medical help.", language)}</Notice>
    <div className="foot-check-layout">
      <section className="card foot-check-form">
        <div className="foot-step"><span>1</span><div><h3>{translate("Check for warning signs", language)}</h3><p>{translate("Answer all three questions before adding a photograph.", language)}</p></div></div>
        <div className="foot-questions">
          {questions.map((question) => <article key={question.key} className="foot-question">
            <div><h4>{translate(question.title, language)}</h4><p>{translate(question.hint, language)}</p></div>
            <div className="yes-no" role="group" aria-label={translate(question.title, language)}>
              {[false, true].map((value) => <button key={String(value)} className={answers[question.key] === value ? "selected" : ""} onClick={() => setAnswers((current) => ({ ...current, [question.key]: value }))}>{translate(value ? "Yes" : "No", language)}</button>)}
            </div>
          </article>)}
        </div>
        {answered && <>
          <div className="foot-step second"><span>2</span><div><h3>{translate("Add a current photograph", language)}</h3><p>{translate("Use good lighting and show the wound or affected area together with some surrounding skin. JPEG, PNG, or WebP; maximum 8 MB.", language)}</p></div></div>
          <div className="image-actions">
            <button type="button" className="primary" onClick={() => setCameraOpen(true)}><Camera size={18} /> {translate("Use camera", language)}</button>
            <label className="secondary"><Upload size={18} /> {translate("Upload image", language)}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} /></label>
          </div>
          {preview && <div className="foot-preview"><img src={preview} alt={translate("Selected wound check", language)} /><span>{image?.name}</span></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary wide save-foot-check" disabled={!image || submitting} onClick={submit}>{translate(submitting ? "Saving securely…" : "Save wound health check", language)}</button>
        </>}
      </section>
      <aside className="card foot-history">
        <p className="eyebrow">{translate("YOUR RECORDS", language)}</p><h3>{translate("Previous checks", language)}</h3>
        {history.length === 0 ? <p>{translate("No wound health checks saved yet.", language)}</p> : history.map((check) => <article key={check.id}>
          {check.imageUrl && <img src={check.imageUrl} alt={translate("Previously uploaded wound check", language)} />}
          <div><strong>{translate(`${check.symptomCount}/3 signs reported`, language)}</strong><small>{displayDateTime(check.createdAt, language)}</small><span className={check.symptomCount >= 2 ? "attention" : "monitor"}>{translate(check.syncStatus === "pending" ? "Saved locally · waiting to sync" : check.symptomCount === 3 ? "High priority: call your clinic to reschedule your appointment as soon as possible." : check.symptomCount === 2 ? "Call your clinic and keep an eye on the wound." : check.symptomCount === 1 ? "Keep an eye on the wound until your next appointment." : "Continue monitoring", language)}</span></div>
          <button type="button" className="delete-history foot-delete" onClick={() => removeCheck(check)} aria-label={translate("Delete wound check", language)}><Trash2 size={15} /></button>
        </article>)}
      </aside>
    </div>
    {cameraOpen && <div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="camera-title">
      <div className="camera-dialog">
        <div className="camera-head"><div><p className="eyebrow">{translate("LIVE CAMERA", language)}</p><h2 id="camera-title">{translate("Take a current photograph", language)}</h2></div><button type="button" className="icon-button" onClick={() => setCameraOpen(false)} aria-label={translate("Close camera", language)}><X /></button></div>
        <div className="camera-view"><video ref={videoRef} autoPlay playsInline muted />{cameraError && <p role="alert">{cameraError}</p>}</div>
        <p className="camera-guidance">{translate("Use good lighting and keep the wound or affected area clearly visible.", language)}</p>
        <div className="camera-actions"><button type="button" className="secondary" onClick={() => setCameraOpen(false)}>{translate("Cancel", language)}</button><button type="button" className="primary" onClick={captureImage} disabled={Boolean(cameraError)}><Camera size={18} /> {translate("Capture photograph", language)}</button></div>
      </div>
    </div>}
    {result && <div className="result-modal" role="dialog" aria-modal="true" aria-labelledby="foot-result-title"><div className={`result-dialog ${result.symptomCount >= 2 ? "doctor_attention" : result.recommendation}`}>
      <span className="result-symbol">{result.symptomCount >= 2 ? "!" : "✓"}</span>
      <h2 id="foot-result-title">{translate(result.symptomCount === 3 ? "High priority: call your clinic to reschedule your appointment as soon as possible." : result.symptomCount === 2 ? "Call your clinic and keep an eye on the wound." : result.symptomCount === 1 ? "Keep an eye on the wound until your next appointment." : "No warning signs reported", language)}</h2>
      <p>{translate(result.symptomCount === 3 ? "You reported all 3 warning signs. Please call your clinic as soon as possible to reschedule your appointment." : result.symptomCount === 2 ? "You reported 2 of 3 warning signs. Please call your clinic and keep an eye on the wound until you receive advice." : result.symptomCount === 1 ? "You reported 1 of 3 warning signs. Keep an eye on the wound until your next appointment and seek medical help if it worsens or another sign appears." : "Continue checking the wound or affected area and contact your care team if redness, swelling, warmth, discharge, or colour changes develop.", language)}</p>
      <p className="result-note">{translate("Your answers and photograph have been saved privately to your CareLink record. This is not an AI diagnosis.", language)}</p>
      <button className="primary wide" onClick={reset}>{translate("Done", language)}</button>
    </div></div>}
  </>;
}

function ProfilePage({
  language,
  data,
}: {
  language: Language;
  data: CareLinkPatientData;
}) {
  return (
    <div>
      <div className="page-intro">
        <div>
          <p className="eyebrow">ACCOUNT & PREFERENCES</p>
          <h2>Profile and Settings</h2>
          <p>Manage your personal details and how CareLink works for you.</p>
        </div>
      </div>
      <div className="profile-grid">
        <article className="card profile-card">
          <div className="profile-avatar">{initials(data.profile.fullName)}</div>
          <h3>{data.profile.fullName}</h3>
          <p>Patient ID · {data.profile.patientId}</p>
          <StatusBadge status={data.profile.diabetesType} />
          <div className="profile-fields">
            <div>
              <small>Age</small>
              <strong>{data.profile.age ?? "—"}</strong>
            </div>
            <div>
              <small>Date of birth</small>
              <strong>{displayDate(data.profile.dateOfBirth)}</strong>
            </div>
            <div>
              <small>Contact</small>
              <strong>+60 12-345 6789</strong>
            </div>
            <div>
              <small>Email</small>
              <strong>{data.profile.email}</strong>
            </div>
            <div>
              <small>Preferred language</small>
              <strong>{getLanguageLabel(language)}</strong>
            </div>
          </div>
          <button className="secondary wide">Edit personal details</button>
        </article>
        <div className="settings-stack">
          <article className="card settings-card">
            <h3>Care information</h3>
            <div className="setting-line">
              <span>
                <Stethoscope />
                <span>
                  <b>Primary doctor</b>
                  <small>{data.record.appointments[0]?.doctor}</small>
                </span>
              </span>
              <button>Manage</button>
            </div>
            <div className="setting-line">
              <span>
                <HeartPulse />
                <span>
                  <b>Clinic</b>
                  <small>Klinik Kesihatan Diabetes Clinic</small>
                </span>
              </span>
              <button>View</button>
            </div>
            <div className="setting-line">
              <span>
                <User />
                <span>
                  <b>Emergency contact</b>
                  <small>{translate("Ahmad Zain · Spouse", language)}</small>
                </span>
              </span>
              <button>Edit</button>
            </div>
          </article>
          <article className="card settings-card privacy">
            <ShieldCheck />
            <div>
              <h3>Your privacy matters</h3>
              <p>
                Your health information is only shown within this private
                patient portal. Mock data is used in this prototype.
              </p>
              <button className="link">Read privacy information →</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ largeText, darkMode, onLargeText, onDarkMode, logout }: {
  largeText: boolean; darkMode: boolean; onLargeText: () => void;
  onDarkMode: () => void; logout: () => Promise<void>;
}) {
  return <>
    <div className="page-intro"><div><p className="eyebrow">PORTAL SETTINGS</p><h2>Accessibility & appearance</h2><p>Adjust CareLink for comfortable reading and viewing.</p></div></div>
    <div className="settings-page-stack">
      <article className="card settings-card">
        <div className="setting-line"><span><Activity /><span><b>Larger text</b><small>Increase the entire portal display by 30%</small></span></span><button className={`toggle ${largeText ? "on" : ""}`} onClick={onLargeText} aria-label="Toggle larger text" aria-pressed={largeText}><i /></button></div>
        <div className="setting-line"><span><Moon /><span><b>Dark mode</b><small>Use a comfortable low-light colour palette throughout CareLink</small></span></span><button className={`toggle ${darkMode ? "on" : ""}`} onClick={onDarkMode} aria-label="Toggle dark mode" aria-pressed={darkMode}><i /></button></div>
        <div className="setting-line"><span><Bell /><span><b>Notifications</b><small>Appointments and test reminders</small></span></span><button>Manage</button></div>
      </article>
      <button className="logout" onClick={logout}><LogOut /> Sign out of CareLink</button>
    </div>
  </>;
}

export default function HomePage() {
  const [patientData, setPatientData] = useState<CareLinkPatientData | null>(null),
    [accessToken, setAccessToken] = useState(""),
    [sessionStartedAt, setSessionStartedAt] = useState(""),
    [sessionSource, setSessionSource] = useState<"online" | "offline">("online"),
    [pinLocked, setPinLocked] = useState(false),
    [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine),
    [pendingSync, setPendingSync] = useState(false),
    [authLoading, setAuthLoading] = useState(true),
    [page, setPage] = useState<Page>("dashboard"),
    [menu, setMenu] = useState(false),
    [largeText, setLargeText] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("carelink-large-text") === "true"),
    [darkMode, setDarkMode] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("carelink-dark-mode") === "true"),
    [language, setLanguage] = useState<Language>(() => {
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem("carelink-language")
          : null;
      return isLanguage(saved) ? saved : "en";
    });
  const patientId = patientData?.profile.id;
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  useEffect(() => {
    let active = true;
    restorePatientSession()
      .then((session) => {
        if (active && session) {
          setPatientData(session.patient);
          setAccessToken(session.accessToken);
          setSessionStartedAt(session.sessionStartedAt);
          setSessionSource(session.source);
          setPinLocked(!isPinUnlocked(session.userId));
        }
      })
      .catch(() => undefined)
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!patientId || !online) return;
    let cancelled = false;
    const sync = async () => {
      const result = await syncPendingFootChecks(patientId).catch(() => ({ pending: true, synced: 0 }));
      if (!cancelled) setPendingSync(Boolean(result.pending));
      if (accessToken) {
        const refreshed = await refreshPatientCache(patientId, accessToken, sessionStartedAt).catch((cause) => {
          if (cause instanceof Error && cause.message === "SESSION_REVOKED") {
            setPatientData(null);
            setAccessToken("");
            setSessionStartedAt("");
            setSessionSource("online");
          }
          return null;
        });
        if (!cancelled && refreshed) {
          setPatientData(refreshed.patient);
          setSessionSource("online");
        }
      }
    };
    void sync();
    const interval = window.setInterval(sync, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [accessToken, online, patientId, sessionStartedAt]);
  useEffect(() => {
    if (!patientId) return;
    const idleTimeout = 30 * 60 * 1000;
    const enforceIdleTimeout = () => {
      if (loadDeviceMode() !== "shared") return;
      if (isDeviceActivityExpired(patientId, idleTimeout)) {
        lockPinForThisSession(patientId);
        void signOutPatient().finally(() => {
          setPatientData(null);
          setAccessToken("");
          setSessionStartedAt("");
          setSessionSource("online");
          setPage("dashboard");
        });
      }
    };
    const recordActivity = () => touchDeviceActivity(patientId);
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    recordActivity();
    const interval = window.setInterval(enforceIdleTimeout, 15_000);
    enforceIdleTimeout();
    return () => {
      events.forEach((event) => window.removeEventListener(event, recordActivity));
      window.clearInterval(interval);
    };
  }, [patientId]);
  useEffect(() => {
    if (!patientId) return;
    const lockWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        lockPinForThisSession(patientId);
        setPinLocked(true);
      }
    };
    document.addEventListener("visibilitychange", lockWhenHidden);
    window.addEventListener("pagehide", lockWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", lockWhenHidden);
      window.removeEventListener("pagehide", lockWhenHidden);
    };
  }, [patientId]);
  useEffect(() => applyLanguage(language), [language, page, patientData]);
  useEffect(() => {
    document.documentElement.classList.toggle("large-text-mode", largeText);
    document.documentElement.classList.toggle("dark-mode", darkMode);
    return () => {
      document.documentElement.classList.remove("large-text-mode", "dark-mode");
    };
  }, [largeText, darkMode]);
  useEffect(() => {
    const resizeText = (root: ParentNode) => {
      const elements = root instanceof HTMLElement
        ? [root, ...root.querySelectorAll<HTMLElement>("*:not(svg):not(path):not(style):not(script)")]
        : [...root.querySelectorAll<HTMLElement>("*:not(svg):not(path):not(style):not(script)")];
      elements.forEach((element) => {
        if (element instanceof SVGElement || element.tagName === "STYLE" || element.tagName === "SCRIPT") return;
        const saved = element.dataset.carelinkFontSize;
        if (largeText) {
          const original = saved ? Number(saved) : Number.parseFloat(window.getComputedStyle(element).fontSize);
          if (!Number.isFinite(original) || original <= 0) return;
          if (!saved) element.dataset.carelinkFontSize = String(original);
          element.style.setProperty("font-size", `${original * 1.3}px`, "important");
        } else if (saved) {
          element.style.removeProperty("font-size");
          delete element.dataset.carelinkFontSize;
        }
      });
    };
    resizeText(document.body);
    const observer = new MutationObserver((records) => records.forEach((record) =>
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) resizeText(node);
      }),
    ));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [largeText, page, patientData]);
  const changeLanguage = (next: Language) => {
    window.localStorage.setItem("carelink-language", next);
    setLanguage(next);
  };
  const title = useMemo(
    () => page === "settings" ? "Settings" : nav.find((x) => x.id === page)?.label || "Home",
    [page],
  );
  const login = async (email: string, password: string, personalDevice: boolean) => {
    const session = await signInPatient(email, password);
    saveDeviceMode(personalDevice);
    touchDeviceActivity(session.userId);
    setPatientData(session.patient);
    setAccessToken(session.accessToken);
    setSessionStartedAt(session.sessionStartedAt);
    setSessionSource(session.source);
    setPinLocked(true);
  };
  const logout = async () => {
    if (patientId) lockPinForThisSession(patientId);
    await signOutPatient();
    setPatientData(null);
    setAccessToken("");
    setSessionStartedAt("");
    setSessionSource("online");
    setPage("dashboard");
  };
  const toggleLargeText = () => setLargeText((current) => {
    const next = !current; window.localStorage.setItem("carelink-large-text", String(next)); return next;
  });
  const toggleDarkMode = () => setDarkMode((current) => {
    const next = !current; window.localStorage.setItem("carelink-dark-mode", String(next)); return next;
  });
  if (authLoading) return <main className="login-page"><section className="login-side"><Brand /></section><section className="login-panel"><p>Loading your secure patient portal…</p></section></main>;
  if (!patientData) return <Login onLogin={login} language={language} onLanguageChange={changeLanguage} />;
  if (pinLocked) return <PinGate userId={patientData.profile.id} language={language} onUnlocked={() => { unlockPinForThisSession(patientData.profile.id); touchDeviceActivity(patientData.profile.id); setPinLocked(false); }} onLogout={logout} />;
  const go = (p: Page) => {
    setPage(p);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-button close-menu"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {nav.map((n) => (
            <button
              className={page === n.id ? "active" : ""}
              onClick={() => go(n.id)}
              key={n.id}
            >
              <n.icon />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <span>
            <Stethoscope />
          </span>
          <strong>Need help?</strong>
          <p>Contact your care team for support.</p>
          <button>Contact clinic</button>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">{initials(patientData.profile.fullName)}</div>
          <div>
            <strong>{patientData.profile.fullName}</strong>
            <small>{translate(`Patient · ${patientData.profile.patientId}`, language)}</small>
          </div>
          <button className={`sidebar-settings ${page === "settings" ? "active" : ""}`} onClick={() => go("settings")} aria-label="Open settings"><Settings size={18} /></button>
        </div>
      </aside>
      {menu && (
        <button
          className="overlay"
          onClick={() => setMenu(false)}
          aria-label="Close menu"
        />
      )}
      <main className="main">
        <Header
          title={title}
          onMenu={() => setMenu(true)}
          language={language}
          onLanguageChange={changeLanguage}
          patientName={patientData.profile.fullName}
          online={online && sessionSource === "online"}
          pendingSync={pendingSync}
        />
        <div className="content">
          {page === "dashboard" && <Dashboard go={go} data={patientData} language={language} />}{" "}
          {page === "summary" && <SummaryPage go={go} data={patientData} language={language} />}{" "}
          {page === "assistant" && <AssistantPage language={language} data={patientData} accessToken={accessToken} online={online && sessionSource === "online"} onSyncPendingChange={setPendingSync} />}{" "}
          {page === "ckd" && <PossibleRisksPage data={patientData} language={language} />}{" "}
          {page === "results" && <ResultsPage data={patientData} language={language} />}{" "}
          {page === "footcheck" && <FootHealthPage userId={patientData.profile.id} language={language} />}{" "}
          {page === "profile" && <ProfilePage language={language} data={patientData} />}
          {page === "settings" && <SettingsPage largeText={largeText} darkMode={darkMode} onLargeText={toggleLargeText} onDarkMode={toggleDarkMode} logout={logout} />}
        </div>
      </main>
      <nav className="bottom-nav">
        {nav.slice(0, 5).map((n) => (
          <button
            className={page === n.id ? "active" : ""}
            onClick={() => go(n.id)}
            key={n.id}
          >
            <n.icon />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
