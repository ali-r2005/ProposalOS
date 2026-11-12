import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/',
  '/templates',
  '/proposal',
  '/admin',
];

const PUBLIC_ROUTES = [
  '/auth/login',
  '/api/auth',
  '/p',
  '/api/proposals',
  '/docs',
  // OAuth discovery documents for the MCP server (rewritten to /api/oauth/*).
  '/.well-known',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without checking. A route matches itself and its
  // sub-paths only: '/p' covers '/p/<id>' but not '/proposal/...'.
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (isProtected) {
    const refreshToken = request.cookies.get('refreshToken')?.value;
    if (!refreshToken) {
      // Come back here after logging in (e.g. the OAuth approval page).
      const login = new URL('/auth/login', request.url);
      if (pathname !== '/') login.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
