-- Member contact directory managed by administrators.
create table if not exists public.member_contacts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Flatmate','Caretaker','Maid','Emergency')),
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_contacts enable row level security;
grant select, insert, update, delete on public.member_contacts to authenticated;
drop policy if exists "Members can view contacts" on public.member_contacts;
create policy "Members can view contacts" on public.member_contacts
for select to authenticated using (true);
drop policy if exists "Admins manage contacts" on public.member_contacts;
create policy "Admins manage contacts" on public.member_contacts
for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) = 'admin')
);
