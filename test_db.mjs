import 'dotenv/config';
import db from './src/lib/db.js'; // Need to be careful with paths in mjs

async function run() {
  try {
    const res = await db.execute('SELECT count(*) as count FROM users');
    console.log("DB Test Success, User count:", res.rows[0].count);
  } catch (e) {
    console.error("DB Test Failed:", e);
  }
}

run();
