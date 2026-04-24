import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('authToken')?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ 
    user: { 
      id: user.id, 
      username: user.username, 
      bio: user.bio, 
      want_bio: user.want_bio,
      hasEmbedding: !!user.embedding,
      hasWantEmbedding: !!user.want_embedding
    } 
  });
}
