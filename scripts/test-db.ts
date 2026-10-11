import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(
      'SELECT current_database() AS database, version() AS version'
    );

    console.log('Database connection successful!');
    console.log('Database:', result.rows[0].database);
    console.log('PostgreSQL:', result.rows[0].version);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Database connection failed:', error.message);
  process.exitCode = 1;
});