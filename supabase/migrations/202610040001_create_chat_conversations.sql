create table if not exists public.chat_conversations (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  language text not null default 'en' check (language in ('en', 'ms', 'zh', 'ta')),
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_conversations_user_updated_idx
  on public.chat_conversations (user_id, updated_at desc);

alter table public.chat_conversations enable row level security;
revoke all on table public.chat_conversations from anon;
grant select, insert, update on table public.chat_conversations to authenticated;
grant all on table public.chat_conversations to service_role;

create policy "Patients can read their own chat conversations"
on public.chat_conversations for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Patients can create their own chat conversations"
on public.chat_conversations for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Patients can update their own chat conversations"
on public.chat_conversations for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
