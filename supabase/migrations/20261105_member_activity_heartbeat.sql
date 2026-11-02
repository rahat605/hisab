create or replace function public.record_member_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_active_member() then
    raise exception 'An active signed-in member is required';
  end if;

  update public.profiles
  set last_login_at = now()
  where id = auth.uid()
    and active = true;
end;
$$;

revoke all on function public.record_member_activity() from public, anon;
grant execute on function public.record_member_activity() to authenticated;
