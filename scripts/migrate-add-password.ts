import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" text NOT NULL DEFAULT ''`);
  await client.query(`ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT`);
  console.log('Added passwordHash column to User table.');
  await client.end();
}

main().catch(e => { console.error(e); process.exitCode = 1; });
