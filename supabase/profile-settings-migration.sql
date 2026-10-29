alter table public.profiles add column if not exists photo_url text;
insert into storage.buckets (id,name,public) values ('profile-photos','profile-photos',true) on conflict (id) do update set public=true;
create policy "profile photos public read" on storage.objects for select using (bucket_id='profile-photos');
