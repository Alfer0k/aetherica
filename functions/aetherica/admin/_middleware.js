// Gates /aetherica/admin/* — verifies the admin session cookie.
// Exception: the login page itself must be reachable without a session.
// Cloudflare Pages "clean URLs" rewrite /foo.html → /foo, so both forms
// must be allowed through to avoid a redirect loop with our own 302.

import { verifySession } from '../../_lib/session.js';

const PUBLIC_PATHS = new Set([
  '/aetherica/admin/login',
  '/aetherica/admin/login.html',
]);
// Static assets under the admin folder must be reachable without a session,
// otherwise the login page itself can't load its own CSS/JS.
const PUBLIC_PREFIXES = [
  '/aetherica/admin/css/',
  '/aetherica/admin/js/',
];
const LOGIN_REDIRECT = '/aetherica/admin/login';

function isPublic(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  for (const p of PUBLIC_PREFIXES) if (pathname.startsWith(p)) return true;
  return false;
}

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);

  if (isPublic(url.pathname)) {
    return next();
  }

  const ok = await verifySession(request, env.ADMIN_SESSION_SECRET);
  if (ok) {
    return next();
  }

  return Response.redirect(`${url.origin}${LOGIN_REDIRECT}`, 302);
};
