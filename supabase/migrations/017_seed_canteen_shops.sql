-- Seed canteen shops and menu items

-- 1. Create shopkeeper auth users if they don't exist
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
) VALUES 
  (
    '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e01',
    '00000000-0000-0000-0000-000000000000',
    'bitesip@college.edu',
    -- password123 bcrypt hash
    '$2a$10$tOQ4B6.PjBbe1fW67gX/O.J0Xmpx0GzB.U87JdY3W.0eC3Vq1K1K2',
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Bite & Sip Manager"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02',
    '00000000-0000-0000-0000-000000000000',
    'spicesoul@college.edu',
    -- password123 bcrypt hash
    '$2a$10$tOQ4B6.PjBbe1fW67gX/O.J0Xmpx0GzB.U87JdY3W.0eC3Vq1K1K2',
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Spice & Soul Chef"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03',
    '00000000-0000-0000-0000-000000000000',
    'greengarden@college.edu',
    -- password123 bcrypt hash
    '$2a$10$tOQ4B6.PjBbe1fW67gX/O.J0Xmpx0GzB.U87JdY3W.0eC3Vq1K1K2',
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Green Garden Chef"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure public profiles exist for them (trigger handle_new_user handles this, 
-- but we run an ON CONFLICT backfill just in case the trigger was disabled/changed)
INSERT INTO public.profiles (id, full_name, email, avatar_color)
VALUES
  ('5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e01', 'Bite & Sip Manager', 'bitesip@college.edu', '#fe527a'),
  ('5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02', 'Spice & Soul Chef', 'spicesoul@college.edu', '#f5a623'),
  ('5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03', 'Green Garden Chef', 'greengarden@college.edu', '#5cb85c')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert canteen shops
INSERT INTO public.canteen_shops (id, name, description, avatar_color, shopkeeper_id, is_open)
VALUES
  (
    '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c01',
    'Bite & Sip Cafe',
    'Fresh coffee, customized sandwiches, beverages, and quick bites.',
    '#fe527a',
    '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e01',
    true
  ),
  (
    '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c02',
    'Spice & Soul Canteen',
    'Authentic North & South Indian meals, snacks, and street food.',
    '#f5a623',
    '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02',
    true
  ),
  (
    '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c03',
    'Green Garden Salads',
    'Healthy greens, custom salad bowls, fruit platters, and cold-pressed juices.',
    '#5cb85c',
    '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Insert menu items for Bite & Sip Cafe
INSERT INTO public.canteen_items (id, shop_id, name, description, price, is_available, inventory_count)
VALUES
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d01', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c01', 'Cappuccino', 'Creamy espresso with steamed milk foam', 80.00, true, 50),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d02', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c01', 'Club Sandwich', 'Triple-layered vegetable & cheese sandwich', 120.00, true, 30),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d03', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c01', 'Iced Tea', 'Refreshing lemon flavored iced tea', 50.00, true, 100),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d04', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c01', 'Chocolate Muffin', 'Rich double chocolate chip muffin', 70.00, true, 20)
ON CONFLICT (id) DO NOTHING;

-- 5. Insert menu items for Spice & Soul Canteen
INSERT INTO public.canteen_items (id, shop_id, name, description, price, is_available, inventory_count)
VALUES
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d05', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c02', 'Masala Dosa', 'Crispy rice crepe filled with spiced potato mash', 90.00, true, 40),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d06', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c02', 'Samosa (Plate of 2)', 'Deep-fried pastry filled with spiced potatoes and peas', 40.00, true, 60),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d07', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c02', 'Butter Chicken with Naan', 'Tender chicken in rich tomato butter gravy with butter naan', 180.00, true, 25),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d08', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c02', 'Mango Lassi', 'Sweet yogurt drink blended with fresh mango pulp', 60.00, true, 45)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert menu items for Green Garden Salads
INSERT INTO public.canteen_items (id, shop_id, name, description, price, is_available, inventory_count)
VALUES
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d09', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c03', 'Caesar Salad', 'Fresh romaine lettuce, croutons, parmesan cheese with caesar dressing', 110.00, true, 15),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d10', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c03', 'Fruit Platter', 'Assorted seasonal fresh fruits', 80.00, true, 20),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d11', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c03', 'Detox Green Juice', 'Cold pressed cucumber, celery, apple, and mint juice', 90.00, true, 30)
ON CONFLICT (id) DO NOTHING;
