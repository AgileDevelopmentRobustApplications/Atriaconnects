// full_canteen_migration.cjs — creates auth users + all canteen data via direct Postgres
const { Client } = require('pg')

const client = new Client({
  host: 'db.zgwckrpeveoemmwtriee.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '11y2uuWJBKXMFZp3',
  ssl: { rejectUnauthorized: false },
})

const BCRYPT_PW = '$2a$10$tOQ4B6.PjBbe1fW67gX/O.J0Xmpx0GzB.U87JdY3W.0eC3Vq1K1K2' // "canteen123"

async function q(sql, label) {
  try {
    await client.query(sql)
    console.log(`  ✓ ${label}`)
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('duplicate key')) {
      console.log(`  ~ ${label} (already exists, skipped)`)
    } else {
      console.error(`  ✗ ${label}: ${err.message}`)
    }
  }
}

async function run() {
  await client.connect()
  console.log('Connected!\n')

  // ── 1. auth.users for shopkeepers ─────────────────────────────────────────
  console.log('Creating auth users for shopkeepers…')
  await q(`
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES
      ('aa000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000',
       'naveenanna@college.edu','${BCRYPT_PW}',now(),
       '{"provider":"email","providers":["email"]}','{"full_name":"Naveen Anna"}',
       'authenticated','authenticated',now(),now()),
      ('aa000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000',
       'sandwichanna@college.edu','${BCRYPT_PW}',now(),
       '{"provider":"email","providers":["email"]}','{"full_name":"Sandwich Anna"}',
       'authenticated','authenticated',now(),now())
    ON CONFLICT (id) DO NOTHING
  `, 'auth.users for shopkeepers')

  // ── 2. Check / create buyer auth users from migration 017 ─────────────────
  console.log('Checking buyer auth users from migration 017…')
  const buyerCheck = await client.query(`SELECT id FROM auth.users WHERE id IN ('5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02','5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03')`)
  const buyersExist = buyerCheck.rows.length >= 2
  console.log(`  Buyers in auth.users: ${buyerCheck.rows.length}/2 ${buyersExist ? '✓' : '(will create)'}`)

  if (!buyersExist) {
    await q(`
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
      VALUES
        ('5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02','00000000-0000-0000-0000-000000000000',
         'spicesoul@college.edu','${BCRYPT_PW}',now(),
         '{"provider":"email","providers":["email"]}','{"full_name":"Spice & Soul Chef"}',
         'authenticated','authenticated',now(),now()),
        ('5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03','00000000-0000-0000-0000-000000000000',
         'greengarden@college.edu','${BCRYPT_PW}',now(),
         '{"provider":"email","providers":["email"]}','{"full_name":"Green Garden Chef"}',
         'authenticated','authenticated',now(),now())
      ON CONFLICT (id) DO NOTHING
    `, 'auth.users for buyers')
  }

  // ── 3. profiles ───────────────────────────────────────────────────────────
  console.log('\nInserting profiles…')
  await q(`
    INSERT INTO public.profiles (id, full_name, email, avatar_color)
    VALUES
      ('aa000001-0000-0000-0000-000000000001','Naveen Anna','naveenanna@college.edu','#e67e22'),
      ('aa000001-0000-0000-0000-000000000002','Sandwich Anna','sandwichanna@college.edu','#2ecc71')
    ON CONFLICT (id) DO NOTHING
  `, 'shopkeeper profiles')

  await q(`
    INSERT INTO public.profiles (id, full_name, email, avatar_color)
    VALUES
      ('5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02','Spice & Soul Chef','spicesoul@college.edu','#f5a623'),
      ('5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03','Green Garden Chef','greengarden@college.edu','#5cb85c')
    ON CONFLICT (id) DO NOTHING
  `, 'buyer profiles (seed)')

  // ── 4. user_roles ─────────────────────────────────────────────────────────
  console.log('\nInserting user_roles…')
  await q(`
    INSERT INTO public.user_roles (user_id, role, department)
    VALUES
      ('aa000001-0000-0000-0000-000000000001','faculty','Canteen'),
      ('aa000001-0000-0000-0000-000000000002','faculty','Canteen')
    ON CONFLICT (user_id, role) DO NOTHING
  `, 'user_roles')

  // ── 5. canteen shops ──────────────────────────────────────────────────────
  console.log('\nInserting canteen shops…')
  await q(`
    INSERT INTO public.canteen_shops (id, name, description, avatar_color, shopkeeper_id, is_open)
    VALUES
      ('bb000002-0000-0000-0000-000000000001','Naveen Anna''s',
       'Hot rice meals, sambar, rasam, curries, and South Indian specials — freshly cooked every day.',
       '#e67e22','aa000001-0000-0000-0000-000000000001',true),
      ('bb000002-0000-0000-0000-000000000002','Sandwich Anna''s',
       'Grilled and loaded sandwiches, toasties, burgers, and wraps — made fresh to order.',
       '#2ecc71','aa000001-0000-0000-0000-000000000002',true)
    ON CONFLICT (id) DO NOTHING
  `, 'shops')

  // ── 6. Naveen Anna menu items ─────────────────────────────────────────────
  console.log('\nInserting Naveen Anna menu items…')
  await q(`
    INSERT INTO public.canteen_items (id, shop_id, name, description, price, category, is_available, inventory_count) VALUES
      ('cc000003-0000-0000-0000-000000000001','bb000002-0000-0000-0000-000000000001','Full Meals','Rice + sambar + rasam + 2 curries + papad + pickle + curd',70.00,'Rice & Meals',true,60),
      ('cc000003-0000-0000-0000-000000000002','bb000002-0000-0000-0000-000000000001','Mini Meals','Rice + sambar + 1 curry + curd',45.00,'Rice & Meals',true,80),
      ('cc000003-0000-0000-0000-000000000003','bb000002-0000-0000-0000-000000000001','Idly (2 pcs)','Soft steamed rice cakes with sambar and 2 chutneys',30.00,'Tiffin',true,100),
      ('cc000003-0000-0000-0000-000000000004','bb000002-0000-0000-0000-000000000001','Masala Dosa','Crispy golden dosa stuffed with spiced potato masala, sambar & chutney',50.00,'Tiffin',true,80),
      ('cc000003-0000-0000-0000-000000000005','bb000002-0000-0000-0000-000000000001','Plain Dosa','Thin crispy dosa with sambar and coconut chutney',35.00,'Tiffin',true,80),
      ('cc000003-0000-0000-0000-000000000006','bb000002-0000-0000-0000-000000000001','Poha','Light flattened rice with mustard, curry leaves, peanuts & lemon',25.00,'Tiffin',true,50),
      ('cc000003-0000-0000-0000-000000000007','bb000002-0000-0000-0000-000000000001','Upma','Semolina porridge tempered with mustard, chillies & vegetables',25.00,'Tiffin',true,50),
      ('cc000003-0000-0000-0000-000000000008','bb000002-0000-0000-0000-000000000001','Pongal','Creamy rice-lentil dish with black pepper, ghee & curry leaves',30.00,'Tiffin',true,40),
      ('cc000003-0000-0000-0000-000000000009','bb000002-0000-0000-0000-000000000001','Vada (2 pcs)','Crispy lentil donuts with sambar and coconut chutney',35.00,'Snacks',true,60),
      ('cc000003-0000-0000-0000-000000000010','bb000002-0000-0000-0000-000000000001','Sambar Rice','Hot rice mixed with thick sambar and a dollop of ghee',40.00,'Rice & Meals',true,70),
      ('cc000003-0000-0000-0000-000000000011','bb000002-0000-0000-0000-000000000001','Curd Rice','Chilled rice mixed with yogurt, tempered with mustard and curry leaves',35.00,'Rice & Meals',true,50),
      ('cc000003-0000-0000-0000-000000000012','bb000002-0000-0000-0000-000000000001','Filter Coffee','Aromatic South Indian decoction coffee with frothy milk',20.00,'Drinks',true,120),
      ('cc000003-0000-0000-0000-000000000013','bb000002-0000-0000-0000-000000000001','Buttermilk (Chaas)','Chilled spiced yogurt drink with ginger, cumin & coriander',15.00,'Drinks',true,100),
      ('cc000003-0000-0000-0000-000000000014','bb000002-0000-0000-0000-000000000001','Masala Chai','Spiced milk tea with ginger, cardamom, and cinnamon',15.00,'Drinks',true,100)
    ON CONFLICT (id) DO NOTHING
  `, 'Naveen Anna items (14)')

  // ── 7. Sandwich Anna menu items ───────────────────────────────────────────
  console.log('\nInserting Sandwich Anna menu items…')
  await q(`
    INSERT INTO public.canteen_items (id, shop_id, name, description, price, category, is_available, inventory_count) VALUES
      ('cc000003-0000-0000-0000-000000000020','bb000002-0000-0000-0000-000000000002','Classic Veg Grilled','Tomato, cucumber, onion, cheese & green chutney on grilled white bread',45.00,'Grilled Sandwiches',true,50),
      ('cc000003-0000-0000-0000-000000000021','bb000002-0000-0000-0000-000000000002','Paneer Tikka Sandwich','Spiced grilled paneer with capsicum, onion & mint mayo on brown bread',70.00,'Grilled Sandwiches',true,40),
      ('cc000003-0000-0000-0000-000000000022','bb000002-0000-0000-0000-000000000002','Corn & Cheese Toastie','Sweet corn, processed cheese, jalapeños & herbs, toasted golden',55.00,'Grilled Sandwiches',true,45),
      ('cc000003-0000-0000-0000-000000000023','bb000002-0000-0000-0000-000000000002','Mushroom Melt','Sautéed mushrooms, onions, cheese & garlic butter on sourdough',75.00,'Grilled Sandwiches',true,30),
      ('cc000003-0000-0000-0000-000000000024','bb000002-0000-0000-0000-000000000002','Aloo Tikki Sub','Crispy aloo tikki, slaw, tamarind chutney & cheese in a long bun',80.00,'Loaded & Subs',true,35),
      ('cc000003-0000-0000-0000-000000000025','bb000002-0000-0000-0000-000000000002','Veg Club Sandwich','Triple-decker with lettuce, tomato, cucumber, egg mayo & cheese',90.00,'Loaded & Subs',true,25),
      ('cc000003-0000-0000-0000-000000000026','bb000002-0000-0000-0000-000000000002','Paneer Kathi Roll','Spiced paneer strips, onion, peppers & chutney wrapped in a flaky paratha',65.00,'Wraps',true,40),
      ('cc000003-0000-0000-0000-000000000027','bb000002-0000-0000-0000-000000000002','Veggie Hummus Wrap','Hummus, roasted veggies, feta crumbles & rocket in a whole-wheat wrap',70.00,'Wraps',true,30),
      ('cc000003-0000-0000-0000-000000000028','bb000002-0000-0000-0000-000000000002','Veg Burger','Crispy veg patty, lettuce, onion ring, tomato & mayo in a sesame bun',60.00,'Burgers',true,45),
      ('cc000003-0000-0000-0000-000000000029','bb000002-0000-0000-0000-000000000002','Spicy Double Patty Burger','Two spicy veg patties, habanero sauce, pickles & melted cheese',95.00,'Burgers',true,20),
      ('cc000003-0000-0000-0000-000000000030','bb000002-0000-0000-0000-000000000002','Masala Fries','Crispy fries tossed with chaat masala, red chilli & lime',40.00,'Sides & Drinks',true,60),
      ('cc000003-0000-0000-0000-000000000031','bb000002-0000-0000-0000-000000000002','Cold Coffee','Chilled coffee blended with milk, ice cream & chocolate drizzle',50.00,'Sides & Drinks',true,50),
      ('cc000003-0000-0000-0000-000000000032','bb000002-0000-0000-0000-000000000002','Fresh Lime Soda','Sparkling lime soda — sweet, salty, or mixed',30.00,'Sides & Drinks',true,80)
    ON CONFLICT (id) DO NOTHING
  `, 'Sandwich Anna items (13)')

  // ── 8. Sample orders ──────────────────────────────────────────────────────
  console.log('\nInserting sample orders…')
  await q(`
    INSERT INTO public.canteen_orders (id, user_id, shop_id, status, token_number, total_amount, payment_status, payment_method)
    VALUES
      ('dd000004-0000-0000-0000-000000000001','5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02','bb000002-0000-0000-0000-000000000001','completed',1,125.00,'paid','upi'),
      ('dd000004-0000-0000-0000-000000000002','5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03','bb000002-0000-0000-0000-000000000001','ready',2,95.00,'paid','card'),
      ('dd000004-0000-0000-0000-000000000003','5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02','bb000002-0000-0000-0000-000000000002','preparing',1,160.00,'paid','upi'),
      ('dd000004-0000-0000-0000-000000000004','5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03','bb000002-0000-0000-0000-000000000002','pending',2,135.00,'paid','card')
    ON CONFLICT (id) DO NOTHING
  `, 'sample orders (4)')

  // ── 9. Order items ────────────────────────────────────────────────────────
  console.log('\nInserting canteen_order_items…')
  await q(`
    INSERT INTO public.canteen_order_items (order_id, item_id, quantity, price) VALUES
      ('dd000004-0000-0000-0000-000000000001','cc000003-0000-0000-0000-000000000001',1,70.00),
      ('dd000004-0000-0000-0000-000000000001','cc000003-0000-0000-0000-000000000012',1,20.00),
      ('dd000004-0000-0000-0000-000000000001','cc000003-0000-0000-0000-000000000009',1,35.00),
      ('dd000004-0000-0000-0000-000000000002','cc000003-0000-0000-0000-000000000003',2,30.00),
      ('dd000004-0000-0000-0000-000000000002','cc000003-0000-0000-0000-000000000004',1,50.00),
      ('dd000004-0000-0000-0000-000000000002','cc000003-0000-0000-0000-000000000013',1,15.00),
      ('dd000004-0000-0000-0000-000000000003','cc000003-0000-0000-0000-000000000021',1,70.00),
      ('dd000004-0000-0000-0000-000000000003','cc000003-0000-0000-0000-000000000030',2,40.00),
      ('dd000004-0000-0000-0000-000000000003','cc000003-0000-0000-0000-000000000031',1,50.00),
      ('dd000004-0000-0000-0000-000000000004','cc000003-0000-0000-0000-000000000028',1,60.00),
      ('dd000004-0000-0000-0000-000000000004','cc000003-0000-0000-0000-000000000020',1,45.00),
      ('dd000004-0000-0000-0000-000000000004','cc000003-0000-0000-0000-000000000032',2,30.00)
    ON CONFLICT (order_id, item_id) DO NOTHING
  `, 'canteen_order_items (12 rows)')

  // ── 10. Verify ────────────────────────────────────────────────────────────
  console.log('\n── Verification ───────────────────────')
  const shops = await client.query('SELECT name FROM public.canteen_shops WHERE id LIKE \'bb000002%\'')
  const items = await client.query('SELECT COUNT(*) FROM public.canteen_items WHERE shop_id LIKE \'bb000002%\'')
  const orders = await client.query('SELECT COUNT(*) FROM public.canteen_orders WHERE id LIKE \'dd000004%\'')
  const oi = await client.query('SELECT COUNT(*) FROM public.canteen_order_items WHERE order_id LIKE \'dd000004%\'')
  console.log('Shops:', shops.rows.map(r => r.name))
  console.log('Menu items:', items.rows[0].count)
  console.log('Orders:', orders.rows[0].count)
  console.log('Order items:', oi.rows[0].count)

  await client.end()
  console.log('\n=== Migration complete! ===')
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
