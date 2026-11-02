alter table public.direct_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

alter table public.direct_messages alter column body drop not null;
alter table public.direct_messages drop constraint if exists direct_messages_body_check;
alter table public.direct_messages
  add constraint direct_messages_body_check
  check (
    char_length(btrim(coalesce(body, ''))) <= 2000
    and (char_length(btrim(coalesce(body, ''))) > 0 or attachment_path is not null)
  );
alter table public.direct_messages drop constraint if exists direct_messages_attachment_metadata_check;
alter table public.direct_messages
  add constraint direct_messages_attachment_metadata_check
  check (
    (attachment_path is null and attachment_name is null and attachment_type is null and attachment_size is null)
    or (
      attachment_path is not null
      and attachment_name is not null
      and attachment_type is not null
      and attachment_size between 0 and 10485760
    )
  );

grant insert (sender_id, recipient_id, body, attachment_path, attachment_name, attachment_type, attachment_size)
  on public.direct_messages to authenticated;

drop policy if exists "Active users send direct messages" on public.direct_messages;
create policy "Active users send direct messages"
on public.direct_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and sender_id <> recipient_id
  and (attachment_path is null or attachment_path like auth.uid()::text || '/%')
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

insert into storage.buckets (id, name, public, file_size_limit)
values ('inbox-attachments', 'inbox-attachments', false, 10485760)
on conflict (id) do update
set public = false, file_size_limit = 10485760;

drop policy if exists "Active members upload inbox attachments" on storage.objects;
create policy "Active members upload inbox attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'inbox-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_app_role() in ('member', 'admin')
  and public.is_active_member()
);

drop policy if exists "Message participants read inbox attachments" on storage.objects;
create policy "Message participants read inbox attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'inbox-attachments'
  and exists (
    select 1
    from public.direct_messages message
    where message.attachment_path = storage.objects.name
      and (message.sender_id = auth.uid() or message.recipient_id = auth.uid())
  )
);

drop policy if exists "Uploaders delete their inbox attachments" on storage.objects;
create policy "Uploaders delete their inbox attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'inbox-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_app_role() in ('member', 'admin')
  and public.is_active_member()
);

notify pgrst, 'reload schema';
