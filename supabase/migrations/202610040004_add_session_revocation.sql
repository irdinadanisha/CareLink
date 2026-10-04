alter table public.profiles
  add column if not exists session_revoked_at timestamptz;

comment on column public.profiles.session_revoked_at is
  'When set after a patient session started, the patient app must require a fresh sign-in.';
