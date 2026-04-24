import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

// Helper to get consistent connection ID for shared_notes
async function getMutualConnectionId(userId1: number, userId2: number) {
  const row = (await db.execute({ sql: `SELECT MIN(id) as id FROM network_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`, args: [userId1, userId2, userId2, userId1] })).rows[0] as any;
  return row ? row.id : null;
}

// GET pending incoming/outgoing requests
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUser = await getUserFromToken(token);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const incomingResult = await db.execute({ sql: `
      SELECT r.id, r.sender_id, u.username, u.bio
      FROM network_requests r
      JOIN users u ON r.sender_id = u.id
      WHERE r.receiver_id = ? AND r.status = 'pending'
    `, args: [currentUser.id] });
    const incoming = incomingResult.rows;

    const outgoingResult = await db.execute({ sql: `
      SELECT r.id, r.receiver_id, u.username, u.bio
      FROM network_requests r
      JOIN users u ON r.receiver_id = u.id
      WHERE r.sender_id = ? AND r.status = 'pending'
    `, args: [currentUser.id] });
    const outgoing = outgoingResult.rows;

    return NextResponse.json({ incoming, outgoing });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

// POST: Send a new request
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUser = await getUserFromToken(token);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { receiverId } = await request.json();
    if (!receiverId || receiverId === currentUser.id) {
      return NextResponse.json({ error: 'Invalid receiver' }, { status: 400 });
    }

    // Check if I already requested them
    const existing = (await db.execute({ sql: `SELECT * FROM network_requests WHERE sender_id = ? AND receiver_id = ?`, args: [currentUser.id, receiverId] })).rows[0] as any;
    if (existing) return NextResponse.json({ error: 'Already requested/following' }, { status: 400 });

    // Check if they requested me already or already follow me -> Auto-accept mutual
    const incomingReq = (await db.execute({ sql: `SELECT * FROM network_requests WHERE sender_id = ? AND receiver_id = ?`, args: [receiverId, currentUser.id] })).rows[0] as any;
    
    if (incomingReq) {
      if (incomingReq.status === 'pending') {
        // Accept their request
        await db.execute({ sql: `UPDATE network_requests SET status = 'accepted' WHERE id = ?`, args: [incomingReq.id] });
      }
      // Follow back instantly
      await db.execute({ sql: `INSERT INTO network_requests (sender_id, receiver_id, status) VALUES (?, ?, 'accepted')`, args: [currentUser.id, receiverId] });
      
      const trueId = await getMutualConnectionId(currentUser.id, receiverId);
      if (trueId) {
        await db.execute({ sql: `INSERT OR IGNORE INTO shared_notes (connection_id, last_writer_id, content) VALUES (?, ?, '')`, args: [trueId, currentUser.id] });
      }
      return NextResponse.json({ message: 'Connected instantly!' });
    }

    // Normal follow request
    await db.execute({ sql: `INSERT INTO network_requests (sender_id, receiver_id) VALUES (?, ?)`, args: [currentUser.id, receiverId] });
    return NextResponse.json({ message: 'Request sent' });
  } catch (error) {
    console.error('Error sending request:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH: Accept or reject a request
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUser = await getUserFromToken(token);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { requestId, action } = await request.json(); 

    if (action === 'disconnect') {
      // Unfollow (delete the edge going FROM currentUser to TARGET)
      // Since requestId isn't reliable for target user resolution perfectly if they passed connection_id, 
      // let's grab the request or just pass targetUserId from frontend
      let targetId = null;
      const reqCheck = (await db.execute({ sql: `SELECT * FROM network_requests WHERE id = ?`, args: [requestId] })).rows[0] as any;
      if (reqCheck) {
        if (reqCheck.sender_id === currentUser.id) targetId = reqCheck.receiver_id;
        else if (reqCheck.receiver_id === currentUser.id) targetId = reqCheck.sender_id;
      }
      
      if (!targetId) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
      
      // Delete MY outward follow
      await db.execute({ sql: `DELETE FROM network_requests WHERE sender_id = ? AND receiver_id = ?`, args: [currentUser.id, targetId] });

      // Verify if ANY edge exists between us
      const remainingEdges = (await db.execute({ sql: `SELECT count(*) as c FROM network_requests WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)`, args: [currentUser.id, targetId, targetId, currentUser.id] })).rows[0] as any;
      
      if (remainingEdges.c === 0) {
        // Safe to delete old shared note if totally disconnected
        await db.execute({ sql: `DELETE FROM shared_notes WHERE connection_id = ?`, args: [requestId] });
      }
      return NextResponse.json({ message: 'Disconnected' });
    }

    // Accept / Reject
    const req = (await db.execute({ sql: `SELECT * FROM network_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'`, args: [requestId, currentUser.id] })).rows[0] as any;
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    if (action === 'accept') {
      // Set incoming to accepted (they follow me)
      await db.execute({ sql: `UPDATE network_requests SET status = 'accepted' WHERE id = ?`, args: [requestId] });
      // Insert outgoing automatic follow back (I follow them)
      await db.execute({ sql: `INSERT OR IGNORE INTO network_requests (sender_id, receiver_id, status) VALUES (?, ?, 'accepted')`, args: [currentUser.id, req.sender_id] });
      
      const trueId = await getMutualConnectionId(currentUser.id, req.sender_id);
      if (trueId) {
        await db.execute({ sql: `INSERT OR IGNORE INTO shared_notes (connection_id, last_writer_id, content) VALUES (?, ?, '')`, args: [trueId, currentUser.id] });
      }
      return NextResponse.json({ message: 'Request accepted' });
    } else if (action === 'reject') {
      await db.execute({ sql: `DELETE FROM network_requests WHERE id = ?`, args: [requestId] });
      return NextResponse.json({ message: 'Request rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Patch error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
