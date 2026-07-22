import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshAccessToken } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      );
    }

    const newAccessToken = await refreshAccessToken(refreshToken);

    if (!newAccessToken) {
      return NextResponse.json(
        { error: 'Refresh token expired or invalid' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
