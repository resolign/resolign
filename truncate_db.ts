import db from './src/lib/db';

async function run() {
  try {
    await db.execute('DELETE FROM users');
    await db.execute('DELETE FROM network_requests');
    await db.execute('DELETE FROM shared_notes');
    
    // Reset SQLite auto-increment counters so IDs start at 1 again
    try {
      await db.execute(`DELETE FROM sqlite_sequence WHERE name IN ('users', 'network_requests', 'shared_notes')`);
    } catch(e) {
      // ignore if sequence table doesn't exist yet
    }
    
    console.log("All local database records erased successfully! It is purely empty now.");
    process.exit(0);
  } catch (e) {
    console.error("Failed to delete records:", e);
    process.exit(1);
  }
}

run();
