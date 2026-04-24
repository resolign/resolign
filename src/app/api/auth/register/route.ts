import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    let result;
    try {
      result = await db.execute({
        sql: 'INSERT INTO users (username, passwordHash) VALUES (?, ?)',
        args: [username, passwordHash]
      });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      }
      throw err;
    }

    const userId = Number(result.lastInsertRowid);
    const token = await signToken({ id: userId, username });

    // Await cookies() to set the cookie
    const cookieStore = await cookies();
    cookieStore.set('authToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 });

    return NextResponse.json({ success: true, user: { id: userId, username } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
