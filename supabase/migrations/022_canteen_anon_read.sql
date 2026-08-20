-- Migration 022: Allow anon (unauthenticated) users to browse canteen menu
-- The original canteen_items/shops policies only covered 'authenticated' role,
-- causing items to be invisible before login.

DROP POLICY IF EXISTS "canteen_shops_select_anon" ON public.canteen_shops;
CREATE POLICY "canteen_shops_select_anon" ON public.canteen_shops
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "canteen_items_select_anon" ON public.canteen_items;
CREATE POLICY "canteen_items_select_anon" ON public.canteen_items
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "canteen_announcements_select_anon" ON public.canteen_announcements;
CREATE POLICY "canteen_announcements_select_anon" ON public.canteen_announcements
  FOR SELECT TO anon USING (true);
