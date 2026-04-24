import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUser = await getUserFromToken(token);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allUsersResult = await db.execute({ sql: `
      SELECT DISTINCT u.id as user_id, u.username, u.bio, u.contact_info
      FROM network_requests r
      JOIN users u ON (u.id = r.sender_id OR u.id = r.receiver_id) AND u.id != ?
      WHERE (r.sender_id = ? OR r.receiver_id = ?) AND r.status = 'accepted'
    `, args: [currentUser.id, currentUser.id, currentUser.id] });
    const allUsers = allUsersResult.rows as any[];

    const mutuals = [];
    const followers = [];
    const following = [];

    for (let u of allUsers) {
      const iFollowThem = (await db.execute({ sql: `SELECT id FROM network_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'accepted'`, args: [currentUser.id, u.user_id] })).rows[0] as any;
      const theyFollowMe = (await db.execute({ sql: `SELECT id FROM network_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'accepted'`, args: [u.user_id, currentUser.id] })).rows[0] as any;
      
      const trueIdRow = (await db.execute({ sql: `SELECT MIN(id) as id FROM network_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`, args: [currentUser.id, u.user_id, u.user_id, currentUser.id] })).rows[0] as any;
      const trueId = trueIdRow ? trueIdRow.id : null;
      
      const note = trueId ? (await db.execute({ sql: `SELECT last_writer_id FROM shared_notes WHERE connection_id = ?`, args: [trueId] })).rows[0] as any : null;
      
      const connData = {
         connection_id: trueId,
         user_id: u.user_id,
         username: u.username,
         bio: u.bio,
         contact_info: u.contact_info,
         last_writer_id: note ? note.last_writer_id : null
      };

      if (iFollowThem && theyFollowMe) {
        mutuals.push(connData);
      } else if (iFollowThem) {
        following.push(connData); 
      } else if (theyFollowMe) {
        followers.push(connData); 
      }
    }

    return NextResponse.json({ 
      connections: mutuals,
      activeFollowers: followers,
      activeFollowing: following
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
