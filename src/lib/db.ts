import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";

let url = process.env.TURSO_DATABASE_URL;

// Fallback to local file for development if Turso isn't configured yet
if (!url) {
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  url = `file:${path.join(dataDir, 'v2_database.sqlite')}`;
}

const db = createClient({
  url: url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      bio TEXT DEFAULT '',
      embedding TEXT DEFAULT NULL,
      want_bio TEXT DEFAULT '',
      want_embedding TEXT DEFAULT NULL,
      dynamic_self TEXT DEFAULT '',
      dynamic_self_embedding TEXT DEFAULT NULL,
      contact_info TEXT DEFAULT ''
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS network_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sender_id, receiver_id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shared_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connection_id INTEGER NOT NULL,
      last_writer_id INTEGER NOT NULL,
      content TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(connection_id)
    );
  `);
}

// Fire and forget initialization
initDb().catch(e => console.error("DB Init Error:", e));

export default db;
