-- Consolidate the two overlapping join_requests policy pairs and RPCs.
--
-- join_requests_select/join_requests_insert (academic-group-aware) and
-- requests_select/requests_insert_self (club-only) existed side by side.
-- Likewise decide_join_request (club-only) and decide_membership_request
-- (club + academic group) both existed. Only the club-only pair was wired
-- to the frontend; the academic-group pair was built but never used since
-- groups add members directly instead of via join request.
--
-- Standardizing on the academic-group-aware pair + decide_membership_request
-- since it's the complete design, and switching the frontend to call it.

drop policy if exists "requests_select" on public.join_requests;
drop policy if exists "requests_insert_self" on public.join_requests;

drop function if exists public.decide_join_request(uuid, boolean);
