create table if not exists public.doctor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  clinic_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.doctor_patient_assignments (
  doctor_id uuid not null references public.doctor_profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (doctor_id, patient_id)
);

create table if not exists public.clinical_test_panels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  panel_date date not null,
  doctor_id uuid references public.doctor_profiles(id) on delete set null,
  doctor_name text,
  notes text,
  tests jsonb not null default '[]'::jsonb,
  systolic_bp numeric,
  diastolic_bp numeric,
  bmi numeric,
  medication text,
  model_input jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note_date date not null,
  doctor_id uuid references public.doctor_profiles(id) on delete set null,
  doctor_name text,
  title text not null default 'Clinical note',
  raw_text text not null,
  summary_sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinical_test_panels_user_date_idx
  on public.clinical_test_panels (user_id, panel_date desc, created_at desc);

create index if not exists clinical_notes_user_date_idx
  on public.clinical_notes (user_id, note_date desc, created_at desc);

create index if not exists doctor_patient_assignments_patient_idx
  on public.doctor_patient_assignments (patient_id);

alter table public.doctor_profiles enable row level security;
alter table public.doctor_patient_assignments enable row level security;
alter table public.clinical_test_panels enable row level security;
alter table public.clinical_notes enable row level security;

revoke all on table public.doctor_profiles from anon;
revoke all on table public.doctor_patient_assignments from anon;
revoke all on table public.clinical_test_panels from anon;
revoke all on table public.clinical_notes from anon;

grant select, insert, update on table public.doctor_profiles to authenticated;
grant select on table public.doctor_patient_assignments to authenticated;
grant select, insert, update, delete on table public.clinical_test_panels to authenticated;
grant select, insert, update, delete on table public.clinical_notes to authenticated;
grant all on table public.doctor_profiles to service_role;
grant all on table public.doctor_patient_assignments to service_role;
grant all on table public.clinical_test_panels to service_role;
grant all on table public.clinical_notes to service_role;

create policy "Doctors can read their own profile"
on public.doctor_profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Doctors can create their own profile"
on public.doctor_profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Doctors can update their own profile"
on public.doctor_profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Assigned doctors can read their assignments"
on public.doctor_patient_assignments for select
to authenticated
using ((select auth.uid()) = doctor_id or (select auth.uid()) = patient_id);

create policy "Patients and assigned doctors can read test panels"
on public.clinical_test_panels for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_test_panels.user_id
      and assignment.doctor_id = (select auth.uid())
  )
);

create policy "Assigned doctors can create test panels"
on public.clinical_test_panels for insert
to authenticated
with check (
  exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_test_panels.user_id
      and assignment.doctor_id = (select auth.uid())
  )
);

create policy "Assigned doctors can update test panels"
on public.clinical_test_panels for update
to authenticated
using (
  exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_test_panels.user_id
      and assignment.doctor_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_test_panels.user_id
      and assignment.doctor_id = (select auth.uid())
  )
);

create policy "Assigned doctors can delete test panels"
on public.clinical_test_panels for delete
to authenticated
using (
  exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_test_panels.user_id
      and assignment.doctor_id = (select auth.uid())
  )
);

create policy "Patients and assigned doctors can read clinical notes"
on public.clinical_notes for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_notes.user_id
      and assignment.doctor_id = (select auth.uid())
  )
);

create policy "Assigned doctors can create clinical notes"
on public.clinical_notes for insert
to authenticated
with check (
  exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_notes.user_id
      and assignment.doctor_id = (select auth.uid())
  )
);

create policy "Assigned doctors can update clinical notes"
on public.clinical_notes for update
to authenticated
using (
  exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_notes.user_id
      and assignment.doctor_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_notes.user_id
      and assignment.doctor_id = (select auth.uid())
  )
);

create policy "Assigned doctors can delete clinical notes"
on public.clinical_notes for delete
to authenticated
using (
  exists (
    select 1
    from public.doctor_patient_assignments assignment
    where assignment.patient_id = clinical_notes.user_id
      and assignment.doctor_id = (select auth.uid())
  )
);

do $$
begin
  alter publication supabase_realtime add table public.clinical_test_panels;
exception
  when undefined_object then null;
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.clinical_notes;
exception
  when undefined_object then null;
  when duplicate_object then null;
end $$;
