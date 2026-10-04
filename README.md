# CareLink

CareLink is an offline-capable, multilingual diabetes care platform for Malaysia. This repository now contains both the patient portal and the doctor portal so judges can review the full workflow from one GitHub submission.

The patient portal brings health summaries, test results, risk estimates, wound monitoring, chat history, and an AI health assistant into one calm, patient-friendly experience. The doctor portal lets clinicians review patients, update blood-test results and clinical notes, and manage follow-up data in the same Supabase project.

The project is built for real-world constraints: patients may have only a phone, intermittent 3G connectivity, and limited access to clinic systems. CareLink keeps essential records and actions available locally, then synchronizes changes when connectivity returns.

## Highlights

- 🌏 English, Bahasa Melayu, Mandarin Chinese, and Tamil interfaces
- 📱 Responsive patient portal designed for phone-first use
- 📴 Offline access to cached patient records, saved conversations, and wound-check photos
- 🔄 Local-first synchronization for pending wound checks and chat history
- 🤖 AI health assistant powered by `openai/gpt-oss-20b` through Groq
- 🧠 Offline assistant responses based on the patient’s saved record
- 📊 Browser-based Random Forest estimates for nephropathy and neuropathy risk
- 🩸 Patient-friendly explanations for HbA1c, glucose, blood pressure, kidney function, and other results
- 📷 Wound health checks with local image storage and symptom-based follow-up guidance
- 🔐 Offline PIN unlock, shared-device timeout, and doctor-triggered session revocation
- 🗂️ Conversation history with deterministic summaries and text downloads
- 🩺 Doctor portal included in `doctor-portal/` for clinician-side updates

## Why CareLink?

Many health portals assume reliable internet access and clinical terminology that patients already understand. CareLink is designed around a different reality: a patient should be able to open her record, understand a result, save a wound photograph, and ask a focused question even when the connection is weak or unavailable.

The portal supports clinicians without presenting itself as a replacement for them. Risk percentages are clearly labelled as model estimates, AI responses are educational, and urgent symptoms are directed to professional or emergency care.

## Repository Layout

```text
.
├─ app/                       Patient portal Next.js app
├─ src/                       Patient portal services, models, types, and translations
├─ supabase/migrations/       Patient portal database migrations
├─ doctor-portal/             Doctor dashboard Next.js app
│  ├─ app/doctor/             Doctor-facing dashboard route
│  ├─ app/api/                Doctor portal API routes
│  ├─ src/                    Doctor portal services and data access
│  └─ supabase/migrations/    Doctor portal schema and policy migrations
└─ README.md                  Combined submission guide
```

## Main Workflows

### Understand health results

The dashboard presents the latest measurements, trends, targets, explanations, and model-estimated complication risks in plain language. Clinical summaries are organized into readable sections instead of dense medical notes.

### Ask the AI assistant

Patients can ask questions about their own saved record. Online requests use the hosted AI assistant and include the selected language. Offline requests use a small deterministic response layer based on saved values such as HbA1c, glucose, kidney function, medication, and the next appointment.

Every conversation is saved locally first. When online, it is synchronized to the `chat_conversations` Supabase table for authorized follow-up workflows.

### Monitor wound health

Patients answer three simple questions about redness, swelling, and warmth, then upload or capture a photograph. The result is saved locally and queued for synchronization when needed.

The guidance is intentionally simple:

- `3/3`: high priority; contact the clinic as soon as possible to reschedule
- `2/3`: contact the clinic and keep watching the wound
- `1/3`: keep watching the wound until the next appointment
- `0/3`: continue routine monitoring

This checklist does not diagnose a wound from a photograph.

### Protect offline records

Patients can create a device PIN for offline records. The app locks again when it returns from the background. If the device is not marked as personal, CareLink automatically signs out after 30 minutes of inactivity.

A doctor portal can revoke a patient’s CareLink app session through the protected `/api/doctor/revoke-patient-session` endpoint. The patient device applies the revocation the next time it reconnects.

## Technology

- Next.js `16.2.6` with React `19`
- TypeScript
- Supabase Auth, Postgres, Storage, and Row Level Security
- Groq SDK using `openai/gpt-oss-20b`
- Recharts for trends and dashboards
- Lucide React for interface icons
- IndexedDB and browser storage for offline records
- Optional ARM64 Docker deployment with Ollama on NVIDIA Jetson

## Getting Started

### Requirements

- Node.js `>=22.13.0`
- npm
- A Supabase project for online authentication and patient data

### Install and run

Patient portal:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Doctor portal:

```bash
cd doctor-portal
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The doctor app redirects its root route to `/doctor`.

From the repository root, after installing the doctor portal dependencies once, you can also run:

```bash
npm run dev:doctor
```

### Environment variables

Create `.env.local` in the patient portal root and another `.env.local` inside `doctor-portal/`. Both apps use the same Supabase project values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
GROQ_API_KEY=your_groq_api_key
SUPABASE_SECRET_KEY=your_server_only_secret_key
```

Never expose `SUPABASE_SECRET_KEY` or `GROQ_API_KEY` to the browser. Variables beginning with `NEXT_PUBLIC_` are intentionally public.

### Database setup

Run the SQL migrations in `supabase/migrations/` and `doctor-portal/supabase/migrations/` against the same Supabase database. They create the patient records, wound checks, chat history, delete policies, doctor access policies, audit logging, and the session-revocation marker used by the application.

The session-revocation migration is:

```text
supabase/migrations/202610040004_add_session_revocation.sql
```

The doctor portal also includes `doctor-portal/supabase/seed.sql` for demo data from the imported clinical dashboard.

### Vercel deployment

Use one GitHub repository with two Vercel projects:

```text
Patient portal root directory: .
Doctor portal root directory: doctor-portal
```

Both Vercel projects should receive the same Supabase environment variables. The patient project also needs the AI/server keys used by its assistant and protected doctor-session endpoint.

## Testing and Verification

```bash
npm run lint
npm run build
npm run lint:doctor
npm run build:doctor
```

The build verifies the Next.js production bundle and the server routes, including the doctor session-revocation endpoint.

For a meaningful manual check, test the portal in this order:

1. Sign in while online and create an offline PIN.
2. Disconnect the device and open the dashboard, chat history, and wound-check history.
3. Save a new chat or wound check while offline.
4. Reconnect and confirm the pending data synchronizes.
5. Change the interface language and verify the patient-facing screens and assistant responses.

## Architecture at a Glance

```text
Patient phone
  ├─ Next.js patient portal
  ├─ IndexedDB: cached records, wound images, pending actions
  ├─ Browser storage: language, chat history, PIN verifier, sync markers
  └─ Service worker: application shell caching

Online services
  ├─ Supabase Auth and Postgres
  ├─ Supabase Storage for wound photographs
  ├─ Groq: openai/gpt-oss-20b
  └─ Doctor portal session-revocation API
```

The browser-based risk models do not require a network request. Online AI requests go through the CareLink server route, which authenticates the patient and retrieves the patient record server-side before calling Groq.

## Privacy and Safety

CareLink handles health information and should be deployed as a secured clinical prototype, not as an unreviewed medical device. Important boundaries include:

- AI responses provide general educational information and do not diagnose or prescribe.
- Random Forest outputs are estimates, not diagnoses.
- The wound checklist does not analyze or diagnose photographs.
- Conversations and wound checks are stored locally and may synchronize to Supabase.
- Doctors should confirm important information through the appropriate clinical workflow.
- Emergency symptoms should be handled by emergency services or a qualified healthcare professional.

The offline PIN protects the application interface and cached workflow. Device-level encryption, operating-system security, secure backups, and clinic identity policies remain important for production deployment.

## Optional Jetson Deployment

CareLink can run as an ARM64 Docker deployment with Ollama on an NVIDIA Jetson. See [`JETSON_DEPLOYMENT.md`](JETSON_DEPLOYMENT.md) for the complete setup, networking, model, and troubleshooting instructions.

```bash
docker compose -f compose.jetson.yml up -d --build
```

## Project Structure

```text
app/
  page.tsx                         Patient portal UI
  api/chat/                        Authenticated AI assistant route
  api/doctor/                      Doctor security actions
  api/local-*                      Local deployment and sync routes
src/services/
  patientDataService.ts            Supabase session and patient cache
  offlineStore.ts                  IndexedDB records and wound images
  chatHistoryService.ts            Local/cloud conversation synchronization
  footCheckService.ts              Wound-check workflow and sync queue
  llamaService.ts                  Online and offline assistant responses
  deviceSecurityService.ts         PIN and shared-device protection
  randomForest*Service.ts          Browser-based risk estimates
src/i18n/malay.ts                  Language dictionaries and fallbacks
supabase/migrations/               Database schema and RLS policies
```

## Contributing and Feedback

CareLink is being developed as a patient-centered clinical technology project. Useful contributions include:

- testing offline and low-connectivity workflows on real phones
- reviewing translations with native speakers
- checking accessibility and readability
- improving clinical safety copy with qualified professionals
- proposing issues or usability improvements

Please open an issue with clear reproduction steps, device/browser details, language, and whether the test was online or offline.

## Team

CareLink is built by a student project team focused on making health information easier to understand and more usable across Malaysia’s multilingual communities.
