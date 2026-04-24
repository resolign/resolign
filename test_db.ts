import db from './src/lib/db';

async function run() {
  try {
    const res = await db.execute('SELECT count(*) as count FROM users');
    console.log("DB Test Success, User count:", res.rows[0].count);
    process.exit(0);
  } catch (e) {
    console.error("DB Test Failed:", e);
    process.exit(1);
  }
}

run();
