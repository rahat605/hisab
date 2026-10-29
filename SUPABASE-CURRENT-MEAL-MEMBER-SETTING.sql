-- Shared current member (meal) setting for Monthly Hisab.
-- Run in Supabase SQL Editor. Setting is shared across all authenticated users.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- All signed-in household members can read the shared setting.
drop policy if exists "Authenticated users can read app settings" on public.app_settings;
create policy "Authenticated users can read app settings"
  on public.app_settings for select to authenticated using (true);

-- The UI exposes the Save action to admins; RLS allows signed-in writes.
-- Tighten this policy to an admin-role check if your profiles RLS supports it.
drop policy if exists "Authenticated users can manage app settings" on public.app_settings;
create policy "Authenticated users can manage app settings"
  on public.app_settings for all to authenticated using (true) with check (true);

insert into public.app_settings (key, value)
values ('current_member_meal', '1')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
