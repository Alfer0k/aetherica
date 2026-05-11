// Gates all /api/aetherica/admin/* endpoints — verifies the admin session cookie.
// Exceptions: login + logout themselves, which by definition can't require a session.

import { verifySession } from '../../../_lib/session.js';

const PUBLIC_PATHS = new Set([
  '/api/aetherica/admin/login',
  '/api/aetherica/admin/logout',
]);

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);

  if (PUBLIC_PATHS.has(url.pathname)) {
    return next();
  }

  const ok = await verifySession(request, env.ADMIN_SESSION_SECRET);
  if (!ok) {
    return Response.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return next();
};
