# CareLink

A diabetes care platform with two portals on one database:

- **Patient portal** (`/`): results, plain-language clinical notes, AI-estimated complication risks, an AI assistant, wound photo check, 4 languages (EN, BM, 中文, தமிழ்), dark mode and larger text.
- **Doctor portal** (`/doctor`): search patients, edit lab results, clinical notes, care plan and risk-model inputs, review wound photos. Every save is audit-logged.

Both portals read and write the same Supabase tables, so a doctor's edit appears in the patient's portal on their next load. There is no second dataset to sync.

> Prototype. Not a medical device. Risk figures are Random Forest estimates, not diagnoses. Review privacy and regulatory requirements (e.g. Malaysia's PDPA) before using real patient data.

## Stack

Next.js 16, React 19, TypeScript, Supabase (auth, Postgres, storage), Groq (`openai/gpt-oss-20b`), Recharts, scikit-learn Random Forests exported to JSON and run in the browser.

## Setup

Requires Node.js 22.13 or newer and a free Supabase project.

1. **Install**
   ```bash
   npm install
   ```
2. **Environment.** Copy `.env.example` to `.env.local` and fill in your Supabase URL, publishable key and Groq key.
3. **Database.** In the Supabase SQL editor, run the files in `supabase/migrations/` in filename order:
   1. `202608020001_create_patient_records.sql`
   2. `20260802022923_create_foot_checks.sql`
   3. `20261004000001_doctor_portal.sql` (doctor role, access policies, audit log, language fix)
4. **Demo users.** In Supabase go to Authentication, Users, and add `sarah@example.com` (patient) and `dr.lim@example.com` (doctor) with passwords. Then run `supabase/seed.sql`. It creates their profiles and a sample patient record.
5. **Run**
   ```bash
   npm run dev
   ```
   Patient portal at http://localhost:3000, doctor portal at http://localhost:3000/doctor.

To make any other user a doctor:
```sql
update public.profiles set role = 'doctor' where email = 'someone@clinic.my';
```
(That user needs a row in `profiles` first. See `seed.sql` for the pattern.)

## How the doctor portal syncs with the patient portal

| Doctor edits | Stored in | Patient sees |
|---|---|---|
| Lab results, explanations, trend | `patient_records.record_data.bloodTests` | Test Results page, Home metrics |
| Clinical notes | `record_data.clinicalSummary` | Health Summary page, Home excerpt |
| Medication, BP, eGFR, appointment, HbA1c trend | `record_data` | Home, Summary |
| Risk model inputs | `nephropathy_input`, `neuropathy_input` | Possible Risks page, Home risk cards |

Access is enforced by Postgres Row Level Security, not the UI. Patients can only read their own rows. Doctors (`profiles.role = 'doctor'`) can read all patients and update records. Patients cannot write to `patient_records` at all.

## Project layout

```
app/page.tsx            Patient portal
app/doctor/page.tsx     Doctor portal
app/api/chat/route.ts   AI assistant (server-side, uses the patient's own record)
src/services/           Supabase access, Random Forest inference, chat client
src/i18n/malay.ts       Translation dictionaries (ms, zh, ta)
public/models/*.json    Exported Random Forest models (loaded in the browser)
scripts/                Python scripts that train and export the models
supabase/migrations/    Schema and security policies
supabase/seed.sql       Demo data
```

## Retraining the models

`scripts/export_random_forest.py` and `export_neuropathy_random_forest.py` read a CSV from a hardcoded path (`/Users/irdina/Downloads/data.csv`). The dataset is not in this repo. Change that path, install `pandas scikit-learn joblib`, and run each script to regenerate `public/models/*.json`.

## Known limitations

- Doctors see all patients. A per-doctor assignment table is the recommended next step.
- Saving overwrites the whole record, so simultaneous edits by two doctors resolve as last-write-wins.
- Doctor edits are in English. Patients reading in other languages see translations only where a dictionary entry exists.
- Several patient-portal buttons are still placeholders (Download report, Edit details, Notifications, Contact clinic), and some dashboard text is hardcoded (dates, "0.4% lower than February").
- `app/chatgpt-auth.ts` and `.openai/hosting.json` are unused starter leftovers and can be deleted.
- The doctor portal has not been compiled or tested end to end. Run `npm run build` first and fix any type errors it reports.

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run lint`
