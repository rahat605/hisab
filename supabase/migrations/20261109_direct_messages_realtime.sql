-- Live Sent -> Seen updates: publish direct_messages changes to Supabase Realtime.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
     ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
exception when others then
  raise notice 'Could not add direct_messages to supabase_realtime; polling will still refresh messages.';
end $$;
