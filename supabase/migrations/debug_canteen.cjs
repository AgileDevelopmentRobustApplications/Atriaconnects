const {Client}=require('pg')
const c=new Client({host:'db.zgwckrpeveoemmwtriee.supabase.co',port:5432,database:'postgres',user:'postgres',password:'11y2uuWJBKXMFZp3',ssl:{rejectUnauthorized:false}})
c.connect().then(async()=>{
  const shops=await c.query('SELECT id,name FROM public.canteen_shops ORDER BY name')
  console.log('ALL SHOPS:',JSON.stringify(shops.rows,null,2))
  
  const cols=await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='canteen_items' AND table_schema='public' ORDER BY ordinal_position`)
  console.log('\ncanteen_items columns:',cols.rows.map(r=>r.column_name))
  
  const items=await c.query('SELECT id,name,category,shop_id FROM public.canteen_items LIMIT 5')
  console.log('\nSample items:',JSON.stringify(items.rows,null,2))
  
  // Check RLS: what does anon see?
  await c.query("SET ROLE anon")
  const anonItems=await c.query('SELECT count(*) FROM public.canteen_items').catch(e=>({rows:[{count:'ERROR: '+e.message}]}))
  console.log('\nAnon count:',anonItems.rows[0])
  await c.query("RESET ROLE")
  
  const authItems=await c.query("SET ROLE authenticated").then(()=>c.query('SELECT count(*) FROM public.canteen_items')).catch(e=>({rows:[{count:'ERROR: '+e.message}]}))
  console.log('Authenticated count:',authItems.rows[0])
  await c.query("RESET ROLE")
  
  await c.end()
}).catch(e=>console.error('Fatal:',e.message))
