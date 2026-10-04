create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  patient_id text not null unique,
  full_name text not null,
  email text not null unique,
  date_of_birth date not null,
  diabetes_type text not null,
  diabetes_duration_years integer not null check (diabetes_duration_years >= 0),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ms')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_records (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  record_date date not null,
  record_data jsonb not null,
  nephropathy_input jsonb not null,
  neuropathy_input jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_patient_id_idx on public.profiles(patient_id);

alter table public.profiles enable row level security;
alter table public.patient_records enable row level security;

revoke all on public.profiles from anon;
revoke all on public.patient_records from anon;
grant select on public.profiles to authenticated;
grant select on public.patient_records to authenticated;
grant all on public.profiles to service_role;
grant all on public.patient_records to service_role;

create policy "Patients can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Patients can read their own record"
on public.patient_records for select
to authenticated
using ((select auth.uid()) = user_id);
