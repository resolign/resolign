import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

function cosineSimilarity(v1: number[], v2: number[]): number {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    mag1 += v1[i] * v1[i];
    mag2 += v2[i] * v2[i];
  }
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const mode = url.searchParams.get('mode') || 'similar'; // 'similar' or 'desire'

    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUser = await getUserFromToken(token);
    
    let baseEmbeddingStr = null;

    if (mode === 'similar') {
      baseEmbeddingStr = currentUser?.embedding;
      if (!baseEmbeddingStr) {
        return NextResponse.json({ error: 'Please update your "Who I Am" bio first.' }, { status: 400 });
      }
    } else if (mode === 'desire') {
      baseEmbeddingStr = currentUser?.want_embedding;
      if (!baseEmbeddingStr) {
        return NextResponse.json({ error: 'Please submit your search desire first.' }, { status: 400 });
      }
    }

    const currentEmbedding = JSON.parse(baseEmbeddingStr);

    // Fetch all other users with embeddings
    const otherUsers = (await db.execute({ sql: `
      SELECT 
        u.id, u.username, u.bio, u.embedding,
        (SELECT status FROM network_requests WHERE 
          (sender_id = ? AND receiver_id = u.id) OR 
          (receiver_id = ? AND sender_id = u.id)
        ) as connection_status
      FROM users u 
      WHERE u.id != ? AND u.embedding IS NOT NULL
    `, args: [currentUser.id, currentUser.id, currentUser.id] })).rows as any[];

    const connections = otherUsers.map(user => {
      const userEmbedding = JSON.parse(user.embedding);
      const similarity = cosineSimilarity(currentEmbedding, userEmbedding);
      return {
        id: user.id,
        username: user.username,
        bio: user.bio,
        similarity: similarity,
        connection_status: user.connection_status
      };
    });

    connections.sort((a, b) => b.similarity - a.similarity);
    
    const totalPages = Math.ceil(connections.length / limit);
    const startIndex = (page - 1) * limit;
    const paginatedConnections = connections.slice(startIndex, startIndex + limit);
    
    return NextResponse.json({ 
      connections: paginatedConnections,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
  }
}
