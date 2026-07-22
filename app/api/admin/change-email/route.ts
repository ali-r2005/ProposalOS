import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/context';
import { verifyPassword } from '@/lib/auth/crypto';
import { toErrorResponse } from '@/lib/utils/error-handler';

export async function POST(request: Request) {
  try {
    const payload = requireAuth(request);
    const body = await request.json();
    const { newEmail, password } = body;

    if (!newEmail || !password) {
      return NextResponse.json(
        { error: 'New email and password are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!newEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Password is incorrect' },
        { status: 401 }
      );
    }

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, newEmail))
      .limit(1);

    if (existingUser && existingUser.id !== payload.userId) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    // Update email
    await db
      .update(users)
      .set({ email: newEmail, updatedAt: new Date() })
      .where(eq(users.id, payload.userId));

    return NextResponse.json({ success: true, message: 'Email changed successfully' });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
