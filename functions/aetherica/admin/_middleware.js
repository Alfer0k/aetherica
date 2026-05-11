// Gates /aetherica/admin/* — verifies the admin session cookie.
// Exception: the login page itself must be reachable without a session.

import { verifySession } from '../../_lib/session.js';

const LOGIN_PATH = '/aetherica/admin/login.html';

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);

  if (url.pathname === LOGIN_PATH) {
    return next();
  }

  const ok = await verifySession(request, env.ADMIN_SESSION_SECRET);
  if (ok) {
    return next();
  }

  return Response.redirect(`${url.origin}${LOGIN_PATH}`, 302);
};
