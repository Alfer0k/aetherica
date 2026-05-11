// Site-wide HTTP Basic Auth gate.
// Runs before every request (HTML, CSS, JS, images, API) on the Pages deploy.
// Configure SITE_USER and SITE_PASS in Cloudflare Pages → Settings → Environment variables.
// To disable the gate: delete both env vars and redeploy.

export const onRequest = async ({ request, env, next }) => {
  const expectedUser = env.SITE_USER;
  const expectedPass = env.SITE_PASS;

  // Fail closed if the gate isn't configured — better than accidentally exposing everything.
  if (!expectedUser || !expectedPass) {
    return new Response('Site gate not configured.', { status: 503 });
  }

  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const idx = decoded.indexOf(':');
      if (idx !== -1) {
        const user = decoded.slice(0, idx);
        const pass = decoded.slice(idx + 1);
        if (user === expectedUser && pass === expectedPass) {
          return next();
        }
      }
    } catch {
      // malformed header — fall through to 401
    }
  }

  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Pleasure Manor", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
