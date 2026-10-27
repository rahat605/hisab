-- Monthly Hisab / Supabase schema
-- Run in Supabase SQL Editor. RLS is enabled on every app table.
-- Create auth users first (Authentication > Users), then insert their profiles.
-- Do NOT put service_role keys in the frontend.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text unique not null,
  role text not null default 'member' check (role in ('admin','member')),
  active boolean not null default true,
  rent numeric(12,2) not null default 0 check (rent >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.months (
  id uuid primary key default gen_random_uuid(),
  label text unique not null,
  current_count integer not null default 4 check (current_count >= 0),
  current_members uuid[] not null default '{}',
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  shared boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(month_id, name)
);

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null check (amount > 0),
  note text not null default 'Rent payment',
  paid_at date not null default current_date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.bazar_entries (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete cascade,
  entry_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  paid_by uuid not null references public.profiles(id),
  items text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_contributions (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete cascade,
  entry_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  paid_by uuid not null references public.profiles(id),
  note text not null default 'Cash contribution',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.months enable row level security;
alter table public.expense_categories enable row level security;
alter table public.rent_payments enable row level security;
alter table public.bazar_entries enable row level security;
alter table public.cash_contributions enable row level security;

-- Helper functions use SECURITY DEFINER to avoid recursive profile policies.
create or replace function public.current_app_role()
returns text language sql stable security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active = true limit 1 $$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer
set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and active = true) $$;

-- Profiles: household members can view the active household list; only admins manage profiles.
drop policy if exists "active users can read profiles" on public.profiles;
create policy "active users can read profiles" on public.profiles for select to authenticated using (public.is_active_member());
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Household-level monthly data is visible to active members; only admins alter setup/categories.
drop policy if exists "active users read months" on public.months;
create policy "active users read months" on public.months for select to authenticated using (public.is_active_member());
drop policy if exists "admins manage months" on public.months;
create policy "admins manage months" on public.months for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

drop policy if exists "active users read categories" on public.expense_categories;
create policy "active users read categories" on public.expense_categories for select to authenticated using (public.is_active_member());
drop policy if exists "admins manage categories" on public.expense_categories;
create policy "admins manage categories" on public.expense_categories for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Rent payments: all active users can read; only admin can create/edit/delete.
drop policy if exists "active users read payments" on public.rent_payments;
create policy "active users read payments" on public.rent_payments for select to authenticated using (public.is_active_member());
drop policy if exists "admins manage payments" on public.rent_payments;
create policy "admins manage payments" on public.rent_payments for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Bazar: members may insert for themselves and edit/delete only their own entries; admin can manage all.
drop policy if exists "active users read bazar" on public.bazar_entries;
create policy "active users read bazar" on public.bazar_entries for select to authenticated using (public.is_active_member());
drop policy if exists "insert own bazar" on public.bazar_entries;
create policy "insert own bazar" on public.bazar_entries for insert to authenticated with check (
  public.is_active_member() and (created_by = auth.uid() or public.current_app_role() = 'admin')
);
drop policy if exists "edit own bazar or admin" on public.bazar_entries;
create policy "edit own bazar or admin" on public.bazar_entries for update to authenticated using (
  public.current_app_role() = 'admin' or created_by = auth.uid()
) with check (public.current_app_role() = 'admin' or created_by = auth.uid());
drop policy if exists "delete own bazar or admin" on public.bazar_entries;
create policy "delete own bazar or admin" on public.bazar_entries for delete to authenticated using (
  public.current_app_role() = 'admin' or created_by = auth.uid()
);

-- Cash contributions are admin-only.
drop policy if exists "active users read cash" on public.cash_contributions;
create policy "active users read cash" on public.cash_contributions for select to authenticated using (public.is_active_member());
drop policy if exists "admins manage cash" on public.cash_contributions;
create policy "admins manage cash" on public.cash_contributions for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Prevent anon access explicitly; RLS policies above are for authenticated only.
