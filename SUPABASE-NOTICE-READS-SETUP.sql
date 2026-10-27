-- Run once in Supabase SQL Editor. Enables reliable per-user read status for notices.
create table if not exists public.notice_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notice_id uuid not null references public.notices(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notice_id)
);

alter table public.notice_reads enable row level security;
grant select, insert, update on public.notice_reads to authenticated;

drop policy if exists "Members read own notice receipts" on public.notice_reads;
create policy "Users read own notice receipts"
  on public.notice_reads for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Members mark own notices read" on public.notice_reads;
create policy "Users mark own notices read"
  on public.notice_reads for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own notice receipts" on public.notice_reads;
create policy "Users update own notice receipts"
  on public.notice_reads for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
