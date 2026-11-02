drop policy if exists "Members read their direct messages" on public.direct_messages;
create policy "Active users read their direct messages"
on public.direct_messages for select to authenticated
using (
  public.current_app_role() in ('member', 'admin')
  and public.is_active_member()
  and (sender_id = auth.uid() or recipient_id = auth.uid())
);

drop policy if exists "Members send direct messages" on public.direct_messages;
create policy "Active users send direct messages"
on public.direct_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and sender_id <> recipient_id
  and public.current_app_role() in ('member', 'admin')
  and public.is_active_member()
  and exists (
    select 1
    from public.profiles recipient
    where recipient.id = recipient_id
      and recipient.active = true
      and recipient.role in ('member', 'admin')
  )
);

drop policy if exists "Recipients mark direct messages read" on public.direct_messages;
create policy "Active recipients mark direct messages read"
on public.direct_messages for update to authenticated
using (
  recipient_id = auth.uid()
  and public.current_app_role() in ('member', 'admin')
  and public.is_active_member()
)
with check (
  recipient_id = auth.uid()
  and read_at is not null
  and public.current_app_role() in ('member', 'admin')
  and public.is_active_member()
);

notify pgrst, 'reload schema';
