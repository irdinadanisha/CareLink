grant delete on table public.chat_conversations to authenticated;

create policy "Patients can delete their own chat conversations"
on public.chat_conversations for delete
to authenticated
using ((select auth.uid()) = user_id);

grant delete on table public.foot_checks to authenticated;

create policy "Patients can delete their own foot checks"
on public.foot_checks for delete
to authenticated
using ((select auth.uid()) = user_id);
