-- Fix: memberships_select still used a raw recursive subquery on memberships
-- instead of the is_club_member()/is_club_admin() SECURITY DEFINER helpers
-- introduced in 026 to break RLS recursion. This caused
-- "infinite recursion detected in policy for relation memberships" on any
-- SELECT against memberships. Matches the pattern already used by
-- memberships_update/memberships_delete.

drop policy if exists "memberships_select" on public.memberships;
create policy "memberships_select" on public.memberships
  for select to authenticated using (
    public.is_club_member(club_id) or public.is_club_admin(club_id)
  );
