import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || 'AIzaSyBaGp3bDXnu5KLlV8pvvjEvfDjuXmcmAuc' 
});

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'v2_database.sqlite');
const db = new Database(dbPath);

async function run() {
  const users = db.prepare('SELECT id, bio, want_bio FROM users').all();
  console.log(`Found ${users.length} users. Re-embedding to 256 dimensions...`);

  for (const user of users) {
    let embeddingStr = null;
    let wantEmbeddingStr = null;

    if (user.bio) {
      console.log(`Processing bio for user ${user.id}...`);
      try {
        const response = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: user.bio,
          config: { outputDimensionality: 256 }
        });
        embeddingStr = JSON.stringify(response.embeddings[0].values);
      } catch (e) {
        console.error(`Failed to embed bio for user ${user.id}:`, e.message);
      }
    }

    if (user.want_bio) {
      console.log(`Processing want_bio for user ${user.id}...`);
      try {
        const wantResponse = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: user.want_bio,
          config: { outputDimensionality: 256 }
        });
        wantEmbeddingStr = JSON.stringify(wantResponse.embeddings[0].values);
      } catch(e) {
        console.error(`Failed to embed want_bio for user ${user.id}:`, e.message);
      }
    }

    db.prepare('UPDATE users SET embedding = ?, want_embedding = ? WHERE id = ?')
      .run(embeddingStr, wantEmbeddingStr, user.id);
    
    console.log(`Successfully updated embeddings for user ${user.id}.`);
  }
  console.log('Finished updating all users!');
}

run();
