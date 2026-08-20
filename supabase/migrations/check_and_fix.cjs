// check_and_fix.cjs — checks profile state and applies migration 020 step by step
const { Client } = require('pg')

const client = new Client({
  host: 'db.zgwckrpeveoemmwtriee.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '11y2uuWJBKXMFZp3',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  await client.connect()
  console.log('Connected!\n')

  // 1. Check if 017 seed buyer profiles exist
  const existing = await client.query(
    `SELECT id, full_name FROM public.profiles WHERE id IN (
      '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02',
      '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03'
    )`
  )
  console.log('Buyer profiles in DB:', existing.rows.length, existing.rows.map(r => r.full_name))

  // 2. Insert Naveen Anna and Sandwich Anna profiles
  console.log('\nInserting shopkeeper profiles…')
  await client.query(`
    INSERT INTO public.profiles (id, full_name, email, avatar_color)
    VALUES
      ('aa000001-0000-0000-0000-000000000001', 'Naveen Anna',    'naveenanna@college.edu',    '#e67e22'),
      ('aa000001-0000-0000-0000-000000000002', 'Sandwich Anna',  'sandwichanna@college.edu',  '#2ecc71')
    ON CONFLICT (id) DO NOTHING
  `)
  console.log('  ✓ profiles')

  // 3. Insert user_roles
  console.log('Inserting user_roles…')
  await client.query(`
    INSERT INTO public.user_roles (user_id, role, department)
    VALUES
      ('aa000001-0000-0000-0000-000000000001', 'faculty', 'Canteen'),
      ('aa000001-0000-0000-0000-000000000002', 'faculty', 'Canteen')
    ON CONFLICT (user_id, role) DO NOTHING
  `)
  console.log('  ✓ user_roles')

  // 4. Insert shops
  console.log('Inserting shops…')
  await client.query(`
    INSERT INTO public.canteen_shops (id, name, description, avatar_color, shopkeeper_id, is_open)
    VALUES
      ('bb000002-0000-0000-0000-000000000001', 'Naveen Anna''s',
       'Hot rice meals, sambar, rasam, curries, and South Indian specials — freshly cooked every day.',
       '#e67e22', 'aa000001-0000-0000-0000-000000000001', true),
      ('bb000002-0000-0000-0000-000000000002', 'Sandwich Anna''s',
       'Grilled and loaded sandwiches, toasties, burgers, and wraps — made fresh to order.',
       '#2ecc71', 'aa000001-0000-0000-0000-000000000002', true)
    ON CONFLICT (id) DO NOTHING
  `)
  console.log('  ✓ shops')

  // 5. Insert Naveen Anna items
  console.log('Inserting Naveen Anna items…')
  await client.query(`
    INSERT INTO public.canteen_items (id, shop_id, name, description, price, category, is_available, inventory_count)
    VALUES
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
  `)
  console.log('  ✓ Naveen Anna items (14)')

  // 6. Insert Sandwich Anna items
  console.log('Inserting Sandwich Anna items…')
  await client.query(`
    INSERT INTO public.canteen_items (id, shop_id, name, description, price, category, is_available, inventory_count)
    VALUES
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
  `)
  console.log('  ✓ Sandwich Anna items (13)')

  // 7. Insert sample orders only if buyer profiles exist
  if (existing.rows.length >= 2) {
    console.log('Inserting sample orders…')
    await client.query(`
      INSERT INTO public.canteen_orders (id, user_id, shop_id, status, token_number, total_amount, payment_status, payment_method)
      VALUES
        ('dd000004-0000-0000-0000-000000000001','5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02','bb000002-0000-0000-0000-000000000001','completed',1,125.00,'paid','upi'),
        ('dd000004-0000-0000-0000-000000000002','5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03','bb000002-0000-0000-0000-000000000001','ready',2,95.00,'paid','card'),
        ('dd000004-0000-0000-0000-000000000003','5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02','bb000002-0000-0000-0000-000000000002','preparing',1,160.00,'paid','upi'),
        ('dd000004-0000-0000-0000-000000000004','5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03','bb000002-0000-0000-0000-000000000002','pending',2,135.00,'paid','card')
      ON CONFLICT (id) DO NOTHING
    `)
    console.log('  ✓ sample orders (4)')

    // 8. Insert order items
    console.log('Inserting canteen_order_items…')
    await client.query(`
      INSERT INTO public.canteen_order_items (order_id, item_id, quantity, price)
      VALUES
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
    `)
    console.log('  ✓ canteen_order_items (12 rows)')
  } else {
    console.log('⚠ Skipping sample orders — buyer profiles from migration 017 not found in DB')
  }

  await client.end()
  console.log('\n=== All done! ===')
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
