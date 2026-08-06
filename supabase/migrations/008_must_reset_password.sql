-- AdraConnects — must_reset_password flag for invite-only account setup
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: must_reset_password
--
-- When an admin invites a new user, the user is provisioned with a temporary
-- password. profiles.must_reset_password is set true. On next sign-in, the
-- app routes to /welcome to set a real password, which clears the flag.

alter table public.profiles
  add column if not exists must_reset_password boolean not null default false;

-- RLS: a user can read/update this on their own row only; superadmins
-- already bypass via existing profiles_update policy (id = auth.uid() OR
-- is_employee()). The flag is a single column on profiles so no new policy
-- is needed — but we explicitly grant UPDATE on the column to authenticated.
grant update (must_reset_password) on table public.profiles to authenticated;