/**
 * Where to go after logging in: the `?next=` path set by the middleware (e.g.
 * the OAuth approval page), or the home page. Only same-site paths are
 * accepted, so a crafted login link can't send the user to another site.
 */
export function loginRedirectTarget(): string {
  if (typeof window === 'undefined') return '/';
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
