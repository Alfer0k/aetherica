// POST /api/aetherica/admin/login
// Body: { password: string }
// On success: sets the signed admin session cookie and returns { ok: true }.

import { createSessionCookie } from '../../../_lib/session.js';

export const onRequestPost = async ({ request, env }) => {
  if (!env.ADMIN_PASS || !env.ADMIN_SESSION_SECRET) {
    return Response.json({ error: 'Admin not configured.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const password = typeof body?.password === 'string' ? body.password : '';
  if (password !== env.ADMIN_PASS) {
    // Small jitter so repeated failures don't reveal whether the request hit early validation or password compare.
    await new Promise(r => setTimeout(r, 200 + Math.random() * 200));
    return Response.json({ error: 'Wrong password.' }, { status: 401 });
  }

  const cookie = await createSessionCookie(env.ADMIN_SESSION_SECRET);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
      'Cache-Control': 'no-store',
    },
  });
};
