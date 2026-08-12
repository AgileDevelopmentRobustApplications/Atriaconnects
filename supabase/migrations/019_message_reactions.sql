-- AdraConnects — Message Reactions schema and policies
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: message_reactions

create table if not exists public.message_reactions (
  message_id bigint not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction)
);

-- Enable RLS
alter table public.message_reactions enable row level security;

-- Policies
drop policy if exists "reactions_select" on public.message_reactions;
create policy "reactions_select" on public.message_reactions
  for select to authenticated using (true);

drop policy if exists "reactions_insert" on public.message_reactions;
create policy "reactions_insert" on public.message_reactions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "reactions_delete" on public.message_reactions;
create policy "reactions_delete" on public.message_reactions
  for delete to authenticated using (user_id = auth.uid());
