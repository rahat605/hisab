-- Show bazar, payment, and cash-contribution activity in the shared notification bell.
-- Existing admin announcements continue to use the same notices/read-receipt system.

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Notice',
  body text not null default '',
  image_url text,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.notices
  add column if not exists kind text not null default 'announcement',
  add column if not exists activity_type text,
  add column if not exists entity_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notices_kind_check'
      and conrelid = 'public.notices'::regclass
  ) then
    alter table public.notices
      add constraint notices_kind_check
      check (kind in ('announcement', 'activity'));
  end if;
end
$$;

create index if not exists notices_created_at_idx
  on public.notices(created_at desc);
create index if not exists notices_activity_entity_idx
  on public.notices(activity_type, entity_id)
  where kind = 'activity';

alter table public.notices enable row level security;
grant select, insert, update, delete on public.notices to authenticated;

drop policy if exists "Active users can read notices" on public.notices;
create policy "Active users can read notices"
on public.notices for select to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
    and (public.notices.status = 'published' or p.role = 'admin')
));

drop policy if exists "Admins can post notices" on public.notices;
create policy "Admins can post notices"
on public.notices for insert to authenticated
with check (
  kind = 'announcement'
  and created_by = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.active = true and p.role = 'admin'
  )
);

drop policy if exists "Admins can update notices" on public.notices;
create policy "Admins can update notices"
on public.notices for update to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid() and p.active = true and p.role = 'admin'
))
with check (
  kind = 'announcement'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.active = true and p.role = 'admin'
  )
);

drop policy if exists "Admins can delete notices" on public.notices;
create policy "Admins can delete notices"
on public.notices for delete to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid() and p.active = true and p.role = 'admin'
));

create table if not exists public.notice_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notice_id uuid not null references public.notices(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notice_id)
);

alter table public.notice_reads enable row level security;
grant select, insert, update on public.notice_reads to authenticated;

drop policy if exists "Members read own notice receipts" on public.notice_reads;
drop policy if exists "Users read own notice receipts" on public.notice_reads;
create policy "Users read own notice receipts"
on public.notice_reads for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Members mark own notices read" on public.notice_reads;
drop policy if exists "Users mark own notices read" on public.notice_reads;
create policy "Users mark own notices read"
on public.notice_reads for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own notice receipts" on public.notice_reads;
create policy "Users update own notice receipts"
on public.notice_reads for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.create_financial_activity_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  subject_id uuid;
  actor_id uuid;
  subject_name text;
  actor_name text;
  month_label text;
  next_title text;
  next_body text;
  next_activity_type text;
  next_metadata jsonb;
begin
  actor_id := new.created_by;

  select m.label into month_label
  from public.months m
  where m.id = new.month_id;

  select p.full_name into actor_name
  from public.profiles p
  where p.id = actor_id;

  if tg_table_name = 'bazar_entries' then
    subject_id := new.paid_by;
    select p.full_name into subject_name
    from public.profiles p
    where p.id = subject_id;

    next_title := 'New Bazar Added';
    next_activity_type := 'bazar_added';
    next_body := coalesce(subject_name, actor_name, 'A member')
      || ' added a new bazar entry of ৳' || new.amount::text || '.';
    next_metadata := jsonb_build_object(
      'member_id', subject_id,
      'member_name', coalesce(subject_name, 'A member'),
      'actor_id', actor_id,
      'actor_name', coalesce(actor_name, subject_name, 'A member'),
      'amount', new.amount,
      'items', to_jsonb(new) -> 'items',
      'paid_from_cash', coalesce((to_jsonb(new) ->> 'paid_from_cash') = 'true', false),
      'month', coalesce(month_label, '')
    );
  elsif tg_table_name = 'rent_payments' then
    subject_id := new.user_id;
    select p.full_name into subject_name
    from public.profiles p
    where p.id = subject_id;

    next_title := 'Payment Confirmed';
    next_activity_type := 'payment_confirmed';
    next_body := coalesce(subject_name, 'A member')
      || '''s payment of ৳' || new.amount::text || ' was confirmed.';
    next_metadata := jsonb_build_object(
      'member_id', subject_id,
      'member_name', coalesce(subject_name, 'A member'),
      'actor_id', actor_id,
      'actor_name', coalesce(actor_name, 'Administrator'),
      'amount', new.amount,
      'payment_type', coalesce(new.payment_type, 'rent'),
      'note', coalesce(new.note, ''),
      'month', coalesce(month_label, '')
    );
  elsif tg_table_name = 'cash_contributions' then
    subject_id := new.paid_by;
    select p.full_name into subject_name
    from public.profiles p
    where p.id = subject_id;

    next_title := 'Cash Contribution Added';
    next_activity_type := 'cash_contribution_added';
    next_body := coalesce(subject_name, 'A member')
      || ' contributed ৳' || new.amount::text || ' to Cash in Hand.';
    next_metadata := jsonb_build_object(
      'member_id', subject_id,
      'member_name', coalesce(subject_name, 'A member'),
      'actor_id', actor_id,
      'actor_name', coalesce(actor_name, 'Administrator'),
      'amount', new.amount,
      'note', coalesce(new.note, ''),
      'month', coalesce(month_label, '')
    );
  else
    return new;
  end if;

  insert into public.notices (
    title,
    body,
    status,
    created_by,
    kind,
    activity_type,
    entity_id,
    metadata
  ) values (
    next_title,
    next_body,
    'published',
    actor_id,
    'activity',
    next_activity_type,
    new.id,
    next_metadata
  );

  return new;
end
$$;

drop trigger if exists notify_bazar_added on public.bazar_entries;
create trigger notify_bazar_added
after insert on public.bazar_entries
for each row execute function public.create_financial_activity_notification();

drop trigger if exists notify_payment_confirmed on public.rent_payments;
create trigger notify_payment_confirmed
after insert on public.rent_payments
for each row execute function public.create_financial_activity_notification();

drop trigger if exists notify_cash_contribution_added on public.cash_contributions;
create trigger notify_cash_contribution_added
after insert on public.cash_contributions
for each row execute function public.create_financial_activity_notification();

-- Realtime gives instant updates; the frontend also polls as a fallback.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notices'
  ) then
    alter publication supabase_realtime add table public.notices;
  end if;
exception
  when insufficient_privilege then
    raise notice 'Could not add notices to supabase_realtime; polling will still refresh notifications.';
end
$$;
