-- Fix: admins could not see or accept club join requests.
--
-- Root cause #1 (frontend, fixed separately): the join_requests -> profiles
-- embed was ambiguous because the table has two FKs to profiles (user_id,
-- decided_by), so PostgREST rejected the select and the UI silently showed
-- an empty list.
--
-- Root cause #2 (this file): RLS policies and the decide_join_request RPC
-- for join_requests were documented in migration 004's comments but never
-- actually created, so admins had no way to read others' requests or decide
-- them. Written idempotently so it's safe to re-run regardless of current
-- state.

alter table public.join_requests enable row level security;

drop policy if exists join_requests_select on public.join_requests;
create policy join_requests_select on public.join_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_club_admin(club_id)
    or public.is_employee()
  );

drop policy if exists join_requests_insert_self on public.join_requests;
create policy join_requests_insert_self on public.join_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- No update/delete policy: decisions only happen via decide_join_request()
-- below, which runs SECURITY DEFINER and so bypasses RLS.

create or replace function public.decide_join_request(_request uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  _club uuid;
  _user uuid;
  _status text;
begin
  select club_id, user_id, status into _club, _user, _status
  from public.join_requests
  where id = _request
  for update;

  if _club is null then
    raise exception 'Join request not found';
  end if;

  if _status <> 'pending' then
    raise exception 'Join request already decided';
  end if;

  if not (public.is_club_admin(_club) or public.is_employee()) then
    raise exception 'Not authorized to decide this request';
  end if;

  update public.join_requests
  set status = case when _approve then 'approved' else 'rejected' end,
      decided_by = auth.uid(),
      decided_at = now()
  where id = _request;

  if _approve then
    insert into public.memberships (club_id, user_id, role)
    values (_club, _user, 'member')
    on conflict (club_id, user_id) do nothing;
  end if;
end;
$$;

grant execute on function public.decide_join_request(uuid, boolean) to authenticated;
revoke execute on function public.decide_join_request(uuid, boolean) from anon, public;
