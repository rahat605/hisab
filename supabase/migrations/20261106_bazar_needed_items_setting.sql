-- Shared "Need to buy" checklist for the Monthly Bazar page.
-- Active household members may manage only this app_settings key;
-- all other settings remain protected by the existing admin policy.

alter table public.app_settings enable row level security;

drop policy if exists "Active members manage bazar needed items" on public.app_settings;
create policy "Active members manage bazar needed items"
on public.app_settings
for all
to authenticated
using (
  key = 'bazar_needed_items'
  and public.is_active_member()
)
with check (
  key = 'bazar_needed_items'
  and public.is_active_member()
);

insert into public.app_settings (key, value, updated_at)
values ('bazar_needed_items', '[]', now())
on conflict (key) do nothing;

notify pgrst, 'reload schema';
