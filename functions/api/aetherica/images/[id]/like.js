// POST /api/aetherica/images/:id/like
// One like per (image, hashed-IP), forever. PK on like_log enforces it.
// IP is hashed with a server-side salt before storage so we never keep raw IPs.

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

export const onRequestPost = async ({ request, env, params }) => {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: 'Bad id.' }, { status: 400 });
  }

  if (!env.LIKE_IP_SALT) {
    return Response.json({ error: 'Likes not configured.' }, { status: 503 });
  }

  // CF-Connecting-IP is Cloudflare's authoritative client IP header.
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!ip) {
    return Response.json({ error: 'Cannot determine client IP.' }, { status: 400 });
  }

  const ipHash = await sha256Hex(`${env.LIKE_IP_SALT}:${ip}`);

  // Make sure the image exists before we write the like_log row.
  const exists = await env.DB.prepare(`SELECT id FROM images WHERE id = ?`).bind(id).first();
  if (!exists) return Response.json({ error: 'Not found.' }, { status: 404 });

  const now = Math.floor(Date.now() / 1000);

  // INSERT OR IGNORE is atomic; meta.changes tells us whether a row was actually
  // written. 0 means PK conflict — this IP already liked this image.
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO like_log (image_id, ip_hash, created_at) VALUES (?, ?, ?)`
  ).bind(id, ipHash, now).run();

  if (inserted.meta.changes === 0) {
    const current = await env.DB.prepare(`SELECT likes_count FROM images WHERE id = ?`).bind(id).first();
    return Response.json({
      ok: false,
      already_liked: true,
      likes_count: current?.likes_count ?? 0,
    }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  }

  // New like — increment the denormalized counter.
  await env.DB.prepare(
    `UPDATE images SET likes_count = likes_count + 1 WHERE id = ?`
  ).bind(id).run();

  const updated = await env.DB.prepare(`SELECT likes_count FROM images WHERE id = ?`).bind(id).first();
  return Response.json({
    ok: true,
    likes_count: updated?.likes_count ?? 0,
  }, { headers: { 'Cache-Control': 'no-store' } });
};
