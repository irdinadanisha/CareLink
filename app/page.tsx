"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Bot,
  Camera,
  CalendarDays,
  ClipboardList,
  Droplets,
  Eye,
  EyeOff,
  HeartPulse,
  Home,
  Info,
  Languages,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Pill,
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
import type { ChatMessage, Page } from "@/src/types";
import { KidneysIcon } from "@/src/components/KidneysIcon";
import { NeuropathyIcon } from "@/src/components/NeuropathyIcon";
import { applyLanguage, type Language } from "@/src/i18n/malay";
import {
  restorePatientSession,
  signInPatient,
  signOutPatient,
} from "@/src/services/patientDataService";
import type { CareLinkPatientData } from "@/src/types";
import { listFootChecks, saveFootCheck, type FootCheckRecord } from "@/src/services/footCheckService";

const initials = (name: string) =>
  name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

const displayDate = (date: string) =>
  new Intl.DateTimeFormat("en-MY", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );

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
  const tone = /good|stable|low|normal/i.test(status)
    ? "good"
    : /high|attention|above/i.test(status)
      ? "warn"
      : "info";
  return (
    <span className={`badge ${tone}`}>
      <span aria-hidden="true">●</span>
      {status}
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
}: {
  title: string;
  onMenu: () => void;
  language: Language;
  onLanguageChange: () => void;
  patientName: string;
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
        <button
          className="language-button"
          onClick={onLanguageChange}
          aria-label={
            language === "en" ? "Tukar ke Bahasa Melayu" : "Switch to English"
          }
        >
          <Languages size={18} />
          <span>{language === "en" ? "BM" : "EN"}</span>
        </button>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={21} />
          <i />
        </button>
        <div className="avatar">{initials(patientName)}</div>
      </div>
    </header>
  );
}

function Login({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <form
          className="login-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true); setError("");
            try { await onLogin(email, password); }
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
              <input type="checkbox" defaultChecked /> Remember me
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

function Dashboard({ go, data }: { go: (p: Page) => void; data: CareLinkPatientData }) {
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
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">SATURDAY, 1 AUGUST 2026</p>
          <h2>
            Good morning, {data.profile.fullName.split(" ")[0]} <span>👋</span>
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
          <h3>Your condition currently {overallStatus === "Stable" ? "appears stable" : "needs attention"}.</h3>
          <p>{overallMessage}</p>
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
              <p>{m.name}</p>
              <h3>{m.value}</h3>
              <small>{m.range}</small>
              <div className="divider" />
              <p className="explain">{m.explanation}</p>
              <time>{m.date}</time>
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
          <blockquote>“{data.record.clinicalSummary.sections[0]?.text}”</blockquote>
          <p>{data.record.clinicalSummary.sections[1]?.text}</p>
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
                <p>{s.text}</p>
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
          <h3>{data.record.appointments[0]?.type}</h3>
          <p>{data.record.appointments[0]?.doctor} · Diabetes Clinic</p>
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

function SummaryPage({ go, data }: { go: (p: Page) => void; data: CareLinkPatientData }) {
  const [original, setOriginal] = useState(false);
  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">LAST UPDATED {displayDate(data.recordDate).toUpperCase()}</p>
          <h2>Your Clinical Notes, Explained Simply</h2>
          <p>
            A patient-friendly explanation of your latest visit with {data.record.appointments[0]?.doctor}.
          </p>
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
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                {s.items && (
                  <ul>
                    {s.items.map((x) => (
                      <li key={x}>{x}</li>
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
function AssistantPage({ language, data, accessToken }: { language: Language; data: CareLinkPatientData; accessToken: string }) {
  const initial: ChatMessage[] = [
    {
      id: "1",
      role: "assistant",
      content: `Hello ${data.profile.fullName.split(" ")[0]} — I can help explain your diabetes results and care plan in clear, everyday language. What would you like to understand?`,
      time: "9:41 AM",
    },
  ];
  const [messages, setMessages] = useState(initial),
    [text, setText] = useState(""),
    [typing, setTyping] = useState(false);
  async function send(value = text) {
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
      const reply = await sendMessageToLlama(value, { conversation, language, accessToken });
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
          <p className="eyebrow">GROQ · LLAMA 3.3 70B</p>
          <h2>AI Health Assistant</h2>
          <p>Ask questions about your diabetes, results, and care plan.</p>
        </div>
        <button className="secondary" onClick={() => setMessages(initial)}>
          <Trash2 size={17} /> Clear conversation
        </button>
      </div>
      <Notice kind="warning">
        This AI provides general educational information. It does not diagnose,
        prescribe treatment, or replace your doctor.
      </Notice>
      <div className="chat-shell">
        <div className="chat-head">
          <div className="bot-avatar">
            <Bot />
          </div>
          <div>
            <h3>Care Assistant</h3>
            <p>
              <span /> Powered by Llama 3.3 70B
            </p>
          </div>
          <button
            className="icon-button"
            onClick={() => setMessages(initial)}
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
                <div className="bubble">{m.content}</div>
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
          {starters.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={typing}>
              {s}
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
            placeholder="Ask about your health records…"
            aria-label="Message"
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
    </>
  );
}

type RiskResult = Awaited<ReturnType<typeof predictNephropathyRisk>>;

function RiskCard({
  title,
  kind,
  result,
  recordDate,
}: {
  title: string;
  kind: "nephropathy" | "neuropathy";
  result: RiskResult;
  recordDate: string;
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
          <h3>{title}</h3>
        </div>
        <StatusBadge status={result.category} />
      </div>
      <p className="risk-description">{description}</p>
      <div className="severity prominent">
        <div className="severity-label">
          <span>Risk progression</span>
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
          <span>0% · Low</span>
          <span>30% · Moderate</span>
          <span>60% · High</span>
          <span>100%</span>
        </div>
      </div>
      <div className="risk-value">
        <strong>{result.probability}%</strong>
        <span>estimated probability</span>
      </div>
      <p>{result.explanation}</p>
      <div className="divider" />
      <h4>Information used by the model</h4>
      <ul>
        {result.factors.map((x) => (
          <li key={x}>
            <span>✓</span>
            {x}
          </li>
        ))}
      </ul>
      <h4>Recommended next step</h4>
      <p>
        {recommendation} Do not change medication or care based on this result.
      </p>
      <time>Blood test record · {displayDate(recordDate)}</time>
      <div className="model-performance">
        <span>
          Model test accuracy <b>{(result.modelAccuracy * 100).toFixed(2)}%</b>
        </span>
        <span>
          Model ROC-AUC <b>{result.rocAuc.toFixed(4)}</b>
        </span>
      </div>
    </article>
  );
}

function PossibleRisksPage({ data }: { data: CareLinkPatientData }) {
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
          />
          <RiskCard
            title="Neuropathy risk"
            kind="neuropathy"
            result={neuropathy}
            recordDate={data.recordDate}
          />
        </div>
      )}
    </>
  );
}

function ResultsPage({ data }: { data: CareLinkPatientData }) {
  const bloodTests = data.record.bloodTests;
  const [filter, setFilter] = useState("Latest results"),
    [selected, setSelected] = useState(bloodTests[0]);
  const visible = bloodTests.filter((t) =>
    filter === "Abnormal results"
      ? t.status !== "Normal"
      : filter === "Kidney-related"
        ? t.category === "Kidney"
        : filter === "Diabetes-related"
          ? t.category === "Diabetes"
          : true,
  );
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
              className={`table-row ${selected.name === t.name ? "selected" : ""}`}
              onClick={() => setSelected(t)}
              key={t.name}
            >
              <span>
                <b>{t.name}</b>
                <small>{t.category}</small>
              </span>
              <span>
                <strong>{t.value}</strong> {t.unit}
              </span>
              <span>{t.range}</span>
              <span>
                <StatusBadge status={t.status} />
              </span>
              <span>{t.date}</span>
            </button>
          ))}
        </div>
        <aside className="card result-detail">
          <p className="eyebrow">RESULT EXPLAINED</p>
          <span className="soft-icon">
            <Droplets />
          </span>
          <h3>{selected.name}</h3>
          <div className="detail-value">
            <strong>{selected.value}</strong>
            <span>{selected.unit}</span>
          </div>
          <StatusBadge status={selected.status} />
          <p>{selected.explanation}</p>
          <div className="mini-chart">
            <TrendChart data={selected.trend.map((value, index) => typeof value === "number" ? ({ month: ["Feb", "May"][index], value }) : value)} />
          </div>
          <Notice>
            One result alone does not tell the full story. Your doctor will
            consider this alongside your overall health.
          </Notice>
        </aside>
      </div>
    </>
  );
}

type FootAnswers = { redness: boolean | null; swelling: boolean | null; warmth: boolean | null };

function FootHealthPage({ userId }: { userId: string }) {
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
    listFootChecks().then(setHistory).catch(() => {});
  }, []);
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
      setHistory(await listFootChecks());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The wound check could not be saved.");
    } finally { setSubmitting(false); }
  };
  const reset = () => {
    setAnswers({ redness: null, swelling: null, warmth: null });
    setImage(null); setResult(null); setError("");
  };
  const questions: { key: keyof FootAnswers; title: string; hint: string }[] = [
    { key: "redness", title: "Is the wound or surrounding skin redder than usual?", hint: "Look for new redness, spreading redness, or a noticeable change from your usual skin colour." },
    { key: "swelling", title: "Is there new swelling around the wound or affected area?", hint: "Look for new puffiness, tight-looking skin, or a clear difference from the surrounding area." },
    { key: "warmth", title: "Does the area feel unusually warm?", hint: "Compare it gently with nearby unaffected skin or the same area on the other side of your body. A photo cannot measure warmth." },
  ];
  return <>
    <div className="page-intro"><div><p className="eyebrow">SKIN & WOUND MONITORING</p><h2>Wound Health Check</h2><p>Record warning signs around a wound or affected skin area and save a photograph for your care history.</p></div></div>
    <Notice kind="warning">This checklist does not analyse or diagnose the photograph. If you have an open wound, pus, fever, black or blue skin, rapidly spreading redness, or severe swelling, seek urgent medical help.</Notice>
    <div className="foot-check-layout">
      <section className="card foot-check-form">
        <div className="foot-step"><span>1</span><div><h3>Check for warning signs</h3><p>Answer all three questions before adding a photograph.</p></div></div>
        <div className="foot-questions">
          {questions.map((question) => <article key={question.key} className="foot-question">
            <div><h4>{question.title}</h4><p>{question.hint}</p></div>
            <div className="yes-no" role="group" aria-label={question.title}>
              {[false, true].map((value) => <button key={String(value)} className={answers[question.key] === value ? "selected" : ""} onClick={() => setAnswers((current) => ({ ...current, [question.key]: value }))}>{value ? "Yes" : "No"}</button>)}
            </div>
          </article>)}
        </div>
        {answered && <>
          <div className="foot-step second"><span>2</span><div><h3>Add a current photograph</h3><p>Use good lighting and show the wound or affected area together with some surrounding skin. JPEG, PNG, or WebP; maximum 8 MB.</p></div></div>
          <div className="image-actions">
            <button type="button" className="primary" onClick={() => setCameraOpen(true)}><Camera size={18} /> Use camera</button>
            <label className="secondary"><Upload size={18} /> Upload image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} /></label>
          </div>
          {preview && <div className="foot-preview"><img src={preview} alt="Selected wound check" /><span>{image?.name}</span></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary wide save-foot-check" disabled={!image || submitting} onClick={submit}>{submitting ? "Saving securely…" : "Save wound health check"}</button>
        </>}
      </section>
      <aside className="card foot-history">
        <p className="eyebrow">YOUR RECORDS</p><h3>Previous checks</h3>
        {history.length === 0 ? <p>No wound health checks saved yet.</p> : history.map((check) => <article key={check.id}>
          {check.imageUrl && <img src={check.imageUrl} alt="Previously uploaded wound check" />}
          <div><strong>{check.symptomCount}/3 signs reported</strong><small>{new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(check.createdAt))}</small><span className={check.recommendation === "doctor_attention" ? "attention" : "monitor"}>{check.recommendation === "doctor_attention" ? "Doctor’s attention advised" : "Continue monitoring"}</span></div>
        </article>)}
      </aside>
    </div>
    {cameraOpen && <div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="camera-title">
      <div className="camera-dialog">
        <div className="camera-head"><div><p className="eyebrow">LIVE CAMERA</p><h2 id="camera-title">Take a current photograph</h2></div><button type="button" className="icon-button" onClick={() => setCameraOpen(false)} aria-label="Close camera"><X /></button></div>
        <div className="camera-view"><video ref={videoRef} autoPlay playsInline muted />{cameraError && <p role="alert">{cameraError}</p>}</div>
        <p className="camera-guidance">Use good lighting and keep the wound or affected area clearly visible.</p>
        <div className="camera-actions"><button type="button" className="secondary" onClick={() => setCameraOpen(false)}>Cancel</button><button type="button" className="primary" onClick={captureImage} disabled={Boolean(cameraError)}><Camera size={18} /> Capture photograph</button></div>
      </div>
    </div>}
    {result && <div className="result-modal" role="dialog" aria-modal="true" aria-labelledby="foot-result-title"><div className={`result-dialog ${result.recommendation}`}>
      <span className="result-symbol">{result.recommendation === "doctor_attention" ? "!" : "✓"}</span>
      <h2 id="foot-result-title">{result.recommendation === "doctor_attention" ? "This needs a doctor’s attention" : result.symptomCount === 1 ? "Keep a close eye on the affected area" : "No warning signs reported"}</h2>
      <p>{result.recommendation === "doctor_attention" ? `You reported ${result.symptomCount} of 3 warning signs. Contact your doctor or diabetes care team promptly for advice.` : result.symptomCount === 1 ? "You reported 1 of 3 warning signs. Monitor the area closely and seek medical help immediately if it worsens or another sign appears." : "Continue checking the wound or affected area and contact your care team if redness, swelling, warmth, discharge, or colour changes develop."}</p>
      <p className="result-note">Your answers and photograph have been saved privately to your CareLink record. This is not an AI diagnosis.</p>
      <button className="primary wide" onClick={reset}>Done</button>
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
              <strong>{language === "ms" ? "Bahasa Melayu" : "English"}</strong>
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
                  <small>Ahmad Zain · Spouse</small>
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
    [authLoading, setAuthLoading] = useState(true),
    [page, setPage] = useState<Page>("dashboard"),
    [menu, setMenu] = useState(false),
    [largeText, setLargeText] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("carelink-large-text") === "true"),
    [darkMode, setDarkMode] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("carelink-dark-mode") === "true"),
    [language, setLanguage] = useState<Language>(() =>
      typeof window !== "undefined" && window.localStorage.getItem("carelink-language") === "ms" ? "ms" : "en",
    );
  useEffect(() => {
    let active = true;
    restorePatientSession().then((session) => {
      if (active && session) {
        setPatientData(session.patient);
        setAccessToken(session.accessToken);
      }
    }).finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);
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
  const changeLanguage = () =>
    setLanguage((current) => {
      const next = current === "en" ? "ms" : "en";
      window.localStorage.setItem("carelink-language", next);
      return next;
    });
  const title = useMemo(
    () => page === "settings" ? "Settings" : nav.find((x) => x.id === page)?.label || "Home",
    [page],
  );
  const login = async (email: string, password: string) => {
    const session = await signInPatient(email, password);
    setPatientData(session.patient);
    setAccessToken(session.accessToken);
  };
  const logout = async () => { await signOutPatient(); setPatientData(null); setAccessToken(""); setPage("dashboard"); };
  const toggleLargeText = () => setLargeText((current) => {
    const next = !current; window.localStorage.setItem("carelink-large-text", String(next)); return next;
  });
  const toggleDarkMode = () => setDarkMode((current) => {
    const next = !current; window.localStorage.setItem("carelink-dark-mode", String(next)); return next;
  });
  if (authLoading) return <main className="login-page"><section className="login-side"><Brand /></section><section className="login-panel"><p>Loading your secure patient portal…</p></section></main>;
  if (!patientData) return <Login onLogin={login} />;
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
            <small>Patient · {patientData.profile.patientId}</small>
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
        />
        <div className="content">
          {page === "dashboard" && <Dashboard go={go} data={patientData} />}{" "}
          {page === "summary" && <SummaryPage go={go} data={patientData} />}{" "}
          {page === "assistant" && <AssistantPage language={language} data={patientData} accessToken={accessToken} />}{" "}
          {page === "ckd" && <PossibleRisksPage data={patientData} />}{" "}
          {page === "results" && <ResultsPage data={patientData} />}{" "}
          {page === "footcheck" && <FootHealthPage userId={patientData.profile.id} />}{" "}
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
