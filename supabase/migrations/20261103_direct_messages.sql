create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint direct_messages_distinct_participants check (sender_id <> recipient_id)
);

create index if not exists direct_messages_recipient_unread_idx
  on public.direct_messages (recipient_id, created_at desc)
  where read_at is null;
create index if not exists direct_messages_sender_created_idx
  on public.direct_messages (sender_id, created_at desc);
create index if not exists direct_messages_recipient_created_idx
  on public.direct_messages (recipient_id, created_at desc);

alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from authenticated;
grant select on public.direct_messages to authenticated;
grant insert (sender_id, recipient_id, body) on public.direct_messages to authenticated;
grant update (read_at) on public.direct_messages to authenticated;

drop policy if exists "Members read their direct messages" on public.direct_messages;
create policy "Members read their direct messages"
on public.direct_messages for select to authenticated
using (
  public.current_app_role() = 'member'
  and public.is_active_member()
  and (sender_id = auth.uid() or recipient_id = auth.uid())
);

drop policy if exists "Members send direct messages" on public.direct_messages;
create policy "Members send direct messages"
on public.direct_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and sender_id <> recipient_id
  and public.current_app_role() = 'member'
  and public.is_active_member()
  and exists (
    select 1
    from public.profiles recipient
    where recipient.id = recipient_id
      and recipient.active = true
      and recipient.role = 'member'
  )
);

drop policy if exists "Recipients mark direct messages read" on public.direct_messages;
create policy "Recipients mark direct messages read"
on public.direct_messages for update to authenticated
using (
  recipient_id = auth.uid()
  and public.current_app_role() = 'member'
  and public.is_active_member()
)
with check (
  recipient_id = auth.uid()
  and read_at is not null
  and public.current_app_role() = 'member'
  and public.is_active_member()
);

notify pgrst, 'reload schema';
