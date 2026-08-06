-- Drop any conflicting core policies to ensure clean execution
drop policy if exists "conversations_select" on public.conversations;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;
drop policy if exists "reads_select" on public.conversation_reads;
drop policy if exists "reads_insert_own" on public.conversation_reads;

-- 1. Enable RLS (just in case)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;

-- 2. Define conversations SELECT policy
create policy "conversations_select" on public.conversations
  for select to authenticated
  using (public.is_conversation_member(id));

-- 3. Define messages SELECT and INSERT policies
create policy "messages_select" on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.can_post_in(conversation_id));

-- 4. Define conversation_reads SELECT and INSERT policies
create policy "reads_select" on public.conversation_reads
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "reads_insert_own" on public.conversation_reads
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_conversation_member(conversation_id));
