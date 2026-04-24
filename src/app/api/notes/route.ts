import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Given a connectionId (any edge id between two users), find the canonical note
async function findNoteForConnection(currentUserId: number, connectionId: number) {
  // Look up the edge to find the other user
  const edge = (await db.execute({ sql: `SELECT * FROM network_requests WHERE id = ?`, args: [connectionId] })).rows[0] as any;
  if (!edge) return { error: 'Edge not found' };
  
  // Verify current user is part of this edge
  if (edge.sender_id !== currentUserId && edge.receiver_id !== currentUserId) {
    return { error: 'Not your edge' };
  }
  
  const otherUserId = edge.sender_id === currentUserId ? edge.receiver_id : edge.sender_id;
  
  // Get canonical (smallest) edge id for this pair - this is where we store notes
  const minRowResult = await db.execute({
    sql: `SELECT MIN(id) as id FROM network_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
    args: [currentUserId, otherUserId, otherUserId, currentUserId]
  });
  const minRow = minRowResult.rows[0] as any;
  
  const canonicalId = minRow ? minRow.id : null;
  if (!canonicalId) return { error: 'No edge found' };
  
  return { canonicalId, otherUserId };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const connectionIdRaw = url.searchParams.get('connectionId');
    if (!connectionIdRaw) return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
    
    const connectionId = Number(connectionIdRaw);

    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUser = await getUserFromToken(token);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await findNoteForConnection(currentUser.id, connectionId);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 403 });

    // Always look up by canonical ID
    const note = (await db.execute({ sql: `SELECT * FROM shared_notes WHERE connection_id = ?`, args: [result.canonicalId] })).rows[0] as any;

    // Clear the green dot if the other user wrote it
    if (note && note.last_writer_id && note.last_writer_id !== currentUser.id) {
      await db.execute({ sql: `UPDATE shared_notes SET last_writer_id = 0 WHERE connection_id = ?`, args: [result.canonicalId] });
    }

    return NextResponse.json({ note: note || { content: '' } });
  } catch (error) {
    console.error('[NOTES GET] ERROR:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUser = await getUserFromToken(token);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { connectionId: connectionIdRaw, content } = await request.json();
    if (!connectionIdRaw) return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
    
    const connectionId = Number(connectionIdRaw);

    const result = await findNoteForConnection(currentUser.id, connectionId);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 403 });

    // Check if note exists at canonical ID
    const existing = (await db.execute({ sql: `SELECT id FROM shared_notes WHERE connection_id = ?`, args: [result.canonicalId] })).rows[0] as any;
    
    if (existing) {
      await db.execute({ sql: `
        UPDATE shared_notes 
        SET content = ?, last_writer_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE connection_id = ?
      `, args: [content, currentUser.id, result.canonicalId] });
    } else {
      await db.execute({ sql: `
        INSERT INTO shared_notes (connection_id, last_writer_id, content) 
        VALUES (?, ?, ?)
      `, args: [result.canonicalId, currentUser.id, content] });
    }

    return NextResponse.json({ message: 'Note updated' });
  } catch (error) {
    console.error('[NOTES POST] ERROR:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
