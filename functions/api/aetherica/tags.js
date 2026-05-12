// GET /api/aetherica/tags?q=prefix&limit=20
// Returns tags matching the prefix, ordered by usage count (denormalized).
// With no `q`, returns the top-N most-used tags overall — good for the
// "recent / popular tags" chips in the admin and on the gallery.

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const q     = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 100);

  const stmt = q
    ? env.DB.prepare(
        `SELECT id, name, count
           FROM tags
          WHERE name LIKE ?
       ORDER BY count DESC, name
          LIMIT ?`
      ).bind(q + '%', limit)
    : env.DB.prepare(
        `SELECT id, name, count
           FROM tags
       ORDER BY count DESC, name
          LIMIT ?`
      ).bind(limit);

  const { results } = await stmt.all();
  return Response.json({ tags: results }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
