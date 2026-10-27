-- Monthly Hisab payment methods: admin-managed details visible to authenticated household members.
create table if not exists public.payment_options (
  provider text primary key check (provider in ('bkash','nagad','brac_bank','islami_bank')),
  label text not null,
  account_name text not null default '',
  account_number text not null default '',
  instructions text not null default '',
  logo_url text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.payment_options enable row level security;
grant select, insert, update, delete on public.payment_options to authenticated;

drop policy if exists "Active members can read payment options" on public.payment_options;
create policy "Active members can read payment options"
  on public.payment_options for select to authenticated
  using (public.is_active_member());

drop policy if exists "Admins manage payment options" on public.payment_options;
create policy "Admins manage payment options"
  on public.payment_options for all to authenticated
  using (public.current_app_role() = 'admin' and public.is_active_member())
  with check (public.current_app_role() = 'admin' and public.is_active_member());

insert into public.payment_options(provider,label,sort_order)
values ('bkash','bKash',0),('nagad','Nagad',1),('brac_bank','BRAC Bank',2),('islami_bank','Islami Bank',3)
on conflict (provider) do nothing;

-- Safe upgrade for projects where payment_options already existed.
alter table public.payment_options add column if not exists logo_url text not null default '';
