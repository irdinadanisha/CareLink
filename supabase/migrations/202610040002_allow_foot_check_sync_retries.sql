grant update on table public.foot_checks to authenticated;

create policy "Patients can update their own foot checks"
on public.foot_checks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
