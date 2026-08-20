-- Migration 020: Add Naveen Anna and Sandwich Anna shops with staff accounts,
-- full menus, and sample orders with order items.

-- ============================================================
-- 1. AUTH USERS for Naveen Anna and Sandwich Anna
-- ============================================================
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
    'aa000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'naveenanna@college.edu',
    -- password: canteen123  (bcrypt)
    '$2a$10$tOQ4B6.PjBbe1fW67gX/O.J0Xmpx0GzB.U87JdY3W.0eC3Vq1K1K2',
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Naveen Anna"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'aa000001-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'sandwichanna@college.edu',
    -- password: canteen123  (bcrypt)
    '$2a$10$tOQ4B6.PjBbe1fW67gX/O.J0Xmpx0GzB.U87JdY3W.0eC3Vq1K1K2',
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Sandwich Anna"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. PUBLIC PROFILES for the two shopkeepers
-- ============================================================
INSERT INTO public.profiles (id, full_name, email, avatar_color)
VALUES
  ('aa000001-0000-0000-0000-000000000001', 'Naveen Anna',    'naveenanna@college.edu',    '#e67e22'),
  ('aa000001-0000-0000-0000-000000000002', 'Sandwich Anna',  'sandwichanna@college.edu',  '#2ecc71')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. STAFF ROLES — give them 'faculty' so they can manage their shop
--    (is_employee() covers faculty | itdept | principal)
-- ============================================================
INSERT INTO public.user_roles (user_id, role, department)
VALUES
  ('aa000001-0000-0000-0000-000000000001', 'faculty', 'Canteen'),
  ('aa000001-0000-0000-0000-000000000002', 'faculty', 'Canteen')
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- 4. CANTEEN SHOPS
-- ============================================================
INSERT INTO public.canteen_shops (id, name, description, avatar_color, shopkeeper_id, is_open)
VALUES
  (
    'bb000002-0000-0000-0000-000000000001',
    'Naveen Anna''s',
    'Hot rice meals, sambar, rasam, curries, and South Indian specials — freshly cooked every day.',
    '#e67e22',
    'aa000001-0000-0000-0000-000000000001',
    true
  ),
  (
    'bb000002-0000-0000-0000-000000000002',
    'Sandwich Anna''s',
    'Grilled and loaded sandwiches, toasties, burgers, and wraps — made fresh to order.',
    '#2ecc71',
    'aa000001-0000-0000-0000-000000000002',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. MENU ITEMS — Naveen Anna's (South Indian / Meals)
-- ============================================================
INSERT INTO public.canteen_items
  (id, shop_id, name, description, price, is_available, inventory_count)
VALUES
  -- Rice & Meals
  ('cc000003-0000-0000-0000-000000000001', 'bb000002-0000-0000-0000-000000000001',
   'Full Meals',
   'Rice + sambar + rasam + 2 curries + papad + pickle + curd',
   70.00, true, 60),

  ('cc000003-0000-0000-0000-000000000002', 'bb000002-0000-0000-0000-000000000001',
   'Mini Meals',
   'Rice + sambar + 1 curry + curd',
   45.00, true, 80),

  -- Tiffin
  ('cc000003-0000-0000-0000-000000000003', 'bb000002-0000-0000-0000-000000000001',
   'Idly (2 pcs)',
   'Soft steamed rice cakes served with sambar and 2 chutneys',
   30.00, true, 100),

  ('cc000003-0000-0000-0000-000000000004', 'bb000002-0000-0000-0000-000000000001',
   'Masala Dosa',
   'Crispy golden dosa stuffed with spiced potato masala, sambar & chutney',
   50.00, true, 80),

  ('cc000003-0000-0000-0000-000000000005', 'bb000002-0000-0000-0000-000000000001',
   'Plain Dosa',
   'Thin crispy dosa with sambar and coconut chutney',
   35.00, true, 80),

  ('cc000003-0000-0000-0000-000000000006', 'bb000002-0000-0000-0000-000000000001',
   'Poha',
   'Light flattened rice with mustard, curry leaves, peanuts & lemon',
   25.00, true, 50),

  ('cc000003-0000-0000-0000-000000000007', 'bb000002-0000-0000-0000-000000000001',
   'Upma',
   'Semolina porridge tempered with mustard, chillies & vegetables',
   25.00, true, 50),

  ('cc000003-0000-0000-0000-000000000008', 'bb000002-0000-0000-0000-000000000001',
   'Pongal',
   'Creamy rice-lentil dish with black pepper, ghee & curry leaves',
   30.00, true, 40),

  -- Snacks
  ('cc000003-0000-0000-0000-000000000009', 'bb000002-0000-0000-0000-000000000001',
   'Vada (2 pcs)',
   'Crispy lentil donuts with sambar and coconut chutney',
   35.00, true, 60),

  ('cc000003-0000-0000-0000-000000000010', 'bb000002-0000-0000-0000-000000000001',
   'Sambar Rice',
   'Hot rice mixed with thick sambar and a dollop of ghee',
   40.00, true, 70),

  ('cc000003-0000-0000-0000-000000000011', 'bb000002-0000-0000-0000-000000000001',
   'Curd Rice',
   'Chilled rice mixed with yogurt, tempered with mustard and curry leaves',
   35.00, true, 50),

  -- Drinks
  ('cc000003-0000-0000-0000-000000000012', 'bb000002-0000-0000-0000-000000000001',
   'Filter Coffee',
   'Aromatic South Indian decoction coffee with frothy milk',
   20.00, true, 120),

  ('cc000003-0000-0000-0000-000000000013', 'bb000002-0000-0000-0000-000000000001',
   'Buttermilk (Chaas)',
   'Chilled spiced yogurt drink with ginger, cumin & coriander',
   15.00, true, 100),

  ('cc000003-0000-0000-0000-000000000014', 'bb000002-0000-0000-0000-000000000001',
   'Masala Chai',
   'Spiced milk tea with ginger, cardamom, and cinnamon',
   15.00, true, 100)

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. MENU ITEMS — Sandwich Anna's
-- ============================================================
INSERT INTO public.canteen_items
  (id, shop_id, name, description, price, is_available, inventory_count)
VALUES
  -- Grilled Sandwiches
  ('cc000003-0000-0000-0000-000000000020', 'bb000002-0000-0000-0000-000000000002',
   'Classic Veg Grilled',
   'Tomato, cucumber, onion, cheese & green chutney on grilled white bread',
   45.00, true, 50),

  ('cc000003-0000-0000-0000-000000000021', 'bb000002-0000-0000-0000-000000000002',
   'Paneer Tikka Sandwich',
   'Spiced grilled paneer with capsicum, onion & mint mayo on brown bread',
   70.00, true, 40),

  ('cc000003-0000-0000-0000-000000000022', 'bb000002-0000-0000-0000-000000000002',
   'Corn & Cheese Toastie',
   'Sweet corn, processed cheese, jalapeños & herbs, toasted golden',
   55.00, true, 45),

  ('cc000003-0000-0000-0000-000000000023', 'bb000002-0000-0000-0000-000000000002',
   'Mushroom Melt',
   'Sautéed mushrooms, onions, cheese & garlic butter on sourdough',
   75.00, true, 30),

  -- Loaded / Club Sandwiches
  ('cc000003-0000-0000-0000-000000000024', 'bb000002-0000-0000-0000-000000000002',
   'Aloo Tikki Sub',
   'Crispy aloo tikki, slaw, tamarind chutney & cheese in a long bun',
   80.00, true, 35),

  ('cc000003-0000-0000-0000-000000000025', 'bb000002-0000-0000-0000-000000000002',
   'Veg Club Sandwich',
   'Triple-decker with lettuce, tomato, cucumber, egg mayo & cheese',
   90.00, true, 25),

  -- Wraps
  ('cc000003-0000-0000-0000-000000000026', 'bb000002-0000-0000-0000-000000000002',
   'Paneer Kathi Roll',
   'Spiced paneer strips, onion, peppers & chutney wrapped in a flaky paratha',
   65.00, true, 40),

  ('cc000003-0000-0000-0000-000000000027', 'bb000002-0000-0000-0000-000000000002',
   'Veggie Hummus Wrap',
   'Hummus, roasted veggies, feta crumbles & rocket in a whole-wheat wrap',
   70.00, true, 30),

  -- Burgers
  ('cc000003-0000-0000-0000-000000000028', 'bb000002-0000-0000-0000-000000000002',
   'Veg Burger',
   'Crispy veg patty, lettuce, onion ring, tomato & mayo in a sesame bun',
   60.00, true, 45),

  ('cc000003-0000-0000-0000-000000000029', 'bb000002-0000-0000-0000-000000000002',
   'Spicy Double Patty Burger',
   'Two spicy veg patties, habanero sauce, pickles & melted cheese',
   95.00, true, 20),

  -- Sides & Drinks
  ('cc000003-0000-0000-0000-000000000030', 'bb000002-0000-0000-0000-000000000002',
   'Masala Fries',
   'Crispy fries tossed with chaat masala, red chilli & lime',
   40.00, true, 60),

  ('cc000003-0000-0000-0000-000000000031', 'bb000002-0000-0000-0000-000000000002',
   'Cold Coffee',
   'Chilled coffee blended with milk, ice cream & chocolate drizzle',
   50.00, true, 50),

  ('cc000003-0000-0000-0000-000000000032', 'bb000002-0000-0000-0000-000000000002',
   'Fresh Lime Soda',
   'Sparkling lime soda — sweet, salty, or mixed',
   30.00, true, 80)

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. SAMPLE ORDERS & ORDER ITEMS
--    Use the existing "Spice & Soul Chef" profile as buyer
--    so we don't need a separate student user in this migration.
-- ============================================================

-- Order A — at Naveen Anna's (full meals + filter coffee)
INSERT INTO public.canteen_orders
  (id, user_id, shop_id, status, token_number, total_amount, payment_status, payment_method)
VALUES (
  'dd000004-0000-0000-0000-000000000001',
  '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02',   -- buyer: Spice & Soul Chef profile
  'bb000002-0000-0000-0000-000000000001',      -- Naveen Anna's
  'completed', 1, 105.00, 'paid', 'upi'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.canteen_order_items (order_id, item_id, quantity, price)
VALUES
  ('dd000004-0000-0000-0000-000000000001', 'cc000003-0000-0000-0000-000000000001', 1, 70.00),  -- Full Meals
  ('dd000004-0000-0000-0000-000000000001', 'cc000003-0000-0000-0000-000000000012', 1, 20.00),  -- Filter Coffee
  ('dd000004-0000-0000-0000-000000000001', 'cc000003-0000-0000-0000-000000000009', 1, 35.00)   -- Vada
ON CONFLICT (order_id, item_id) DO NOTHING;

-- Order B — at Naveen Anna's (idly + masala dosa + buttermilk)
INSERT INTO public.canteen_orders
  (id, user_id, shop_id, status, token_number, total_amount, payment_status, payment_method)
VALUES (
  'dd000004-0000-0000-0000-000000000002',
  '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03',   -- buyer: Green Garden Chef
  'bb000002-0000-0000-0000-000000000001',
  'ready', 2, 95.00, 'paid', 'card'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.canteen_order_items (order_id, item_id, quantity, price)
VALUES
  ('dd000004-0000-0000-0000-000000000002', 'cc000003-0000-0000-0000-000000000003', 2, 30.00),  -- Idly x2
  ('dd000004-0000-0000-0000-000000000002', 'cc000003-0000-0000-0000-000000000004', 1, 50.00),  -- Masala Dosa
  ('dd000004-0000-0000-0000-000000000002', 'cc000003-0000-0000-0000-000000000013', 1, 15.00)   -- Buttermilk
ON CONFLICT (order_id, item_id) DO NOTHING;

-- Order C — at Sandwich Anna's (paneer tikka + masala fries + cold coffee)
INSERT INTO public.canteen_orders
  (id, user_id, shop_id, status, token_number, total_amount, payment_status, payment_method)
VALUES (
  'dd000004-0000-0000-0000-000000000003',
  '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02',
  'bb000002-0000-0000-0000-000000000002',      -- Sandwich Anna's
  'preparing', 1, 160.00, 'paid', 'upi'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.canteen_order_items (order_id, item_id, quantity, price)
VALUES
  ('dd000004-0000-0000-0000-000000000003', 'cc000003-0000-0000-0000-000000000021', 1, 70.00),  -- Paneer Tikka
  ('dd000004-0000-0000-0000-000000000003', 'cc000003-0000-0000-0000-000000000030', 2, 40.00),  -- Masala Fries x2
  ('dd000004-0000-0000-0000-000000000003', 'cc000003-0000-0000-0000-000000000031', 1, 50.00)   -- Cold Coffee
ON CONFLICT (order_id, item_id) DO NOTHING;

-- Order D — at Sandwich Anna's (veg burger + veg grilled + lime soda)
INSERT INTO public.canteen_orders
  (id, user_id, shop_id, status, token_number, total_amount, payment_status, payment_method)
VALUES (
  'dd000004-0000-0000-0000-000000000004',
  '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03',
  'bb000002-0000-0000-0000-000000000002',
  'pending', 2, 135.00, 'paid', 'card'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.canteen_order_items (order_id, item_id, quantity, price)
VALUES
  ('dd000004-0000-0000-0000-000000000004', 'cc000003-0000-0000-0000-000000000028', 1, 60.00),  -- Veg Burger
  ('dd000004-0000-0000-0000-000000000004', 'cc000003-0000-0000-0000-000000000020', 1, 45.00),  -- Classic Veg Grilled
  ('dd000004-0000-0000-0000-000000000004', 'cc000003-0000-0000-0000-000000000032', 2, 30.00)   -- Lime Soda x2
ON CONFLICT (order_id, item_id) DO NOTHING;
