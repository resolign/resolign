import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

// Manually load .env.local
const envLocal = fs.readFileSync(path.resolve(process.cwd(), '.env.local'));
const envVars = Object.fromEntries(
  envLocal.toString().split('\n').filter(Boolean).map(l => {
    const parts = l.split('=');
    return [parts[0].trim(), parts.slice(1).join('=').trim()];
  })
);

const url = envVars.TURSO_DATABASE_URL;
const authToken = envVars.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("ERROR: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not found in .env.local");
  process.exit(1);
}

console.log("Connecting to PRODUCTION Turso database:", url);

const db = createClient({ url, authToken });

async function run() {
  try {
    // Show current count
    const before = await db.execute('SELECT count(*) as count FROM users');
    console.log(`Current users in production: ${before.rows[0].count}`);

    console.log("\nErasing all production data...");

    await db.execute('DELETE FROM shared_notes');
    console.log("  -> Cleared shared_notes");

    await db.execute('DELETE FROM network_requests');
    console.log("  -> Cleared network_requests");

    await db.execute('DELETE FROM users');
    console.log("  -> Cleared users");

    // Reset auto-increment counters
    try {
      await db.execute(`DELETE FROM sqlite_sequence WHERE name IN ('users', 'network_requests', 'shared_notes')`);
    } catch(e) {}

    const after = await db.execute('SELECT count(*) as count FROM users');
    console.log(`\nDone! Users remaining in production: ${after.rows[0].count}`);
    process.exit(0);
  } catch (e: any) {
    console.error("Failed:", e.message);
    process.exit(1);
  }
}

run();
