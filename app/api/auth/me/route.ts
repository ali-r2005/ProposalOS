import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getUserById } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/error-handler';

export async function GET(request: Request) {
  try {
    const payload = requireAuth(request);
    const user = await getUserById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
