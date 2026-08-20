const {Client}=require('pg')
const c=new Client({host:'db.zgwckrpeveoemmwtriee.supabase.co',port:5432,database:'postgres',user:'postgres',password:'11y2uuWJBKXMFZp3',ssl:{rejectUnauthorized:false}})

c.connect().then(async()=>{
  console.log('Connected!\n')

  // Fix 1: Allow anon role to SELECT canteen_shops and canteen_items
  // (public menu browsing should not require login)
  const fixes = [
    ['Grant SELECT on canteen_shops to anon', `
      DROP POLICY IF EXISTS "canteen_shops_select_anon" ON public.canteen_shops;
      CREATE POLICY "canteen_shops_select_anon" ON public.canteen_shops
        FOR SELECT TO anon USING (true);
    `],
    ['Grant SELECT on canteen_items to anon', `
      DROP POLICY IF EXISTS "canteen_items_select_anon" ON public.canteen_items;
      CREATE POLICY "canteen_items_select_anon" ON public.canteen_items
        FOR SELECT TO anon USING (true);
    `],
    ['Grant SELECT on canteen_announcements to anon', `
      DROP POLICY IF EXISTS "canteen_announcements_select_anon" ON public.canteen_announcements;
      CREATE POLICY "canteen_announcements_select_anon" ON public.canteen_announcements
        FOR SELECT TO anon USING (true);
    `],
  ]

  for (const [label, sql] of fixes) {
    try {
      await c.query(sql)
      console.log('  ✓', label)
    } catch(e) {
      console.error('  ✗', label, ':', e.message)
    }
  }

  // Verify: check anon can now see items
  await c.query('SET ROLE anon')
  const anonShops = await c.query('SELECT count(*) FROM public.canteen_shops')
  const anonItems = await c.query('SELECT count(*) FROM public.canteen_items')
  console.log('\nAnon shops visible:', anonShops.rows[0].count)
  console.log('Anon items visible:', anonItems.rows[0].count)
  await c.query('RESET ROLE')

  await c.end()
  console.log('\nDone!')
}).catch(e=>console.error('Fatal:',e.message))
