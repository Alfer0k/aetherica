// Gates /aetherica/admin/* — verifies the admin session cookie.
// Exception: the login page itself must be reachable without a session.
// Cloudflare Pages "clean URLs" rewrite /foo.html → /foo, so both forms
// must be allowed through to avoid a redirect loop with our own 302.

import { verifySession } from '../../_lib/session.js';

const LOGIN_PATHS = new Set([
  '/aetherica/admin/login',
  '/aetherica/admin/login.html',
]);
const LOGIN_REDIRECT = '/aetherica/admin/login';

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);

  if (LOGIN_PATHS.has(url.pathname)) {
    return next();
  }

  const ok = await verifySession(request, env.ADMIN_SESSION_SECRET);
  if (ok) {
    return next();
  }

  return Response.redirect(`${url.origin}${LOGIN_REDIRECT}`, 302);
};
