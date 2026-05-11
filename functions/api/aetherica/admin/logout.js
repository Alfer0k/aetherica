// POST /api/aetherica/admin/logout
// Clears the admin session cookie.

import { clearSessionCookie } from '../../../_lib/session.js';

export const onRequestPost = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
      'Cache-Control': 'no-store',
    },
  });
};
