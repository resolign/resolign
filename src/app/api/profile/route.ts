import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';
import db from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY! 
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { bio, wantBio, contact_info } = await request.json();

    let embeddingStr = user.embedding; // keep old if unchanged
    let wantEmbeddingStr = user.want_embedding; // keep old if unchanged

    // Only call embeddings if there's actual text and it has changed since last save
    if (bio && typeof bio === 'string' && bio !== user.bio) {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: bio,
        config: { outputDimensionality: 256 }
      });
      if (response.embeddings && response.embeddings.length > 0) {
        embeddingStr = JSON.stringify(response.embeddings[0].values);
      }
    }

    if (wantBio && typeof wantBio === 'string' && wantBio !== user.want_bio) {
      const wantResponse = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: wantBio,
        config: { outputDimensionality: 256 }
      });
      if (wantResponse.embeddings && wantResponse.embeddings.length > 0) {
        wantEmbeddingStr = JSON.stringify(wantResponse.embeddings[0].values);
      }
    }

    await db.execute({ sql: `
      UPDATE users 
      SET bio = ?, embedding = ?, want_bio = ?, want_embedding = ?, contact_info = ? 
      WHERE id = ?
    `, args: [
      (bio !== undefined ? bio : user.bio) ?? null, 
      embeddingStr ?? null, 
      (wantBio !== undefined ? wantBio : user.want_bio) ?? null, 
      wantEmbeddingStr ?? null, 
      (contact_info !== undefined ? contact_info : user.contact_info) ?? null, 
      user.id
    ] });

    return NextResponse.json({ success: true, message: 'Profile updated' });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || String(error) || 'Failed to update profile' }, { status: 500 });
  }
}
