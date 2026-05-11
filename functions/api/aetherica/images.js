// GET /api/aetherica/images?limit=50&offset=0
// Returns the most recently added images, newest first.

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit  = Math.min(Math.max(parseInt(url.searchParams.get('limit')  || '50', 10), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0',  10), 0);

  const { results } = await env.DB.prepare(
    `SELECT id, r2_prefix, title, source_url, nsfw, featured, likes_count, created_at
       FROM images
   ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  return Response.json({ images: results }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
