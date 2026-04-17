const fs = require('fs');
const path = require('path');
const pg = require('pg');

const { Pool } = pg;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set before running db:push');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const schemaPath = path.join(__dirname, '..', 'server', 'schema.sql');
    const seedPath = path.join(__dirname, '..', 'supabase_seed.sql');
    await pool.query(fs.readFileSync(schemaPath, 'utf8'));
    if (fs.existsSync(seedPath)) {
      await pool.query(fs.readFileSync(seedPath, 'utf8'));
    }
    console.log('Database schema pushed successfully.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
