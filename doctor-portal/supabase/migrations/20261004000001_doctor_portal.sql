-- Doctor portal: role, access policies, audit log.
-- Doctors read/write the SAME tables the patient portal reads, so edits sync automatically.

alter table public.profiles
  add column if not exists role text not null default 'patient' check (role in ('patient','doctor'));

-- Fixes a mismatch: the patient app supports zh and ta, the old constraint only allowed en/ms.
alter table public.profiles drop constraint if exists profiles_preferred_language_check;
alter table public.profiles add constraint profiles_preferred_language_check
  check (preferred_language in ('en','ms','zh','ta'));

create or replace function public.is_doctor() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'doctor');
$$;

create policy "Doctors read profiles" on public.profiles
  for select to authenticated using (public.is_doctor());
create policy "Doctors read records" on public.patient_records
  for select to authenticated using (public.is_doctor());
create policy "Doctors update records" on public.patient_records
  for update to authenticated using (public.is_doctor()) with check (public.is_doctor());
grant update on public.patient_records to authenticated; -- RLS still blocks patients

create policy "Doctors read foot checks" on public.foot_checks
  for select to authenticated using (public.is_doctor());
create policy "Doctors view foot images" on storage.objects
  for select to authenticated using (bucket_id = 'foot-check-images' and public.is_doctor());

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon;
grant select, insert on public.audit_log to authenticated;
create policy "Doctors write own audit entries" on public.audit_log
  for insert to authenticated with check (public.is_doctor() and doctor_id = (select auth.uid()));
create policy "Doctors read audit log" on public.audit_log
  for select to authenticated using (public.is_doctor());

-- Make a doctor: create the user in Supabase Auth, insert a profiles row for them, then:
--   update public.profiles set role = 'doctor' where email = 'dr.lim@clinic.my';
