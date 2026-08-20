/**
 * apply_canteen_seed.js
 * 
 * Applies migration 020 data (auth users, profiles, user_roles, shops, items, orders, order_items)
 * and migration 021 (category updates) via Supabase JS client using the SERVICE ROLE key.
 *
 * Usage: node apply_canteen_seed.js <SERVICE_ROLE_KEY>
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://zgwckrpeveoemmwtriee.supabase.co'
const SERVICE_KEY = process.argv[2]

if (!SERVICE_KEY) {
  console.error('Usage: node apply_canteen_seed.js <SERVICE_ROLE_KEY>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  console.log('\n=== Applying Canteen Migration 020 & 021 ===\n')

  // ── Profiles ───────────────────────────────────────────────────────────────
  console.log('Inserting profiles…')
  const { error: profErr } = await supabase.from('profiles').upsert([
    { id: 'aa000001-0000-0000-0000-000000000001', full_name: 'Naveen Anna',   email: 'naveenanna@college.edu',   avatar_color: '#e67e22' },
    { id: 'aa000001-0000-0000-0000-000000000002', full_name: 'Sandwich Anna', email: 'sandwichanna@college.edu', avatar_color: '#2ecc71' },
  ], { onConflict: 'id' })
  if (profErr) { console.error('Profiles error:', profErr.message); } else { console.log('  ✓ profiles') }

  // ── User roles ─────────────────────────────────────────────────────────────
  console.log('Inserting user_roles…')
  const { error: rolesErr } = await supabase.from('user_roles').upsert([
    { user_id: 'aa000001-0000-0000-0000-000000000001', role: 'faculty', department: 'Canteen' },
    { user_id: 'aa000001-0000-0000-0000-000000000002', role: 'faculty', department: 'Canteen' },
  ], { onConflict: 'user_id,role' })
  if (rolesErr) { console.error('user_roles error:', rolesErr.message); } else { console.log('  ✓ user_roles') }

  // ── Canteen Shops ──────────────────────────────────────────────────────────
  console.log('Inserting canteen shops…')
  const { error: shopErr } = await supabase.from('canteen_shops').upsert([
    {
      id: 'bb000002-0000-0000-0000-000000000001',
      name: "Naveen Anna's",
      description: 'Hot rice meals, sambar, rasam, curries, and South Indian specials — freshly cooked every day.',
      avatar_color: '#e67e22',
      shopkeeper_id: 'aa000001-0000-0000-0000-000000000001',
      is_open: true,
    },
    {
      id: 'bb000002-0000-0000-0000-000000000002',
      name: "Sandwich Anna's",
      description: 'Grilled and loaded sandwiches, toasties, burgers, and wraps — made fresh to order.',
      avatar_color: '#2ecc71',
      shopkeeper_id: 'aa000001-0000-0000-0000-000000000002',
      is_open: true,
    },
  ], { onConflict: 'id' })
  if (shopErr) { console.error('Shops error:', shopErr.message); } else { console.log('  ✓ shops') }

  // ── Naveen Anna Menu Items ─────────────────────────────────────────────────
  console.log('Inserting Naveen Anna menu items…')
  const naveenItems = [
    { id: 'cc000003-0000-0000-0000-000000000001', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Full Meals',       description: 'Rice + sambar + rasam + 2 curries + papad + pickle + curd', price: 70.00, category: 'Rice & Meals',  is_available: true, inventory_count: 60 },
    { id: 'cc000003-0000-0000-0000-000000000002', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Mini Meals',       description: 'Rice + sambar + 1 curry + curd',                             price: 45.00, category: 'Rice & Meals',  is_available: true, inventory_count: 80 },
    { id: 'cc000003-0000-0000-0000-000000000003', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Idly (2 pcs)',     description: 'Soft steamed rice cakes with sambar and 2 chutneys',        price: 30.00, category: 'Tiffin',        is_available: true, inventory_count: 100 },
    { id: 'cc000003-0000-0000-0000-000000000004', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Masala Dosa',     description: 'Crispy golden dosa stuffed with spiced potato masala',      price: 50.00, category: 'Tiffin',        is_available: true, inventory_count: 80 },
    { id: 'cc000003-0000-0000-0000-000000000005', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Plain Dosa',      description: 'Thin crispy dosa with sambar and coconut chutney',           price: 35.00, category: 'Tiffin',        is_available: true, inventory_count: 80 },
    { id: 'cc000003-0000-0000-0000-000000000006', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Poha',            description: 'Light flattened rice with mustard, curry leaves, peanuts',   price: 25.00, category: 'Tiffin',        is_available: true, inventory_count: 50 },
    { id: 'cc000003-0000-0000-0000-000000000007', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Upma',            description: 'Semolina porridge tempered with mustard, chillies',          price: 25.00, category: 'Tiffin',        is_available: true, inventory_count: 50 },
    { id: 'cc000003-0000-0000-0000-000000000008', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Pongal',          description: 'Creamy rice-lentil dish with black pepper and ghee',         price: 30.00, category: 'Tiffin',        is_available: true, inventory_count: 40 },
    { id: 'cc000003-0000-0000-0000-000000000009', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Vada (2 pcs)',    description: 'Crispy lentil donuts with sambar and coconut chutney',       price: 35.00, category: 'Snacks',        is_available: true, inventory_count: 60 },
    { id: 'cc000003-0000-0000-0000-000000000010', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Sambar Rice',     description: 'Hot rice mixed with thick sambar and a dollop of ghee',      price: 40.00, category: 'Rice & Meals',  is_available: true, inventory_count: 70 },
    { id: 'cc000003-0000-0000-0000-000000000011', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Curd Rice',       description: 'Rice mixed with yogurt, tempered with mustard',              price: 35.00, category: 'Rice & Meals',  is_available: true, inventory_count: 50 },
    { id: 'cc000003-0000-0000-0000-000000000012', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Filter Coffee',   description: 'Aromatic South Indian decoction coffee with frothy milk',    price: 20.00, category: 'Drinks',        is_available: true, inventory_count: 120 },
    { id: 'cc000003-0000-0000-0000-000000000013', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Buttermilk',      description: 'Chilled spiced yogurt drink with ginger and cumin',          price: 15.00, category: 'Drinks',        is_available: true, inventory_count: 100 },
    { id: 'cc000003-0000-0000-0000-000000000014', shop_id: 'bb000002-0000-0000-0000-000000000001', name: 'Masala Chai',     description: 'Spiced milk tea with ginger, cardamom, and cinnamon',        price: 15.00, category: 'Drinks',        is_available: true, inventory_count: 100 },
  ]
  const { error: ni } = await supabase.from('canteen_items').upsert(naveenItems, { onConflict: 'id' })
  if (ni) { console.error('Naveen items error:', ni.message); } else { console.log('  ✓ Naveen Anna items (14)') }

  // ── Sandwich Anna Menu Items ───────────────────────────────────────────────
  console.log('Inserting Sandwich Anna menu items…')
  const sandwichItems = [
    { id: 'cc000003-0000-0000-0000-000000000020', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Classic Veg Grilled',       description: 'Tomato, cucumber, onion, cheese & green chutney on grilled white bread', price: 45.00, category: 'Grilled Sandwiches', is_available: true, inventory_count: 50 },
    { id: 'cc000003-0000-0000-0000-000000000021', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Paneer Tikka Sandwich',     description: 'Spiced grilled paneer with capsicum, onion & mint mayo on brown bread',   price: 70.00, category: 'Grilled Sandwiches', is_available: true, inventory_count: 40 },
    { id: 'cc000003-0000-0000-0000-000000000022', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Corn & Cheese Toastie',     description: 'Sweet corn, cheese, jalapeños & herbs, toasted golden',                   price: 55.00, category: 'Grilled Sandwiches', is_available: true, inventory_count: 45 },
    { id: 'cc000003-0000-0000-0000-000000000023', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Mushroom Melt',             description: 'Sautéed mushrooms, onions, cheese & garlic butter on sourdough',          price: 75.00, category: 'Grilled Sandwiches', is_available: true, inventory_count: 30 },
    { id: 'cc000003-0000-0000-0000-000000000024', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Aloo Tikki Sub',            description: 'Crispy aloo tikki, slaw, tamarind chutney & cheese in a long bun',        price: 80.00, category: 'Loaded & Subs',     is_available: true, inventory_count: 35 },
    { id: 'cc000003-0000-0000-0000-000000000025', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Veg Club Sandwich',         description: 'Triple-decker with lettuce, tomato, cucumber, egg mayo & cheese',         price: 90.00, category: 'Loaded & Subs',     is_available: true, inventory_count: 25 },
    { id: 'cc000003-0000-0000-0000-000000000026', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Paneer Kathi Roll',         description: 'Spiced paneer strips, onion, peppers & chutney wrapped in a flaky paratha', price: 65.00, category: 'Wraps',            is_available: true, inventory_count: 40 },
    { id: 'cc000003-0000-0000-0000-000000000027', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Veggie Hummus Wrap',        description: 'Hummus, roasted veggies, feta crumbles & rocket in a whole-wheat wrap',   price: 70.00, category: 'Wraps',            is_available: true, inventory_count: 30 },
    { id: 'cc000003-0000-0000-0000-000000000028', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Veg Burger',                description: 'Crispy veg patty, lettuce, onion ring, tomato & mayo in a sesame bun',    price: 60.00, category: 'Burgers',          is_available: true, inventory_count: 45 },
    { id: 'cc000003-0000-0000-0000-000000000029', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Spicy Double Patty Burger', description: 'Two spicy veg patties, habanero sauce, pickles & melted cheese',           price: 95.00, category: 'Burgers',          is_available: true, inventory_count: 20 },
    { id: 'cc000003-0000-0000-0000-000000000030', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Masala Fries',             description: 'Crispy fries tossed with chaat masala, red chilli & lime',                 price: 40.00, category: 'Sides & Drinks',   is_available: true, inventory_count: 60 },
    { id: 'cc000003-0000-0000-0000-000000000031', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Cold Coffee',               description: 'Chilled coffee blended with milk, ice cream & chocolate drizzle',          price: 50.00, category: 'Sides & Drinks',   is_available: true, inventory_count: 50 },
    { id: 'cc000003-0000-0000-0000-000000000032', shop_id: 'bb000002-0000-0000-0000-000000000002', name: 'Fresh Lime Soda',           description: 'Sparkling lime soda — sweet, salty, or mixed',                             price: 30.00, category: 'Sides & Drinks',   is_available: true, inventory_count: 80 },
  ]
  const { error: si } = await supabase.from('canteen_items').upsert(sandwichItems, { onConflict: 'id' })
  if (si) { console.error('Sandwich items error:', si.message); } else { console.log('  ✓ Sandwich Anna items (13)') }

  // ── Sample Orders ──────────────────────────────────────────────────────────
  console.log('Inserting sample orders…')

  // For sample orders we need a valid user_id that already exists.
  // We'll use the Spice & Soul and Green Garden profiles from migration 017
  const sampleOrders = [
    { id: 'dd000004-0000-0000-0000-000000000001', user_id: '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02', shop_id: 'bb000002-0000-0000-0000-000000000001', status: 'completed', token_number: 1, total_amount: 125.00, payment_status: 'paid', payment_method: 'upi' },
    { id: 'dd000004-0000-0000-0000-000000000002', user_id: '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03', shop_id: 'bb000002-0000-0000-0000-000000000001', status: 'ready',     token_number: 2, total_amount: 95.00,  payment_status: 'paid', payment_method: 'card' },
    { id: 'dd000004-0000-0000-0000-000000000003', user_id: '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e02', shop_id: 'bb000002-0000-0000-0000-000000000002', status: 'preparing', token_number: 1, total_amount: 160.00, payment_status: 'paid', payment_method: 'upi' },
    { id: 'dd000004-0000-0000-0000-000000000004', user_id: '5c3b6f2d-7a1b-4d9e-8c3f-2a1b4c6d8e03', shop_id: 'bb000002-0000-0000-0000-000000000002', status: 'pending',   token_number: 2, total_amount: 135.00, payment_status: 'paid', payment_method: 'card' },
  ]
  const { error: ordErr } = await supabase.from('canteen_orders').upsert(sampleOrders, { onConflict: 'id' })
  if (ordErr) { console.error('Orders error:', ordErr.message); } else { console.log('  ✓ sample orders (4)') }

  // ── Sample Order Items ─────────────────────────────────────────────────────
  console.log('Inserting canteen_order_items…')
  const sampleOrderItems = [
    // Order A — Naveen Anna's
    { order_id: 'dd000004-0000-0000-0000-000000000001', item_id: 'cc000003-0000-0000-0000-000000000001', quantity: 1, price: 70.00 },
    { order_id: 'dd000004-0000-0000-0000-000000000001', item_id: 'cc000003-0000-0000-0000-000000000012', quantity: 1, price: 20.00 },
    { order_id: 'dd000004-0000-0000-0000-000000000001', item_id: 'cc000003-0000-0000-0000-000000000009', quantity: 1, price: 35.00 },
    // Order B — Naveen Anna's
    { order_id: 'dd000004-0000-0000-0000-000000000002', item_id: 'cc000003-0000-0000-0000-000000000003', quantity: 2, price: 30.00 },
    { order_id: 'dd000004-0000-0000-0000-000000000002', item_id: 'cc000003-0000-0000-0000-000000000004', quantity: 1, price: 50.00 },
    { order_id: 'dd000004-0000-0000-0000-000000000002', item_id: 'cc000003-0000-0000-0000-000000000013', quantity: 1, price: 15.00 },
    // Order C — Sandwich Anna's
    { order_id: 'dd000004-0000-0000-0000-000000000003', item_id: 'cc000003-0000-0000-0000-000000000021', quantity: 1, price: 70.00 },
    { order_id: 'dd000004-0000-0000-0000-000000000003', item_id: 'cc000003-0000-0000-0000-000000000030', quantity: 2, price: 40.00 },
    { order_id: 'dd000004-0000-0000-0000-000000000003', item_id: 'cc000003-0000-0000-0000-000000000031', quantity: 1, price: 50.00 },
    // Order D — Sandwich Anna's
    { order_id: 'dd000004-0000-0000-0000-000000000004', item_id: 'cc000003-0000-0000-0000-000000000028', quantity: 1, price: 60.00 },
    { order_id: 'dd000004-0000-0000-0000-000000000004', item_id: 'cc000003-0000-0000-0000-000000000020', quantity: 1, price: 45.00 },
    { order_id: 'dd000004-0000-0000-0000-000000000004', item_id: 'cc000003-0000-0000-0000-000000000032', quantity: 2, price: 30.00 },
  ]
  const { error: oiErr } = await supabase.from('canteen_order_items').upsert(sampleOrderItems, { onConflict: 'order_id,item_id' })
  if (oiErr) { console.error('Order items error:', oiErr.message); } else { console.log('  ✓ canteen_order_items (12 rows)') }

  console.log('\n=== Done! ===\n')
}

run().catch(err => { console.error('Fatal:', err); process.exit(1) })
