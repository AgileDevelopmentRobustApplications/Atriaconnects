// apply_migrations_pg.cjs — runs migrations 020 and 021 via direct postgres connection
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Supabase direct connection string format
// Host: db.<project-ref>.supabase.co  Port: 5432  DB: postgres  User: postgres
const client = new Client({
  host: 'db.zgwckrpeveoemmwtriee.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '11y2uuWJBKXMFZp3',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  console.log('\nConnecting to Supabase Postgres…')
  await client.connect()
  console.log('Connected!\n')

  const migrations = [
    '020_naveen_sandwich_shops.sql',
    '021_canteen_items_category.sql',
  ]

  for (const mig of migrations) {
    const filePath = path.join(__dirname, mig)
    const sql = fs.readFileSync(filePath, 'utf8')
    console.log(`Applying ${mig}…`)
    try {
      await client.query(sql)
      console.log(`  ✓ ${mig}`)
    } catch (err) {
      console.error(`  ✗ ${mig}: ${err.message}`)
    }
  }

  await client.end()
  console.log('\nDone!')
}

run().catch(err => { console.error('Fatal:', err); process.exit(1) })
