-- Monthly Hisab: fix app_settings permission denied for utility saves.
-- Run this in Supabase SQL Editor as project owner.
-- Allows authenticated household admins to insert/update/delete app settings.
-- Existing read access remains unchanged.

alter table public.app_settings enable row level security;

drop policy if exists "Authenticated users can manage app settings" on public.app_settings;
drop policy if exists "Admins can manage app settings" on public.app_settings;

create policy "Admins can manage app settings"
on public.app_settings
for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

notify pgrst, 'reload schema';
