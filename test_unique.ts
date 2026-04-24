import db from './src/lib/db';

async function run() {
  try {
    // Try to insert a duplicate user. We know user id 1 exists, let's just insert one that likely already exists, e.g. "dummy_1"
    // We can also fetch the first user and try to insert them again.
    const userRes = await db.execute('SELECT username FROM users LIMIT 1');
    const existingUsername = userRes.rows[0].username;
    
    await db.execute({
      sql: 'INSERT INTO users (username, passwordHash) VALUES (?, ?)',
      args: [existingUsername, 'hashedtest']
    });
    
  } catch (e: any) {
    console.log("ERROR MESSAGE IS:", e.message);
    console.log("ERROR CODE IS:", e.code);
    process.exit(0);
  }
}

run();
