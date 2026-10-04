create table public.foot_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  redness boolean not null,
  swelling boolean not null,
  warmth boolean not null,
  symptom_count smallint generated always as (
    redness::integer + swelling::integer + warmth::integer
  ) stored,
  image_path text not null,
  recommendation text not null check (recommendation in ('monitor', 'doctor_attention')),
  created_at timestamptz not null default now()
);

create index foot_checks_user_created_idx
  on public.foot_checks (user_id, created_at desc);

alter table public.foot_checks enable row level security;
revoke all on table public.foot_checks from anon;
grant select, insert on table public.foot_checks to authenticated;
grant all on table public.foot_checks to service_role;

create policy "Patients can read their own foot checks"
on public.foot_checks for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Patients can create their own foot checks"
on public.foot_checks for insert
to authenticated
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foot-check-images',
  'foot-check-images',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Patients can upload their own foot images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'foot-check-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Patients can view their own foot images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'foot-check-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Patients can delete their own foot images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'foot-check-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
