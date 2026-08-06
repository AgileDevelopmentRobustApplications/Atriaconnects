-- Grant UPDATE privilege on public.profiles to authenticated users
-- This fixes the 'permission denied for table profiles' error when saving profile or admin changes.
grant update on public.profiles to authenticated;
