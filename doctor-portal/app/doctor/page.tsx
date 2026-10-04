"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, HeartPulse, LogOut, Menu, Plus, Search, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { predictNephropathyRisk } from "@/src/services/randomForestNephropathyService";
import { predictNeuropathyRisk } from "@/src/services/randomForestNeuropathyService";
import type { PatientRecordData } from "@/src/types";

type Prof = { id: string; email?: string; patient_id: string; full_name: string; diabetes_type: string; diabetes_duration_years: number };
type Inp = Record<string, number | undefined>;
type Appt = { type: string; doctor: string; date: string; time: string };
type RecData = PatientRecordData & { clinicalNotes?: string; summarySource?: string; appointmentHistory?: Appt[] };
type Rec = { record_date: string; record_data: RecData; nephropathy_input: Inp; neuropathy_input: Inp };
type Tab = "overview" | "labs" | "notes" | "care" | "wounds" | "chats" | "security";
type Foot = { id: string; created_at: string; redness: boolean; swelling: boolean; warmth: boolean; url: string };
type ChatSum = { id: string; summary: string; message_count: number; created_at: string };
type Risk = { probability: number; category: string };
type Lab = { k: string; name: string; label: string; match: string[]; unit: string; range: string; lo: number; hi: number; step: string; category: string; explanation: string };

// Standard panel: every patient gets the same tests, units, ranges and patient explanations.
const LABS: Lab[] = [
  { k: "hba1c", name: "HbA1c", label: "HbA1c", match: ["hba1c"], unit: "%", range: "4.0–7.0", lo: 4, hi: 7, step: "0.1", category: "Diabetes", explanation: "HbA1c shows your average blood sugar over the past 2 to 3 months. Lower values mean steadier control." },
  { k: "fbg", name: "Fasting blood glucose", label: "Fasting blood glucose", match: ["fasting"], unit: "mmol/L", range: "4.4–7.0", lo: 4.4, hi: 7, step: "0.1", category: "Diabetes", explanation: "This measures the sugar in your blood after at least 8 hours without food." },
  { k: "creat", name: "Serum creatinine", label: "Serum creatinine", match: ["creatinine"], unit: "µmol/L", range: "45–90", lo: 45, hi: 90, step: "1", category: "Kidney", explanation: "Creatinine is a waste product. Higher levels can mean your kidneys are filtering less well." },
  { k: "egfr", name: "eGFR", label: "Kidney function (eGFR)", match: ["egfr"], unit: "mL/min/1.73m²", range: ">60", lo: 60, hi: Infinity, step: "1", category: "Kidney", explanation: "eGFR estimates how well your kidneys filter your blood. Higher is better, and below 60 needs follow-up." },
  { k: "urea", name: "Blood urea", label: "Blood urea", match: ["urea"], unit: "mmol/L", range: "2.8–8.1", lo: 2.8, hi: 8.1, step: "0.1", category: "Kidney", explanation: "Urea is a waste product from protein. High levels can point to kidney strain or dehydration." },
  { k: "k", name: "Potassium", label: "Potassium", match: ["potassium"], unit: "mmol/L", range: "3.5–5.1", lo: 3.5, hi: 5.1, step: "0.1", category: "Kidney", explanation: "Potassium helps your nerves, muscles and heart work properly. Kidney problems and some medicines can change it." },
  { k: "hb", name: "Haemoglobin", label: "Haemoglobin", match: ["haemoglobin", "hemoglobin"], unit: "g/dL", range: "12.0–17.0", lo: 12, hi: 17, step: "0.1", category: "General", explanation: "Haemoglobin carries oxygen in your blood. Low levels can cause tiredness and are common with kidney disease." },
];
const APPTS = ["Diabetes follow-up", "Kidney review", "Blood test", "Foot check", "Eye screening"];

function Metric({ label, value, sub, cls = "" }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className={`metric-card ${cls}`}>
      <p>{label}</p>
      <h3>{value}</h3>
      <small>{sub}</small>
    </div>
  );
}

const sb = () => getSupabaseBrowserClient();
const findLab = (name: string) => LABS.find((l) => l.match.some((m) => name.toLowerCase().includes(m)));
const statusOf = (l: Lab, n: number) => (n < l.lo ? "Low" : n > l.hi ? (n <= l.hi * 1.1 ? "Slightly above" : "High") : "Normal");
const bpStatus = (s: number, d: number) => (s >= 140 || d >= 90 ? "High" : s >= 130 || d >= 80 ? "Slightly above" : s < 90 || d < 60 ? "Low" : "Normal");
const monthOf = (s: string) => { const d = new Date(s); return isNaN(+d) ? s : d.toLocaleString("en", { month: "short" }); };
const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (s: string, month: "short" | "long" = "short") => new Date(`${s}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month, year: "numeric" });
const to12 = (t: string) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const tone = (p?: number) => (p === undefined ? "" : p < 30 ? "low" : p < 60 ? "moderate" : "high");
const getTest = (r: Rec | null, k: string) => r?.record_data.bloodTests.find((t) => findLab(t.name)?.k === k);

async function ai(body: object) {
  const { data } = await sb().auth.getSession();
  const res = await fetch("/api/doctor-ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify(body) });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error ?? "The AI request failed.");
  return j;
}
function standardise(r: Rec) {
  const bt = r.record_data.bloodTests;
  bt.forEach((t) => {
    const l = findLab(t.name); if (!l) return;
    Object.assign(t, { name: l.name, unit: l.unit, range: l.range, category: l.category, explanation: l.explanation });
    const n = Number(t.value); if (t.value !== "" && !isNaN(n)) t.status = statusOf(l, n);
  });
  const ix = (n: string) => { const l = findLab(n); return l ? LABS.indexOf(l) : 99; };
  bt.sort((a, b) => ix(a.name) - ix(b.name));
}
// New results feed the existing Random Forest models through the same input fields the patient app already reads.
function applyLabs(r: Rec, vals: Record<string, string>, date: string) {
  LABS.forEach((l) => {
    const n = Number(vals[l.k]); if (vals[l.k] === undefined || vals[l.k] === "" || isNaN(n)) return;
    let t = getTest(r, l.k);
    if (!t) { t = { name: l.name, value: "", unit: l.unit, range: l.range, status: "Normal", category: l.category, explanation: l.explanation, date: "", trend: [] }; r.record_data.bloodTests.push(t); }
    if (t.value !== "" && t.date) t.trend = [...t.trend, { month: monthOf(t.date), value: Number(t.value) }].slice(-6);
    t.value = String(n); t.date = fmt(date);
    if (l.k === "hba1c") { r.nephropathy_input.HbA1c = n; r.neuropathy_input.HbA1c = n; r.record_data.trendData = [...r.record_data.trendData, { month: monthOf(date), value: n }].slice(-6); }
    if (l.k === "fbg") { const f = Math.round(n * 180.16) / 10; r.nephropathy_input.FPS = f; r.neuropathy_input.FPS = f; }
    if (l.k === "egfr") r.record_data.kidneyFunction = n;
  });
  const s = Number(vals.sys), d = Number(vals.dia);
  if (vals.sys && vals.dia && !isNaN(s) && !isNaN(d)) { r.record_data.bloodPressure = `${s}/${d}`; for (const x of [r.nephropathy_input, r.neuropathy_input]) { x.SP = s; x.BP = d; } }
  r.record_date = date; standardise(r);
}
function useRisks(rec: Rec | null) {
  const [r, setR] = useState<{ a?: Risk; b?: Risk }>({});
  useEffect(() => {
    if (!rec) return; let on = true;
    Promise.all([predictNephropathyRisk(rec.nephropathy_input), predictNeuropathyRisk(rec.neuropathy_input)]).then(([a, b]) => on && setR({ a, b })).catch(() => {});
    return () => { on = false; };
  }, [rec]);
  return r;
}

const css = `
.dx-list{margin-top:14px!important;gap:3px!important;overflow-y:auto;flex:1;min-height:0}
.sidebar nav.dx-list button{height:auto;padding:10px 14px;display:block;line-height:1.35}
.dx-list b{display:flex;align-items:center;gap:7px;font-size:13px}.dx-list small{display:block;font-size:10px;opacity:.75;margin-top:2px}
.dx-sw{position:relative;margin-top:24px}.dx-sw svg{position:absolute;left:12px;top:12px;color:#9fc1d8}
.dx-search{width:100%;height:40px;border:1px solid #28678f;border-radius:11px;background:#12517e;color:#fff;padding:0 12px 0 36px;font-size:12px}
.dx-search::placeholder{color:#9fc1d8}
.dx-area{width:100%;min-height:86px;border:1px solid #d8e3e0;border-radius:10px;padding:11px 12px;font:inherit;font-size:13px;line-height:1.55;background:#fbfcfc;color:var(--text);resize:vertical}
.input-wrap select{width:100%;height:43px;border:1px solid #d8e3e0;border-radius:10px;padding:0 12px;font-size:12px;background:#fbfcfc;color:var(--text)}
.filter-row{flex-wrap:wrap}.dx-tools{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}.dx-tools p{margin:0;color:var(--muted);font-size:13px}
.dx-notice{margin:0 0 16px}.dx-feet{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}.dx-feet img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;margin-bottom:10px}
.dx-lbl{font-size:11px;font-weight:700;display:block}.dx-gap{margin-bottom:16px}.badge.high{background:#fff0ec;color:#a94835}.dx-h{font-size:17px;margin:26px 0 12px}
`;

export default function DoctorPage() {
  const [me, setMe] = useState<string | null>(null);
  const [docName, setDocName] = useState("Clinician");
  const [booting, setBooting] = useState(true);
  const [patients, setPatients] = useState<Prof[]>([]);
  const [allRecs, setAllRecs] = useState<Record<string, Rec>>({});
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Prof | null>(null);
  const [rec, setRec] = useState<Rec | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [feet, setFeet] = useState<Foot[]>([]);
  const [chatSums, setChatSums] = useState<ChatSum[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeOk, setRevokeOk] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeLog, setRevokeLog] = useState<{ id: string; action: string; created_at: string }[]>([]);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [labVals, setLabVals] = useState<Record<string, string>>({});
  const [labDate, setLabDate] = useState(iso());
  const blankAppt = { type: APPTS[0], doctor: "", date: "", time: "" };
  const [af, setAf] = useState(blankAppt);
  const risks = useRisks(rec);
  const fail = (e: unknown, fb: string) => setMsg({ t: e instanceof Error ? e.message : fb, err: true });

  const loadAll = async (uid: string) => {
    const s = sb();
    const prof = await s.from("profiles").select("role,full_name").eq("id", uid).single();
    if (prof.data?.role !== "doctor") { await s.auth.signOut(); throw new Error("This account is not a doctor account."); }
    const [p, r] = await Promise.all([
      s.from("profiles").select("id,email,patient_id,full_name,diabetes_type,diabetes_duration_years").eq("role", "patient").order("full_name"),
      s.from("patient_records").select("user_id,record_date,record_data,nephropathy_input,neuropathy_input"),
    ]);
    if (p.error) throw new Error(p.error.message);
    setPatients((p.data ?? []) as Prof[]);
    setAllRecs(Object.fromEntries((r.data ?? []).map((x) => [x.user_id, x as Rec])));
    setDocName(prof.data?.full_name ?? "Clinician"); setMe(uid);
  };
  useEffect(() => {
    sb().auth.getSession().then(({ data }) => (data.session ? loadAll(data.session.user.id) : null)).catch(() => {}).finally(() => setBooting(false));
  }, []);

  const open = async (p: Prof) => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    setSel(p); setRec(structuredClone(allRecs[p.id] ?? null)); setDirty(false); setTab("overview"); setMsg(null); setLabOpen(false); setMenu(false); setAf(blankAppt); setRevokeOpen(false); setRevokeOk(false); loadRevokeLog(p.id);
    const s = sb();
    const { data } = await s.from("foot_checks").select("id,created_at,redness,swelling,warmth,image_path").eq("user_id", p.id).order("created_at", { ascending: false });
    setFeet(await Promise.all((data ?? []).map(async (f) => ({ id: f.id, created_at: f.created_at, redness: f.redness, swelling: f.swelling, warmth: f.warmth,
      url: (await s.storage.from("foot-check-images").createSignedUrl(f.image_path, 3600)).data?.signedUrl ?? "" }))));
    const sums = await s.from("chat_summaries").select("id,summary,message_count,created_at,covers_until").eq("patient_id", p.id).order("created_at", { ascending: false });
    setChatSums((sums.data ?? []) as ChatSum[]);
    const since = (sums.data?.[0] as { covers_until?: string } | undefined)?.covers_until ?? "1970-01-01";
    const c = await s.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", p.id).eq("role", "user").gt("created_at", since);
    setNewCount(c.count ?? 0);
  };
  const loadRevokeLog = async (id: string) => {
    const { data } = await sb().from("audit_log").select("id,action,created_at").eq("patient_id", id).ilike("action", "%revoke%").order("created_at", { ascending: false }).limit(10);
    setRevokeLog(data ?? []);
  };
  const revoke = async () => {
    if (!sel) return; setRevoking(true); setMsg(null);
    try {
      const { data } = await sb().auth.getSession();
      const res = await fetch("/api/revoke-session", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify(sel.email ? { email: sel.email } : { patientId: sel.patient_id }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Could not revoke the session.");
      setMsg({ t: `Session revoked for ${sel.full_name}. Their phone will be signed out the next time it connects to the internet.` });
      setRevokeOpen(false); setRevokeOk(false); loadRevokeLog(sel.id);
    } catch (e) { fail(e, "Could not revoke the session."); }
    setRevoking(false);
  };
  const edit = (fn: (r: Rec) => void) => { setRec((cur) => { if (!cur) return cur; const n = structuredClone(cur); fn(n); return n; }); setDirty(true); };
  const note = (rec?.record_data.clinicalNotes ?? "").trim();
  const stale = !!note && note !== rec?.record_data.summarySource;

  const generate = async () => {
    if (!sel || !rec) return;
    if (note.length < 20) return setMsg({ t: "Write the visit notes first (a sentence or two at least).", err: true });
    setAiBusy(true); setMsg(null);
    try {
      const j = await ai({ kind: "note", patientId: sel.id, note });
      edit((r) => { r.record_data.clinicalSummary = { sections: j.sections }; r.record_data.summarySource = note; });
      setMsg({ t: "Summary ready. Check it below, then press Save changes to publish it." });
    } catch (e) { fail(e, "Could not generate the summary."); }
    setAiBusy(false);
  };
  const save = async () => {
    if (!sel || !rec || !me) return;
    setSaving(true); setMsg(null);
    const copy = structuredClone(rec); standardise(copy);
    if (stale) {
      try { const j = await ai({ kind: "note", patientId: sel.id, note }); copy.record_data.clinicalSummary = { sections: j.sections }; copy.record_data.summarySource = note; }
      catch (e) { fail(e, "Could not generate the summary."); setSaving(false); return; }
    }
    const { data, error } = await sb().from("patient_records").update({ ...copy, updated_at: new Date().toISOString() }).eq("user_id", sel.id).select("user_id");
    if (error || !data?.length) setMsg({ t: error?.message ?? "Nothing was saved. Check the doctor policies in the migration.", err: true });
    else {
      await sb().from("audit_log").insert({ doctor_id: me, patient_id: sel.id, action: "update_record", details: { tab } });
      setRec(copy); setAllRecs((a) => ({ ...a, [sel.id]: structuredClone(copy) })); setDirty(false);
      setMsg({ t: "Saved. The patient will see these changes the next time they open CareLink." });
    }
    setSaving(false);
  };
  const summariseChats = async () => {
    if (!sel) return; setAiBusy(true); setMsg(null);
    try { const j = await ai({ kind: "chat", patientId: sel.id }); setChatSums((s) => [j.row, ...s]); setNewCount(0); }
    catch (e) { fail(e, "Could not summarise the conversations."); }
    setAiBusy(false);
  };
  const schedule = () => {
    edit((r) => {
      const cur = r.record_data.appointments[0];
      if (cur?.date) r.record_data.appointmentHistory = [cur, ...(r.record_data.appointmentHistory ?? [])];
      r.record_data.appointments[0] = { type: af.type, doctor: af.doctor.trim() || docName, date: fmt(af.date, "long"), time: to12(af.time) };
    });
    setAf(blankAppt); setMsg({ t: "Appointment scheduled. The previous one is now in history. Press Save changes to publish." });
  };
  const addLabs = () => { edit((r) => applyLabs(r, labVals, labDate)); setLabVals({}); setLabOpen(false); setMsg({ t: "Results added. Risk estimates have been recalculated. Press Save changes to publish." }); };

  const filtered = useMemo(() => patients.filter((p) => (p.full_name + p.patient_id).toLowerCase().includes(q.toLowerCase())), [patients, q]);
  const d = rec?.record_data;
  const appt = d?.appointments[0];
  const hb = (r?: Rec) => Number(getTest(r ?? null, "hba1c")?.value ?? 0);
  const g = (k: string) => getTest(rec, k);

  if (booting) return <p style={{ padding: 40 }}>Loading…</p>;
  if (!me) return <Login onDone={loadAll} />;
  const initials = docName.replace(/^Dr\.?\s*/i, "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const badge = (s: string) => <span className={`badge ${s === "Normal" ? "good" : s === "High" ? "high" : "warn"}`}>{s}</span>;
  const [sys, dia] = (d?.bloodPressure ?? "").split("/").map(Number);

  return (
    <div className="app-shell"><style>{css}</style>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="sidebar-top"><div className="brand"><span className="brand-mark"><HeartPulse size={22} /></span><div><strong>CareLink</strong><small>Clinician portal</small></div></div>
          <button className="icon-button close-menu" onClick={() => setMenu(false)} aria-label="Close menu"><X size={20} /></button></div>
        <div className="dx-sw"><Search size={16} /><input className="dx-search" placeholder="Search name or patient ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search patients" /></div>
        <nav className="dx-list">{filtered.map((p) => { const h = hb(allRecs[p.id]); return (
          <button key={p.id} className={sel?.id === p.id ? "active" : ""} onClick={() => open(p)}>
            <b>{p.full_name}{h >= 9 ? <span className="badge high">HbA1c {h}</span> : h > 7 ? <span className="badge warn">HbA1c {h}</span> : null}</b>
            <small>{p.patient_id} · {p.diabetes_type}</small></button>); })}</nav>
        <div className="sidebar-profile"><div className="avatar">{initials || "DR"}</div><div><strong>{docName}</strong><small>{patients.length} patients</small></div>
          <button className="sidebar-settings" onClick={() => sb().auth.signOut().then(() => location.reload())} aria-label="Sign out"><LogOut size={18} /></button></div>
      </aside>
      {menu && <button className="overlay" onClick={() => setMenu(false)} aria-label="Close menu" />}
      <div className="main">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div><p className="eyebrow">{sel ? sel.patient_id : "CLINICIAN PORTAL"}</p><h1>{sel ? sel.full_name : "Select a patient"}</h1></div>
          <div className="top-actions">{sel && rec && <button className="primary" disabled={!(dirty || stale) || saving} onClick={save}>{saving ? "Saving…" : dirty || stale ? "Save changes" : "Saved"}</button>}</div>
        </header>
        <div className="content">
          {!sel && <div className="card empty-result"><span><HeartPulse size={26} /></span><h3>Choose a patient</h3><p>Pick someone from the list on the left. Patients with HbA1c above target are flagged.</p></div>}
          {sel && !rec && <div className="card empty-result"><h3>No record yet</h3><p>This patient has no health record in the database.</p></div>}
          {sel && rec && d && <>
            {msg && <div className={msg.err ? "validation dx-notice" : "notice dx-notice"} role="status"><p>{msg.t}</p></div>}
            <div className="filter-row" style={{ marginTop: 0 }}>{([["overview", "Overview"], ["labs", "Test results"], ["notes", "Clinical notes"], ["care", "Care plan"], ["wounds", "Wound checks"], ["chats", "AI chat summary"], ["security", "Device security"]] as [Tab, string][]).map(([k, l]) =>
              <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>

            {tab === "overview" && <>
              <div className="metric-grid">
                <Metric label="HbA1c" value={g("hba1c") ? `${g("hba1c")!.value}%` : "—"} sub="Target below 7.0%" />
                <Metric label="Fasting glucose" value={g("fbg") ? `${g("fbg")!.value} mmol/L` : "—"} sub="Target 4.4–7.0" />
                <Metric label="Blood pressure" value={d.bloodPressure || "—"} sub="mmHg" />
                <Metric label="Kidney function (eGFR)" value={String(d.kidneyFunction ?? "—")} sub="Healthy above 60" />
                <Metric label="Nephropathy risk" value={risks.a ? `${risks.a.probability}%` : "…"} sub={risks.a?.category} cls={`risk-highlight ${tone(risks.a?.probability)}`} />
                <Metric label="Neuropathy risk" value={risks.b ? `${risks.b.probability}%` : "…"} sub={risks.b?.category} cls={`risk-highlight ${tone(risks.b?.probability)}`} />
              </div>
              <p className="dx-tools" style={{ display: "block" }}>Risk estimates come from the Random Forest models and update automatically when new test results are added.</p>
              <div className="appointment"><span><CalendarDays size={22} /></span>
                <div><p className="eyebrow">NEXT APPOINTMENT</p><h3>{appt?.type || "None booked"}</h3><p>{appt ? `${appt.doctor || "Care team"}${appt.time ? ` · ${appt.time}` : ""}` : "Schedule one in the Care plan tab"}</p></div>
                {appt?.date && !isNaN(+new Date(appt.date)) && <div className="appointment-date"><strong>{new Date(appt.date).getDate()}</strong><span>{new Date(appt.date).toLocaleString("en", { month: "short" }).toUpperCase()}</span></div>}</div>
            </>}

            {tab === "labs" && <>
              <div className="dx-tools"><p>Standard panel. Units, ranges, status and patient explanations are filled in automatically.</p>
                <button className="primary" onClick={() => setLabOpen((v) => !v)}><Plus size={16} />{labOpen ? "Close" : "Add test results"}</button></div>
              {labOpen && <div className="form-card dx-gap"><fieldset><legend>New results</legend>
                <label className="dx-lbl dx-gap" style={{ maxWidth: 220 }}>Test date<span className="input-wrap"><input type="date" value={labDate} max={iso()} onChange={(e) => setLabDate(e.target.value)} /></span></label>
                <div className="form-grid">{LABS.map((l) => <label key={l.k}>{l.label}<span className="input-wrap"><input type="number" step={l.step} value={labVals[l.k] ?? ""} onChange={(e) => setLabVals((v) => ({ ...v, [l.k]: e.target.value }))} /><em>{l.unit}</em></span><small>Reference {l.range}</small></label>)}
                  <label>Blood pressure, systolic<span className="input-wrap"><input type="number" value={labVals.sys ?? ""} onChange={(e) => setLabVals((v) => ({ ...v, sys: e.target.value }))} /><em>mmHg</em></span><small>Reference below 130</small></label>
                  <label>Blood pressure, diastolic<span className="input-wrap"><input type="number" value={labVals.dia ?? ""} onChange={(e) => setLabVals((v) => ({ ...v, dia: e.target.value }))} /><em>mmHg</em></span><small>Reference below 80</small></label></div></fieldset>
                <button className="primary" onClick={addLabs} disabled={!Object.values(labVals).some((v) => v !== "")}>Add to record</button></div>}
              <div className="results-table"><div className="table-head"><span>Test</span><span>Result</span><span>Reference</span><span>Status</span><span>Date</span></div>
                {LABS.map((l) => { const t = g(l.k); return (
                  <div className="table-row" key={l.k}><span><b>{l.label}</b><small>{l.category}</small></span>
                    <span>{t?.value ? `${t.value} ${l.unit}` : "—"}</span><span>{l.range} {l.unit}</span>
                    <span>{t?.value ? badge(statusOf(l, Number(t.value))) : <span className="badge info">Not recorded</span>}</span><span>{t?.date || "—"}</span></div>); })}
                <div className="table-row"><span><b>Blood pressure</b><small>Heart</small></span><span>{d.bloodPressure ? `${d.bloodPressure} mmHg` : "—"}</span><span>Below 130/80 mmHg</span>
                  <span>{d.bloodPressure && !isNaN(sys) && !isNaN(dia) ? badge(bpStatus(sys, dia)) : <span className="badge info">Not recorded</span>}</span><span>{rec.record_date ? fmt(rec.record_date) : "—"}</span></div></div>
            </>}

            {tab === "notes" && <>
              <div className="form-card"><fieldset><legend>Visit notes</legend>
                <textarea className="dx-area" rows={9} aria-label="Visit notes" placeholder="Summarise today's visit: how the patient is doing, any medication changes, key results, and what they should do next."
                  value={d.clinicalNotes ?? ""} onChange={(e) => edit((r) => { r.record_data.clinicalNotes = e.target.value; })} />
                <small style={{ color: "#93a09e", fontSize: 11 }}>Write in your own words. The AI turns this into the patient&apos;s four-section summary.</small></fieldset>
                <div className="dx-tools" style={{ marginBottom: 0 }}><p>{!note ? "Nothing written yet." : stale ? "The patient summary will update when you save." : "The patient summary is up to date."}</p>
                  <button className="secondary" disabled={aiBusy || !note} onClick={generate}>{aiBusy ? "Generating…" : "Preview patient summary"}</button></div></div>
              <h3 className="dx-h">What the patient will see</h3>
              <div className="summary-sections">{d.clinicalSummary.sections.map((s, i) => <article className="card summary-section" key={i}><span className="number">{i + 1}</span>
                <div><h3>{s.title}</h3><p>{s.text}</p>{s.items && <ul>{s.items.map((x, j) => <li key={j}>{x}</li>)}</ul>}</div></article>)}</div>
            </>}

            {tab === "care" && <>
              <div className="form-card">
                <fieldset><legend>Next appointment</legend><p style={{ margin: 0 }}>{appt?.date ? `${appt.type} with ${appt.doctor} · ${appt.date}${appt.time ? `, ${appt.time}` : ""}` : "None booked."}</p></fieldset>
                <fieldset><legend>Schedule a new appointment</legend><div className="form-grid">
                  <label>Type<span className="input-wrap"><select value={af.type} onChange={(e) => setAf({ ...af, type: e.target.value })}>{APPTS.map((a) => <option key={a}>{a}</option>)}</select></span></label>
                  <label>Doctor<span className="input-wrap"><input value={af.doctor} placeholder={docName} onChange={(e) => setAf({ ...af, doctor: e.target.value })} /></span></label><span />
                  <label>Date<span className="input-wrap"><input type="date" min={iso()} value={af.date} onChange={(e) => setAf({ ...af, date: e.target.value })} /></span></label>
                  <label>Time<span className="input-wrap"><input type="time" value={af.time} onChange={(e) => setAf({ ...af, time: e.target.value })} /></span></label></div>
                  <small style={{ color: "#93a09e", fontSize: 11 }}>The current appointment moves to history.</small></fieldset>
                <button className="primary" disabled={!af.date || !af.time} onClick={schedule}>Schedule appointment</button></div>
              <h3 className="dx-h">Appointment history</h3>
              {(d.appointmentHistory ?? []).length === 0 ? <div className="card"><p style={{ margin: 0, color: "var(--muted)" }}>No past appointments yet.</p></div> :
                <div className="results-table"><div className="table-head"><span>Appointment</span><span>Doctor</span><span>Date</span><span>Time</span><span /></div>
                  {d.appointmentHistory!.map((a, i) => <div className="table-row" key={i}><span><b>{a.type}</b></span><span>{a.doctor}</span><span>{a.date}</span><span>{a.time}</span><span /></div>)}</div>}
            </>}

            {tab === "wounds" && (feet.length === 0 ? <div className="card empty-result"><h3>No wound photos</h3><p>This patient has not uploaded any wound checks.</p></div> :
              <div className="dx-feet">{feet.map((f) => <div className="card" key={f.id}>{f.url && <img src={f.url} alt="Patient wound photo" />}
                <b>{new Date(f.created_at).toLocaleString("en-MY")}</b>
                <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 0", lineHeight: 1.6 }}>Redness: {f.redness ? "Yes" : "No"}<br />Swelling: {f.swelling ? "Yes" : "No"}<br />Warmth: {f.warmth ? "Yes" : "No"}</p></div>)}</div>)}

            {tab === "security" && <>
              <div className="card dx-gap"><h3 style={{ margin: "0 0 8px" }}>Revoke device session</h3>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.65, margin: "0 0 16px" }}>Use this if {sel.full_name} has lost their phone. Confirm who they are first. Their CareLink app is blocked the next time that device connects to the internet.</p>
                {!revokeOpen ? <button className="secondary" style={{ color: "#a94835", borderColor: "#efd5cf" }} onClick={() => setRevokeOpen(true)}>Revoke device session</button> :
                  <div className="notice warning" style={{ display: "block" }}>
                    <label className="check" style={{ marginBottom: 14 }}><input type="checkbox" checked={revokeOk} onChange={(e) => setRevokeOk(e.target.checked)} />I have verified {sel.full_name}&apos;s identity in person.</label>
                    <div className="button-row" style={{ marginTop: 0 }}>
                      <button className="primary" style={{ background: "#c0392b" }} disabled={!revokeOk || revoking} onClick={revoke}>{revoking ? "Revoking…" : "Yes, revoke session"}</button>
                      <button className="secondary" onClick={() => { setRevokeOpen(false); setRevokeOk(false); }}>Cancel</button></div></div>}</div>
              <h3 className="dx-h">Revocation history</h3>
              {revokeLog.length === 0 ? <div className="card"><p style={{ margin: 0, color: "var(--muted)" }}>No sessions have been revoked for this patient.</p></div> :
                <div className="results-table"><div className="table-head"><span>Action</span><span>Date</span><span /><span /><span /></div>
                  {revokeLog.map((r) => <div className="table-row" key={r.id}><span><b>Session revoked</b></span><span>{new Date(r.created_at).toLocaleString("en-MY")}</span><span /><span /><span /></div>)}</div>}
            </>}

            {tab === "chats" && <>
              <div className="dx-tools"><p>{newCount > 0 ? `${newCount} new patient message${newCount > 1 ? "s" : ""} since the last summary.` : "No new patient messages."}</p>
                <button className="primary" disabled={aiBusy || newCount === 0} onClick={summariseChats}>{aiBusy ? "Summarising…" : "Summarise new conversations"}</button></div>
              {chatSums.length === 0 ? <div className="card empty-result"><h3>No summaries yet</h3><p>Conversations the patient has with the CareLink AI assistant are summarised here so you can follow up on their concerns.</p></div> :
                chatSums.map((c) => <article className="card dx-gap" key={c.id}><p className="eyebrow">{new Date(c.created_at).toLocaleString("en-MY")} · {c.message_count} messages</p>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7 }}>{c.summary}</div></article>)}
            </>}
          </>}
        </div>
      </div>
    </div>
  );
}

function Login({ onDone }: { onDone: (uid: string) => Promise<void> }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <section className="login-side">
        <div className="brand"><span className="brand-mark"><HeartPulse size={22} /></span><div><strong>CareLink</strong><small>Clinician portal</small></div></div>
        <div className="login-copy"><span className="hero-icon"><HeartPulse /></span><p className="eyebrow light">FOR YOUR CARE TEAM</p>
          <h1>Keep every patient&apos;s record clear and current.</h1><p>Update test results, notes and care plans. Patients see your changes in their CareLink app.</p></div>
        <p className="side-note">Authorised clinicians only. Every change is recorded.</p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={async (e) => {
          e.preventDefault(); setErr(""); setBusy(true);
          const { data, error } = await sb().auth.signInWithPassword({ email, password: pw });
          if (error || !data.user) { setErr(error?.message ?? "Sign in failed."); setBusy(false); return; }
          try { await onDone(data.user.id); } catch (c) { setErr(c instanceof Error ? c.message : "Sign in failed."); setBusy(false); }
        }}>
          <div><h2>Clinician sign in</h2><p>Use your work email to open the patient dashboard.</p></div>
          <label>Work email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
          <label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
          {err && <p className="validation" role="alert">{err}</p>}
          <button className="primary wide" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button>
        </form>
      </section>
    </main>
  );
}
