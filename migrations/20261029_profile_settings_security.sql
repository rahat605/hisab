-- Monthly Hisab: secure self-service profile settings.
-- Run this migration in Supabase SQL Editor.

alter table public.profiles add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

-- Profiles can only update their own row (including photo_url).
drop policy if exists "members update own profile" on public.profiles;
create policy "members update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Profile photos are public to display, but uploads/replacements/deletes are owner-only.
drop policy if exists "profile photos public read" on storage.objects;
create policy "profile photos public read"
on storage.objects for select
using (bucket_id = 'profile-photos');

drop policy if exists "profile photos owner upload" on storage.objects;
create policy "profile photos owner upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile photos owner update" on storage.objects;
create policy "profile photos owner update"
on storage.objects for update to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile photos owner delete" on storage.objects;
create policy "profile photos owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
