-- AdraConnects — Canteen Management System tables and policies
-- Applied to Supabase project zgwckrpeveoemmwtriee as migration: canteen_management

-- ============ CANTEEN SHOPS ============
create table if not exists public.canteen_shops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  avatar_color text not null default '#f5a623',
  shopkeeper_id uuid not null references public.profiles(id) on delete cascade,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ CANTEEN MENU ITEMS ============
create table if not exists public.canteen_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.canteen_shops(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  inventory_count int not null default 0 check (inventory_count >= 0),
  created_at timestamptz not null default now()
);

-- ============ CANTEEN ORDERS ============
create table if not exists public.canteen_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.canteen_shops(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  token_number int not null,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  payment_method text not null default 'mock_gateway',
  created_at timestamptz not null default now()
);

-- ============ CANTEEN ORDER ITEMS ============
create table if not exists public.canteen_order_items (
  order_id uuid not null references public.canteen_orders(id) on delete cascade,
  item_id uuid not null references public.canteen_items(id) on delete cascade,
  quantity int not null check (quantity > 0),
  price numeric(10,2) not null check (price >= 0),
  primary key (order_id, item_id)
);

-- ============ CANTEEN ANNOUNCEMENTS ============
create table if not exists public.canteen_announcements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.canteen_shops(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============ RLS AND POLICIES ============
alter table public.canteen_shops enable row level security;
alter table public.canteen_items enable row level security;
alter table public.canteen_orders enable row level security;
alter table public.canteen_order_items enable row level security;
alter table public.canteen_announcements enable row level security;

-- Shops policies
drop policy if exists "canteen_shops_select" on public.canteen_shops;
create policy "canteen_shops_select" on public.canteen_shops for select to authenticated using (true);

drop policy if exists "canteen_shops_insert_staff" on public.canteen_shops;
create policy "canteen_shops_insert_staff" on public.canteen_shops for insert to authenticated with check (public.is_employee());

drop policy if exists "canteen_shops_update_owner_or_staff" on public.canteen_shops;
create policy "canteen_shops_update_owner_or_staff" on public.canteen_shops for update to authenticated
  using (shopkeeper_id = auth.uid() or public.is_employee())
  with check (shopkeeper_id = auth.uid() or public.is_employee());

drop policy if exists "canteen_shops_delete_staff" on public.canteen_shops;
create policy "canteen_shops_delete_staff" on public.canteen_shops for delete to authenticated using (public.is_employee());

-- Items policies
drop policy if exists "canteen_items_select" on public.canteen_items;
create policy "canteen_items_select" on public.canteen_items for select to authenticated using (true);

drop policy if exists "canteen_items_all_owner_or_staff" on public.canteen_items;
create policy "canteen_items_all_owner_or_staff" on public.canteen_items for all to authenticated
  using (
    exists (select 1 from public.canteen_shops s where s.id = shop_id and (s.shopkeeper_id = auth.uid() or public.is_employee()))
  );

-- Orders policies
drop policy if exists "canteen_orders_select_own_or_shopkeeper" on public.canteen_orders;
create policy "canteen_orders_select_own_or_shopkeeper" on public.canteen_orders for select to authenticated
  using (
    user_id = auth.uid() or
    exists (select 1 from public.canteen_shops s where s.id = shop_id and s.shopkeeper_id = auth.uid()) or
    public.is_employee()
  );

drop policy if exists "canteen_orders_insert_self" on public.canteen_orders;
create policy "canteen_orders_insert_self" on public.canteen_orders for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "canteen_orders_update_shopkeeper_or_staff" on public.canteen_orders;
create policy "canteen_orders_update_shopkeeper_or_staff" on public.canteen_orders for update to authenticated
  using (
    exists (select 1 from public.canteen_shops s where s.id = shop_id and s.shopkeeper_id = auth.uid()) or
    public.is_employee()
  )
  with check (
    exists (select 1 from public.canteen_shops s where s.id = shop_id and s.shopkeeper_id = auth.uid()) or
    public.is_employee()
  );

-- Order Items policies
drop policy if exists "canteen_order_items_select" on public.canteen_order_items;
create policy "canteen_order_items_select" on public.canteen_order_items for select to authenticated using (true);

drop policy if exists "canteen_order_items_insert" on public.canteen_order_items;
create policy "canteen_order_items_insert" on public.canteen_order_items for insert to authenticated with check (
  exists (select 1 from public.canteen_orders o where o.id = order_id and o.user_id = auth.uid())
);

-- Announcements policies
drop policy if exists "canteen_announcements_select" on public.canteen_announcements;
create policy "canteen_announcements_select" on public.canteen_announcements for select to authenticated using (true);

drop policy if exists "canteen_announcements_insert" on public.canteen_announcements;
create policy "canteen_announcements_insert" on public.canteen_announcements for insert to authenticated with check (
  exists (select 1 from public.canteen_shops s where s.id = shop_id and s.shopkeeper_id = auth.uid())
);

drop policy if exists "canteen_announcements_delete" on public.canteen_announcements;
create policy "canteen_announcements_delete" on public.canteen_announcements for delete to authenticated using (
  exists (select 1 from public.canteen_shops s where s.id = shop_id and s.shopkeeper_id = auth.uid())
);
