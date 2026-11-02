grant delete on public.direct_messages to authenticated;

drop policy if exists "Active users delete their direct messages" on public.direct_messages;
create policy "Active users delete their direct messages"
on public.direct_messages for delete to authenticated
using (
  public.current_app_role() in ('member', 'admin')
  and public.is_active_member()
  and (sender_id = auth.uid() or recipient_id = auth.uid())
);

drop policy if exists "Uploaders delete their inbox attachments" on storage.objects;
drop policy if exists "Conversation participants delete inbox attachments" on storage.objects;
create policy "Conversation participants delete inbox attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'inbox-attachments'
  and public.current_app_role() in ('member', 'admin')
  and public.is_active_member()
  and exists (
    select 1
    from public.direct_messages message
    where message.attachment_path = storage.objects.name
      and (message.sender_id = auth.uid() or message.recipient_id = auth.uid())
  )
);
