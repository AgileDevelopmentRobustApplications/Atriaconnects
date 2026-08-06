-- Define set_user_type RPC for changing profiles.user_type
-- Authenticated users can set their own user_type (e.g. guest signup),
-- and employees (staff) can set any user's user_type.

create or replace function public.set_user_type(_user uuid, _type text)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Check if caller is authenticated
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Validate user type
  if _type not in ('guest', 'member') then
    raise exception 'invalid user type';
  end if;

  -- Allow if updating own profile OR caller is employee/staff
  if auth.uid() = _user or public.is_employee() then
    update public.profiles
    set user_type = _type
    where id = _user;
  else
    raise exception 'not authorized to update user type';
  end if;
end; $$;

grant execute on function public.set_user_type(uuid, text) to authenticated;
revoke execute on function public.set_user_type(uuid, text) from anon, public;
