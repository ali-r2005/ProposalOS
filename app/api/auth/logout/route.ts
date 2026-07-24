import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { invalidateSession } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (refreshToken) {
      await invalidateSession(refreshToken);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('refreshToken');
    response.cookies.delete('accessToken');
    return response;
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
