// Shared Postgres connection for the setup/test scripts. Uses DATABASE_URL
// (Supabase → Connect → "Session pooler" connection string).
import pg from "pg";

export async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add the Session pooler connection string to .env.local.");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false } });
  await client.connect();
  return client;
}
